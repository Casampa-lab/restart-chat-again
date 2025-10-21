import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PlacaRow {
  br: string;
  snv: string;
  tipo: string;
  codigo: string;
  velocidade: string;
  lado: string;
  posicao: string;
  km_inicial: number;
  latitude_inicial: number;
  longitude_inicial: number;
  tipo_suporte: string;
  qtde_suporte: number;
  tipo_substrato: string;
  tipo_pelicula_fundo: string;
  cor_pelicula_fundo: string;
  retro_fundo: number;
  tipo_pelicula_legenda: string;
  cor_pelicula_legenda: string;
  retro_legenda: number;
  largura: number;
  altura: number;
  area: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { excelPath, photoUrls, loteId, rodoviaId, userId } = await req.json();

    console.log("Iniciando importação de inventário de placas");
    console.log(`Excel: ${excelPath}, Lote: ${loteId}, Rodovia: ${rodoviaId}`);

    // Baixar arquivo Excel do storage
    const { data: excelData, error: downloadError } = await supabaseClient.storage
      .from("placa-photos")
      .download(excelPath);

    if (downloadError) {
      console.error("Erro ao baixar Excel:", downloadError);
      throw new Error("Erro ao baixar arquivo Excel");
    }

    // Converter para ArrayBuffer e depois para Uint8Array
    const arrayBuffer = await excelData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Aqui você precisaria usar uma biblioteca para processar Excel
    // Como não há biblioteca nativa no Deno, vamos fazer uma abordagem simplificada
    // O ideal seria processar o Excel no frontend e enviar os dados já parseados
    
    // Por enquanto, vamos retornar erro explicando isso
    throw new Error(
      "Processamento de Excel deve ser feito no frontend. Por favor, processe o arquivo e envie os dados já parseados."
    );

    // Código de exemplo de como seria a importação se os dados viessem parseados:
    /*
    const placasData = dadosParsed.map((row: PlacaRow) => ({
      user_id: userId,
      lote_id: loteId,
      rodovia_id: rodoviaId,
      br: row.br,
      snv: row.snv,
      tipo: row.tipo,
      codigo: row.codigo,
      velocidade: row.velocidade !== "-" ? row.velocidade : null,
      lado: row.lado,
      km_inicial: row.km_inicial,
      latitude_inicial: row.latitude_inicial,
      longitude_inicial: row.longitude_inicial,
      suporte: row.tipo_suporte,
      qtde_suporte: row.qtde_suporte || null,
      substrato: row.tipo_substrato,
      pelicula: `${row.tipo_pelicula_fundo} ${row.cor_pelicula_fundo}`,
      retrorrefletividade: row.retro_fundo,
      dimensoes_mm: row.largura && row.altura ? `${row.largura}x${row.altura}` : null,
      area_m2: row.area,
      data_vistoria: new Date().toISOString().split("T")[0],
      foto_frontal_url: photoUrls[row.snv] || null,
    }));

    // Inserir em lotes de 100
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < placasData.length; i += batchSize) {
      const batch = placasData.slice(i, i + batchSize);
      const { error: insertError } = await supabaseClient
        .from("ficha_placa")
        .insert(batch);

      if (insertError) {
        console.error("Erro ao inserir batch:", insertError);
        throw insertError;
      }

      imported += batch.length;
      console.log(`Importadas ${imported} de ${placasData.length} placas`);
    }

    return new Response(
      JSON.stringify({ success: true, imported }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
    */

  } catch (error) {
    console.error("Erro na importação:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido na importação";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
