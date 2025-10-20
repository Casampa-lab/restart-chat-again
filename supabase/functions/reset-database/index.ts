import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🗑️ Iniciando reset completo do banco de dados...')

    // 1. Deletar históricos e intervenções (dependentes)
    console.log('Deletando históricos e intervenções...')
    await supabaseAdmin.from('ficha_placa_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_porticos_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_marcas_longitudinais_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_cilindros_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_inscricoes_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_tachas_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('defensas_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    await supabaseAdmin.from('ficha_placa_intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_porticos_intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_marcas_longitudinais_intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_cilindros_intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_inscricoes_intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_tachas_intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('defensas_intervencoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 2. Deletar fichas/cadastros
    console.log('Deletando fichas de cadastro...')
    await supabaseAdmin.from('ficha_placa_danos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_placa').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_porticos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_marcas_longitudinais').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_cilindros').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_inscricoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_tachas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('defensas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 3. Deletar verificações
    console.log('Deletando verificações...')
    await supabaseAdmin.from('ficha_verificacao').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_verificacao_sh').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('ficha_verificacao_sv').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 4. Deletar retrorefletividade
    console.log('Deletando dados de retrorefletividade...')
    await supabaseAdmin.from('retrorrefletividade_estatica').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('retrorrefletividade_dinamica').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 4.5. Deletar reconciliações
    console.log('Deletando reconciliações...')
    await supabaseAdmin.from('reconciliacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 5. Deletar elementos pendentes, NCs, notificações
    console.log('Deletando elementos pendentes, NCs e notificações...')
    await supabaseAdmin.from('elementos_pendentes_aprovacao').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('nao_conformidades').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('notificacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('auditoria_sinalizacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 6. Deletar sessões de trabalho e frentes liberadas
    console.log('Deletando sessões de trabalho...')
    await supabaseAdmin.from('sessoes_trabalho').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('frentes_liberadas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 7. Deletar necessidades
    console.log('Deletando necessidades...')
    await supabaseAdmin.from('necessidades_placas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('necessidades_porticos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('necessidades_marcas_longitudinais').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('necessidades_cilindros').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('necessidades_marcas_transversais').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('necessidades_tachas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('necessidades_defensas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 8. Deletar coordinator assignments
    console.log('Deletando coordinator assignments...')
    await supabaseAdmin.from('coordinator_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 9. Deletar destinatários email
    console.log('Deletando destinatários email...')
    await supabaseAdmin.from('destinatarios_email').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 10. Deletar lotes_rodovias
    console.log('Deletando lotes_rodovias...')
    await supabaseAdmin.from('lotes_rodovias').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 11. Deletar rodovias e lotes
    console.log('Deletando rodovias e lotes...')
    await supabaseAdmin.from('rodovias').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('lotes').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 11.5. Aguardar migrations recriarem dados base (lotes e rodovias)
    console.log('⏳ Aguardando migrations recriarem dados base...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 11.6. Recriar vínculos essenciais lote-rodovia
    console.log('🔗 Recriando vínculos lote-rodovia...')
    
    // Buscar Lote 99
    const { data: lote99, error: loteError } = await supabaseAdmin
      .from('lotes')
      .select('id')
      .eq('numero', 99)
      .maybeSingle()

    if (loteError) {
      console.log('⚠️ Erro ao buscar Lote 99:', loteError.message)
    }

    // Buscar BR-116
    const { data: br116, error: rodoviaError } = await supabaseAdmin
      .from('rodovias')
      .select('id')
      .eq('codigo', 'BR-116')
      .maybeSingle()

    if (rodoviaError) {
      console.log('⚠️ Erro ao buscar BR-116:', rodoviaError.message)
    }

    // Recriar vínculo se ambos existirem
    if (lote99 && br116) {
      const { error: vinculoError } = await supabaseAdmin
        .from('lotes_rodovias')
        .insert({
          lote_id: lote99.id,
          rodovia_id: br116.id,
          km_inicial: 0,
          km_final: 999
        })

      if (vinculoError) {
        console.log('⚠️ Erro ao recriar vínculo Lote 99 - BR-116:', vinculoError.message)
      } else {
        console.log('✅ Vínculo Lote 99 - BR-116 recriado com sucesso')
      }
    } else {
      console.log('⚠️ Lote 99 ou BR-116 não encontrados após reset. Vínculo não recriado.')
      console.log(`   Lote 99 encontrado: ${!!lote99}, BR-116 encontrada: ${!!br116}`)
    }

    // 12. Deletar empresas
    console.log('Deletando empresas...')
    await supabaseAdmin.from('empresas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 13. Deletar assinaturas e módulos
    console.log('Deletando assinaturas...')
    await supabaseAdmin.from('assinatura_modulos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('assinaturas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 14. Buscar admin antes de deletar usuários
    console.log('Identificando usuário admin...')
    const { data: adminUsers } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
    
    const adminIds = adminUsers?.map(u => u.user_id) || []
    console.log(`Admin IDs preservados: ${adminIds.join(', ')}`)

    // 15. Deletar user_roles (exceto admin)
    console.log('Deletando user roles (exceto admin)...')
    if (adminIds.length > 0) {
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .not('user_id', 'in', `(${adminIds.map(id => `'${id}'`).join(',')})`)
    }

    // 16. Deletar profiles (exceto admin)
    console.log('Deletando profiles (exceto admin)...')
    if (adminIds.length > 0) {
      await supabaseAdmin
        .from('profiles')
        .delete()
        .not('id', 'in', `(${adminIds.map(id => `'${id}'`).join(',')})`)
    }

    // 17. Deletar supervisoras
    console.log('Deletando supervisoras...')
    await supabaseAdmin.from('supervisoras').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 18. Deletar usuários auth (exceto admin)
    console.log('Deletando usuários auth (exceto admin)...')
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers()
    
    for (const user of allUsers.users) {
      if (!adminIds.includes(user.id)) {
        await supabaseAdmin.auth.admin.deleteUser(user.id)
        console.log(`Usuário deletado: ${user.email}`)
      }
    }

    // 19. Limpar storage buckets
    console.log('Limpando storage buckets...')
    const buckets = [
      'nc-photos',
      'verificacao-photos', 
      'placa-photos',
      'supervisora-logos',
      'porticos',
      'inscricoes',
      'marcas-longitudinais',
      'tachas',
      'defensas',
      'cilindros',
      'intervencoes-fotos'
    ]

    for (const bucket of buckets) {
      try {
        const { data: files } = await supabaseAdmin.storage.from(bucket).list()
        if (files && files.length > 0) {
          const filePaths = files.map(f => f.name)
          await supabaseAdmin.storage.from(bucket).remove(filePaths)
          console.log(`Bucket ${bucket} limpo: ${filePaths.length} arquivos removidos`)
        }
      } catch (error) {
        console.error(`Erro ao limpar bucket ${bucket}:`, error)
      }
    }

    console.log('✅ Reset completo do banco de dados finalizado!')

    return new Response(
      JSON.stringify({ 
        message: 'Banco de dados resetado com sucesso',
        admins_preservados: adminIds.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro ao resetar banco:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
