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

    // Verificar se já existe um usuário admin
    const { data: existingAdmin } = await supabaseAdmin
      .from('profiles')
      .select('id, user_roles!inner(role)')
      .eq('user_roles.role', 'admin')
      .maybeSingle()

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ message: 'Admin já existe', admin_id: existingAdmin.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Criar usuário admin
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@operavia.com',
      password: '123456*',
      email_confirm: true,
      user_metadata: {
        nome: 'Administrador'
      }
    })

    if (userError) throw userError

    // Criar perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        nome: 'Administrador',
        supervisora_id: null
      })

    if (profileError) throw profileError

    // Adicionar role admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'admin'
      })

    if (roleError) throw roleError

    return new Response(
      JSON.stringify({ 
        message: 'Administrador criado com sucesso',
        email: 'admin@operavia.com',
        user_id: newUser.user.id
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