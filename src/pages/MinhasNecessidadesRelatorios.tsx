import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { criarWorkbookComLogos, adicionarCabecalhoSUPRA, formatarCabecalhosColunas, adicionarRodape, formatarCelulasDados } from "@/lib/excelLogoHelper";
import { useSupervisora } from "@/hooks/useSupervisora";
import logoOperaVia from "@/assets/logo-operavia.jpg";
import { format } from "date-fns";

const TIPOS_RELATORIO = [
  { value: "dados_rodovias", label: "Dados das Rodovias", tabelaCadastro: "dados_rodovias", tabelaIntervencoes: null },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", tabelaCadastro: "ficha_marcas_longitudinais", tabelaIntervencoes: "ficha_marcas_longitudinais_intervencoes" },
  { value: "tachas", label: "Tachas", tabelaCadastro: "ficha_tachas", tabelaIntervencoes: "ficha_tachas_intervencoes" },
  { value: "marcas_transversais", label: "Zebrados", tabelaCadastro: "ficha_inscricoes", tabelaIntervencoes: "ficha_inscricoes_intervencoes" },
  { value: "cilindros", label: "Cilindros", tabelaCadastro: "ficha_cilindros", tabelaIntervencoes: "ficha_cilindros_intervencoes" },
  { value: "placas", label: "Placas", tabelaCadastro: "ficha_placa", tabelaIntervencoes: "ficha_placa_intervencoes" },
  { value: "porticos", label: "Pórticos", tabelaCadastro: "ficha_porticos", tabelaIntervencoes: "ficha_porticos_intervencoes" },
  { value: "defensas", label: "Defensas", tabelaCadastro: "defensas", tabelaIntervencoes: "defensas_intervencoes" },
];

const TITULOS_SUPRA: Record<string, string> = {
  marcas_longitudinais: "1.8.1 - CONDIÇÃO INICIAL DO TRECHO - SH1 - Sinalização Horizontal Longitudinal",
  tachas: "1.8.2 - CONDIÇÃO INICIAL DO TRECHO - SH2 - Sinalização Horizontal - Tachas",
  marcas_transversais: "1.8.3 - CONDIÇÃO INICIAL DO TRECHO - SH3 - Sinalização Horizontal - Transversal, Zebrados e Legendas",
  cilindros: "1.8.4 - CONDIÇÃO INICIAL DO TRECHO - SH4 - Dispositivos Auxiliares - Cilindros",
  placas: "1.8.5 - CONDIÇÃO INICIAL DO TRECHO - SV1 - Sinalização Vertical - Placas",
  porticos: "1.8.6 - CONDIÇÃO INICIAL DO TRECHO - SV2 - Sinalização Vertical - Pórticos, Bandeiras e Semipórticos",
  defensas: "1.8.7 - CONDIÇÃO INICIAL DO TRECHO - DS - Dispositivos de Segurança - Defensas",
};

const CAMPOS_SUPRA: Record<string, Array<{ field: string | null; header: string }>> = {
  marcas_longitudinais: [
    { field: "rodovia", header: "BR" },
    { field: "snv", header: "SNV" },
    { field: "codigo", header: "Código" },
    { field: "posicao", header: "Posição" },
    { field: "km_inicial", header: "Km Inicial" },
    { field: "latitude_inicial", header: "Latitude Inicial" },
    { field: "longitude_inicial", header: "Longitude Inicial" },
    { field: "km_final", header: "Km Final" },
    { field: "latitude_final", header: "Latitude Final" },
    { field: "longitude_final", header: "Longitude Final" },
    { field: "tipo_demarcacao", header: "Tipo Demarcação" },
    { field: "cor", header: "Cor" },
    { field: "largura_cm", header: "Largura (cm)" },
    { field: "espessura_cm", header: "Espessura (cm)" },
    { field: "traco_m", header: "Traço (m)" },
    { field: "espacamento_m", header: "Espaçamento (m)" },
    { field: "material", header: "Material" },
    { field: "extensao_metros", header: "Extensão (m)" },
    { field: "area_m2", header: "Área (m²)" },
    { field: null, header: "Serviço" },
  ],
  tachas: [
    { field: "rodovia", header: "BR" },
    { field: "snv", header: "SNV" },
    { field: "tipo_tacha", header: "Tipo" },
    { field: "lado", header: "Lado" },
    { field: "km_inicial", header: "Km Inicial" },
    { field: "latitude_inicial", header: "Latitude Inicial" },
    { field: "longitude_inicial", header: "Longitude Inicial" },
    { field: "km_final", header: "Km Final" },
    { field: "latitude_final", header: "Latitude Final" },
    { field: "longitude_final", header: "Longitude Final" },
    { field: "espacamento_m", header: "Espaçamento (m)" },
    { field: "cor", header: "Cor" },
    { field: "quantidade", header: "Quantidade" },
    { field: "material", header: "Material" },
    { field: null, header: "Serviço" },
  ],
  marcas_transversais: [
    { field: "rodovia", header: "BR" },
    { field: "snv", header: "SNV" },
    { field: "sigla", header: "Sigla" },
    { field: "tipo_inscricao", header: "Tipo" },
    { field: "km_inicial", header: "Km Inicial" },
    { field: "latitude_inicial", header: "Latitude Inicial" },
    { field: "longitude_inicial", header: "Longitude Inicial" },
    { field: "km_final", header: "Km Final" },
    { field: "latitude_final", header: "Latitude Final" },
    { field: "longitude_final", header: "Longitude Final" },
    { field: "cor", header: "Cor" },
    { field: "dimensoes", header: "Dimensões" },
    { field: "espessura_mm", header: "Espessura (mm)" },
    { field: "material_utilizado", header: "Material" },
    { field: "area_m2", header: "Área (m²)" },
    { field: null, header: "Serviço" },
  ],
  cilindros: [
    { field: "rodovia", header: "BR" },
    { field: "snv", header: "SNV" },
    { field: "cor_corpo", header: "Cor do Corpo" },
    { field: "cor_refletivo", header: "Cor do Refletivo" },
    { field: "tipo_refletivo", header: "Tipo de Refletivo" },
    { field: "local_implantacao", header: "Local de Implantação" },
    { field: "km_inicial", header: "Km Inicial" },
    { field: "latitude_inicial", header: "Latitude Inicial" },
    { field: "longitude_inicial", header: "Longitude Inicial" },
    { field: "km_final", header: "Km Final" },
    { field: "latitude_final", header: "Latitude Final" },
    { field: "longitude_final", header: "Longitude Final" },
    { field: "espacamento_m", header: "Espaçamento (m)" },
    { field: "quantidade", header: "Quantidade" },
    { field: "extensao_km", header: "Extensão (km)" },
    { field: null, header: "Serviço" },
  ],
  placas: [
    { field: "rodovia", header: "BR" },
    { field: "snv", header: "SNV" },
    { field: "tipo", header: "Tipo de placa" },
    { field: "codigo", header: "Código da placa" },
    { field: "velocidade", header: "Velocidade" },
    { field: "lado", header: "Lado" },
    { field: "posicao", header: "Posição" },
    { field: "km", header: "Km" },
    { field: "latitude_inicial", header: "Latitude" },
    { field: "longitude_inicial", header: "Longitude" },
    { field: "detalhamento_pagina", header: "Detalhamento (página)" },
    { field: "suporte", header: "Tipo de Suporte" },
    { field: "qtde_suporte", header: "Quantidade de Suporte" },
    { field: "tipo_secao_suporte", header: "Tipo de Seção de Suporte" },
    { field: "secao_suporte_mm", header: "Seção do Suporte (mm)" },
    { field: "substrato", header: "Tipo de Substrato" },
    { field: "si_sinal_impresso", header: "SI (Sinal Impresso)" },
    { field: "tipo_pelicula_fundo", header: "Tipo (película fundo)" },
    { field: "cor_pelicula_fundo", header: "Cor (película fundo)" },
    { field: "retro_pelicula_fundo", header: "Retrorrefletância (película fundo)" },
    { field: "tipo_pelicula_legenda_orla", header: "Tipo (película legenda/orla)" },
    { field: "cor_pelicula_legenda_orla", header: "Cor (película legenda/orla)" },
    { field: "retro_pelicula_legenda_orla", header: "Retrorrefletância (película legenda/orla)" },
    { field: "dimensoes_mm", header: "Dimensões (mm)" },
    { field: "area_m2", header: "Área (m²)" },
    { field: "link_fotografia", header: "Link da Fotografia" },
    { field: null, header: "Serviço" },
  ],
  porticos: [
    { field: "rodovia", header: "BR" },
    { field: "snv", header: "SNV" },
    { field: "tipo", header: "Tipo de Dispositivo" },
    { field: "km", header: "Km" },
    { field: "latitude_inicial", header: "Latitude" },
    { field: "longitude_inicial", header: "Longitude" },
    { field: "vao_horizontal_m", header: "Vão Horizontal (m)" },
    { field: "altura_livre_m", header: "Altura Livre (m)" },
    { field: "descricao", header: "Descrição" },
    { field: null, header: "Serviço" },
  ],
  defensas: [
    { field: "rodovia", header: "BR" },
    { field: "snv", header: "SNV" },
    { field: "tipo_defensa", header: "Tipo de Dispositivo" },
    { field: "lado", header: "Lado" },
    { field: "km_inicial", header: "Km Inicial" },
    { field: "latitude_inicial", header: "Latitude Inicial" },
    { field: "longitude_inicial", header: "Longitude Inicial" },
    { field: "km_final", header: "Km Final" },
    { field: "latitude_final", header: "Latitude Final" },
    { field: "longitude_final", header: "Longitude Final" },
    { field: "extensao_metros", header: "Extensão (m)" },
    { field: null, header: "Serviço" },
  ],
};

// Função auxiliar para obter dicionário de campos
const obterDadosDicionario = (tipo: string, camposSUPRA: any[]) => {
  const descricoes: Record<string, string> = {
    lote: "Número do lote de manutenção",
    rodovia: "Código da rodovia (BR)",
    snv: "Segmento Nacional de Rodovia",
    km: "Quilômetro de localização do elemento",
    km_inicial: "Quilômetro inicial do trecho",
    km_final: "Quilômetro final do trecho",
    latitude: "Coordenada de latitude (GPS)",
    longitude: "Coordenada de longitude (GPS)",
    latitude_inicial: "Coordenada de latitude inicial",
    longitude_inicial: "Coordenada de longitude inicial",
    latitude_final: "Coordenada de latitude final",
    longitude_final: "Coordenada de longitude final",
    lado: "Lado da pista (D - Direito, E - Esquerdo)",
    tipo: "Tipo ou classificação do elemento",
    codigo: "Código de identificação do elemento",
    extensao: "Extensão total em metros ou quilômetros",
    extensao_metros: "Extensão total em metros",
    area_m2: "Área em metros quadrados",
    data_vistoria: "Data de realização da vistoria",
    data_implantacao: "Data de instalação do elemento",
    observacao: "Observações adicionais",
    tipo_demarcacao: "Tipo de demarcação viária",
    cor: "Cor do elemento",
    material: "Material utilizado na fabricação",
    espessura_cm: "Espessura em centímetros",
    largura_cm: "Largura em centímetros",
    quantidade: "Quantidade de elementos",
    dimensoes: "Dimensões do elemento",
    dimensoes_mm: "Dimensões em milímetros",
    suporte: "Tipo de suporte utilizado",
    substrato: "Material do substrato",
    tipo_defensa: "Tipo de defensa metálica",
    tipo_inscricao: "Tipo de inscrição viária",
    tipo_tacha: "Tipo de tacha refletiva",
    espacamento_m: "Espaçamento entre elementos em metros",
    vao_horizontal_m: "Vão horizontal do pórtico em metros",
    altura_livre_m: "Altura livre do pórtico em metros",
  };

  return camposSUPRA
    .filter(campo => campo.field !== null)
    .map(campo => ({
      campo: campo.field,
      nome: campo.header,
      descricao: descricoes[campo.field] || "Campo específico do tipo de elemento",
    }));
};

export default function MinhasNecessidadesRelatorios() {
  const navigate = useNavigate();
  const { data: supervisora } = useSupervisora();
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("dados_rodovias");
  const [gerando, setGerando] = useState(false);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  const exportarAuditoriaGeral = async () => {
    setGerando(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      // Configurações de análise para cada tabela
      const tabelasAuditoria = [
        { nome: "Placas", inventario: "ficha_placa", intervencoes: "ficha_placa_intervencoes" },
        { nome: "Pórticos", inventario: "ficha_porticos", intervencoes: "ficha_porticos_intervencoes" },
        { nome: "Tachas", inventario: "ficha_tachas", intervencoes: "ficha_tachas_intervencoes" },
        { nome: "Cilindros", inventario: "ficha_cilindros", intervencoes: "ficha_cilindros_intervencoes" },
        { nome: "Inscrições", inventario: "ficha_inscricoes", intervencoes: "ficha_inscricoes_intervencoes" },
        { nome: "Marcas Longitudinais", inventario: "ficha_marcas_longitudinais", intervencoes: "ficha_marcas_longitudinais_intervencoes" },
        { nome: "Defensas", inventario: "defensas", intervencoes: "defensas_intervencoes" },
      ];

      for (const tabela of tabelasAuditoria) {
        const sheet = workbook.addWorksheet(tabela.nome);

        // Buscar dados do inventário
        const { data: dadosInventario, error: errorInv } = await supabase
          .from(tabela.inventario as any)
          .select("*")
          .limit(1000);

        if (errorInv) {
          console.error(`Erro ao buscar ${tabela.nome}:`, errorInv);
          continue;
        }

        // Buscar dados das intervenções
        const { data: dadosIntervencoes, error: errorInt } = await supabase
          .from(tabela.intervencoes as any)
          .select("*")
          .limit(1000);

        const totalRegistros = dadosInventario?.length || 0;
        const totalIntervencoes = dadosIntervencoes?.length || 0;

        // Campos excluídos da análise (técnicos)
        const camposExcluidos = ['id', 'user_id', 'created_at', 'updated_at', 'enviado_coordenador'];

        // Obter campos do inventário
        const camposInventario = totalRegistros > 0 
          ? Object.keys(dadosInventario[0]).filter(k => !camposExcluidos.includes(k))
          : [];

        // Obter campos das intervenções
        const camposIntervencoes = totalIntervencoes > 0
          ? Object.keys(dadosIntervencoes[0]).filter(k => !camposExcluidos.includes(k))
          : [];

        // Identificar campos duplicados
        const camposDuplicados = camposInventario.filter(c => camposIntervencoes.includes(c));

        // Análise de uso dos campos
        const analiseInventario = camposInventario.map(campo => {
          const vazios = dadosInventario?.filter((r: any) => !r[campo] || r[campo] === "").length || 0;
          const preenchidos = totalRegistros - vazios;
          const percentualVazio = totalRegistros > 0 ? Math.round((vazios / totalRegistros) * 100) : 0;

          // Verificar valores duplicados com outros campos
          const valoresDuplicados: string[] = [];
          if (preenchidos > 0 && dadosInventario) {
            camposInventario.forEach(outroCampo => {
              if (outroCampo !== campo) {
                const duplicados = dadosInventario.filter((r: any) => 
                  r[campo] && r[outroCampo] && 
                  String(r[campo]).trim() === String(r[outroCampo]).trim()
                ).length;
                if (duplicados > preenchidos * 0.3) { // >30% duplicados
                  valoresDuplicados.push(`${outroCampo} (${Math.round((duplicados/preenchidos)*100)}%)`);
                }
              }
            });
          }

          return {
            campo,
            totalRegistros,
            vazios,
            preenchidos,
            percentualVazio: `${percentualVazio}%`,
            presente_em_intervencoes: camposDuplicados.includes(campo) ? "SIM" : "NÃO",
            valores_duplicados_com: valoresDuplicados.join(", ") || "-",
            status: percentualVazio > 80 ? "⚠️ CAMPO QUASE VAZIO" : percentualVazio > 50 ? "⚠️ POUCO USADO" : "OK",
          };
        });

        // Adicionar estatísticas gerais
        sheet.addRow(["=== ESTATÍSTICAS GERAIS ==="]);
        sheet.addRow(["Total de Registros no Inventário", totalRegistros]);
        sheet.addRow(["Total de Intervenções", totalIntervencoes]);
        sheet.addRow(["Total de Campos no Inventário", camposInventario.length]);
        sheet.addRow(["Total de Campos nas Intervenções", camposIntervencoes.length]);
        sheet.addRow(["Campos Duplicados (ambas tabelas)", camposDuplicados.length]);
        sheet.addRow([]);
        
        sheet.addRow(["=== CAMPOS DUPLICADOS ENTRE INVENTÁRIO E INTERVENÇÕES ==="]);
        camposDuplicados.forEach(c => sheet.addRow([c]));
        sheet.addRow([]);

        sheet.addRow(["=== ANÁLISE DETALHADA DOS CAMPOS DO INVENTÁRIO ==="]);
        sheet.addRow([]);

        // Adicionar análise detalhada
        if (analiseInventario.length > 0) {
          const headers = Object.keys(analiseInventario[0]);
          sheet.addRow(headers);
          
          const headerRow = sheet.lastRow;
          if (headerRow) {
            headerRow.font = { bold: true };
            headerRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF4472C4' }
            };
          }

          analiseInventario.forEach(analise => {
            const row = sheet.addRow(Object.values(analise));
            
            // Destacar campos problemáticos
            if (analise.status.includes("⚠️")) {
              row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEB9C' }
              };
            }
            if (analise.valores_duplicados_com !== "-") {
              row.getCell(7).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE699' }
              };
            }
          });
        }

        // Auto-ajustar largura das colunas
        sheet.columns.forEach(column => {
          if (column) {
            let maxLength = 10;
            column.eachCell?.({ includeEmpty: true }, (cell) => {
              const cellValue = cell.value ? cell.value.toString() : '';
              maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = Math.min(maxLength + 2, 50);
          }
        });
      }

      // Criar aba de resumo executivo
      const resumoSheet = workbook.addWorksheet("RESUMO EXECUTIVO");
      resumoSheet.addRow(["AUDITORIA COMPLETA DE INVENTÁRIO"]);
      resumoSheet.addRow(["Data da Auditoria", new Date().toLocaleString('pt-BR')]);
      resumoSheet.addRow([]);
      resumoSheet.addRow(["Esta auditoria analisa todas as tabelas de inventário para identificar:"]);
      resumoSheet.addRow(["• Campos duplicados entre inventário e intervenções"]);
      resumoSheet.addRow(["• Campos vazios ou pouco utilizados (>80% vazios = ⚠️ QUASE VAZIO)"]);
      resumoSheet.addRow(["• Campos com valores idênticos a outros campos (possível redundância)"]);
      resumoSheet.addRow(["• Estatísticas de uso de cada campo"]);
      resumoSheet.addRow([]);
      resumoSheet.addRow(["LEGENDA DE STATUS:"]);
      resumoSheet.addRow(["⚠️ CAMPO QUASE VAZIO", ">80% dos registros sem valor"]);
      resumoSheet.addRow(["⚠️ POUCO USADO", "50-80% dos registros sem valor"]);
      resumoSheet.addRow(["OK", "<50% dos registros sem valor"]);
      resumoSheet.addRow([]);
      resumoSheet.addRow(["Cada aba contém a análise detalhada de um tipo de inventário."]);

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria_completa_inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Auditoria completa exportada com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar auditoria:", error);
      toast.error("Erro ao exportar auditoria completa");
    } finally {
      setGerando(false);
    }
  };

  const exportarAnalise = async (tipo: "placas" | "porticos") => {
    setGerando(true);
    try {
      const tabela = tipo === "placas" ? "ficha_placa" : "ficha_porticos";
      const orderBy = tipo === "placas" ? "km" : "km";
      
      // Buscar todos os dados
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .order(orderBy);

      if (error) throw error;

      // Buscar lotes e rodovias para nomes legíveis
      const { data: lotes } = await supabase.from("lotes").select("id, numero");
      const { data: rodovias } = await supabase.from("rodovias").select("id, codigo");
      
      const lotesMap = new Map((lotes || []).map(l => [l.id, l.numero]));
      const rodoviasMap = new Map((rodovias || []).map(r => [r.id, r.codigo]));

      // Analisar cada registro
      const dadosAnalise = (data || []).map((item: any) => {
        const alertas: string[] = [];
        
        if (tipo === "placas") {
          // Análise específica para placas
          if (item.modelo && item.codigo && item.modelo.trim() === item.codigo.trim()) {
            alertas.push("MODELO=CODIGO");
          }
          if (item.descricao && item.codigo && item.descricao.trim() === item.codigo.trim()) {
            alertas.push("DESCRICAO=CODIGO");
          }
          if (item.descricao && item.tipo && item.descricao.trim() === item.tipo.trim()) {
            alertas.push("DESCRICAO=TIPO");
          }
          
          const fotosPreenchidas = [
            item.foto_url,
            item.foto_frontal_url,
            item.foto_lateral_url,
            item.foto_posterior_url,
            item.foto_base_url,
            item.foto_identificacao_url
          ].filter(f => f && f.trim() !== "").length;
          
          if (fotosPreenchidas === 0) {
            alertas.push("SEM_FOTOS");
          } else if (fotosPreenchidas > 2) {
            alertas.push("MULTIPLAS_FOTOS");
          }
          
          if (!item.modelo || item.modelo.trim() === "") {
            alertas.push("MODELO_VAZIO");
          }
        }

        const rodovia = rodoviasMap.get(item.rodovia_id);
        
        return {
          lote: lotesMap.get(item.lote_id) || "",
          rodovia: rodovia || "",
          ...item,
          ALERTA_MODELO: (tipo === "placas" && item.modelo === item.codigo) ? "SIM" : "",
          ALERTA_DESCRICAO: (tipo === "placas" && (item.descricao === item.codigo || item.descricao === item.tipo)) ? "SIM" : "",
          ALERTA_FOTO: (tipo === "placas") ? (
            !item.foto_url && !item.foto_frontal_url ? "VAZIO" : 
            ([item.foto_url, item.foto_frontal_url, item.foto_lateral_url, item.foto_posterior_url, item.foto_base_url].filter(f => f).length > 2) ? "MULTIPLAS" : ""
          ) : "",
          STATUS_REVISAO: alertas.length > 0 ? alertas.join(" | ") : "OK",
        };
      });

      // Criar workbook
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Análise");

      // Adicionar dados
      if (dadosAnalise.length > 0) {
        const colunas = Object.keys(dadosAnalise[0]);
        sheet.columns = colunas.map(col => ({ header: col, key: col, width: 20 }));
        dadosAnalise.forEach(row => sheet.addRow(row));

        // Formatar header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };

        // Destacar linhas com alertas
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const statusCell = row.getCell('STATUS_REVISAO');
            if (statusCell.value && statusCell.value !== "OK") {
              row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEB9C' }
              };
            }
          }
        });
      }

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analise_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Análise de ${tipo} exportada com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar análise:", error);
      toast.error("Erro ao exportar análise");
    } finally {
      setGerando(false);
    }
  };

  const gerarRelatorioInicial = async () => {
    try {
      setGerando(true);
      toast.info("Gerando relatório SUPRA...");
      
      const tipoConfig = TIPOS_RELATORIO.find(t => t.value === tipoSelecionado);
      if (!tipoConfig) return;

      let cadastro: any[] = [];

      // Tratamento especial para Dados das Rodovias
      if (tipoSelecionado === "dados_rodovias") {
        const { data: lotesRodovias, error } = await supabase
          .from("lotes_rodovias")
          .select(`
            *,
            lotes (numero),
            rodovias (codigo)
          `);

        if (error) throw error;

        cadastro = (lotesRodovias || []).map((lr: any) => ({
          lote: lr.lotes?.numero || "",
          rodovia: lr.rodovias?.codigo || "",
        }));

        // Gerar Excel simples para Dados das Rodovias (sem formatação SUPRA)
        const workbook = await criarWorkbookComLogos(cadastro, "Dados", {
          logoSupervisoraUrl: supervisora?.logo_url,
          logoOrgaoUrl: supervisora?.usar_logo_orgao_relatorios 
            ? supervisora?.logo_orgao_fiscalizador_url 
            : null,
          nomeEmpresa: supervisora?.nome_empresa,
          contrato: supervisora?.contrato,
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        });
        const nomeArquivo = `Dados_Rodovias_${new Date().toISOString().split("T")[0]}.xlsx`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo;
        link.click();
        window.URL.revokeObjectURL(url);

        toast.success("Relatório gerado com sucesso!");
        return;
      }

      // Para outros tipos, usar formatação SUPRA
      const orderByColumn = (tipoSelecionado === "placas" || tipoSelecionado === "porticos") ? "km" : "km_inicial";
      const { data, error } = await supabase
        .from(tipoConfig.tabelaCadastro as any)
        .select("*")
        .order(orderByColumn);

      if (error) throw error;
      
      // Buscar lotes e rodovias separadamente para mapear os nomes
      const { data: lotes } = await supabase.from("lotes").select("id, numero");
      const { data: rodovias } = await supabase.from("rodovias").select("id, codigo");
      
      const lotesMap = new Map((lotes || []).map(l => [l.id, l.numero]));
      const rodoviasMap = new Map((rodovias || []).map(r => [r.id, r.codigo]));
      
      // Transformar dados
      cadastro = (data || []).map((item: any) => {
        const { id, user_id, lote_id, rodovia_id, created_at, updated_at, enviado_coordenador, ...resto } = item;
        const rodovia = rodoviasMap.get(rodovia_id);
        return {
          lote: lotesMap.get(lote_id) || "",
          rodovia: rodovia || "",
          ...resto,
        };
      });

      if (!cadastro || cadastro.length === 0) {
        toast.warning("Nenhum dado de cadastro encontrado para este tipo");
        return;
      }

      // Criar workbook com formatação SUPRA
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("CADASTRO INICIAL");

      // Obter mapeamento de campos SUPRA
      const camposSUPRA = CAMPOS_SUPRA[tipoSelecionado] || [];
      const cabecalhos = camposSUPRA.map(c => c.header);
      
      // Adicionar cabeçalho SUPRA
      const tituloSUPRA = TITULOS_SUPRA[tipoSelecionado] || tipoConfig.label;
      const contrato = supervisora?.contrato || "Contrato não informado";
      const logoDNIT = supervisora?.usar_logo_orgao_relatorios 
        ? supervisora?.logo_orgao_fiscalizador_url 
        : "/logo-dnit.jpg";
      const logoSupervisora = supervisora?.logo_url || null;

      const linhaInicioDados = await adicionarCabecalhoSUPRA({
        worksheet,
        titulo: tituloSUPRA,
        contrato,
        logoOrgao: logoDNIT,
        logoSupervisora,
        numColunas: cabecalhos.length,
      });

      // Formatar cabeçalhos das colunas
      formatarCabecalhosColunas(worksheet, linhaInicioDados, cabecalhos);

      // Adicionar dados
      const primeiraLinhaDados = linhaInicioDados + 1;
      cadastro.forEach((item: any, index: number) => {
        const row = worksheet.getRow(primeiraLinhaDados + index);
        const valores = camposSUPRA.map(campo => {
          if (campo.field === null) return ""; // Coluna SERVIÇO vazia
          
          const valor = item[campo.field];
          
          // Formatação de valores
          if (valor === null || valor === undefined) return "";
          
          if (typeof valor === "number") {
            // Coordenadas: 6 decimais
            if (campo.field.includes("latitude") || campo.field.includes("longitude")) {
              return Number(valor.toFixed(6));
            }
            // KM: 3 decimais
            if (campo.field.includes("km") && !campo.field.includes("extensao")) {
              return Number(valor.toFixed(3));
            }
            // Área: 2 decimais
            if (campo.field.includes("area_m2")) {
              return Number(valor.toFixed(2));
            }
            return valor;
          }
          
          // Datas
          if (campo.field.includes("data") && valor) {
            try {
              return format(new Date(valor), "dd/MM/yyyy");
            } catch {
              return valor;
            }
          }
          
          return valor;
        });
        
        row.values = valores;
      });

      const ultimaLinhaDados = primeiraLinhaDados + cadastro.length - 1;

      // Formatar células de dados
      formatarCelulasDados(worksheet, primeiraLinhaDados, ultimaLinhaDados);

      // Adicionar rodapé
      adicionarRodape(worksheet, ultimaLinhaDados, cabecalhos.length);

      // Auto-ajustar largura das colunas
      worksheet.columns.forEach((column, index) => {
        let maxLength = cabecalhos[index]?.length || 10;
        column.eachCell?.({ includeEmpty: false }, cell => {
          const cellLength = cell.value ? String(cell.value).length : 10;
          if (cellLength > maxLength) maxLength = cellLength;
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 50);
      });

      // MANUTENÇÃO EXECUTADA (se houver filtro de datas)
      if (tipoConfig.tabelaIntervencoes && (dataInicio || dataFim)) {
        let query = supabase
          .from(tipoConfig.tabelaIntervencoes as any)
          .select("*")
          .order("data_intervencao", { ascending: false });

        if (dataInicio) query = query.gte("data_intervencao", dataInicio);
        if (dataFim) query = query.lte("data_intervencao", dataFim);

        const { data: intervencoesRaw, error: erroIntervencoes } = await query;

        if (!erroIntervencoes && intervencoesRaw && intervencoesRaw.length > 0) {
          const manutencaoSheet = workbook.addWorksheet("MANUTENÇÃO EXECUTADA");
          
          // Mesmo cabeçalho SUPRA
          const linhaInicioManutencao = await adicionarCabecalhoSUPRA({
            worksheet: manutencaoSheet,
            titulo: tituloSUPRA.replace("CONDIÇÃO INICIAL", "MANUTENÇÃO EXECUTADA"),
            contrato,
            logoOrgao: logoDNIT,
            logoSupervisora,
            numColunas: cabecalhos.length,
          });

          formatarCabecalhosColunas(manutencaoSheet, linhaInicioManutencao, cabecalhos);

          // Adicionar dados das intervenções
          const primeiraLinhaManutencao = linhaInicioManutencao + 1;
          intervencoesRaw.forEach((int: any, index: number) => {
            const row = manutencaoSheet.getRow(primeiraLinhaManutencao + index);
            const valores = camposSUPRA.map(campo => {
              if (campo.field === null) return int.motivo || ""; // Coluna SERVIÇO preenchida
              
              const valor = int[campo.field];
              if (valor === null || valor === undefined) return "";
              
              if (typeof valor === "number") {
                if (campo.field.includes("latitude") || campo.field.includes("longitude")) {
                  return Number(valor.toFixed(6));
                }
                if (campo.field.includes("km") && !campo.field.includes("extensao")) {
                  return Number(valor.toFixed(3));
                }
                if (campo.field.includes("area_m2")) {
                  return Number(valor.toFixed(2));
                }
                return valor;
              }
              
              if (campo.field.includes("data") && valor) {
                try {
                  return format(new Date(valor), "dd/MM/yyyy");
                } catch {
                  return valor;
                }
              }
              
              return valor;
            });
            
            row.values = valores;

            // Destacar linhas fora do plano
            if (int.fora_plano_manutencao) {
              row.eachCell((cell) => {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFF3CD" },
                };
                cell.font = {
                  name: "Arial",
                  size: 10,
                  bold: true,
                };
              });
            }
          });

          const ultimaLinhaManutencao = primeiraLinhaManutencao + intervencoesRaw.length - 1;
          formatarCelulasDados(manutencaoSheet, primeiraLinhaManutencao, ultimaLinhaManutencao);
          adicionarRodape(manutencaoSheet, ultimaLinhaManutencao, cabecalhos.length);

          // Auto-ajustar colunas
          manutencaoSheet.columns.forEach((column, index) => {
            let maxLength = cabecalhos[index]?.length || 10;
            column.eachCell?.({ includeEmpty: false }, cell => {
              const cellLength = cell.value ? String(cell.value).length : 10;
              if (cellLength > maxLength) maxLength = cellLength;
            });
            column.width = Math.min(Math.max(maxLength + 2, 12), 50);
          });
        }
      }

      // Aba DIC - Dicionário de Campos
      const dicSheet = workbook.addWorksheet("DIC");
      dicSheet.addRow(["DICIONÁRIO DE CAMPOS"]);
      dicSheet.mergeCells("A1:C1");
      const dicHeader = dicSheet.getCell("A1");
      dicHeader.font = { name: "Arial", size: 14, bold: true };
      dicHeader.alignment = { horizontal: "center", vertical: "middle" };
      dicSheet.getRow(1).height = 25;
      dicSheet.addRow([]);

      const dicData = obterDadosDicionario(tipoSelecionado, camposSUPRA);
      dicSheet.addRow(["Campo", "Nome no Relatório", "Descrição"]);
      const dicHeaderRow = dicSheet.getRow(3);
      dicHeaderRow.font = { name: "Arial", size: 10, bold: true };
      dicHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      dicData.forEach(item => {
        dicSheet.addRow([item.campo, item.nome, item.descricao]);
      });

      dicSheet.getColumn(1).width = 25;
      dicSheet.getColumn(2).width = 30;
      dicSheet.getColumn(3).width = 60;

      // Aba Localização - Dados das Rodovias e Lotes
      const localizacaoSheet = workbook.addWorksheet("Localização");
      localizacaoSheet.addRow(["DADOS DE LOCALIZAÇÃO"]);
      localizacaoSheet.mergeCells("A1:G1");
      const locHeader = localizacaoSheet.getCell("A1");
      locHeader.font = { name: "Arial", size: 14, bold: true };
      locHeader.alignment = { horizontal: "center", vertical: "middle" };
      localizacaoSheet.getRow(1).height = 25;
      localizacaoSheet.addRow([]);

      const { data: rodoviasLoc } = await supabase
        .from("rodovias")
        .select("*")
        .order("codigo");

      const { data: lotesLoc } = await supabase
        .from("lotes")
        .select("*")
        .order("numero");

      const { data: empresasLoc } = await supabase
        .from("empresas")
        .select("*");

      const empresasMapLoc = new Map((empresasLoc || []).map((e: any) => [e.id, e.nome]));
      const rodoviasMapLoc = new Map((rodoviasLoc || []).map((r: any) => [r.id, r.codigo]));

      localizacaoSheet.addRow(["=== RODOVIAS ==="]);
      localizacaoSheet.addRow([]);
      localizacaoSheet.addRow([
        "Código",
        "Descrição",
        "UF",
        "SNV Inicial",
        "SNV Final",
        "Km Inicial",
        "Km Final",
      ]);

      const rodoviaHeaderRow = localizacaoSheet.lastRow;
      if (rodoviaHeaderRow) {
        rodoviaHeaderRow.font = { bold: true };
        rodoviaHeaderRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
      }

      (rodoviasLoc || []).forEach((rod: any) => {
        localizacaoSheet.addRow([
          rod.codigo || "",
          rod.nome || rod.descricao || "",
          rod.uf || "",
          rod.snv_inicial || "",
          rod.snv_final || "",
          rod.km_inicial || "",
          rod.km_final || "",
        ]);
      });

      localizacaoSheet.addRow([]);
      localizacaoSheet.addRow([]);
      localizacaoSheet.addRow(["=== LOTES ==="]);
      localizacaoSheet.addRow([]);
      localizacaoSheet.addRow([
        "Número",
        "Rodovia",
        "Km Inicial",
        "Km Final",
        "Empresa",
      ]);

      const loteHeaderRow = localizacaoSheet.lastRow;
      if (loteHeaderRow) {
        loteHeaderRow.font = { bold: true };
        loteHeaderRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
      }

      (lotesLoc || []).forEach((lote: any) => {
        localizacaoSheet.addRow([
          lote.numero || "",
          rodoviasMapLoc.get(lote.rodovia_id) || "",
          lote.km_inicial || "",
          lote.km_final || "",
          empresasMapLoc.get(lote.empresa_id) || "",
        ]);
      });

      localizacaoSheet.columns.forEach(column => {
        if (column) {
          let maxLength = 10;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50);
        }
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const nomeArquivo = `Relatorio_SUPRA_${tipoConfig.label}_${new Date().toISOString().split("T")[0]}.xlsx`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Relatório SUPRA gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setGerando(false);
    }
  };

  const gerarRelatorioPermanente = async () => {
    try {
      setGerando(true);
      const tipoConfig = TIPOS_RELATORIO.find(t => t.value === tipoSelecionado);
      if (!tipoConfig) return;

      // Dados das Rodovias não tem relatório permanente
      if (tipoSelecionado === "dados_rodovias") {
        toast.info("Dados das Rodovias não possui Relatório Permanente. Use o Relatório Inicial.");
        setGerando(false);
        return;
      }

      // Buscar CADASTRO
      const orderByColumn = (tipoSelecionado === "placas" || tipoSelecionado === "porticos") ? "km" : "km_inicial";
      const { data: cadastroRaw, error: erroCadastro } = await supabase
        .from(tipoConfig.tabelaCadastro as any)
        .select("*")
        .order(orderByColumn);

      if (erroCadastro) throw erroCadastro;
      
      // Buscar lotes e rodovias separadamente para mapear os nomes
      const { data: lotes } = await supabase.from("lotes").select("id, numero");
      const { data: rodovias } = await supabase.from("rodovias").select("id, codigo");
      
      // Criar mapa de lotes e rodovias
      const lotesMap = new Map((lotes || []).map(l => [l.id, l.numero]));
      const rodoviasMap = new Map((rodovias || []).map(r => [r.id, r.codigo]));
      
      // Transformar cadastro: remover IDs técnicos e adicionar nomes legíveis
      const cadastro = (cadastroRaw || []).map((item: any) => {
        const { id, user_id, lote_id, rodovia_id, created_at, updated_at, enviado_coordenador, ...resto } = item;
        const rodovia = rodoviasMap.get(rodovia_id);
        return {
          lote: lotesMap.get(lote_id) || "",
          rodovia: rodovia || "",
          ...resto,
        };
      });

      if (!cadastro || cadastro.length === 0) {
        toast.warning("Nenhum dado de cadastro encontrado para este tipo");
        return;
      }

      // Buscar NECESSIDADES
      const { data: necessidades, error: erroNecessidades } = await supabase
        .from(`necessidades_${tipoSelecionado}` as any)
        .select("*");

      if (erroNecessidades) throw erroNecessidades;

      // Criar mapa de necessidades por cadastro_id
      const necessidadesMap = new Map();
      if (necessidades) {
        necessidades.forEach((nec: any) => {
          if (nec.cadastro_id) {
            necessidadesMap.set(nec.cadastro_id, nec);
          }
        });
      }

      // Mesclar dados: CADASTRO + NECESSIDADES
      const dadosMesclados = (cadastro as any[]).map((item: any) => {
        const necessidade = necessidadesMap.get(item.id);
        return {
          ...item,
          servico: necessidade?.servico || "", // Preenchido se houver necessidade
          observacao_necessidade: necessidade?.observacao || "",
          distancia_match_metros: necessidade?.distancia_match_metros || "",
          arquivo_origem: necessidade?.arquivo_origem || "",
          linha_planilha: necessidade?.linha_planilha || "",
        };
      });

      // Adicionar necessidades SEM match ao cadastro (Inclusões)
      if (necessidades) {
        necessidades.forEach((nec: any) => {
          if (!nec.cadastro_id) {
            dadosMesclados.push({
              ...nec,
              servico: nec.servico,
              observacao_necessidade: nec.observacao || "",
            });
          }
        });
      }

      // Gerar Excel com logos
      const workbook = await criarWorkbookComLogos(dadosMesclados, "Dados", {
        logoSupervisoraUrl: supervisora?.logo_url,
        logoOrgaoUrl: supervisora?.usar_logo_orgao_relatorios 
          ? supervisora?.logo_orgao_fiscalizador_url 
          : null,
        nomeEmpresa: supervisora?.nome_empresa,
        contrato: supervisora?.contrato,
      });

      // Sheet DIC
      const dicData = [
        { Campo: "servico", Descrição: "Tipo de serviço (Inclusão/Substituição/Remoção)" },
        { Campo: "km_inicial", Descrição: "Quilômetro inicial" },
        { Campo: "km_final", Descrição: "Quilômetro final" },
        { Campo: "observacao_necessidade", Descrição: "Observação da necessidade identificada" },
      ];
      const dicSheet = workbook.addWorksheet("DIC");
      dicSheet.addRow(Object.keys(dicData[0]));
      dicData.forEach(row => {
        dicSheet.addRow(Object.values(row));
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const nomeArquivo = `RELATORIO_PERMANENTE_${tipoConfig.label}_${new Date().toISOString().split("T")[0]}.xlsx`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Relatório Permanente gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar relatório permanente:", error);
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoOperaVia} alt="Logo" className="h-12 object-contain" />
              <div>
                <h1 className="text-2xl font-bold">Relatórios de Programa de Sinalização e Segurança Viária</h1>
                <p className="text-sm text-muted-foreground">
                  Gere relatórios inicial e permanente do cadastro
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/minhas-necessidades")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="inicial" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[600px] mx-auto">
            <TabsTrigger value="inicial">Relatório Inicial</TabsTrigger>
            <TabsTrigger value="permanente">Relatório Permanente</TabsTrigger>
            <TabsTrigger value="analise">Análise de Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="inicial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Relatório Inicial
                </CardTitle>
                <CardDescription>
                  Exporta o estado atual do CADASTRO com coluna SERVIÇO vazia para preenchimento posterior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Elemento</label>
                  <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RELATORIO.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de datas para incluir aba de manutenção executada */}
                {tipoSelecionado !== "dados_rodovias" && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium">Período de Manutenção (opcional)</h4>
                    <p className="text-xs text-muted-foreground">
                      Informe o período para incluir aba "MANUTENÇÃO EXECUTADA" no relatório
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data Início</label>
                        <Input
                          type="date"
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data Fim</label>
                        <Input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">O que será exportado:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Aba "CADASTRO INICIAL": Todos os registros do cadastro atual</li>
                    {dataInicio || dataFim ? (
                      <li>Aba "MANUTENÇÃO EXECUTADA": Serviços realizados no período (com destaque para serviços fora do plano)</li>
                    ) : null}
                    <li>Aba "DIC": Dicionário de campos</li>
                  </ul>
                </div>

                <Button
                  onClick={gerarRelatorioInicial}
                  disabled={gerando}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {gerando ? "Gerando..." : "Gerar Relatório Inicial"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permanente" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Relatório Permanente
                </CardTitle>
                <CardDescription>
                  Exporta o CADASTRO mesclado com NECESSIDADES identificadas (coluna serviço preenchida onde há necessidade)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Elemento</label>
                  <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RELATORIO.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">O que será exportado:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Todos os registros do cadastro</li>
                    <li>Coluna "serviço" preenchida onde há necessidade</li>
                    <li>Inclusões (necessidades sem match) adicionadas ao final</li>
                    <li>Observações das necessidades incluídas</li>
                    <li>Sheet DIC com dicionário de campos</li>
                  </ul>
                </div>

                <Button
                  onClick={gerarRelatorioPermanente}
                  disabled={gerando}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {gerando ? "Gerando..." : "Gerar Planilha para o Relatório Permanente"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analise" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exportar Dados para Análise Manual
                </CardTitle>
                <CardDescription>
                  Exporte os dados brutos com análise automática de inconsistências para revisão manual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* NOVA: Auditoria Geral */}
                <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">Auditoria Completa de Inventário</h3>
                      <p className="text-sm text-muted-foreground">
                        Análise detalhada de TODAS as 7 tabelas de inventário
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={exportarAuditoriaGeral} 
                    disabled={gerando}
                    className="w-full"
                    size="lg"
                  >
                    {gerando ? "Gerando Auditoria..." : "🔍 Gerar Auditoria Completa"}
                  </Button>

                  <div className="p-4 bg-background rounded-lg">
                    <h4 className="font-semibold mb-2">O que será exportado:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>7 abas</strong> (uma para cada tipo: Placas, Pórticos, Tachas, Cilindros, Inscrições, Marcas, Defensas)</li>
                      <li><strong>Estatísticas gerais</strong>: total de registros, campos, intervenções</li>
                      <li><strong>Campos duplicados</strong>: presentes no inventário E nas intervenções</li>
                      <li><strong>Análise campo a campo</strong>: quantos vazios, % de uso, valores duplicados</li>
                      <li><strong>Status de cada campo</strong>: OK, ⚠️ POUCO USADO, ⚠️ CAMPO QUASE VAZIO</li>
                      <li><strong>Campos problemáticos</strong> destacados em amarelo</li>
                      <li><strong>Resumo executivo</strong> com instruções de leitura</li>
                    </ul>
                  </div>
                </div>

                {/* Análises individuais */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Análises Individuais (Detalhadas)</h3>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={() => exportarAnalise("placas")} 
                      disabled={gerando}
                      variant="outline"
                      className="w-full"
                    >
                      {gerando ? "Exportando..." : "Exportar Análise de Placas"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Exporta todos os dados de placas com colunas de análise destacando possíveis duplicações e campos vazios
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      onClick={() => exportarAnalise("porticos")} 
                      disabled={gerando}
                      variant="outline"
                      className="w-full"
                    >
                      {gerando ? "Exportando..." : "Exportar Análise de Pórticos"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Exporta todos os dados de pórticos com colunas de análise destacando possíveis inconsistências
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
