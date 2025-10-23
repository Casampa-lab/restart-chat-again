import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Reconciliação - Aceitar Match Automático')

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

    console.log(`[Aceitar Auto] Match ID: ${match_id}, User: ${user.id}`)

    // 1. Buscar dados do match_resultados (ou reconciliacoes)
    const { data: matchData, error: matchError } = await supabaseClient
      .from('match_resultados')
      .select('*, necessidade_id, inventario_id, tipo_elemento')
      .eq('id', match_id)
      .single()

    if (matchError || !matchData) {
      console.error('[Aceitar Auto] Erro ao buscar match:', matchError)
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
      console.error('[Aceitar Auto] Erro ao buscar necessidade:', necError)
      throw new Error('Necessidade não encontrada')
    }

    // 3. Preparar campos para atualizar no inventário (campos "fonte de verdade" do projeto)
    const tabelaInventario = `inventario_${tipo_elemento}`
    const camposAtualizar: any = {
      last_source: 'PROJETO',
      updated_at: new Date().toISOString(),
      solucao_planilha: necessidade.solucao_planilha || null,
      status_servico: necessidade.solucao_planilha === 'Remover' ? 'AGUARDANDO_REMOCAO' : 'ATIVO',
    }

    // Mapear campos específicos por tipo (fonte de verdade = projeto)
    if (tipo_elemento === 'placas') {
      camposAtualizar.codigo = necessidade.codigo
      camposAtualizar.tipo = necessidade.tipo || necessidade.tipo_placa
      camposAtualizar.lado = necessidade.lado
      if (necessidade.suporte) camposAtualizar.suporte = necessidade.suporte
      if (necessidade.substrato) camposAtualizar.substrato = necessidade.substrato
    } else if (tipo_elemento === 'marcas_longitudinais') {
      camposAtualizar.tipo_demarcacao = necessidade.tipo_demarcacao
      camposAtualizar.cor = necessidade.cor
      if (necessidade.largura_cm) camposAtualizar.largura_cm = necessidade.largura_cm
      if (necessidade.extensao_metros) camposAtualizar.extensao_metros = necessidade.extensao_metros
      if (necessidade.km_final) camposAtualizar.km_final = necessidade.km_final
    } else if (tipo_elemento === 'tachas') {
      camposAtualizar.tipo_tacha = necessidade.tipo_tacha
      camposAtualizar.cor = necessidade.cor
      if (necessidade.quantidade) camposAtualizar.quantidade = necessidade.quantidade
    } else if (tipo_elemento === 'cilindros') {
      if (necessidade.cor_corpo) camposAtualizar.cor_corpo = necessidade.cor_corpo
      if (necessidade.cor_refletivo) camposAtualizar.cor_refletivo = necessidade.cor_refletivo
      if (necessidade.quantidade) camposAtualizar.quantidade = necessidade.quantidade
    } else if (tipo_elemento === 'inscricoes') {
      camposAtualizar.sigla = necessidade.sigla
      camposAtualizar.tipo_inscricao = necessidade.tipo_inscricao
      if (necessidade.cor) camposAtualizar.cor = necessidade.cor
    } else if (tipo_elemento === 'porticos') {
      camposAtualizar.tipo = necessidade.tipo
      if (necessidade.vao_horizontal_m) camposAtualizar.vao_horizontal_m = necessidade.vao_horizontal_m
      if (necessidade.altura_livre_m) camposAtualizar.altura_livre_m = necessidade.altura_livre_m
    } else if (tipo_elemento === 'defensas') {
      camposAtualizar.lado = necessidade.lado
      camposAtualizar.funcao = necessidade.funcao
      if (necessidade.geometria) camposAtualizar.geometria = necessidade.geometria
      if (necessidade.extensao_metros) camposAtualizar.extensao_metros = necessidade.extensao_metros
    }

    // 4. Atualizar inventário com dados da necessidade
    const { error: updateError } = await supabaseClient
      .from(tabelaInventario as any)
      .update(camposAtualizar)
      .eq('id', inventario_id)

    if (updateError) {
      console.error('[Aceitar Auto] Erro ao atualizar inventário:', updateError)
      throw updateError
    }

    console.log(`[Aceitar Auto] Inventário ${inventario_id} atualizado com dados do projeto`)

    // 5. Atualizar match_resultados
    const { error: matchUpdateError } = await supabaseClient
      .from('match_resultados')
      .update({
        decision: 'ACEITAR_AUTO',
        status: 'RECONCILIADO',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        comment: comment || null,
      })
      .eq('id', match_id)

    if (matchUpdateError) {
      console.error('[Aceitar Auto] Erro ao atualizar match:', matchUpdateError)
      throw matchUpdateError
    }

    // 6. Atualizar necessidade
    const { error: necUpdateError } = await supabaseClient
      .from(tabelaNecessidade as any)
      .update({
        reconciliado: true,
        data_reconciliacao: new Date().toISOString(),
        servico_final: 'Substituir',
        servico: 'Substituir',
      })
      .eq('id', necessidade_id)

    if (necUpdateError) {
      console.error('[Aceitar Auto] Erro ao atualizar necessidade:', necUpdateError)
      throw necUpdateError
    }

    console.log(`[Aceitar Auto] ✓ Decisão registrada com sucesso`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Match aceito e inventário atualizado com dados do projeto',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Aceitar Auto] Erro:', error)
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
