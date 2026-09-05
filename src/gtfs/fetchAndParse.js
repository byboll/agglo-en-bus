import JSZip from 'jszip';
import Papa from 'papaparse';
import { GTFS_URL } from './config.js';

/**
 * Télécharge le flux GTFS (zip) et le transforme en structures JS exploitables.
 * @param {(progress: {pct:number, label:string}) => void} onProgress
 */
export async function fetchAndParseGtfs(onProgress = () => {}) {
  onProgress({ pct: 3, label: 'Connexion au flux GTFS…' });

  let response;
  try {
    response = await fetch(GTFS_URL, { mode: 'cors', cache: 'no-store' });
  } catch (err) {
    throw new GtfsFetchError(
      "Impossible de contacter le serveur de données du réseau. Vérifiez votre connexion internet.",
      err
    );
  }
  if (!response.ok) {
    throw new GtfsFetchError(
      `Le serveur de données a répondu avec une erreur (HTTP ${response.status}).`,
      null
    );
  }

  onProgress({ pct: 12, label: 'Téléchargement du fichier…' });
  const blob = await response.blob();

  onProgress({ pct: 22, label: 'Lecture de l\'archive…' });
  const zip = await JSZip.loadAsync(blob);

  function zf(name) {
    return zip.file(name) || Object.values(zip.files).find((f) => !f.dir && f.name.endsWith('/' + name));
  }
  async function csv(name) {
    const f = zf(name);
    if (!f) return [];
    const text = await f.async('string');
    return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
  }
  async function parseLarge(name, onRow) {
    const f = zf(name);
    if (!f) return;
    const text = await f.async('string');
    await new Promise((resolve) => {
      Papa.parse(text, { header: true, skipEmptyLines: true, step: (r) => onRow(r.data), complete: resolve });
    });
  }

  const data = {
    agencies: [], routes: [], stops: [], trips: [],
    calendar: [], calendarDates: [], transfers: [],
    stopTimes: {}, shapes: {},
  };

  onProgress({ pct: 30, label: 'Réseaux (agency.txt)…' });
  data.agencies = await csv('agency.txt');
  onProgress({ pct: 38, label: 'Lignes (routes.txt)…' });
  data.routes = await csv('routes.txt');
  onProgress({ pct: 48, label: 'Arrêts (stops.txt)…' });
  data.stops = await csv('stops.txt');
  onProgress({ pct: 58, label: 'Courses (trips.txt)…' });
  data.trips = await csv('trips.txt');
  onProgress({ pct: 64, label: 'Calendrier…' });
  data.calendar = await csv('calendar.txt');
  data.calendarDates = await csv('calendar_dates.txt');

  onProgress({ pct: 72, label: 'Horaires (stop_times.txt)…' });
  await parseLarge('stop_times.txt', (d) => {
    if (!d.trip_id) return;
    (data.stopTimes[d.trip_id] || (data.stopTimes[d.trip_id] = [])).push({
      seq: parseInt(d.stop_sequence) || 0,
      stop_id: d.stop_id,
      arr: d.arrival_time || '',
      dep: d.departure_time || '',
    });
  });
  // tri par séquence
  for (const arr of Object.values(data.stopTimes)) arr.sort((a, b) => a.seq - b.seq);

  onProgress({ pct: 86, label: 'Correspondances…' });
  data.transfers = await csv('transfers.txt');

  onProgress({ pct: 90, label: 'Tracés (shapes.txt)…' });
  const rawShapes = {};
  await parseLarge('shapes.txt', (d) => {
    if (!d.shape_id || isNaN(+d.shape_pt_lat) || isNaN(+d.shape_pt_lon)) return;
    (rawShapes[d.shape_id] || (rawShapes[d.shape_id] = [])).push({
      seq: parseInt(d.shape_pt_sequence) || 0,
      lat: +d.shape_pt_lat,
      lon: +d.shape_pt_lon,
    });
  });
  for (const [sid, pts] of Object.entries(rawShapes)) {
    pts.sort((a, b) => a.seq - b.seq);
    data.shapes[sid] = pts.map((p) => [p.lat, p.lon]);
  }

  // Ne garder que les arrêts effectivement desservis par au moins une course
  if (Object.keys(data.stopTimes).length > 0) {
    const served = new Set();
    for (const sts of Object.values(data.stopTimes)) for (const st of sts) served.add(st.stop_id);
    data.stops = data.stops.filter((s) => served.has(s.stop_id) || s.location_type === '1' || s.location_type === 1);
  }

  onProgress({ pct: 100, label: 'Terminé' });
  return data;
}

export class GtfsFetchError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'GtfsFetchError';
    this.cause = cause;
  }
}
