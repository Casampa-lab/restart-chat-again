/**
 * Calcula a distância entre duas coordenadas GPS usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lon1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lon2 Longitude do ponto 2
 * @returns Distância em metros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distância em metros
  return distance;
}

/**
 * Verifica se uma posição está dentro de um raio de proximidade
 */
export function isWithinProximity(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radius: number = 100
): boolean {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= radius;
}

/**
 * Formata coordenadas GPS para exibição
 */
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(6)}°, ${lon.toFixed(6)}°`;
}

/**
 * Ordena necessidades por proximidade da posição atual
 */
export function sortByProximity<T extends { latitude_inicial?: number | null; longitude_inicial?: number | null }>(
  items: T[],
  currentLat: number,
  currentLon: number
): (T & { distance: number })[] {
  return items
    .filter(item => item.latitude_inicial && item.longitude_inicial)
    .map(item => ({
      ...item,
      distance: calculateDistance(
        currentLat,
        currentLon,
        item.latitude_inicial!,
        item.longitude_inicial!
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Remove outliers geográficos de um conjunto de coordenadas
 * Retorna apenas coordenadas dentro de um raio razoável do centroide
 * @param coordinates Array de [lat, lng]
 * @param maxDistanceKm Distância máxima permitida do centroide (padrão: 2500km)
 * @returns Coordenadas filtradas sem outliers
 */
export function removeGeographicOutliers(
  coordinates: [number, number][],
  maxDistanceKm: number = 2500
): [number, number][] {
  if (coordinates.length === 0) return [];
  if (coordinates.length === 1) return coordinates;

  // 1. Calcular centroide usando mediana (robusta contra outliers)
  const lats = coordinates.map(c => c[0]).sort((a, b) => a - b);
  const lngs = coordinates.map(c => c[1]).sort((a, b) => a - b);
  
  const medianLat = lats[Math.floor(lats.length / 2)];
  const medianLng = lngs[Math.floor(lngs.length / 2)];

  // 2. Filtrar pontos dentro do raio máximo do centroide
  const maxDistanceMeters = maxDistanceKm * 1000;
  
  return coordinates.filter(([lat, lng]) => {
    const distance = calculateDistance(medianLat, medianLng, lat, lng);
    return distance <= maxDistanceMeters;
  });
}

/**
 * Calcula o KM aproximado no ponto clicado dentro de um segmento rodoviário
 * Usa interpolação linear baseada na distância ao longo da geometria
 * Tipo VGeo - Sistema de Click para Ver KM
 */
export function calcularKmNoSegmento(
  clickLat: number,
  clickLng: number,
  segmentCoords: number[][], // [[lng, lat], [lng, lat], ...]
  kmInicial: number,
  kmFinal: number
): number {
  if (segmentCoords.length < 2) return kmInicial;
  
  // 1. Calcular distâncias acumuladas ao longo do segmento
  let distanciaTotal = 0;
  const distanciasAcumuladas = [0];
  
  for (let i = 1; i < segmentCoords.length; i++) {
    const dist = calculateDistance(
      segmentCoords[i-1][1], // lat anterior
      segmentCoords[i-1][0], // lng anterior
      segmentCoords[i][1],   // lat atual
      segmentCoords[i][0]    // lng atual
    );
    distanciaTotal += dist;
    distanciasAcumuladas.push(distanciaTotal);
  }
  
  if (distanciaTotal === 0) return kmInicial;
  
  // 2. Encontrar o sub-segmento mais próximo do clique
  let menorDistancia = Infinity;
  let segmentoProximo = 0;
  let proporcaoNoSegmento = 0;
  
  for (let i = 1; i < segmentCoords.length; i++) {
    const p1Lat = segmentCoords[i-1][1];
    const p1Lng = segmentCoords[i-1][0];
    const p2Lat = segmentCoords[i][1];
    const p2Lng = segmentCoords[i][0];
    
    // Calcular distância do click aos dois pontos do segmento
    const distP1 = calculateDistance(clickLat, clickLng, p1Lat, p1Lng);
    const distP2 = calculateDistance(clickLat, clickLng, p2Lat, p2Lng);
    const distMenor = Math.min(distP1, distP2);
    
    if (distMenor < menorDistancia) {
      menorDistancia = distMenor;
      segmentoProximo = i;
      
      // Calcular proporção dentro desse sub-segmento
      const distP1P2 = calculateDistance(p1Lat, p1Lng, p2Lat, p2Lng);
      if (distP1P2 > 0) {
        proporcaoNoSegmento = Math.min(1, Math.max(0, distP1 / distP1P2));
      }
    }
  }
  
  // 3. Calcular distância acumulada até o ponto clicado
  const p1Lat = segmentCoords[segmentoProximo-1][1];
  const p1Lng = segmentCoords[segmentoProximo-1][0];
  const p2Lat = segmentCoords[segmentoProximo][1];
  const p2Lng = segmentCoords[segmentoProximo][0];
  const distSegmento = calculateDistance(p1Lat, p1Lng, p2Lat, p2Lng);
  
  const distanciaAteClick = 
    distanciasAcumuladas[segmentoProximo - 1] +
    (proporcaoNoSegmento * distSegmento);
  
  // 4. Interpolar KM baseado na proporção da distância total
  const proporcaoTotal = distanciaTotal > 0 ? distanciaAteClick / distanciaTotal : 0;
  const kmCalculado = kmInicial + (proporcaoTotal * (kmFinal - kmInicial));
  
  return kmCalculado;
}
