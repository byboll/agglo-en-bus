const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function buildIndices(data) {
  const routesById = {};
  data.routes.forEach((r) => (routesById[r.route_id] = r));
  const stopsById = {};
  data.stops.forEach((s) => (stopsById[s.stop_id] = s));
  const agenciesById = {};
  data.agencies.forEach((a) => (agenciesById[a.agency_id] = a));
  const tripsById = {};
  data.trips.forEach((t) => (tripsById[t.trip_id] = t));

  // stop_id -> Set<route_id>
  const stopRoutes = {};
  for (const [tid, sts] of Object.entries(data.stopTimes)) {
    const rid = tripsById[tid]?.route_id;
    if (!rid) continue;
    for (const st of sts) (stopRoutes[st.stop_id] || (stopRoutes[st.stop_id] = new Set())).add(rid);
  }

  // route_id -> Set<trip_id>
  const routeTrips = {};
  data.trips.forEach((t) => {
    (routeTrips[t.route_id] || (routeTrips[t.route_id] = [])).push(t);
  });

  return { routesById, stopsById, agenciesById, tripsById, stopRoutes, routeTrips };
}

/** service_id actifs pour une date donnée (objet Date) */
export function activeServiceIdsForDate(data, date) {
  const ymd = ymdFromDate(date);
  const dow = DOW[date.getDay()];
  const sids = new Set();
  for (const c of data.calendar) {
    if (c.start_date <= ymd && ymd <= c.end_date && c[dow] === '1') sids.add(c.service_id);
  }
  for (const e of data.calendarDates) {
    if (e.date === ymd) {
      if (e.exception_type === '1') sids.add(e.service_id);
      else if (e.exception_type === '2') sids.delete(e.service_id);
    }
  }
  return sids;
}

export function tripsActiveOnDate(data, date) {
  const sids = activeServiceIdsForDate(data, date);
  return data.trips.filter((t) => sids.has(t.service_id));
}

export function ymdFromDate(date) {
  return (
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  );
}

export function timeToSecs(t) {
  if (!t) return Infinity;
  const p = t.split(':');
  return (+p[0]) * 3600 + (+(p[1] || 0)) * 60 + (+(p[2] || 0));
}

export function secsToTime(s) {
  if (!isFinite(s)) return '—';
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function secsToDur(s) {
  if (!isFinite(s) || s < 0) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

export function nowSecsLocal(date = new Date()) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function routeColors(route, fallback) {
  return {
    bg: route?.route_color ? '#' + route.route_color : fallback.color,
    text: route?.route_text_color ? '#' + route.route_text_color : '#ffffff',
  };
}

/** Prochains passages à un arrêt donné à partir de "nowSecs", sur la date donnée */
export function nextDeparturesForStop(data, indices, stopId, date, nowSecs, limit = 8) {
  const sids = activeServiceIdsForDate(data, date);
  const results = [];
  for (const trip of data.trips) {
    if (!sids.has(trip.service_id)) continue;
    const sts = data.stopTimes[trip.trip_id];
    if (!sts) continue;
    for (const st of sts) {
      if (st.stop_id !== stopId) continue;
      const depSecs = timeToSecs(st.dep || st.arr);
      if (depSecs >= nowSecs) {
        results.push({ trip, stopTime: st, depSecs, route: indices.routesById[trip.route_id] });
      }
    }
  }
  results.sort((a, b) => a.depSecs - b.depSecs);
  return results.slice(0, limit);
}

/** Prochains passages à un arrêt, en complétant sur les jours suivants si la date de départ
 *  n'a plus assez de passages (ex. dernier bus du soir) — jusqu'à `maxDays` jours regardés. */
export function nextDeparturesForStopMultiDay(data, indices, stopId, fromDate, nowSecs, limit = 6, maxDays = 8) {
  const results = [];
  for (let dayOffset = 0; dayOffset < maxDays && results.length < limit; dayOffset++) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + dayOffset);
    const dayResults = nextDeparturesForStop(data, indices, stopId, date, dayOffset === 0 ? nowSecs : 0, limit - results.length);
    for (const r of dayResults) results.push({ ...r, date, dayOffset });
  }
  return results;
}

/** Toutes les courses desservant un arrêt à une date donnée (pas de filtre sur l'heure). */
export function allDeparturesForStopOnDate(data, indices, stopId, date) {
  const sids = activeServiceIdsForDate(data, date);
  const results = [];
  for (const trip of data.trips) {
    if (!sids.has(trip.service_id)) continue;
    const sts = data.stopTimes[trip.trip_id];
    if (!sts) continue;
    for (const st of sts) {
      if (st.stop_id !== stopId) continue;
      results.push({ trip, stopTime: st, depSecs: timeToSecs(st.dep || st.arr), route: indices.routesById[trip.route_id] });
    }
  }
  results.sort((a, b) => a.depSecs - b.depSecs);
  return results;
}

/** Intitulé (terminus) le plus représentatif d'une ligne au niveau d'un arrêt donné — permet de
 *  distinguer deux arrêts de même nom desservis par la même ligne mais dans des sens différents. */
export function headsignForStopOnRoute(data, indices, routeId, stopId) {
  const trips = indices.routeTrips[routeId] || [];
  for (const t of trips) {
    const sts = data.stopTimes[t.trip_id];
    if (sts && t.trip_headsign && sts.some((st) => st.stop_id === stopId)) return t.trip_headsign;
  }
  return null;
}

/** Lignes desservant un arrêt, avec le terminus (sens) observé à cet arrêt précisément. */
export function linesForStop(data, indices, stopId) {
  const routeIds = [...(indices.stopRoutes[stopId] || [])];
  return routeIds
    .map((rid) => {
      const route = indices.routesById[rid];
      return route ? { route, headsign: headsignForStopOnRoute(data, indices, rid, stopId) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.route.route_short_name || '').localeCompare(b.route.route_short_name || '', 'fr', { numeric: true }));
}

export function distinctDaySpanLabel(data) {
  // Renvoie une estimation simple "tous les jours sauf..." — laissé volontairement simple,
  // le calendrier détaillé est visible sur la fiche ligne.
  return null;
}

/** Toutes les courses (trips) d'une ligne, actives à la date donnée, triées par sens puis heure. */
export function tripsForRoute(data, indices, routeId, date) {
  const sids = activeServiceIdsForDate(data, date);
  const all = (indices.routeTrips[routeId] || []).filter((t) => sids.has(t.service_id));
  const dir0 = all.filter((t) => t.direction_id !== '1');
  const dir1 = all.filter((t) => t.direction_id === '1');
  return { all, dir0, dir1 };
}

/** Ordre canonique des arrêts d'une ligne (dans un sens donné), à partir d'un ensemble de trips. */
export function canonicalStopOrder(data, trips) {
  const seqs = {};
  for (const t of trips) {
    for (const st of data.stopTimes[t.trip_id] || []) {
      (seqs[st.stop_id] || (seqs[st.stop_id] = [])).push(st.seq);
    }
  }
  return Object.entries(seqs)
    .map(([sid, arr]) => ({ sid, avg: arr.reduce((a, b) => a + b, 0) / arr.length }))
    .sort((a, b) => a.avg - b.avg)
    .map((x) => x.sid);
}

/** Renvoie l'heure de premier départ (secondes) d'un trip parmi une liste ordonnée d'arrêts. */
export function tripFirstDepSecs(data, tripId, canonStopOrder) {
  const sts = data.stopTimes[tripId] || [];
  const byStop = {};
  for (const st of sts) byStop[st.stop_id] = st.dep || st.arr;
  for (const sid of canonStopOrder) if (byStop[sid]) return timeToSecs(byStop[sid]);
  return Infinity;
}

/** Liste des tracés (polylignes lat/lon) desservant un ensemble de trips donné — via shapes.txt
 *  si présent, sinon reconstruit à partir de la séquence d'arrêts de la course la plus longue. */
export function shapesForTrips(data, trips) {
  const shapeIds = new Set(trips.map((t) => t.shape_id).filter(Boolean));
  const lines = [];
  for (const sid of shapeIds) {
    if (data.shapes[sid]) lines.push(data.shapes[sid]);
  }
  if (lines.length) return lines;
  // repli : tracé rectiligne à partir de la course la plus longue
  let longest = null;
  for (const t of trips) {
    const sts = data.stopTimes[t.trip_id];
    if (sts && (!longest || sts.length > longest.length)) longest = sts;
  }
  if (!longest) return [];
  const stopsById = {};
  data.stops.forEach((s) => (stopsById[s.stop_id] = s));
  const coords = longest
    .map((st) => {
      const s = stopsById[st.stop_id];
      return s?.stop_lat && !isNaN(+s.stop_lat) ? [+s.stop_lat, +s.stop_lon] : null;
    })
    .filter(Boolean);
  return coords.length >= 2 ? [coords] : [];
}

/** Liste des tracés desservant une ligne entière (tous sens confondus). */
export function shapesForRoute(data, routeId) {
  return shapesForTrips(data, data.trips.filter((t) => t.route_id === routeId));
}

/** Distance (m) entre un point et un arrêt ; utilisé pour "arrêts près de moi". */
export function stopsNear(data, lat, lon, maxDist = 700, limit = 20) {
  return data.stops
    .filter((s) => s.stop_lat && s.stop_lon && !isNaN(+s.stop_lat))
    .map((s) => ({ stop: s, dist: haversine(lat, lon, +s.stop_lat, +s.stop_lon) }))
    .filter((x) => x.dist <= maxDist)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}

/** Arrêts intermédiaires (strictement entre from et to) desservis par un trip donné, dans l'ordre. */
export function intermediateStopsForLeg(data, tripId, fromStopId, toStopId) {
  const sts = (data.stopTimes[tripId] || []).slice().sort((a, b) => a.seq - b.seq);
  const i0 = sts.findIndex((st) => st.stop_id === fromStopId);
  if (i0 < 0) return [];
  const i1 = sts.findIndex((st, idx) => idx > i0 && st.stop_id === toStopId);
  if (i1 < 0 || i1 <= i0 + 1) return [];
  return sts.slice(i0 + 1, i1);
}

/** Recherche simple (nom, id, code) parmi les arrêts. */
export function searchStops(data, query, limit = 10) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return data.stops
    .filter(
      (s) =>
        (s.stop_name || '').toLowerCase().includes(q) ||
        (s.stop_id || '').toLowerCase().includes(q) ||
        (s.stop_code || '').toLowerCase().includes(q)
    )
    .slice(0, limit);
}

/** Recherche simple (nom court/long, id) parmi les lignes. */
export function searchRoutes(data, query, limit = 10) {
  const q = query.trim().toLowerCase();
  const list = !q
    ? data.routes
    : data.routes.filter(
        (r) =>
          (r.route_short_name || '').toLowerCase().includes(q) ||
          (r.route_long_name || '').toLowerCase().includes(q) ||
          (r.route_id || '').toLowerCase().includes(q)
      );
  return list.slice(0, limit);
}
