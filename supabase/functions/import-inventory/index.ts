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
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

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

    // Preparar dados para inserção
    const recordsToInsert = jsonData.map((row: any) => {
      // Converter campos do Excel para o formato esperado pela tabela
      const record: any = {
        user_id: user.id,
        lote_id: loteId,
        rodovia_id: rodoviaId,
      };

      // Mapear campos do Excel para os campos da tabela
      for (const [key, value] of Object.entries(row)) {
        // Ignorar colunas vazias ou inválidas
        if (!key || key.trim() === '' || key.startsWith('__')) {
          continue;
        }
        
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
        
        // Ignorar se a normalização resultar em string vazia
        if (!normalizedKey || normalizedKey === '_') {
          continue;
        }
        
        // Se é o campo de foto e temos fotos, substituir pelo URL
        if (hasPhotos && photoFieldName && key === photoFieldName) {
          const photoFileName = value as string;
          if (photoFileName && photoMap[photoFileName]) {
            record[normalizedKey] = photoMap[photoFileName];
          }
        } else {
          // Apenas adicionar se o valor não for undefined ou null vazio
          if (value !== undefined && value !== null && value !== '') {
            record[normalizedKey] = value;
          }
        }
      }

      return record;
    });

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