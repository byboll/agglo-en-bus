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

function buildDirectionHtml(data, indices, allTripsForDir) {
  // Le tracé/liste d'arrêts d'une ligne est une propriété de la ligne elle-même : il doit rester
  // visible même un jour où ce sens ne circule pas (ex. ligne scolaire un dimanche).
  const canonStops = canonicalStopOrder(data, allTripsForDir);

  const stopsHtml = canonStops.length
    ? `<ol class="ligne-stops-list">${canonStops.map((sid) => {
        const stop = indices.stopsById[sid];
        if (!stop) return '';
        return `<li data-stop-id="${escapeHtml(sid)}"><a href="/arrets/${encodeURIComponent(sid)}" data-link>${escapeHtml(stop.stop_name)}</a></li>`;
      }).join('')}</ol>`
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
      .ligne-stops-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
      .ligne-stops-list li {
        position: relative; padding: var(--sp-2) 0 var(--sp-2) var(--sp-5);
        border-left: 2px solid var(--color-border); margin-left: var(--sp-2); cursor: default;
        transition: background-color .12s ease;
      }
      .ligne-stops-list li:last-child { border-left-color: transparent; }
      .ligne-stops-list li::before {
        content: ''; position: absolute; left: calc(-1 * 5px); top: calc(var(--sp-2) + 4px);
        width: 10px; height: 10px; border-radius: 50%; background: var(--color-blue);
      }
      .ligne-stops-list li.is-hovered { background: var(--color-surface-alt); border-radius: var(--radius-card); }
      .ligne-stops-list li a { text-decoration: none; color: inherit; font-weight: 500; }
      .ligne-stops-list li a:hover { text-decoration: underline; }
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

        let toggleHtml = '';
        if (hasBoth) {
          toggleHtml = `
            <div class="segmented" style="margin-bottom:var(--sp-5);" role="group" aria-label="Sens de circulation">
              <button type="button" class="seg-btn" data-dir="0" aria-pressed="true">Aller</button>
              <button type="button" class="seg-btn" data-dir="1" aria-pressed="false">Retour</button>
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

        const renderDir = (dirIdx) => {
          destroyMap();
          const allTripsForDir = dirIdx === 1 ? allDir1 : allDir0;
          bodyEl.innerHTML = buildDirectionHtml(data, indices, allTripsForDir);

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
