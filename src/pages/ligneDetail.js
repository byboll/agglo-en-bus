import { withGtfsReady, gtfsStatusBlockHtml, mountRetryButtons } from '../utils/gtfsReady.js';
import {
  routeColors, tripsForRoute, canonicalStopOrder, shapesForTrips,
} from '../gtfs/helpers.js';
import { routeType } from '../gtfs/config.js';
import { createRouteMap } from '../components/routeMap.js';
import { navigate } from '../router.js';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Intitulé le plus fréquent parmi les trips d'un sens — sert de nom de direction. */
function mostCommonHeadsign(trips) {
  const counts = new Map();
  for (const t of trips) {
    if (!t.trip_headsign) continue;
    counts.set(t.trip_headsign, (counts.get(t.trip_headsign) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [hs, c] of counts) {
    if (c > bestCount) { best = hs; bestCount = c; }
  }
  return best;
}

function buildDirectionHtml(data, indices, allTripsForDir, bg) {
  // Le tracé/liste d'arrêts d'une ligne est une propriété de la ligne elle-même : il doit rester
  // visible même un jour où ce sens ne circule pas (ex. ligne scolaire un dimanche).
  const canonStops = canonicalStopOrder(data, allTripsForDir);

  const stopsHtml = canonStops.length
    ? `
      <div class="field ligne-stop-search-field">
        <label for="ligne-stop-search">Rechercher un arrêt de cette ligne</label>
        <input class="input" id="ligne-stop-search" type="search" placeholder="Rechercher un arrêt…" autocomplete="off">
      </div>
      <ol class="ligne-stops-list" style="--ligne-color:${bg};">${canonStops.map((sid) => {
        const stop = indices.stopsById[sid];
        if (!stop) return '';
        const name = stop.stop_name || '';
        return `
          <li data-stop-id="${escapeHtml(sid)}" data-stop-name="${escapeHtml(name.toLowerCase())}">
            <a href="/arrets/${encodeURIComponent(sid)}" data-link class="ligne-stop-link">
              <span class="ligne-stop-name">${escapeHtml(name)}</span>
              <span class="ligne-stop-chevron" aria-hidden="true">›</span>
            </a>
          </li>`;
      }).join('')}</ol>
      <p class="text-muted" data-role="ligne-stops-empty" hidden>Aucun arrêt ne correspond à votre recherche.</p>`
    : `<p class="text-muted">Aucun arrêt connu pour ce sens.</p>`;

  return `
    <div class="ligne-detail-layout">
      <div class="card">
        <h2 class="mt-0" style="font-size:var(--fs-h3);">Arrêts desservis</h2>
        ${stopsHtml}
      </div>
      <div class="ligne-map-col">
        <div class="ligne-map" id="ligne-map"></div>
      </div>
    </div>`;
}

export async function render({ params }) {
  const html = `
    <style>
      .ligne-detail-layout { display: grid; grid-template-columns: 1fr; gap: var(--sp-5); align-items: start; }
      @media (min-width: 900px) { .ligne-detail-layout { grid-template-columns: 1.1fr 1.3fr; } }
      .ligne-map-col { position: sticky; top: calc(var(--topbar-h, calc(var(--header-h) + var(--safe-top))) + var(--sp-4)); }
      .ligne-map {
        height: 380px; border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--color-border);
        position: relative; isolation: isolate;
      }
      @media (max-width: 899px) { .ligne-map-col { position: static; } .ligne-map { height: 300px; } }
      .ligne-stop-search-field { margin: 0 0 var(--sp-4); }
      .ligne-stops-list {
        --ligne-color: var(--color-blue);
        list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column;
      }
      /* Le trait et la pastille sont des éléments à part (pas un border-left sur le <li>) afin
         que : 1) le fond rose au survol (background sur le <li>, qui part de x:0) puisse déborder
         à gauche du trait sans que border-radius ne le déforme, et 2) le trait de chaque <li>
         puisse être coupé pile à mi-hauteur pour le premier/dernier arrêt (jamais avant/après). */
      .ligne-stops-list li { position: relative; padding: var(--sp-3) 0 var(--sp-3) 56px; }
      .ligne-stops-list li[hidden] { display: none; }
      .ligne-stops-list li::before {
        content: ''; position: absolute; left: 22px; top: 0; bottom: 0; width: 4px;
        background: var(--ligne-color);
      }
      .ligne-stops-list li:first-child::before { top: 50%; }
      .ligne-stops-list li:last-child::before { bottom: 50%; }
      /* Pastille dans le même style que les marqueurs de la carte (blanc, filet foncé) — au
         survol, elle se colore comme le marqueur mis en avant sur la carte (highlightStop). */
      .ligne-stops-list li::after {
        content: ''; position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
        width: 28px; height: 28px; border-radius: 50%; box-sizing: border-box; z-index: 1;
        background: var(--color-surface); border: 3px solid var(--color-ink);
      }
      .ligne-stops-list li.is-hovered {
        background: color-mix(in srgb, var(--ligne-color) 10%, var(--color-surface));
        border-radius: var(--radius-card);
      }
      .ligne-stops-list li.is-hovered::after {
        border-color: var(--ligne-color);
        background: radial-gradient(circle, var(--ligne-color) 0 6px, var(--color-surface) 6px 100%);
      }
      .ligne-stop-link {
        display: flex; align-items: center; gap: var(--sp-2); min-height: 44px;
        padding-right: var(--sp-2); text-decoration: none; color: var(--color-ink);
      }
      .ligne-stop-name { flex: 1; min-width: 0; font-weight: 700; }
      .ligne-stop-chevron { flex-shrink: 0; color: var(--color-ink-soft); font-size: 1.2em; line-height: 1; }
    </style>
    <div class="container section">
      ${gtfsStatusBlockHtml()}
      <div data-role="page-content" hidden></div>
    </div>
  `;

  return {
    html,
    mount(container) {
      mountRetryButtons(container);
      withGtfsReady(container, (state) => {
        const contentEl = container.querySelector('[data-role="page-content"]');
        contentEl.hidden = false;
        const { data, indices } = state;
        const route = indices.routesById[params.id];

        if (!route) {
          contentEl.innerHTML = `
            <div class="alert alert-info">Ligne introuvable.</div>
            <a href="/lignes" data-link class="btn btn-outline">Retour aux lignes</a>`;
          return;
        }

        const type = routeType(route.route_type);
        const { bg, text } = routeColors(route, type);
        const title = route.route_long_name || route.route_short_name || 'Ligne';
        // Trajets de la ligne tous jours confondus (pas seulement aujourd'hui), pour construire
        // le tracé/liste d'arrêts même quand le service ne circule pas à la date du jour.
        const allRouteTrips = indices.routeTrips[route.route_id] || [];
        const allDir0 = allRouteTrips.filter((t) => t.direction_id !== '1');
        const allDir1 = allRouteTrips.filter((t) => t.direction_id === '1');

        const headerHtml = `
          <div class="flex" style="align-items:center;gap:var(--sp-3);flex-wrap:wrap;margin-bottom:var(--sp-2);">
            <span class="line-pill" style="background:${bg};color:${text};font-size:1.1rem;">${escapeHtml(route.route_short_name || '?')}</span>
            <h1 class="mt-0" style="margin-bottom:0;">${escapeHtml(title)}</h1>
          </div>
          <p class="text-muted" style="margin-top:0;">${type.icon} ${escapeHtml(type.name)}</p>
        `;

        const hasBoth = allDir0.length > 0 && allDir1.length > 0;
        const bodyContainerId = 'ligne-direction-body';
        const dir0Label = mostCommonHeadsign(allDir0) || 'Aller';
        const dir1Label = mostCommonHeadsign(allDir1) || 'Retour';

        let toggleHtml = '';
        if (hasBoth) {
          toggleHtml = `
            <div class="segmented" style="margin-bottom:var(--sp-5);" role="group" aria-label="Sens de circulation">
              <button type="button" class="seg-btn" data-dir="0" aria-pressed="true">→ ${escapeHtml(dir0Label)}</button>
              <button type="button" class="seg-btn" data-dir="1" aria-pressed="false">→ ${escapeHtml(dir1Label)}</button>
            </div>`;
        }

        contentEl.innerHTML = `
          ${headerHtml}
          ${toggleHtml}
          <div id="${bodyContainerId}"></div>
        `;

        const bodyEl = contentEl.querySelector(`#${bodyContainerId}`);
        let mapApi = null;
        const destroyMap = () => { if (mapApi) { mapApi.destroy(); mapApi = null; } };

        const applyStopFilter = (query) => {
          const q = query.trim().toLowerCase();
          const items = [...bodyEl.querySelectorAll('.ligne-stops-list li[data-stop-id]')];
          let anyVisible = false;
          items.forEach((li) => {
            const match = !q || (li.dataset.stopName || '').includes(q);
            li.hidden = !match;
            if (match) anyVisible = true;
          });
          const emptyEl = bodyEl.querySelector('[data-role="ligne-stops-empty"]');
          if (emptyEl) emptyEl.hidden = !items.length || anyVisible;
        };

        const renderDir = (dirIdx) => {
          // Conserve la recherche en cours d'un sens à l'autre (bodyEl est entièrement remplacé).
          const prevQuery = bodyEl.querySelector('#ligne-stop-search')?.value || '';
          destroyMap();
          const allTripsForDir = dirIdx === 1 ? allDir1 : allDir0;
          bodyEl.innerHTML = buildDirectionHtml(data, indices, allTripsForDir, bg);

          const searchInput = bodyEl.querySelector('#ligne-stop-search');
          if (searchInput) {
            searchInput.value = prevQuery;
            searchInput.addEventListener('input', () => applyStopFilter(searchInput.value));
            if (prevQuery) applyStopFilter(prevQuery);
          }

          const canonStops = canonicalStopOrder(data, allTripsForDir);
          const stopsForMap = canonStops
            .map((sid) => indices.stopsById[sid])
            .filter((s) => s && s.stop_lat && !isNaN(+s.stop_lat))
            .map((s) => ({ id: s.stop_id, name: s.stop_name, lat: +s.stop_lat, lon: +s.stop_lon }));
          const lines = shapesForTrips(data, allTripsForDir);

          const mapEl = bodyEl.querySelector('#ligne-map');
          if (!mapEl) return;
          if (!stopsForMap.length && !lines.length) {
            mapEl.outerHTML = `<div class="alert alert-info">Tracé et arrêts non disponibles pour ce sens.</div>`;
            return;
          }
          mapApi = createRouteMap(mapEl, {
            routeLines: [{ lines, color: bg }],
            stops: stopsForMap,
            highlightColor: bg,
            onStopClick: (stopId) => navigate(`/arrets/${stopId}`),
          });

          // Survol d'un arrêt dans la liste -> mise en avant du marqueur correspondant sur la carte.
          bodyEl.querySelectorAll('.ligne-stops-list li[data-stop-id]').forEach((li) => {
            const sid = li.dataset.stopId;
            li.addEventListener('mouseenter', () => { li.classList.add('is-hovered'); mapApi?.highlightStop(sid); });
            li.addEventListener('mouseleave', () => { li.classList.remove('is-hovered'); mapApi?.highlightStop(null); });
          });
        };

        const initialDir = allDir0.length > 0 ? 0 : allDir1.length > 0 ? 1 : 0;
        renderDir(initialDir);

        if (hasBoth) {
          contentEl.querySelectorAll('.seg-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
              contentEl.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
              renderDir(+btn.dataset.dir);
            });
          });
        }

        document.addEventListener('route:willchange', destroyMap, { once: true });
      }, { loadingSelector: '[data-role="gtfs-loading"]', errorSelector: '[data-role="gtfs-error"]' });
    },
  };
}
