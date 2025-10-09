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
    const { email, password, nome, role, supervisoraId } = await req.json()

    if (!email || !password || !nome || !role) {
      throw new Error('Email, senha, nome e perfil são obrigatórios')
    }

    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres')
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

    let userId: string;

    // Tentar criar usuário no auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    // Se o usuário já existe, buscar o ID dele
    if (createError && createError.message.includes('already been registered')) {
      console.log('Usuário já existe, buscando ID...')
      
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = users.users.find(u => u.email === email)
      
      if (!existingUser) {
        throw new Error('Não foi possível encontrar o usuário existente')
      }

      userId = existingUser.id
      
      // Atualizar senha do usuário existente
      await supabaseAdmin.auth.admin.updateUserById(userId, { password })
      
      console.log('Senha atualizada para usuário existente')
    } else if (createError) {
      throw createError
    } else {
      userId = userData.user.id
    }

    // Verificar se o profile já existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      // Atualizar profile existente
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          nome,
          email,
          supervisora_id: supervisoraId || null
        })
        .eq('id', userId)

      if (updateError) throw updateError
    } else {
      // Criar novo profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          nome,
          email,
          supervisora_id: supervisoraId || null
        })

      if (profileError) throw profileError
    }

    // Deletar roles antigas e inserir nova
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role
      })

    if (roleError) throw roleError

    return new Response(
      JSON.stringify({ 
        message: 'Usuário criado/atualizado com sucesso',
        userId: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
