import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RodoviaData {
  codigo: string;
  uf: string;
  tolerancia_match_metros?: number;
  tolerancia_placas_metros?: number;
  tolerancia_porticos_metros?: number;
  tolerancia_defensas_metros?: number;
  tolerancia_marcas_metros?: number;
  tolerancia_cilindros_metros?: number;
  tolerancia_tachas_metros?: number;
  tolerancia_inscricoes_metros?: number;
}

// Todas as 14 rodovias necessárias para os Lotes 04-10
const RODOVIAS_DATA: RodoviaData[] = [
  { codigo: "BR-367", uf: "MG" },
  { codigo: "BR-116", uf: "MG" },
  { codigo: "BR-259", uf: "MG" },
  { codigo: "BR-381", uf: "MG" },
  { codigo: "BR-135", uf: "MG" },
  { codigo: "BR-251", uf: "MG" },
  { codigo: "BR-365", uf: "MG" },
  { codigo: "BR-262", uf: "MG" },
  { codigo: "BR-458", uf: "MG" },
  { codigo: "BR-491", uf: "MG" },
  { codigo: "BR-040", uf: "MG" },
  { codigo: "BR-267", uf: "MG" },
  { codigo: "BR-354", uf: "MG" },
  { codigo: "BR-146", uf: "MG" },
];

// Tolerâncias padrão para todas as rodovias
const TOLERANCIAS_PADRAO = {
  tolerancia_match_metros: 50,
  tolerancia_placas_metros: 50,
  tolerancia_porticos_metros: 200,
  tolerancia_defensas_metros: 20,
  tolerancia_marcas_metros: 20,
  tolerancia_cilindros_metros: 25,
  tolerancia_tachas_metros: 25,
  tolerancia_inscricoes_metros: 30,
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Iniciando importação de rodovias ===');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const results = [];
    let sucessos = 0;
    let erros = 0;

    // Processar cada rodovia
    for (const rodoviaData of RODOVIAS_DATA) {
      console.log(`\nProcessando rodovia ${rodoviaData.codigo}...`);

      const rodoviaCompleta = {
        ...rodoviaData,
        ...TOLERANCIAS_PADRAO
      };

      const { data, error } = await supabaseClient
        .from('rodovias')
        .upsert(rodoviaCompleta, {
          onConflict: 'codigo',
          ignoreDuplicates: false
        })
        .select('id, codigo')
        .single();

      if (error) {
        console.error(`❌ Erro ao importar ${rodoviaData.codigo}:`, error);
        erros++;
        results.push({
          rodovia: rodoviaData.codigo,
          status: 'error',
          error: error.message
        });
      } else {
        console.log(`✅ ${rodoviaData.codigo} importada com sucesso - ID: ${data.id}`);
        sucessos++;
        results.push({
          rodovia: rodoviaData.codigo,
          status: 'success',
          id: data.id
        });
      }
    }

    console.log(`\n=== Importação finalizada ===`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📊 Total: ${RODOVIAS_DATA.length} rodovias`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importação concluída: ${sucessos} rodovias importadas, ${erros} erros`,
        stats: {
          total: RODOVIAS_DATA.length,
          sucessos,
          erros
        },
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro geral na importação:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
