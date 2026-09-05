import { withGtfsReady, gtfsStatusBlockHtml, mountRetryButtons } from '../utils/gtfsReady.js';
import {
  routeColors, nextDeparturesForStop, nowSecsLocal, secsToTime,
  shapesForRoute, allDeparturesForStopOnDate,
} from '../gtfs/helpers.js';
import { routeType } from '../gtfs/config.js';
import { createRouteMap } from '../components/routeMap.js';
import { openTripModal } from '../components/tripModal.js';

const REFRESH_MS = 30000;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function pad2(n) { return String(n).padStart(2, '0'); }

function buildDeparturesHtml(data, indices, stopId) {
  const results = nextDeparturesForStop(data, indices, stopId, new Date(), nowSecsLocal(), 10);
  if (!results.length) {
    return `<p class="text-muted">Aucun autre passage prévu aujourd'hui à cet arrêt.</p>`;
  }
  return `
    <div class="arret-deps-list">
      ${results.map((r) => {
        const type = routeType(r.route?.route_type);
        const { bg, text } = routeColors(r.route, type);
        return `
          <button type="button" class="card arret-dep-row" data-trip-id="${escapeHtml(r.trip.trip_id)}">
            <span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(r.route?.route_short_name || '?')}</span>
            <span class="arret-dep-headsign">${escapeHtml(r.trip.trip_headsign || '')}</span>
            <span class="mono arret-dep-time">${secsToTime(r.depSecs)}</span>
          </button>`;
      }).join('')}
    </div>`;
}

function buildFullScheduleHtml(data, indices, stopId, date) {
  const results = allDeparturesForStopOnDate(data, indices, stopId, date);
  if (!results.length) {
    return `<p class="text-muted">Aucun passage prévu à cet arrêt à cette date.</p>`;
  }
  const byRoute = new Map();
  for (const r of results) {
    const rid = r.route?.route_id || '?';
    if (!byRoute.has(rid)) byRoute.set(rid, { route: r.route, items: [] });
    byRoute.get(rid).items.push(r);
  }
  return [...byRoute.values()]
    .map(({ route, items }) => {
      const type = routeType(route?.route_type);
      const { bg, text } = routeColors(route, type);
      return `
        <div class="arret-schedule-group">
          <div class="arret-schedule-group-head">
            <span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route?.route_short_name || '?')}</span>
            <span class="text-muted">${escapeHtml(route?.route_long_name || '')}</span>
          </div>
          <div class="arret-schedule-times">
            ${items.map((r) => `
              <button type="button" class="arret-schedule-chip mono" data-trip-id="${escapeHtml(r.trip.trip_id)}" title="${escapeHtml(r.trip.trip_headsign || '')}">
                ${secsToTime(r.depSecs)}
              </button>`).join('')}
          </div>
        </div>`;
    })
    .join('');
}

export async function render({ params }) {
  const html = `
    <style>
      .arret-lines-list { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: var(--sp-3) 0; }
      .arret-lines-list a { text-decoration: none; }
      .arret-map { height: 260px; border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--color-border); margin: var(--sp-4) 0; }
      .arret-deps-list { display: flex; flex-direction: column; gap: var(--sp-2); }
      .arret-dep-row {
        display: flex; align-items: center; gap: var(--sp-3); width: 100%;
        font: inherit; text-align: left; cursor: pointer;
        background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card);
        padding: var(--sp-4);
      }
      .arret-dep-row:hover { background: var(--color-surface-alt); }
      .arret-dep-headsign { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-ink-soft); }
      .arret-dep-time { flex-shrink: 0; font-weight: 600; }
      .arret-schedule-group { margin-bottom: var(--sp-4); }
      .arret-schedule-group-head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-2); }
      .arret-schedule-times { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
      .arret-schedule-chip {
        border: 1px solid var(--color-border); border-radius: var(--radius-pill); background: var(--color-surface);
        padding: 0.4em 0.9em; font-size: var(--fs-label); cursor: pointer;
      }
      .arret-schedule-chip:hover { background: var(--color-surface-alt); }
      .arret-schedule-row { display: flex; align-items: flex-end; gap: var(--sp-3); flex-wrap: wrap; }
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
      let intervalId = null;
      let mapApi = null;
      const destroyMap = () => { if (mapApi) { mapApi.destroy(); mapApi = null; } };

      withGtfsReady(container, (state) => {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        destroyMap();

        const contentEl = container.querySelector('[data-role="page-content"]');
        contentEl.hidden = false;
        const { data, indices } = state;
        const stop = indices.stopsById[params.id];

        if (!stop) {
          contentEl.innerHTML = `
            <div class="alert alert-info">Arrêt introuvable.</div>
            <a href="/arrets" data-link class="btn btn-outline">Retour aux arrêts</a>`;
          return;
        }

        const routeIds = [...(indices.stopRoutes[stop.stop_id] || [])];
        const lines = routeIds.map((rid) => indices.routesById[rid]).filter(Boolean);

        const linesHtml = lines.length
          ? `<div class="arret-lines-list">${lines.map((route) => {
              const type = routeType(route.route_type);
              const { bg, text } = routeColors(route, type);
              return `<a href="/lignes/${encodeURIComponent(route.route_id)}" data-link class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route.route_short_name || '?')}</a>`;
            }).join('')}</div>`
          : `<p class="text-muted">Aucune ligne connue pour cet arrêt.</p>`;

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

        contentEl.innerHTML = `
          <span class="eyebrow">Arrêt</span>
          <h1 class="mt-0" style="margin-bottom:var(--sp-1);">${escapeHtml(stop.stop_name)}</h1>
          ${stop.stop_code ? `<p class="text-muted mono" style="margin-top:0;">Code arrêt : ${escapeHtml(stop.stop_code)}</p>` : ''}
          ${linesHtml}
          <div id="arret-map" class="arret-map"></div>
          <div class="card" style="margin-top:var(--sp-5);">
            <h2 class="mt-0" style="font-size:var(--fs-h3);">Prochains passages</h2>
            <p class="sr-note" style="margin-top:calc(var(--sp-2) * -1);">Horaires théoriques, issus de la fiche horaire — pas de suivi en temps réel. Cliquez sur un passage pour voir le détail de la course.</p>
            <div id="arret-deps"></div>
          </div>
          <div class="card" style="margin-top:var(--sp-5);">
            <h2 class="mt-0" style="font-size:var(--fs-h3);">Tous les horaires</h2>
            <p class="sr-note" style="margin-top:calc(var(--sp-2) * -1);">Consultez l'ensemble des passages à cet arrêt pour une date donnée, afin d'anticiper vos déplacements.</p>
            <div class="arret-schedule-row" style="margin-bottom:var(--sp-4);">
              <div class="field" style="margin-bottom:0;max-width:220px;">
                <label for="arret-schedule-date">Date</label>
                <input class="input" id="arret-schedule-date" type="date" value="${todayStr}">
              </div>
            </div>
            <div id="arret-schedule"></div>
          </div>
        `;

        // Carte : emplacement de l'arrêt + tracés des lignes qui le desservent.
        const mapEl = contentEl.querySelector('#arret-map');
        if (stop.stop_lat && !isNaN(+stop.stop_lat)) {
          mapApi = createRouteMap(mapEl, {
            routeLines: lines.map((route) => {
              const type = routeType(route.route_type);
              const { bg } = routeColors(route, type);
              return { lines: shapesForRoute(data, route.route_id), color: bg };
            }),
            stops: [{ id: stop.stop_id, name: stop.stop_name, lat: +stop.stop_lat, lon: +stop.stop_lon }],
          });
          mapApi.highlightStop(stop.stop_id);
        } else {
          mapEl.outerHTML = `<div class="alert alert-info">Emplacement de cet arrêt non disponible.</div>`;
        }

        const depsEl = contentEl.querySelector('#arret-deps');
        const refresh = () => {
          depsEl.innerHTML = buildDeparturesHtml(data, indices, stop.stop_id);
        };
        refresh();

        const openTripFromRow = (btn) => {
          const tripId = btn?.dataset.tripId;
          if (!tripId) return;
          openTripModal(data, indices, { tripId, boardStopId: stop.stop_id });
        };
        depsEl.addEventListener('click', (e) => openTripFromRow(e.target.closest('[data-trip-id]')));

        intervalId = setInterval(() => {
          if (!container.isConnected || !contentEl.isConnected) {
            clearInterval(intervalId);
            intervalId = null;
            return;
          }
          refresh();
        }, REFRESH_MS);

        // Tous les horaires — filtrable par date.
        const scheduleEl = contentEl.querySelector('#arret-schedule');
        const dateInput = contentEl.querySelector('#arret-schedule-date');
        const refreshSchedule = () => {
          const dateObj = new Date(`${dateInput.value}T00:00:00`);
          scheduleEl.innerHTML = isNaN(dateObj.getTime())
            ? `<p class="text-muted">Date invalide.</p>`
            : buildFullScheduleHtml(data, indices, stop.stop_id, dateObj);
        };
        refreshSchedule();
        dateInput.addEventListener('change', refreshSchedule);
        scheduleEl.addEventListener('click', (e) => openTripFromRow(e.target.closest('[data-trip-id]')));
      }, { loadingSelector: '[data-role="gtfs-loading"]', errorSelector: '[data-role="gtfs-error"]' });

      document.addEventListener('route:willchange', destroyMap, { once: true });
    },
  };
}
