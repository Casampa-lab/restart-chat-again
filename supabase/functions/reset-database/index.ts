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

    // 8. PRESERVAR coordinator_assignments
    console.log('🔒 Preservando coordinator_assignments (não deletados)')

    // 9. Deletar destinatários email
    console.log('Deletando destinatários email...')
    await supabaseAdmin.from('destinatarios_email').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 10. PRESERVAR lotes, rodovias, lotes_rodovias e coordinator_assignments
    console.log('🔒 Preservando lotes, rodovias, vínculos e atribuições de coordenadores (não deletados)')

    // 11. PRESERVAR empresas, assinaturas e módulos
    console.log('🔒 Preservando empresas e assinaturas (não deletados)')

    // 12. PRESERVAR todos os usuários (profiles, roles, supervisoras, auth)
    console.log('🔒 Preservando todos os usuários e supervisoras (não deletados)')

    // 13. Limpar storage buckets
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
        preservados: {
          lotes_rodovias: true,
          coordinator_assignments: true,
          empresas: true,
          usuarios: true
        },
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
