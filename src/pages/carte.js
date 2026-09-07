import './carte.css';
import L from 'leaflet';
import { withGtfsReady, gtfsStatusBlockHtml, mountRetryButtons } from '../utils/gtfsReady.js';
import { routeColors, shapesForRoute, vehiclesForRoute } from '../gtfs/helpers.js';
import { routeType } from '../gtfs/config.js';
import { createVehicleLayer } from '../components/vehicleMarkers.js';
import { subscribeRt } from '../gtfs/realtime.js';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function sortRoutes(routes) {
  return [...routes].sort((a, b) =>
    (a.route_short_name || a.route_long_name || '').localeCompare(
      b.route_short_name || b.route_long_name || '',
      'fr',
      { numeric: true }
    )
  );
}

/** Construit la carte Leaflet dans `root` (le data-role="page-content" déjà visible). */
function initCarte(root, data, indices) {
  const layoutEl = root.querySelector('.carte-layout');
  const filterPanelEl = root.querySelector('#carte-filter-panel');
  const filterListEl = root.querySelector('#carte-filter-list');
  const mapEl = root.querySelector('#carte-map');

  const stopsWithCoords = data.stops.filter(
    (s) => s.stop_lat && s.stop_lon && !isNaN(+s.stop_lat) && !isNaN(+s.stop_lon)
  );

  if (!stopsWithCoords.length) {
    layoutEl.innerHTML = `
      <div class="alert alert-info" style="margin:0 var(--mobile-margin);">
        Impossible d'afficher la carte du réseau : aucune coordonnée d'arrêt n'est disponible
        dans les données actuellement chargées.
      </div>`;
    return;
  }

  const map = L.map(mapEl, { attributionControl: true, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Tracés par ligne -----------------------------------------------------
  const sortedRoutes = sortRoutes(data.routes);
  const routeLayers = {}; // route_id -> L.LayerGroup
  let routesWithShape = 0;

  for (const route of sortedRoutes) {
    const lines = shapesForRoute(data, route.route_id);
    if (!lines.length) continue;
    routesWithShape++;
    const type = routeType(route.route_type);
    const { bg } = routeColors(route, type);
    const group = L.layerGroup(
      lines.map((coords) => L.polyline(coords, { color: bg, weight: 5, opacity: 0.85, lineJoin: 'round' }))
    );
    group.addTo(map);
    routeLayers[route.route_id] = group;
  }

  // Arrêts -----------------------------------------------------------------
  const stopsLayer = L.layerGroup().addTo(map);
  for (const stop of stopsWithCoords) {
    const point = [+stop.stop_lat, +stop.stop_lon];
    const routeIds = [...(indices.stopRoutes[stop.stop_id] || [])];
    const pillsHtml = routeIds
      .map((rid) => indices.routesById[rid])
      .filter(Boolean)
      .sort((a, b) => (a.route_short_name || '').localeCompare(b.route_short_name || '', 'fr', { numeric: true }))
      .map((r) => {
        const t = routeType(r.route_type);
        const { bg, text } = routeColors(r, t);
        return `<span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(r.route_short_name || '?')}</span>`;
      })
      .join(' ');
    const popupHtml = `
      <div class="carte-popup">
        <strong>${escapeHtml(stop.stop_name || 'Arrêt')}</strong>
        <div class="carte-popup-pills">${pillsHtml || '<span class="text-muted">Aucune ligne connue</span>'}</div>
        <a href="/arrets/${encodeURIComponent(stop.stop_id)}" data-link class="btn btn-outline btn-sm">Voir la fiche arrêt</a>
      </div>
    `;

    // Zone tactile élargie et invisible, superposée au picto : sur mobile un rayon de 5px est
    // trop petit à taper précisément. Le picto visible garde sa taille (voir marker plus bas).
    L.circleMarker(point, { radius: 14, stroke: false, fill: true, fillOpacity: 0 })
      .bindPopup(popupHtml)
      .addTo(stopsLayer);

    const marker = L.circleMarker(point, {
      radius: 5, weight: 1.5, color: '#101024', fillColor: '#ffffff', fillOpacity: 1,
    });
    marker.bindPopup(popupHtml);
    marker.addTo(stopsLayer);
  }

  const bounds = L.latLngBounds(stopsWithCoords.map((s) => [+s.stop_lat, +s.stop_lon]));
  map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });

  // Véhicules en circulation — uniquement sur les lignes actuellement cochées dans le filtre.
  const vehicleLayer = createVehicleLayer(map);
  const updateVehicles = () => {
    const visibleRouteIds = [...filterListEl.querySelectorAll('input[type="checkbox"]:checked')]
      .map((cb) => cb.dataset.routeId);
    const vehicles = visibleRouteIds.flatMap((rid) => {
      const route = indices.routesById[rid];
      const type = routeType(route?.route_type);
      const { bg } = routeColors(route, type);
      return vehiclesForRoute(rid).map((v) => ({
        lat: v.position.latitude, lon: v.position.longitude, bearing: v.position.bearing,
        tripId: v.trip.tripId, label: v.vehicle?.label, color: bg, icon: type.icon,
      }));
    });
    vehicleLayer.update(vehicles);
  };

  // Panneau de filtrage des lignes ------------------------------------------
  const filterableRoutes = sortedRoutes.filter((r) => routeLayers[r.route_id]);
  const countEl = root.querySelector('#carte-filter-count');
  if (countEl) countEl.textContent = `(${filterableRoutes.length})`;

  filterListEl.innerHTML = filterableRoutes
    .map((route) => {
      const type = routeType(route.route_type);
      const { bg, text } = routeColors(route, type);
      const title = route.route_long_name || route.route_short_name || 'Ligne';
      return `
        <label class="carte-filter-row">
          <input type="checkbox" checked data-route-id="${escapeHtml(route.route_id)}">
          <span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route.route_short_name || '?')}</span>
          <span class="carte-filter-name">${escapeHtml(title)}</span>
        </label>`;
    })
    .join('');

  filterListEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const layer = routeLayers[cb.dataset.routeId];
      if (!layer) return;
      if (cb.checked) layer.addTo(map);
      else map.removeLayer(layer);
      updateVehicles();
    });
  });

  root.querySelector('#carte-filter-all')?.addEventListener('click', () => {
    filterListEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = true;
      routeLayers[cb.dataset.routeId]?.addTo(map);
    });
    updateVehicles();
  });
  root.querySelector('#carte-filter-none')?.addEventListener('click', () => {
    filterListEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
      const layer = routeLayers[cb.dataset.routeId];
      if (layer) map.removeLayer(layer);
    });
    updateVehicles();
  });

  updateVehicles();
  const unsubscribeRt = subscribeRt(updateVehicles);

  // Ouvre le panneau par défaut sur grand écran (barre latérale toujours visible).
  if (window.matchMedia('(min-width: 900px)').matches) filterPanelEl.open = true;

  // Filet de sécurité : la carte peut se créer avec une taille encore incorrecte
  // si la mise en page n'est pas totalement stabilisée au montage.
  let cleaned = false;
  let sizeCheckDone = false;
  const fixSize = () => {
    if (sizeCheckDone || cleaned) return;
    sizeCheckDone = true;
    map.invalidateSize();
  };
  requestAnimationFrame(fixSize);
  const sizeTimer = setTimeout(fixSize, 200);

  // Nettoyage à la navigation — AVANT que le routeur ne remplace le HTML de cette page (tant que
  // le conteneur #carte-map est encore attaché au document), jamais après.
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(sizeTimer);
    unsubscribeRt();
    vehicleLayer.destroy();
    map.remove();
  };
  document.addEventListener('route:willchange', cleanup, { once: true });
}

export async function render() {
  const html = `
    <div class="carte-page-content">
      <div class="carte-header container">
        <span class="eyebrow">Réseau</span>
        <h1 class="mt-0">Carte du réseau</h1>
        <p class="sr-note" style="margin:0;">Tracés et arrêts issus des horaires théoriques publiés — véhicules en circulation affichés en temps réel quand disponible.</p>
      </div>
      <div class="container">
        ${gtfsStatusBlockHtml()}
      </div>
      <div data-role="page-content" hidden>
        <div class="carte-layout">
          <details class="card carte-filter-panel" id="carte-filter-panel">
            <summary>Filtrer les lignes affichées<span class="carte-filter-count" id="carte-filter-count"></span></summary>
            <div class="carte-filter-actions">
              <button type="button" class="btn btn-outline btn-sm" id="carte-filter-all">Tout afficher</button>
              <button type="button" class="btn btn-ghost btn-sm" id="carte-filter-none">Tout masquer</button>
            </div>
            <div class="carte-filter-list" id="carte-filter-list"></div>
          </details>
          <div class="carte-map-wrap">
            <div id="carte-map" class="carte-map"></div>
          </div>
        </div>
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
        if (!contentEl.dataset.initialized) {
          contentEl.dataset.initialized = '1';
          initCarte(contentEl, state.data, state.indices);
        }
      }, { loadingSelector: '[data-role="gtfs-loading"]', errorSelector: '[data-role="gtfs-error"]' });
    },
  };
}
