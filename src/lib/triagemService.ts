// Service para gerenciar triagem manual de necessidades com match duvidoso
// Tarefa 4: Estados, Buckets e Triagem

import { supabase } from '@/integrations/supabase/client';
import { MatchDecision } from './matchingService';

export type EstadoNecessidade = 'PROPOSTO' | 'ATIVO' | 'REJEITADO';

export interface ItemTriagem {
  tipo_elemento: string;
  id: string;
  rodovia_id: string;
  lote_id: string;
  servico: string;
  match_decision: MatchDecision | null;
  match_score: number | null;
  reason_code: string | null;
  cadastro_id: string | null;
  estado: EstadoNecessidade;
  posicao: number;
  descricao: string;
  lado: string | null;
  created_at: string;
}

/**
 * Busca itens em triagem manual (estado PROPOSTO)
 * Ordenados por match_score ASC (piores primeiro)
 * 
 * @param rodoviaId - Filtrar por rodovia (opcional)
 * @param loteId - Filtrar por lote (opcional)
 * @param reasonCode - Filtrar por código de razão (opcional)
 * @returns Lista de itens aguardando revisão
 */
export async function getItensTriagem(
  rodoviaId?: string,
  loteId?: string,
  reasonCode?: string
): Promise<ItemTriagem[]> {
  let query = supabase
    .from('vw_triagem_manual' as any)
    .select('*')
    .order('match_score', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  
  if (rodoviaId) {
    query = query.eq('rodovia_id', rodoviaId);
  }
  
  if (loteId) {
    query = query.eq('lote_id', loteId);
  }
  
  if (reasonCode) {
    query = query.eq('reason_code', reasonCode);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar itens de triagem:', error);
    throw error;
  }
  
  return (data || []) as unknown as ItemTriagem[];
}

/**
 * Busca estatísticas da triagem por tipo de elemento
 */
export async function getEstatisticasTriagem(rodoviaId?: string, loteId?: string): Promise<{
  total: number;
  por_tipo: Record<string, number>;
  por_decision: Record<string, number>;
  por_reason: Record<string, number>;
}> {
  const itens = await getItensTriagem(rodoviaId, loteId);
  
  const por_tipo: Record<string, number> = {};
  const por_decision: Record<string, number> = {};
  const por_reason: Record<string, number> = {};
  
  itens.forEach(item => {
    por_tipo[item.tipo_elemento] = (por_tipo[item.tipo_elemento] || 0) + 1;
    
    if (item.match_decision) {
      por_decision[item.match_decision] = (por_decision[item.match_decision] || 0) + 1;
    }
    
    if (item.reason_code) {
      por_reason[item.reason_code] = (por_reason[item.reason_code] || 0) + 1;
    }
  });
  
  return {
    total: itens.length,
    por_tipo,
    por_decision,
    por_reason
  };
}

/**
 * Aprova uma necessidade em triagem
 * Muda estado para ATIVO e permite consolidação no inventário
 * 
 * @param tipoElemento - Tipo do elemento (placas, porticos, etc)
 * @param necessidadeId - UUID da necessidade
 * @param observacao - Observação do coordenador (opcional)
 */
export async function aprovarNecessidade(
  tipoElemento: string,
  necessidadeId: string,
  observacao?: string
): Promise<void> {
  const tabela = getTabelaNecessidades(tipoElemento);
  
  const { data: user } = await supabase.auth.getUser();
  
  const updates: any = {
    estado: 'ATIVO',
    revisado_por: user.user?.id,
    revisado_em: new Date().toISOString()
  };
  
  if (observacao) {
    updates.observacao_coordenador = observacao;
  }
  
  const { error } = await supabase
    .from(tabela as any)
    .update(updates)
    .eq('id', necessidadeId);
  
  if (error) {
    console.error('Erro ao aprovar necessidade:', error);
    throw error;
  }
}

/**
 * Rejeita uma necessidade em triagem
 * Muda estado para REJEITADO e impede consolidação
 * 
 * @param tipoElemento - Tipo do elemento
 * @param necessidadeId - UUID da necessidade
 * @param motivo - Motivo da rejeição (obrigatório)
 */
export async function rejeitarNecessidade(
  tipoElemento: string,
  necessidadeId: string,
  motivo: string
): Promise<void> {
  if (!motivo || motivo.trim().length === 0) {
    throw new Error('Motivo da rejeição é obrigatório');
  }
  
  const tabela = getTabelaNecessidades(tipoElemento);
  
  const { data: user } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from(tabela as any)
    .update({
      estado: 'REJEITADO',
      reason_code: motivo,
      revisado_por: user.user?.id,
      revisado_em: new Date().toISOString()
    })
    .eq('id', necessidadeId);
  
  if (error) {
    console.error('Erro ao rejeitar necessidade:', error);
    throw error;
  }
}

/**
 * Retorna para triagem (volta para PROPOSTO)
 * Útil quando aprovação foi feita por engano
 */
export async function retornarParaTriagem(
  tipoElemento: string,
  necessidadeId: string
): Promise<void> {
  const tabela = getTabelaNecessidades(tipoElemento);
  
  const { error } = await supabase
    .from(tabela as any)
    .update({
      estado: 'PROPOSTO',
      revisado_por: null,
      revisado_em: null
    })
    .eq('id', necessidadeId);
  
  if (error) {
    console.error('Erro ao retornar para triagem:', error);
    throw error;
  }
}

/**
 * Helper: mapeia tipo de elemento para nome da tabela
 */
function getTabelaNecessidades(tipoElemento: string): string {
  const mapa: Record<string, string> = {
    'placas': 'necessidades_placas',
    'porticos': 'necessidades_porticos',
    'inscricoes': 'necessidades_marcas_transversais',
    'marcas_longitudinais': 'necessidades_marcas_longitudinais',
    'tachas': 'necessidades_tachas',
    'defensas': 'necessidades_defensas',
    'cilindros': 'necessidades_cilindros'
  };
  
  const tabela = mapa[tipoElemento];
  
  if (!tabela) {
    throw new Error(`Tipo de elemento inválido: ${tipoElemento}`);
  }
  
  return tabela;
}

/**
 * Formata reason_code para display amigável
 */
export function formatReasonCode(reasonCode: string): string {
  const traducoes: Record<string, string> = {
    'NO_CADASTRO_NEARBY': 'Nenhum cadastro próximo',
    'DIST_GT_THRESHOLD': 'Distância acima do limite',
    'DIST_IN_GRAY_ZONE': 'Distância em zona cinza',
    'SIDE_MISMATCH': 'Lado diferente',
    'ATTR_MISMATCH_SAME_LOCATION': 'Atributos divergentes na mesma localização',
    'PERFECT_MATCH': 'Match perfeito',
    'NO_OVERLAP_FOUND': 'Sem sobreposição encontrada',
    'OVERLAP_LT_THRESHOLD': 'Sobreposição abaixo do mínimo',
    'OVERLAP_IN_GRAY_ZONE': 'Sobreposição em zona duvidosa',
    'HIGH_OVERLAP_PERFECT_ATTR': 'Alta sobreposição com atributos perfeitos',
    'HIGH_OVERLAP_ATTR_MISMATCH': 'Alta sobreposição mas atributos divergentes',
    'INVALID_GEOMETRY': 'Geometria inválida',
    'INCOERENTE_IMPLANTAR_EXISTE': 'Incoerente: implantar mas já existe',
    'INCOERENTE_REMOVER_NAO_EXISTE': 'Incoerente: remover mas não existe'
  };
  
  return traducoes[reasonCode] || reasonCode;
}
