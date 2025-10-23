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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

const TIPOS_NECESSIDADES = [
  { value: "cilindros", label: "Cilindros Delimitadores" },
  { value: "defensas", label: "Defensas" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "porticos", label: "Pórticos" },
  { value: "placas", label: "Placas de Sinalização Vertical" },
  { value: "tachas", label: "Tachas Refletivas" },
  { value: "marcas_transversais", label: "Inscrições" },
];

interface LogEntry {
  tipo: "success" | "warning" | "error" | "info";
  linha: number | null;
  mensagem: string;
}

interface NecessidadesImporterProps {
  loteId?: string;
  rodoviaId?: string;
}

export function NecessidadesImporter({ loteId, rodoviaId }: NecessidadesImporterProps = {}) {
  const [tipo, setTipo] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);
  const [filtroLog, setFiltroLog] = useState<"todos" | "success" | "warning" | "error">("todos");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cancelImportRef = useRef(false);
  
  // 📦 Array para armazenar info das duplicatas e mostrar no final
  const duplicatasInfoRef = useRef<Array<{
    linha: number;
    km: string;
    info: string;
  }>>([]);

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
    status_reconciliacao: string;
    motivo_revisao?: string;
  } => {
    
    // SEM match = nova instalação
    if (!matches || matches.length === 0) {
      return { 
        servico: "Implantar",
        status_reconciliacao: "aprovado"
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
        match_usado: melhorMatch,
        status_reconciliacao: "aprovado"
      };
    }
    
    // Match parcial (<75%) = PENDENTE REVISÃO
    if (melhorMatch.overlap_porcentagem < 75) {
      return {
        servico: "Substituir",
        match_usado: melhorMatch,
        status_reconciliacao: "pendente_aprovacao",
        motivo_revisao: `Sobreposição parcial (${melhorMatch.overlap_porcentagem}%) - requer revisão manual`
      };
    }
    
    // Match exato/alto (≥75%) = Substituir automático
    return { 
      servico: "Substituir", 
      match_usado: melhorMatch,
      status_reconciliacao: "aprovado"
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
    // Helper para buscar primeira coluna com valor válido (aceita 0)
    const getFirstValid = (...keys: string[]) => {
      for (const key of keys) {
        const val = row[key];
        // Aceitar 0, mas não aceitar null, undefined ou string vazia
        if (val !== undefined && val !== null && val !== "") return val;
      }
      return null;
    };

    // Para elementos pontuais (placas, cilindros, pórticos, inscrições), não usar baseMap
    if (tipo === "placas") {
      // Extrair altura e largura individualmente
      const altura = sanitizarNumerico(
        row["Altura (m)"] || row["Altura"] || row["altura_m"] || row["altura"]
      );
      const largura = sanitizarNumerico(
        row["Largura (m)"] || row["Largura"] || row["largura_m"] || row["largura"]
      );

      // Calcular dimensoes_mm se altura/largura existirem
      let dimensoes_calculadas = null;
      if (largura && altura) {
        // Retangular: largura x altura (em mm)
        dimensoes_calculadas = `${Math.round(largura * 1000)}x${Math.round(altura * 1000)}`;
      } else if (altura) {
        // Circular: apenas diâmetro (quando só há altura)
        dimensoes_calculadas = `Ø ${Math.round(altura * 1000)}`;
      }

      return {
        km_inicial: sanitizarNumerico(getFirstValid("Km inicial", "Km", "KM", "km")),
        latitude_inicial: converterCoordenada(row["Latitude"] || row["latitude"]),
        longitude_inicial: converterCoordenada(row["Longitude"] || row["longitude"]),
        codigo: row["Código da Placa"] || row["Código da placa"] || row["Codigo da Placa"] || row["Codigo da placa"] || row["Código"] || row["Codigo"] || row["codigo"],
        tipo: row["Tipo de Placa"] || row["Tipo de placa"] || row["Tipo da Placa"] || row["Tipo da placa"] || row["Tipo Placa"] || row["Tipo"] || row["tipo"],
        lado: row["Lado"] || row["lado"],
        
        // NOVOS CAMPOS:
        altura_m: altura,
        largura_m: largura,
        dimensoes_mm: dimensoes_calculadas || row["Dimensões (mm)"] || row["dimensoes_mm"] || null,
        
        substrato: row["Tipo de Substrato"] || row["Substrato"] || row["substrato"],
        suporte: row["Tipo de Suporte"] || row["Suporte"] || row["suporte"],
        snv: row["SNV"] || row["snv"],
        observacao: row["Observação"] || row["Observacao"] || row["observacao"],
        solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
      };
    }

    if (tipo === "marcas_transversais") {
      return {
        km_inicial: sanitizarNumerico(getFirstValid("Km inicial", "Km", "KM", "km")),
        latitude_inicial: converterCoordenada(row["Latitude"] || row["latitude"]),
        longitude_inicial: converterCoordenada(row["Longitude"] || row["longitude"]),
        sigla: row["Sigla"] || row["sigla"],
        descricao: row["Descrição"] || row["Descricao"] || row["descricao"],
        tipo_inscricao: row["Sigla"] || row["sigla"],
        cor: row["Cor"] || row["cor"],
        material_utilizado: row["Material"] || row["material"],
        espessura_mm: sanitizarNumerico(row["Espessura (mm)"] || row["Espessura"] || row["espessura_mm"]),
        area_m2: sanitizarNumerico(row["Área (m²)"] || row["Área"] || row["area_m2"]),
        snv: row["SNV"] || row["snv"],
        observacao_usuario: row["Observação"] || row["Observacao"] || row["observacao"],
        solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
      };
    }

    if (tipo === "cilindros") {
      return {
        km_inicial: sanitizarNumerico(getFirstValid("Km inicial", "Km", "KM", "km")),
        latitude_inicial: converterCoordenada(row["Latitude"] || row["latitude"]),
        longitude_inicial: converterCoordenada(row["Longitude"] || row["longitude"]),
        lado: row["Lado"] || row["lado"],
        tipo: row["Tipo"] || row["tipo"],
        cor_corpo: row["Cor do Corpo"] || row["Cor Corpo"] || row["cor_corpo"],
        cor_refletivo: row["Cor Refletivo"] || row["cor_refletivo"],
        tipo_refletivo: row["Tipo Refletivo"] || row["tipo_refletivo"],
        snv: row["SNV"] || row["snv"],
        observacao_usuario: row["Observação"] || row["Observacao"] || row["observacao"],
        solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
      };
    }

    // Mapeamento básico para outros tipos (com inicial/final)
    const baseMap: any = {
      km_inicial: getFirstValid("Km Inicial", "KM Inicial", "km inicial", "km_inicial"),
      km_final: getFirstValid("Km Final", "KM Final", "km final", "km_final"),
      latitude_inicial: converterCoordenada(row["Latitude Inicial"] || row["Lat Inicial"] || row["Latitude inicial"] || row["latitude_inicial"]),
      longitude_inicial: converterCoordenada(row["Longitude Inicial"] || row["Long Inicial"] || row["Longitude inicial"] || row["longitude_inicial"]),
      latitude_final: converterCoordenada(row["Latitude Final"] || row["Lat Final"] || row["Latitude final"] || row["latitude_final"]),
      longitude_final: converterCoordenada(row["Longitude Final"] || row["Long Final"] || row["Longitude final"] || row["longitude_final"]),
      observacao_usuario: row["Observação"] || row["Observacao"] || row["observacao"],
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
        // 🔍 LOG: Debugar valor da coluna "Solução" antes de processar
        const solucaoRaw = row["Solução"] || row["Solucao"] || row["solucao"] || null;
        console.log(`🔍 CILINDROS DEBUG - Linha: Solução="${solucaoRaw}"`);
        
        const solucao = (solucaoRaw || "").toString().toLowerCase();
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
        
        // Mapear solução da planilha para campo servico
        // Valores válidos: 'Implantar', 'Substituir', 'Remover', 'Manter'
        let servico: string | null = null;
        if (solucao.includes("implantar") || solucao.includes("implant")) {
          servico = "Implantar";
        } else if (solucao.includes("remov")) {
          servico = "Remover";
        } else if (solucao.includes("substitu")) {
          servico = "Substituir";
        } else if (solucao.includes("manter") || solucao.includes("manut")) {
          servico = "Manter";
        }
        
        return {
          ...baseMap,
          servico,  // ✅ CORRIGIDO: Agora salva o servico lido da planilha
          cor_corpo: row["Cor (Corpo)"] || row["Cor Corpo"] || row["cor_corpo"],
          cor_refletivo: row["Cor (Refletivo)"] || row["Cor Refletivo"] || row["cor_refletivo"],
          tipo_refletivo: row["Tipo Refletivo"] || row["tipo_refletivo"],
          extensao_km: sanitizarNumerico(row["Extensão (km)"] || row["extensao_km"]),
          local_implantacao: row["Local de Implantação"] || row["Local Implantação"] || row["local_implantacao"],
          espacamento_m: sanitizarNumerico(
            row["Espaçamento"] || 
            row["Espaçamento (m)"] || 
            row["Espacamento"] ||
            row["Espacamento (m)"] ||
            row["espacamento_m"]
          ),
          quantidade: sanitizarNumerico(
            row["Quantidade"] || 
            row["Qtd"] ||
            row["Qtde"] ||
            row["N°"] ||
            row["quantidade"]
          ),
          motivo: sanitizarTexto(motivo),
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
          km_inicial: sanitizarNumerico(getFirstValid("Km inicial", "Km", "KM", "km")),
          latitude_inicial: converterCoordenada(row["Latitude"] || row["latitude"]),
          longitude_inicial: converterCoordenada(row["Longitude"] || row["longitude"]),
          tipo: row["Tipo"] || row["tipo"],
          lado: row["Lado"] || row["lado"],
          altura_livre_m: sanitizarNumerico(row["Altura Livre (m)"] || row["Altura Livre"] || row["altura_livre_m"]),
          vao_horizontal_m: sanitizarNumerico(row["Vão Horizontal"] || row["Vao Horizontal"] || row["vao_horizontal_m"]),
          observacao_usuario: row["Observação"] || row["Observacao"] || row["observacao"],
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
          extensao_metros: (() => {
            // Prioriza o campo "Comprimento Total do Tramo (m)" da planilha
            const comprimentoTotal = sanitizarNumerico(row["Comprimento Total do Tramo (m)"] || row["Comprimento Total"] || row["comprimento_total_tramo_m"]);
            if (comprimentoTotal !== null) return comprimentoTotal;
            
            // Fallback: calcular pela diferença de KM
            const kmInicial = sanitizarNumerico(row["Km Inicial"] || row["km_inicial"]);
            const kmFinal = sanitizarNumerico(row["Km Final"] || row["km_final"]);
            if (kmInicial !== null && kmFinal !== null) {
              return Math.abs(kmFinal - kmInicial) * 1000; // Converter km para metros
            }
            return null;
          })(),
        };

      default:
        return baseMap;
    }
  };

  const handleImport = async () => {
    if (!file || !tipo) {
      toast({
        title: "Erro",
        description: "Selecione o tipo e arquivo antes de importar",
        variant: "destructive",
      });
      return;
    }

    // ✅ VALIDAÇÃO DE SESSÃO ATIVA
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessoes_trabalho")
      .select(`
        lote_id,
        rodovia_id,
        lote:lotes!inner(numero),
        rodovia:rodovias!inner(codigo)
      `)
      .eq("user_id", user.id)
      .eq("ativa", true)
      .maybeSingle();

    if (sessionError || !session) {
      toast({
        title: "❌ Nenhuma Sessão Ativa",
        description: "Inicie uma sessão de trabalho antes de importar necessidades",
        variant: "destructive",
      });
      return;
    }

    // ✅ CONFIRMAR LOTE/RODOVIA COM USUÁRIO
    const rodoviaConfirmada = window.confirm(
      `Você está prestes a importar necessidades para:\n\n` +
      `🛣️ Rodovia: ${session.rodovia.codigo}\n` +
      `📦 Lote: ${session.lote.numero}\n\n` +
      `Confirmar importação?`
    );

    if (!rodoviaConfirmada) {
      toast({
        title: "Importação Cancelada",
        description: "Operação cancelada pelo usuário",
      });
      return;
    }

    // ✅ FORÇAR lote_id/rodovia_id DA SESSÃO ATIVA
    const loteIdAtivo = session.lote_id;
    const rodoviaIdAtiva = session.rodovia_id;

    // ✅ GERAR UUID ÚNICO PARA ESTA IMPORTAÇÃO
    const importBatchId = crypto.randomUUID();
    console.log(`🆔 Import Batch ID gerado: ${importBatchId}`);

    console.log("✅ Importação autorizada:", {
      rodovia: session.rodovia.codigo,
      lote: session.lote.numero,
      importBatchId,
      loteId: loteIdAtivo,
      rodoviaId: rodoviaIdAtiva,
    });

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
      
      // Converter os dados usando headers detectados E MANTER O NÚMERO DA LINHA ORIGINAL
      const dadosComHeader = jsonData.slice(linhaInicioDados).map((row: any, index: number) => {
        const obj: any = {};
        headersNormalizados.forEach((header, colIndex) => {
          obj[header] = row[colIndex];
        });
        // Guardar o número da linha ORIGINAL no Excel (header + 1 para linha do Excel + index das linhas de dados)
        obj.__linha_excel_original = linhaInicioDados + index + 1; // +1 porque Excel começa em 1
        return obj;
      });

      // ========== LOG INICIAL - TOTAL DE LINHAS LIDAS ==========
      console.log(`📊 LINHAS TOTAIS LIDAS DO EXCEL: ${dadosComHeader.length}`);
      setLogs(prev => [...prev, {
        tipo: "info",
        linha: null,
        mensagem: `📊 Total de linhas lidas do Excel (incluindo vazias): ${dadosComHeader.length}`
      }]);

      // ========== FILTRAR LINHAS VAZIAS COM LOG DETALHADO ==========
      const linhasIgnoradas: LogEntry[] = [];
      
      const dadosFiltrados = dadosComHeader.filter((row: any) => {
        // Helper para buscar primeira coluna que EXISTE e tem valor válido (inclusive 0)
        const getFirstValidValue = (...keys: string[]) => {
          for (const key of keys) {
            const val = row[key];
            // Considerar válido se existe e não é string vazia
            // IMPORTANTE: 0 (número ou string "0") é VÁLIDO
            if (val !== undefined && val !== null && val !== "") {
              return val;
            }
            // Se encontrar explicitamente 0, retornar
            if (val === 0 || val === "0") {
              return val;
            }
          }
          return undefined;
        };
        
        const kmValue = (tipo === "placas" || tipo === "marcas_transversais" || tipo === "porticos")
          ? getFirstValidValue("Km", "KM", "km")
          : getFirstValidValue("Km Inicial", "KM Inicial", "km inicial", "km_inicial");
        
        // Se não tem KM válido, ignorar e logar
        if (kmValue === undefined || kmValue === null || kmValue === "") {
          linhasIgnoradas.push({
            tipo: "warning",
            linha: row.__linha_excel_original || 0,
            mensagem: `⚠️ Linha vazia ignorada (sem KM)`
          });
          return false;
        }
        
        return true;
      });

      // Log de linhas ignoradas
      if (linhasIgnoradas.length > 0) {
        const linhasDetalhadas = linhasIgnoradas.map(l => `L${l.linha}`).slice(0, 20).join(', ');
        const reticencias = linhasIgnoradas.length > 20 ? '...' : '';
        console.log(`⚠️ LINHAS VAZIAS IGNORADAS (${linhasIgnoradas.length}): ${linhasDetalhadas}${reticencias}`);
        setLogs(prev => [...prev, {
          tipo: "warning",
          linha: null,
          mensagem: `⚠️ ${linhasIgnoradas.length} linhas vazias ignoradas (sem KM válido): ${linhasDetalhadas}${reticencias}`
        }]);
      }

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

      // 2. Usar lote/rodovia da sessão ativa (já validado no início)
      // user_id já foi buscado na validação de sessão

      // MATCHING DESATIVADO NA IMPORTAÇÃO
      // O matching será executado posteriormente na aba "Matching" do Admin

      // 4. Processar cada linha COM DETECÇÃO DE DUPLICATAS
      const total = dadosFiltrados.length;
      
      console.log(`📋 Importação pura: ${total} necessidades serão inseridas SEM matching automático`);
      
      setLogs(prev => [...prev, {
        tipo: "success",
        linha: 0,
        mensagem: `ℹ️ Importação em 2 etapas: (1) importar necessidades → (2) executar matching na aba "Matching"`
      }]);
      let sucessos = 0;
      let falhas = 0;
      let duplicatasDetectadas = 0;
      
      // ========== DETECÇÃO DE CONFLITOS DE SERVIÇO ==========
      // Rastrear necessidades por localização para detectar conflitos
      const necessidadesPorLocalizacao = new Map<string, {
        necessidades: any[],
        servicos: Set<string>
      }>();
      
      // Helper para formatar KM (trata valores não-numéricos)
      const formatarKm = (valor: any): string => {
        if (valor === null || valor === undefined || typeof valor !== 'number') {
          return 'NA';
        }
        return valor.toFixed(3);
      };

      // Função para gerar chave única baseada nos campos-chave do tipo
      const gerarChaveLocalizacao = (dados: any, tipoAtual: string): string => {
        switch (tipoAtual) {
          case "placas":
          case "porticos":
          case "cilindros":
          case "marcas_transversais":
            return `${formatarKm(dados.km_inicial)}_${dados.codigo || dados.tipo || dados.sigla || dados.tipo_inscricao}_${dados.lado || ''}`;
          
          case "marcas_longitudinais":
          case "tachas":
          case "defensas":
            return `${formatarKm(dados.km_inicial)}_${formatarKm(dados.km_final)}_${dados.codigo || dados.tipo_demarcacao || dados.tipo || ''}_${dados.lado || ''}`;
          
          default:
            return `${dados.km_inicial}_${dados.km_final}_${JSON.stringify(dados)}`;
        }
      };
      
      // Função para detectar conflito de serviço
      const detectarConflitoServico = (
        chave: string,
        dados: any,
        linhaExcel: number,
        servico: string | null
      ): {
        temConflito: boolean,
        tipoConflito?: string,
        necessidadeConflitante?: any
      } => {
        const localizacao = necessidadesPorLocalizacao.get(chave);
        
        if (!localizacao) {
          // Primeira ocorrência - registrar
          necessidadesPorLocalizacao.set(chave, {
            necessidades: [{ ...dados, linhaExcel, servico }],
            servicos: new Set(servico ? [servico] : [])
          });
          return { temConflito: false };
        }
        
        // Já existe - verificar serviço
        if (servico) {
          localizacao.servicos.add(servico);
        }
        
        // CONFLITO CRÍTICO: IMPLANTAR + REMOVER no mesmo lugar
        const temImplantar = localizacao.servicos.has('Implantar');
        const temRemover = localizacao.servicos.has('Remover');
        
        if (temImplantar && temRemover) {
          return {
            temConflito: true,
            tipoConflito: 'SERVICO_CONTRADICTORIO',
            necessidadeConflitante: localizacao.necessidades[0]
          };
        }
        
        // CONFLITO MODERADO: Mesmo serviço repetido
        const primeiroServico = localizacao.necessidades[0].servico;
        if (servico && primeiroServico === servico) {
          return {
            temConflito: true,
            tipoConflito: 'DUPLICATA_PROJETO',
            necessidadeConflitante: localizacao.necessidades[0]
          };
        }
        
        // Adicionar aos registros
        localizacao.necessidades.push({ ...dados, linhaExcel, servico });
        
        return { temConflito: false };
      };
      
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

      // Função auxiliar para fazer flush do batch de inserts SEM criar reconciliações
      // O matching será feito posteriormente na aba "Matching"
      const flushBatch = async (tabelaNecessidade: string) => {
        console.log(`🚀 FLUSH-BATCH CHAMADO: batchInsert.length = ${batchInsert.length}, tabela = ${tabelaNecessidade}`);
        if (batchInsert.length > 0) {
          if (tabelaNecessidade === 'necessidades_defensas') {
            console.log(`🛡️ FLUSH DEFENSAS - Primeiros 2 registros completos:`, batchInsert.slice(0, 2));
          }
          console.log(`📦 Dados que serão enviados (primeiros 2 registros):`, batchInsert.slice(0, 2));
          
          // Inserir necessidades sem retornar IDs (não criaremos reconciliações)
          const { error } = await supabase
            .from(tabelaNecessidade as any)
            .insert(batchInsert);
          
          console.log(`📊 RESPOSTA SUPABASE:`, { 
            temErro: !!error,
            erro: error 
          });
          
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
        // Usar o número da linha ORIGINAL que foi guardado durante o mapeamento
        const linhaExcel = row.__linha_excel_original || (i + 3);

        // Declarar variáveis fora do try para acessá-las no catch
        let dados: any = null;
        let dadosInsercao: any = null;

        try {
          // Mapear colunas
          dados = mapearColunas(row, tipo);

          // ========== VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ==========
          const camposObrigatorios: Record<string, string[]> = {
            placas: ['km_inicial', 'codigo'],
            porticos: ['km_inicial', 'tipo'],
            cilindros: ['km_inicial', 'km_final'],
            marcas_longitudinais: ['km_inicial', 'km_final', 'codigo'],
            marcas_transversais: ['km_inicial', 'codigo'],
            tachas: ['km_inicial', 'km_final'],
            defensas: ['km_inicial', 'km_final']
          };

          const camposRequeridos = camposObrigatorios[tipo] || [];
          const camposFaltantes = camposRequeridos.filter(campo => {
            const valor = dados[campo];
            return valor === null || valor === undefined || valor === '';
          });

          if (camposFaltantes.length > 0) {
            const valoresFaltantes = camposFaltantes.map(c => `${c}=${dados[c]}`).join(', ');
            console.log(`❌ LINHA ${linhaExcel} REJEITADA - Campos faltando:`, camposFaltantes, dados);
            logsBuffer.push({
              tipo: "error",
              linha: linhaExcel,
              mensagem: `❌ Campos obrigatórios faltando: ${camposFaltantes.join(', ')} (${valoresFaltantes})`
            });
            falhas++;
            continue; // Pular esta linha
          }

          // ========== DETECÇÃO DE CONFLITOS DE SERVIÇO ==========
          const chaveLocalizacao = gerarChaveLocalizacao(dados, tipo);
          
          // Inferir serviço da planilha (se disponível)
          const servicoPlanilha = dados.solucao_planilha?.toLowerCase().includes('remo') ? 'Remover' :
                                  dados.solucao_planilha?.toLowerCase().includes('impl') ? 'Implantar' :
                                  dados.solucao_planilha?.toLowerCase().includes('subst') ? 'Substituir' : null;
          
          const resultadoConflito = detectarConflitoServico(chaveLocalizacao, dados, linhaExcel, servicoPlanilha);
          
          if (resultadoConflito.temConflito) {
            duplicatasDetectadas++; // Contar como conflito
            
            // NÃO BLOQUEAR - apenas anotar o conflito
            dados.tem_conflito_servico = true;
            dados.tipo_conflito = resultadoConflito.tipoConflito;
            
            const infoCompleta = tipo === "placas" 
              ? `KM ${dados.km_inicial} | Código: ${dados.codigo} | Lado: ${dados.lado}`
              : tipo === "cilindros"
              ? `KM ${dados.km_inicial} | Tipo: ${dados.tipo} | Lado: ${dados.lado}`
              : `KM ${dados.km_inicial}${dados.km_final ? `-${dados.km_final}` : ''} | ${dados.codigo || dados.tipo || 'sem código'}`;
            
            dados.conflito_detalhes = {
              tipo: resultadoConflito.tipoConflito,
              linha_excel: linhaExcel,
              linha_conflitante_excel: resultadoConflito.necessidadeConflitante.linhaExcel,
              servico_atual: servicoPlanilha || 'não informado',
              servico_conflitante: resultadoConflito.necessidadeConflitante.servico || 'não informado',
              km: dados.km_inicial,
              codigo: dados.codigo || dados.tipo || dados.sigla,
              lado: dados.lado,
              detectado_em: new Date().toISOString(),
              info: infoCompleta
            };
            
            // 📦 Armazenar para mostrar no final
            duplicatasInfoRef.current.push({
              linha: linhaExcel,
              km: dados.km_inicial?.toString() || 'N/A',
              info: `⚠️ ${resultadoConflito.tipoConflito} - ${infoCompleta}`
            });
            
            // Log na interface
            logsBuffer.push({
              tipo: 'warning',
              linha: linhaExcel,
              mensagem: `⚠️ CONFLITO: ${resultadoConflito.tipoConflito} - ` +
                       `${servicoPlanilha || '?'} vs ${resultadoConflito.necessidadeConflitante.servico || '?'} ` +
                       `(Linha ${resultadoConflito.necessidadeConflitante.linhaExcel})`
            });
            
            console.log(`⚠️ CONFLITO DETECTADO - LINHA ${linhaExcel}:`, dados.conflito_detalhes);
          }

          // ========== MATCHING DESATIVADO ==========
          // O matching será executado posteriormente na aba "Matching"
          
          // Log de progresso
          if (i % 50 === 0) {
            console.log(`⚙️ Processando linha ${linhaExcel}: Importação pura (matching na aba Matching) [${i+1}/${total}]`);
          }

          // Inserir necessidade
          const tabelaNecessidade = `necessidades_${tipo}` as 
            | "necessidades_marcas_longitudinais"
            | "necessidades_tachas"
            | "necessidades_marcas_transversais"
            | "necessidades_cilindros"
            | "necessidades_placas"
            | "necessidades_porticos"
            | "necessidades_defensas";

          // Preparar dados para inserção SEM inferências (matching preencherá os campos de decisão)
          dadosInsercao = {
            user_id: user.id,
            lote_id: loteId,
            rodovia_id: rodoviaId,
            import_batch_id: importBatchId, // ✅ Vincular ao batch da importação
            cadastro_id: null,        // Preenchido pelo matching
            servico: null,            // Preenchido pelo matching
            servico_inferido: null,   // Preenchido pelo matching
            servico_final: null,      // Preenchido pelo matching
            divergencia: null,        // Preenchido pelo matching
            ...dados,                 // Inclui solucao_planilha (preservado)
            arquivo_origem: file.name,
            linha_planilha: linhaExcel,
          };

          // 🛡️ LOG ESPECÍFICO PARA DEFENSAS
          if (tipo === "defensas") {
            console.log(`🛡️ DEFENSAS DEBUG - Linha ${linhaExcel}: Dados após mapeamento:`, {
              servico: dadosInsercao.servico,
              extensao_metros: dadosInsercao.extensao_metros,
              km_inicial: dadosInsercao.km_inicial,
              km_final: dadosInsercao.km_final,
              tramo: dadosInsercao.tramo,
              lado: dadosInsercao.lado
            });
          }

          // 🔍 VALIDAÇÃO PREVENTIVA ANTES DA INSERÇÃO
          const errosValidacao: string[] = [];
          
          // Validar extensão (tachas, marcas, defensas)
          if (['tachas', 'marcas_longitudinais', 'defensas'].includes(tipo)) {
            const campoExtensao = tipo === 'defensas' ? 'extensao_metros' : 'extensao_km';
            if (dadosInsercao[campoExtensao] === 0) {
              errosValidacao.push(`${campoExtensao} = 0`);
            }
          }
          
          // Validar quantidade (tachas, cilindros)
          if (['tachas', 'cilindros'].includes(tipo) && dadosInsercao.quantidade === 0) {
            errosValidacao.push(`Quantidade = 0`);
          }
          
          // Se houver erros de validação, logar warning
          if (errosValidacao.length > 0) {
            console.warn(`⚠️ Linha ${linhaExcel} com problemas potenciais:`, errosValidacao);
            logsBuffer.push({
              tipo: "warning",
              linha: linhaExcel,
              mensagem: `⚠️ ATENÇÃO: ${errosValidacao.join(', ')} - Tentando inserir mesmo assim...`
            });
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

          // Log de sucesso simplificado (sem inferências)
          logsBuffer.push({
            tipo: "success",
            linha: linhaExcel,
            mensagem: `✅ Importado (matching pendente)`
          });
          
          // Flush imediato nas primeiras 10 linhas para garantir visibilidade inicial
          if (i < 10) {
            setLogs(prev => [...prev, ...logsBuffer]);
            logsBuffer.length = 0;
          } else if ((i + 1) % LOG_UPDATE_INTERVAL === 0) {
            flushLogs();
          }
          
          sucessos++;

        } catch (error: any) {
          falhas++;
          
          // 🔍 LOG DETALHADO DA LINHA QUE FALHOU
          const dadosDebug: any = {
            linha_excel: linhaExcel,
            codigo_erro: error.code,
            mensagem_erro: error.message,
            detalhes: error.details,
            hint: error.hint
          };
          
          // Adicionar dados se disponíveis (foram definidos antes do erro)
          if (dados) {
            dadosDebug.km_inicial = dados.km_inicial;
            dadosDebug.km_final = dados.km_final;
            dadosDebug.extensao_km = dados.extensao_km;
            dadosDebug.extensao_metros = dados.extensao_metros;
            dadosDebug.quantidade = dados.quantidade;
          }
          
          if (dadosInsercao) {
            dadosDebug.servico = dadosInsercao.servico;
            dadosDebug.servico_final = dadosInsercao.servico_final;
            dadosDebug.servico_inferido = dadosInsercao.servico_inferido;
            dadosDebug.solucao_planilha = dados?.solucao_planilha;
          }
          
          console.error(`❌ ERRO LINHA ${linhaExcel}:`, dadosDebug);
          
          // Detectar tipo de erro
          const erroNumerico = error.message?.includes('invalid input syntax for type numeric');
          const erroConstraint = error.message?.includes('violates check constraint');
          const erroNotNull = error.message?.includes('null value in column');
          
          // Construir mensagem detalhada
          let mensagemDetalhada = '';
          
          if (erroNumerico) {
            mensagemDetalhada = `❌ FALHA: Valor inválido em campo numérico. Verifique se há textos em colunas numéricas. `;
          } else if (erroConstraint) {
            // Capturar detalhes específicos de violação de constraint
            const detalheConstraint = dadosInsercao 
              ? `servico="${dadosInsercao.servico}" (inferido="${dadosInsercao.servico_inferido}", planilha="${dados?.solucao_planilha}")`
              : '';
            mensagemDetalhada = `❌ FALHA: Violação de constraint. ${detalheConstraint} `;
          } else if (erroNotNull) {
            mensagemDetalhada = `❌ FALHA: Campo obrigatório vazio. `;
          } else {
            mensagemDetalhada = `❌ FALHA: `;
          }
          
          // Adicionar informações de contexto se disponíveis
          const contexto = [];
          if (dados) {
            if (dados.km_inicial !== undefined) contexto.push(`KM ${dados.km_inicial}-${dados.km_final}`);
            if (dados.extensao_km !== undefined) contexto.push(`Ext: ${dados.extensao_km}km`);
            if (dados.extensao_metros !== undefined) contexto.push(`Ext: ${dados.extensao_metros}m`);
            if (dados.quantidade !== undefined) contexto.push(`Qtd: ${dados.quantidade}`);
          }
          
          if (dadosInsercao && dadosInsercao.servico_final) {
            contexto.push(`Serv: ${dadosInsercao.servico_final}`);
          }
          
          if (contexto.length > 0) {
            mensagemDetalhada += contexto.join(' | ') + ' | ';
          }
          mensagemDetalhada += `Erro: ${error.message}`;
          
          // 🚀 OTIMIZAÇÃO: Adicionar ao buffer ao invés de setLogs direto
          logsBuffer.push({
            tipo: "error",
            linha: linhaExcel,
            mensagem: mensagemDetalhada
          });
          
          // Flush imediato nas primeiras 10 linhas para garantir visibilidade inicial
          if (i < 10) {
            setLogs(prev => [...prev, ...logsBuffer]);
            logsBuffer.length = 0;
          } else if ((i + 1) % LOG_UPDATE_INTERVAL === 0) {
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

      // ========== LOG DE CONFLITOS TOTAIS ==========
      if (duplicatasDetectadas > 0) {
        console.log(`
⚠️ ===== RESUMO DE CONFLITOS DE SERVIÇO =====
Total de conflitos detectados e anotados: ${duplicatasDetectadas}

📋 CONFLITOS ENCONTRADOS (importados para revisão):
`);
        
        // Mostrar cada conflito no console E na interface
        const conflitosLogs: LogEntry[] = [];
        
        duplicatasInfoRef.current.forEach((dup, idx) => {
          const msg = `#${idx + 1} - LINHA ${dup.linha}: ${dup.info}`;
          console.log(`   ${msg}`);
          
          conflitosLogs.push({
            tipo: "warning",
            linha: dup.linha,
            mensagem: `⚠️ CONFLITO ${msg}`
          });
        });
        
        console.log(`
📋 PRÓXIMOS PASSOS:
1. Revise os conflitos no Inventário Dinâmico
2. Verifique se há erros no projeto de sinalização
3. Corrija manualmente ou marque como resolvido
4. Exemplo: IMPLANTAR + REMOVER no mesmo lugar pode indicar que deveria ser SUBSTITUIR
        `);
        
        // Adicionar TODAS as conflitos aos logs visíveis de uma vez
        setLogs(prev => [...prev, 
          {
            tipo: "info",
            linha: null,
            mensagem: `━━━━━ ⚠️ ${duplicatasDetectadas} CONFLITOS DETECTADOS ━━━━━`
          },
          ...conflitosLogs,
          {
            tipo: "info",
            linha: null,
            mensagem: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
          }
        ]);
        
        // Limpar array para próxima importação
        duplicatasInfoRef.current = [];
      }

      // 🔄 DELETAR Marco Zero - importação invalida o snapshot consolidado
      if (loteId && rodoviaId) {
        const { error: marcoError } = await supabase
          .from("marcos_inventario")
          .delete()
          .eq("lote_id", loteId)
          .eq("rodovia_id", rodoviaId)
          .eq("tipo", "marco_zero");

        if (marcoError) {
          console.warn("⚠️ Aviso ao deletar marco zero:", marcoError);
        } else {
          console.log("✅ Marco Zero deletado - inventário não está mais consolidado");
        }

        // Invalidar query do marco zero
        queryClient.invalidateQueries({ 
          queryKey: ["marco-zero-recente", loteId, rodoviaId] 
        });
      }

      // ========== LOG FINAL - RESUMO MATEMÁTICO COMPLETO ==========
      const linhasLidasExcel = dadosComHeader.length;
      const linhasVazias = linhasIgnoradas.length;
      const linhasValidasFiltradas = dadosFiltrados.length;
      const totalProcessado = sucessos + falhas;
      const diferencaNaoContabilizada = linhasValidasFiltradas - totalProcessado - duplicatasDetectadas;

      console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ANÁLISE MATEMÁTICA DA IMPORTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Linhas totais lidas do Excel: ${linhasLidasExcel}
⚠️  Linhas vazias ignoradas (sem KM): ${linhasVazias}
✅ Linhas filtradas (válidas): ${linhasValidasFiltradas}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Conflitos detectados (anotados): ${duplicatasDetectadas}
✅ Sucessos: ${sucessos}
❌ Falhas: ${falhas}
📊 Total processado: ${totalProcessado}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ Diferença não contabilizada: ${diferencaNaoContabilizada}
${diferencaNaoContabilizada !== 0 ? '⚠️ ATENÇÃO: Há linhas que não aparecem em nenhuma categoria!' : '✅ Todas as linhas foram contabilizadas'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fórmula: ${linhasLidasExcel} (lidas) - ${linhasVazias} (vazias) = ${linhasValidasFiltradas} (válidas)
         ${linhasValidasFiltradas} (válidas) incluindo ${duplicatasDetectadas} com conflito
         ${sucessos} (sucessos) + ${falhas} (falhas) = ${totalProcessado} (processado)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      setLogs(prev => [...prev, {
        tipo: "info",
        linha: null,
        mensagem: `📊 ANÁLISE: ${linhasLidasExcel} lidas → ${linhasVazias} vazias → ${linhasValidasFiltradas} válidas → ${duplicatasDetectadas} conflitos anotados → ${sucessos} importadas | ❓ Diferença: ${diferencaNaoContabilizada}`
      }]);

      // 📊 RESUMO FINAL DETALHADO
      console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMO DA IMPORTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📂 Total lido: ${total} linhas
   ✅ Sucessos: ${sucessos}
   ⚠️ Conflitos detectados (anotados): ${duplicatasDetectadas}
   ⚠️ Linhas vazias ignoradas: ${linhasIgnoradas.length}
   ❌ Falhas: ${falhas}
   🔧 Valores convertidos para NULL automaticamente
${falhas > 0 ? `\n⚠️ ${falhas} LINHAS FALHARAM - Verifique os logs acima para detalhes` : ''}
${duplicatasDetectadas > 0 ? `\n⚠️ ${duplicatasDetectadas} CONFLITOS ANOTADOS - Revisar no Inventário Dinâmico` : ''}
   
   ℹ️ PRÓXIMO PASSO: Execute o matching na aba "Matching"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
      
      const mensagemResultado = [
        `📂 ${total} linhas lidas`,
        `✅ ${sucessos} importadas`,
        duplicatasDetectadas > 0 ? `⚠️ ${duplicatasDetectadas} conflitos anotados` : '',
        linhasIgnoradas.length > 0 ? `⚠️ ${linhasIgnoradas.length} vazias ignoradas` : '',
        `❌ ${falhas} falhas`
      ].filter(Boolean).join(' • ');

      setLogs(prev => [...prev, {
        tipo: falhas > 0 ? "error" : "success",
        linha: null,
        mensagem: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMO DA IMPORTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${mensagemResultado}
${falhas > 0 ? `\n⚠️ ${falhas} LINHAS FALHARAM - Veja logs de erro acima para identificar o problema` : ''}
${duplicatasDetectadas > 0 ? `\n⚠️ ${duplicatasDetectadas} CONFLITOS ANOTADOS - Revisar no Inventário Dinâmico` : ''}

ℹ️ PRÓXIMO PASSO: Acesse a aba "Matching" para vincular ao cadastro
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
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
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Projeto
        </CardTitle>
        <CardDescription>
          Importar planilhas do projeto. Execute o matching na aba "Matching" após a importação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Elemento *</Label>
          <Select value={tipo} onValueChange={setTipo} disabled={isImporting}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de elemento" />
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

        {/* Alert informativo sobre processo de 2 passos */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ℹ️ A importação agora funciona em 2 passos: primeiro importe as necessidades, depois execute o matching na aba "Matching" para vincular ao cadastro.
          </AlertDescription>
        </Alert>

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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Log de Importação</Label>
              <Select value={filtroLog} onValueChange={(v: any) => setFiltroLog(v)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="success">Sucessos</SelectItem>
                  <SelectItem value="warning">Avisos</SelectItem>
                  <SelectItem value="error">Erros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {logs
                .filter(log => filtroLog === "todos" || log.tipo === filtroLog)
                .map((log, idx) => (
                  <Alert
                    key={idx}
                    variant={log.tipo === "error" ? "destructive" : "default"}
                    className={`py-2 ${
                      log.tipo === "error" 
                        ? "bg-destructive/10 border-destructive" 
                        : log.tipo === "warning" 
                        ? "bg-yellow-500/10 border-yellow-500/50" 
                        : ""
                    }`}
                  >
                    {log.tipo === "success" && <CheckCircle2 className="h-4 w-4" />}
                    {log.tipo === "warning" && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                    {log.tipo === "error" && <XCircle className="h-4 w-4" />}
                    <AlertDescription className="text-xs whitespace-pre-line">
                      {log.linha !== null ? `Linha ${log.linha}: ` : ''}{log.mensagem}
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
