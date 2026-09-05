// Mini-carte Leaflet réutilisable — tracé(s) de ligne(s) + arrêts, avec mise en évidence et
// clic sur un arrêt. Partagée par la fiche Ligne (son propre tracé) et la fiche Arrêt (toutes
// les lignes qui la desservent). Gère elle-même son cycle de vie (taille, destruction) pour que
// chaque page appelante n'ait qu'à fournir des données et appeler destroy() au bon moment
// (sur l'évènement 'route:willchange', AVANT que le routeur ne remplace le HTML de la page).
import L from 'leaflet';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * @param {HTMLElement} mapEl - conteneur déjà présent dans le DOM (dimensionné en CSS).
 * @param {object} opts
 * @param {Array<{lines: Array<Array<[number,number]>>, color: string}>} [opts.routeLines] -
 *   groupes de tracés (un groupe par ligne pour un usage multi-lignes), chacun avec sa couleur.
 * @param {Array<{id:string, name:string, lat:number, lon:number}>} [opts.stops] - arrêts à afficher.
 * @param {(stopId:string)=>void} [opts.onStopClick] - appelé au clic sur un marqueur d'arrêt.
 * @param {string} [opts.highlightColor] - couleur du marqueur mis en avant par highlightStop().
 * @returns {{map:import('leaflet').Map, highlightStop:(stopId:string|null)=>void, destroy:()=>void}}
 */
export function createRouteMap(mapEl, { routeLines = [], stops = [], onStopClick, highlightColor = '#1414c8' } = {}) {
  const map = L.map(mapEl, { attributionControl: true });
  L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

  const bounds = [];
  for (const group of routeLines) {
    for (const coords of group.lines || []) {
      if (!coords || coords.length < 2) continue;
      L.polyline(coords, { color: group.color, weight: 5, opacity: 0.85, lineJoin: 'round' }).addTo(map);
      bounds.push(...coords);
    }
  }

  const markersByStop = {};
  const defaultStyle = { radius: 6, weight: 2, color: '#101024', fillColor: '#ffffff', fillOpacity: 1 };
  for (const stop of stops) {
    if (stop.lat == null || stop.lon == null || isNaN(stop.lat) || isNaN(stop.lon)) continue;
    const marker = L.circleMarker([stop.lat, stop.lon], { ...defaultStyle });
    marker.bindTooltip(stop.name || stop.id, { direction: 'top' });
    if (onStopClick) marker.on('click', () => onStopClick(stop.id));
    marker.addTo(map);
    markersByStop[stop.id] = marker;
    bounds.push([stop.lat, stop.lon]);
  }

  if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 16 });
  else map.setView([46.6, 2.3], 6); // repli générique si aucune coordonnée exploitable

  let highlighted = null;
  function highlightStop(stopId) {
    if (highlighted && markersByStop[highlighted]) markersByStop[highlighted].setStyle(defaultStyle);
    highlighted = stopId || null;
    if (highlighted && markersByStop[highlighted]) {
      markersByStop[highlighted].setStyle({ radius: 9, weight: 3, color: highlightColor, fillColor: highlightColor, fillOpacity: 1 });
      markersByStop[highlighted].bringToFront();
    }
  }

  let destroyed = false;
  const fixSize = () => { if (!destroyed) map.invalidateSize(); };
  requestAnimationFrame(fixSize);
  const sizeTimer = setTimeout(fixSize, 200);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(sizeTimer);
    map.remove();
  }

  return { map, highlightStop, destroy };
}
