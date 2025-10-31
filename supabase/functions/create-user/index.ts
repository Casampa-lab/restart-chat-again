// Imports necessários
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS liberado (ajuste depois se precisar restringir)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Lê variáveis de ambiente definidas via `supabase secrets set`
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas."
  )
}

// Cliente administrativo (service_role). NÃO expor isso em front-end.
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Handler HTTP da função Edge
serve(async (req) => {
  // Pré-resposta para OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Lê o corpo enviado no POST
    const { email, password, nome, role, supervisoraId } = await req.json()

    // Validações básicas
    if (!email || !password || !nome || !role) {
      throw new Error("Email, senha, nome e perfil são obrigatórios")
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres")
    }

    // =========================================
    // 1. Criar (ou recuperar) usuário no Auth
    // =========================================
    let userId: string

    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      })

    if (createError && createError.message.includes("already been registered")) {
      // Usuário já existe
      console.log("Usuário já existe, buscando ID...")

      const { data: usersList, error: listErr } =
        await supabaseAdmin.auth.admin.listUsers()
      if (listErr) {
        throw new Error("Não foi possível listar usuários existentes")
      }

      const existingUser = usersList.users.find((u) => u.email === email)
      if (!existingUser) {
        throw new Error("Não foi possível encontrar o usuário existente")
      }

      userId = existingUser.id

      // Atualizar senha do usuário existente
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password },
      )
      if (pwErr) {
        console.error("Erro atualizando senha:", pwErr)
      } else {
        console.log("Senha atualizada para usuário existente")
      }
    } else if (createError) {
      // Erro real de criação
      throw createError
    } else {
      // Criado agora
      userId = userData.user.id
    }

    // =========================================
    // 2. Sincronizar tabela profiles
    // =========================================
    const { data: existingProfile, error: profileCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (profileCheckErr && profileCheckErr.code !== "PGRST116") {
      // PGRST116 = no rows found (PostgREST "not found" comum do .single())
      console.warn("Aviso ao consultar profile:", profileCheckErr)
    }

    if (existingProfile) {
      // Atualizar profile existente
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          nome,
          email,
          supervisora_id: supervisoraId || null,
        })
        .eq("id", userId)

      if (updateError) throw updateError
    } else {
      // Criar profile novo
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          nome,
          email,
          supervisora_id: supervisoraId || null,
        })

      if (profileError) throw profileError
    }

    // =========================================
    // 3. Atualizar papel (user_roles)
    // =========================================
    // Remove papéis antigos
    const { error: delRoleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)

    if (delRoleErr) throw delRoleErr

    // Define o novo papel
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
      })

    if (roleError) throw roleError

    // =========================================
    // 4. Se for coordenador, monta os assignments
    // =========================================
    if (role === "coordenador" && supervisoraId) {
      console.log("🔗 Coordenador detectado, criando assignments automáticos...")

      // Buscar lotes da supervisora
      const { data: lotesData, error: lotesError } = await supabaseAdmin
        .from("lotes")
        .select("id")
        .eq("supervisora_id", supervisoraId)

      if (lotesError) {
        console.error("Erro ao buscar lotes:", lotesError)
      } else if (lotesData && lotesData.length > 0) {
        console.log(`📦 Encontrados ${lotesData.length} lotes para associar`)

        const assignments = lotesData.map((lote) => ({
          user_id: userId,
          lote_id: lote.id,
        }))

        // Limpa assignments antigos desse coordenador
        const { error: delAssignErr } = await supabaseAdmin
          .from("coordinator_assignments")
          .delete()
          .eq("user_id", userId)

        if (delAssignErr) {
          console.error("Erro ao limpar assignments antigos:", delAssignErr)
        }

        // Cria novos assignments
        const { error: assignError } = await supabaseAdmin
          .from("coordinator_assignments")
          .insert(assignments)

        if (assignError) {
          console.error("Erro ao criar assignments:", assignError)
        } else {
          console.log(`✅ ${assignments.length} assignments criados com sucesso`)
        }
      } else {
        console.log("⚠️ Nenhum lote encontrado para esta supervisora")
      }
    }

    // =========================================
    // 5. Resposta final OK
    // =========================================
    return new Response(
      JSON.stringify({
        message: "Usuário criado/atualizado com sucesso",
        userId: userId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    const errorMessage = error instanceof Error
      ? error.message
      : "Erro desconhecido"

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    )
  }
})
