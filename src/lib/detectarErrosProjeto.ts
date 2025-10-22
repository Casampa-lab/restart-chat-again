import { supabase } from '@/integrations/supabase/client';

export interface ResultadoDeteccao {
  tipo_elemento: string;
  rodovia_id?: string;
  lote_id?: string;
  necessidades_analisadas: number;
  erros_detectados: number;
  taxa_erro: string;
}

/**
 * Detecta possíveis erros de projeto onde necessidades "Implantar" 
 * encontram elementos similares já cadastrados
 */
export async function detectarErrosProjeto(
  tipoElemento: 'cilindros' | 'placas' | 'porticos' | 'inscricoes' | 'tachas' | 'marcas_longitudinais' | 'defensas',
  rodoviaId?: string,
  loteId?: string
): Promise<ResultadoDeteccao> {
  const { data, error } = await supabase.functions.invoke('detectar-erros-projeto', {
    body: {
      tipo_elemento: tipoElemento,
      rodovia_id: rodoviaId,
      lote_id: loteId
    }
  });

  if (error) {
    console.error('Erro ao detectar erros de projeto:', error);
    throw error;
  }

  return data as ResultadoDeteccao;
}
