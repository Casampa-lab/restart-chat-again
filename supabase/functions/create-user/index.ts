import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Lê variáveis de ambiente que você já definiu com `supabase secrets set`
// Na CLI nova, não pode usar prefixo SUPABASE_. Por isso usamos PROJECT_URL e SERVICE_ROLE_KEY.
// Também deixo fallback pra SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY caso um dia você rode local.
const SUPABASE_URL =
  Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "PROJECT_URL / SERVICE_ROLE_KEY ausentes. Rode 'supabase secrets set' com nomes válidos."
  )
}

// Cliente admin (service_role). Isso roda só no backend.
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, password, nome, role, supervisoraId } = await req.json()

    // validação mínima
    if (!email || !password || !nome || !role) {
      throw new Error("Email, senha, nome e perfil são obrigatórios")
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres")
    }

    // 1. Criar usuário no Auth (ou reaproveitar se já existir)
    let userId: string

    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      })

    if (createError && createError.message.includes("already been registered")) {
      // usuário já existe -> pegar ID existente e atualizar senha
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
      throw createError
    } else {
      userId = userData.user.id
    }

    // 2. Sincronizar tabela profiles
    const { data: existingProfile, error: profileCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (profileCheckErr) {
      console.warn("Aviso ao consultar profile:", profileCheckErr)
    }

    if (existingProfile) {
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

    // 3. Atualizar papel em user_roles
    const { error: delRoleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)

    if (delRoleErr) throw delRoleErr

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
      })

    if (roleError) throw roleError

    // 4. Se for coordenador, fazer assignments automáticos
    if (role === "coordenador" && supervisoraId) {
      console.log("🔗 Coordenador detectado, criando assignments automáticos...")

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

        const { error: delAssignErr } = await supabaseAdmin
          .from("coordinator_assignments")
          .delete()
          .eq("user_id", userId)

        if (delAssignErr) {
          console.error("Erro ao limpar assignments antigos:", delAssignErr)
        }

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

    // 5. Resposta final
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
