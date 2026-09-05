import { withGtfsReady, gtfsStatusBlockHtml, mountRetryButtons } from '../utils/gtfsReady.js';
import { routeColors, searchRoutes } from '../gtfs/helpers.js';
import { routeType } from '../gtfs/config.js';

function sortRoutes(routes) {
  return [...routes].sort((a, b) =>
    (a.route_short_name || a.route_long_name || '').localeCompare(
      b.route_short_name || b.route_long_name || '',
      'fr',
      { numeric: true }
    )
  );
}

function routeCardHtml(route) {
  const type = routeType(route.route_type);
  const { bg, text } = routeColors(route, type);
  const title = route.route_long_name || route.route_short_name || 'Ligne';
  return `
    <a href="/lignes/${encodeURIComponent(route.route_id)}" data-link class="card lignes-card">
      <span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route.route_short_name || '?')}</span>
      <span class="lignes-card-body">
        <span class="lignes-card-title">${escapeHtml(title)}</span>
        <span class="text-muted lignes-card-type">${type.icon} ${escapeHtml(type.name)}</span>
      </span>
    </a>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export async function render() {
  const html = `
    <style>
      .lignes-card {
        display: flex; align-items: center; gap: var(--sp-4);
        text-decoration: none; color: inherit; min-width: 0;
      }
      .lignes-card-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
      .lignes-card-title {
        font-weight: 600; overflow: hidden; text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lignes-card-type { font-size: var(--fs-label); }
      #lignes-grid { grid-template-columns: 1fr; }
      @media (min-width: 700px) {
        #lignes-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (min-width: 1000px) {
        #lignes-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
    </style>
    <div class="container section">
      <span class="eyebrow">Réseau</span>
      <h1 class="mt-0">Les lignes</h1>
      ${gtfsStatusBlockHtml()}
      <div data-role="page-content" hidden>
        <div class="field" style="max-width:480px;">
          <label for="lignes-search">Rechercher une ligne</label>
          <input class="input" id="lignes-search" type="search" placeholder="Rechercher une ligne…" autocomplete="off">
        </div>
        <div class="grid" id="lignes-grid"></div>
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
        const { data } = state;
        const gridEl = contentEl.querySelector('#lignes-grid');
        const searchEl = contentEl.querySelector('#lignes-search');

        const renderList = (query) => {
          const q = (query || '').trim();
          const list = q ? searchRoutes(data, q, 500) : sortRoutes(data.routes);
          if (!list.length) {
            gridEl.innerHTML = `<div class="alert alert-info" style="grid-column:1/-1;">Aucune ligne ne correspond à votre recherche.</div>`;
            return;
          }
          gridEl.innerHTML = (q ? list : list).map(routeCardHtml).join('');
        };

        renderList('');
        searchEl.addEventListener('input', () => renderList(searchEl.value));
      }, { loadingSelector: '[data-role="gtfs-loading"]', errorSelector: '[data-role="gtfs-error"]' });
    },
  };
}
