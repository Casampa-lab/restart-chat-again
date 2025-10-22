import { supabase } from '@/integrations/supabase/client';

export type ClasseElemento = 'PONTUAL' | 'LINEAR';
export type TipoElementoMatch = 'PLACA' | 'PORTICO' | 'INSCRICAO' | 'MARCA_LONG' | 'TACHAS' | 'DEFENSA' | 'CILINDRO';

export interface ParamToleranciasMatch {
  id: string;
  classe: ClasseElemento;
  tipo: TipoElementoMatch;
  tol_dist_m?: number;
  tol_dist_substituicao_m?: number;
  tol_overlap_match?: number;
  tol_overlap_amb_low?: number;
  tol_overlap_amb_high?: number;
  atributos_match: string[];
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export async function getParamsByTipo(tipo: TipoElementoMatch): Promise<ParamToleranciasMatch | null> {
  const { data, error } = await supabase
    .from('param_tolerancias_match')
    .select('*')
    .eq('tipo', tipo)
    .eq('ativo', true)
    .single();
  
  if (error) {
    console.error('Erro ao buscar parâmetros:', error);
    return null;
  }
  
  return data as ParamToleranciasMatch;
}

export async function getAllParams(): Promise<ParamToleranciasMatch[]> {
  const { data, error } = await supabase
    .from('param_tolerancias_match')
    .select('*')
    .eq('ativo', true)
    .order('tipo');
  
  if (error) {
    console.error('Erro ao buscar todos os parâmetros:', error);
    return [];
  }
  
  return data as ParamToleranciasMatch[];
}

// Mapeamento de GrupoElemento → TipoElementoMatch
// Tolerâncias padronizadas (mutatis mutandis)
// Pontuais (metros): distância GPS
// Lineares (fração 0-1): overlap do projeto sobre cadastro
export const TOL = {
  // Pontuais (metros)
  PLACA: 15,
  PORTICO: 80,
  INSCRICAO: 12,
  // Lineares (fração de cobertura do projeto)
  MARCA_LONG: 0.30,
  TACHA: 0.30,
  DEFENSA: 0.25,
  CILINDRO: 0.25,
} as const;

export const GRUPO_TO_TIPO_MAP: Record<string, TipoElementoMatch> = {
  'placas': 'PLACA',
  'porticos': 'PORTICO',
  'inscricoes': 'INSCRICAO',
  'marcas_longitudinais': 'MARCA_LONG',
  'tachas': 'TACHAS',
  'defensas': 'DEFENSA',
  'cilindros': 'CILINDRO'
};
