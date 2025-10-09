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
    const { userId, newEmail } = await req.json()

    if (!userId || !newEmail) {
      throw new Error('userId e newEmail são obrigatórios')
    }

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

    // Primeiro, verificar o usuário atual
    console.log('Buscando informações do usuário:', userId)
    const { data: currentUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (getUserError) {
      console.error('Erro ao buscar usuário:', getUserError)
      throw new Error('Usuário não encontrado')
    }
    
    console.log('Usuário atual - email:', currentUser.user.email)
    console.log('Novo email:', newEmail)

    // Verificar se o email já está em uso por outro usuário
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (!listError && existingUsers) {
      const emailInUse = existingUsers.users.find(u => 
        u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== userId
      )
      
      if (emailInUse) {
        console.log('Email já está em uso pelo usuário:', emailInUse.id)
        throw new Error('Este email já está sendo usado por outro usuário')
      }
    }

    // Atualizar o email do usuário
    console.log('Atualizando email do usuário:', userId)
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )

    if (updateError) {
      console.error('Erro detalhado ao atualizar email:', {
        message: updateError.message,
        status: updateError.status,
        code: (updateError as any).code,
        details: JSON.stringify(updateError)
      })
      
      // Verificar se é erro de email duplicado
      const errorStr = JSON.stringify(updateError)
      if (errorStr.includes('duplicate') || 
          errorStr.includes('already exists') || 
          errorStr.includes('users_email_partial_key')) {
        throw new Error('Este email já está sendo usado por outro usuário')
      }
      
      throw new Error(updateError.message || 'Erro ao atualizar email do usuário')
    }

    console.log('Email atualizado com sucesso')

    return new Response(
      JSON.stringify({ 
        message: 'Email atualizado com sucesso',
        userId: userId,
        newEmail: newEmail
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
