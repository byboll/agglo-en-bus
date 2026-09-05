// Petit routeur SPA (History API) — pas de framework, pour un chargement mobile rapide.
// Le header/footer restent montés une seule fois ; seul le contenu de <main id="outlet">
// est re-rendu à chaque navigation, ce qui permet de conserver le GTFS en mémoire
// (une seule récupération par session) tout en offrant de vraies URLs pour chaque page.

const routes = [];
let outlet = null;
let notFoundHandler = () => '<p>Page introuvable.</p>';
let afterRenderHooks = [];

export function registerRoute(pattern, render) {
  // pattern ex: '/lignes/:id'
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/\/$/, '')
        .split('/')
        .map((seg) => {
          if (seg.startsWith(':')) { keys.push(seg.slice(1)); return '([^/]+)'; }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/') +
      '/?$'
  );
  routes.push({ regex, keys, render });
}

export function setNotFound(render) {
  notFoundHandler = render;
}

export function onAfterRender(fn) {
  afterRenderHooks.push(fn);
}

function match(pathname) {
  for (const r of routes) {
    const m = r.regex.exec(pathname);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { render: r.render, params };
    }
  }
  return null;
}

export async function renderCurrent() {
  const { pathname, search } = window.location;
  const query = Object.fromEntries(new URLSearchParams(search));
  const found = match(pathname);
  outlet.setAttribute('aria-busy', 'true');
  let mountFn = null;
  let html;
  try {
    if (found) {
      const result = await found.render({ params: found.params, query });
      if (result && typeof result === 'object' && 'html' in result) {
        html = result.html;
        mountFn = result.mount || null;
      } else {
        html = result;
      }
    } else {
      const result = await notFoundHandler();
      html = typeof result === 'object' ? result.html : result;
    }
  } catch (err) {
    console.error('[router] erreur de rendu', err);
    html = `<div class="container section"><div class="alert alert-danger">Une erreur est survenue lors de l'affichage de cette page. <a href="/" data-link>Retour à l'accueil</a>.</div></div>`;
  }
  // IMPORTANT : ce signal doit partir AVANT de remplacer le HTML de la page précédente, tant que
  // son DOM (ex. un conteneur Leaflet) est encore attaché au document — sinon un nettoyage basé
  // sur 'route:rendered' (qui ne part qu'après le remplacement) opère sur un DOM déjà détaché.
  document.dispatchEvent(new CustomEvent('route:willchange', { detail: { pathname } }));
  outlet.innerHTML = html;
  outlet.removeAttribute('aria-busy');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  try {
    if (mountFn) mountFn(outlet);
  } catch (err) {
    console.error('[router] erreur de montage', err);
  }
  for (const hook of afterRenderHooks) hook({ pathname });
  document.dispatchEvent(new CustomEvent('route:rendered', { detail: { pathname } }));
}

export function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  renderCurrent();
}

export function startRouter(outletEl) {
  outlet = outletEl;
  document.body.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a) return;
    const url = new URL(a.href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    e.preventDefault();
    if (url.pathname + url.search === window.location.pathname + window.location.search) return;
    navigate(url.pathname + url.search);
  });
  window.addEventListener('popstate', renderCurrent);
  renderCurrent();
}
