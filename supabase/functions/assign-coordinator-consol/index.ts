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

    console.log('🔗 Iniciando associação do coordenador Sampaio aos lotes da CONSOL...')

    // Dados do coordenador Sampaio
    const coordinatorId = '0487d64b-0101-4273-b264-dfea66623d99'
    
    // IDs dos 7 lotes da CONSOL (04 a 10)
    const loteIds = [
      '7e4ee65d-7c56-45b0-9f0b-4f3106a26e84', // Lote 04
      'ba14fccc-d668-4913-950a-2ea1b0668694', // Lote 05
      '963995cc-4aa1-4db1-9310-70844f4ebaaa', // Lote 06
      '64ea190d-0a3b-4272-ba43-95571a92699b', // Lote 07
      '61f28021-a644-42b8-b7b8-2d5275a4d758', // Lote 08
      'f293a5a5-bb85-494c-b72c-e6a84dd656ed', // Lote 09
      '0f23788b-3fd8-44b3-b398-0c0b7896e649'  // Lote 10
    ]

    // Verificar se o coordenador existe
    console.log('🔍 Verificando se o coordenador existe...')
    const { data: coordenador, error: coordError } = await supabaseAdmin
      .from('profiles')
      .select('id, nome')
      .eq('id', coordinatorId)
      .single()
    
    if (coordError || !coordenador) {
      console.error('❌ Coordenador não encontrado:', coordError)
      throw new Error(`Coordenador não encontrado: ${coordError?.message || 'ID inválido'}`)
    }
    
    console.log('✅ Coordenador encontrado:', coordenador.nome)

    // Verificar se os lotes existem
    console.log('🔍 Verificando se os lotes existem...')
    const { data: lotes, error: lotesError } = await supabaseAdmin
      .from('lotes')
      .select('id, numero')
      .in('id', loteIds)
    
    if (lotesError) {
      console.error('❌ Erro ao buscar lotes:', lotesError)
      throw new Error(`Erro ao buscar lotes: ${lotesError.message}`)
    }
    
    if (!lotes || lotes.length !== loteIds.length) {
      console.warn('⚠️ Alguns lotes não foram encontrados')
      console.log('Lotes encontrados:', lotes?.map(l => `${l.numero} (${l.id})`).join(', '))
      console.log('Lotes esperados:', loteIds.length)
    } else {
      console.log('✅ Todos os lotes encontrados:', lotes.map(l => l.numero).join(', '))
    }

    // Criar registros de associação
    const assignments = loteIds.map(loteId => ({
      user_id: coordinatorId,
      lote_id: loteId
    }))

    console.log('📝 Criando associações:', JSON.stringify(assignments, null, 2))

    const { data, error } = await supabaseAdmin
      .from('coordinator_assignments')
      .insert(assignments)
      .select()
    
    console.log('📊 Resultado do insert:', { data, error })

    if (error) {
      throw error
    }

    console.log(`✅ ${assignments.length} associações criadas/atualizadas com sucesso!`)

    return new Response(
      JSON.stringify({ 
        message: 'Coordenador associado aos lotes com sucesso',
        coordinator: 'sampaio.mcvs@gmail.com',
        lotes_associados: ['04', '05', '06', '07', '08', '09', '10'],
        total_assignments: assignments.length,
        data: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error)
    console.error('❌ Erro ao associar coordenador:', errorMessage)
    console.error('📋 Detalhes completos do erro:', errorDetails)
    console.error('🔍 Objeto de erro:', JSON.stringify(error, null, 2))
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        fullError: error
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
