import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Exportar Pendências para Projetista')

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

    const url = new URL(req.url)
    const tipo_elemento = url.searchParams.get('tipo_elemento') || null
    const resetFlag = url.searchParams.get('reset_flag') === 'true'

    console.log(`[Exportar] Tipo: ${tipo_elemento || 'TODOS'}, Reset flag: ${resetFlag}`)

    // 1. Buscar matches marcados para exportação
    let query = supabaseClient
      .from('match_resultados')
      .select(`
        *,
        necessidades:necessidade_id(*),
        inventario:inventario_id(*)
      `)
      .eq('exportar_para_projetista', true)
      .eq('status', 'A_REVISAR')

    if (tipo_elemento) {
      query = query.eq('tipo_elemento', tipo_elemento)
    }

    const { data: pendencias, error: fetchError } = await query
      .order('tipo_elemento', { ascending: true })
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('[Exportar] Erro ao buscar pendências:', fetchError)
      throw fetchError
    }

    if (!pendencias || pendencias.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma pendência para exportar',
          total: 0,
          csv: '',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`[Exportar] ${pendencias.length} pendências encontradas`)

    // 2. Gerar CSV
    const csvRows: string[] = []
    
    // Cabeçalho
    csvRows.push([
      'ID Necessidade',
      'ID Inventário',
      'Tipo Elemento',
      'KM Inicial',
      'KM Final',
      'Latitude Inicial',
      'Longitude Inicial',
      'Lado',
      'Código Necessidade',
      'Código Inventário',
      'Serviço Projeto',
      'Distância Match (m)',
      'Comentário Revisor',
      'Data Revisão',
      'Revisor'
    ].join(','))

    // Dados
    for (const item of pendencias) {
      const nec: any = item.necessidades || {}
      const inv: any = item.inventario || {}

      const row = [
        item.necessidade_id || '',
        item.inventario_id || '',
        item.tipo_elemento || '',
        nec.km_inicial?.toFixed(3) || '',
        nec.km_final?.toFixed(3) || '',
        nec.latitude_inicial?.toFixed(6) || '',
        nec.longitude_inicial?.toFixed(6) || '',
        nec.lado || inv.lado || '',
        nec.codigo || '',
        inv.codigo || '',
        nec.servico || nec.solucao_planilha || '',
        item.distancia_match?.toFixed(1) || '',
        `"${(item.comment || '').replace(/"/g, '""')}"`, // Escapar aspas no CSV
        item.reviewed_at ? new Date(item.reviewed_at).toISOString() : '',
        item.reviewer_id || '',
      ]

      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    // 3. Se solicitado, resetar flag após exportação
    if (resetFlag) {
      const idsToUpdate = pendencias.map(p => p.id)
      
      const { error: resetError } = await supabaseClient
        .from('match_resultados')
        .update({
          exportar_para_projetista: false,
          exportado_em: new Date().toISOString(),
        })
        .in('id', idsToUpdate)

      if (resetError) {
        console.error('[Exportar] Erro ao resetar flags:', resetError)
        // Não falhar por isso
      } else {
        console.log(`[Exportar] ${idsToUpdate.length} flags resetadas`)
      }
    }

    // 4. Retornar CSV
    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pendencias_projetista_${new Date().toISOString().split('T')[0]}.csv"`,
      },
      status: 200,
    })
  } catch (error) {
    console.error('[Exportar] Erro:', error)
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
