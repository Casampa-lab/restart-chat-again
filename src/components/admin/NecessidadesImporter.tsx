import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, XCircle, AlertCircle, Loader2, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";

const TIPOS_NECESSIDADES = [
  { value: "cilindros", label: "Cilindros Delimitadores" },
  { value: "defensas", label: "Defensas" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "porticos", label: "Pórticos" },
  { value: "placas", label: "Placas de Sinalização Vertical" },
  { value: "tachas", label: "Tachas Refletivas" },
  { value: "marcas_transversais", label: "Zebrados (Marcas Transversais)" },
];

interface LogEntry {
  tipo: "success" | "warning" | "error";
  linha: number;
  mensagem: string;
}

export function NecessidadesImporter() {
  const [tipo, setTipo] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();
  const cancelImportRef = useRef(false);

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

  // Função para converter coordenadas com vírgula para ponto
  const converterCoordenada = (valor: any): number | null => {
    if (!valor) return null;
    
    // Se já é número, retorna
    if (typeof valor === "number") return valor;
    
    // Se é string, substitui vírgula por ponto e converte
    if (typeof valor === "string") {
      const valorLimpo = valor.trim().replace(",", ".");
      const numero = parseFloat(valorLimpo);
      return isNaN(numero) ? null : numero;
    }
    
    return null;
  };

  /**
   * Sanitiza valores numéricos, convertendo textos como "Não se aplica" para NULL
   */
  const sanitizarNumerico = (valor: any): number | null => {
    // Se já é null/undefined, retorna null
    if (valor === null || valor === undefined) return null;
    
    // Se já é número, retorna
    if (typeof valor === "number") return isNaN(valor) ? null : valor;
    
    // Se é string, verificar se é valor descartável
    if (typeof valor === "string") {
      const valorLimpo = valor.trim().toLowerCase();
      
      // Lista de valores que devem ser convertidos para NULL
      const valoresInvalidos = [
        "não se aplica",
        "nao se aplica",
        "n/a",
        "na",
        "-",
        "",
        "null",
        "indefinido",
        "sem informação",
        "sem informacao"
      ];
      
      if (valoresInvalidos.includes(valorLimpo)) {
        return null;
      }
      
      // Tentar converter para número
      const valorNumerico = valorLimpo.replace(",", ".");
      const numero = parseFloat(valorNumerico);
      return isNaN(numero) ? null : numero;
    }
    
    return null;
  };

  /**
   * Sanitiza valores TEXT, convertendo valores descartáveis para NULL,
   * MAS MANTENDO "-" como valor válido (usado em campos como "motivo")
   */
  const sanitizarTexto = (valor: any): string | null => {
    // Se já é null/undefined, retorna null
    if (valor === null || valor === undefined) return null;
    
    // Converter para string se não for
    const valorStr = String(valor).trim();
    
    // Lista de valores que devem ser convertidos para NULL
    // NOTA: "-" NÃO está nesta lista, pois é um valor válido para campos como "motivo"
    const valoresInvalidos = [
      "",
      "não se aplica",
      "nao se aplica",
      "n/a",
      "na",
      "null",
      "indefinido",
      "sem informação",
      "sem informacao"
    ];
    
    if (valoresInvalidos.includes(valorStr.toLowerCase())) {
      return null;
    }
    
    // Retornar o valor como string
    return valorStr;
  };

  const identificarServico = (row: any, match: any): string => {
    // SEM match = nova instalação
    if (!match) {
      return "Implantar";
    }

    // COM match - verificar sinais de remoção
    const sinaisRemocao = [
      row.quantidade === 0 || row.quantidade === "0",
      row.extensao_metros === 0 || row.extensao_metros === "0",
      row.acao?.toLowerCase().includes("remov"),
      row.acao?.toLowerCase().includes("desativ"),
    ];

    if (sinaisRemocao.some(Boolean)) {
      return "Remover";
    }

    // Caso contrário = substituição
    return "Substituir";
  };

  // ============= FUNÇÕES DE MATCH POR SOBREPOSIÇÃO (ELEMENTOS LINEARES) =============

  /**
   * Calcula sobreposição entre dois segmentos em KM
   * Retorna overlap absoluto (km) e porcentagem relativa à necessidade
   */
  const calcularSobreposicaoKm = (
    nec_km_ini: number, 
    nec_km_fim: number,
    cad_km_ini: number, 
    cad_km_fim: number
  ): { overlap_km: number; porcentagem: number } => {
    const inicio = Math.max(nec_km_ini, cad_km_ini);
    const fim = Math.min(nec_km_fim, cad_km_fim);
    
    // Sem sobreposição
    if (inicio >= fim) {
      return { overlap_km: 0, porcentagem: 0 };
    }
    
    const overlap_km = fim - inicio;
    const tamanho_necessidade = nec_km_fim - nec_km_ini;
    
    // Evitar divisão por zero
    const porcentagem = tamanho_necessidade > 0 
      ? (overlap_km / tamanho_necessidade) * 100 
      : 0;
    
    return { 
      overlap_km: Math.round(overlap_km * 1000) / 1000, // 3 decimais
      porcentagem: Math.round(porcentagem * 10) / 10 // 1 decimal
    };
  };

  /**
   * Normaliza valores de "lado" para comparação
   */
  const normalizarLado = (lado: string): string => {
    if (!lado) return "";
    const l = lado.toLowerCase().trim();
    if (l.includes("esq") || l === "e") return "esquerdo";
    if (l.includes("dir") || l === "d") return "direito";
    if (l.includes("eix") || l === "c" || l === "central") return "eixo";
    if (l.includes("amb") || l === "ambos") return "ambos";
    return lado;
  };

  /**
   * Define se o lado deve ser validado de forma estrita por tipo
   * Marcas e Defensas: lado CRÍTICO
   * Tachas: mais flexível (permite matches cross-lado em alguns casos)
   */
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
    if (!tipoConfig || !tipoConfig.validar) return true; // Não validar
    
    const ladoNecNorm = normalizarLado(ladoNec);
    const ladoCadNorm = normalizarLado(ladoCad);
    
    // Se algum não tem lado, aceitar
    if (!ladoNecNorm || !ladoCadNorm) return true;
    
    // Validação estrita
    if (tipoConfig.estrito) {
      return ladoNecNorm === ladoCadNorm;
    }
    
    // Validação flexível (tachas)
    // Aceitar "ambos" ou match exato
    return ladoNecNorm === ladoCadNorm || 
           ladoNecNorm === "ambos" || 
           ladoCadNorm === "ambos";
  };

  /**
   * Busca matches para elementos lineares baseado em sobreposição de segmento
   * Retorna array de matches ordenados por maior sobreposição
   */
  const buscarMatchSegmento = (
    necessidade: { 
      km_inicial: number; 
      km_final: number; 
      lado?: string 
    },
    cadastros: any[],
    tipo: string,
    thresholdOverlap: number = 50 // % mínimo de sobreposição
  ): Array<{
    cadastro_id: string;
    overlap_porcentagem: number;
    overlap_km: number;
    tipo_match: string;
  }> => {
    
    const matches = [];
    
    for (const cad of cadastros) {
      // Validar lado (se aplicável ao tipo)
      const ladoValido = validarLadoPorTipo(tipo, necessidade.lado || "", cad.lado || "");
      if (!ladoValido) {
        continue;
      }
      
      // Calcular sobreposição
      const { overlap_km, porcentagem } = calcularSobreposicaoKm(
        necessidade.km_inicial,
        necessidade.km_final,
        cad.km_inicial,
        cad.km_final
      );
      
      // Se overlap >= threshold, considerar match
      if (porcentagem >= thresholdOverlap) {
        let tipo_match = '';
        
        if (porcentagem >= 95) {
          tipo_match = 'exato'; // Praticamente idêntico
        } else if (porcentagem >= 75) {
          tipo_match = 'alto'; // Grande sobreposição
        } else {
          tipo_match = 'parcial'; // Sobreposição parcial (50-75%)
        }
        
        matches.push({
          cadastro_id: cad.id,
          overlap_porcentagem: porcentagem,
          overlap_km,
          tipo_match
        });
      }
    }
    
    // Ordenar por maior sobreposição primeiro
    return matches.sort((a, b) => b.overlap_porcentagem - a.overlap_porcentagem);
  };

  /**
   * Identifica o tipo de serviço (Implantar/Substituir/Remover) baseado em matches
   * Considera também sinais na planilha (quantidade=0, solucao=remover, etc)
   */
  const identificarServicoSegmento = (
    dados: any, 
    matches: any[]
  ): { 
    servico: string; 
    match_usado?: any;
    motivo_revisao?: string;
  } => {
    
    // SEM match = nova instalação
    if (!matches || matches.length === 0) {
      return { 
        servico: "Implantar"
      };
    }
    
    // COM match - usar o melhor match (maior sobreposição)
    const melhorMatch = matches[0];
    
    // Verificar sinais de remoção na planilha
    const sinaisRemocao = [
      dados.quantidade === 0 || dados.quantidade === "0",
      dados.extensao_metros === 0 || dados.extensao_metros === "0",
      dados.solucao_planilha?.toLowerCase().includes("remov"),
      dados.solucao_planilha?.toLowerCase().includes("desativ")
    ];
    
    if (sinaisRemocao.some(Boolean)) {
      return { 
        servico: "Remover", 
        match_usado: melhorMatch
      };
    }
    
    // Match parcial (<75%) = PENDENTE REVISÃO
    if (melhorMatch.overlap_porcentagem < 75) {
      return {
        servico: "Substituir",
        match_usado: melhorMatch,
        motivo_revisao: `Sobreposição parcial (${melhorMatch.overlap_porcentagem}%) - requer revisão manual`
      };
    }
    
    // Match exato/alto (≥75%) = Substituir automático
    return { 
      servico: "Substituir", 
      match_usado: melhorMatch
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setLogs([]);
      setProgress(0);
    }
  };

  const mapearColunas = (row: any, tipo: string) => {
    // Para placas, não usar campos do baseMap (não tem inicial/final)
    if (tipo === "placas") {
      return {
        km: row["Km"] || row["KM"] || row["km"],
        latitude: converterCoordenada(row["Latitude"] || row["latitude"]),
        longitude: converterCoordenada(row["Longitude"] || row["longitude"]),
        codigo: row["Código da Placa"] || row["Código da placa"] || row["Codigo da Placa"] || row["Codigo da placa"] || row["Código"] || row["Codigo"] || row["codigo"],
        tipo: row["Tipo de Placa"] || row["Tipo de placa"] || row["Tipo da Placa"] || row["Tipo da placa"] || row["Tipo Placa"] || row["Tipo"] || row["tipo"],
        lado: row["Lado"] || row["lado"],
        dimensoes_mm: row["Dimensões (mm)"] || row["dimensoes_mm"],
        substrato: row["Tipo de Substrato"] || row["Substrato"] || row["substrato"],
        suporte: row["Tipo de Suporte"] || row["Suporte"] || row["suporte"],
        snv: row["SNV"] || row["snv"],
        observacao: row["Observação"] || row["Observacao"] || row["observacao"],
        solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
      };
    }

    // Mapeamento básico para outros tipos (com inicial/final)
    const baseMap: any = {
      km_inicial: row["Km Inicial"] || row["KM Inicial"] || row["km inicial"] || row["km_inicial"],
      km_final: row["Km Final"] || row["KM Final"] || row["km final"] || row["km_final"],
      latitude_inicial: converterCoordenada(row["Latitude Inicial"] || row["Lat Inicial"] || row["Latitude inicial"] || row["latitude_inicial"]),
      longitude_inicial: converterCoordenada(row["Longitude Inicial"] || row["Long Inicial"] || row["Longitude inicial"] || row["longitude_inicial"]),
      latitude_final: converterCoordenada(row["Latitude Final"] || row["Lat Final"] || row["Latitude final"] || row["latitude_final"]),
      longitude_final: converterCoordenada(row["Longitude Final"] || row["Long Final"] || row["Longitude final"] || row["longitude_final"]),
      observacao: row["Observação"] || row["Observacao"] || row["observacao"],
      snv: row["SNV"] || row["snv"],
      solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
    };

    // Campos específicos por tipo
    switch (tipo) {
      case "marcas_longitudinais":
        return {
          ...baseMap,
          codigo: row["Código"] || row["codigo"],
          posicao: row["Posição"] || row["Posicao"] || row["posicao"] || row["Código"] || row["codigo"],
          tipo_demarcacao: row["Código"] || row["codigo"],
          largura_cm: (() => {
            const valor = sanitizarNumerico(row["Largura da Faixa (m)"] || row["largura_cm"]);
            return valor !== null ? valor * 100 : null;
          })(),
          material: row["Material"] || row["material"],
          espessura_cm: (() => {
            const valor = sanitizarNumerico(row["Espessura (mm)"] || row["espessura_cm"]);
            return valor !== null ? valor / 10 : null;
          })(),
          extensao_metros: (() => {
            const valor = sanitizarNumerico(row["Extensão (km)"] || row["extensao_metros"]);
            return valor !== null ? valor * 1000 : null;
          })(),
          traco_m: sanitizarNumerico(row["Traço (m)"] || row["traco_m"]),
          espacamento_m: sanitizarNumerico(row["Espaçamento (m)"] || row["espacamento_m"]),
          area_m2: sanitizarNumerico(row["Área (m²)"] || row["area_m2"]),
        };

      case "tachas":
        return {
          ...baseMap,
          quantidade: sanitizarNumerico(row["Quantidade"] || row["quantidade"]),
          corpo: row["Corpo"] || row["corpo"],
          refletivo: row["Refletivo"] || row["refletivo"],
          cor_refletivo: row["Cor do refletivo"] || row["Cor Refletivo"] || row["cor_refletivo"],
          espacamento_m: sanitizarNumerico(row["Espaçamento"] || row["espacamento_m"]),
          extensao_km: sanitizarNumerico(row["Extensão (km)"] || row["extensao_km"]),
          local_implantacao: row["Local de implantação"] || row["Local Implantação"] || row["local_implantacao"],
          descricao: row["Descrição"] || row["descricao"],
        };

      case "cilindros":
        const solucao = (row["Solução"] || row["Solucao"] || row["solucao"] || "").toLowerCase();
        let motivo = row["Motivo"] || row["motivo"] || "-";
        
        // Aplicar regras do campo Motivo
        if (solucao.includes("remov") || solucao.includes("substitu")) {
          // Para Remover ou Substituir, motivo deve ser 1, 2, 3 ou 4
          // Se não for um desses valores, manter o que está na planilha
          if (motivo !== "1" && motivo !== "2" && motivo !== "3" && motivo !== "4") {
            // Se tem motivo mas não é válido, usar "-"
            motivo = motivo && motivo !== "-" ? motivo : "-";
          }
        } else {
          // Para outras soluções, usar "-"
          motivo = "-";
        }
        
        return {
          ...baseMap,
          cor_corpo: row["Cor (Corpo)"] || row["Cor Corpo"] || row["cor_corpo"],
          cor_refletivo: row["Cor (Refletivo)"] || row["Cor Refletivo"] || row["cor_refletivo"],
          tipo_refletivo: row["Tipo Refletivo"] || row["tipo_refletivo"],
          extensao_km: sanitizarNumerico(row["Extensão (km)"] || row["extensao_km"]),
          local_implantacao: row["Local de Implantação"] || row["Local Implantação"] || row["local_implantacao"],
          espacamento_m: sanitizarNumerico(row["Espaçamento"] || row["espacamento_m"]),
          quantidade: sanitizarNumerico(row["Quantidade"] || row["quantidade"]),
          motivo: sanitizarTexto(motivo),
        };

      case "marcas_transversais":
        return {
          ...baseMap,
          sigla: row["Sigla"] || row["sigla"],
          descricao: row["Descrição"] || row["Descricao"] || row["descricao"],
          tipo_inscricao: row["Sigla"] || row["sigla"],
          cor: row["Cor"] || row["cor"],
          km: sanitizarNumerico(row["Km"] || row["KM"] || row["km"]),
          latitude: converterCoordenada(row["Latitude"] || row["latitude"]),
          longitude: converterCoordenada(row["Longitude"] || row["longitude"]),
          material_utilizado: row["Material"] || row["material"],
          espessura_mm: sanitizarNumerico(row["Espessura (mm)"] || row["Espessura"] || row["espessura_mm"]),
          area_m2: sanitizarNumerico(row["Área (m²)"] || row["Área"] || row["area_m2"]),
        };

      case "porticos":
        const solucaoPortico = (row["Solução"] || row["Solucao"] || row["solucao"] || "").toLowerCase();
        let motivoPortico = row["Motivo"] || row["motivo"] || "-";
        
        // Aplicar regras do campo Motivo para pórticos
        if (solucaoPortico.includes("remov") || solucaoPortico.includes("substitu")) {
          // Para Remover ou Substituir, motivo deve ser 1, 2 ou 3
          if (motivoPortico !== "1" && motivoPortico !== "2" && motivoPortico !== "3") {
            motivoPortico = "-";
          }
        } else {
          // Para outras soluções, usar "-"
          motivoPortico = "-";
        }
        
        return {
          km: sanitizarNumerico(row["Km"] || row["KM"] || row["km"]),
          latitude: converterCoordenada(row["Latitude"] || row["latitude"]),
          longitude: converterCoordenada(row["Longitude"] || row["longitude"]),
          tipo: row["Tipo"] || row["tipo"],
          lado: row["Lado"] || row["lado"],
          altura_livre_m: sanitizarNumerico(row["Altura Livre (m)"] || row["Altura Livre"] || row["altura_livre_m"]),
          vao_horizontal_m: sanitizarNumerico(row["Vão Horizontal"] || row["Vao Horizontal"] || row["vao_horizontal_m"]),
          observacao: row["Observação"] || row["Observacao"] || row["observacao"],
          snv: row["SNV"] || row["snv"],
          solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
          motivo: sanitizarTexto(motivoPortico),
        };

      case "defensas":
        const solucaoDefensa = (row["Solução"] || row["Solucao"] || row["solucao"] || "").toLowerCase();
        let motivoDefensa = row["Motivo"] || row["motivo"] || "-";
        
        // Aplicar regras do campo Motivo para defensas
        if (solucaoDefensa.includes("remov") || solucaoDefensa.includes("substitu")) {
          // Para Remover ou Substituir, motivo deve ser 1, 2, 3 ou 4
          if (motivoDefensa !== "1" && motivoDefensa !== "2" && motivoDefensa !== "3" && motivoDefensa !== "4") {
            motivoDefensa = "-";
          }
        } else {
          // Para outras soluções, usar "-"
          motivoDefensa = "-";
        }
        
        return {
          ...baseMap,
          tramo: row["Tramo"] || row["tramo"],
          lado: row["Lado"] || row["lado"],
          quantidade_laminas: sanitizarNumerico(row["Quantidade lâminas"] || row["Quantidade laminas"] || row["quantidade_laminas"]),
          comprimento_total_tramo_m: sanitizarNumerico(row["Comprimento Total do Tramo (m)"] || row["Comprimento Total"] || row["comprimento_total_tramo_m"]),
          funcao: row["Função"] || row["Funcao"] || row["funcao"],
          especificacao_obstaculo_fixo: row["Especificação do obstáculo fixo"] || row["Especificacao obstaculo fixo"] || row["especificacao_obstaculo_fixo"],
          id_defensa: row["ID"] || row["id"],
          distancia_pista_obstaculo_m: sanitizarNumerico(row["Distância da pista ao obstáculo (m)"] || row["Distancia pista obstaculo"] || row["distancia_pista_obstaculo_m"]),
          risco: row["Risco"] || row["risco"],
          velocidade_kmh: sanitizarNumerico(row["Velocidade (km/h)"] || row["Velocidade"] || row["velocidade_kmh"]),
          vmd_veic_dia: sanitizarNumerico(row["VMD (veíc./dia)"] || row["VMD"] || row["vmd_veic_dia"]),
          percentual_veiculos_pesados: (() => {
            const valor = row["% veículos pesados"] || row["Percentual veiculos pesados"] || row["percentual_veiculos_pesados"];
            if (!valor) return null;
            const valorLimpo = String(valor).replace(',', '.').replace('%', '').trim();
            return sanitizarNumerico(valorLimpo);
          })(),
          geometria: row["Geometria"] || row["geometria"],
          classificacao_nivel_contencao: row["Classificação do nível de contenção"] || row["Classificacao nivel contencao"] || row["classificacao_nivel_contencao"],
          nivel_contencao_en1317: row["Nível de contenção EN 1317-2"] || row["Nivel contencao EN1317"] || row["nivel_contencao_en1317"],
          nivel_contencao_nchrp350: row["Nível de contenção NCHRP 350"] || row["Nivel contencao NCHRP350"] || row["nivel_contencao_nchrp350"],
          espaco_trabalho: row["Espaço de trabalho"] || row["Espaco trabalho"] || row["espaco_trabalho"],
          terminal_entrada: row["Terminal de entrada"] || row["Terminal entrada"] || row["terminal_entrada"],
          terminal_saida: row["Terminal de saída"] || row["Terminal saida"] || row["terminal_saida"],
          adequacao_funcionalidade_lamina: row["Adequação à funcionalidade - Lâmina"] || row["Adequacao funcionalidade lamina"] || row["adequacao_funcionalidade_lamina"],
          adequacao_funcionalidade_laminas_inadequadas: row["Adequação à funcionalidade - Lâminas inadequadas"] || row["Adequacao laminas inadequadas"] || row["adequacao_funcionalidade_laminas_inadequadas"],
          adequacao_funcionalidade_terminais: row["Adequação à funcionalidade - Terminais"] || row["Adequacao funcionalidade terminais"] || row["adequacao_funcionalidade_terminais"],
          adequacao_funcionalidade_terminais_inadequados: row["Adequação à funcionalidade - Terminais inadequados"] || row["Adequacao terminais inadequados"] || row["adequacao_funcionalidade_terminais_inadequados"],
          distancia_face_defensa_obstaculo_m: sanitizarNumerico(row["Distância da face da defensa ao obstáculo(m)"] || row["Distancia face defensa obstaculo"] || row["distancia_face_defensa_obstaculo_m"]),
          distancia_bordo_pista_face_defensa_m: sanitizarNumerico(row["Distância da linha de bordo da pista à face da defensa (m)"] || row["Distancia bordo pista face defensa"] || row["distancia_bordo_pista_face_defensa_m"]),
          motivo: sanitizarTexto(motivoDefensa),
        };

      default:
        return baseMap;
    }
  };

  const handleImport = async () => {
    if (!file || !tipo || !loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione o tipo, lote, rodovia e arquivo antes de importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setLogs([]);
    setProgress(0);
    setProgressInfo(null);
    cancelImportRef.current = false;

    try {
      // 1. Ler arquivo Excel - usar linha 2 como cabeçalho (onde está o dicionário)
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Ler com cabeçalho na linha 2 (índice 1)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,  // Ler como array de arrays primeiro
        defval: null 
      });

      if (jsonData.length < 2) {
        throw new Error("Planilha vazia ou sem dados");
      }

      // Detectar automaticamente onde estão os headers
      const primeiraLinha = jsonData[0] as any[];
      const segundaLinha = jsonData[1] as any[];

      // Colunas comuns em planilhas de necessidades
      const colunasEsperadas = [
        "Tipo de Placa", "Código da Placa", "Tipo da Placa", "Código",
        "Km", "KM", "Latitude", "Longitude", "BR", "SNV", "Lado",
        "Tipo de Demarcação", "Cor", "Material", "Largura", "Km Inicial", "Km Final"
      ];

      // Verificar qual linha tem mais colunas conhecidas
      const matchPrimeiraLinha = primeiraLinha.filter((col: any) =>
        colunasEsperadas.some(esp => 
          String(col || "").toLowerCase().includes(esp.toLowerCase())
        )
      ).length;

      const matchSegundaLinha = segundaLinha.filter((col: any) =>
        colunasEsperadas.some(esp => 
          String(col || "").toLowerCase().includes(esp.toLowerCase())
        )
      ).length;

      // Escolher a linha com mais matches como header
      const linhaHeader = matchPrimeiraLinha > matchSegundaLinha ? 0 : 1;
      const linhaInicioDados = linhaHeader + 1;

      console.log(`🔍 Headers detectados na linha ${linhaHeader + 1} (índice ${linhaHeader})`);
      console.log(`🔍 Matches - Linha 1: ${matchPrimeiraLinha}, Linha 2: ${matchSegundaLinha}`);

      const headers = jsonData[linhaHeader] as any[];
      
      // Normalizar headers (remover espaços extras)
      const headersNormalizados = headers.map((h: any) => 
        String(h || "").trim()
      );
      
      // Converter os dados usando headers detectados
      const dadosComHeader = jsonData.slice(linhaInicioDados).map((row: any) => {
        const obj: any = {};
        headersNormalizados.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      // Filtrar linhas vazias (que não têm KM)
      const dadosFiltrados = dadosComHeader.filter((row: any) => {
        const kmValue = (tipo === "placas" || tipo === "marcas_transversais" || tipo === "porticos")
          ? (row["Km"] || row["KM"] || row["km"])
          : (row["Km Inicial"] || row["KM Inicial"] || row["km inicial"] || row["km_inicial"]);
        return kmValue !== undefined && kmValue !== null && kmValue !== "";
      });

      // Validar se há dados após filtro
      if (dadosFiltrados.length === 0) {
        toast({
          title: "Planilha vazia",
          description: "Nenhum registro válido encontrado",
          variant: "destructive",
        });
        setIsImporting(false);
        setProgressInfo(null);
        return;
      }

      // 2. Buscar user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 3. Buscar todos os cadastros da rodovia de uma vez para match em lote
      const tabelaCadastro = tipo === "placas" ? "ficha_placa" : 
                             tipo === "marcas_transversais" ? "ficha_inscricoes" :
                             tipo === "marcas_longitudinais" ? "ficha_marcas_longitudinais" :
                             tipo === "cilindros" ? "ficha_cilindros" :
                             tipo === "tachas" ? "ficha_tachas" :
                             tipo === "porticos" ? "ficha_porticos" :
                             "defensas";

      console.log(`📊 Buscando cadastros da rodovia para match em lote...`);
      const { data: cadastros } = await supabase
        .from(tabelaCadastro as any)
        .select("*")
        .eq("rodovia_id", rodoviaId);

      const usaLatLongInicial = tipo !== "placas" && tipo !== "porticos";
      const cadastroLatField = usaLatLongInicial ? "latitude_inicial" : "latitude";
      const cadastroLongField = usaLatLongInicial ? "longitude_inicial" : "longitude";

      console.log(`✅ VERSÃO OTIMIZADA: ${cadastros?.length || 0} cadastros carregados. Match será local (sem RPC).`);
      
      // Log inicial (não precisa de buffer, é apenas 1 log antes do loop)
      setLogs(prev => [...prev, {
        tipo: "success",
        linha: 0,
        mensagem: `🚀 Modo otimizado: ${cadastros?.length || 0} cadastros carregados. Match local ativado.`
      }]);

      // Função para calcular distância (Haversine)
      const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

      // Buscar tolerância da rodovia selecionada
      const { data: rodoviaData } = await supabase
        .from('rodovias')
        .select('tolerancia_match_metros')
        .eq('id', rodoviaId)
        .single();
      
      const tolerancia = rodoviaData?.tolerancia_match_metros || 50;
      
      console.log(`🎯 Usando tolerância de match: ${tolerancia}m (rodovia ID: ${rodoviaId})`);

      // 4. Processar cada linha
      const total = dadosFiltrados.length;
      let sucessos = 0;
      let falhas = 0;
      let matchesEncontrados = 0;
      let divergenciasPendentes = 0;
      let pendentesRevisao = 0; // Contador para matches parciais
      
      // 🚀 OTIMIZAÇÃO: Batch de logs e inserts
      const logsBuffer: LogEntry[] = [];
      const batchInsert: any[] = [];
      const BATCH_SIZE = 100; // Inserir a cada 100 registros
      const LOG_UPDATE_INTERVAL = 50; // Atualizar logs a cada 50 registros
      
      // Função auxiliar para fazer flush dos logs
      const flushLogs = () => {
        if (logsBuffer.length > 0) {
          setLogs(prev => [...prev, ...logsBuffer]);
          logsBuffer.length = 0; // Limpar buffer
        }
      };
      
      // Função auxiliar para fazer flush do batch de inserts
      const flushBatch = async (tabelaNecessidade: string) => {
        if (batchInsert.length > 0) {
          const { error } = await supabase
            .from(tabelaNecessidade as any)
            .insert(batchInsert);
          
          if (error) throw error;
          batchInsert.length = 0; // Limpar batch
        }
      };
      
      setProgressInfo({ current: 0, total });

      for (let i = 0; i < dadosFiltrados.length; i++) {
        // Atualizar progresso em tempo real
        setProgressInfo({ current: i + 1, total });
        // Verificar se foi cancelado
        if (cancelImportRef.current) {
          logsBuffer.push({
            tipo: "warning",
            linha: 0,
            mensagem: "Importação cancelada pelo usuário"
          });
          flushLogs(); // Garantir que logs sejam salvos antes de cancelar
          toast({
            title: "Importação Cancelada",
            description: `Processadas ${i} de ${total} linhas antes do cancelamento`,
            variant: "default",
          });
          break;
        }

        const row: any = dadosFiltrados[i];
        const linhaExcel = i + 3; // +3 pois Excel começa em 1, tem header, e pulamos a linha de cabeçalho duplicada

        try {
          // Mapear colunas
          const dados = mapearColunas(row, tipo);

          // ========== BIFURCAÇÃO: MATCH POR GPS (PLACAS) vs MATCH POR SOBREPOSIÇÃO (LINEARES) ==========
          
          let match = null;
          let distancia = null;
          let overlap_porcentagem = null;
          let tipo_match_resultado = null;
          let motivo_revisao = null;

          // ===== TIPO 1: ELEMENTOS LINEARES (Match por sobreposição de segmento KM) =====
          if (["marcas_longitudinais", "tachas", "defensas"].includes(tipo)) {
            const temKmsValidos = dados.km_inicial && 
                                  dados.km_final && 
                                  !isNaN(parseFloat(dados.km_inicial)) && 
                                  !isNaN(parseFloat(dados.km_final));
            
            if (temKmsValidos && cadastros && cadastros.length > 0) {
              // Buscar todos os matches possíveis (threshold 50%)
              const matches = buscarMatchSegmento(
                {
                  km_inicial: parseFloat(dados.km_inicial),
                  km_final: parseFloat(dados.km_final),
                  lado: dados.lado
                },
                cadastros,
                tipo,
                50 // Threshold de 50%
              );
              
              // Identificar serviço baseado nos matches
              const resultado = identificarServicoSegmento(dados, matches);
              
              // Atribuir valores do resultado
              match = resultado.match_usado?.cadastro_id || null;
              overlap_porcentagem = resultado.match_usado?.overlap_porcentagem || null;
              tipo_match_resultado = resultado.match_usado?.tipo_match || null;
              motivo_revisao = resultado.motivo_revisao || null;
              
              // Contabilizar matches
              if (match) {
                matchesEncontrados++;
              }
              
              // Contabilizar pendências se houver motivo de revisão
              if (motivo_revisao) {
                pendentesRevisao++;
              }
              
              // Log de múltiplos matches
              if (matches.length > 1 && i % 50 === 0) {
                console.log(`⚠️ Linha ${linhaExcel}: Múltiplos matches (${matches.length}). Usando melhor: ${overlap_porcentagem}% overlap`);
              }
              
              // Log de progresso
              if (i % 50 === 0) {
                if (resultado.match_usado) {
                  console.log(`✅ Processando linha ${linhaExcel}: Match encontrado! overlap=${overlap_porcentagem}% (${tipo_match_resultado}) [${i+1}/${total}]`);
                } else {
                  console.log(`⚠️ Processando linha ${linhaExcel}: Sem match - nova instalação [${i+1}/${total}]`);
                }
              }
            } else if (i % 50 === 0) {
              console.log(`⚠️ Processando linha ${linhaExcel}: Sem KMs válidos - importado como Implantar [${i+1}/${total}]`);
            }
          }
          
          // ===== TIPO 2: PLACAS (Match por GPS - ponto único) =====
          else if (tipo === "placas") {
            const lat = converterCoordenada(dados.latitude);
            const long = converterCoordenada(dados.longitude);

            if (lat && long && cadastros && cadastros.length > 0) {
            // Buscar o cadastro mais próximo localmente
            let menorDistancia = Infinity;
            let cadastroMaisProximo = null;

            for (const cad of (cadastros as any[])) {
              const cadLat = converterCoordenada(cad[cadastroLatField]);
              const cadLong = converterCoordenada(cad[cadastroLongField]);
              
              if (cadLat !== null && cadLong !== null) {
                const dist = calcularDistancia(lat, long, cadLat, cadLong);
                
                // Para placas, validar também o lado da rodovia
                let ladoValido = true;
                if (tipo === "placas" && dados.lado && cad.lado) {
                  const ladoNecessidade = String(dados.lado).toUpperCase().trim();
                  const ladoCadastro = String(cad.lado).toUpperCase().trim();
                  // Normalizar variações: D/Direito, E/Esquerdo, C/Centro, etc.
                  const normalizarLado = (l: string) => {
                    if (l.startsWith('D')) return 'D';
                    if (l.startsWith('E')) return 'E';
                    if (l.startsWith('C')) return 'C';
                    return l;
                  };
                  ladoValido = normalizarLado(ladoNecessidade) === normalizarLado(ladoCadastro);
                }
                
                if (dist < menorDistancia && dist <= tolerancia && ladoValido) {
                  menorDistancia = dist;
                  cadastroMaisProximo = cad;
                }
              }
            }

              if (cadastroMaisProximo) {
                match = cadastroMaisProximo.id;
                distancia = Math.round(menorDistancia);
                matchesEncontrados++;
                if (i % 50 === 0) { // Log a cada 50 linhas para não sobrecarregar
                  const ladoInfo = dados.lado && cadastroMaisProximo.lado 
                    ? ` lado=${dados.lado}/${cadastroMaisProximo.lado}`
                    : '';
                  console.log(`✅ Processando linha ${linhaExcel}: Match GPS encontrado! distancia=${distancia}m${ladoInfo} [${i+1}/${total}]`);
                }
              } else if (i % 50 === 0) {
                const ladoInfo = dados.lado ? ` (lado=${dados.lado})` : '';
                console.log(`⚠️ Processando linha ${linhaExcel}: Sem match dentro de ${tolerancia}m${ladoInfo} [${i+1}/${total}]`);
              }
            } else if (!lat || !long) {
              if (i % 50 === 0) {
                console.log(`⚠️ Processando linha ${linhaExcel}: Sem coordenadas válidas [${i+1}/${total}]`);
              }
            }
          }
          
          // ===== TIPO 3: OUTROS (Marcas Transversais, Cilindros, Pórticos) =====
          // Para estes tipos, não fazemos match por sobreposição
          // Mantém lógica existente ou importação simples

          // ========== FIM DA BIFURCAÇÃO DE MATCH ==========

          // SISTEMA DE RECONCILIAÇÃO
          // 1. Calcular servico_inferido (análise automática GPS)
          const servicoInferido = identificarServico(dados, match);
          
          // 2. Preservar solucao_planilha (decisão do projetista)
          let solucaoPlanilhaNormalizada: string | null = null;
          const solucaoPlanilha = dados.solucao_planilha?.toLowerCase();
          
          if (solucaoPlanilha) {
            // Normalizar valores da planilha
            if (solucaoPlanilha.includes("substitu")) {
              solucaoPlanilhaNormalizada = "Substituir";
            } else if (solucaoPlanilha.includes("implant")) {
              solucaoPlanilhaNormalizada = "Implantar";
            } else if (solucaoPlanilha.includes("remov")) {
              solucaoPlanilhaNormalizada = "Remover";
            } else if (solucaoPlanilha.includes("manter")) {
              solucaoPlanilhaNormalizada = "Manter";
            }
          }
          
          // 3. Definir servico_final (prioridade ao projetista)
          const servicoFinal = solucaoPlanilhaNormalizada || servicoInferido;
          
          // 4. Detectar divergência
          const divergencia = solucaoPlanilhaNormalizada 
            ? solucaoPlanilhaNormalizada !== servicoInferido
            : false;
          
          if (divergencia) {
            divergenciasPendentes++;
          }
          
          // 5. Manter compatibilidade com campo "servico" legado
          const servico = servicoFinal;

          // Inserir necessidade
          const tabelaNecessidade = `necessidades_${tipo}` as 
            | "necessidades_marcas_longitudinais"
            | "necessidades_tachas"
            | "necessidades_marcas_transversais"
            | "necessidades_cilindros"
            | "necessidades_placas"
            | "necessidades_porticos"
            | "necessidades_defensas";

          // Preparar dados para inserção
          const dadosInsercao: any = {
            user_id: user.id,
            lote_id: loteId,
            rodovia_id: rodoviaId,
            cadastro_id: match,
            servico,
            servico_inferido: servicoInferido,
            servico_final: servicoFinal,
            divergencia,
            reconciliado: false,
            ...dados,
            arquivo_origem: file.name,
            linha_planilha: linhaExcel,
            distancia_match_metros: distancia,
          };

          // Adicionar campos específicos de match por sobreposição (só para lineares)
          if (["marcas_longitudinais", "tachas", "defensas"].includes(tipo)) {
            dadosInsercao.overlap_porcentagem = overlap_porcentagem;
            dadosInsercao.tipo_match = tipo_match_resultado;
            dadosInsercao.motivo_revisao = motivo_revisao;
          }

          // Validar e sanitizar campos numéricos antes de inserir
          const camposNumericos = [
            'km', 'km_inicial', 'km_final',
            'latitude', 'longitude', 'latitude_inicial', 'longitude_inicial',
            'latitude_final', 'longitude_final',
            'largura_cm', 'espessura_cm', 'extensao_metros', 'area_m2',
            'quantidade', 'espacamento_m', 'extensao_km',
            'altura_livre_m', 'vao_horizontal_m',
            'quantidade_laminas', 'comprimento_total_tramo_m',
            'distancia_pista_obstaculo_m', 'velocidade_kmh', 'vmd_veic_dia',
            'percentual_veiculos_pesados', 'distancia_face_defensa_obstaculo_m',
            'distancia_bordo_pista_face_defensa_m', 'traco_m', 'espessura_mm'
          ];

          // Sanitizar todos os campos numéricos
          let conversoes = 0;
          camposNumericos.forEach(campo => {
            if (dadosInsercao.hasOwnProperty(campo)) {
              const valorOriginal = dadosInsercao[campo];
              dadosInsercao[campo] = sanitizarNumerico(valorOriginal);
              
              // Contar conversões (apenas quando o valor mudou e não era null)
              if (valorOriginal !== dadosInsercao[campo] && valorOriginal !== null && valorOriginal !== undefined) {
                conversoes++;
                // Log apenas a cada 50 linhas para não sobrecarregar
                if (i % 50 === 0) {
                  console.log(`🔧 Linha ${linhaExcel}: Campo '${campo}' convertido de '${valorOriginal}' para NULL`);
                }
              }
            }
          });

          // 🚀 OTIMIZAÇÃO: Adicionar ao batch ao invés de inserir individualmente
          batchInsert.push(dadosInsercao);

          // Fazer flush do batch quando atingir o tamanho limite
          if (batchInsert.length >= BATCH_SIZE) {
            await flushBatch(tabelaNecessidade);
          }

          // Log de sucesso com indicação de divergência
          const icon = servicoFinal === "Implantar" ? "🟢" : servicoFinal === "Substituir" ? "🟡" : servicoFinal === "Remover" ? "🔴" : "🔵";
          const matchInfo = match ? ` (${distancia?.toFixed(0)}m)` : "";
          const divIcon = divergencia ? " ⚠️" : "";
          
          // 🚀 OTIMIZAÇÃO: Adicionar ao buffer ao invés de setLogs direto
          logsBuffer.push({
            tipo: divergencia ? "warning" : "success",
            linha: linhaExcel,
            mensagem: `${icon} ${servicoFinal}${matchInfo}${divIcon}${divergencia ? ` Projeto: ${solucaoPlanilhaNormalizada} vs Sistema: ${servicoInferido}` : ""}`
          });
          
          // Fazer flush dos logs a cada 50 registros para mostrar progresso
          if ((i + 1) % LOG_UPDATE_INTERVAL === 0) {
            flushLogs();
          }
          
          sucessos++;

        } catch (error: any) {
          falhas++;
          console.error(`❌ Erro linha ${linhaExcel}:`, error);
          
          // Detectar erro de tipo numérico
          const erroNumerico = error.message?.includes('invalid input syntax for type numeric');
          
          // 🚀 OTIMIZAÇÃO: Adicionar ao buffer ao invés de setLogs direto
          logsBuffer.push({
            tipo: "error",
            linha: linhaExcel,
            mensagem: erroNumerico 
              ? `Erro: Valor inválido em campo numérico. Verifique se há textos como "Não se aplica" em colunas numéricas. Detalhe: ${error.message}`
              : `Erro: ${error.message || "Erro desconhecido"}`,
          });
          
          // Fazer flush dos logs a cada 50 registros
          if ((i + 1) % LOG_UPDATE_INTERVAL === 0) {
            flushLogs();
          }
        }

        // Atualizar progresso
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      // 🚀 OTIMIZAÇÃO: Fazer flush final do batch e logs restantes
      const tabelaNecessidade = `necessidades_${tipo}` as any;
      await flushBatch(tabelaNecessidade);
      flushLogs();

      // Resultado final com estatísticas detalhadas
      const isLinear = ["marcas_longitudinais", "tachas", "defensas"].includes(tipo);
      const mensagemResultado = [
        `✅ ${sucessos} registros importados`,
        `❌ ${falhas} falhas`,
        isLinear 
          ? `🔗 ${matchesEncontrados} matches por sobreposição` 
          : `🔗 ${matchesEncontrados} matches GPS encontrados`,
        pendentesRevisao > 0 ? `🟡 ${pendentesRevisao} matches parciais pendentes de revisão` : null,
        divergenciasPendentes > 0 ? `⚠️ ${divergenciasPendentes} divergências a reconciliar` : null,
        `🔧 Valores "Não se aplica" convertidos para NULL automaticamente`
      ].filter(Boolean).join(' • ');

      console.log(`📊 RESUMO DA IMPORTAÇÃO:`);
      console.log(`   ✅ Sucessos: ${sucessos}`);
      console.log(`   ❌ Falhas: ${falhas}`);
      console.log(`   🔗 Matches encontrados: ${matchesEncontrados}`);
      console.log(`   ⚠️ Divergências detectadas: ${divergenciasPendentes}`);
      console.log(`   🔍 Pendentes de revisão: ${pendentesRevisao}`);
      console.log(`   🔧 Valores "Não se aplica" convertidos para NULL automaticamente`);

      setLogs(prev => [...prev, {
        tipo: divergenciasPendentes > 0 ? "warning" : "success",
        linha: null,
        mensagem: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESUMO DA IMPORTAÇÃO\n${mensagemResultado}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      }]);

      toast({
        title: "Importação concluída",
        description: mensagemResultado,
        variant: falhas > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setProgressInfo(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Necessidades</CardTitle>
        <CardDescription>
          Importar planilhas de necessidades com match automático ao cadastro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de tipo */}
        <div className="space-y-2">
          <Label>Tipo de Necessidade</Label>
          <Select value={tipo} onValueChange={setTipo} disabled={isImporting}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_NECESSIDADES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Lote */}
        <div className="space-y-2">
          <Label>Lote</Label>
          <Select value={loteId} onValueChange={(value) => {
            setLoteId(value);
            setRodoviaId(""); // Limpar rodovia ao mudar lote
          }} disabled={isImporting}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o lote" />
            </SelectTrigger>
            <SelectContent>
              {lotes?.map(lote => (
                <SelectItem key={lote.id} value={lote.id}>
                  {lote.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Rodovia */}
        <div className="space-y-2">
          <Label>Rodovia</Label>
          <Select value={rodoviaId} onValueChange={setRodoviaId} disabled={isImporting || !loteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a rodovia" />
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

        {/* Alert informativo sobre tolerância */}
        {rodoviaId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta importação usará a tolerância de match GPS configurada na rodovia selecionada (padrão: 50m se não configurada).
            </AlertDescription>
          </Alert>
        )}

        {/* Upload de arquivo */}
        <div className="space-y-2">
          <Label>Arquivo Excel (.xlsx, .xlsm)</Label>
          <Input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleFileChange}
            disabled={isImporting || !tipo}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {file.name}
            </p>
          )}
        </div>

        {/* Botões importar/cancelar */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || !tipo || !loteId || !rodoviaId || isImporting}
            className="flex-1"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </>
            )}
          </Button>

          {isImporting && (
            <Button
              onClick={() => {
                cancelImportRef.current = true;
                toast({
                  title: "Cancelando...",
                  description: "A importação será interrompida após a linha atual",
                });
              }}
              variant="destructive"
              className="flex-shrink-0"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>

        {/* Barra de progresso */}
        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} />
            {progressInfo ? (
              <p className="text-sm text-center text-muted-foreground">
                Processando: <span className="font-semibold">{progressInfo.current}</span> / {progressInfo.total} linhas ({progress}%)
              </p>
            ) : (
              <p className="text-sm text-center text-muted-foreground">
                {progress}% concluído
              </p>
            )}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <Label>Log de Importação</Label>
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <Alert
                  key={idx}
                  variant={log.tipo === "error" ? "destructive" : "default"}
                  className="py-2"
                >
                  {log.tipo === "success" && <CheckCircle2 className="h-4 w-4" />}
                  {log.tipo === "warning" && <AlertCircle className="h-4 w-4" />}
                  {log.tipo === "error" && <XCircle className="h-4 w-4" />}
                  <AlertDescription className="text-xs">
                    Linha {log.linha}: {log.mensagem}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
