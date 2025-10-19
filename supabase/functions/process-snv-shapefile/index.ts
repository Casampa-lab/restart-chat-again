import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionResult {
  success: boolean;
  geojson_url?: string;
  metadata?: {
    versao: string;
    features_count: number;
    bounding_box: number[][];
    rodovias: string[];
    tamanho_mb: number;
  };
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Iniciando processamento de shapefile SNV...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Acesso negado: apenas administradores podem converter shapefiles');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const versao = formData.get('versao') as string;

    if (!file || !versao) {
      throw new Error('Arquivo ou versão não fornecidos');
    }

    console.log(`📂 Arquivo recebido: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`🏷️ Versão: ${versao}`);

    // Ler conteúdo do arquivo
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Extrair e processar ZIP usando shpjs
    console.log('🗜️ Extraindo e convertendo shapefile...');
    
    // Importar shpjs dinamicamente
    const shp = await import('https://esm.sh/shpjs@6.0.0');
    
    // Converter shapefile para GeoJSON
    const geojson = await shp.default(uint8Array);
    
    console.log('✅ Conversão para GeoJSON concluída');

    // Processar GeoJSON
    let features = [];
    if (geojson.type === 'FeatureCollection') {
      features = geojson.features;
    } else if (Array.isArray(geojson)) {
      // shpjs pode retornar array de FeatureCollections
      features = geojson.flatMap((fc: any) => fc.features || []);
    }

    console.log(`📊 ${features.length} features processadas`);

    // Extrair rodovias únicas
    const rodovias = new Set<string>();
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

    features.forEach((feature: any) => {
      // Identificar rodovia
      const br = feature.properties?.vl_br || 
                 feature.properties?.CD_RODOVIA || 
                 feature.properties?.br ||
                 feature.properties?.ds_rodovia;
      
      if (br) {
        rodovias.add(`BR-${String(br).padStart(3, '0')}`);
      }

      // Calcular bounding box
      if (feature.geometry?.coordinates) {
        const coords = feature.geometry.coordinates;
        if (feature.geometry.type === 'LineString') {
          coords.forEach(([lon, lat]: number[]) => {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
          });
        }
      }
    });

    console.log(`🛣️ ${rodovias.size} rodovias identificadas`);

    // Criar FeatureCollection final
    const finalGeoJSON = {
      type: 'FeatureCollection',
      features: features
    };

    const geojsonString = JSON.stringify(finalGeoJSON);
    const geojsonBlob = new Blob([geojsonString], { type: 'application/json' });
    const tamanhoMB = geojsonBlob.size / 1024 / 1024;

    console.log(`💾 Salvando GeoJSON (${tamanhoMB.toFixed(2)} MB)...`);

    // Salvar no Storage
    const filename = `snv-${versao}.geojson`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('snv-layers')
      .upload(filename, geojsonBlob, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Erro ao salvar GeoJSON: ${uploadError.message}`);
    }

    // Obter URL pública
    const { data: urlData } = supabaseClient.storage
      .from('snv-layers')
      .getPublicUrl(filename);

    console.log(`✅ GeoJSON salvo: ${urlData.publicUrl}`);

    // Atualizar configurações
    const metadata = {
      versao,
      storage_path: filename,
      features_count: features.length,
      data_upload: new Date().toISOString(),
      uploaded_by: user.id,
      bounding_box: [[minLon, minLat], [maxLon, maxLat]],
      rodovias: Array.from(rodovias),
      tamanho_mb: tamanhoMB
    };

    const { error: configError } = await supabaseClient
      .from('configuracoes')
      .update({ valor: JSON.stringify(metadata) })
      .eq('chave', 'snv_geojson_metadata');

    if (configError) {
      console.warn('⚠️ Erro ao atualizar configurações:', configError.message);
    }

    console.log('✅ Conversão concluída com sucesso!');

    const result: ConversionResult = {
      success: true,
      geojson_url: urlData.publicUrl,
      metadata: {
        versao,
        features_count: features.length,
        bounding_box: [[minLon, minLat], [maxLon, maxLat]],
        rodovias: Array.from(rodovias),
        tamanho_mb: Number(tamanhoMB.toFixed(2))
      }
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    
    const result: ConversionResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
