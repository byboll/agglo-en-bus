import { withGtfsReady, gtfsStatusBlockHtml, mountRetryButtons } from '../utils/gtfsReady.js';
import { searchStops, stopsNear, linesForStop, routeColors } from '../gtfs/helpers.js';
import { routeType } from '../gtfs/config.js';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatDist(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

function linesBadgesHtml(data, indices, stopId) {
  const lines = linesForStop(data, indices, stopId);
  if (!lines.length) return '';
  return `
    <div class="arrets-row-lines">
      ${lines.map(({ route, headsign }) => {
        const type = routeType(route.route_type);
        const { bg, text } = routeColors(route, type);
        return `
          <span class="arrets-row-line">
            <span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route.route_short_name || '?')}</span>
            ${headsign ? `<span class="arrets-row-headsign text-muted">→ ${escapeHtml(headsign)}</span>` : ''}
          </span>`;
      }).join('')}
    </div>`;
}

function stopRowHtml(data, indices, stop, extraLabel) {
  return `
    <a href="/arrets/${encodeURIComponent(stop.stop_id)}" data-link class="card arrets-row">
      <div class="arrets-row-top">
        <span class="arrets-row-name">${escapeHtml(stop.stop_name)}</span>
        ${extraLabel ? `<span class="text-muted mono arrets-row-extra">${extraLabel}</span>` : ''}
      </div>
      ${linesBadgesHtml(data, indices, stop.stop_id)}
    </a>`;
}

export async function render() {
  const html = `
    <style>
      .arrets-row {
        display: block; text-decoration: none; color: inherit; margin-bottom: var(--sp-3);
      }
      .arrets-row-top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
      .arrets-row-name { font-weight: 500; }
      .arrets-row-extra { flex-shrink: 0; font-size: var(--fs-label); }
      .arrets-row-lines { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); margin-top: var(--sp-2); }
      .arrets-row-line { display: inline-flex; align-items: center; gap: 6px; }
      .arrets-row-headsign { font-size: var(--fs-label); }
      #arrets-list { margin-top: var(--sp-5); }
      .arrets-tools-row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--sp-3); }
    </style>
    <div class="container section">
      <span class="eyebrow">Réseau</span>
      <h1 class="mt-0">Les arrêts</h1>
      ${gtfsStatusBlockHtml()}
      <div data-role="page-content" hidden>
        <div class="field" style="max-width:480px;">
          <label for="arrets-search">Rechercher un arrêt</label>
          <input class="input" id="arrets-search" type="search" placeholder="Rechercher un arrêt par son nom…" autocomplete="off">
        </div>
        <div class="arrets-tools-row">
          <button type="button" class="btn btn-outline" id="arrets-geoloc-btn">📍 Arrêts près de moi</button>
          <button type="button" class="btn btn-ghost" id="arrets-reset-btn" hidden>↺ Réinitialiser</button>
        </div>
        <div id="arrets-geoloc-msg"></div>
        <div id="arrets-list"></div>
      </div>
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
        const searchEl = contentEl.querySelector('#arrets-search');
        const geolocBtn = contentEl.querySelector('#arrets-geoloc-btn');
        const geolocMsg = contentEl.querySelector('#arrets-geoloc-msg');
        const resetBtn = contentEl.querySelector('#arrets-reset-btn');
        const listEl = contentEl.querySelector('#arrets-list');

        const renderDefault = () => {
          resetBtn.hidden = true;
          const sample = [...data.stops]
            .sort((a, b) => (a.stop_name || '').localeCompare(b.stop_name || '', 'fr'))
            .slice(0, 30);
          listEl.innerHTML = `
            <p class="alert alert-info">Recherchez un arrêt par son nom, ou trouvez les arrêts les plus proches de vous.</p>
            ${sample.map((s) => stopRowHtml(data, indices, s)).join('')}`;
        };

        const renderSearch = (query) => {
          resetBtn.hidden = false;
          const results = searchStops(data, query, 50);
          if (!results.length) {
            listEl.innerHTML = `<div class="alert alert-info">Aucun arrêt ne correspond à votre recherche.</div>`;
            return;
          }
          listEl.innerHTML = results.map((s) => stopRowHtml(data, indices, s)).join('');
        };

        const renderNear = (lat, lon) => {
          resetBtn.hidden = false;
          const results = stopsNear(data, lat, lon, 700, 20);
          if (!results.length) {
            listEl.innerHTML = `<div class="alert alert-info">Aucun arrêt trouvé à moins de 700 m de votre position.</div>`;
            return;
          }
          listEl.innerHTML = results.map((x) => stopRowHtml(data, indices, x.stop, formatDist(x.dist))).join('');
        };

        const reset = () => {
          searchEl.value = '';
          geolocMsg.innerHTML = '';
          renderDefault();
        };

        searchEl.addEventListener('input', () => {
          const q = searchEl.value.trim();
          geolocMsg.innerHTML = '';
          if (!q) renderDefault();
          else renderSearch(q);
        });

        geolocBtn.addEventListener('click', () => {
          if (!('geolocation' in navigator)) {
            geolocMsg.innerHTML = `<p class="sr-note">La géolocalisation n'est pas disponible sur cet appareil.</p>`;
            return;
          }
          geolocMsg.innerHTML = `<p class="text-muted"><span class="spinner" aria-hidden="true"></span> Localisation en cours…</p>`;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              geolocMsg.innerHTML = '';
              searchEl.value = '';
              renderNear(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
              const denied = err && err.code === 1;
              geolocMsg.innerHTML = `<p class="sr-note">${denied
                ? "L'accès à votre position a été refusé. Vous pouvez toujours rechercher un arrêt par son nom."
                : "Impossible de déterminer votre position pour le moment. Vous pouvez toujours rechercher un arrêt par son nom."}</p>`;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });

        resetBtn.addEventListener('click', reset);

        renderDefault();
      }, { loadingSelector: '[data-role="gtfs-loading"]', errorSelector: '[data-role="gtfs-error"]' });
    },
  };
}
