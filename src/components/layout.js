// Header, pied de page, navigation mobile — montés une seule fois, mis à jour en direct
// (statut GTFS, lien actif) via de petites fonctions d'update plutôt qu'un re-rendu complet.
import { getState, subscribe } from '../gtfs/store.js';

const NAV_MAIN = [
  { href: '/', label: 'Accueil' },
  { href: '/itineraire', label: 'Itinéraire' },
  { href: '/lignes', label: 'Lignes' },
  { href: '/arrets', label: 'Arrêts' },
  { href: '/carte', label: 'Carte' },
  { href: '/actualites', label: 'Actualités' },
  { href: '/infos-trafic', label: 'Infos trafic' },
];

const NAV_BOTTOM = [
  { href: '/', label: 'Accueil', icon: iconHome },
  { href: '/itineraire', label: 'Itinéraire', icon: iconRoute },
  { href: '/carte', label: 'Carte', icon: iconMap },
  { href: '/lignes', label: 'Lignes', icon: iconLine },
  { href: '/arrets', label: 'Arrêts', icon: iconStop },
];

export function headerHtml() {
  return `
  <header class="site-header" id="site-header">
    <div class="container site-header-inner">
      <a href="/" data-link class="brand-link" aria-label="L'Agglo en bus — accueil">
        <img src="/logo-agglo-en-bus.png" alt="L'Agglo en bus" width="150" height="58" class="brand-logo" />
      </a>
      <nav class="main-nav" aria-label="Navigation principale">
        <ul>
          ${NAV_MAIN.map((i) => `<li><a href="${i.href}" data-link data-navhref="${i.href}">${i.label}</a></li>`).join('')}
        </ul>
      </nav>
      <button class="menu-toggle btn btn-icon btn-ghost" id="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Ouvrir le menu">
        ${iconMenu()}
      </button>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden>
      <nav aria-label="Navigation">
        <ul>
          ${NAV_MAIN.map((i) => `<li><a href="${i.href}" data-link data-navhref="${i.href}">${i.label}</a></li>`).join('')}
          <li><a href="/reseau" data-link data-navhref="/reseau">Le réseau</a></li>
          <li><a href="/accessibilite" data-link data-navhref="/accessibilite">Accessibilité</a></li>
          <li><a href="/contact" data-link data-navhref="/contact">Contact</a></li>
          <li><a href="/mentions-legales" data-link data-navhref="/mentions-legales">Mentions légales</a></li>
        </ul>
      </nav>
    </div>
  </header>`;
}

export function bottomNavHtml() {
  return `
  <nav class="bottom-nav" aria-label="Navigation rapide" id="bottom-nav">
    ${NAV_BOTTOM.map(
      (i) => `<a href="${i.href}" data-link data-navhref="${i.href}" class="bottom-nav-item">
        <span class="bottom-nav-icon">${i.icon()}</span>
        <span class="bottom-nav-label">${i.label}</span>
      </a>`
    ).join('')}
  </nav>`;
}

export function footerHtml() {
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <img src="/logo-agglo-en-bus.png" alt="L'Agglo en bus" width="130" height="50" style="margin-bottom:12px" />
          <p class="text-muted" style="font-size:var(--fs-label)">
            Site non-officiel de démonstration présentant les données publiques du réseau de
            transport de la communauté d'agglomération Gap-Tallard-Durance.
          </p>
          <p class="text-muted" id="footer-gtfs-status" style="font-size:var(--fs-label)"></p>
        </div>
        <div>
          <h4>Le site</h4>
          <ul class="footer-links">
            <li><a href="/" data-link>Accueil</a></li>
            <li><a href="/itineraire" data-link>Itinéraire</a></li>
            <li><a href="/lignes" data-link>Lignes</a></li>
            <li><a href="/arrets" data-link>Arrêts</a></li>
            <li><a href="/carte" data-link>Carte</a></li>
            <li><a href="/actualites" data-link>Actualités</a></li>
            <li><a href="/infos-trafic" data-link>Infos trafic</a></li>
          </ul>
        </div>
        <div>
          <h4>Informations</h4>
          <ul class="footer-links">
            <li><a href="/reseau" data-link>Le réseau</a></li>
            <li><a href="/accessibilite" data-link>Accessibilité</a></li>
            <li><a href="/contact" data-link>Contact</a></li>
            <li><a href="/mentions-legales" data-link>Mentions légales</a></li>
            <li><a href="/confidentialite" data-link>Confidentialité</a></li>
          </ul>
        </div>
        <div>
          <h4>Réseau officiel</h4>
          <p class="text-muted" style="font-size:var(--fs-label)">
            Pour toute démarche officielle (titres, réclamations, transport scolaire),
            contactez le service Transports de l'agglomération :
          </p>
          <p style="font-size:var(--fs-label)">
            04 92 53 18 19<br />
            <a href="mailto:transports@agglo-gap.fr">transports@agglo-gap.fr</a>
          </p>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="text-muted" style="font-size:var(--fs-label); margin:0">
          © ${year} — Projet personnel indépendant, réalisé à titre de démonstrateur technique.
          Aucun lien avec la communauté d'agglomération Gap-Tallard-Durance. Voir les
          <a href="/mentions-legales" data-link>mentions légales</a>.
        </p>
      </div>
    </div>
  </footer>`;
}

export function disclaimerBannerHtml() {
  return `
  <div class="disclaimer-banner" role="note">
    <div class="container disclaimer-inner">
      <span>🛠️ <strong>Démonstrateur non-officiel</strong> — initiative personnelle indépendante, sans lien avec l'agglomération Gap-Tallard-Durance.</span>
      <a href="/mentions-legales" data-link>En savoir plus</a>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Comportement (montage unique)                                       */
/* ------------------------------------------------------------------ */
export function mountLayoutBehavior() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  toggle?.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('route:rendered', () => {
    if (menu) menu.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
    updateActiveNav();
  });
  updateActiveNav();
  mountGtfsStatus();
  mountTopbarHeight();
}

/* Mesure la hauteur réelle du header fixe (variable selon la zone de sécurité de l'appareil)
   et l'expose en --topbar-h, pour que le bandeau disclaimer (qui défile désormais avec la page,
   juste en dessous du header) et le contenu (main, menu mobile) se calent dessous sans jamais
   passer sous le header ni laisser un vide. Recalculée au chargement, au redimensionnement et à
   chaque changement d'orientation. */
function mountTopbarHeight() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const apply = () => {
    document.documentElement.style.setProperty('--topbar-h', header.offsetHeight + 'px');
  };
  apply();
  if ('ResizeObserver' in window) {
    new ResizeObserver(apply).observe(header);
  } else {
    window.addEventListener('resize', apply);
  }
}

function updateActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('[data-navhref]').forEach((el) => {
    const href = el.getAttribute('data-navhref');
    const active = href === '/' ? path === '/' : path.startsWith(href);
    el.classList.toggle('is-active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function formatImportLabel(date) {
  if (!date) return '';
  return (
    'Données réseau importées le ' +
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
}

function mountGtfsStatus() {
  const render = (state) => {
    const el = document.getElementById('footer-gtfs-status');
    if (!el) return;
    if (state.status === 'ready') el.textContent = formatImportLabel(state.importedAt);
    else if (state.status === 'loading') el.textContent = 'Import des données réseau en cours…';
    else if (state.status === 'error') el.textContent = 'Données réseau indisponibles pour le moment.';
    else el.textContent = '';
  };
  subscribe(render);
  render(getState());
}

/* Icônes (SVG inline, traits, cohérentes avec un style simple) */
function iconMenu() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
}
function iconHome() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`;
}
function iconRoute() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a4 4 0 0 0 4-4 4 4 0 0 0-4-4H8a4 4 0 0 1-4-4 4 4 0 0 1 4-4h2"/></svg>`;
}
function iconMap() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`;
}
function iconLine() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
}
function iconStop() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
}
