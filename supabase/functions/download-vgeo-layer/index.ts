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

    // Configurações por tipo de layer - múltiplas tentativas
    const layerConfigs = {
      'vgeo': [
        { layerId: 16, field: 'codigo_rod' }
      ],
      'snv': [
        { layerId: 14, field: 'vl_br' },
        { layerId: 14, field: 'codigo_snv' },
        { layerId: 15, field: 'vl_br' },
        { layerId: 13, field: 'vl_br' },
        { layerId: 16, field: 'vl_br' }
      ]
    };

    const configs = layerConfigs[layer_type as keyof typeof layerConfigs] || layerConfigs.vgeo;
    
    console.log(`Tentando baixar camada ${layer_type.toUpperCase()} para rodovia: ${codigo_rodovia}`);

    // Tentar cada configuração até encontrar dados
    for (const config of configs) {
      console.log(`Tentando Layer ${config.layerId} com campo ${config.field}...`);
      
      const baseUrl = `https://geo.ambientare.com.br/server/rest/services/0_DADOS_REFERENCIAIS/DADOS_REFERENCIAIS_INFRAESTRUTURA/MapServer/${config.layerId}/query`;
      
      // Construir filtro WHERE para a rodovia
      const whereClause = codigo_rodovia.startsWith('UF_') 
        ? `uf='${codigo_rodovia.replace('UF_', '')}'`
        : `${config.field}='${codigo_rodovia}'`;
      
      const params = new URLSearchParams({
        where: whereClause,
        outFields: '*',
        f: 'geojson',
        returnGeometry: 'true',
      });

      const url = `${baseUrl}?${params.toString()}`;
      
      console.log(`URL: ${url.substring(0, 150)}...`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Lovable-VGeo-Downloader/1.0',
        },
      });

      if (!response.ok) {
        console.warn(`Layer ${config.layerId} retornou erro ${response.status}, tentando próximo...`);
        continue;
      }

      const geojson = await response.json();
      
      // Verificar se encontrou features
      if (geojson.features && Array.isArray(geojson.features) && geojson.features.length > 0) {
        console.log(`✓ Sucesso! Layer ${config.layerId} com campo ${config.field}: ${geojson.features.length} features`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            geojson,
            features_count: geojson.features.length,
            layer_info: { layerId: config.layerId, field: config.field }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      } else {
        console.warn(`Layer ${config.layerId} não retornou features, tentando próximo...`);
      }
    }

    // Se chegou aqui, nenhuma configuração funcionou
    throw new Error(`Nenhum dado encontrado para ${codigo_rodovia} após tentar ${configs.length} configurações`);

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
