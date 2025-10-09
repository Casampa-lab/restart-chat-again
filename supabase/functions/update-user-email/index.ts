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

    // Atualizar o email do usuário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )

    if (updateError) {
      // Verificar se é erro de email duplicado
      if (updateError.message.includes('duplicate') || updateError.message.includes('already exists')) {
        throw new Error('Este email já está sendo usado por outro usuário')
      }
      throw updateError
    }

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
