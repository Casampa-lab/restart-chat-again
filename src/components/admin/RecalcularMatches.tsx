import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const TIPOS_ELEMENTOS = [
  { value: "cilindros", label: "Cilindros", tabela_cadastro: "ficha_cilindros", tabela_necessidade: "necessidades_cilindros" },
  { value: "defensas", label: "Defensas", tabela_cadastro: "defensas", tabela_necessidade: "necessidades_defensas" },
  { value: "marcas_transversais", label: "Inscrições/Marcas Transversais", tabela_cadastro: "ficha_inscricoes", tabela_necessidade: "necessidades_marcas_transversais" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", tabela_cadastro: "ficha_marcas_longitudinais", tabela_necessidade: "necessidades_marcas_longitudinais" },
  { value: "placas", label: "Placas", tabela_cadastro: "ficha_placa", tabela_necessidade: "necessidades_placas" },
  { value: "porticos", label: "Pórticos", tabela_cadastro: "ficha_porticos", tabela_necessidade: "necessidades_porticos" },
  { value: "tachas", label: "Tachas Refletivas", tabela_cadastro: "ficha_tachas", tabela_necessidade: "necessidades_tachas" },
];

const TIPOS_COM_STATUS_REVISAO = ['defensas', 'marcas_longitudinais', 'tachas'];
const TIPOS_COM_MATCH_LINEAR = ['defensas', 'marcas_longitudinais', 'cilindros', 'tachas'];

interface LogEntry {
  tipo: "success" | "warning" | "error" | "info";
  mensagem: string;
}

interface RecalcularMatchesProps {
  loteId?: string;
  rodoviaId?: string;
}

export function RecalcularMatches({ loteId, rodoviaId }: RecalcularMatchesProps = {}) {
  const [tiposSelecionados, setTiposSelecionados] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);
  const [toleranciasPadrao, setToleranciasPadrao] = useState<Record<string, number>>({});
  const [toleranciasCustomizadas, setToleranciasCustomizadas] = useState<Record<string, number>>({});
  const [forcarReprocessamento, setForcarReprocessamento] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const buscarToleranciasPadrao = async () => {
      if (!rodoviaId) {
        setToleranciasPadrao({});
        return;
      }

      const { data: rodoviaData } = await supabase
        .from('rodovias')
        .select(`
          tolerancia_match_metros,
          tolerancia_placas_metros,
          tolerancia_porticos_metros,
          tolerancia_defensas_metros,
          tolerancia_marcas_metros,
          tolerancia_cilindros_metros,
          tolerancia_tachas_metros,
          tolerancia_inscricoes_metros
        `)
        .eq('id', rodoviaId)
        .single();

      if (rodoviaData) {
        setToleranciasPadrao({
          placas: rodoviaData.tolerancia_placas_metros || rodoviaData.tolerancia_match_metros || 50,
          porticos: rodoviaData.tolerancia_porticos_metros || rodoviaData.tolerancia_match_metros || 200,
          defensas: rodoviaData.tolerancia_defensas_metros || rodoviaData.tolerancia_match_metros || 20,
          marcas_longitudinais: rodoviaData.tolerancia_marcas_metros || rodoviaData.tolerancia_match_metros || 20,
          cilindros: rodoviaData.tolerancia_cilindros_metros || rodoviaData.tolerancia_match_metros || 30,
          tachas: rodoviaData.tolerancia_tachas_metros || rodoviaData.tolerancia_match_metros || 20,
          marcas_transversais: rodoviaData.tolerancia_inscricoes_metros || rodoviaData.tolerancia_match_metros || 30,
        });
      }
    };

    buscarToleranciasPadrao();
  }, [rodoviaId]);

  useEffect(() => {
    setToleranciasCustomizadas({});
  }, [rodoviaId]);

  const calcularSobreposicaoKm = (
    nec_km_ini: number, 
    nec_km_fim: number,
    cad_km_ini: number, 
    cad_km_fim: number
  ): { overlap_km: number; porcentagem: number } => {
    const inicio = Math.max(nec_km_ini, cad_km_ini);
    const fim = Math.min(nec_km_fim, cad_km_fim);
    
    if (inicio >= fim) {
      return { overlap_km: 0, porcentagem: 0 };
    }
    
    const overlap_km = fim - inicio;
    const tamanho_necessidade = nec_km_fim - nec_km_ini;
    
    const porcentagem = tamanho_necessidade > 0 
      ? (overlap_km / tamanho_necessidade) * 100 
      : 0;
    
    return { 
      overlap_km: Math.round(overlap_km * 1000) / 1000,
      porcentagem: Math.round(porcentagem * 10) / 10
    };
  };

  const normalizarLado = (lado: string): string => {
    if (!lado) return "";
    const l = lado.toLowerCase().trim();
    if (l.includes("esq") || l === "e") return "esquerdo";
    if (l.includes("dir") || l === "d") return "direito";
    if (l.includes("eix") || l === "c" || l === "central") return "eixo";
    if (l.includes("amb") || l === "ambos") return "ambos";
    return lado;
  };

  const validarLadoPorTipo = (
    tipo: string, 
    ladoNec: string, 
    ladoCad: string
  ): boolean => {
    const config: Record<string, { validar: boolean; estrito: boolean }> = {
      marcas_longitudinais: { validar: true, estrito: true },
      defensas: { validar: true, estrito: true },
      tachas: { validar: true, estrito: false }
    };
    
    const tipoConfig = config[tipo];
    if (!tipoConfig || !tipoConfig.validar) return true;
    
    const ladoNecNorm = normalizarLado(ladoNec);
    const ladoCadNorm = normalizarLado(ladoCad);
    
    if (!ladoNecNorm || !ladoCadNorm) return true;
    
    if (tipoConfig.estrito) {
      return ladoNecNorm === ladoCadNorm;
    }
    
    return ladoNecNorm === ladoCadNorm || 
           ladoNecNorm === "ambos" || 
           ladoCadNorm === "ambos";
  };

  const buscarMatchSegmento = (
    necessidade: any,
    cadastros: any[],
    tipo: string,
    thresholdOverlap: number = 50
  ): Array<{
    cadastro_id: string;
    overlap_porcentagem: number;
    overlap_km: number;
    tipo_match: string;
  }> => {
    const matches = [];
    
    for (const cad of cadastros) {
      const ladoValido = validarLadoPorTipo(tipo, necessidade.lado || "", cad.lado || "");
      if (!ladoValido) continue;
      
      if (tipo === 'marcas_longitudinais') {
        if (necessidade.posicao && cad.posicao && necessidade.posicao !== cad.posicao) continue;
        if (necessidade.cor && cad.cor && necessidade.cor !== cad.cor) continue;
        if (necessidade.tipo_demarcacao && cad.tipo_demarcacao && necessidade.tipo_demarcacao !== cad.tipo_demarcacao) continue;
        if (necessidade.largura_cm && cad.largura_cm) {
          const diferencaLargura = Math.abs(necessidade.largura_cm - cad.largura_cm);
          if (diferencaLargura > 2) continue;
        }
      }
      
      if (tipo === 'tachas') {
        if (!cad.local_implantacao || cad.local_implantacao === "Não se Aplica" || cad.local_implantacao.trim() === "") continue;
        if (necessidade.local_implantacao && cad.local_implantacao && necessidade.local_implantacao !== cad.local_implantacao) continue;
        if (necessidade.corpo && cad.corpo && necessidade.corpo !== cad.corpo) continue;
        if (necessidade.refletivo && cad.refletivo && necessidade.refletivo !== cad.refletivo) continue;
        if (necessidade.cor_refletivo && cad.cor_refletivo && necessidade.cor_refletivo !== cad.cor_refletivo) continue;
      }
      
      if (tipo === 'cilindros') {
        if (!cad.local_implantacao || cad.local_implantacao === "Não se Aplica" || cad.local_implantacao.trim() === "") continue;
        if (necessidade.local_implantacao && cad.local_implantacao && necessidade.local_implantacao !== cad.local_implantacao) continue;
        if (necessidade.cor_corpo && cad.cor_corpo && necessidade.cor_corpo !== cad.cor_corpo) continue;
        if (necessidade.cor_refletivo && cad.cor_refletivo && necessidade.cor_refletivo !== cad.cor_refletivo) continue;
      }
      
      if (tipo === 'defensas') {
        if (!cad.funcao || cad.funcao === "Não se Aplica" || cad.funcao.trim() === "") continue;
        if (necessidade.funcao && cad.funcao && necessidade.funcao !== cad.funcao) continue;
        if (necessidade.especificacao_obstaculo_fixo && cad.especificacao_obstaculo_fixo && necessidade.especificacao_obstaculo_fixo !== cad.especificacao_obstaculo_fixo) continue;
        if (necessidade.nivel_contencao_en1317 && cad.nivel_contencao_en1317 && necessidade.nivel_contencao_en1317 !== cad.nivel_contencao_en1317) continue;
        if (necessidade.nivel_contencao_nchrp350 && cad.nivel_contencao_nchrp350 && necessidade.nivel_contencao_nchrp350 !== cad.nivel_contencao_nchrp350) continue;
        if (necessidade.geometria && cad.geometria && necessidade.geometria !== cad.geometria) continue;
      }
      
      const { overlap_km, porcentagem } = calcularSobreposicaoKm(
        necessidade.km_inicial,
        necessidade.km_final,
        cad.km_inicial,
        cad.km_final
      );
      
      if (porcentagem >= thresholdOverlap) {
        let tipo_match = '';
        if (porcentagem >= 95) {
          tipo_match = 'exato';
        } else if (porcentagem >= 75) {
          tipo_match = 'alto';
        } else {
          tipo_match = 'parcial';
        }
        
        matches.push({
          cadastro_id: cad.id,
          overlap_porcentagem: porcentagem,
          overlap_km,
          tipo_match
        });
      }
    }
    
    return matches.sort((a, b) => b.overlap_porcentagem - a.overlap_porcentagem);
  };

  const calcularDistanciaHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  const buscarMatchPontual = (
    necessidade: any,
    cadastros: any[],
    tipo: string,
    toleranciaKm: number = 0.05
  ): Array<{ cadastro_id: string; distancia_metros: number; diferenca_km: number }> => {
    const matches: Array<{ cadastro_id: string; distancia_metros: number; diferenca_km: number }> = [];

    for (const cadastro of cadastros) {
      if (tipo === 'placas') {
        if (!cadastro.codigo || cadastro.codigo === "Não se Aplica" || cadastro.codigo.trim() === "") continue;
        if (necessidade.codigo && cadastro.codigo && necessidade.codigo !== cadastro.codigo) continue;
        if (necessidade.tipo && cadastro.tipo && necessidade.tipo !== cadastro.tipo) continue;
        if (necessidade.lado && cadastro.lado) {
          const ladoNecNorm = normalizarLado(necessidade.lado);
          const ladoCadNorm = normalizarLado(cadastro.lado);
          if (ladoNecNorm !== ladoCadNorm) continue;
        }
        if (necessidade.suporte && cadastro.suporte && necessidade.suporte !== cadastro.suporte) continue;
        if (necessidade.substrato && cadastro.substrato && necessidade.substrato !== cadastro.substrato) continue;
      }
      
      if (tipo === 'inscricoes' || tipo === 'marcas_transversais') {
        if (!cadastro.sigla || cadastro.sigla.trim() === "") continue;
        if (necessidade.sigla && cadastro.sigla && necessidade.sigla !== cadastro.sigla) continue;
        if (necessidade.tipo_inscricao && cadastro.tipo_inscricao && necessidade.tipo_inscricao !== cadastro.tipo_inscricao) continue;
        if (necessidade.cor && cadastro.cor && necessidade.cor !== cadastro.cor) continue;
        if (necessidade.area_m2 && cadastro.area_m2) {
          const tolerancia = necessidade.area_m2 * 0.10;
          if (Math.abs(necessidade.area_m2 - cadastro.area_m2) > tolerancia) continue;
        }
      }
      
      if (tipo === 'porticos') {
        if (!cadastro.tipo || cadastro.tipo === "Não se Aplica" || cadastro.tipo.trim() === "") continue;
        if (necessidade.tipo && cadastro.tipo && necessidade.tipo !== cadastro.tipo) continue;
        if (necessidade.lado && cadastro.lado) {
          const ladoNecNorm = normalizarLado(necessidade.lado);
          const ladoCadNorm = normalizarLado(cadastro.lado);
          if (ladoNecNorm !== ladoCadNorm) continue;
        }
        if (necessidade.vao_horizontal_m && cadastro.vao_horizontal_m) {
          const tolerancia = necessidade.vao_horizontal_m * 0.10;
          if (Math.abs(necessidade.vao_horizontal_m - cadastro.vao_horizontal_m) > tolerancia) continue;
        }
        if (necessidade.altura_livre_m && cadastro.altura_livre_m) {
          const tolerancia = necessidade.altura_livre_m * 0.10;
          if (Math.abs(necessidade.altura_livre_m - cadastro.altura_livre_m) > tolerancia) continue;
        }
      }

      const diferenca_km = Math.abs((necessidade.km || 0) - (cadastro.km || 0));
      if (diferenca_km <= toleranciaKm) {
        let distancia_metros = diferenca_km * 1000;
        
        if (necessidade.latitude && necessidade.longitude && cadastro.latitude_inicial && cadastro.longitude_inicial) {
          distancia_metros = calcularDistanciaHaversine(
            necessidade.latitude,
            necessidade.longitude,
            cadastro.latitude_inicial,
            cadastro.longitude_inicial
          );
        }
        
        matches.push({
          cadastro_id: cadastro.id,
          distancia_metros,
          diferenca_km
        });
      }
    }
    
    return matches.sort((a, b) => a.distancia_metros - b.distancia_metros);
  };

  const criarElementoNoInventario = async (necessidade: any, tipo: string, userId?: string, coordenadorId?: string) => {
    const tipoConfig = TIPOS_ELEMENTOS.find(t => t.value === tipo);
    if (!tipoConfig) {
      console.error(`Tipo não encontrado: ${tipo}`);
      return null;
    }

    const baseData: any = {
      user_id: userId || necessidade.user_id,
      lote_id: necessidade.lote_id,
      rodovia_id: necessidade.rodovia_id,
      data_vistoria: new Date().toISOString().split('T')[0],
      origem: 'necessidade_campo',
      modificado_por_intervencao: true,
      data_ultima_modificacao: new Date().toISOString()
    };

    let novoElemento: any = {};

    switch (tipo) {
      case 'marcas_longitudinais':
        novoElemento = {
          ...baseData,
          km_inicial: necessidade.km_inicial,
          km_final: necessidade.km_final,
          tipo_demarcacao: necessidade.tipo_demarcacao,
          cor: necessidade.cor,
          posicao: necessidade.posicao,
          lado: necessidade.lado,
          codigo: necessidade.codigo,
          largura_cm: necessidade.largura_cm,
          espessura_cm: necessidade.espessura_cm,
          material: necessidade.material,
          snv: necessidade.snv
        };
        break;
      case 'tachas':
        novoElemento = {
          ...baseData,
          km_inicial: necessidade.km_inicial,
          km_final: necessidade.km_final || necessidade.km_inicial, // Proteção para tachas pontuais
          tipo_tacha: necessidade.tipo_tacha,
          cor: necessidade.cor,
          material: necessidade.material,
          quantidade: necessidade.quantidade,
          lado: necessidade.lado,
          local_implantacao: necessidade.local_implantacao,
          snv: necessidade.snv
        };
        break;
      case 'marcas_transversais':
        novoElemento = {
          ...baseData,
          km_inicial: necessidade.km_inicial,
          km_final: necessidade.km_final,
          sigla: necessidade.sigla,
          tipo_inscricao: necessidade.tipo_inscricao,
          cor: necessidade.cor,
          dimensoes: necessidade.dimensoes,
          area_m2: necessidade.area_m2,
          espessura_mm: necessidade.espessura_mm,
          material_utilizado: necessidade.material_utilizado,
          snv: necessidade.snv
        };
        break;
      case 'cilindros':
        novoElemento = {
          ...baseData,
          km_inicial: necessidade.km_inicial,
          km_final: necessidade.km_final,
          cor_corpo: necessidade.cor_corpo,
          cor_refletivo: necessidade.cor_refletivo,
          tipo_refletivo: necessidade.tipo_refletivo,
          quantidade: necessidade.quantidade,
          local_implantacao: necessidade.local_implantacao,
          espacamento_m: necessidade.espacamento_m,
          extensao_km: necessidade.extensao_km,
          snv: necessidade.snv
        };
        break;
      case 'defensas':
        novoElemento = {
          ...baseData,
          km_inicial: necessidade.km_inicial,
          km_final: necessidade.km_final,
          extensao_metros: necessidade.extensao_metros,
          lado: necessidade.lado,
          funcao: necessidade.funcao,
          classificacao_nivel_contencao: necessidade.classificacao_nivel_contencao,
          nivel_contencao_en1317: necessidade.nivel_contencao_en1317,
          nivel_contencao_nchrp350: necessidade.nivel_contencao_nchrp350,
          especificacao_obstaculo_fixo: necessidade.especificacao_obstaculo_fixo,
          geometria: necessidade.geometria,
          snv: necessidade.snv
        };
        break;
      case 'placas':
        novoElemento = {
          ...baseData,
          km: necessidade.km,
          codigo: necessidade.codigo,
          tipo: necessidade.tipo_placa,
          modelo: necessidade.codigo,
          lado: necessidade.lado,
          suporte: necessidade.suporte,
          substrato: necessidade.substrato,
          dimensoes_mm: necessidade.dimensoes_mm,
          posicao: necessidade.posicao,
          snv: necessidade.snv
        };
        break;
      case 'porticos':
        novoElemento = {
          ...baseData,
          km: necessidade.km,
          tipo: necessidade.tipo,
          vao_horizontal_m: necessidade.vao_horizontal_m,
          altura_livre_m: necessidade.altura_livre_m,
          snv: necessidade.snv
        };
        break;
    }

    const { data, error } = await supabase
      .from(tipoConfig.tabela_cadastro as any)
      .insert(novoElemento)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const processarTipo = async (tipo: string, addLog: (tipo: "success" | "warning" | "error" | "info", mensagem: string) => void) => {
    const tipoConfig = TIPOS_ELEMENTOS.find(t => t.value === tipo);
    if (!tipoConfig) {
      throw new Error(`Tipo não encontrado: ${tipo}`);
    }

    if (!loteId || !rodoviaId) {
      throw new Error("Lote e Rodovia devem estar selecionados");
    }

    const resultados = {
      matches: 0,
      divergencias: 0,
      elementosNovos: 0,
    };

    const { data: { user } } = await supabase.auth.getUser();
    const { data: coordenadorData } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('id', user?.id)
      .single();

    const needsQuery = supabase
      .from(tipoConfig.tabela_necessidade as any)
      .select('*')
      .eq('lote_id', loteId)
      .eq('rodovia_id', rodoviaId);

    if (!forcarReprocessamento) {
      needsQuery.is('cadastro_id', null);
    }

    const { data: necessidades, error: needError } = await needsQuery;

    if (needError) throw needError;
    if (!necessidades || necessidades.length === 0) {
      return resultados;
    }

    const cadastroQuery = supabase
      .from(tipoConfig.tabela_cadastro as any)
      .select('*')
      .eq('lote_id', loteId)
      .eq('rodovia_id', rodoviaId);

    const { data: cadastros, error: cadError } = await cadastroQuery;

    if (cadError) throw cadError;

    const { data: rodoviaData } = await supabase
      .from('rodovias')
      .select(`
        tolerancia_match_metros,
        tolerancia_placas_metros,
        tolerancia_porticos_metros,
        tolerancia_defensas_metros,
        tolerancia_marcas_metros,
        tolerancia_cilindros_metros,
        tolerancia_tachas_metros,
        tolerancia_inscricoes_metros
      `)
      .eq('id', rodoviaId)
      .single();

    let toleranciaGPS = 50;
    if (rodoviaData) {
      const toleranciaCustom = toleranciasCustomizadas[tipo];
      if (toleranciaCustom !== undefined) {
        toleranciaGPS = toleranciaCustom;
      } else {
        switch (tipo) {
          case 'placas':
            toleranciaGPS = rodoviaData.tolerancia_placas_metros || rodoviaData.tolerancia_match_metros || 50;
            break;
          case 'porticos':
            toleranciaGPS = rodoviaData.tolerancia_porticos_metros || rodoviaData.tolerancia_match_metros || 200;
            break;
          case 'defensas':
            toleranciaGPS = rodoviaData.tolerancia_defensas_metros || rodoviaData.tolerancia_match_metros || 20;
            break;
          case 'marcas_longitudinais':
            toleranciaGPS = rodoviaData.tolerancia_marcas_metros || rodoviaData.tolerancia_match_metros || 20;
            break;
          case 'cilindros':
            toleranciaGPS = rodoviaData.tolerancia_cilindros_metros || rodoviaData.tolerancia_match_metros || 30;
            break;
          case 'tachas':
            toleranciaGPS = rodoviaData.tolerancia_tachas_metros || rodoviaData.tolerancia_match_metros || 20;
            break;
          case 'marcas_transversais':
            toleranciaGPS = rodoviaData.tolerancia_inscricoes_metros || rodoviaData.tolerancia_match_metros || 30;
            break;
        }
      }
    }

    for (let i = 0; i < necessidades.length; i++) {
      const nec: any = necessidades[i];

      try {
        let matchesCandidatos: any[] = [];
        let divergenciaIdentificada = false;

        const usarMatchLinear = TIPOS_COM_MATCH_LINEAR.includes(tipo);

        if (usarMatchLinear) {
          matchesCandidatos = buscarMatchSegmento(nec, cadastros || [], tipo, 50);
        } else {
          matchesCandidatos = buscarMatchPontual(nec, cadastros || [], tipo, toleranciaGPS / 1000);
        }

        // Capturar valor da planilha
        const solucaoPlanilha = nec.servico || nec.solucao_planilha || null;
        
        // INFERIR serviço baseado nos matches encontrados
        let servicoInferido: string;
        
        if (solucaoPlanilha === 'Remover') {
          // Remover sempre é Remover (independente de match)
          servicoInferido = 'Remover';
        } else if (matchesCandidatos.length > 0) {
          // ENCONTROU match no cadastro → Elemento JÁ EXISTE
          servicoInferido = 'Substituir';
        } else {
          // NÃO encontrou match → Elemento NÃO EXISTE
          servicoInferido = 'Implantar';
        }
        
        // Detectar divergência comparando INFERÊNCIA vs PLANILHA
        if (solucaoPlanilha && solucaoPlanilha !== servicoInferido) {
          divergenciaIdentificada = true;
        }

        const matchData: any = {
          cadastro_id: matchesCandidatos[0]?.cadastro_id || null,
          distancia_match_metros: !usarMatchLinear 
            ? matchesCandidatos[0]?.distancia_metros || null 
            : null,
          servico_inferido: servicoInferido,
          divergencia: divergenciaIdentificada
        };

        if (TIPOS_COM_STATUS_REVISAO.includes(tipo)) {
        if (divergenciaIdentificada || matchesCandidatos.length === 0) {
          matchData.status_revisao = 'pendente_coordenador';
        } else {
          matchData.status_revisao = 'ok';
        }
        }

        const { error: updateError } = await supabase
          .from(tipoConfig.tabela_necessidade as any)
          .update(matchData)
          .eq('id', nec.id);

        if (updateError) {
          addLog("error", `❌ Erro ao atualizar necessidade ${nec.id}: ${updateError.message}`);
          throw updateError;
        }

        // LOG: Match encontrado ou não
        if (matchesCandidatos.length > 0) {
          if (usarMatchLinear) {
            addLog("success", `✅ Match linear: ${matchesCandidatos[0].overlap_porcentagem.toFixed(1)}% sobreposição`);
          } else {
            addLog("success", `✅ Match pontual: ${matchesCandidatos[0].distancia_metros}m de distância`);
          }
        } else {
          addLog("info", `ℹ️ Nenhum match encontrado para necessidade ${nec.id}`);
        }

        if (divergenciaIdentificada) {
          resultados.divergencias++;
        } else {
          resultados.matches++;
        }

        // CORREÇÃO: Criar elemento para "Implantar" independente de tipo_origem
        if (matchesCandidatos.length === 0 && servicoInferido === 'Implantar') {
          try {
            addLog("info", `🆕 Criando novo elemento no inventário para Implantar...`);
            
            const novoElemento: any = await criarElementoNoInventario(nec, tipo, user?.id, coordenadorData?.id);
            
            if (novoElemento && novoElemento.id) {
              const elementoId = novoElemento.id;
              
              // Atualizar cadastro_id na necessidade
              const { error: linkError } = await supabase
                .from(tipoConfig.tabela_necessidade as any)
                .update({ 
                  cadastro_id: elementoId,
                  divergencia: false
                })
                .eq('id', nec.id);
              
              if (linkError) {
                addLog("error", `❌ Erro ao vincular elemento criado: ${linkError.message}`);
              } else {
                resultados.elementosNovos++;
                addLog("success", `✅ Elemento criado e vinculado: ${elementoId}`);
              }
            } else {
              addLog("warning", `⚠️ Elemento não foi criado ou ID não retornado`);
            }
          } catch (err: any) {
            addLog("error", `❌ ERRO ao criar elemento: ${err.message}`);
            console.error("Erro detalhado ao criar elemento:", err);
          }
        }
      } catch (err: any) {
        // Silenciar erro individual
      }
    }

    return resultados;
  };

  const handleRecalcularLote = async () => {
    if (tiposSelecionados.size === 0) {
      toast({
        title: "Nenhum tipo selecionado",
        description: "Selecione pelo menos um tipo de elemento",
        variant: "destructive",
      });
      return;
    }

    if (!loteId || !rodoviaId) {
      toast({
        title: "Parâmetros faltando",
        description: "Lote e Rodovia devem estar selecionados",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setProgressInfo(null);

    const tiposArray = Array.from(tiposSelecionados);
    let estatisticasGlobais = {
      matchesTotal: 0,
      divergenciasTotal: 0,
      elementosNovosTotal: 0,
      errosTotal: 0
    };

    const addLog = (tipo: "success" | "warning" | "error" | "info", mensagem: string) => {
      setLogs(prev => [...prev, { tipo, mensagem }]);
    };

    addLog("info", `🚀 Iniciando processamento de ${tiposArray.length} tipos...`);
    addLog("info", `📋 Parâmetros: Lote ${loteId} | Rodovia ${rodoviaId}`);
    
    if (forcarReprocessamento) {
      addLog("warning", "⚠️ MODO FORÇADO: Todos os registros serão reprocessados do zero");
    } else {
      addLog("info", "ℹ️ MODO NORMAL: Apenas registros pendentes serão processados");
    }

    for (let i = 0; i < tiposArray.length; i++) {
      const tipoAtual = tiposArray[i];
      const tipoConfig = TIPOS_ELEMENTOS.find(t => t.value === tipoAtual);
      
      setProgress(Math.round(((i) / tiposArray.length) * 100));
      setProgressInfo({ current: i + 1, total: tiposArray.length });
      
      addLog("info", `\n📦 ===== PROCESSANDO ${tipoConfig?.label.toUpperCase()} (${i + 1}/${tiposArray.length}) =====`);

      try {
        const resultado = await processarTipo(tipoAtual, addLog);
        
        estatisticasGlobais.matchesTotal += resultado.matches;
        estatisticasGlobais.divergenciasTotal += resultado.divergencias;
        estatisticasGlobais.elementosNovosTotal += resultado.elementosNovos;
        
        addLog("success", `✅ ${tipoConfig?.label}: ${resultado.matches} matches, ${resultado.divergencias} divergências`);
        
      } catch (error: any) {
        estatisticasGlobais.errosTotal++;
        addLog("error", `❌ Erro em ${tipoConfig?.label}: ${error.message}`);
      }
    }

    addLog("success", `\n🎉 ===== PROCESSAMENTO COMPLETO =====`);
    addLog("info", `📊 Tipos processados: ${tiposArray.length}`);
    addLog("success", `✅ Matches totais: ${estatisticasGlobais.matchesTotal}`);
    if (estatisticasGlobais.divergenciasTotal > 0) {
      addLog("warning", `⚠️ Divergências totais: ${estatisticasGlobais.divergenciasTotal}`);
    }
    if (estatisticasGlobais.elementosNovosTotal > 0) {
      addLog("info", `🆕 Elementos novos: ${estatisticasGlobais.elementosNovosTotal}`);
    }
    if (estatisticasGlobais.errosTotal > 0) {
      addLog("error", `❌ Erros: ${estatisticasGlobais.errosTotal}`);
    }

    queryClient.invalidateQueries({ queryKey: ['necessidades'] });
    queryClient.invalidateQueries({ queryKey: ['diagnostico'] });

    // 🔄 DELETAR Marco Zero - recalcular matches invalida o snapshot consolidado
    if (loteId && rodoviaId) {
      const { error: marcoError } = await supabase
        .from("marcos_inventario")
        .delete()
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .eq("tipo", "marco_zero");

      if (marcoError) {
        console.warn("⚠️ Aviso ao deletar marco zero:", marcoError);
        addLog("warning", "⚠️ Não foi possível invalidar Marco Zero");
      } else {
        console.log("✅ Marco Zero deletado - matches foram recalculados");
        addLog("info", "🔄 Marco Zero invalidado - inventário não está mais consolidado");
      }

      // Invalidar query do marco zero
      queryClient.invalidateQueries({ 
        queryKey: ["marco-zero-recente", loteId, rodoviaId] 
      });
    }

    toast({
      title: "Processamento Concluído",
      description: `${tiposArray.length} tipos processados com sucesso`,
    });

    setIsProcessing(false);
    setProgress(0);
    setProgressInfo(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Recalcular Matches (Inventário ↔ Projeto)
        </CardTitle>
        <CardDescription>
          Selecione os tipos de elementos para recalcular os vínculos entre cadastro e projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Selecione os elementos para processar:</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTiposSelecionados(new Set(TIPOS_ELEMENTOS.map(t => t.value)))}
                disabled={isProcessing}
              >
                Selecionar Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTiposSelecionados(new Set())}
                disabled={isProcessing}
              >
                Desmarcar Todos
              </Button>
            </div>
          </div>
          
          <div className="grid gap-2">
            {TIPOS_ELEMENTOS.map((elemento) => (
              <div 
                key={elemento.value}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`checkbox-${elemento.value}`}
                    checked={tiposSelecionados.has(elemento.value)}
                    onCheckedChange={(checked) => {
                      setTiposSelecionados(prev => {
                        const novo = new Set(prev);
                        if (checked) {
                          novo.add(elemento.value);
                        } else {
                          novo.delete(elemento.value);
                        }
                        return novo;
                      });
                    }}
                    disabled={isProcessing}
                  />
                  <Label 
                    htmlFor={`checkbox-${elemento.value}`}
                    className="font-medium cursor-pointer"
                  >
                    {elemento.label}
                  </Label>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Padrão: {toleranciasPadrao[elemento.value] || 50}m
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {rodoviaId && Object.keys(toleranciasPadrao).length > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">
                  Tolerâncias GPS para este Match
                </Label>
              </div>
              {Object.keys(toleranciasCustomizadas).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setToleranciasCustomizadas({})}
                  disabled={isProcessing}
                >
                  Resetar Todas
                </Button>
              )}
            </div>
            
            <div className="grid gap-3">
              {TIPOS_ELEMENTOS.map((elemento) => {
                const isCustomizado = toleranciasCustomizadas[elemento.value] !== undefined;
                const valorAtual = isCustomizado 
                  ? toleranciasCustomizadas[elemento.value]
                  : toleranciasPadrao[elemento.value];

                return (
                  <div 
                    key={elemento.value} 
                    className="space-y-2 p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {elemento.label}
                        {isCustomizado && (
                          <Badge variant="secondary" className="text-xs">
                            ✏️ Customizado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Padrão:</span>
                          <Badge variant="outline" className="font-mono">
                            {toleranciasPadrao[elemento.value]}m
                          </Badge>
                        </div>
                        
                        {isCustomizado && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">→ Usando:</span>
                            <Badge variant="default" className="font-mono">
                              {valorAtual}m
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-1">
                      <Label htmlFor={`tol-${elemento.value}`} className="text-xs text-muted-foreground min-w-[100px]">
                        Nova tolerância:
                      </Label>
                      <Input
                        id={`tol-${elemento.value}`}
                        type="number"
                        min={10}
                        max={500}
                        placeholder={`Ex: ${toleranciasPadrao[elemento.value]}`}
                        value={toleranciasCustomizadas[elemento.value] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : undefined;
                          setToleranciasCustomizadas(prev => {
                            if (val === undefined) {
                              const { [elemento.value]: _, ...rest } = prev;
                              return rest;
                            }
                            return { ...prev, [elemento.value]: val };
                          });
                        }}
                        disabled={isProcessing}
                        className="flex-1 max-w-[140px] font-mono"
                      />
                      <span className="text-xs text-muted-foreground">metros</span>
                      
                      {isCustomizado && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setToleranciasCustomizadas(prev => {
                              const { [elemento.value]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          disabled={isProcessing}
                          className="h-8 px-2"
                          title="Resetar ao padrão"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                💡 Valores customizados aplicam-se apenas a esta execução. Para alterar permanentemente, edite a rodovia.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <input
            type="checkbox"
            id="forcar-reprocessamento"
            checked={forcarReprocessamento}
            onChange={(e) => setForcarReprocessamento(e.target.checked)}
            disabled={isProcessing}
            className="mt-1 h-4 w-4 rounded border-amber-300"
          />
          <div className="flex-1 space-y-1">
            <Label htmlFor="forcar-reprocessamento" className="text-sm font-medium cursor-pointer">
              Forçar reprocessamento completo
            </Label>
            <p className="text-xs text-muted-foreground">
              ⚠️ <strong>Atenção:</strong> Marca esta opção apenas se quiser recalcular TODOS os registros do zero, 
              sobrescrevendo decisões manuais já feitas pelo coordenador. No modo normal (desmarcado), 
              o sistema preserva registros já reconciliados e apenas processa os pendentes.
            </p>
          </div>
        </div>

        <Button
          onClick={handleRecalcularLote}
          disabled={tiposSelecionados.size === 0 || !loteId || !rodoviaId || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processando... {progressInfo && `(${progressInfo.current}/${progressInfo.total})`}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              🚀 Processar Selecionados ({tiposSelecionados.size})
            </>
          )}
        </Button>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            {progressInfo && (
              <p className="text-sm text-center text-muted-foreground">
                Processando {progressInfo.current} de {progressInfo.total}
              </p>
            )}
          </div>
        )}

        {logs.length > 0 && (
          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2 bg-muted/30">
            <div className="font-medium text-sm mb-2">Log de Processamento:</div>
            {logs.map((log, index) => (
              <Alert
                key={index}
                variant={log.tipo === "error" ? "destructive" : "default"}
                className="py-2"
              >
                <div className="flex items-start gap-2">
                  {log.tipo === "success" && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
                  {log.tipo === "warning" && <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                  {log.tipo === "error" && <XCircle className="h-4 w-4 text-destructive mt-0.5" />}
                  {log.tipo === "info" && <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />}
                  <AlertDescription className="text-xs font-mono whitespace-pre-wrap">
                    {log.mensagem}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
