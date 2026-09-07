import './itineraire.css';
import L from 'leaflet';
import { withGtfsReady, gtfsStatusBlockHtml, mountRetryButtons } from '../utils/gtfsReady.js';
import {
  activeServiceIdsForDate, timeToSecs, secsToTime, secsToDur, searchStops, routeColors,
  intermediateStopsForLeg, realtimeStopTime, realtimeBadgeHtml, vehicleForTrip,
  alertsForRoute, alertEffectLabel, translatedText,
} from '../gtfs/helpers.js';
import { routeType } from '../gtfs/config.js';
import { computeItineraryOptions } from '../gtfs/raptor.js';
import { openTripModal } from '../components/tripModal.js';
import { createVehicleLayer } from '../components/vehicleMarkers.js';
import { subscribeRt } from '../gtfs/realtime.js';

// Valeurs par défaut — doivent rester alignées avec CFG dans gtfs/raptor.js.
const DEFAULT_OPTIONS = { walkSpeedKmh: 4, maxTransfers: 3, minTransferMin: 2, maxTransferDistM: 900 };

const TAG_LABELS = {
  fastest: 'Le plus rapide',
  fewest: 'Moins de correspondances',
  leastWalk: 'Moins de marche à pied',
};

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function pad2(n) { return String(n).padStart(2, '0'); }

/* --------------------------------------------------------------------- */
/* Autocomplétion arrêt                                                   */
/* --------------------------------------------------------------------- */
function setupStopAutocomplete({ inputEl, suggestEl, data, onSelect }) {
  let items = [];

  function renderList(list) {
    items = list;
    if (!list.length) { suggestEl.hidden = true; suggestEl.innerHTML = ''; return; }
    suggestEl.innerHTML = list
      .map((s, i) => `
        <button type="button" class="itin-suggest-item" data-idx="${i}">
          <span>${escapeHtml(s.stop_name || 'Arrêt')}</span>
          ${s.stop_code ? `<span class="text-muted">(${escapeHtml(s.stop_code)})</span>` : ''}
        </button>`)
      .join('');
    suggestEl.hidden = false;
  }

  inputEl.addEventListener('input', () => {
    onSelect(null);
    const q = inputEl.value;
    renderList(q.trim() ? searchStops(data, q, 8) : []);
  });

  inputEl.addEventListener('focus', () => {
    if (inputEl.value.trim()) renderList(searchStops(data, inputEl.value, 8));
  });

  inputEl.addEventListener('blur', () => {
    // Délai pour laisser le mousedown sur une suggestion se déclencher avant de la masquer.
    setTimeout(() => { suggestEl.hidden = true; }, 150);
  });

  suggestEl.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('.itin-suggest-item');
    if (!btn) return;
    e.preventDefault();
    const stop = items[+btn.dataset.idx];
    if (!stop) return;
    inputEl.value = stop.stop_name || '';
    renderList([]);
    onSelect(stop.stop_id);
  });
}

/* --------------------------------------------------------------------- */
/* Rendu des trajets                                                      */
/* --------------------------------------------------------------------- */
function legPillsHtml(journey, indices) {
  return journey.legs
    .map((leg, i) => {
      let seg;
      if (leg.type === 'transit') {
        const route = indices.routesById[leg.route_id];
        const type = routeType(route?.route_type);
        const { bg, text } = routeColors(route, type);
        seg = `<span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route?.route_short_name || '?')}</span>`;
      } else {
        seg = `<span class="itin-walk-chip" title="Marche à pied" aria-label="Marche à pied">🚶</span>`;
      }
      return i > 0 ? `<span class="itin-leg-arrow" aria-hidden="true">→</span>${seg}` : seg;
    })
    .join('');
}

function transitStepHtml(leg, data, indices) {
  const route = indices.routesById[leg.route_id];
  const trip = indices.tripsById[leg.trip_id];
  const type = routeType(route?.route_type);
  const { bg, text } = routeColors(route, type);
  const fromStop = indices.stopsById[leg.from_stop];
  const toStop = indices.stopsById[leg.to_stop];
  const inter = intermediateStopsForLeg(data, leg.trip_id, leg.from_stop, leg.to_stop);
  const interHtml = inter.length
    ? `<details class="itin-step-inter">
        <summary>${inter.length} arrêt${inter.length > 1 ? 's' : ''} intermédiaire${inter.length > 1 ? 's' : ''}</summary>
        <ul class="itin-step-inter-list">
          ${inter.map((st) => {
            const s = indices.stopsById[st.stop_id];
            return `<li><span class="mono">${secsToTime(timeToSecs(st.dep || st.arr))}</span><span>${escapeHtml(s?.stop_name || st.stop_id)}</span></li>`;
          }).join('')}
        </ul>
      </details>`
    : '';
  const depRt = realtimeStopTime(leg.trip_id, leg.from_stop);
  const arrRt = realtimeStopTime(leg.trip_id, leg.to_stop);
  const depSecs = depRt?.depSecs ?? leg.dep_time;
  const arrSecs = arrRt?.arrSecs ?? leg.arr_time;
  return `
    <div class="itin-step itin-step-transit">
      <div class="itin-step-row">
        <span class="mono">${secsToTime(depSecs)}</span>
        ${depRt ? realtimeBadgeHtml() : ''}
        <span>${escapeHtml(fromStop?.stop_name || leg.from_stop)}</span>
      </div>
      <button type="button" class="itin-step-line" data-trip-id="${escapeHtml(leg.trip_id)}" data-board="${escapeHtml(leg.from_stop)}" data-alight="${escapeHtml(leg.to_stop)}">
        <span class="line-pill" style="background:${bg};color:${text};">${escapeHtml(route?.route_short_name || '?')}</span>
        <span class="text-muted">→ ${escapeHtml(trip?.trip_headsign || route?.route_long_name || '')}</span>
        <span class="itin-step-line-hint">Détail de la course ›</span>
      </button>
      ${interHtml}
      <div class="itin-step-row">
        <span class="mono">${secsToTime(arrSecs)}</span>
        ${arrRt ? realtimeBadgeHtml() : ''}
        <span>${escapeHtml(toStop?.stop_name || leg.to_stop)}</span>
      </div>
    </div>`;
}

function journeyAlertsHtml(journey) {
  const routeIds = [...new Set(journey.legs.filter((l) => l.type === 'transit').map((l) => l.route_id))];
  const seen = new Set();
  const alerts = [];
  for (const rid of routeIds) {
    for (const a of alertsForRoute(rid)) {
      if (seen.has(a)) continue;
      seen.add(a);
      alerts.push(a);
    }
  }
  if (!alerts.length) return '';
  return `
    <div class="itin-journey-alerts">
      ${alerts.map((a) => {
        const effect = alertEffectLabel(a.effect);
        const header = translatedText(a.headerText);
        const desc = translatedText(a.descriptionText);
        return `
          <div class="alert alert-danger" style="margin-bottom:var(--sp-3);">
            <span aria-hidden="true">⚠️</span>
            <div>
              <span class="status-pill status-alert">Perturbation${effect ? ` · ${escapeHtml(effect)}` : ''}</span>
              ${header ? `<p style="margin:var(--sp-2) 0 0;font-weight:600;">${escapeHtml(header)}</p>` : ''}
              ${desc ? `<p style="margin:var(--sp-1) 0 0;">${escapeHtml(desc)}</p>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function journeyCardHtml(journey, idx, data, indices) {
  const tagsHtml = (journey.tags || [])
    .map((t) => `<span class="status-pill status-info">${escapeHtml(TAG_LABELS[t] || t)}</span>`)
    .join(' ');
  const durationLabel = secsToDur(journey.arrTime - journey.depTime);
  const stepsHtml = journey.legs
    .map((leg) => {
      if (leg.type === 'transit') return transitStepHtml(leg, data, indices);
      const fromStop = indices.stopsById[leg.from_stop];
      const toStop = indices.stopsById[leg.to_stop];
      return `
        <div class="itin-step itin-step-walk">
          <div>🚶 Marche — ${secsToDur(leg.walk_secs)} (${Math.round(leg.dist || 0)}&nbsp;m)</div>
          <div class="itin-step-walk-path">${escapeHtml(fromStop?.stop_name || leg.from_stop)} → ${escapeHtml(toStop?.stop_name || leg.to_stop)}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="card itin-journey-card">
      <button type="button" class="itin-journey-header" data-idx="${idx}" aria-expanded="false" aria-controls="itin-journey-detail-${idx}">
        <div class="itin-journey-header-row">
          <span class="mono itin-journey-times">${secsToTime(journey.depTime)} → ${secsToTime(journey.arrTime)}</span>
          <span class="text-muted">${durationLabel}</span>
          <span class="itin-journey-caret" aria-hidden="true">▾</span>
        </div>
        ${tagsHtml ? `<div class="itin-journey-tags">${tagsHtml}</div>` : ''}
        <div class="itin-journey-legs">${legPillsHtml(journey, indices)}</div>
      </button>
      <div class="itin-journey-detail" id="itin-journey-detail-${idx}" hidden>
        <div id="itin-journey-alerts-${idx}">${journeyAlertsHtml(journey)}</div>
        ${stepsHtml}
        <p class="sr-note" style="margin:0;">Horaires théoriques, actualisés en temps réel quand l'information est disponible (picto <span class="rt-badge" style="vertical-align:middle;">Direct</span>).</p>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------- */
/* Mini-carte du trajet sélectionné                                       */
/* --------------------------------------------------------------------- */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function drawJourneyOnMap(map, journey, data, indices, currentLayerRef) {
  if (currentLayerRef.layer) {
    map.removeLayer(currentLayerRef.layer);
    currentLayerRef.layer = null;
  }
  const group = L.layerGroup();
  const allPts = [];

  for (const leg of journey.legs) {
    const from = indices.stopsById[leg.from_stop];
    const to = indices.stopsById[leg.to_stop];
    if (!from?.stop_lat || !to?.stop_lat || isNaN(+from.stop_lat) || isNaN(+to.stop_lat)) continue;
    const p1 = [+from.stop_lat, +from.stop_lon];
    const p2 = [+to.stop_lat, +to.stop_lon];
    if (leg.type === 'transit') {
      const inter = intermediateStopsForLeg(data, leg.trip_id, leg.from_stop, leg.to_stop);
      const midPts = inter
        .map((st) => indices.stopsById[st.stop_id])
        .filter((s) => s?.stop_lat && !isNaN(+s.stop_lat))
        .map((s) => [+s.stop_lat, +s.stop_lon]);
      const route = indices.routesById[leg.route_id];
      const type = routeType(route?.route_type);
      const { bg } = routeColors(route, type);
      L.polyline([p1, ...midPts, p2], { color: bg, weight: 5, opacity: 0.85, lineJoin: 'round' }).addTo(group);
      midPts.forEach((pt) => {
        L.circleMarker(pt, { radius: 4, weight: 1.5, color: bg, fillColor: '#ffffff', fillOpacity: 1 }).addTo(group);
      });
      // Montée/descente : plus visibles que les arrêts intermédiaires (rayon plus grand, plein).
      L.circleMarker(p1, { radius: 7, weight: 2, color: '#101024', fillColor: bg, fillOpacity: 1 })
        .bindPopup(`<strong>Montée</strong><br>${escapeHtml(from?.stop_name || '')}`)
        .addTo(group);
      L.circleMarker(p2, { radius: 7, weight: 2, color: '#101024', fillColor: bg, fillOpacity: 1 })
        .bindPopup(`<strong>Descente</strong><br>${escapeHtml(to?.stop_name || '')}`)
        .addTo(group);
      allPts.push(p1, ...midPts, p2);
    } else {
      L.polyline([p1, p2], { color: '#5c5c74', weight: 4, opacity: 0.8, dashArray: '2,10', lineCap: 'round' }).addTo(group);
      allPts.push(p1, p2);
    }
  }

  const originStop = indices.stopsById[journey.depStop];
  const destStop = indices.stopsById[journey.arrStop];
  if (originStop?.stop_lat && !isNaN(+originStop.stop_lat)) {
    const p = [+originStop.stop_lat, +originStop.stop_lon];
    allPts.push(p);
    L.circleMarker(p, { radius: 7, weight: 2, color: '#3d5200', fillColor: '#b9e900', fillOpacity: 1 })
      .bindPopup(`<strong>Départ</strong><br>${escapeHtml(originStop.stop_name || '')}`)
      .addTo(group);
  }
  if (destStop?.stop_lat && !isNaN(+destStop.stop_lat)) {
    const p = [+destStop.stop_lat, +destStop.stop_lon];
    allPts.push(p);
    L.circleMarker(p, { radius: 7, weight: 2, color: '#0a0a6e', fillColor: '#1414c8', fillOpacity: 1 })
      .bindPopup(`<strong>Arrivée</strong><br>${escapeHtml(destStop.stop_name || '')}`)
      .addTo(group);
  }

  group.addTo(map);
  currentLayerRef.layer = group;
  if (allPts.length) map.fitBounds(L.latLngBounds(allPts), { padding: [28, 28], maxZoom: 16 });
}

/* --------------------------------------------------------------------- */
/* Initialisation de la page                                              */
/* --------------------------------------------------------------------- */
function initItineraire(root, data, indices) {
  const form = root.querySelector('#itin-form');
  const fromInput = root.querySelector('#itin-from-input');
  const toInput = root.querySelector('#itin-to-input');
  const fromSuggest = root.querySelector('#itin-from-suggest');
  const toSuggest = root.querySelector('#itin-to-suggest');
  const swapBtn = root.querySelector('#itin-swap-btn');
  const dateInput = root.querySelector('#itin-date');
  const timeInput = root.querySelector('#itin-time');
  const timeLabelEl = root.querySelector('#itin-time-label');
  const constraintBtns = root.querySelectorAll('[data-constraint]');
  const optWalk = root.querySelector('#itin-opt-walk');
  const optMaxTr = root.querySelector('#itin-opt-maxtr');
  const optMinTr = root.querySelector('#itin-opt-mintr');
  const optMaxDist = root.querySelector('#itin-opt-maxdist');
  const formAlertEl = root.querySelector('#itin-form-alert');
  const resultsSection = root.querySelector('#itin-results-section');
  const listEl = root.querySelector('#itin-results-list');
  const mapPlaceholder = root.querySelector('#itin-map-placeholder');
  const mapEl = root.querySelector('#itin-map');

  let fromId = null;
  let toId = null;
  let map = null;
  let constraint = 'depart';
  const currentLayerRef = { layer: null };
  const vehicleLayerRef = { layer: null };
  let currentJourneys = null;
  let currentIdx = 0;
  let cleaned = false;

  function journeyVehicles(journey) {
    if (!journey) return [];
    return journey.legs
      .filter((l) => l.type === 'transit')
      .map((leg) => {
        const v = vehicleForTrip(leg.trip_id);
        if (!v) return null;
        const route = indices.routesById[leg.route_id];
        const type = routeType(route?.route_type);
        const { bg } = routeColors(route, type);
        return {
          lat: v.position.latitude, lon: v.position.longitude, bearing: v.position.bearing,
          tripId: leg.trip_id, label: v.vehicle?.label, color: bg, icon: type.icon,
        };
      })
      .filter(Boolean);
  }

  constraintBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      constraint = btn.dataset.constraint;
      constraintBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      timeLabelEl.textContent = constraint === 'arrive' ? "Heure d'arrivée souhaitée" : 'Heure de départ';
    });
  });

  const optValEls = {
    walk: root.querySelector('#itin-opt-walk-val'),
    maxtr: root.querySelector('#itin-opt-maxtr-val'),
    mintr: root.querySelector('#itin-opt-mintr-val'),
    maxdist: root.querySelector('#itin-opt-maxdist-val'),
  };
  optWalk.addEventListener('input', () => { optValEls.walk.textContent = `${optWalk.value} km/h`; });
  optMaxTr.addEventListener('input', () => { optValEls.maxtr.textContent = optMaxTr.value; });
  optMinTr.addEventListener('input', () => { optValEls.mintr.textContent = `${optMinTr.value} min`; });
  optMaxDist.addEventListener('input', () => { optValEls.maxdist.textContent = `${optMaxDist.value} m`; });

  function currentOverrides() {
    return {
      walkSpeed: (+optWalk.value) / 3.6,
      maxTransfers: +optMaxTr.value,
      minTransferSecs: (+optMinTr.value) * 60,
      maxTransferDist: +optMaxDist.value,
    };
  }

  // Valeurs par défaut : maintenant (date + heure locales).
  const now = new Date();
  dateInput.value = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  timeInput.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  setupStopAutocomplete({
    inputEl: fromInput, suggestEl: fromSuggest, data,
    onSelect: (id) => { fromId = id; },
  });
  setupStopAutocomplete({
    inputEl: toInput, suggestEl: toSuggest, data,
    onSelect: (id) => { toId = id; },
  });

  swapBtn.addEventListener('click', () => {
    [fromId, toId] = [toId, fromId];
    const tmpVal = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = tmpVal;
  });

  function ensureMap() {
    if (map) return map;
    map = L.map(mapEl, { attributionControl: true });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    vehicleLayerRef.layer = createVehicleLayer(map);
    return map;
  }

  function selectJourney(journeys, idx) {
    const headers = listEl.querySelectorAll('.itin-journey-header');
    const panels = listEl.querySelectorAll('.itin-journey-detail');
    headers.forEach((h, i) => h.setAttribute('aria-expanded', String(i === idx)));
    panels.forEach((p, i) => { p.hidden = i !== idx; });
    mapPlaceholder.hidden = true;
    mapEl.hidden = false;
    currentJourneys = journeys;
    currentIdx = idx;
    const m = ensureMap();
    setTimeout(() => { if (!cleaned) m.invalidateSize(); }, 0);
    drawJourneyOnMap(m, journeys[idx], data, indices, currentLayerRef);
    vehicleLayerRef.layer.update(journeyVehicles(journeys[idx]));
  }

  function renderResults(journeys) {
    resultsSection.hidden = false;
    if (!journeys.length) {
      listEl.innerHTML = `
        <div class="alert alert-warning">
          Aucun itinéraire n'a été trouvé pour cet arrêt de départ, cet arrêt d'arrivée et cet horaire.
          Cela ne signifie pas qu'aucun service n'existe sur ce trajet : essayez une autre heure ou une
          autre date, ou vérifiez les arrêts sélectionnés.
        </div>`;
      mapPlaceholder.hidden = false;
      mapEl.hidden = true;
      currentJourneys = null;
      if (currentLayerRef.layer && map) { map.removeLayer(currentLayerRef.layer); currentLayerRef.layer = null; }
      vehicleLayerRef.layer?.update([]);
      return;
    }
    listEl.innerHTML = journeys.map((j, idx) => journeyCardHtml(j, idx, data, indices)).join('');
    listEl.querySelectorAll('.itin-journey-header').forEach((h) => {
      h.addEventListener('click', () => selectJourney(journeys, +h.dataset.idx));
    });
    selectJourney(journeys, 0);
  }

  // Clic sur le détail d'un trajet en transport en commun -> modale de détail de la course.
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.itin-step-line[data-trip-id]');
    if (!btn) return;
    openTripModal(data, indices, { tripId: btn.dataset.tripId, boardStopId: btn.dataset.board, alightStopId: btn.dataset.alight });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formAlertEl.innerHTML = '';

    if (!fromId || !toId) {
      formAlertEl.innerHTML = `<div class="alert alert-warning">Merci de choisir un arrêt de départ et un arrêt d'arrivée parmi les suggestions proposées.</div>`;
      return;
    }
    if (fromId === toId) {
      formAlertEl.innerHTML = `<div class="alert alert-warning">Les arrêts de départ et d'arrivée doivent être différents.</div>`;
      return;
    }
    if (!dateInput.value || !timeInput.value) {
      formAlertEl.innerHTML = `<div class="alert alert-warning">Merci de renseigner une date et une heure.</div>`;
      return;
    }

    const dateObj = new Date(`${dateInput.value}T00:00:00`);
    if (isNaN(dateObj.getTime())) {
      formAlertEl.innerHTML = `<div class="alert alert-warning">La date saisie n'est pas valide.</div>`;
      return;
    }

    const refSecs = timeToSecs(`${timeInput.value}:00`);
    const activeSids = activeServiceIdsForDate(data, dateObj);
    const journeys = computeItineraryOptions(data, fromId, toId, refSecs, activeSids, constraint, currentOverrides());
    renderResults(journeys);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Rafraîchit en place, sur le tick temps réel, le trajet actuellement sélectionné : position des
  // véhicules sur la mini-carte + perturbations (sans reconstruire les étapes/relancer fitBounds).
  const unsubscribeRt = subscribeRt(() => {
    if (!currentJourneys) return;
    const journey = currentJourneys[currentIdx];
    vehicleLayerRef.layer?.update(journeyVehicles(journey));
    const alertsEl = document.getElementById(`itin-journey-alerts-${currentIdx}`);
    if (alertsEl) alertsEl.innerHTML = journeyAlertsHtml(journey);
  });

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    unsubscribeRt();
    if (map) { map.remove(); map = null; }
  };
  // Nettoyage AVANT que le routeur ne remplace le HTML de cette page (le conteneur #itin-map
  // est encore attaché au document à ce moment), jamais après ('route:rendered' arrive trop tard).
  document.addEventListener('route:willchange', cleanup, { once: true });
}

export async function render() {
  const html = `
    <div class="container section">
      <span class="eyebrow">Itinéraire</span>
      <h1 class="mt-0">Calculer mon itinéraire</h1>
      <p class="text-muted" style="max-width:60ch;">
        Trouvez le meilleur trajet en bus entre deux arrêts du réseau, à partir des horaires théoriques
        publiés par L'Agglo en bus.
      </p>

      ${gtfsStatusBlockHtml()}

      <div data-role="page-content" hidden>
        <form id="itin-form" class="card itin-form" novalidate>
          <div class="itin-swap-row">
            <div class="field itin-stop-field">
              <label for="itin-from-input">Départ</label>
              <input class="input" id="itin-from-input" type="text" placeholder="Nom de l'arrêt de départ…" autocomplete="off">
              <div class="itin-suggest" id="itin-from-suggest" hidden></div>
            </div>
            <button type="button" class="btn btn-outline btn-icon itin-swap-btn" id="itin-swap-btn" aria-label="Inverser le départ et l'arrivée" title="Inverser">⇅</button>
            <div class="field itin-stop-field">
              <label for="itin-to-input">Arrivée</label>
              <input class="input" id="itin-to-input" type="text" placeholder="Nom de l'arrêt d'arrivée…" autocomplete="off">
              <div class="itin-suggest" id="itin-to-suggest" hidden></div>
            </div>
          </div>

          <div class="field itin-constraint-row">
            <label>Contrainte horaire</label>
            <div class="segmented" role="group" aria-label="Contrainte horaire">
              <button type="button" class="seg-btn" data-constraint="depart" aria-pressed="true">Partir après</button>
              <button type="button" class="seg-btn" data-constraint="arrive" aria-pressed="false">Arriver avant</button>
            </div>
          </div>

          <div class="itin-datetime-row">
            <div class="field">
              <label for="itin-date">Date</label>
              <input class="input" id="itin-date" type="date">
            </div>
            <div class="field">
              <label for="itin-time" id="itin-time-label">Heure de départ</label>
              <input class="input" id="itin-time" type="time">
            </div>
          </div>

          <details class="itin-options">
            <summary>Options</summary>
            <div class="itin-options-grid">
              <div class="itin-options-item">
                <label for="itin-opt-walk">Vitesse de marche</label>
                <div class="itin-options-row">
                  <input type="range" id="itin-opt-walk" min="2" max="6" step="0.5" value="${DEFAULT_OPTIONS.walkSpeedKmh}">
                  <span class="itin-options-val" id="itin-opt-walk-val">${DEFAULT_OPTIONS.walkSpeedKmh} km/h</span>
                </div>
              </div>
              <div class="itin-options-item">
                <label for="itin-opt-maxtr">Correspondances max</label>
                <div class="itin-options-row">
                  <input type="range" id="itin-opt-maxtr" min="0" max="3" step="1" value="${DEFAULT_OPTIONS.maxTransfers}">
                  <span class="itin-options-val" id="itin-opt-maxtr-val">${DEFAULT_OPTIONS.maxTransfers}</span>
                </div>
              </div>
              <div class="itin-options-item">
                <label for="itin-opt-mintr">Durée min. correspondance</label>
                <div class="itin-options-row">
                  <input type="range" id="itin-opt-mintr" min="0" max="10" step="1" value="${DEFAULT_OPTIONS.minTransferMin}">
                  <span class="itin-options-val" id="itin-opt-mintr-val">${DEFAULT_OPTIONS.minTransferMin} min</span>
                </div>
              </div>
              <div class="itin-options-item">
                <label for="itin-opt-maxdist">Distance max correspondance</label>
                <div class="itin-options-row">
                  <input type="range" id="itin-opt-maxdist" min="0" max="3000" step="100" value="${DEFAULT_OPTIONS.maxTransferDistM}">
                  <span class="itin-options-val" id="itin-opt-maxdist-val">${DEFAULT_OPTIONS.maxTransferDistM} m</span>
                </div>
              </div>
            </div>
          </details>

          <div id="itin-form-alert"></div>

          <button type="submit" class="btn btn-accent btn-block">Calculer l'itinéraire</button>
        </form>

        <div class="itin-results-section" id="itin-results-section" hidden>
          <h2>Trajets proposés</h2>
          <p class="sr-note" style="margin-top:calc(var(--sp-2) * -1);">Horaires théoriques, actualisés en temps réel quand disponible.</p>
          <div class="itin-results-layout">
            <div class="itin-results-list" id="itin-results-list"></div>
            <div class="itin-map-col">
              <div class="alert alert-info" id="itin-map-placeholder">Sélectionnez un trajet ci-contre pour l'afficher sur la carte.</div>
              <div class="itin-map" id="itin-map" hidden></div>
            </div>
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
          initItineraire(contentEl, state.data, state.indices);
        }
      }, { loadingSelector: '[data-role="gtfs-loading"]', errorSelector: '[data-role="gtfs-error"]' });
    },
  };
}
