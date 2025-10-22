import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Reconciliação - Marcar Inconsistência no Projeto')

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

    if (!comment || comment.trim() === '') {
      throw new Error('Comentário obrigatório para marcar inconsistência')
    }

    console.log(`[Inconsistência] Match ID: ${match_id}, User: ${user.id}`)

    // 1. Buscar dados do match
    const { data: matchData, error: matchError } = await supabaseClient
      .from('match_resultados')
      .select('*')
      .eq('id', match_id)
      .single()

    if (matchError || !matchData) {
      console.error('[Inconsistência] Erro ao buscar match:', matchError)
      throw new Error('Match não encontrado')
    }

    // 2. Atualizar match_resultados - NÃO fecha o match, marca para revisão
    const { error: matchUpdateError } = await supabaseClient
      .from('match_resultados')
      .update({
        decision: 'INCONSISTENCIA_PROJETO',
        status: 'A_REVISAR',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        comment: comment,
        exportar_para_projetista: true, // Flag para incluir na exportação
      })
      .eq('id', match_id)

    if (matchUpdateError) {
      console.error('[Inconsistência] Erro ao atualizar match:', matchUpdateError)
      throw matchUpdateError
    }

    console.log(`[Inconsistência] ✓ Match ${match_id} marcado para revisão do projetista`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inconsistência registrada. Item incluído na planilha de pendências para o projetista.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Inconsistência] Erro:', error)
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
