// Store GTFS — état partagé de toute l'application, en mémoire pour la durée de la session
// (+ copie sessionStorage pour survivre à une actualisation de page dans le même onglet ;
// jamais persisté au-delà de la fermeture de l'onglet/navigateur : sessionStorage s'efface alors).
import { fetchAndParseGtfs, GtfsFetchError } from './fetchAndParse.js';
import { buildIndices } from './helpers.js';
import { resetRaptorCache } from './raptor.js';
import { CACHE_KEY, CACHE_VERSION } from './config.js';

const state = {
  status: 'idle', // idle | loading | ready | error
  progress: { pct: 0, label: '' },
  error: null,
  data: null,
  indices: null,
  importedAt: null, // Date de récupération du flux (pour affichage "dernier import")
};

const listeners = new Set();
function notify() {
  for (const fn of listeners) fn(state);
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getState() {
  return state;
}

function tryLoadFromSessionCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.v !== CACHE_VERSION || !parsed.data) return false;
    state.data = reviveStopTimesAndShapes(parsed.data);
    state.indices = buildIndices(state.data);
    state.importedAt = new Date(parsed.importedAt);
    state.status = 'ready';
    resetRaptorCache();
    return true;
  } catch (e) {
    console.warn('[gtfs] cache sessionStorage illisible, ignoré', e);
    return false;
  }
}

function reviveStopTimesAndShapes(data) {
  // JSON round-trip conserve déjà objets/tableaux simples — fourni pour extension future.
  return data;
}

function saveToSessionCache() {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ v: CACHE_VERSION, importedAt: state.importedAt.toISOString(), data: state.data })
    );
  } catch (e) {
    // Quota dépassé ou stockage indisponible (navigation privée) : on continue sans cache persistant,
    // les données restent disponibles en mémoire pour la session en cours.
    console.warn('[gtfs] cache sessionStorage indisponible :', e?.message || e);
  }
}

/** Initialise le store : relit le cache de session si présent, sinon télécharge le GTFS. */
export async function initGtfs({ force = false } = {}) {
  if (!force && tryLoadFromSessionCache()) {
    notify();
    return state;
  }
  if (state.status === 'loading') return state;

  state.status = 'loading';
  state.error = null;
  state.progress = { pct: 0, label: 'Démarrage…' };
  notify();

  try {
    const data = await fetchAndParseGtfs((p) => {
      state.progress = p;
      notify();
    });
    state.data = data;
    state.indices = buildIndices(data);
    state.importedAt = new Date();
    state.status = 'ready';
    resetRaptorCache();
    saveToSessionCache();
  } catch (err) {
    state.status = 'error';
    state.error =
      err instanceof GtfsFetchError
        ? err.message
        : "Une erreur inattendue est survenue pendant la lecture des données du réseau.";
    console.error('[gtfs] échec du chargement :', err);
  }
  notify();
  return state;
}

export function retryGtfs() {
  return initGtfs({ force: true });
}
