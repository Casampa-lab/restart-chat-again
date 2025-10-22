import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Reconciliação - Rejeitar como Elemento Novo')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    // Verificar autenticação
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { match_id, comment } = await req.json()

    if (!match_id) {
      throw new Error('match_id é obrigatório')
    }

    console.log(`[Rejeitar Novo] Match ID: ${match_id}, User: ${user.id}`)

    // 1. Buscar dados do match
    const { data: matchData, error: matchError } = await supabaseClient
      .from('match_resultados')
      .select('*, necessidade_id, inventario_id, tipo_elemento')
      .eq('id', match_id)
      .single()

    if (matchError || !matchData) {
      console.error('[Rejeitar Novo] Erro ao buscar match:', matchError)
      throw new Error('Match não encontrado')
    }

    const { necessidade_id, inventario_id, tipo_elemento } = matchData

    // 2. Buscar dados da necessidade
    const tabelaNecessidade = `necessidades_${tipo_elemento}`
    const { data: necessidade, error: necError } = await supabaseClient
      .from(tabelaNecessidade as any)
      .select('*')
      .eq('id', necessidade_id)
      .single()

    if (necError || !necessidade) {
      console.error('[Rejeitar Novo] Erro ao buscar necessidade:', necError)
      throw new Error('Necessidade não encontrada')
    }

    // 3. Criar NOVO elemento no inventário com dados da necessidade
    const tabelaInventario = `inventario_${tipo_elemento}`
    const dadosNovoElemento: any = {
      user_id: user.id,
      lote_id: necessidade.lote_id,
      rodovia_id: necessidade.rodovia_id,
      origem: 'necessidade',
      ativo: true,
      last_source: 'PROJETO',
      data_vistoria: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }

    // Mapear campos específicos por tipo
    if (tipo_elemento === 'placas') {
      dadosNovoElemento.codigo = necessidade.codigo
      dadosNovoElemento.tipo = necessidade.tipo || necessidade.tipo_placa
      dadosNovoElemento.lado = necessidade.lado
      dadosNovoElemento.suporte = necessidade.suporte
      dadosNovoElemento.substrato = necessidade.substrato
      dadosNovoElemento.km_inicial = necessidade.km_inicial
      dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial
      dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial
      dadosNovoElemento.snv = necessidade.snv
    } else if (tipo_elemento === 'marcas_longitudinais') {
      dadosNovoElemento.tipo_demarcacao = necessidade.tipo_demarcacao
      dadosNovoElemento.cor = necessidade.cor
      dadosNovoElemento.largura_cm = necessidade.largura_cm
      dadosNovoElemento.km_inicial = necessidade.km_inicial
      dadosNovoElemento.km_final = necessidade.km_final
      dadosNovoElemento.extensao_metros = necessidade.extensao_metros
      dadosNovoElemento.material = necessidade.material
      dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial
      dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial
      dadosNovoElemento.snv = necessidade.snv
      dadosNovoElemento.posicao = necessidade.posicao
    } else if (tipo_elemento === 'tachas') {
      dadosNovoElemento.tipo_tacha = necessidade.tipo_tacha
      dadosNovoElemento.cor = necessidade.cor
      dadosNovoElemento.quantidade = necessidade.quantidade
      dadosNovoElemento.km_inicial = necessidade.km_inicial
      dadosNovoElemento.km_final = necessidade.km_final
      dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial
      dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial
      dadosNovoElemento.snv = necessidade.snv
      dadosNovoElemento.local_implantacao = necessidade.local_implantacao
    } else if (tipo_elemento === 'cilindros') {
      dadosNovoElemento.cor_corpo = necessidade.cor_corpo
      dadosNovoElemento.cor_refletivo = necessidade.cor_refletivo
      dadosNovoElemento.tipo_refletivo = necessidade.tipo_refletivo
      dadosNovoElemento.quantidade = necessidade.quantidade
      dadosNovoElemento.km_inicial = necessidade.km_inicial
      dadosNovoElemento.km_final = necessidade.km_final
      dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial
      dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial
      dadosNovoElemento.snv = necessidade.snv
      dadosNovoElemento.local_implantacao = necessidade.local_implantacao
    } else if (tipo_elemento === 'inscricoes') {
      dadosNovoElemento.sigla = necessidade.sigla
      dadosNovoElemento.tipo_inscricao = necessidade.tipo_inscricao
      dadosNovoElemento.cor = necessidade.cor
      dadosNovoElemento.dimensoes = necessidade.dimensoes
      dadosNovoElemento.area_m2 = necessidade.area_m2
      dadosNovoElemento.km_inicial = necessidade.km_inicial
      dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial
      dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial
      dadosNovoElemento.snv = necessidade.snv
    } else if (tipo_elemento === 'porticos') {
      dadosNovoElemento.tipo = necessidade.tipo
      dadosNovoElemento.vao_horizontal_m = necessidade.vao_horizontal_m
      dadosNovoElemento.altura_livre_m = necessidade.altura_livre_m
      dadosNovoElemento.km_inicial = necessidade.km_inicial
      dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial
      dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial
      dadosNovoElemento.snv = necessidade.snv
    } else if (tipo_elemento === 'defensas') {
      dadosNovoElemento.lado = necessidade.lado
      dadosNovoElemento.funcao = necessidade.funcao
      dadosNovoElemento.geometria = necessidade.geometria
      dadosNovoElemento.extensao_metros = necessidade.extensao_metros
      dadosNovoElemento.km_inicial = necessidade.km_inicial
      dadosNovoElemento.km_final = necessidade.km_final
      dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial
      dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial
      dadosNovoElemento.snv = necessidade.snv
      dadosNovoElemento.nivel_contencao_en1317 = necessidade.nivel_contencao_en1317
      dadosNovoElemento.nivel_contencao_nchrp350 = necessidade.nivel_contencao_nchrp350
    }

    const { data: novoElemento, error: insertError } = await supabaseClient
      .from(tabelaInventario as any)
      .insert([dadosNovoElemento])
      .select()
      .single()

    if (insertError || !novoElemento) {
      console.error('[Rejeitar Novo] Erro ao criar novo elemento:', insertError)
      throw new Error('Falha ao criar novo elemento no inventário')
    }

    console.log(`[Rejeitar Novo] Novo elemento criado: ${novoElemento.id}`)

    // 4. Marcar elemento ANTIGO para possível exclusão (se existe)
    if (inventario_id) {
      const { error: marcacaoError } = await supabaseClient
        .from(tabelaInventario as any)
        .update({
          possivel_exclusao: true,
          possivel_exclusao_motivo: 'REJEITADO_NOVO',
          ativo: false,
          substituido_por: novoElemento.id,
          substituido_em: new Date().toISOString(),
        })
        .eq('id', inventario_id)

      if (marcacaoError) {
        console.error('[Rejeitar Novo] Erro ao marcar elemento antigo:', marcacaoError)
        // Não falhar a operação por isso
      } else {
        console.log(`[Rejeitar Novo] Elemento antigo ${inventario_id} marcado para exclusão`)
      }
    }

    // 5. Atualizar match_resultados
    const { error: matchUpdateError } = await supabaseClient
      .from('match_resultados')
      .update({
        decision: 'REJEITAR_NOVO',
        status: 'RECONCILIADO',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        comment: comment || null,
        inventario_id: novoElemento.id, // Vincular ao novo elemento
      })
      .eq('id', match_id)

    if (matchUpdateError) {
      console.error('[Rejeitar Novo] Erro ao atualizar match:', matchUpdateError)
      throw matchUpdateError
    }

    // 6. Atualizar necessidade
    const { error: necUpdateError } = await supabaseClient
      .from(tabelaNecessidade as any)
      .update({
        reconciliado: true,
        data_reconciliacao: new Date().toISOString(),
        servico_final: 'Implantar',
        servico: 'Implantar',
      })
      .eq('id', necessidade_id)

    if (necUpdateError) {
      console.error('[Rejeitar Novo] Erro ao atualizar necessidade:', necUpdateError)
      throw necUpdateError
    }

    console.log(`[Rejeitar Novo] ✓ Decisão registrada com sucesso`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Novo elemento criado no inventário. Elemento antigo marcado para exclusão.',
        novo_elemento_id: novoElemento.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Rejeitar Novo] Erro:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
