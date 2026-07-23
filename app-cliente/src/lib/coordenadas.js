// ============================================================================
// GoWash — coordenadas.js — utilidades de geolocalização
// ============================================================================

export function parseCoord(v) {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return n;
}

// Distância em km entre duas coordenadas (fórmula de Haversine).
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function temCoord(obj) {
  const lat = parseCoord(obj?.latitude);
  const lng = parseCoord(obj?.longitude);
  return !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
}
