// Calque Leaflet réutilisable pour les positions de véhicules GTFS-Realtime — partagé par
// components/routeMap.js (fiches Ligne/Arrêt/Itinéraire) et pages/carte.js (qui construit sa carte
// Leaflet directement, sans passer par routeMap.js), pour ne pas dupliquer la logique d'icône et
// de diffing des marqueurs.
import L from 'leaflet';

export function vehicleDivIcon(emoji, color) {
  return L.divIcon({
    className: 'veh-marker',
    html: `<div class="veh-marker-inner" style="border-color:${color};">${emoji}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * @param {import('leaflet').Map} map
 * @param {{onVehicleClick?: (tripId:string)=>void}} [opts] - appelé au clic sur un véhicule,
 *   pour ouvrir la modale de détail de la course correspondante.
 * @returns {{update:(vehicles:Array<{lat:number,lon:number,tripId:string,label?:string,color:string,icon?:string,bearing?:number}>)=>void, destroy:()=>void}}
 */
export function createVehicleLayer(map, { onVehicleClick } = {}) {
  const layer = L.layerGroup().addTo(map);
  const markersByTripId = {};

  function update(vehicles) {
    const seen = new Set();
    for (const v of vehicles) {
      if (v.lat == null || v.lon == null) continue;
      seen.add(v.tripId);
      const rotation = typeof v.bearing === 'number' ? `transform:rotate(${v.bearing}deg);` : '';
      const existing = markersByTripId[v.tripId];
      if (existing) {
        existing.setLatLng([v.lat, v.lon]);
        existing.setIcon(vehicleDivIcon(v.icon || '🚌', v.color));
        const el = existing.getElement()?.querySelector('.veh-marker-inner');
        if (el) el.style.cssText += rotation;
      } else {
        const marker = L.marker([v.lat, v.lon], { icon: vehicleDivIcon(v.icon || '🚌', v.color), interactive: true, zIndexOffset: 500 });
        // Le tooltip identifie la ligne (v.label = route_short_name), pas le véhicule lui-même.
        if (v.label) marker.bindTooltip(`Ligne ${v.label}`, { direction: 'top' });
        if (onVehicleClick) marker.on('click', () => onVehicleClick(v.tripId));
        marker.addTo(layer);
        markersByTripId[v.tripId] = marker;
        const el = marker.getElement()?.querySelector('.veh-marker-inner');
        if (el && rotation) el.style.cssText += rotation;
      }
    }
    for (const tripId of Object.keys(markersByTripId)) {
      if (!seen.has(tripId)) {
        layer.removeLayer(markersByTripId[tripId]);
        delete markersByTripId[tripId];
      }
    }
  }

  function destroy() {
    layer.clearLayers();
    map.removeLayer(layer);
  }

  return { update, destroy };
}
