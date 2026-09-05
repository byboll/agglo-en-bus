// Utilitaire partagé : les pages qui ont besoin des données GTFS (Lignes, Arrêts, Carte,
// Itinéraire) l'utilisent dans leur `mount(container)` pour réagir proprement à l'état du store
// (chargement en cours / prêt / erreur), sans dupliquer cette logique dans chaque page.
import { getState, subscribe, retryGtfs } from '../gtfs/store.js';

/**
 * @param {HTMLElement} container - l'élément racine de la page (reçu dans mount(container))
 * @param {(state: object) => void} onReady - appelé (immédiatement ou plus tard) avec le state
 *        dès que state.status === 'ready'. Peut être rappelé plusieurs fois si les données
 *        sont rechargées (bouton "réessayer").
 * @param {{loadingSelector?: string, errorSelector?: string}} [opts] - sélecteurs optionnels,
 *        à l'intérieur de `container`, affichés/masqués automatiquement selon l'état.
 */
export function withGtfsReady(container, onReady, opts = {}) {
  const apply = (state) => {
    if (!container.isConnected) {
      unsubscribe();
      return;
    }
    const loadingEl = opts.loadingSelector ? container.querySelector(opts.loadingSelector) : null;
    const errorEl = opts.errorSelector ? container.querySelector(opts.errorSelector) : null;
    if (loadingEl) loadingEl.hidden = state.status !== 'loading' && state.status !== 'idle';
    if (errorEl) errorEl.hidden = state.status !== 'error';
    if (state.status === 'ready') onReady(state);
  };
  const unsubscribe = subscribe(apply);
  apply(getState());
  return unsubscribe;
}

/** Bloc HTML générique de chargement / erreur à inclure dans le HTML initial d'une page GTFS. */
export function gtfsStatusBlockHtml({ loadingSelector = 'gtfs-loading', errorSelector = 'gtfs-error' } = {}) {
  return `
    <div data-role="${loadingSelector}" class="gtfs-inline-status" style="padding:var(--sp-6) 0">
      <span class="spinner" aria-hidden="true"></span> Chargement des données du réseau…
    </div>
    <div data-role="${errorSelector}" class="alert alert-danger" hidden>
      Les données du réseau n'ont pas pu être récupérées.
      <button class="btn btn-outline btn-sm" data-action="retry-gtfs" type="button">Réessayer</button>
    </div>`;
}

export function mountRetryButtons(container) {
  container.querySelectorAll('[data-action="retry-gtfs"]').forEach((btn) => {
    btn.addEventListener('click', () => retryGtfs());
  });
}
