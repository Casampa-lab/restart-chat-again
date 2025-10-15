import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo_rodovia, layer_type = 'vgeo' } = await req.json();
    
    if (!codigo_rodovia) {
      throw new Error('codigo_rodovia é obrigatório');
    }

    // Layer IDs no serviço ArcGIS REST do DNIT
    const layerIds = {
      'vgeo': 16,  // VGeo - Segmentos rodoviários
      'snv': 14    // SNV - Sistema Nacional de Viação
    };

    const layerId = layerIds[layer_type as keyof typeof layerIds] || layerIds.vgeo;
    
    console.log(`Baixando camada ${layer_type.toUpperCase()} (Layer ${layerId}) para rodovia: ${codigo_rodovia}`);

    const baseUrl = `https://geo.ambientare.com.br/server/rest/services/0_DADOS_REFERENCIAIS/DADOS_REFERENCIAIS_INFRAESTRUTURA/MapServer/${layerId}/query`;
    
    // Construir filtro WHERE para a rodovia
    const whereClause = codigo_rodovia.startsWith('UF_') 
      ? `uf='${codigo_rodovia.replace('UF_', '')}'`
      : `codigo_rod='${codigo_rodovia}'`;
    
    const params = new URLSearchParams({
      where: whereClause,
      outFields: '*',
      f: 'geojson',
      returnGeometry: 'true',
    });

    const url = `${baseUrl}?${params.toString()}`;
    
    console.log(`Requisitando: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Lovable-VGeo-Downloader/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`VGeo retornou erro: ${response.status} ${response.statusText}`);
    }

    const geojson = await response.json();

    // Validar estrutura
    if (!geojson.features || !Array.isArray(geojson.features)) {
      throw new Error('Resposta inválida do VGeo - sem features');
    }

    console.log(`Download concluído: ${geojson.features.length} features encontradas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        geojson,
        features_count: geojson.features.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro ao baixar camada VGeo:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
