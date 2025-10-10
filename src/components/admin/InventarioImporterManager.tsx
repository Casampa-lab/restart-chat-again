import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Image, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";

const INVENTORY_TYPES = [
  { value: "placas", label: "Placas de Sinalização Vertical", table: "ficha_placa" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", table: "ficha_marcas_longitudinais" },
  { value: "cilindros", label: "Cilindros Delimitadores", table: "ficha_cilindros" },
  { value: "inscricoes", label: "Zebrados, Setas, Símbolos e Legendas", table: "ficha_inscricoes" },
  { value: "tachas", label: "Tachas Refletivas", table: "ficha_tachas" },
  { value: "porticos", label: "Pórticos e Braços Projetados", table: "ficha_porticos" },
  { value: "defensas", label: "Defensas", table: "defensas" },
];

export function InventarioImporterManager() {
  const [inventoryType, setInventoryType] = useState<string>("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [selectedLote, setSelectedLote] = useState<string>("");
  const [selectedRodovia, setSelectedRodovia] = useState<string>("");
  const [photoColumnName, setPhotoColumnName] = useState<string>("");
  const [hasPhotos, setHasPhotos] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, numero")
        .order("numero");
      if (error) throw error;
      return data;
    },
  });

  // Buscar rodovias
  const { data: rodovias } = useQuery({
    queryKey: ["rodovias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rodovias")
        .select("id, codigo, nome")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsm') || file.name.endsWith('.xls')) {
        setExcelFile(file);
        toast.success(`Arquivo Excel selecionado: ${file.name}`);
      } else {
        toast.error("Por favor, selecione um arquivo Excel válido (.xlsx, .xlsm, .xls)");
      }
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotos(e.target.files);
      toast.success(`${e.target.files.length} fotos selecionadas`);
    }
  };

  const handleImport = async () => {
    if (!inventoryType) {
      toast.error("Selecione o tipo de inventário");
      return;
    }

    if (!excelFile) {
      toast.error("Selecione o arquivo Excel");
      return;
    }

    if (!selectedLote || !selectedRodovia) {
      toast.error("Selecione o lote e a rodovia");
      return;
    }

    if (hasPhotos && !photoColumnName) {
      toast.error("Informe o nome da coluna que contém os nomes das fotos");
      return;
    }

    if (hasPhotos && (!photos || photos.length === 0)) {
      toast.error("Selecione as fotos para importar");
      return;
    }

    setImporting(true);
    setProgress("Iniciando importação...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // 1. Processar Excel localmente
      setProgress("Processando planilha Excel...");
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("Nenhum registro encontrado na planilha");
      }

      toast.success(`${jsonData.length} registros encontrados na planilha`);

      // 2. Upload das fotos e criar mapeamento
      const photoUrls: Record<string, string> = {};
      const photoArray = photos ? Array.from(photos) : [];

      if (hasPhotos && photoArray.length > 0) {
        setProgress(`Fazendo upload de ${photoArray.length} fotos...`);

        const bucketMap: Record<string, string> = {
          "placas": "placa-photos",
          "marcas_longitudinais": "marcas-longitudinais",
          "cilindros": "cilindros",
          "inscricoes": "inscricoes",
          "tachas": "tachas",
          "porticos": "porticos",
          "defensas": "defensas",
        };

        const bucketName = bucketMap[inventoryType] || "verificacao-photos";

        for (let i = 0; i < photoArray.length; i++) {
          const photo = photoArray[i];
          const timestamp = Date.now();
          const photoPath = `${inventoryType}/${timestamp}_${photo.name}`;

          const { error: photoError } = await supabase.storage
            .from(bucketName)
            .upload(photoPath, photo);

          if (!photoError) {
            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(photoPath);

            // Mapear todas as variações do nome
            const nomeCompleto = photo.name;
            const nomeSemExtensao = nomeCompleto.replace(/\.[^/.]+$/, "").trim();

            const variacoes = [
              nomeSemExtensao,
              nomeSemExtensao.toLowerCase(),
              nomeSemExtensao.toUpperCase(),
              nomeCompleto,
              nomeCompleto.toLowerCase(),
              nomeCompleto.toUpperCase(),
            ];

            variacoes.forEach(variacao => {
              photoUrls[variacao] = urlData.publicUrl;
            });
          }

          if ((i + 1) % 50 === 0 || i === photoArray.length - 1) {
            setProgress(`Upload: ${i + 1}/${photoArray.length} fotos`);
          }
        }

        toast.success(`${photoArray.length} fotos carregadas`);
      }

      // 3. Preparar registros para inserção
      setProgress("Preparando dados para importação...");

      const tableName = INVENTORY_TYPES.find(t => t.value === inventoryType)?.table;
      if (!tableName) throw new Error("Tipo de inventário inválido");

      const recordsToInsert = jsonData.map((row: any) => {
        const record: Record<string, any> = {
          user_id: user.id,
          lote_id: selectedLote,
          rodovia_id: selectedRodovia,
        };

        // Mapear campos do Excel
        for (const [key, value] of Object.entries(row)) {
          // Ignorar colunas vazias, "__empty" ou valores nulos
          if (!key || key.trim() === "" || key.includes("__empty") || key.includes("__EMPTY") || value === null || value === undefined) continue;

          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_").replace(/[()]/g, "");

          // Para defensas, marcas longitudinais, placas, tachas, inscricoes, cilindros e porticos, não adicionar campos automaticamente (serão mapeados explicitamente depois)
          if (inventoryType !== "defensas" && inventoryType !== "marcas_longitudinais" && inventoryType !== "placas" && inventoryType !== "tachas" && inventoryType !== "inscricoes" && inventoryType !== "cilindros" && inventoryType !== "porticos") {
            record[normalizedKey] = value;
          }

          // Se é o campo de foto
          if (hasPhotos && photoColumnName && key === photoColumnName) {
            const photoFileName = value as string;
            if (photoFileName && photoUrls[photoFileName]) {
              record.foto_url = photoUrls[photoFileName];
              
              // Para defensas, extrair data da foto do nome do arquivo
              if (inventoryType === "defensas" && photoFileName) {
                // Tentar extrair data do nome do arquivo (formato: YYYYMMDD ou DD-MM-YYYY)
                const dateMatch = photoFileName.match(/(\d{8})|(\d{2}[-_]\d{2}[-_]\d{4})/);
                if (dateMatch) {
                  let dateStr = dateMatch[0];
                  if (dateStr.length === 8) {
                    // Formato YYYYMMDD
                    const year = dateStr.substring(0, 4);
                    const month = dateStr.substring(4, 6);
                    const day = dateStr.substring(6, 8);
                    record.data_inspecao = `${year}-${month}-${day}`;
                  } else {
                    // Formato DD-MM-YYYY ou DD_MM_YYYY
                    const parts = dateStr.split(/[-_]/);
                    if (parts.length === 3) {
                      record.data_inspecao = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                  }
                }
              }
            }
          }
        }

        // Adicionar valores padrão para defensas
        if (inventoryType === "defensas") {
          // Mapear campos específicos do Excel para o banco
          const excelRow = row as any;
          
          // Campos básicos
          record.br = excelRow.BR || excelRow.br || null;
          record.snv = excelRow.SNV || excelRow.snv || null;
          record.tramo = String(excelRow.Tramo || excelRow.tramo || "");
          record.lado = String(excelRow.Lado || excelRow.lado || "");
          
          // Tipo de defensa (derivado - não está na planilha, usar valor padrão)
          record.tipo_defensa = "Simples";
          
          // Estado de conservação (derivado - não está na planilha, usar valor padrão)
          record.estado_conservacao = "Bom";
          
          // KMs e coordenadas (nota: planilha tem "Latitude Incial" com erro de digitação)
          record.km_inicial = Number(excelRow["Km Inicial"] || excelRow.km_inicial || 0);
          record.km_final = Number(excelRow["Km Final"] || excelRow.km_final || 0);
          record.latitude_inicial = excelRow["Latitude Incial"] || excelRow["Latitude Inicial"] || excelRow.latitude_inicial || null;
          record.longitude_inicial = excelRow["Longitude Inicial"] || excelRow.longitude_inicial || null;
          record.latitude_final = excelRow["Latitude Final"] || excelRow.latitude_final || null;
          record.longitude_final = excelRow["Longitude Final"] || excelRow.longitude_final || null;
          
          // Quantidade de lâminas e extensão
          record.quantidade_laminas = excelRow["Quantidade Lâminas"] || excelRow.quantidade_laminas || null;
          record.comprimento_total_tramo_m = excelRow["Comprimento Total do Tramo (m)"] || excelRow.comprimento_total_tramo_m || null;
          record.extensao_metros = excelRow["Comprimento Total do Tramo (m)"] || excelRow.extensao_metros || 0;
          
          // Função e especificações
          record.funcao = excelRow["Função"] || excelRow.funcao || null;
          record.especificacao_obstaculo_fixo = excelRow["Especificação do Obstáculo Fixo"] || excelRow.especificacao_obstaculo_fixo || null;
          record.id_defensa = excelRow.ID || excelRow.id || excelRow.id_defensa || null;
          
          // Distâncias e risco
          record.distancia_pista_obstaculo_m = excelRow["Distância da pista ao obstáculo (m)"] || excelRow.distancia_pista_obstaculo_m || null;
          record.risco = excelRow.Risco || excelRow.risco || null;
          record.velocidade_kmh = excelRow["Velocidade (km/h)"] || excelRow.velocidade_kmh || null;
          record.vmd_veic_dia = excelRow["VMD (veíc./dia)"] || excelRow.vmd_veic_dia || null;
          record.percentual_veiculos_pesados = excelRow["% Veículos Pesados"] || excelRow.percentual_veiculos_pesados || null;
          
          // Classificações e níveis
          record.geometria = excelRow.Geometria || excelRow.geometria || null;
          record.classificacao_nivel_contencao = excelRow["Classificação do nível de Contenção"] || excelRow.classificacao_nivel_contencao || null;
          record.nivel_contencao_en1317 = excelRow["Nível de contenção EN 1317-2"] || excelRow.nivel_contencao_en1317 || null;
          record.nivel_contencao_nchrp350 = excelRow["Nível de contenção NCHRP 350"] || excelRow.nivel_contencao_nchrp350 || null;
          record.nivel_risco = excelRow["Classificação do nível de Contenção"] || excelRow.nivel_risco || null;
          
          // Espaço de trabalho e terminais
          record.espaco_trabalho = excelRow["Espaço de Trabalho"] || excelRow.espaco_trabalho || null;
          record.terminal_entrada = excelRow["Terminal de Entrada"] || excelRow.terminal_entrada || null;
          record.terminal_saida = excelRow["Terminal de Saída"] || excelRow.terminal_saida || null;
          
          // Adequações
          record.adequacao_funcionalidade_lamina = excelRow["Adequação à funcionalidade - Lâmina"] || excelRow.adequacao_funcionalidade_lamina || null;
          record.adequacao_funcionalidade_laminas_inadequadas = excelRow["Adequação à funcionalidade - Lâminas inadequadas"] || excelRow.adequacao_funcionalidade_laminas_inadequadas || null;
          record.adequacao_funcionalidade_terminais = excelRow["Adequação à funcionalidade - Terminais"] || excelRow.adequacao_funcionalidade_terminais || null;
          record.adequacao_funcionalidade_terminais_inadequados = excelRow["Adequação à funcionalidade - Terminais inadequados"] || excelRow.adequacao_funcionalidade_terminais_inadequados || null;
          
          // Distâncias específicas
          record.distancia_face_defensa_obstaculo_m = excelRow["Distância da face da defensa ao obstáculo(m)"] || excelRow.distancia_face_defensa_obstaculo_m || null;
          record.distancia_bordo_pista_face_defensa_m = excelRow["Distância da linha de bordo da pista à face da defensa (m)"] || excelRow.distancia_bordo_pista_face_defensa_m || null;
          
          // Link da fotografia
          record.link_fotografia = excelRow["Link da Fotografia"] || excelRow.link_fotografia || null;
          
          // Campos obrigatórios com defaults (data_inspecao já pode ter sido definida pela foto)
          if (!record.data_inspecao) {
            record.data_inspecao = record.data || new Date().toISOString().split('T')[0];
          }
          record.extensao_metros = Number(record.comprimento_total_tramo_m || record.extensao_metros || record.extensao_m || 0);
          record.necessita_intervencao = Boolean(record.necessita_intervencao || false);
        }

        // Adicionar mapeamento específico para marcas longitudinais
        if (inventoryType === "marcas_longitudinais") {
          const excelRow = row as any;
          
          // BR - Rodovia (não está na tabela, mas pode ser usado depois)
          const br = excelRow.BR || excelRow.br || excelRow["br"] || null;
          
          // SNV - SNV de implantação
          record.snv = excelRow.SNV || excelRow.snv || excelRow["SNV"] || null;
          
          // Código - Código de identificação do tipo de linha
          record.tipo_demarcacao = excelRow["Código"] || excelRow.Codigo || excelRow.codigo || excelRow["codigo"] || null;
          
          // Posição - Posição da linha (não está no banco, incluir em observações se necessário)
          const posicao = excelRow["Posição"] || excelRow.Posicao || excelRow.posicao || null;
          
          // Largura da Faixa (m) - converter de metros para centímetros
          const larguraMetros = excelRow["Largura da Faixa (m)"] || excelRow["Largura da Faixa m"] || excelRow["Largura da Faixa"] || excelRow.largura_da_faixa_m || excelRow.largura;
          record.largura_cm = larguraMetros && larguraMetros !== "-" && !isNaN(Number(larguraMetros)) ? Number(larguraMetros) * 100 : null;
          
          // Km Inicial
          const kmIni = excelRow["Km Inicial"] || excelRow["Km inicial"] || excelRow.km_inicial || excelRow["km inicial"] || 0;
          record.km_inicial = kmIni && kmIni !== "-" ? Number(kmIni) : 0;
          
          // Latitude Inicial
          const latIni = excelRow["Latitude Inicial"] || excelRow["Latitude inicial"] || excelRow.latitude_inicial || excelRow["latitude inicial"] || null;
          record.latitude_inicial = latIni && latIni !== "-" ? Number(latIni) : null;
          
          // Longitude Inicial
          const lngIni = excelRow["Longitude Inicial"] || excelRow["Longitude inicial"] || excelRow.longitude_inicial || excelRow["longitude inicial"] || null;
          record.longitude_inicial = lngIni && lngIni !== "-" ? Number(lngIni) : null;
          
          // Km Final
          const kmFim = excelRow["Km Final"] || excelRow["Km final"] || excelRow.km_final || excelRow["km final"] || 0;
          record.km_final = kmFim && kmFim !== "-" ? Number(kmFim) : 0;
          
          // Latitude Final
          const latFim = excelRow["Latitude Final"] || excelRow["Latitude final"] || excelRow.latitude_final || excelRow["latitude final"] || null;
          record.latitude_final = latFim && latFim !== "-" ? Number(latFim) : null;
          
          // Longitude Final
          const lngFim = excelRow["Longitude Final"] || excelRow["Longitude final"] || excelRow.longitude_final || excelRow["longitude final"] || null;
          record.longitude_final = lngFim && lngFim !== "-" ? Number(lngFim) : null;
          
          // Traço (m)
          const traco = excelRow["Traço (m)"] || excelRow["Traço"] || excelRow.traco_m || excelRow.traco || null;
          
          // Espaçamento (m)
          const espacamento = excelRow["Espaçamento (m)"] || excelRow["Espaçamento"] || excelRow.espacamento_m || excelRow.espacamento || null;
          
          // Material - Material utilizado
          record.material = excelRow.Material || excelRow.material || excelRow["material"] || null;
          
          // Outros materiais - Detalhamento
          const outrosMateriais = excelRow["Outros materiais"] || excelRow["Outros Materiais"] || excelRow.outros_materiais || null;
          
          // Extensão (km) - converter para metros
          const extensaoKm = excelRow["Extensão (km)"] || excelRow["Extensão km"] || excelRow["Extensão"] || excelRow.extensao_km || excelRow.extensao;
          record.extensao_metros = extensaoKm && extensaoKm !== "-" && !isNaN(Number(extensaoKm)) ? Number(extensaoKm) * 1000 : null;
          
          // Área (m²)
          const area = excelRow["Área (m²)"] || excelRow["Área"] || excelRow.area_m2 || excelRow.area || null;
          
          // Montar observações com todos os campos adicionais
          const observacoes = [];
          if (br && br !== "-") observacoes.push(`BR: ${br}`);
          if (posicao && posicao !== "-") observacoes.push(`Posição: ${posicao}`);
          if (traco && traco !== "-") observacoes.push(`Traço: ${traco}m`);
          if (espacamento && espacamento !== "-") observacoes.push(`Espaçamento: ${espacamento}m`);
          if (outrosMateriais && outrosMateriais !== "-") observacoes.push(`Outros materiais: ${outrosMateriais}`);
          if (area && area !== "-") observacoes.push(`Área: ${area}m²`);
          
          record.observacao = observacoes.length > 0 ? observacoes.join(" | ") : null;
          
          // Campos com valores padrão
          record.cor = "Branca"; // Padrão
          record.estado_conservacao = "Bom"; // Padrão
          record.espessura_cm = null; // Não há na planilha
          record.data_vistoria = new Date().toISOString().split('T')[0]; // Data atual
          
          // Log para debug
          console.log("Marcas Longitudinais - Record processado:", record);
        }

        // Adicionar mapeamento específico para placas
        if (inventoryType === "placas") {
          const excelRow = row as any;
          
          // Campos básicos de identificação
          record.br = excelRow.BR || excelRow.br || null;
          record.snv = excelRow.SNV || excelRow.snv || null;
          record.tipo = excelRow["Tipo de placa"] || excelRow.tipo_de_placa || excelRow.tipo || null;
          record.codigo = excelRow["Código da placa"] || excelRow.codigo_da_placa || excelRow.codigo || null;
          record.velocidade = excelRow.Velocidade || excelRow.velocidade ? String(excelRow.Velocidade || excelRow.velocidade) : null;
          record.lado = excelRow.Lado || excelRow.lado || null;
          
          // Posição (guardar em descricao ou observação se não houver campo específico)
          const posicao = excelRow["Posição"] || excelRow.posicao || null;
          
          // Localização
          record.km = Number(excelRow.Km || excelRow.km || 0);
          record.latitude = excelRow.Latitude || excelRow.latitude || null;
          record.longitude = excelRow.Longitude || excelRow.longitude || null;
          
          // Detalhamento (página) - guardar em numero_patrimonio ou descricao
          const detalhamentoPagina = excelRow["Detalhamento (página)"] || excelRow.detalhamento_pagina || excelRow.detalhamento || null;
          
          // Suporte
          record.suporte = excelRow["Tipo de Suporte"] || excelRow.tipo_de_suporte || excelRow.suporte || null;
          record.qtde_suporte = excelRow["Quantidade de Suporte"] || excelRow.quantidade_de_suporte || excelRow.qtde_suporte ? Number(excelRow["Quantidade de Suporte"] || excelRow.quantidade_de_suporte || excelRow.qtde_suporte) : null;
          
          // Seção do suporte (guardar em dimensoes_mm ou descrição)
          const tipoSecaoSuporte = excelRow["Tipo de Seção de Suporte"] || excelRow.tipo_de_secao_de_suporte || null;
          const secaoSuporteMm = excelRow["Seção do Suporte (mm)"] || excelRow.secao_do_suporte_mm || excelRow.secao_suporte || null;
          
          // Substrato
          record.substrato = excelRow["Tipo de Substrato"] || excelRow.tipo_de_substrato || excelRow.substrato || null;
          
          // SI (Sinal Impresso) - guardar em descrição
          const sinalImpresso = excelRow["SI (Sinal Impresso)"] || excelRow.si_sinal_impresso || excelRow.si || null;
          
          // Película de fundo
          const tipoPeliculaFundo = excelRow["Tipo (película fundo)"] || excelRow.tipo_pelicula_fundo || null;
          const corPeliculaFundo = excelRow["Cor (película fundo)"] || excelRow.cor_pelicula_fundo || null;
          const retroFundo = excelRow["Retrorrefletância (película fundo)"] || excelRow.retrorrefletancia_pelicula_fundo || excelRow.retro_fundo || null;
          
          // Montar string de película (combinando tipo e cor do fundo)
          const peliculaParts = [];
          if (tipoPeliculaFundo) peliculaParts.push(`Tipo ${tipoPeliculaFundo}`);
          if (corPeliculaFundo) peliculaParts.push(corPeliculaFundo);
          record.pelicula = peliculaParts.length > 0 ? peliculaParts.join(" - ") : null;
          
          // Retrorrefletividade do fundo
          record.retrorrefletividade = retroFundo ? Number(retroFundo) : null;
          
          // Película legenda/orla (guardar em descrição)
          const tipoPeliculaLegenda = excelRow["Tipo (película legenda/orla)"] || excelRow.tipo_pelicula_legenda_orla || null;
          const corPeliculaLegenda = excelRow["Cor (película legenda/orla)"] || excelRow.cor_pelicula_legenda_orla || null;
          const retroLegenda = excelRow["Retrorrefletância (película legenda/orla)"] || excelRow.retrorrefletancia_pelicula_legenda_orla || excelRow.retro_legenda || null;
          
          // Dimensões
          const larguraM = excelRow["Largura (m)"] || excelRow.largura_m || excelRow.largura || null;
          const alturaM = excelRow["Altura (m)"] || excelRow.altura_m || excelRow.altura || null;
          const areaM2 = excelRow["Área (m²)"] || excelRow.area_m2 || excelRow.area || null;
          
          record.distancia_m = larguraM ? Number(larguraM) : null;
          record.altura_m = alturaM && alturaM !== "-" ? Number(alturaM) : null;
          record.area_m2 = areaM2 ? Number(areaM2) : null;
          
          // Dimensões em mm (para compatibilidade)
          if (larguraM && alturaM && alturaM !== "-") {
            record.dimensoes_mm = `${(Number(larguraM) * 1000).toFixed(0)}x${(Number(alturaM) * 1000).toFixed(0)}`;
          } else if (larguraM) {
            record.dimensoes_mm = `Ø ${(Number(larguraM) * 1000).toFixed(0)}`;
          }
          
          // Link da fotografia
          const linkFoto = excelRow["Link da Fotografia"] || excelRow.link_da_fotografia || excelRow.link_fotografia || null;
          
          // Montar descrição com todos os campos adicionais
          const descricaoParts = [];
          if (posicao) descricaoParts.push(`Posição: ${posicao}`);
          if (detalhamentoPagina) descricaoParts.push(`Detalhamento (pág.): ${detalhamentoPagina}`);
          if (tipoSecaoSuporte) descricaoParts.push(`Seção suporte: ${tipoSecaoSuporte}`);
          if (secaoSuporteMm) descricaoParts.push(`Dimensão seção: ${secaoSuporteMm}mm`);
          if (sinalImpresso) descricaoParts.push(`Sinal Impresso: ${sinalImpresso}`);
          if (tipoPeliculaLegenda) descricaoParts.push(`Película legenda tipo: ${tipoPeliculaLegenda}`);
          if (corPeliculaLegenda) descricaoParts.push(`Película legenda cor: ${corPeliculaLegenda}`);
          if (retroLegenda) descricaoParts.push(`Retro legenda: ${retroLegenda} cd.lux/m²`);
          if (linkFoto) descricaoParts.push(`Link foto: ${linkFoto}`);
          
          record.descricao = descricaoParts.length > 0 ? descricaoParts.join(" | ") : null;
          
          // Data de vistoria padrão
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para tachas
        if (inventoryType === "tachas") {
          const excelRow = row as any;
          
          // BR - Rodovia (não está na tabela de tachas, mas guardar em observação se necessário)
          const br = excelRow.BR || excelRow.br || null;
          
          // SNV - SNV de implantação
          record.snv = excelRow.SNV || excelRow.snv || null;
          
          // Descrição - Descrição do dispositivo
          record.descricao = excelRow["Descrição"] || excelRow.descricao || null;
          
          // Corpo - Material do corpo da tacha
          record.corpo = excelRow.Corpo || excelRow.corpo || null;
          
          // Refletivo - Tipo do refletivo a ser utilizado
          record.refletivo = excelRow.Refletivo || excelRow.refletivo || null;
          
          // Cor do refletivo
          record.cor_refletivo = excelRow["Cor do refletivo"] || excelRow.cor_do_refletivo || excelRow.cor_refletivo || null;
          
          // Km Inicial
          record.km_inicial = Number(excelRow["Km Inicial"] || excelRow.km_inicial || 0);
          
          // Latitude Inicial
          record.latitude_inicial = excelRow["Latitude Inicial"] || excelRow.latitude_inicial || null;
          
          // Longitude Inicial
          record.longitude_inicial = excelRow["Longitude Inicial"] || excelRow.longitude_inicial || null;
          
          // km Final
          record.km_final = Number(excelRow["km Final"] || excelRow.km_final || 0);
          
          // Latitude Final
          record.latitude_final = excelRow["Latitude Final"] || excelRow.latitude_final || null;
          
          // Longitude Final
          record.longitude_final = excelRow["Longitude Final"] || excelRow.longitude_final || null;
          
          // Extensão (km)
          const extensaoKm = excelRow["Extensão (km)"] || excelRow["Extensão km"] || excelRow.extensao_km || excelRow.extensao || null;
          record.extensao_km = extensaoKm ? Number(extensaoKm) : null;
          
          // Local de implantação
          record.local_implantacao = excelRow["Local de implantação"] || excelRow.local_de_implantacao || excelRow.local_implantacao || null;
          
          // Espaçamento
          const espacamento = excelRow.Espaçamento || excelRow.espacamento || null;
          record.espacamento_m = espacamento ? Number(espacamento) : null;
          
          // Quantidade
          const quantidade = excelRow.Quantidade || excelRow.quantidade || 1;
          record.quantidade = Number(quantidade);
          
          // Montar observações com BR se houver
          if (br) {
            record.observacao = `BR: ${br}`;
          }
          
          // Data de vistoria padrão
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para inscrições (zebrados, setas, símbolos e legendas)
        if (inventoryType === "inscricoes") {
          const excelRow = row as any;
          
          // BR - Rodovia (não está na tabela de inscrições, guardar em observação se necessário)
          const br = excelRow.BR || excelRow.br || null;
          
          // SNV - SNV de implantação
          const snv = excelRow.SNV || excelRow.snv || null;
          
          // Sigla - Código de identificação do tipo marca transversal
          const sigla = excelRow.Sigla || excelRow.sigla || null;
          
          // Descrição - Descrição da identificação do tipo marca transversal
          const descricao = excelRow["Descrição"] || excelRow.descricao || null;
          
          // Tipo de inscrição (combinar sigla e descrição)
          const tiposParts = [];
          if (sigla) tiposParts.push(sigla);
          if (descricao) tiposParts.push(descricao);
          record.tipo_inscricao = tiposParts.length > 0 ? tiposParts.join(" - ") : "Não especificado";
          
          // Cor - Cor da inscrição no pavimento
          record.cor = excelRow.Cor || excelRow.cor || "Branca";
          
          // Km - Km de implantação (usar como inicial e final)
          const km = excelRow.Km || excelRow.km || null;
          record.km_inicial = km ? Number(km) : null;
          record.km_final = km ? Number(km) : null;
          
          // Latitude - Latitude de implantação
          record.latitude_inicial = excelRow.Latitude || excelRow.latitude || null;
          record.longitude_inicial = excelRow.Longitude || excelRow.longitude || null;
          
          // Usar as mesmas coordenadas para final se não houver finais específicas
          record.latitude_final = record.latitude_inicial;
          record.longitude_final = record.longitude_inicial;
          
          // Material - Especificação material utilizado
          record.material_utilizado = excelRow.Material || excelRow.material || null;
          
          // Outros materiais - Detalhamento para outros tipos de materiais
          const outrosMateriais = excelRow["Outros materiais"] || excelRow.outros_materiais || null;
          
          // Área (m²)
          const area = excelRow["Área (m²)"] || excelRow.area_m2 || excelRow.area || null;
          record.area_m2 = area ? Number(area) : null;
          
          // Montar observações com todos os campos adicionais
          const observacoes = [];
          if (br) observacoes.push(`BR: ${br}`);
          if (snv) observacoes.push(`SNV: ${snv}`);
          if (outrosMateriais && outrosMateriais !== "-") observacoes.push(`Outros materiais: ${outrosMateriais}`);
          
          record.observacao = observacoes.length > 0 ? observacoes.join(" | ") : null;
          
          // Campos com valores padrão
          record.estado_conservacao = "Bom"; // Padrão
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para cilindros delimitadores
        if (inventoryType === "cilindros") {
          const excelRow = row as any;
          
          // BR - Rodovia (não está na tabela, guardar em observação se necessário)
          const br = excelRow.BR || excelRow.br || null;
          
          // SNV - SNV de implantação
          record.snv = excelRow.SNV || excelRow.snv || null;
          
          // Cor (Corpo) - Cor do corpo utilizada
          record.cor_corpo = excelRow["Cor (Corpo)"] || excelRow.cor_corpo || excelRow.cor || "Não especificado";
          
          // Cor (Refletivo) - Cor da película utilizada
          record.cor_refletivo = excelRow["Cor (Refletivo)"] || excelRow.cor_refletivo || null;
          
          // Tipo Refletivo - Tipo da película do refletivo
          record.tipo_refletivo = excelRow["Tipo Refletivo"] || excelRow.tipo_refletivo || null;
          
          // Km Inicial
          record.km_inicial = Number(excelRow["Km Inicial"] || excelRow.km_inicial || 0);
          
          // Latitude Inicial
          record.latitude_inicial = excelRow["Latitude Inicial"] || excelRow.latitude_inicial || null;
          
          // Longitude Inicial
          record.longitude_inicial = excelRow["Longitude Inicial"] || excelRow.longitude_inicial || null;
          
          // km Final
          record.km_final = Number(excelRow["km Final"] || excelRow.km_final || 0);
          
          // Latitude Final
          record.latitude_final = excelRow["Latitude Final"] || excelRow.latitude_final || null;
          
          // Longitude Final
          record.longitude_final = excelRow["Longitude Final"] || excelRow.longitude_final || null;
          
          // Extensão (km)
          const extensaoKm = excelRow["Extensão (km)"] || excelRow["Extensão km"] || excelRow.extensao_km || excelRow.extensao || null;
          record.extensao_km = extensaoKm ? Number(extensaoKm) : null;
          
          // Local de Implantação
          record.local_implantacao = excelRow["Local de Implantação"] || excelRow.local_de_implantacao || excelRow.local_implantacao || null;
          
          // Espaçamento
          const espacamento = excelRow.Espaçamento || excelRow.espacamento || null;
          record.espacamento_m = espacamento ? Number(espacamento) : null;
          
          // Quantidade
          const quantidade = excelRow.Quantidade || excelRow.quantidade || null;
          record.quantidade = quantidade ? Number(quantidade) : null;
          
          // Montar observações com BR se houver
          if (br) {
            record.observacao = `BR: ${br}`;
          }
          
          // Data de intervenção padrão (cilindros usa data_intervencao em vez de data_vistoria)
          record.data_intervencao = new Date().toISOString().split('T')[0];
        }

        // Adicionar mapeamento específico para pórticos, semipórticos e braços projetados
        if (inventoryType === "porticos") {
          const excelRow = row as any;
          
          // BR - Rodovia (não está na tabela, guardar em observação se necessário)
          const br = excelRow.BR || excelRow.br || null;
          
          // SNV - SNV de implantação
          record.snv = excelRow.SNV || excelRow.snv || null;
          
          // Tipo - Tipo do suporte
          record.tipo = excelRow.Tipo || excelRow.tipo || "Pórtico";
          
          // Altura Livre (m) - Altura livre do suporte
          const alturaLivre = excelRow["Altura Livre (m)"] || excelRow.altura_livre_m || excelRow.altura_livre || null;
          record.altura_livre_m = alturaLivre ? Number(alturaLivre) : null;
          
          // Vão Horizontal - Vão horizontal do suporte
          const vaoHorizontal = excelRow["Vão Horizontal"] || excelRow.vao_horizontal || excelRow.vao_horizontal_m || null;
          record.vao_horizontal_m = vaoHorizontal ? Number(vaoHorizontal) : null;
          
          // Lado - Lado de implantação do suporte
          record.lado = excelRow.Lado || excelRow.lado || null;
          
          // Km - Km de implantação
          record.km = Number(excelRow.Km || excelRow.km || 0);
          
          // Latitude - Latitude de implantação
          record.latitude = excelRow.Latitude || excelRow.latitude || null;
          
          // Longitude - Longitude de implantação
          record.longitude = excelRow.Longitude || excelRow.longitude || null;
          
          // Link da Fotografia
          const linkFoto = excelRow["Link da Fotografia"] || excelRow.link_da_fotografia || excelRow.link_fotografia || null;
          
          // Montar observações com BR e link de foto se houver
          const observacoes = [];
          if (br) observacoes.push(`BR: ${br}`);
          if (linkFoto) observacoes.push(`Link foto: ${linkFoto}`);
          
          record.observacao = observacoes.length > 0 ? observacoes.join(" | ") : null;
          
          // Campos com valores padrão
          record.estado_conservacao = "Bom"; // Padrão
          record.data_vistoria = new Date().toISOString().split('T')[0];
        }

        return record;
      });

      // 4. Inserir em lotes
      setProgress("Inserindo dados no banco...");
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        const batch = recordsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from(tableName as any)
          .insert(batch as any);

        if (insertError) {
          console.error("Erro ao inserir batch:", insertError);
          throw insertError;
        }

        imported += batch.length;
        setProgress(`Importando: ${imported}/${recordsToInsert.length} registros`);
      }

      setProgress("");
      toast.success(`Importação concluída! ${imported} registros importados${hasPhotos ? ` com ${photoArray.length} fotos` : ''}.`);

      // Limpar formulário
      setExcelFile(null);
      setPhotos(null);
      setPhotoColumnName("");
      setHasPhotos(false);
      setProgress("");

    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error("Erro ao importar inventário: " + (error.message || "Erro desconhecido"));
      setProgress("");
    } finally {
      setImporting(false);
    }
  };

  const selectedType = INVENTORY_TYPES.find(t => t.value === inventoryType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importação Genérica de Inventários
        </CardTitle>
        <CardDescription>
          Importe dados de inventário a partir de planilhas Excel com ou sem fotos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este sistema permite importar qualquer tipo de inventário. Selecione o tipo, faça upload do Excel e, 
            se houver fotos, marque a opção correspondente, informe a letra da coluna do Excel que contém os nomes das fotos (ex: A, B, AA, AB, AC) e selecione as fotos.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inventory-type">Tipo de Inventário *</Label>
            <Select value={inventoryType} onValueChange={setInventoryType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de inventário" />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">
                Tabela: {selectedType.table}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lote">Lote *</Label>
              <Select value={selectedLote} onValueChange={setSelectedLote}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes?.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rodovia">Rodovia *</Label>
              <Select value={selectedRodovia} onValueChange={setSelectedRodovia}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a rodovia" />
                </SelectTrigger>
                <SelectContent>
                  {rodovias?.map((rodovia) => (
                    <SelectItem key={rodovia.id} value={rodovia.id}>
                      {rodovia.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excel-file">Arquivo Excel *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xlsm,.xls"
                onChange={handleExcelChange}
                className="cursor-pointer"
              />
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            </div>
            {excelFile && (
              <p className="text-xs text-muted-foreground">
                Arquivo selecionado: {excelFile.name}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
            <Checkbox 
              id="has-photos" 
              checked={hasPhotos} 
              onCheckedChange={(checked) => setHasPhotos(checked as boolean)}
            />
            <label
              htmlFor="has-photos"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Este inventário inclui fotos
            </label>
          </div>

          {hasPhotos && (
            <>
              <div className="space-y-2">
                <Label htmlFor="photo-column">Letra da Coluna das Fotos *</Label>
                <Input
                  id="photo-column"
                  placeholder="Ex: AA, AB, AC, etc..."
                  value={photoColumnName}
                  onChange={(e) => setPhotoColumnName(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">
                  Informe a letra da coluna no Excel que contém os nomes dos arquivos de foto (ex: A, B, C, ... Z, AA, AB, AC, AD, ...)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photos">Fotos *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotosChange}
                    className="cursor-pointer"
                  />
                  <Image className="h-5 w-5 text-muted-foreground" />
                </div>
                {photos && (
                  <p className="text-xs text-muted-foreground">
                    {photos.length} fotos selecionadas
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Selecione todas as fotos. Você pode selecionar múltiplos arquivos de uma vez.
                </p>
              </div>
            </>
          )}

          {progress && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{progress}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleImport} 
            disabled={importing || !inventoryType || !excelFile || !selectedLote || !selectedRodovia}
            className="w-full"
            size="lg"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar Inventário
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}