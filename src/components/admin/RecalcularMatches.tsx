import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const TIPOS_ELEMENTOS = [
  { value: "cilindros", label: "Cilindros", tabela_cadastro: "ficha_cilindros", tabela_necessidade: "necessidades_cilindros" },
  { value: "defensas", label: "Defensas", tabela_cadastro: "defensas", tabela_necessidade: "necessidades_defensas" },
  { value: "marcas_transversais", label: "Inscrições/Marcas Transversais", tabela_cadastro: "ficha_inscricoes", tabela_necessidade: "necessidades_marcas_transversais" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", tabela_cadastro: "ficha_marcas_longitudinais", tabela_necessidade: "necessidades_marcas_longitudinais" },
  { value: "placas", label: "Placas", tabela_cadastro: "ficha_placa", tabela_necessidade: "necessidades_placas" },
  { value: "porticos", label: "Pórticos", tabela_cadastro: "ficha_porticos", tabela_necessidade: "necessidades_porticos" },
  { value: "tachas", label: "Tachas Refletivas", tabela_cadastro: "ficha_tachas", tabela_necessidade: "necessidades_tachas" },
];

// Tipos que possuem a coluna status_revisao
const TIPOS_COM_STATUS_REVISAO = ['defensas', 'marcas_longitudinais', 'tachas'];

// Tipos que possuem colunas de match para geometria linear
const TIPOS_COM_MATCH_LINEAR = ['marcas_longitudinais', 'marcas_transversais'];

interface LogEntry {
  tipo: "success" | "warning" | "error" | "info";
  mensagem: string;
}

export function RecalcularMatches() {
  const [tipo, setTipo] = useState<string>("");
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);
  const [toleranciasPadrao, setToleranciasPadrao] = useState<Record<string, number>>({});
  const [toleranciasCustomizadas, setToleranciasCustomizadas] = useState<Record<string, number>>({});
  const [forcarReprocessamento, setForcarReprocessamento] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as tolerâncias padrão ao selecionar rodovia
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

  // Resetar customizações ao trocar rodovia
  useEffect(() => {
    setToleranciasCustomizadas({});
  }, [rodoviaId]);

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data } = await supabase.from("lotes").select("*").order("numero");
      return data || [];
    },
  });

  // Buscar rodovias do lote selecionado
  const { data: rodovias } = useQuery({
    queryKey: ["rodovias", loteId],
    queryFn: async () => {
      if (!loteId) return [];
      const { data } = await supabase
        .from("lotes_rodovias")
        .select("rodovia:rodovias(*)")
        .eq("lote_id", loteId);
      return data?.map(lr => lr.rodovia) || [];
    },
    enabled: !!loteId,
  });

  // ============= FUNÇÕES DE MATCHING (REUTILIZADAS) =============

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
    necessidade: { 
      km_inicial: number; 
      km_final: number; 
      lado?: string;
      posicao?: string;
      cor?: string;
      tipo_demarcacao?: string;
      largura_cm?: number;
      local_implantacao?: string;
      corpo?: string;
      refletivo?: string;
      cor_refletivo?: string;
      cor_corpo?: string;
      tipo_refletivo?: string;
      funcao?: string;
      especificacao_obstaculo_fixo?: string;
      nivel_contencao_en1317?: string;
      nivel_contencao_nchrp350?: string;
      geometria?: string;
    },
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
      
      // VALIDAÇÕES ESPECÍFICAS PARA MARCAS LONGITUDINAIS
      if (tipo === 'marcas_longitudinais') {
        // 1. POSIÇÃO deve ser idêntica (BD, BE, E, CE, CD são elementos DIFERENTES)
        if (necessidade.posicao && cad.posicao && necessidade.posicao !== cad.posicao) {
          continue;
        }
        
        // 2. COR deve ser idêntica (Branco ≠ Amarelo)
        if (necessidade.cor && cad.cor && necessidade.cor !== cad.cor) {
          continue;
        }
        
        // 3. TIPO DE DEMARCAÇÃO deve ser compatível (LBO ≠ LFO-3 ≠ LMS-2)
        if (necessidade.tipo_demarcacao && cad.tipo_demarcacao) {
          if (necessidade.tipo_demarcacao !== cad.tipo_demarcacao) {
            continue;
          }
        }
        
        // 4. LARGURA deve ser compatível (tolerância de ±2cm)
        if (necessidade.largura_cm && cad.largura_cm) {
          const diferencaLargura = Math.abs(necessidade.largura_cm - cad.largura_cm);
          if (diferencaLargura > 2) {
            continue;
          }
        }
      }
      
      // VALIDAÇÕES ESPECÍFICAS PARA TACHAS
      if (tipo === 'tachas') {
        // 1. NÃO permite match com cadastros vazios ("Não se Aplica" ou null)
        if (!cad.local_implantacao || 
            cad.local_implantacao === "Não se Aplica" || 
            cad.local_implantacao.trim() === "") {
          continue; // Sempre rejeita cadastros sem implantação definida
        }
        
        // 2. LOCAL_IMPLANTACAO deve ser idêntico
        if (necessidade.local_implantacao && cad.local_implantacao && 
            necessidade.local_implantacao !== cad.local_implantacao) {
          continue;
        }
        
        // 3. CORPO deve ser compatível
        if (necessidade.corpo && cad.corpo && necessidade.corpo !== cad.corpo) {
          continue;
        }
        
        // 4. REFLETIVO deve ser compatível
        if (necessidade.refletivo && cad.refletivo && 
            necessidade.refletivo !== cad.refletivo) {
          continue;
        }
        
        // 5. COR_REFLETIVO deve ser compatível
        if (necessidade.cor_refletivo && cad.cor_refletivo && 
            necessidade.cor_refletivo !== cad.cor_refletivo) {
          continue;
        }
      }
      
      // VALIDAÇÕES ESPECÍFICAS PARA CILINDROS
      if (tipo === 'cilindros') {
        // 1. Rejeitar cadastros sem local_implantacao definido
        if (!cad.local_implantacao || 
            cad.local_implantacao === "Não se Aplica" || 
            cad.local_implantacao.trim() === "") {
          continue;
        }
        
        // 2. LOCAL_IMPLANTACAO deve ser idêntico
        if (necessidade.local_implantacao && cad.local_implantacao && 
            necessidade.local_implantacao !== cad.local_implantacao) {
          continue;
        }
        
        // 3. COR_CORPO deve ser idêntico
        if (necessidade.cor_corpo && cad.cor_corpo && 
            necessidade.cor_corpo !== cad.cor_corpo) {
          continue;
        }
        
        // 4. COR_REFLETIVO deve ser idêntico
        if (necessidade.cor_refletivo && cad.cor_refletivo && 
            necessidade.cor_refletivo !== cad.cor_refletivo) {
          continue;
        }
      }
      
      // VALIDAÇÕES ESPECÍFICAS PARA DEFENSAS
      if (tipo === 'defensas') {
        // 1. Rejeitar cadastros sem função definida
        if (!cad.funcao || cad.funcao === "Não se Aplica" || cad.funcao.trim() === "") {
          continue;
        }
        
        // 2. FUNCAO deve ser idêntica
        if (necessidade.funcao && cad.funcao && necessidade.funcao !== cad.funcao) {
          continue;
        }
        
        // 3. ESPECIFICACAO_OBSTACULO_FIXO deve ser idêntica
        if (necessidade.especificacao_obstaculo_fixo && cad.especificacao_obstaculo_fixo && 
            necessidade.especificacao_obstaculo_fixo !== cad.especificacao_obstaculo_fixo) {
          continue;
        }
        
        // 4. NIVEL_CONTENCAO_EN1317 deve ser compatível
        if (necessidade.nivel_contencao_en1317 && cad.nivel_contencao_en1317 && 
            necessidade.nivel_contencao_en1317 !== cad.nivel_contencao_en1317) {
          continue;
        }
        
        // 5. NIVEL_CONTENCAO_NCHRP350 deve ser compatível
        if (necessidade.nivel_contencao_nchrp350 && cad.nivel_contencao_nchrp350 && 
            necessidade.nivel_contencao_nchrp350 !== cad.nivel_contencao_nchrp350) {
          continue;
        }
        
        // 6. GEOMETRIA deve ser idêntica
        if (necessidade.geometria && cad.geometria && 
            necessidade.geometria !== cad.geometria) {
          continue;
        }
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

  const buscarMatchPontual = (
    necessidade: {
      km?: number;
      tipo?: string;
      codigo?: string;
      lado?: string;
      suporte?: string;
      substrato?: string;
      sigla?: string;
      tipo_inscricao?: string;
      cor?: string;
      area_m2?: number;
      vao_horizontal_m?: number;
      altura_livre_m?: number;
      latitude?: number;
      longitude?: number;
    },
    cadastros: any[],
    tipo: string,
    toleranciaKm: number = 0.05
  ): Array<{ cadastro_id: string; distancia_metros: number; diferenca_km: number }> => {
    const matches: Array<{ cadastro_id: string; distancia_metros: number; diferenca_km: number }> = [];

    for (const cadastro of cadastros) {
      // VALIDAÇÕES ESPECÍFICAS PARA PLACAS
      if (tipo === 'placas') {
        // Rejeitar cadastros com código "Não se Aplica"
        if (!cadastro.codigo || cadastro.codigo === "Não se Aplica" || cadastro.codigo.trim() === "") {
          continue;
        }
        
        // CÓDIGO deve ser idêntico
        if (necessidade.codigo && cadastro.codigo && necessidade.codigo !== cadastro.codigo) {
          continue;
        }
        
        // TIPO deve ser idêntico
        if (necessidade.tipo && cadastro.tipo && necessidade.tipo !== cadastro.tipo) {
          continue;
        }
        
        // LADO deve ser compatível
        if (necessidade.lado && cadastro.lado) {
          const ladoNecNorm = normalizarLado(necessidade.lado);
          const ladoCadNorm = normalizarLado(cadastro.lado);
          if (ladoNecNorm !== ladoCadNorm) {
            continue;
          }
        }
        
        // SUPORTE deve ser idêntico
        if (necessidade.suporte && cadastro.suporte && necessidade.suporte !== cadastro.suporte) {
          continue;
        }
        
        // SUBSTRATO deve ser idêntico
        if (necessidade.substrato && cadastro.substrato && necessidade.substrato !== cadastro.substrato) {
          continue;
        }
      }
      
      // VALIDAÇÕES ESPECÍFICAS PARA INSCRIÇÕES
      if (tipo === 'inscricoes') {
        // 1. Rejeitar cadastros sem sigla definida
        if (!cadastro.sigla || cadastro.sigla.trim() === "") {
          continue;
        }
        
        // 2. SIGLA deve ser idêntica
        if (necessidade.sigla && cadastro.sigla && necessidade.sigla !== cadastro.sigla) {
          continue;
        }
        
        // 3. TIPO_INSCRICAO deve ser idêntico
        if (necessidade.tipo_inscricao && cadastro.tipo_inscricao && 
            necessidade.tipo_inscricao !== cadastro.tipo_inscricao) {
          continue;
        }
        
        // 4. COR deve ser idêntica
        if (necessidade.cor && cadastro.cor && necessidade.cor !== cadastro.cor) {
          continue;
        }
        
        // 5. AREA_M2 deve ter ±10% de tolerância
        if (necessidade.area_m2 && cadastro.area_m2) {
          const tolerancia = necessidade.area_m2 * 0.10;
          if (Math.abs(necessidade.area_m2 - cadastro.area_m2) > tolerancia) {
            continue;
          }
        }
      }
      
      // VALIDAÇÕES ESPECÍFICAS PARA PÓRTICOS
      if (tipo === 'porticos') {
        // 1. Rejeitar cadastros com tipo "Não se Aplica"
        if (!cadastro.tipo || cadastro.tipo === "Não se Aplica" || cadastro.tipo.trim() === "") {
          continue;
        }
        
        // 2. TIPO deve ser idêntico
        if (necessidade.tipo && cadastro.tipo && necessidade.tipo !== cadastro.tipo) {
          continue;
        }
        
        // 3. LADO deve ser compatível
        if (necessidade.lado && cadastro.lado) {
          const ladoNecNorm = normalizarLado(necessidade.lado);
          const ladoCadNorm = normalizarLado(cadastro.lado);
          if (ladoNecNorm !== ladoCadNorm) {
            continue;
          }
        }
        
        // 4. VAO_HORIZONTAL_M com ±10% de tolerância
        if (necessidade.vao_horizontal_m && cadastro.vao_horizontal_m) {
          const tolerancia = necessidade.vao_horizontal_m * 0.10;
          if (Math.abs(necessidade.vao_horizontal_m - cadastro.vao_horizontal_m) > tolerancia) {
            continue;
          }
        }
        
        // 5. ALTURA_LIVRE_M com ±10% de tolerância
        if (necessidade.altura_livre_m && cadastro.altura_livre_m) {
          const tolerancia = necessidade.altura_livre_m * 0.10;
          if (Math.abs(necessidade.altura_livre_m - cadastro.altura_livre_m) > tolerancia) {
            continue;
          }
        }
      }
      
      // 1. Validar lado (se aplicável e não já validado acima)
      if (!tipo || (tipo !== 'placas' && tipo !== 'porticos')) {
        if (necessidade.lado && cadastro.lado) {
          const ladoNec = normalizarLado(necessidade.lado);
          const ladoCad = normalizarLado(cadastro.lado);
          if (ladoNec !== ladoCad && ladoNec !== 'ambos' && ladoCad !== 'ambos') {
            continue;
          }
        }
      }

      // 2. Calcular diferença de km
      const km = necessidade.km || 0;
      const diferencaKm = Math.abs(cadastro.km - km);
      if (diferencaKm > toleranciaKm) continue;

      // 3. Calcular distância GPS (se disponível)
      let distanciaMetros = null;
      if (necessidade.latitude && necessidade.longitude && 
          cadastro.latitude && cadastro.longitude) {
        distanciaMetros = calcularDistanciaHaversine(
          necessidade.latitude,
          necessidade.longitude,
          cadastro.latitude,
          cadastro.longitude
        );
      }

      matches.push({
        cadastro_id: cadastro.id,
        distancia_metros: distanciaMetros || diferencaKm * 1000,
        diferenca_km: diferencaKm,
      });
    }

    return matches.sort((a, b) => a.distancia_metros - b.distancia_metros);
  };

  const calcularDistanciaHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // ============= PROCESSO DE RECÁLCULO =============

  const handleRecalcular = async () => {
    if (!tipo || !loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione o tipo, lote e rodovia antes de continuar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    setProgress(0);
    setProgressInfo(null);

    try {
      const tipoConfig = TIPOS_ELEMENTOS.find(t => t.value === tipo);
      if (!tipoConfig) throw new Error("Tipo inválido");

      const { tabela_cadastro, tabela_necessidade } = tipoConfig;

      // 1. Buscar necessidades
      setLogs(prev => [...prev, {
        tipo: "info",
        mensagem: `🔍 Buscando necessidades de ${tipoConfig.label}...`
      }]);

      let query = supabase
        .from(tabela_necessidade as any)
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      // Se não forçar reprocessamento, excluir registros já reconciliados
      if (!forcarReprocessamento) {
        query = query.or("reconciliado.is.null,reconciliado.eq.false");
      }

      const { data: necessidadesData, error: errNec } = await query;

      if (errNec) throw errNec;
      
      const necessidades: any[] = necessidadesData || [];

      if (!necessidades || necessidades.length === 0) {
        toast({
          title: "Nenhuma necessidade encontrada",
          description: "Não há necessidades para recalcular nesta rodovia",
        });
        setIsProcessing(false);
        return;
      }

      setLogs(prev => [...prev, {
        tipo: "success",
        mensagem: `✅ ${necessidades.length} necessidades encontradas`
      }]);

      // 2. Buscar cadastros
      setLogs(prev => [...prev, {
        tipo: "info",
        mensagem: `🔍 Buscando cadastro de ${tipoConfig.label}...`
      }]);

      const { data: cadastrosData, error: errCad } = await supabase
        .from(tabela_cadastro as any)
        .select("*")
        .eq("rodovia_id", rodoviaId);

      if (errCad) throw errCad;
      
      const cadastros: any[] = cadastrosData || [];

      setLogs(prev => [...prev, {
        tipo: "success",
        mensagem: `✅ ${cadastros.length} itens no cadastro`
      }]);

      // 3. Buscar todas as tolerâncias específicas da rodovia
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
      
      // Mapear tipo de elemento → coluna específica de tolerância
      const toleranciaMap: Record<string, string> = {
        'placas': 'tolerancia_placas_metros',
        'porticos': 'tolerancia_porticos_metros',
        'defensas': 'tolerancia_defensas_metros',
        'marcas_longitudinais': 'tolerancia_marcas_metros',
        'cilindros': 'tolerancia_cilindros_metros',
        'tachas': 'tolerancia_tachas_metros',
        'marcas_transversais': 'tolerancia_inscricoes_metros'
      };

      // Selecionar tolerância: específica > genérica > padrão 50m
      const colunaEspecifica = toleranciaMap[tipo];
      const toleranciaPadraoRodovia = 
        (rodoviaData && colunaEspecifica ? rodoviaData[colunaEspecifica as keyof typeof rodoviaData] as number : null) ||
        rodoviaData?.tolerancia_match_metros || 
        50;

      // USAR A CUSTOMIZADA SE EXISTIR, SENÃO USA O PADRÃO
      const toleranciaFinal = toleranciasCustomizadas[tipo] ?? toleranciasPadrao[tipo] ?? 50;

      setLogs(prev => [...prev, {
        tipo: "info",
        mensagem: `📍 Tolerância GPS: ${toleranciaFinal}m ${toleranciasCustomizadas[tipo] ? '(customizada)' : '(padrão)'} para ${tipoConfig.label}`
      }]);

      // 4. Processar cada necessidade
      const total = necessidades.length;
      let matchesEncontrados = 0;
      let divergenciasDetectadas = 0;
      let elementosNovos = 0;
      let erros = 0;

      setProgressInfo({ current: 0, total });

      for (let i = 0; i < necessidades.length; i++) {
        const nec: any = necessidades[i];
        setProgressInfo({ current: i + 1, total });
        setProgress(((i + 1) / total) * 100);

        try {
          // Se não forçar reprocessamento E já está reconciliado, PULAR
          if (!forcarReprocessamento && nec.reconciliado) {
            continue;
          }
          // Determinar tipo de geometria baseado no tipo de elemento
          const tipoElementoMap: Record<string, 'linear' | 'pontual'> = {
            'marcas_longitudinais': 'linear',
            'defensas': 'linear',
            'placas': 'pontual',
            'porticos': 'pontual',
            'inscricoes': 'pontual',
            'cilindros': 'linear',
            'tachas': 'linear'
          };

          const tipoRecorrenteMap: Record<string, boolean> = {
            'marcas_longitudinais': true,
            'inscricoes': true,
            'defensas': false,
            'placas': false,
            'porticos': false,
            'cilindros': true,
            'tachas': true
          };

          const tipoGeometria = tipoElementoMap[tipo] || 'linear';
          const isRecorrente = tipoRecorrenteMap[tipo] || false;

          let matches: any[] = [];
          let cadastro_id = null;
          let distancia_match_metros = null;
          let overlap_porcentagem = null;
          let tipo_match = null;
          let servico_inferido = "Implantar";

          // MATCHING DIFERENCIADO POR GEOMETRIA
          if (tipoGeometria === 'linear') {
            // ELEMENTOS LINEARES
            matches = buscarMatchSegmento(
              {
                km_inicial: parseFloat(nec.km_inicial),
                km_final: parseFloat(nec.km_final),
                lado: nec.lado,
                posicao: nec.posicao,
                cor: nec.cor,
                tipo_demarcacao: nec.tipo_demarcacao,
                largura_cm: nec.largura_cm ? parseFloat(nec.largura_cm) : undefined,
                local_implantacao: nec.local_implantacao,
                corpo: nec.corpo,
                refletivo: nec.refletivo,
                cor_refletivo: nec.cor_refletivo,
                cor_corpo: nec.cor_corpo,
                tipo_refletivo: nec.tipo_refletivo,
                funcao: nec.funcao,
                especificacao_obstaculo_fixo: nec.especificacao_obstaculo_fixo,
                nivel_contencao_en1317: nec.nivel_contencao_en1317,
                nivel_contencao_nchrp350: nec.nivel_contencao_nchrp350,
                geometria: nec.geometria
              },
              cadastros,
              tipo,
              50
            );

            if (matches.length > 0) {
              const melhorMatch = matches[0];
              cadastro_id = melhorMatch.cadastro_id;
              overlap_porcentagem = melhorMatch.overlap_porcentagem;
              tipo_match = melhorMatch.tipo_match;
              matchesEncontrados++;

              const cadastro = cadastros.find((c: any) => c.id === cadastro_id);
              if (cadastro && nec.latitude_inicial && nec.longitude_inicial && 
                  cadastro.latitude_inicial && cadastro.longitude_inicial) {
                distancia_match_metros = Math.round(
                  calcularDistanciaHaversine(
                    parseFloat(nec.latitude_inicial),
                    parseFloat(nec.longitude_inicial),
                    parseFloat(cadastro.latitude_inicial),
                    parseFloat(cadastro.longitude_inicial)
                  )
                );
              }
            }
          } else if (tipoGeometria === 'pontual') {
            // ELEMENTOS PONTUAIS
            matches = buscarMatchPontual(
              {
                km: parseFloat(nec.km_inicial || nec.km),
                latitude: nec.latitude_inicial || nec.latitude,
                longitude: nec.longitude_inicial || nec.longitude,
                lado: nec.lado,
                tipo: nec.tipo,
                codigo: nec.codigo,
                suporte: nec.suporte,
                substrato: nec.substrato,
                sigla: nec.sigla,
                tipo_inscricao: nec.tipo_inscricao,
                cor: nec.cor,
                area_m2: nec.area_m2 ? parseFloat(nec.area_m2) : undefined,
                vao_horizontal_m: nec.vao_horizontal_m ? parseFloat(nec.vao_horizontal_m) : undefined,
                altura_livre_m: nec.altura_livre_m ? parseFloat(nec.altura_livre_m) : undefined
              },
              cadastros,
              tipo,
              0.05
            );

            if (matches.length > 0) {
              const melhorMatch = matches[0];
              cadastro_id = melhorMatch.cadastro_id;
              distancia_match_metros = melhorMatch.distancia_metros;
              tipo_match = 'pontual';
              matchesEncontrados++;
            }
          }

          // INFERIR SERVIÇO
          if (cadastro_id) {
            const sinaisRemocao = [
              nec.quantidade === 0 || nec.quantidade === "0",
              nec.extensao_metros === 0 || nec.extensao_metros === "0",
              nec.solucao_planilha?.toLowerCase().includes("remov"),
            ];
            servico_inferido = sinaisRemocao.some(Boolean) ? "Remover" : "Substituir";
          } else {
            elementosNovos++;
            servico_inferido = "Implantar";
          }

          // Normalizar solucao_planilha
          const normalizarServico = (s: string | null): string => {
            if (!s) return "";
            const sLower = s.toLowerCase().trim();
            if (sLower.includes("implant") || sLower.includes("instal")) return "Implantar";
            if (sLower.includes("substit") || sLower.includes("troca")) return "Substituir";
            if (sLower.includes("remov") || sLower.includes("desativ") || sLower.includes("retirar")) return "Remover";
            if (sLower.includes("manter") || sLower.includes("manutenção")) return "Manter";
            return s;
          };

          const solucaoPlanilhaNormalizada = normalizarServico(nec.solucao_planilha);

          // LÓGICA DE RECORRÊNCIA
          let servicoFinal: string;
          let divergencia: boolean;

          if (isRecorrente) {
            // ELEMENTOS RECORRENTES (Marcas, Inscrições)
            if (cadastro_id) {
              servicoFinal = "Substituir";
              divergencia = false;
            } else {
              servicoFinal = "Implantar";
              divergencia = false;
            }
            if (solucaoPlanilhaNormalizada) {
              servicoFinal = solucaoPlanilhaNormalizada;
              divergencia = (solucaoPlanilhaNormalizada !== servico_inferido);
            }
          } else {
            // ELEMENTOS NÃO-RECORRENTES (Placas, Defensas, etc)
            if (cadastro_id) {
              servicoFinal = servico_inferido;
              divergencia = true; // Match encontrado = sempre reconciliar
            } else {
              servicoFinal = "Implantar";
              divergencia = false; // Sem match + Implantar = não precisa reconciliar
            }
            
            // Se projeto especificou um serviço diferente da inferência:
            if (solucaoPlanilhaNormalizada && solucaoPlanilhaNormalizada !== servico_inferido) {
              servicoFinal = solucaoPlanilhaNormalizada;
              divergencia = true; // Projeto ≠ Inferência = reconciliar
            } else if (solucaoPlanilhaNormalizada) {
              // Projeto = Inferência, mas usar serviço do projeto
              servicoFinal = solucaoPlanilhaNormalizada;
              // NÃO sobrescrever divergencia aqui se já for true (match existe)
            }
          }

          if (divergencia) {
            divergenciasDetectadas++;
          }

          // Preparar dados de atualização
          const updateData: any = {
            servico_inferido,
            servico_final: servicoFinal,
            servico: servicoFinal,
            divergencia
          };

          // Só resetar reconciliado se forçar reprocessamento
          if (forcarReprocessamento) {
            updateData.reconciliado = false;
          }

          // Adicionar status_revisao apenas para tipos que têm essa coluna
          if (TIPOS_COM_STATUS_REVISAO.includes(tipo)) {
            updateData.status_revisao = 'ok';
          }

          if (cadastro_id !== null) updateData.cadastro_id = cadastro_id;
          if (distancia_match_metros !== null) updateData.distancia_match_metros = distancia_match_metros;
          
          // Adicionar colunas de match linear apenas para tipos que as possuem
          if (TIPOS_COM_MATCH_LINEAR.includes(tipo)) {
            if (overlap_porcentagem !== null) updateData.overlap_porcentagem = overlap_porcentagem;
            if (tipo_match !== null) updateData.tipo_match = tipo_match;
          }

          // Atualizar necessidade
          const { error: updateError } = await supabase
            .from(tabela_necessidade as any)
            .update(updateData)
            .eq("id", nec.id);

          if (updateError) throw updateError;

        } catch (error: any) {
          erros++;
          setLogs(prev => [...prev, {
            tipo: "error",
            mensagem: `❌ Erro ao processar item ${nec.id}: ${error.message}`
          }]);
        }
      }

      // Resumo final
      setLogs(prev => [...prev, 
        { tipo: "success", mensagem: `\n🎉 RECÁLCULO CONCLUÍDO!` },
        { tipo: "info", mensagem: `📊 Total processado: ${total}` },
        { tipo: "success", mensagem: `✅ Matches encontrados: ${matchesEncontrados}` },
        { tipo: "warning", mensagem: `⚠️ Divergências detectadas: ${divergenciasDetectadas}` },
        { tipo: "info", mensagem: `🆕 Elementos novos (sem match): ${elementosNovos}` },
        ...(erros > 0 ? [{ tipo: "error" as const, mensagem: `❌ Erros: ${erros}` }] : [])
      ]);

      toast({
        title: "Recálculo Concluído",
        description: `${matchesEncontrados} matches encontrados, ${divergenciasDetectadas} divergências detectadas`,
      });

      // Invalidar cache para atualizar viewers automaticamente
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('necessidades-match') || 
                 key?.includes('inventario-') ||
                 key === 'necessidades';
        }
      });

      // Limpar tolerâncias customizadas após alguns segundos
      setTimeout(() => {
        setToleranciasCustomizadas({});
      }, 2000);

    } catch (error: any) {
      console.error("Erro no recálculo:", error);
      setLogs(prev => [...prev, {
        tipo: "error",
        mensagem: `❌ Erro fatal: ${error.message}`
      }]);
      toast({
        title: "Erro no Recálculo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgressInfo(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Recalcular Matches (Inventário ↔ Projeto)
        </CardTitle>
        <CardDescription>
          Recalcula os vínculos entre cadastro e projeto para elementos lineares, atualizando divergências e matches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Lote *</Label>
            <Select value={loteId} onValueChange={(value) => {
              setLoteId(value);
              setRodoviaId(""); // Limpar rodovia ao mudar lote
            }} disabled={isProcessing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes?.map(lote => (
                  <SelectItem key={lote.id} value={lote.id}>
                    Lote {lote.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rodovia *</Label>
            <Select value={rodoviaId} onValueChange={setRodoviaId} disabled={isProcessing || !loteId}>
              <SelectTrigger>
                <SelectValue placeholder={!loteId ? "Selecione primeiro o lote" : "Selecione a rodovia"} />
              </SelectTrigger>
              <SelectContent>
                {rodovias?.map((rodovia: any) => (
                  <SelectItem key={rodovia.id} value={rodovia.id}>
                    {rodovia.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Elemento *</Label>
            <Select value={tipo} onValueChange={setTipo} disabled={isProcessing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ELEMENTOS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Tolerâncias GPS */}
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
            
            <div className="grid gap-2">
              {TIPOS_ELEMENTOS.map((elemento) => (
                <div key={elemento.value} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-3 bg-background rounded border">
                  <div className="font-medium text-sm">
                    {elemento.label}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Padrão:</span>
                    <Badge variant="outline">
                      {toleranciasPadrao[elemento.value]}m
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={10}
                      max={500}
                      placeholder={`${toleranciasPadrao[elemento.value]}m`}
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
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">metros</span>
                    {toleranciasCustomizadas[elemento.value] && (
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
                        className="h-8"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                💡 Valores customizados aplicam-se apenas a esta execução. Para alterar permanentemente, edite a rodovia.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Checkbox de Forçar Reprocessamento */}
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
          onClick={handleRecalcular}
          disabled={!tipo || !loteId || !rodoviaId || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Recalculando... {progressInfo && `(${progressInfo.current}/${progressInfo.total})`}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalcular Matches
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
