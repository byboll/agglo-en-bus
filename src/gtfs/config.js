// Adresse publique du flux GTFS statique du réseau (mis à jour côté serveur par l'exploitant).
// Le fichier est téléchargé et analysé directement dans le navigateur du visiteur.
export const GTFS_URL = 'https://gtfs-rt.infra-hubup.fr/cagtd/current/gtfs';

// Flux GTFS-Realtime (trip updates + positions véhicules + alertes trafic), même exploitant.
export const GTFS_RT_URL = 'https://gtfs-rt.infra-hubup.fr/cagtd/realtime';
export const GTFS_RT_POLL_MS = 20000;

// Incrémenter si la structure des données mises en cache change, pour invalider
// automatiquement les caches sessionStorage existants chez les visiteurs.
export const CACHE_VERSION = 1;
export const CACHE_KEY = 'agglo_en_bus_gtfs_cache_v' + CACHE_VERSION;

// Types de véhicules GTFS route_type -> libellé / icône / couleur par défaut
export const ROUTE_TYPES = {
  0: { name: 'Tramway', icon: '🚋', color: '#00838a' },
  1: { name: 'Métro', icon: '🚇', color: '#7a5cff' },
  2: { name: 'Train', icon: '🚆', color: '#2f6fed' },
  3: { name: 'Bus', icon: '🚌', color: '#e00080' },
  4: { name: 'Bateau', icon: '⛴️', color: '#00a3c4' },
  5: { name: 'Funiculaire par câble', icon: '🚡', color: '#e0578a' },
  6: { name: 'Téléphérique', icon: '🚠', color: '#f2884b' },
  7: { name: 'Funiculaire', icon: '🚞', color: '#7ec13d' },
  11: { name: 'Trolleybus', icon: '🚎', color: '#1fb6a6' },
  12: { name: 'Monorail', icon: '🚝', color: '#a768e0' },
};

export function routeType(t) {
  return ROUTE_TYPES[t] || { name: 'Ligne', icon: '🚌', color: '#0000f8' };
}
