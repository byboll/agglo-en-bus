// Modale de détail d'une course — réutilisée par la fiche Arrêt (clic sur un prochain passage)
// et la page Itinéraire (clic sur un trajet en transport en commun proposé). Montée UNE SEULE
// FOIS dans la coquille de l'app (voir mountTripModal(), appelée depuis main.js) ; les pages
// l'ouvrent simplement via openTripModal(...).
import { routeColors, secsToTime, timeToSecs, realtimeStopTime, realtimeBadgeHtml } from '../gtfs/helpers.js';
import { routeType } from '../gtfs/config.js';

let rootEl = null;
let lastFocused = null;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function mountTripModal() {
  if (rootEl) return;
  rootEl = document.createElement('div');
  rootEl.id = 'trip-modal';
  rootEl.className = 'trip-modal';
  rootEl.hidden = true;
  rootEl.innerHTML = `
    <div class="trip-modal-backdrop" data-action="close"></div>
    <div class="trip-modal-box card" role="dialog" aria-modal="true" aria-labelledby="trip-modal-title">
      <div class="trip-modal-head">
        <div class="trip-modal-head-info">
          <div id="trip-modal-title" class="trip-modal-title"></div>
          <div id="trip-modal-sub" class="text-muted trip-modal-sub"></div>
        </div>
        <button type="button" class="btn btn-icon btn-ghost" data-action="close" aria-label="Fermer">✕</button>
      </div>
      <div id="trip-modal-body" class="trip-modal-body"></div>
    </div>`;
  document.body.appendChild(rootEl);

  rootEl.querySelectorAll('[data-action="close"]').forEach((el) => el.addEventListener('click', closeTripModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !rootEl.hidden) closeTripModal();
  });
  // Un changement de page doit fermer toute modale ouverte (son contenu référence des
  // données/éléments propres à la page qui vient de disparaître).
  document.addEventListener('route:willchange', closeTripModal);
}

export function closeTripModal() {
  if (!rootEl || rootEl.hidden) return;
  rootEl.hidden = true;
  document.body.classList.remove('trip-modal-open');
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  lastFocused = null;
}

/**
 * @param {object} data - state.data du store GTFS
 * @param {object} indices - state.indices du store GTFS
 * @param {{tripId:string, boardStopId?:string, alightStopId?:string}} opts
 *   boardStopId/alightStopId : si fournis, mettent en avant la portion effectivement empruntée
 *   (montée → descente) plutôt que le trajet complet de la course.
 */
export function openTripModal(data, indices, { tripId, boardStopId, alightStopId } = {}) {
  if (!rootEl) mountTripModal();
  const trip = indices.tripsById[tripId];
  const sts = (data.stopTimes[tripId] || []).slice().sort((a, b) => a.seq - b.seq);
  if (!trip || !sts.length) return;

  const route = indices.routesById[trip.route_id];
  const type = routeType(route?.route_type);
  const { bg, text } = routeColors(route, type);
  const title = trip.trip_headsign || route?.route_long_name || 'Course';

  document.getElementById('trip-modal-title').innerHTML = `
    <span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route?.route_short_name || '?')}</span>
    <span>${escapeHtml(title)}</span>`;
  document.getElementById('trip-modal-sub').textContent =
    `${sts.length} arrêt${sts.length > 1 ? 's' : ''} — horaires théoriques, actualisés en temps réel quand disponible`;

  const hasRange = !!(boardStopId || alightStopId);
  let inRange = !hasRange;
  const rows = sts.map((st) => {
    const stop = indices.stopsById[st.stop_id];
    const isBoard = hasRange && st.stop_id === boardStopId;
    const isAlight = hasRange && st.stop_id === alightStopId;
    if (isBoard) inRange = true;
    const active = !hasRange || inRange;
    if (isAlight) inRange = false;
    const staticSecs = timeToSecs(st.dep || st.arr || '');
    const rt = realtimeStopTime(tripId, st.stop_id);
    const secs = rt ? (rt.depSecs ?? rt.arrSecs) : staticSecs;
    return `
      <li class="trip-modal-row${active ? ' is-active' : ''}${isBoard ? ' is-board' : ''}${isAlight ? ' is-alight' : ''}">
        <span class="trip-modal-dot" aria-hidden="true"></span>
        <span class="trip-modal-stop">${escapeHtml(stop?.stop_name || st.stop_id)}</span>
        ${isBoard ? '<span class="status-pill status-ok">Montée</span>' : ''}
        ${isAlight ? '<span class="status-pill status-info">Descente</span>' : ''}
        ${rt ? realtimeBadgeHtml() : ''}
        <span class="mono trip-modal-time">${secsToTime(secs)}</span>
      </li>`;
  }).join('');

  document.getElementById('trip-modal-body').innerHTML = `<ol class="trip-modal-list">${rows}</ol>`;

  lastFocused = document.activeElement;
  rootEl.hidden = false;
  document.body.classList.add('trip-modal-open');
  rootEl.querySelector('[data-action="close"]')?.focus();
}
