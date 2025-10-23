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

    // 3. Buscar registro antigo do inventário para verificar origem
    const tabelaInventario = `inventario_${tipo_elemento}`
    const { data: registroAntigo, error: antigoError } = await supabaseClient
      .from(tabelaInventario as any)
      .select('*')
      .eq('id', inventario_id)
      .single()

    if (antigoError || !registroAntigo) {
      console.error('[Aceitar Auto] Erro ao buscar registro antigo:', antigoError)
      throw new Error('Registro antigo não encontrado')
    }

    // 4. Preparar campos para o novo/atualizado registro
    const camposAtualizar: any = {
      last_source: 'PROJETO',
      updated_at: new Date().toISOString(),
      solucao_planilha: necessidade.solucao_planilha || null,
      status_servico: necessidade.solucao_planilha === 'Remover' ? 'AGUARDANDO_REMOCAO' : 'ATIVO',
    }

    // Mapear campos específicos por tipo
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

    let novoRegistroId = inventario_id

    // 5. Lógica de substituição ou atualização
    if (registroAntigo.origem === 'cadastro_inicial') {
      // CASO 1: Substituição - desativar antigo e criar novo
      console.log(`[Aceitar Auto] Substituindo registro cadastro_inicial por necessidade`)

      // 5.1. Desativar registro antigo
      const { error: desativarError } = await supabaseClient
        .from(tabelaInventario as any)
        .update({
          ativo: false,
          substituido_em: new Date().toISOString(),
        })
        .eq('id', inventario_id)

      if (desativarError) {
        console.error('[Aceitar Auto] Erro ao desativar registro antigo:', desativarError)
        throw desativarError
      }

      // 5.2. Criar novo registro com origem='necessidade'
      const novoRegistro: any = {
        ...camposAtualizar,
        origem: 'necessidade',
        ativo: true,
        user_id: necessidade.user_id || registroAntigo.user_id,
        lote_id: necessidade.lote_id || registroAntigo.lote_id,
        rodovia_id: necessidade.rodovia_id || registroAntigo.rodovia_id,
        km_inicial: necessidade.km_inicial || registroAntigo.km_inicial,
        km_final: necessidade.km_final || registroAntigo.km_final,
        latitude_inicial: necessidade.latitude_inicial || registroAntigo.latitude_inicial,
        longitude_inicial: necessidade.longitude_inicial || registroAntigo.longitude_inicial,
        latitude_final: necessidade.latitude_final || registroAntigo.latitude_final,
        longitude_final: necessidade.longitude_final || registroAntigo.longitude_final,
      }

      const { data: novoReg, error: insertError } = await supabaseClient
        .from(tabelaInventario as any)
        .insert(novoRegistro)
        .select()
        .single()

      if (insertError || !novoReg) {
        console.error('[Aceitar Auto] Erro ao criar novo registro:', insertError)
        throw insertError
      }

      novoRegistroId = novoReg.id

      // 5.3. Linkar antigo → novo
      const { error: linkError } = await supabaseClient
        .from(tabelaInventario as any)
        .update({
          substituido_por: novoRegistroId,
        })
        .eq('id', inventario_id)

      if (linkError) {
        console.error('[Aceitar Auto] Erro ao linkar registros:', linkError)
        throw linkError
      }

      console.log(`[Aceitar Auto] ✓ Novo registro criado: ${novoRegistroId}, antigo desativado: ${inventario_id}`)
    } else {
      // CASO 2: Atualização - já é origem='necessidade', apenas atualizar
      console.log(`[Aceitar Auto] Atualizando registro origem=necessidade existente`)

      const { error: updateError } = await supabaseClient
        .from(tabelaInventario as any)
        .update(camposAtualizar)
        .eq('id', inventario_id)

      if (updateError) {
        console.error('[Aceitar Auto] Erro ao atualizar inventário:', updateError)
        throw updateError
      }

      console.log(`[Aceitar Auto] ✓ Registro ${inventario_id} atualizado`)
    }

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
