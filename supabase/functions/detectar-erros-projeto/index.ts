import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeteccaoConfig {
  tabela_necessidades: string;
  tabela_cadastro: string;
  funcao_busca_proximo: string;
  campos_comparacao: string[];
  raio_busca_metros: number;
}

const CONFIG_POR_TIPO: Record<string, DeteccaoConfig> = {
  'cilindros': {
    tabela_necessidades: 'necessidades_cilindros',
    tabela_cadastro: 'ficha_cilindros',
    funcao_busca_proximo: 'buscar_cadastro_cilindro_proximo',
    campos_comparacao: ['tipo_refletivo', 'local_implantacao'],
    raio_busca_metros: 1000
  },
  'placas': {
    tabela_necessidades: 'necessidades_placas',
    tabela_cadastro: 'ficha_placa',
    funcao_busca_proximo: 'buscar_cadastro_placa_proximo',
    campos_comparacao: ['codigo', 'tipo'],
    raio_busca_metros: 500
  },
  'porticos': {
    tabela_necessidades: 'necessidades_porticos',
    tabela_cadastro: 'ficha_porticos',
    funcao_busca_proximo: 'buscar_cadastro_portico_proximo',
    campos_comparacao: ['tipo', 'lado'],
    raio_busca_metros: 500
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { tipo_elemento, rodovia_id, lote_id } = await req.json();

    console.log(`🔍 Detectando erros de projeto para ${tipo_elemento}`, { rodovia_id, lote_id });

    if (!CONFIG_POR_TIPO[tipo_elemento]) {
      throw new Error(`Tipo de elemento não suportado: ${tipo_elemento}`);
    }

    const config = CONFIG_POR_TIPO[tipo_elemento];
    let errosDetectados = 0;
    let necessidadesAnalisadas = 0;

    // 1. Buscar necessidades "Implantar" sem decisão do usuário
    const queryNecessidades = supabaseClient
      .from(config.tabela_necessidades)
      .select('*')
      .eq('servico', 'Implantar')
      .or('decisao_usuario.is.null,decisao_usuario.eq.PENDENTE_REVISAO');

    if (rodovia_id) {
      queryNecessidades.eq('rodovia_id', rodovia_id);
    }
    if (lote_id) {
      queryNecessidades.eq('lote_id', lote_id);
    }

    const { data: necessidades, error: errorNecessidades } = await queryNecessidades;

    if (errorNecessidades) {
      console.error('❌ Erro ao buscar necessidades:', errorNecessidades);
      throw errorNecessidades;
    }

    console.log(`📋 Encontradas ${necessidades?.length || 0} necessidades "Implantar" para análise`);

    // 2. Para cada necessidade, buscar cadastros próximos
    for (const nec of necessidades || []) {
      necessidadesAnalisadas++;

      if (!nec.latitude_inicial || !nec.longitude_inicial) {
        console.log(`⚠️ Necessidade ${nec.id} sem coordenadas, pulando...`);
        continue;
      }

      // Buscar cadastros próximos usando a função específica
      const { data: candidatos, error: errorCandidatos } = await supabaseClient.rpc(
        config.funcao_busca_proximo,
        {
          p_lat: nec.latitude_inicial,
          p_lon: nec.longitude_inicial,
          p_raio_metros: config.raio_busca_metros,
          p_rodovia_id: rodovia_id || null
        }
      );

      if (errorCandidatos) {
        console.error(`❌ Erro ao buscar candidatos para necessidade ${nec.id}:`, errorCandidatos);
        continue;
      }

      if (!candidatos || candidatos.length === 0) {
        console.log(`✅ Necessidade ${nec.id} - Nenhum cadastro próximo, OK para implantar`);
        
        // Marcar como não erro
        await supabaseClient
          .from(config.tabela_necessidades)
          .update({ 
            erro_projeto_detectado: false,
            decisao_usuario: null
          } as any)
          .eq('id', nec.id);
        
        continue;
      }

      // 3. Analisar melhor candidato
      const melhorCandidato = candidatos[0];
      console.log(`🔎 Necessidade ${nec.id} - Candidato encontrado a ${melhorCandidato.distancia_metros.toFixed(2)}m`);

      // 4. Verificar similaridade de atributos
      let atributosSimilares = 0;
      let totalAtributos = config.campos_comparacao.length;

      for (const campo of config.campos_comparacao) {
        const valorNec = nec[campo];
        const valorCad = melhorCandidato[campo];
        
        if (valorNec && valorCad && valorNec.toString().toLowerCase() === valorCad.toString().toLowerCase()) {
          atributosSimilares++;
        }
      }

      const similaridadePercent = totalAtributos > 0 ? (atributosSimilares / totalAtributos) * 100 : 0;

      // 5. Determinar tipo de erro
      let tipoErro: string;
      let erroDetectado = false;

      if (melhorCandidato.distancia_metros < 50) {
        // Muito próximo - provável erro independente dos atributos
        tipoErro = 'IMPLANTAR_COM_CADASTRO_EXISTENTE';
        erroDetectado = true;
        console.log(`⚠️ ERRO DETECTADO: Necessidade ${nec.id} muito próxima de cadastro (${melhorCandidato.distancia_metros.toFixed(2)}m)`);
      } else if (melhorCandidato.distancia_metros < 200 && similaridadePercent >= 50) {
        // Próximo com atributos similares
        tipoErro = 'IMPLANTAR_COM_CADASTRO_EXISTENTE';
        erroDetectado = true;
        console.log(`⚠️ ERRO DETECTADO: Necessidade ${nec.id} próxima com ${similaridadePercent.toFixed(0)}% similaridade`);
      } else if (melhorCandidato.distancia_metros < config.raio_busca_metros && similaridadePercent < 50) {
        // Próximo mas atributos divergentes
        tipoErro = 'COORDENADAS_PROXIMAS_ATRIBUTOS_DIVERGENTES';
        erroDetectado = true;
        console.log(`⚠️ ERRO DETECTADO: Necessidade ${nec.id} próxima mas com atributos divergentes (${similaridadePercent.toFixed(0)}% similaridade)`);
      } else {
        // Longe o suficiente, OK para implantar
        console.log(`✅ Necessidade ${nec.id} - Distância OK (${melhorCandidato.distancia_metros.toFixed(2)}m)`);
        
        await supabaseClient
          .from(config.tabela_necessidades)
          .update({ 
            erro_projeto_detectado: false,
            decisao_usuario: null
          } as any)
          .eq('id', nec.id);
        
        continue;
      }

      // 6. Marcar erro na necessidade
      if (erroDetectado) {
        errosDetectados++;
        
        const { error: errorUpdate } = await supabaseClient
          .from(config.tabela_necessidades)
          .update({
            cadastro_match_id: melhorCandidato.id,
            erro_projeto_detectado: true,
            tipo_erro_projeto: tipoErro,
            decisao_usuario: 'PENDENTE_REVISAO',
            distancia_match_metros: melhorCandidato.distancia_metros
          } as any)
          .eq('id', nec.id);

        if (errorUpdate) {
          console.error(`❌ Erro ao marcar erro na necessidade ${nec.id}:`, errorUpdate);
        } else {
          console.log(`✅ Erro marcado para revisão: Necessidade ${nec.id}`);
        }
      }
    }

    const resultado = {
      tipo_elemento,
      rodovia_id,
      lote_id,
      necessidades_analisadas: necessidadesAnalisadas,
      erros_detectados: errosDetectados,
      taxa_erro: necessidadesAnalisadas > 0 
        ? ((errosDetectados / necessidadesAnalisadas) * 100).toFixed(1) + '%'
        : '0%'
    };

    console.log('📊 Resultado da detecção:', resultado);

    return new Response(
      JSON.stringify(resultado),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na detecção de erros de projeto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
