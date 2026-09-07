// Décodeur protobuf minimal, dédié au schéma GTFS-Realtime (fixe et documenté depuis des années —
// https://gtfs.org/documentation/realtime/proto/). Volontairement pas de dépendance
// (`protobufjs`/`gtfs-realtime-bindings`) : le reste du GTFS statique est déjà parsé "à la main"
// dans ce projet, et ces libs pèsent plusieurs centaines de Ko une fois bundlées pour un schéma
// qu'on connaît entièrement à l'avance. Ce fichier ne décode que les messages/champs utilisés par
// l'app (voir gtfs/realtime.js) — pas un décodeur protobuf générique pour n'importe quel .proto.

function readVarint(bytes, pos) {
  let result = 0n;
  let shift = 0n;
  let b;
  do {
    b = bytes[pos.i++];
    result |= BigInt(b & 0x7f) << shift;
    shift += 7n;
  } while (b & 0x80);
  return result;
}

// Un champ int32 encodé en varint peut être négatif (delay), auquel cas il est sérialisé sur
// 10 octets en complément à deux 64 bits — on ne peut pas se contenter d'un Number JS pour
// l'accumulation (perte de précision au-delà de 2^53), d'où le BigInt ci-dessus.
function toInt32(bigVal) {
  let v = bigVal & 0xffffffffn;
  if (v & 0x80000000n) v -= 0x100000000n;
  return Number(v);
}

function readFloat32(bytes, i) {
  return new DataView(bytes.buffer, bytes.byteOffset + i, 4).getFloat32(0, true);
}

const textDecoder = new TextDecoder();

/** Décode un message length-delimited `bytes[start,end)` selon `schema` (numéro de champ -> def). */
function decodeMessage(bytes, start, end, schema) {
  const out = {};
  let i = start;
  while (i < end) {
    const pos = { i };
    const key = readVarint(bytes, pos);
    i = pos.i;
    const wireType = Number(key & 7n);
    const fieldNum = Number(key >> 3n);
    const def = schema[fieldNum];

    let value;
    if (wireType === 0) {
      const p = { i };
      const raw = readVarint(bytes, p);
      i = p.i;
      value = def?.signed32 ? toInt32(raw) : Number(raw);
    } else if (wireType === 5) {
      value = readFloat32(bytes, i);
      i += 4;
    } else if (wireType === 1) {
      i += 8; // fixed64 — aucun champ utilisé ici n'en a besoin
      continue;
    } else if (wireType === 2) {
      const p = { i };
      const len = Number(readVarint(bytes, p));
      i = p.i;
      const slice = bytes.subarray(i, i + len);
      i += len;
      if (!def) continue;
      if (def.type === 'string') value = textDecoder.decode(slice);
      else if (def.type === 'message') value = decodeMessage(slice, 0, slice.length, def.schema);
      else continue;
    } else {
      continue; // wire type inattendu (groups, obsolètes) — on ignore plutôt que de planter
    }

    if (!def) continue;
    if (def.repeated) (out[def.name] || (out[def.name] = [])).push(value);
    else out[def.name] = value;
  }
  return out;
}

/* Schémas — uniquement les champs consommés par gtfs/realtime.js, avec les numéros de champ
   officiels de gtfs-realtime.proto v2.0. */
const TranslationSchema = { 1: { name: 'text', type: 'string' }, 2: { name: 'language', type: 'string' } };
const TranslatedStringSchema = { 1: { name: 'translation', type: 'message', schema: TranslationSchema, repeated: true } };

const TripDescriptorSchema = {
  1: { name: 'tripId', type: 'string' },
  4: { name: 'scheduleRelationship' },
  5: { name: 'routeId', type: 'string' },
  6: { name: 'directionId' },
};

const EntitySelectorSchema = {
  2: { name: 'routeId', type: 'string' },
  4: { name: 'trip', type: 'message', schema: TripDescriptorSchema },
  5: { name: 'stopId', type: 'string' },
};

const StopTimeEventSchema = {
  1: { name: 'delay', signed32: true },
  2: { name: 'time' },
};

const StopTimeUpdateSchema = {
  1: { name: 'stopSequence' },
  2: { name: 'arrival', type: 'message', schema: StopTimeEventSchema },
  3: { name: 'departure', type: 'message', schema: StopTimeEventSchema },
  4: { name: 'stopId', type: 'string' },
  5: { name: 'scheduleRelationship' },
};

const VehicleDescriptorSchema = {
  1: { name: 'id', type: 'string' },
  2: { name: 'label', type: 'string' },
};

const TripUpdateSchema = {
  1: { name: 'trip', type: 'message', schema: TripDescriptorSchema },
  2: { name: 'stopTimeUpdate', type: 'message', schema: StopTimeUpdateSchema, repeated: true },
  3: { name: 'vehicle', type: 'message', schema: VehicleDescriptorSchema },
};

const PositionSchema = {
  1: { name: 'latitude' },
  2: { name: 'longitude' },
  3: { name: 'bearing' },
};

const VehiclePositionSchema = {
  1: { name: 'trip', type: 'message', schema: TripDescriptorSchema },
  2: { name: 'position', type: 'message', schema: PositionSchema },
  4: { name: 'currentStatus' },
  7: { name: 'stopId', type: 'string' },
  8: { name: 'vehicle', type: 'message', schema: VehicleDescriptorSchema },
};

const AlertSchema = {
  5: { name: 'informedEntity', type: 'message', schema: EntitySelectorSchema, repeated: true },
  6: { name: 'cause' },
  7: { name: 'effect' },
  10: { name: 'headerText', type: 'message', schema: TranslatedStringSchema },
  11: { name: 'descriptionText', type: 'message', schema: TranslatedStringSchema },
};

const FeedEntitySchema = {
  1: { name: 'id', type: 'string' },
  3: { name: 'tripUpdate', type: 'message', schema: TripUpdateSchema },
  4: { name: 'vehicle', type: 'message', schema: VehiclePositionSchema },
  5: { name: 'alert', type: 'message', schema: AlertSchema },
};

const FeedHeaderSchema = { 3: { name: 'timestamp' } };

const FeedMessageSchema = {
  1: { name: 'header', type: 'message', schema: FeedHeaderSchema },
  2: { name: 'entity', type: 'message', schema: FeedEntitySchema, repeated: true },
};

// PositionSchema utilise des varint par défaut (wireType 0) mais lat/lon/bearing sont en réalité
// des `float` GTFS-RT (wireType 5) : le décodeur générique lit déjà la bonne valeur pour ce
// wireType quel que soit le nom du champ dans le schéma (readFloat32 est appelé sur la base du
// wireType rencontré dans les octets, pas sur une déclaration de type dans le schéma), donc aucune
// configuration supplémentaire n'est nécessaire ici.

/** Décode un flux GTFS-RT complet (FeedMessage) depuis un ArrayBuffer/Uint8Array. */
export function decodeFeedMessage(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return decodeMessage(arr, 0, arr.length, FeedMessageSchema);
}
