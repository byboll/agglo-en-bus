// Store GTFS-Realtime — mirror du pattern de gtfs/store.js (state + listeners + subscribe/notify),
// mais sans cache sessionStorage : les données (positions véhicules, retards, alertes) sont
// éphémères par nature, pas d'intérêt à les persister entre deux visites.
import { decodeFeedMessage } from './realtimeProto.js';
import { GTFS_RT_URL, GTFS_RT_POLL_MS } from './config.js';

class GtfsRtFetchError extends Error {}

const state = {
  status: 'idle', // idle | loading | ready | error
  error: null,
  tripUpdatesByTripId: {}, // trip_id -> { trip, vehicle, byStop: { stop_id -> stopTimeUpdate } }
  vehiclesByTripId: {}, // trip_id -> VehiclePosition décodé
  alerts: [], // Alert[] décodés
  lastSuccessAt: null,
};

const listeners = new Set();
function notify() {
  for (const fn of listeners) fn(state);
}
export function subscribeRt(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getRtState() {
  return state;
}

/** Un flux qui n'a plus été rafraîchi avec succès depuis trop longtemps ne doit plus être présenté
 *  comme "temps réel" à l'utilisateur (mieux vaut retomber sur l'horaire théorique que d'afficher
 *  une heure "live" en réalité périmée). */
export function isRtFresh() {
  return !!state.lastSuccessAt && Date.now() - state.lastSuccessAt.getTime() < GTFS_RT_POLL_MS * 3;
}

function applyFeed(feed) {
  const tripUpdatesByTripId = {};
  const vehiclesByTripId = {};
  const alerts = [];
  for (const e of feed.entity || []) {
    const tu = e.tripUpdate;
    if (tu?.trip?.tripId) {
      const byStop = {};
      for (const stu of tu.stopTimeUpdate || []) {
        if (stu.stopId) byStop[stu.stopId] = stu;
      }
      tripUpdatesByTripId[tu.trip.tripId] = { trip: tu.trip, vehicle: tu.vehicle, byStop };
    }
    const v = e.vehicle;
    if (v?.trip?.tripId) vehiclesByTripId[v.trip.tripId] = v;
    if (e.alert) alerts.push(e.alert);
  }
  state.tripUpdatesByTripId = tripUpdatesByTripId;
  state.vehiclesByTripId = vehiclesByTripId;
  state.alerts = alerts;
}

async function fetchOnce() {
  try {
    const res = await fetch(GTFS_RT_URL, { cache: 'no-store' });
    if (!res.ok) throw new GtfsRtFetchError(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const feed = decodeFeedMessage(new Uint8Array(buf));
    applyFeed(feed);
    state.status = 'ready';
    state.error = null;
    state.lastSuccessAt = new Date();
  } catch (err) {
    // On garde les dernières données connues (tripUpdatesByTripId/vehiclesByTripId/alerts) plutôt
    // que de les vider sur un raté ponctuel — isRtFresh() protège l'affichage si ça dure trop.
    state.status = 'error';
    state.error = err;
    console.warn('[gtfs-rt] échec du rafraîchissement :', err?.message || err);
  }
  notify();
}

let started = false;
export function initRealtime() {
  if (started) return;
  started = true;
  state.status = 'loading';
  notify();
  fetchOnce();
  setInterval(fetchOnce, GTFS_RT_POLL_MS);
}
