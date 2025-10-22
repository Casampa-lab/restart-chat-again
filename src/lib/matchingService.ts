// Service para executar algoritmos de matching entre necessidades e inventário
// Tarefa 2: Wrapper TypeScript para match_pontual

import { supabase } from '@/integrations/supabase/client';
import { TipoElementoMatch } from './matchingParams';

export type MatchDecision = 'MATCH_DIRECT' | 'SUBSTITUICAO' | 'AMBIGUOUS' | 'NO_MATCH' | 'MULTIPLE_CANDIDATES' | 'GRAY_ZONE';

export interface MatchResult {
  cadastro_id: string | null;
  decision: MatchDecision;
  match_score: number;
  reason_code: string;
  distancia_metros: number | null;
  atributos_divergentes: string[];
}

/**
 * Executa matching de elemento pontual (PLACA, PORTICO, INSCRICAO)
 * Considera distância GPS + similaridade de atributos obrigatórios
 * 
 * Se GPS não estiver disponível (lat/lon null), usa fallback por km_inicial.
 * 
 * @param tipo - Tipo do elemento (PLACA, PORTICO, INSCRICAO)
 * @param lat - Latitude da necessidade (null = usar fallback por KM)
 * @param lon - Longitude da necessidade (null = usar fallback por KM)
 * @param rodoviaId - UUID da rodovia
 * @param atributos - Objeto com atributos da necessidade (ex: {codigo, lado, tipo, km_inicial})
 * @param servico - Tipo de serviço ('Inclusão', 'Substituição', 'Remoção')
 * @returns MatchResult com decisão, score, reason code e divergências
 */
export async function matchPontual(
  tipo: TipoElementoMatch,
  lat: number | null,
  lon: number | null,
  rodoviaId: string,
  atributos: Record<string, any>,
  servico: string
): Promise<MatchResult> {
  // Se GPS não estiver disponível, garantir que km_inicial está presente
  if ((lat === null || lon === null) && atributos.km_inicial !== undefined) {
    // Converter km_inicial para número se necessário
    atributos.km_inicial = Number(atributos.km_inicial);
    
    if (isNaN(atributos.km_inicial)) {
      throw new Error('km_inicial inválido: não é um número válido');
    }
  }
  
  // Validar que temos GPS OU km_inicial
  if ((lat === null || lon === null) && (atributos.km_inicial === undefined || atributos.km_inicial === null)) {
    throw new Error('Necessário fornecer coordenadas GPS (lat/lon) ou km_inicial para matching');
  }
  
  const { data, error } = await supabase.rpc('match_pontual', {
    p_tipo: tipo,
    p_lat: lat,
    p_lon: lon,
    p_rodovia_id: rodoviaId,
    p_atributos: atributos,
    p_servico: servico
  });
  
  if (error) {
    console.error('Erro ao executar match_pontual:', error);
    throw error;
  }
  
  return data as MatchResult;
}

/**
 * Converte MatchResult em mensagem legível para usuário
 */
export function formatMatchResult(result: MatchResult): string {
  const score = Math.round(result.match_score * 100);
  
  switch (result.decision) {
    case 'MATCH_DIRECT':
      return `✅ Match Direto (${score}%) - ${result.reason_code}`;
    case 'SUBSTITUICAO':
      return `🔄 Substituição (${score}%) - Atributos divergentes: ${result.atributos_divergentes.join(', ')}`;
    case 'MULTIPLE_CANDIDATES':
      return `⚠️ Múltiplos Candidatos (${score}%) - ${result.reason_code}`;
    case 'GRAY_ZONE':
      return `⚠️ Faixa Cinza (${score}%) - ${result.reason_code}`;
    case 'AMBIGUOUS':
      return `⚠️ Duvidoso (${score}%) - ${result.reason_code}`;
    case 'NO_MATCH':
      return `❌ Sem Match (${score}%) - ${result.reason_code}`;
    default:
      return `❓ Resultado desconhecido`;
  }
}

/**
 * Determina se o match é conclusivo (pode consolidar automaticamente)
 * MATCH_DIRECT e SUBSTITUICAO são conclusivos
 * AMBIGUOUS, MULTIPLE_CANDIDATES, GRAY_ZONE e NO_MATCH não são
 */
export function isMatchConclusivo(decision: MatchDecision): boolean {
  return decision === 'MATCH_DIRECT' || decision === 'SUBSTITUICAO';
}

/**
 * Determina estado da necessidade baseado na decisão de match
 */
export function determinarEstadoNecessidade(decision: MatchDecision): 'ATIVO' | 'PROPOSTO' {
  return isMatchConclusivo(decision) ? 'ATIVO' : 'PROPOSTO';
}

/**
 * Executa matching de elemento linear (MARCA_LONG, TACHAS, DEFENSA, CILINDRO)
 * Considera overlap de segmento PostGIS + similaridade de atributos
 * 
 * @param tipo - Tipo do elemento (MARCA_LONG, TACHAS, DEFENSA, CILINDRO)
 * @param geomWKT - Geometria LINESTRING em formato WKT
 * @param rodoviaId - UUID da rodovia
 * @param atributos - Objeto com atributos da necessidade
 * @param servico - Tipo de serviço ('Inclusão', 'Substituição', 'Remoção')
 * @returns MatchResult com decisão, score (=overlap ratio), reason code e divergências
 */
export async function matchLinear(
  tipo: TipoElementoMatch,
  geomWKT: string,
  rodoviaId: string,
  atributos: Record<string, any>,
  servico: string
): Promise<MatchResult> {
  const { data, error } = await supabase.rpc('match_linear', {
    p_tipo: tipo,
    p_geom_necessidade: geomWKT,
    p_rodovia_id: rodoviaId,
    p_atributos: atributos,
    p_servico: servico
  });
  
  if (error) {
    console.error('Erro ao executar match_linear:', error);
    throw error;
  }
  
  return data as MatchResult;
}

/**
 * Helper para construir WKT LINESTRING a partir de coordenadas
 * @param latIni - Latitude inicial
 * @param lonIni - Longitude inicial
 * @param latFim - Latitude final
 * @param lonFim - Longitude final
 * @returns String WKT no formato "LINESTRING(lon1 lat1, lon2 lat2)"
 */
export function buildLineStringWKT(
  latIni: number,
  lonIni: number,
  latFim: number,
  lonFim: number
): string {
  return `LINESTRING(${lonIni} ${latIni}, ${lonFim} ${latFim})`;
}
