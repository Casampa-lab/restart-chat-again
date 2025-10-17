import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RodoviaData {
  codigo_rodovia: string;
  snv_inicial: string;
  snv_final: string;
  km_inicial: number;
  km_final: number;
  extensao_km: number;
  latitude_inicial: number;
  longitude_inicial: number;
  latitude_final: number;
  longitude_final: number;
}

interface LoteData {
  numero: string;
  unidade_administrativa: string;
  extensao_total_km: number;
  rodovias: RodoviaData[];
}

const LOTES_DATA: LoteData[] = [
  {
    numero: "04",
    unidade_administrativa: "TEÓFILO OTONI",
    extensao_total_km: 532.80,
    rodovias: [
      {
        codigo_rodovia: "BR-367",
        snv_inicial: "367BMG0090",
        snv_final: "367BMG0130",
        km_inicial: 64.30,
        km_final: 290.60,
        extensao_km: 226.30,
        latitude_inicial: -18.124118,
        longitude_inicial: -40.382928,
        latitude_final: -16.849918,
        longitude_final: -42.050370
      },
      {
        codigo_rodovia: "BR-116",
        snv_inicial: "116BMG0210",
        snv_final: "116BMG0250",
        km_inicial: 465.00,
        km_final: 771.50,
        extensao_km: 306.50,
        latitude_inicial: -16.898800,
        longitude_inicial: -42.098398,
        latitude_final: -15.857900,
        longitude_final: -43.381499
      }
    ]
  },
  {
    numero: "05",
    unidade_administrativa: "GOVERNADOR VALADARES",
    extensao_total_km: 382.00,
    rodovias: [
      {
        codigo_rodovia: "BR-259",
        snv_inicial: "259BMG0040",
        snv_final: "259BMG0070",
        km_inicial: 42.10,
        km_final: 261.80,
        extensao_km: 219.70,
        latitude_inicial: -19.026330,
        longitude_inicial: -41.994858,
        latitude_final: -18.910890,
        longitude_final: -40.279259
      },
      {
        codigo_rodovia: "BR-381",
        snv_inicial: "381BMG0360",
        snv_final: "381BMG0390",
        km_inicial: 583.20,
        km_final: 745.50,
        extensao_km: 162.30,
        latitude_inicial: -19.026888,
        longitude_inicial: -41.993008,
        latitude_final: -18.883318,
        longitude_final: -41.954270
      }
    ]
  },
  {
    numero: "06",
    unidade_administrativa: "MONTES CLAROS",
    extensao_total_km: 415.50,
    rodovias: [
      {
        codigo_rodovia: "BR-135",
        snv_inicial: "135BMG0090",
        snv_final: "135BMG0170",
        km_inicial: 323.70,
        km_final: 662.70,
        extensao_km: 339.00,
        latitude_inicial: -17.289190,
        longitude_inicial: -44.933079,
        latitude_final: -15.624179,
        longitude_final: -44.030460
      },
      {
        codigo_rodovia: "BR-251",
        snv_inicial: "251BMG0010",
        snv_final: "251BMG0020",
        km_inicial: 1.60,
        km_final: 78.10,
        extensao_km: 76.50,
        latitude_inicial: -16.720339,
        longitude_inicial: -43.861279,
        latitude_final: -16.156290,
        longitude_final: -44.357830
      }
    ]
  },
  {
    numero: "07",
    unidade_administrativa: "PATOS DE MINAS",
    extensao_total_km: 556.50,
    rodovias: [
      {
        codigo_rodovia: "BR-365",
        snv_inicial: "365BMG0040",
        snv_final: "365BMG0090",
        km_inicial: 81.10,
        km_final: 373.00,
        extensao_km: 291.90,
        latitude_inicial: -19.517500,
        longitude_inicial: -46.391930,
        latitude_final: -18.572550,
        longitude_final: -46.527321
      },
      {
        codigo_rodovia: "BR-262",
        snv_inicial: "262BMG0140",
        snv_final: "262BMG0170",
        km_inicial: 378.90,
        km_final: 643.50,
        extensao_km: 264.60,
        latitude_inicial: -19.500589,
        longitude_inicial: -46.400040,
        latitude_final: -19.584589,
        longitude_final: -44.014778
      }
    ]
  },
  {
    numero: "08",
    unidade_administrativa: "UBERABA",
    extensao_total_km: 406.10,
    rodovias: [
      {
        codigo_rodovia: "BR-262",
        snv_inicial: "262BMG0170",
        snv_final: "262BMG0240",
        km_inicial: 643.50,
        km_final: 904.50,
        extensao_km: 261.00,
        latitude_inicial: -19.584589,
        longitude_inicial: -44.014778,
        latitude_final: -19.747440,
        longitude_final: -47.924999
      },
      {
        codigo_rodovia: "BR-458",
        snv_inicial: "458BMG0020",
        snv_final: "458BMG0040",
        km_inicial: 49.10,
        km_final: 194.20,
        extensao_km: 145.10,
        latitude_inicial: -19.772949,
        longitude_inicial: -47.944500,
        latitude_final: -20.333060,
        longitude_final: -47.059700
      }
    ]
  },
  {
    numero: "09",
    unidade_administrativa: "SÃO SEBASTIÃO DO PARAÍSO",
    extensao_total_km: 385.20,
    rodovias: [
      {
        codigo_rodovia: "BR-491",
        snv_inicial: "491BMG0000",
        snv_final: "491BMG0030",
        km_inicial: 0.00,
        km_final: 198.10,
        extensao_km: 198.10,
        latitude_inicial: -20.915699,
        longitude_inicial: -46.630691,
        latitude_final: -22.087690,
        longitude_final: -46.932560
      },
      {
        codigo_rodovia: "BR-491",
        snv_inicial: "491BMG0050",
        snv_final: "491BMG0070",
        km_inicial: 223.70,
        km_final: 410.80,
        extensao_km: 187.10,
        latitude_inicial: -22.140390,
        longitude_inicial: -46.936470,
        latitude_final: -22.300619,
        longitude_final: -45.183891
      }
    ]
  },
  {
    numero: "10",
    unidade_administrativa: "BARBACENA",
    extensao_total_km: 542.60,
    rodovias: [
      {
        codigo_rodovia: "BR-040",
        snv_inicial: "040BMG0280",
        snv_final: "040BMG0370",
        km_inicial: 675.80,
        km_final: 819.40,
        extensao_km: 143.60,
        latitude_inicial: -20.421541,
        longitude_inicial: -43.426540,
        latitude_final: -21.218809,
        longitude_final: -43.770309
      },
      {
        codigo_rodovia: "BR-267",
        snv_inicial: "267BMG0030",
        snv_final: "267BMG0050",
        km_inicial: 80.30,
        km_final: 227.50,
        extensao_km: 147.20,
        latitude_inicial: -21.146700,
        longitude_inicial: -44.261669,
        latitude_final: -21.173780,
        longitude_final: -42.851280
      },
      {
        codigo_rodovia: "BR-354",
        snv_inicial: "354BMG0010",
        snv_final: "354BMG0050",
        km_inicial: 53.40,
        km_final: 204.20,
        extensao_km: 150.80,
        latitude_inicial: -21.134840,
        longitude_inicial: -44.292091,
        latitude_final: -21.118690,
        longitude_final: -42.881710
      },
      {
        codigo_rodovia: "BR-146",
        snv_inicial: "146BMG0050",
        snv_final: "146BMG0060",
        km_inicial: 285.00,
        km_final: 386.00,
        extensao_km: 101.00,
        latitude_inicial: -21.172501,
        longitude_inicial: -42.859859,
        latitude_final: -21.789110,
        longitude_final: -43.355610
      }
    ]
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Iniciando importação de dados dos lotes...');
    
    const results = [];

    for (const loteData of LOTES_DATA) {
      console.log(`\n=== Processando Lote ${loteData.numero} ===`);
      
      // 1. Atualizar informações do lote
      const { data: lote, error: loteError } = await supabaseClient
        .from('lotes')
        .update({
          unidade_administrativa: loteData.unidade_administrativa,
          extensao_total_km: loteData.extensao_total_km
        })
        .eq('numero', loteData.numero)
        .select('id, numero')
        .single();

      if (loteError) {
        console.error(`Erro ao atualizar lote ${loteData.numero}:`, loteError);
        results.push({
          lote: loteData.numero,
          status: 'error',
          error: loteError.message
        });
        continue;
      }

      console.log(`Lote ${loteData.numero} atualizado com sucesso. ID: ${lote.id}`);

      // 2. Processar rodovias do lote
      let rodoviasInseridas = 0;
      const rodoviasErros = [];

      for (const rodoviaData of loteData.rodovias) {
        console.log(`Processando rodovia ${rodoviaData.codigo_rodovia}...`);
        
        // Buscar ID da rodovia
        const { data: rodovia, error: rodoviaError } = await supabaseClient
          .from('rodovias')
          .select('id')
          .eq('codigo', rodoviaData.codigo_rodovia)
          .single();

        if (rodoviaError || !rodovia) {
          console.error(`Rodovia ${rodoviaData.codigo_rodovia} não encontrada:`, rodoviaError);
          rodoviasErros.push({
            rodovia: rodoviaData.codigo_rodovia,
            erro: 'Rodovia não encontrada no cadastro'
          });
          continue;
        }

        // Verificar se já existe
        const { data: existing } = await supabaseClient
          .from('lotes_rodovias')
          .select('id')
          .eq('lote_id', lote.id)
          .eq('rodovia_id', rodovia.id)
          .eq('snv_inicial', rodoviaData.snv_inicial)
          .single();

        if (existing) {
          console.log(`Rodovia ${rodoviaData.codigo_rodovia} já existe para este lote, pulando...`);
          continue;
        }

        // Inserir rodovia no lote
        const { error: insertError } = await supabaseClient
          .from('lotes_rodovias')
          .insert({
            lote_id: lote.id,
            rodovia_id: rodovia.id,
            snv_inicial: rodoviaData.snv_inicial,
            snv_final: rodoviaData.snv_final,
            km_inicial: rodoviaData.km_inicial,
            km_final: rodoviaData.km_final,
            extensao_km: rodoviaData.extensao_km,
            latitude_inicial: rodoviaData.latitude_inicial,
            longitude_inicial: rodoviaData.longitude_inicial,
            latitude_final: rodoviaData.latitude_final,
            longitude_final: rodoviaData.longitude_final
          });

        if (insertError) {
          console.error(`Erro ao inserir rodovia ${rodoviaData.codigo_rodovia}:`, insertError);
          rodoviasErros.push({
            rodovia: rodoviaData.codigo_rodovia,
            erro: insertError.message
          });
        } else {
          console.log(`Rodovia ${rodoviaData.codigo_rodovia} inserida com sucesso`);
          rodoviasInseridas++;
        }
      }

      results.push({
        lote: loteData.numero,
        status: 'success',
        rodovias_inseridas: rodoviasInseridas,
        total_rodovias: loteData.rodovias.length,
        erros: rodoviasErros
      });
    }

    console.log('\n=== Importação concluída ===');
    console.log('Resultados:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Importação concluída',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Erro geral na importação:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
