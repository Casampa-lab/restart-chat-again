import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de tipos para tabelas
const INVENTORY_TABLES: Record<string, string> = {
  placas: "ficha_placa",
  necessidades_placas: "necessidades_placas",
  marcas_longitudinais: "ficha_marcas_longitudinais",
  cilindros: "ficha_cilindros",
  inscricoes: "ficha_inscricoes",
  tachas: "ficha_tachas",
  porticos: "ficha_porticos",
  defensas: "defensas",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter usuário autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autenticado");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    // Parse do FormData
    const formData = await req.formData();
    const excelFile = formData.get("excel") as File;
    const inventoryType = formData.get("inventory_type") as string;
    const loteId = formData.get("lote_id") as string;
    const rodoviaId = formData.get("rodovia_id") as string;
    const hasPhotos = formData.get("has_photos") === "true";
    const photoColumnName = formData.get("photo_column_name") as string;

    if (!excelFile || !inventoryType || !loteId || !rodoviaId) {
      throw new Error("Dados incompletos");
    }

    const tableName = INVENTORY_TABLES[inventoryType];
    if (!tableName) {
      throw new Error("Tipo de inventário inválido");
    }

    // Buscar configuração da rodovia (tolerância GPS)
    const { data: rodoviaConfig } = await supabase
      .from("rodovias")
      .select("tolerancia_match_metros")
      .eq("id", rodoviaId)
      .single();

    const toleranciaMetros = rodoviaConfig?.tolerancia_match_metros || 50;
    console.log(`Usando tolerância GPS de ${toleranciaMetros}m para matches`);


    // Processar Excel
    const arrayBuffer = await excelFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter letra da coluna para nome do campo
    let photoFieldName = photoColumnName;
    if (hasPhotos && photoColumnName) {
      // Se for uma letra de coluna (ex: AA, AB), pegar o header dessa coluna
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const colIndex = XLSX.utils.decode_col(photoColumnName);
      
      // Pegar o valor do header (primeira linha) dessa coluna
      const headerCell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: colIndex })];
      if (headerCell && headerCell.v) {
        photoFieldName = headerCell.v.toString();
        console.log(`Coluna ${photoColumnName} corresponde ao campo: ${photoFieldName}`);
      }
    }
    
    // Converter para JSON, começando da linha correta
    // Detectar se a primeira linha é um título genérico
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const firstRowData: any = {};
    
    // Ler primeira linha
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        firstRowData[col] = cell.v.toString().toLowerCase();
      }
    }
    
    // Verificar se primeira linha parece ser título (ex: tem "planilha", "cadastro", etc)
    const firstRowValues = Object.values(firstRowData).join(' ');
    const isTitleRow = firstRowValues.includes('planilha') || 
                       firstRowValues.includes('cadastro') || 
                       firstRowValues.includes('relatório');
    
    let jsonData;
    if (isTitleRow) {
      console.log("Detectado título na primeira linha, pulando para linha 2");
      // Pular primeira linha e usar segunda como header
      const dataRange = { 
        ...range, 
        s: { ...range.s, r: range.s.r + 1 } 
      };
      worksheet['!ref'] = XLSX.utils.encode_range(dataRange);
      jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    } else {
      jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    }

    // Filtrar linhas vazias - uma linha é considerada vazia se TODOS os campos são null/undefined/empty
    jsonData = jsonData.filter((row: any) => {
      // Se a linha não existe ou é vazia, retornar false
      if (!row || !Array.isArray(row)) return false;
      
      // Verificar se há pelo menos um valor não vazio na linha
      return row.some((cell: any) => {
        return cell !== null && 
               cell !== undefined && 
               cell !== '' && 
               String(cell).trim() !== '';
      });
    });

    console.log(`Processando ${jsonData.length} registros (após filtrar vazios) para ${tableName}`);

    // Normalizar chaves do Excel (remover espaços extras)
    const normalizedData = jsonData.map((row: any) => {
      const normalizedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        // Normalizar a chave: remover espaços extras, trim
        const normalizedKey = String(key).replace(/\s+/g, ' ').trim();
        normalizedRow[normalizedKey] = value;
      }
      return normalizedRow;
    });

    console.log("=== PRIMEIRA LINHA NORMALIZADA ===");
    if (normalizedData.length > 0) {
      console.log("Colunas:", Object.keys(normalizedData[0]));
      console.log("Dados:", normalizedData[0]);
      
      // Log específico para cilindros
      if (inventoryType === "cilindros") {
        console.log("=== CILINDROS - DADOS BRUTOS ===");
        for (const [key, value] of Object.entries(normalizedData[0])) {
          if (key.toLowerCase().includes('espaçamento') || key.toLowerCase().includes('quantidade')) {
            console.log(`[CILINDROS] Chave: "${key}", Valor: "${value}", Tipo: ${typeof value}, Vazio?: ${value === '' || value === null || value === undefined}`);
          }
        }
      }
      
      // Log específico para Descrição em tachas
      if (inventoryType === "tachas") {
        for (const [key, value] of Object.entries(normalizedData[0])) {
          if (key.toLowerCase().includes('descri')) {
            console.log(`[TACHAS - DESCRICAO DETECTADA] Chave: "${key}", Valor: "${value}", Tipo: ${typeof value}, Vazio?: ${value === '' || value === null || value === undefined}`);
          }
        }
      }
      
      // Log específico para campos que podem conter porcentagem
      for (const [key, value] of Object.entries(normalizedData[0])) {
        if (typeof value === 'string' && value.includes('%')) {
          console.log(`[PERCENT DETECTION] Campo: "${key}", Valor: "${value}", Tipo: ${typeof value}`);
        }
      }
    }

    // Processar fotos se houver
    const photoMap: Record<string, string> = {};
    
    if (hasPhotos && photoFieldName) {
      const photoFiles: File[] = [];
      
      // Coletar todos os arquivos de foto do FormData
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("photo_") && value instanceof File) {
          photoFiles.push(value);
        }
      }

      console.log(`Processando ${photoFiles.length} fotos`);

      // Upload das fotos para Storage
      for (const photo of photoFiles) {
        const fileName = photo.name;
        const fileExt = fileName.split(".").pop();
        const timestamp = Date.now();
        const storagePath = `${inventoryType}/${timestamp}_${fileName}`;

        const arrayBuffer = await photo.arrayBuffer();
        
        // Determinar bucket correto baseado no tipo de inventário
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
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, arrayBuffer, {
            contentType: photo.type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`Erro ao fazer upload da foto ${fileName}:`, uploadError);
          continue;
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);

        photoMap[fileName] = urlData.publicUrl;
        console.log(`Foto ${fileName} uploaded para ${storagePath}`);
      }
    }

    // Mapeamento de campos do Excel para campos da tabela
    const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
      necessidades_placas: {
        "código_da_placa": "codigo",
        "codigo_da_placa": "codigo",
        "código": "codigo",
        "tipo_da_placa": "tipo",
        "tipo": "tipo",
        "altura_(m)": "altura_m",
        "altura_m": "altura_m",
        "altura": "altura_m",
        "largura_(m)": "", // Ignorado - campo não existe na tabela
        "área_(m²)": "area_m2",
        "area_(m²)": "area_m2",
        "area_m2": "area_m2",
        "area": "area_m2",
        "km": "km",
        "lado": "lado",
        "latitude": "latitude",
        "longitude": "longitude",
        "observação": "observacao",
        "observacao": "observacao",
        "snv": "snv",
        "br": "br",
        "uf": "uf",
        "velocidade": "velocidade",
        "substrato": "substrato",
        "suporte": "suporte",
        "distância_(m)": "distancia_m",
        "distancia_m": "distancia_m",
        "serviço": "servico",
        "servico": "servico",
        "solução": "solucao_planilha",
        "solucao": "solucao_planilha",
      },
      ficha_marcas_longitudinais: {
        "largura_da_faixa_(m)": "largura_cm",
        "extensão_(km)": "extensao_metros",
        "código": "codigo",
        "posição": "posicao",
        "traço_(m)": "traco_m",
        "espaçamento_(m)": "espacamento_m",
        "área_(m²)": "area_m2",
        "espessura_(mm)": "espessura_cm",
        "outros_materiais": "",
        "br": "",
      },
      ficha_inscricoes: {
        "sigla": "sigla",
        "descrição": "tipo_inscricao",
        "tipo": "tipo_inscricao",
        "área_(m²)": "area_m2",
        "area_(m²)": "area_m2",
        "espessura_(mm)": "espessura_mm",
        "outros_materiais": "espessura_mm",
        "material": "material_utilizado",
        "data_vistoria": "data_vistoria",
        "data": "data_vistoria",
        "br": "",
        "snv": "snv",
        "cor": "cor",
      },
      ficha_placa: {
        "dimensões_(mm)": "dimensoes_mm",
        "área_(m²)": "area_m2",
        "data": "data_vistoria",
        "retrorrefletância_(película_fundo)_(cd.lux/m-2)": "retro_pelicula_fundo",
        "retrorrefletância_(película_legenda/orla)_(cd.lux/m-2)": "retro_pelicula_legenda_orla",
      },
      ficha_cilindros: {
        // Variações EXATAS das colunas Excel (com maiúsculas e espaços)
        "Cor (Corpo)": "cor_corpo",
        "Cor (Refletivo)": "cor_refletivo",
        "Tipo Refletivo": "tipo_refletivo",
        "Extensão (km)": "extensao_km",
        "Espaçamento (m)": "espacamento_m",
        "Local de Implantação": "local_implantacao",
        "Quantidade (und)": "quantidade",
        "Km Inicial": "km_inicial",
        "Km Final": "km_final",
        "Latitude Inicial": "latitude_inicial",
        "Longitude Inicial": "longitude_inicial",
        "Latitude Final": "latitude_final",
        "Longitude Final": "longitude_final",
        // Variações minúsculas (após normalização)
        "cor (corpo)": "cor_corpo",
        "cor (refletivo)": "cor_refletivo",
        "tipo refletivo": "tipo_refletivo",
        "extensão (km)": "extensao_km",
        "espaçamento (m)": "espacamento_m",
        "local de implantação": "local_implantacao",
        "quantidade (und)": "quantidade",
        "km inicial": "km_inicial",
        "km final": "km_final",
        "latitude inicial": "latitude_inicial",
        "longitude inicial": "longitude_inicial",
        "latitude final": "latitude_final",
        "longitude final": "longitude_final",
        // Variações com underscores
        "cor_(corpo)": "cor_corpo",
        "cor_corpo": "cor_corpo",
        "cor_(refletivo)": "cor_refletivo",
        "cor_refletivo": "cor_refletivo",
        "tipo_refletivo": "tipo_refletivo",
        "extensão_(km)": "extensao_km",
        "extensao_(km)": "extensao_km",
        "espaçamento_(m)": "espacamento_m",
        "espacamento_(m)": "espacamento_m",
        "local_de_implantação": "local_implantacao",
        "local_implantacao": "local_implantacao",
        "quantidade_(und)": "quantidade",
        "quantidade": "quantidade",
        "km_inicial": "km_inicial",
        "km_final": "km_final",
        "latitude_inicial": "latitude_inicial",
        "longitude_inicial": "longitude_inicial",
        "latitude_final": "latitude_final",
        "longitude_final": "longitude_final",
        "data": "data_vistoria",
        "br": "",
        "snv": "snv",
        "SNV": "snv",
        "BR": "",
      },
      ficha_tachas: {
        "Descrição": "descricao",
        "Descricao": "descricao",
        "descrição": "descricao",
        "descricao": "descricao",
        "DESCRIÇÃO": "descricao",
        "DESCRICAO": "descricao",
        "Corpo": "corpo",
        "corpo": "corpo",
        "Refletivo": "tipo_refletivo",
        "refletivo": "tipo_refletivo",
        "tipo_refletivo": "tipo_refletivo",
        "Extensão (km)": "extensao_km",
        "extensao_(km)": "extensao_km",
        "Espaçamento (m)": "espacamento_m",
        "espacamento_(m)": "espacamento_m",
        "Cor do Refletivo": "cor_refletivo",
        "cor_refletivo": "cor_refletivo",
        "Local de Implantação": "local_implantacao",
        "local_implantacao": "local_implantacao",
        "Quantidade (und)": "quantidade",
        "quantidade": "quantidade",
        "data": "data_vistoria",
        "br": "",
      },
      ficha_porticos: {
        "altura_livre_(m)": "altura_livre_m",
        "vão_horizontal_(m)": "vao_horizontal_m",
        "Latitude": "latitude_inicial",
        "Longitude": "longitude_inicial",
        "data": "data_vistoria",
        "br": "",
      },
      defensas: {
        "extensão_(m)": "extensao_metros",
        "comprimento_total_do_tramo_(m)": "comprimento_total_tramo_m",
        "% veículos pesados": "percentual_veiculos_pesados",
        "distância_da_pista_ao_obstáculo_(m)": "distancia_pista_obstaculo_m",
        "velocidade_(km/h)": "velocidade_kmh",
        "vmd_(veíc./dia)": "vmd_veic_dia",
        "distância_da_face_da_defensa_ao_obstáculo(m)": "distancia_face_defensa_obstaculo_m",
        "distância_da_linha_de_bordo_da_pista_à_face_da_defensa_(m)": "distancia_bordo_pista_face_defensa_m",
        "data": "data_inspecao",
        "data_inspeção": "data_inspecao",
        "br": "",
      },
    };

    // Campos válidos por tabela (baseado no schema)
    const VALID_FIELDS: Record<string, string[]> = {
      necessidades_placas: [
        "codigo", "tipo", "dimensoes_mm", "km", "lado", "latitude", "longitude",
        "observacao", "snv", "br", "uf", "velocidade", "substrato", "suporte",
        "altura_m", "distancia_m", "area_m2", "servico", "solucao_planilha",
        "estado_conservacao", "divergencia_identificada", "cadastro_id"
      ],
      ficha_marcas_longitudinais: [
        "codigo", "posicao", "cor", "data_vistoria", "espessura_cm",
        "extensao_metros", "foto_url", "km_final", "km_inicial",
        "largura_cm", "latitude_final", "latitude_inicial",
        "longitude_final", "longitude_inicial", "material",
        "observacao", "tipo_demarcacao", "snv", "traco_m", "espacamento_m", "area_m2",
        "origem", "modificado_por_intervencao", "ultima_intervencao_id",
        "data_ultima_modificacao"
      ],
      ficha_inscricoes: [
        "sigla", "tipo_inscricao", "cor", "area_m2", "espessura_mm",
        "dimensoes", "material_utilizado", "data_vistoria",
        "km_inicial", "km_final", "latitude_inicial", "longitude_inicial",
        "latitude_final", "longitude_final", "observacao", "foto_url",
        "snv", "origem", "modificado_por_intervencao", "ultima_intervencao_id",
        "data_ultima_modificacao"
      ],
      ficha_placa: [
        "altura_m", "area_m2", "br", "codigo", "contrato", "data_implantacao",
        "data_vistoria", "descricao", "dimensoes_mm", "distancia_m", "empresa",
        "foto_base_url", "foto_frontal_url", "foto_identificacao_url",
        "foto_lateral_url", "foto_posterior_url", "km", "lado", "latitude",
        "longitude", "modelo", "numero_patrimonio", "qtde_suporte",
        "retro_pelicula_fundo", "retro_pelicula_legenda_orla",
        "snv", "substrato", "suporte", "tipo", "uf", "velocidade",
        "tipo_pelicula_fundo", "cor_pelicula_fundo",
        "tipo_pelicula_legenda_orla", "cor_pelicula_legenda_orla",
        "posicao", "si_sinal_impresso", "tipo_secao_suporte", 
        "secao_suporte_mm", "link_fotografia", "foto_url",
        "origem", "modificado_por_intervencao", "ultima_intervencao_id",
        "data_ultima_modificacao"
      ],
      ficha_cilindros: [
        "cor_corpo", "cor_refletivo", "tipo_refletivo", "data_vistoria", 
        "espacamento_m", "extensao_km", "km_final", "km_inicial", 
        "latitude_final", "latitude_inicial", "local_implantacao", 
        "longitude_final", "longitude_inicial", "observacao", "quantidade", 
        "snv", "origem", "modificado_por_intervencao", "ultima_intervencao_id",
        "data_ultima_modificacao"
      ],
      ficha_tachas: [
        "descricao", "corpo", "tipo_refletivo", "cor_refletivo", "data_vistoria", "espacamento_m",
        "extensao_km", "foto_url", "km_final", "km_inicial", "latitude_final",
        "latitude_inicial", "local_implantacao", "longitude_final", "longitude_inicial",
        "quantidade", "snv",
        "origem", "modificado_por_intervencao", "ultima_intervencao_id",
        "data_ultima_modificacao"
      ],
      ficha_porticos: [
        "altura_livre_m", "data_vistoria", "foto_url",
        "km", "lado", "latitude_inicial", "longitude_inicial", "snv", "tipo",
        "vao_horizontal_m",
        "origem", "modificado_por_intervencao", "ultima_intervencao_id",
        "data_ultima_modificacao"
      ],
      defensas: [
        "data_vistoria", "extensao_metros", "km_final",
        "km_inicial", "lado",
        "tipo_defensa", "br", "snv", "tramo",
        "funcao", "especificacao_obstaculo_fixo", "id_defensa",
        "distancia_pista_obstaculo_m", "risco", "velocidade_kmh",
        "vmd_veic_dia", "percentual_veiculos_pesados", "geometria",
        "classificacao_nivel_contencao", "nivel_contencao_en1317",
        "nivel_contencao_nchrp350", "espaco_trabalho", "terminal_entrada",
        "terminal_saida", "adequacao_funcionalidade_lamina",
        "adequacao_funcionalidade_laminas_inadequadas",
        "adequacao_funcionalidade_terminais",
        "adequacao_funcionalidade_terminais_inadequados",
        "distancia_face_defensa_obstaculo_m",
        "distancia_bordo_pista_face_defensa_m", "link_fotografia",
        "quantidade_laminas", "comprimento_total_tramo_m",
        "latitude_inicial", "longitude_inicial", "latitude_final", "longitude_final",
        "origem", "modificado_por_intervencao", "ultima_intervencao_id",
        "data_ultima_modificacao"
      ],
    };

    const fieldMapping = FIELD_MAPPINGS[tableName] || {};
    const validFields = VALID_FIELDS[tableName] || [];

    // Debug para cilindros
    if (inventoryType === "cilindros" && normalizedData.length > 0) {
      console.log("=== DEBUG CILINDROS - MAPEAMENTO ===");
      console.log("Mapeamentos disponíveis:", Object.keys(fieldMapping).slice(0, 10));
      for (const [key, value] of Object.entries(normalizedData[0])) {
        console.log(`Chave Excel: "${key}", Valor: "${value}"`);
        const cleanKey = String(key).replace(/\s+/g, ' ').trim();
        if (fieldMapping[cleanKey]) {
          console.log(`  ✓ Mapeado para: "${fieldMapping[cleanKey]}"`);
        } else {
          console.log(`  ✗ SEM MAPEAMENTO para: "${cleanKey}"`);
        }
      }
    }

    // Preparar dados para inserção
    const recordsToInsert = normalizedData.map((row: any) => {
      // Determinar campo de data padrão baseado na tabela
      let dateField = "data_vistoria";
      if (tableName === "intervencoes_cilindros" || tableName === "intervencoes_inscricoes") {
        dateField = "data_intervencao";
      } else if (tableName === "defensas") {
        dateField = "data_inspecao";
      }
      
      // Converter campos do Excel para o formato esperado pela tabela
      const record: any = {
        user_id: user.id,
        lote_id: loteId,
        rodovia_id: rodoviaId,
        [dateField]: "2023-01-01", // Data padrão: 01/01/2023
        // Campos de controle do Inventário Dinâmico
        origem: "cadastro_inicial",
        modificado_por_intervencao: false,
        ultima_intervencao_id: null,
        data_ultima_modificacao: null,
      };
      
      // Adicionar campos obrigatórios com valores padrão específicos por tabela
      if (tableName === "necessidades_placas") {
        record.servico = record.servico || "Substituição de Placa";
      } else if (tableName === "ficha_inscricoes") {
        record.tipo_inscricao = "Outros";
        record.cor = "Branca";
      } else if (tableName === "intervencoes_cilindros") {
        // Todos os campos obrigatórios com valores padrão
        record.cor_corpo = "Branco";
        record.km_inicial = 0;
        record.km_final = 0;
      } else if (tableName === "defensas") {
        record.lado = "D";
        record.tipo_defensa = "Metálica";
        record.extensao_metros = 0;
        record.necessita_intervencao = false;
        record.km_inicial = 0;
        record.km_final = 0;
      } else if (tableName === "ficha_placa") {
        // Campos obrigatórios para placas já são preenchidos pelo mapeamento
      } else if (tableName === "ficha_tachas") {
        record.km_inicial = 0;
        record.km_final = 0;
        // Não forçar quantidade = 1, deixar vir do Excel
      } else if (tableName === "ficha_porticos") {
        record.tipo = "Informativo";
      } else if (tableName === "ficha_marcas_longitudinais") {
        // Campos opcionais, não há obrigatórios além dos básicos
      }

      // Mapear campos do Excel para os campos da tabela
      let hasValidData = false;
      for (const [key, value] of Object.entries(row)) {
        // Ignorar colunas vazias ou inválidas
        if (!key || key.trim() === '' || key.startsWith('__') || key.includes('__empty')) {
          continue;
        }
        
      // Normalizar chave removendo espaços extras entre palavras
      const cleanKey = key.replace(/\s+/g, ' ').trim();
      let normalizedKey = cleanKey.toLowerCase().replace(/\s+/g, "_");
      
      // Aplicar mapeamento específico se existir
      const originalKey = cleanKey; // Guardar chave original limpa para verificações especiais
      
      if (fieldMapping[cleanKey]) {
        normalizedKey = fieldMapping[cleanKey];
      } else if (fieldMapping[normalizedKey]) {
        normalizedKey = fieldMapping[normalizedKey];
      }
      
      // Se o mapeamento retornou string vazia, pular este campo
      if (normalizedKey === '') {
        continue;
      }
        
      // Ignorar se a normalização resultar em string vazia
      if (!normalizedKey || normalizedKey === '_' || normalizedKey.includes('__empty')) {
        continue;
      }
      
      // Apenas adicionar se o campo for válido para esta tabela
      if (validFields.length === 0 || validFields.includes(normalizedKey)) {
          // Se é o campo de foto e temos fotos, substituir pelo URL
          if (hasPhotos && photoFieldName && key === photoFieldName) {
            const photoFileName = value as string;
            if (photoFileName && photoMap[photoFileName]) {
              record[normalizedKey] = photoMap[photoFileName];
              hasValidData = true;
            }
        } else {
          // Apenas adicionar se o valor não for undefined ou null ou vazio
          if (value !== undefined && value !== null && value !== '' && value !== '-') {
            hasValidData = true;
              
              // Limpar valores com porcentagem (ex: "55.10%" → 55.10)
              // IMPORTANTE: Fazer isso ANTES de qualquer outra conversão
              let cleanedValue: any = value;
              if (typeof value === 'string' && value.trim().includes('%')) {
                const originalValue = value;
                // Remover % e converter para número
                const numericString = value.replace('%', '').replace(',', '.').trim();
                const numericValue = parseFloat(numericString);
                console.log(`[PERCENT DEBUG] Campo: "${normalizedKey}" (original key: "${key}"), Valor original: "${originalValue}", Valor limpo: ${numericValue}, Tipo após conversão: ${typeof numericValue}`);
                
                // Se a conversão falhou (NaN), manter o valor original e logar erro
                if (isNaN(numericValue)) {
                  console.error(`[PERCENT ERROR] Falha ao converter "${originalValue}" para número no campo "${normalizedKey}"`);
                  cleanedValue = originalValue;
                } else {
                  cleanedValue = numericValue;
                }
              }
              
              // Log específico para valores de KM = 0
              if ((normalizedKey.includes('km') || normalizedKey === 'km_inicial' || normalizedKey === 'km_final') 
                  && (cleanedValue === 0 || cleanedValue === '0')) {
                console.log(`[KM ZERO DEBUG] Campo: "${normalizedKey}", Valor: ${cleanedValue}, Tipo: ${typeof cleanedValue}`);
              }
              
              // Conversões especiais usando a chave original
              // PRIORIDADE: Garantir que km=0 sempre seja mapeado PRIMEIRO
              if (normalizedKey === 'km' || normalizedKey === 'km_inicial' || normalizedKey === 'km_final') {
                const kmValue = Number(cleanedValue);
                if (!isNaN(kmValue)) {
                  record[normalizedKey] = kmValue;
                  console.log(`[KM MAPPING] ${normalizedKey} = ${kmValue}`);
                }
              } else if (normalizedKey === "largura_cm" && originalKey.toLowerCase().includes("(m)")) {
                // Converter de metros para centímetros
                record[normalizedKey] = Number(cleanedValue) * 100;
              } else if (normalizedKey === "extensao_metros" && originalKey.toLowerCase().includes("(km)")) {
                // Converter de km para metros
                record[normalizedKey] = Number(cleanedValue) * 1000;
              } else if (normalizedKey === "espessura_cm" && originalKey.toLowerCase().includes("(mm)")) {
                // Converter de mm para cm
                record[normalizedKey] = Number(cleanedValue) / 10;
            } else {
              record[normalizedKey] = cleanedValue;
            }
            
            // Log específico para tachas
            if (tableName === "ficha_tachas" && (normalizedKey === "descricao" || normalizedKey === "cor_refletivo" || normalizedKey === "local_implantacao" || normalizedKey === "espacamento_m")) {
                console.log(`[TACHA DEBUG] INSERIDO: ${normalizedKey} = ${value} (tipo: ${typeof value})`);
              }
            } else {
              if (tableName === "ficha_tachas" && normalizedKey === "descricao") {
                console.log(`[TACHA DESCRICAO - REJEITADO] Valor: "${value}", undefined?: ${value === undefined}, null?: ${value === null}, vazio?: ${value === ''}, traço?: ${value === '-'}`);
              }
              if (tableName === "ficha_tachas" && (normalizedKey === "descricao" || normalizedKey === "cor_refletivo" || normalizedKey === "local_implantacao" || normalizedKey === "espacamento_m")) {
                console.log(`[TACHA DEBUG] REJEITADO (valor vazio/null/-): ${normalizedKey} = ${value} (tipo: ${typeof value})`);
              }
            }
          }
        }
      }

      // Apenas retornar o registro se houver dados válidos do Excel
      return hasValidData ? record : null;
    }).filter(record => record !== null); // Filtrar registros nulos

    // Se não houver registros para inserir, retornar sucesso com 0 importados
    if (recordsToInsert.length === 0) {
      console.log("Nenhum registro válido encontrado no Excel");
      return new Response(
        JSON.stringify({
          success: true,
          imported_count: 0,
          message: "Nenhum registro encontrado para importar (planilha vazia ou sem dados válidos)",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Log do primeiro registro para debug
    if (recordsToInsert.length > 0) {
      console.log("Exemplo de registro a ser inserido:", JSON.stringify(recordsToInsert[0], null, 2));
      console.log("Campos do registro:", Object.keys(recordsToInsert[0]));
      
      // Log específico para tachas com descrição
      if (inventoryType === "tachas") {
        console.log(`[TACHA - REGISTRO FINAL] Descricao no primeiro registro: "${recordsToInsert[0].descricao}"`);
        console.log(`[TACHA - REGISTRO FINAL] Todos os campos:`, recordsToInsert[0]);
      }
    }

    // Inserir dados em lotes para evitar estouro de memória
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      console.log(`Inserindo lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} registros`);

      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert(batch)
        .select();

      if (insertError) {
        console.error("Erro ao inserir lote:", insertError);
        throw insertError;
      }

      totalInserted += insertData?.length || 0;
      console.log(`Total inserido até agora: ${totalInserted}/${recordsToInsert.length}`);
    }

    console.log(`${totalInserted} registros inseridos com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: totalInserted,
        message: "Importação concluída com sucesso",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erro na importação:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});