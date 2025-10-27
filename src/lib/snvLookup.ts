// src/lib/snvLookup.ts
// Utilitários para auto-preenchimento do SNV a partir de coordenadas (MVP front).
// Requisitos: npm i @turf/turf

import { point, lineString, pointToLineDistance, centroid } from '@turf/turf';

export type ConfiancaSNV = 'alta' | 'media' | 'baixa';

export interface LookupPointParams {
  lon: number;               // longitude em graus decimais
  lat: number;               // latitude em graus decimais
  geojson: any;              // FeatureCollection (SNV de uma UF, p.ex. MG)
  toleranciaMetros?: number; // padrão: 50m (clique mapa). Para EXIF, use 80–100m.
}

export interface LookupResult {
  codigo_snv: string;
  dist_m: number;
  confianca: ConfiancaSNV;
  feature?: any;             // feature original (opcional, útil para debug)
}

/** --- Configuração de carregamento de base por UF --- */
const geojsonCachePorUF: Record<string, any> = Object.create(null);

/**
 * Caminho padrão para o GeoJSON SNV Brasil completo.
 */
export function defaultSnvPath() {
  return '/geojson/snv-brasil-completo.geojson';
}

/**
 * Carrega o GeoJSON do SNV Brasil completo com cache em memória.
 * @param pathOverride caminho alternativo (opcional)
 */
export async function loadSnvGeojsonByUF(pathOverride?: string) {
  const key = 'snv-brasil-completo';
  if (geojsonCachePorUF[key]) return geojsonCachePorUF[key];

  const path = pathOverride ?? defaultSnvPath();
  const resp = await fetch(path);
  if (!resp.ok) {
    throw new Error(`Falha ao carregar SNV Brasil: ${resp.status} ${resp.statusText}`);
  }
  const gj = await resp.json();
  // Checagem leve
  if (!gj || !Array.isArray(gj.features)) {
    throw new Error(`GeoJSON inválido: missing features[]`);
  }
  geojsonCachePorUF[key] = gj;
  return gj;
}

/** --- Núcleo de cálculo --- */

/**
 * Retorna a menor distância (em metros) entre um ponto e um feature LineString/MultiLineString.
 * Suporta pistas duplas (MultiLineString) — calcula por segmento.
 */
function distancePointToFeatureMeters(pt: ReturnType<typeof point>, feature: any): number {
  const g = feature?.geometry;
  if (!g) return Infinity;

  if (g.type === 'LineString') {
    const line = lineString(g.coordinates);
    return pointToLineDistance(pt, line, { units: 'meters' });
  }

  if (g.type === 'MultiLineString') {
    let best = Infinity;
    for (const coords of g.coordinates) {
      const line = lineString(coords);
      const d = pointToLineDistance(pt, line, { units: 'meters' });
      if (d < best) best = d;
    }
    return best;
  }

  return Infinity;
}

/** Normaliza o campo do código SNV (codigo_snv | cod_snv | snv) */
function getCodigoSNV(props: any): string | null {
  if (!props) return null;
  return (
    props.codigo_snv ??
    props.cod_snv ??
    props.snv ??
    null
  );
}

/** Classifica confiança pela distância */
function classificarConfianca(dist_m: number): ConfiancaSNV {
  if (dist_m <= 20) return 'alta';
  if (dist_m <= 50) return 'media';
  return 'baixa';
}

/**
 * Lookup de SNV por ponto (lon/lat).
 * - Percorre todas as features e encontra a menor distância.
 * - Se distância > tolerância, retorna null.
 */
export function lookupPoint({
  lon,
  lat,
  geojson,
  toleranciaMetros = 50,
}: LookupPointParams): LookupResult | null {
  if (!geojson || !Array.isArray(geojson.features)) {
    console.warn('lookupPoint: GeoJSON inválido.');
    return null;
  }

  const pt = point([lon, lat]);

  let bestFeature: any = null;
  let bestDist = Infinity;

  for (const f of geojson.features) {
    if (!f?.geometry) continue;
    const codigo = getCodigoSNV(f.properties);
    if (!codigo) continue; // ignora features sem código

    const d = distancePointToFeatureMeters(pt, f);
    if (d < bestDist) {
      bestDist = d;
      bestFeature = f;
    }
  }

  if (!bestFeature || !isFinite(bestDist)) return null;

  if (bestDist > toleranciaMetros) {
    // Fora da tolerância: não preencher automaticamente
    return null;
  }

  const codigo = getCodigoSNV(bestFeature.properties)!;
  const confianca = classificarConfianca(bestDist);

  return {
    codigo_snv: codigo,
    dist_m: bestDist,
    confianca,
    feature: bestFeature,
  };
}

/** (Opcional futuro) Lookup por linha (início/fim) — esqueleto. */
export interface LookupLineParams {
  lon1: number;
  lat1: number;
  lon2: number;
  lat2: number;
  geojson: any;
  toleranciaMetros?: number; // para fallback nearest se não intersectar
}

/**
 * Versão simples: pega o SNV cuja linha fique mais próxima do segmento informado (fallback).
 * Para um cálculo de sobreposição real, considerar turf.lineIntersect e somar overlaps.
 */
export function lookupLineNearest({
  lon1, lat1, lon2, lat2, geojson, toleranciaMetros = 50,
}: LookupLineParams): LookupResult | null {
  if (!geojson || !Array.isArray(geojson.features)) return null;

  const line = lineString([[lon1, lat1], [lon2, lat2]]);
  const centro = centroid(line); // aproximação: usa o centro p/ nearest

  let bestFeature: any = null;
  let bestDist = Infinity;

  for (const f of geojson.features) {
    if (!f?.geometry) continue;
    if (!getCodigoSNV(f.properties)) continue;

    // Distância do centro do segmento até o eixo SNV
    const d = distancePointToFeatureMeters(centro, f);
    if (d < bestDist) {
      bestDist = d;
      bestFeature = f;
    }
  }

  if (!bestFeature || bestDist > toleranciaMetros) return null;

  const codigo = getCodigoSNV(bestFeature.properties)!;
  const confianca = classificarConfianca(bestDist);
  return { codigo_snv: codigo, dist_m: bestDist, confianca, feature: bestFeature };
}
