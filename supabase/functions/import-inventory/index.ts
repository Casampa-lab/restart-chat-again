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
  marcas_longitudinais: "ficha_marcas_longitudinais",
  cilindros: "intervencoes_cilindros",
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
      jsonData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      jsonData = XLSX.utils.sheet_to_json(worksheet);
    }

    console.log(`Processando ${jsonData.length} registros para ${tableName}`);

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
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("verificacao-photos")
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
          .from("verificacao-photos")
          .getPublicUrl(storagePath);

        photoMap[fileName] = urlData.publicUrl;
        console.log(`Foto ${fileName} uploaded para ${storagePath}`);
      }
    }

    // Mapeamento de campos do Excel para campos da tabela
    const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
      ficha_marcas_longitudinais: {
        "largura_da_faixa_(m)": "largura_cm",
        "extensão_(km)": "extensao_metros",
        "código": "tipo_demarcacao",
        "posição": "observacao", // Guardar em observação temporariamente
        "traço_(m)": "", // Ignorar
        "espaçamento_(m)": "", // Ignorar
        "outros_materiais": "", // Ignorar
        "área_(m²)": "", // Ignorar (não há campo correspondente)
        "br": "", // Ignorar (info já está em rodovia_id)
        "snv": "", // Ignorar (não existe nesta tabela)
      },
      ficha_placa: {
        "dimensões_(mm)": "dimensoes_mm",
        "área_(m²)": "area_m2",
      },
      // Adicionar outros mapeamentos conforme necessário
    };

    // Campos válidos por tabela (baseado no schema)
    const VALID_FIELDS: Record<string, string[]> = {
      ficha_marcas_longitudinais: [
        "cor", "data_vistoria", "espessura_cm", "estado_conservacao",
        "extensao_metros", "foto_url", "km_final", "km_inicial",
        "largura_cm", "latitude_final", "latitude_inicial",
        "longitude_final", "longitude_inicial", "material",
        "observacao", "tipo_demarcacao"
        // Nota: SNV não existe nesta tabela
      ],
      ficha_placa: [
        "altura_m", "area_m2", "br", "codigo", "contrato", "data_implantacao",
        "data_vistoria", "descricao", "dimensoes_mm", "distancia_m", "empresa",
        "foto_base_url", "foto_frontal_url", "foto_identificacao_url",
        "foto_lateral_url", "foto_posterior_url", "km", "lado", "latitude",
        "longitude", "modelo", "numero_patrimonio", "pelicula", "qtde_suporte",
        "retrorrefletividade", "snv", "substrato", "suporte", "tipo", "uf",
        "velocidade"
      ],
      // Adicionar outros inventários conforme necessário
    };

    const fieldMapping = FIELD_MAPPINGS[tableName] || {};
    const validFields = VALID_FIELDS[tableName] || [];

    // Preparar dados para inserção
    const recordsToInsert = jsonData.map((row: any) => {
      // Converter campos do Excel para o formato esperado pela tabela
      const record: any = {
        user_id: user.id,
        lote_id: loteId,
        rodovia_id: rodoviaId,
        data_vistoria: new Date().toISOString().split('T')[0], // Data padrão se não vier do Excel
      };

      // Mapear campos do Excel para os campos da tabela
      for (const [key, value] of Object.entries(row)) {
        // Ignorar colunas vazias ou inválidas
        if (!key || key.trim() === '' || key.startsWith('__') || key.includes('__empty')) {
          continue;
        }
        
        let normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
        
        // Aplicar mapeamento específico se existir
        if (fieldMapping[key]) {
          normalizedKey = fieldMapping[key];
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
            }
          } else {
            // Apenas adicionar se o valor não for undefined ou null ou vazio
            if (value !== undefined && value !== null && value !== '' && value !== '-') {
              // Conversões especiais
              if (normalizedKey === "largura_cm" && key.includes("(m)")) {
                // Converter de metros para centímetros
                record[normalizedKey] = Number(value) * 100;
              } else if (normalizedKey === "extensao_metros" && key.includes("(km)")) {
                // Converter de km para metros
                record[normalizedKey] = Number(value) * 1000;
              } else {
                record[normalizedKey] = value;
              }
            }
          }
        }
      }

      return record;
    });

    // Log do primeiro registro para debug
    if (recordsToInsert.length > 0) {
      console.log("Exemplo de registro a ser inserido:", JSON.stringify(recordsToInsert[0], null, 2));
      console.log("Campos do registro:", Object.keys(recordsToInsert[0]));
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