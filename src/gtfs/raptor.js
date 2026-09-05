// Moteur d'itinéraires — adaptation simplifiée de l'algorithme RAPTOR (recherche du trajet
// le plus rapide en transport en commun + marche à pied), repris des principes du back office.
import { haversine, timeToSecs } from './helpers.js';

const CFG = {
  walkSpeed: 4 / 3.6, // m/s (4 km/h)
  maxTransfers: 3,
  minTransferSecs: 120,
  maxTransferDist: 900,
};

let R = null; // données précalculées (patterns), invalidées quand data change

export function resetRaptorCache() {
  R = null;
}

function build(data) {
  const t0 = Date.now();
  R = { patterns: {}, stopPatterns: {}, coords: {}, transfers: {}, hasTransfersTxt: false };

  for (const s of data.stops) {
    if (s.stop_lat && s.stop_lon && !isNaN(+s.stop_lat)) R.coords[s.stop_id] = { lat: +s.stop_lat, lon: +s.stop_lon };
  }

  const tripsById = {};
  data.trips.forEach((t) => (tripsById[t.trip_id] = t));

  for (const [tid, sts] of Object.entries(data.stopTimes)) {
    const trip = tripsById[tid];
    if (!trip) continue;
    const sorted = sts; // déjà trié par fetchAndParse
    const pid = sorted.map((s) => s.stop_id).join('\x01');
    if (!R.patterns[pid]) {
      R.patterns[pid] = { stops: sorted.map((s) => s.stop_id), trips: [] };
      for (const sid of R.patterns[pid].stops) (R.stopPatterns[sid] || (R.stopPatterns[sid] = [])).push(pid);
    }
    R.patterns[pid].trips.push({
      trip_id: tid,
      service_id: trip.service_id,
      route_id: trip.route_id,
      stopTimes: sorted.map((s) => ({ stop_id: s.stop_id, arr: timeToSecs(s.arr || s.dep), dep: timeToSecs(s.dep || s.arr) })),
    });
  }
  for (const p of Object.values(R.patterns)) p.trips.sort((a, b) => (a.stopTimes[0]?.dep ?? Infinity) - (b.stopTimes[0]?.dep ?? Infinity));
  for (const k of Object.keys(R.stopPatterns)) R.stopPatterns[k] = [...new Set(R.stopPatterns[k])];

  if (data.transfers?.length) {
    R.hasTransfersTxt = true;
    for (const tf of data.transfers) {
      if (!tf.from_stop_id || !tf.to_stop_id || tf.transfer_type === '3') continue;
      const secs = tf.min_transfer_time ? Math.max(+tf.min_transfer_time, CFG.minTransferSecs) : CFG.minTransferSecs;
      const c1 = R.coords[tf.from_stop_id], c2 = R.coords[tf.to_stop_id];
      const dist = c1 && c2 ? haversine(c1.lat, c1.lon, c2.lat, c2.lon) : 0;
      (R.transfers[tf.from_stop_id] || (R.transfers[tf.from_stop_id] = [])).push({ to: tf.to_stop_id, secs, dist });
      if (tf.from_stop_id !== tf.to_stop_id)
        (R.transfers[tf.to_stop_id] || (R.transfers[tf.to_stop_id] = [])).push({ to: tf.from_stop_id, secs, dist });
    }
  }
  console.debug(`[raptor] ${Object.keys(R.patterns).length} patterns construits en ${Date.now() - t0}ms`);
}

function transfersFrom(stopId) {
  if (R.transfers[stopId] !== undefined) return R.transfers[stopId];
  if (R.hasTransfersTxt) { R.transfers[stopId] = []; return []; }
  const c1 = R.coords[stopId];
  if (!c1) { R.transfers[stopId] = []; return []; }
  const maxD = CFG.maxTransferDist, degLat = maxD / 111000, res = [];
  for (const [sid2, c2] of Object.entries(R.coords)) {
    if (sid2 === stopId || Math.abs(c2.lat - c1.lat) > degLat * 1.5) continue;
    const dist = haversine(c1.lat, c1.lon, c2.lat, c2.lon);
    if (dist <= maxD) res.push({ to: sid2, secs: Math.max(Math.ceil(dist / CFG.walkSpeed), CFG.minTransferSecs), dist });
  }
  R.transfers[stopId] = res;
  return res;
}

function findTrip(pid, si, minDep, activeSids) {
  const trips = R.patterns[pid]?.trips;
  if (!trips) return null;
  for (const trip of trips) {
    const st = trip.stopTimes[si];
    if (!st) continue;
    if (st.dep > minDep + 86400) break;
    if (st.dep >= minDep && activeSids.has(trip.service_id)) return trip;
  }
  return null;
}

function raptorForward(depStop, arrStop, depTimeSecs, activeSids, maxTransfers) {
  const INF = Infinity;
  const tau = {}, label = {};
  tau[depStop] = depTimeSecs;
  let marked = new Set([depStop]);
  for (const { to, secs, dist } of transfersFrom(depStop)) {
    const arr = depTimeSecs + secs;
    if (arr < (tau[to] ?? INF)) { tau[to] = arr; label[to] = { type: 'walk', from_stop: depStop, walk_secs: secs, dist }; marked.add(to); }
  }
  for (let k = 0; k < maxTransfers + 1 && marked.size > 0; k++) {
    const Q = new Map();
    for (const p of marked) {
      for (const pid of R.stopPatterns[p] ?? []) {
        const idx = R.patterns[pid].stops.indexOf(p);
        if (idx < 0) continue;
        const ex = Q.get(pid);
        if (!ex || idx < ex.idx) Q.set(pid, { stop: p, idx });
      }
    }
    const newMk = new Set();
    for (const [pid, { idx: p0 }] of Q) {
      const pat = R.patterns[pid];
      let t = null, bStop = null, bIdx = -1;
      for (let si = p0; si < pat.stops.length; si++) {
        const q = pat.stops[si];
        if (t !== null) {
          const arr = t.stopTimes[si].arr;
          if (arr < (tau[q] ?? INF)) {
            tau[q] = arr;
            label[q] = { type: 'transit', trip_id: t.trip_id, route_id: t.route_id, from_stop: bStop, board_dep: t.stopTimes[bIdx]?.dep, arr_time: arr };
            newMk.add(q);
          }
        }
        const tauQ = tau[q] ?? INF;
        if (isFinite(tauQ)) {
          const minDep = label[q]?.type === 'transit' ? tauQ + CFG.minTransferSecs : tauQ;
          const trip = findTrip(pid, si, minDep, activeSids);
          if (trip) {
            const dep = trip.stopTimes[si]?.dep ?? INF;
            const cur = t?.stopTimes[si]?.dep ?? INF;
            if (dep <= cur) { t = trip; bStop = q; bIdx = si; }
          }
        }
      }
    }
    for (const p of newMk) {
      const tauP = tau[p] ?? INF; if (!isFinite(tauP)) continue;
      for (const { to, secs, dist } of transfersFrom(p)) {
        const arr = tauP + secs;
        if (arr < (tau[to] ?? INF)) { tau[to] = arr; label[to] = { type: 'walk', from_stop: p, walk_secs: secs, dist }; newMk.add(to); }
      }
    }
    marked = newMk;
  }
  if (!(arrStop in tau)) return null;
  return buildJourney(depStop, arrStop, depTimeSecs, tau[arrStop], label);
}

/** Dernier trip actif d'un pattern arrivant à l'arrêt d'indice j_end avec arr <= maxArr. */
function findLatestTrip(pid, jEnd, maxArr, activeSids) {
  const trips = R.patterns[pid]?.trips;
  if (!trips) return null;
  for (let i = trips.length - 1; i >= 0; i--) {
    const trip = trips[i];
    if (!activeSids.has(trip.service_id)) continue;
    const st = trip.stopTimes[jEnd];
    if (!st) continue;
    if (st.arr <= maxArr) return trip;
  }
  return null;
}

/**
 * RAPTOR inversé ("arriver avant") : calcule tau[s] = heure de départ la plus tardive
 * possible depuis s pour arriver à arrStop au plus tard à arrTimeSecs, en remontant le
 * réseau depuis l'arrivée. Symétrique de raptorForward.
 */
function raptorReverse(depStop, arrStop, arrTimeSecs, activeSids, maxTransfers) {
  const NEG = -Infinity;
  const tau = {}, label = {};
  tau[arrStop] = arrTimeSecs;

  let marked = new Set([arrStop]);
  for (const { to, secs, dist } of transfersFrom(arrStop)) {
    const dep = arrTimeSecs - secs;
    if (dep > (tau[to] ?? NEG)) { tau[to] = dep; label[to] = { type: 'walk', to_stop: arrStop, walk_secs: secs, dist }; marked.add(to); }
  }

  for (let k = 0; k < maxTransfers + 1 && marked.size > 0; k++) {
    const Q = new Map();
    for (const p of marked) {
      for (const pid of R.stopPatterns[p] ?? []) {
        const idx = R.patterns[pid].stops.indexOf(p);
        if (idx < 0) continue;
        const ex = Q.get(pid);
        if (!ex || idx > ex.idx) Q.set(pid, { stop: p, idx });
      }
    }
    const newMk = new Set();
    for (const [pid, { idx: jEnd }] of Q) {
      const pat = R.patterns[pid];
      const tauEnd = tau[pat.stops[jEnd]] ?? NEG;
      const t = findLatestTrip(pid, jEnd, tauEnd, activeSids);
      if (!t) continue;
      for (let j = jEnd - 1; j >= 0; j--) {
        const q = pat.stops[j];
        const st = t.stopTimes[j];
        if (!st) continue;
        const dep = st.dep;
        const prevTransit = label[q]?.type === 'transit';
        const candidate = prevTransit ? dep - CFG.minTransferSecs : dep;
        if (candidate > (tau[q] ?? NEG)) {
          tau[q] = candidate;
          label[q] = { type: 'transit', trip_id: t.trip_id, route_id: t.route_id, from_stop: q, to_stop: pat.stops[jEnd], dep_time: dep, arr_time: t.stopTimes[jEnd].arr };
          newMk.add(q);
        }
      }
    }
    const fMk = new Set(newMk);
    for (const p of newMk) {
      const tauP = tau[p] ?? NEG; if (tauP === NEG) continue;
      for (const { to, secs, dist } of transfersFrom(p)) {
        const dep = tauP - secs;
        if (dep > (tau[to] ?? NEG)) { tau[to] = dep; label[to] = { type: 'walk', to_stop: p, walk_secs: secs, dist }; fMk.add(to); }
      }
    }
    marked = fMk;
  }

  if (!(depStop in tau) || tau[depStop] === NEG) return null;
  return buildReverseJourney(depStop, arrStop, tau[depStop], label);
}

/** Reconstruit le trajet en suivant les labels VERS L'AVANT depuis depStop → arrStop. */
function buildReverseJourney(depStop, arrStop, depTime, label) {
  const legs = []; let cur = depStop, guard = 0;
  while (cur !== arrStop && guard++ < 60) {
    const l = label[cur]; if (!l) return null;
    if (l.type === 'transit') {
      legs.push({ type: 'transit', trip_id: l.trip_id, route_id: l.route_id, from_stop: l.from_stop, to_stop: l.to_stop, dep_time: l.dep_time, arr_time: l.arr_time });
      cur = l.to_stop;
    } else {
      legs.push({ type: 'walk', from_stop: cur, to_stop: l.to_stop, walk_secs: l.walk_secs, dist: l.dist || 0 });
      cur = l.to_stop;
    }
  }
  if (cur !== arrStop) return null;
  let t = depTime;
  for (const leg of legs) t = leg.type === 'transit' ? leg.arr_time : t + leg.walk_secs;
  return { depStop, arrStop, depTime, arrTime: t, legs };
}

function buildJourney(depStop, arrStop, depTime, arrTime, label) {
  const legs = []; let cur = arrStop, guard = 0;
  while (cur !== depStop && guard++ < 60) {
    const l = label[cur]; if (!l) return null;
    if (l.type === 'transit') {
      legs.unshift({ type: 'transit', trip_id: l.trip_id, route_id: l.route_id, from_stop: l.from_stop, to_stop: cur, dep_time: l.board_dep, arr_time: l.arr_time });
      cur = l.from_stop;
    } else {
      legs.unshift({ type: 'walk', from_stop: l.from_stop, to_stop: cur, walk_secs: l.walk_secs, dist: l.dist || 0 });
      cur = l.from_stop;
    }
  }
  if (cur !== depStop) return null;
  return { depStop, arrStop, depTime, arrTime, legs };
}

function journeyKey(j) {
  return j.legs.map((l) => (l.type === 'transit' ? `T:${l.trip_id}:${l.from_stop}:${l.to_stop}` : `W:${l.from_stop}:${l.to_stop}`)).join('|');
}

/**
 * Calcule jusqu'à 3 propositions de trajet (le plus rapide, le moins de correspondances,
 * le moins de marche) entre deux arrêts.
 * @param {number} timeSecs - heure de référence (secondes depuis minuit).
 * @param {'depart'|'arrive'} constraint - 'depart' : partir après `timeSecs` (défaut) ;
 *        'arrive' : arriver à `timeSecs` au plus tard.
 * @param {object} [overrides] - paramètres avancés optionnels (bouton "Options") :
 *        { walkSpeed (m/s), maxTransfers, minTransferSecs, maxTransferDist }.
 */
export function computeItineraryOptions(data, fromStopId, toStopId, timeSecs, activeSids, constraint = 'depart', overrides = null) {
  if (!R) build(data);

  const hasOverrides = overrides && Object.keys(overrides).length > 0;
  const savedCfg = hasOverrides ? { ...CFG } : null;
  const savedTransfersForOverrides = hasOverrides ? R.transfers : null;
  if (hasOverrides) {
    Object.assign(CFG, overrides);
    R.transfers = {}; // les trajets à pied en cache dépendent de walkSpeed/minTransferSecs/maxTransferDist
  }

  try {
    const run = (maxTransfers) =>
      constraint === 'arrive'
        ? raptorReverse(fromStopId, toStopId, timeSecs, activeSids, maxTransfers)
        : raptorForward(fromStopId, toStopId, timeSecs, activeSids, maxTransfers);

    const candidates = [];
    try {
      const j = run(CFG.maxTransfers);
      if (j) candidates.push({ j, tag: 'fastest' });
    } catch (e) { console.error(e); }

    for (let k = 0; k <= CFG.maxTransfers; k++) {
      try {
        const j = run(k);
        if (j) { candidates.push({ j, tag: 'fewest' }); break; }
      } catch (e) { /* ignore */ }
    }

    const savedDist = CFG.maxTransferDist;
    CFG.maxTransferDist = 0;
    let savedT = null;
    if (R && !R.hasTransfersTxt) { savedT = R.transfers; R.transfers = {}; }
    try {
      const j = run(CFG.maxTransfers);
      if (j) candidates.push({ j, tag: 'leastWalk' });
    } catch (e) { /* ignore */ }
    CFG.maxTransferDist = savedDist;
    if (R && !R.hasTransfersTxt && savedT !== null) R.transfers = savedT;

    const seen = {}, unique = [];
    for (const { j, tag } of candidates) {
      const k = journeyKey(j);
      if (seen[k]) seen[k].tags.push(tag);
      else { j.tags = [tag]; seen[k] = j; unique.push(j); }
    }
    unique.sort((a, b) => (a.arrTime - a.depTime) - (b.arrTime - b.depTime));
    return unique;
  } finally {
    if (hasOverrides) {
      Object.assign(CFG, savedCfg);
      R.transfers = savedTransfersForOverrides;
    }
  }
}

export function transferCount(journey) {
  return Math.max(0, journey.legs.filter((l) => l.type === 'transit').length - 1);
}
export function walkSeconds(journey) {
  return journey.legs.filter((l) => l.type === 'walk').reduce((s, l) => s + l.walk_secs, 0);
}
