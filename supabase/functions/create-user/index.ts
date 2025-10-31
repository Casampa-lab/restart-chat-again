import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

// 1. Lê variáveis de ambiente
const SUPABASE_URL =
  Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "PROJECT_URL / SERVICE_ROLE_KEY ausentes. Rode 'supabase secrets set' antes do deploy.",
  )
}

// 2. Cria cliente admin (service_role)
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

// 3. Função auxiliar p/ padronizar erro 400 já com ponto de falha
function fail(where: string, message: string) {
  console.log(`[FAIL] ${where}: ${message}`)
  return new Response(
    JSON.stringify({
      error: message,
      where,
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  )
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // ======================================================
    // [0] Ler e validar entrada
    // ======================================================
    const { email, password, nome, role, supervisoraId } = await req.json()

    if (!email || !password || !nome || !role) {
      return fail(
        "VALIDACAO_INICIAL",
        "Email, senha, nome e perfil são obrigatórios",
      )
    }

    if (password.length < 6) {
      return fail(
        "VALIDACAO_SENHA",
        "A senha deve ter pelo menos 6 caracteres",
      )
    }

    // ======================================================
    // [1] Criar ou recuperar usuário no Auth
    // ======================================================
    console.log("[1] Tentando criar usuário no auth.admin.createUser")
    let userId: string

    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      })

    if (createError && createError.message?.includes("already been registered")) {
      console.log("[1] Usuário já existe. Vou buscar ID e atualizar senha")

      const { data: usersList, error: listErr } =
        await supabaseAdmin.auth.admin.listUsers()

      if (listErr) {
        return fail(
          "AUTH_LIST_USERS",
          `Não foi possível listar usuários existentes: ${listErr.message ?? listErr}`,
        )
      }

      const existingUser = usersList.users.find((u) => u.email === email)
      if (!existingUser) {
        return fail(
          "AUTH_EXISTING_LOOKUP",
          "Não foi possível encontrar o usuário existente pelo e-mail",
        )
      }

      userId = existingUser.id

      console.log(`[1] Atualizando senha do usuário existente ${userId}`)

      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password },
      )
      if (pwErr) {
        console.log("[1] Erro ao atualizar senha:", pwErr)
        return fail(
          "AUTH_UPDATE_PASSWORD",
          `Erro atualizando senha: ${pwErr.message ?? pwErr}`,
        )
      }
    } else if (createError) {
      console.log("[1] Erro ao criar usuário NOVO:", createError)
      return fail(
        "AUTH_CREATE_USER",
        createError.message ?? String(createError),
      )
    } else {
      if (!userData || !userData.user || !userData.user.id) {
        return fail(
          "AUTH_RETURN_EMPTY",
          "Supabase criou usuário mas não retornou ID",
        )
      }
      userId = userData.user.id
      console.log(`[1] Usuário novo criado com ID ${userId}`)
    }

    // ======================================================
    // [2] Garantir registro / atualização na tabela profiles
    // ======================================================
    console.log("[2] Sincronizando profiles")

    const { data: existingProfile, error: profileCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (profileCheckErr) {
      console.log("[2] Aviso ao consultar profile:", profileCheckErr)
      // não dou fail aqui porque é apenas um aviso de "not found" em alguns casos
    }

    if (existingProfile) {
      console.log("[2] Profile existe, atualizando")
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          nome,
          email,
          supervisora_id: supervisoraId || null,
        })
        .eq("id", userId)

      if (updateError) {
        console.log("[2] Erro ao atualizar profile:", updateError)
        return fail(
          "PROFILE_UPDATE",
          updateError.message ?? String(updateError),
        )
      }
    } else {
      console.log("[2] Profile não existe, criando")
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          nome,
          email,
          supervisora_id: supervisoraId || null,
        })

      if (profileError) {
        console.log("[2] Erro ao inserir profile:", profileError)
        return fail(
          "PROFILE_INSERT",
          profileError.message ?? String(profileError),
        )
      }
    }

    // ======================================================
    // [3] Atualizar papel em user_roles
    // ======================================================
    console.log("[3] Atualizando user_roles")
    const { error: delRoleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)

    if (delRoleErr) {
      console.log("[3] Erro deletando roles antigas:", delRoleErr)
      return fail(
        "ROLES_DELETE",
        delRoleErr.message ?? String(delRoleErr),
      )
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
      })

    if (roleError) {
      console.log("[3] Erro inserindo novo role:", roleError)
      return fail(
        "ROLES_INSERT",
        roleError.message ?? String(roleError),
      )
    }

    // ======================================================
    // [4] Se for coordenador, criar assignments automáticos
    // ======================================================
    if (role === "coordenador" && supervisoraId) {
      console.log("[4] Coordenador detectado, criando assignments automáticos")

      // pegar lotes daquela supervisora
      const { data: lotesData, error: lotesError } = await supabaseAdmin
        .from("lotes")
        .select("id")
        .eq("supervisora_id", supervisoraId)

      if (lotesError) {
        console.log("[4] Erro buscando lotes:", lotesError)
        return fail(
          "LOTES_SELECT",
          lotesError.message ?? String(lotesError),
        )
      }

      if (lotesData && lotesData.length > 0) {
        console.log(`[4] Encontrados ${lotesData.length} lotes`)

        const assignments = lotesData.map((lote) => ({
          user_id: userId,
          lote_id: lote.id,
        }))

        console.log("[4] Limpando assignments antigos")
        const { error: delAssignErr } = await supabaseAdmin
          .from("coordinator_assignments")
          .delete()
          .eq("user_id", userId)

        if (delAssignErr) {
          console.log("[4] Erro limpando assignments antigos:", delAssignErr)
          return fail(
            "ASSIGN_DELETE",
            delAssignErr.message ?? String(delAssignErr),
          )
        }

        console.log("[4] Inserindo novos assignments")
        const { error: assignError } = await supabaseAdmin
          .from("coordinator_assignments")
          .insert(assignments)

        if (assignError) {
          console.log("[4] Erro inserindo assignments:", assignError)
          return fail(
            "ASSIGN_INSERT",
            assignError.message ?? String(assignError),
          )
        }
      } else {
        console.log("[4] Nenhum lote encontrado para essa supervisoraId")
      }
    }

    // ======================================================
    // [5] Sucesso total
    // ======================================================
    console.log("[5] Sucesso total para usuário", userId)
    return new Response(
      JSON.stringify({
        message: "Usuário criado/atualizado com sucesso",
        userId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    )
  } catch (err) {
    console.error("[X] ERRO GERAL CATCH", err)

    let details = "Erro desconhecido"
    if (err && typeof err === "object") {
      // @ts-ignore
      if (err.message) {
        // @ts-ignore
        details = err.message
      } else {
        try {
          details = JSON.stringify(err)
        } catch {
          details = String(err)
        }
      }
    } else {
      details = String(err)
    }

    return new Response(
      JSON.stringify({
        error: details,
        where: "ERRO_DESCONHECIDO",
      }),
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
