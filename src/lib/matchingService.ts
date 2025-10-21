// Service para executar algoritmos de matching entre necessidades e inventário
// Tarefa 2: Wrapper TypeScript para match_pontual

import { supabase } from '@/integrations/supabase/client';
import { TipoElementoMatch } from './matchingParams';

export type MatchDecision = 'MATCH_DIRECT' | 'SUBSTITUICAO' | 'AMBIGUOUS' | 'NO_MATCH';

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
 * @param tipo - Tipo do elemento (PLACA, PORTICO, INSCRICAO)
 * @param lat - Latitude da necessidade
 * @param lon - Longitude da necessidade
 * @param rodoviaId - UUID da rodovia
 * @param atributos - Objeto com atributos da necessidade (ex: {codigo, lado, tipo})
 * @param servico - Tipo de serviço ('Inclusão', 'Substituição', 'Remoção')
 * @returns MatchResult com decisão, score, reason code e divergências
 */
export async function matchPontual(
  tipo: TipoElementoMatch,
  lat: number,
  lon: number,
  rodoviaId: string,
  atributos: Record<string, any>,
  servico: string
): Promise<MatchResult> {
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
