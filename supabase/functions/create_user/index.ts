// create_user Edge Function
// Cria usuário no auth, registra em profiles e atribui papel

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // Cliente com privilégios elevados (service role)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { nome, email, senha, perfil, supervisora_id } = await req.json();

    // 1. Cria usuário no Auth
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (createError) throw createError;
    const newUserId = created.user.id;

    // 2. Cria registro no profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: newUserId,
        nome,
        email,
        role: perfil,            // ex: "Técnico de Campo", "Coordenador", "Administrador"
        supervisora_id,
      });

    if (profileError) throw profileError;

    // 3. Reflete papel também em user_roles (se tabela existir)
    // mapeando o nome exibido no painel para nossos enums internos
    let mappedRole = "tecnico";
    if (perfil.toLowerCase().includes("admin")) {
      mappedRole = "admin";
    } else if (perfil.toLowerCase().includes("coorden")) {
      mappedRole = "coordenador";
    }

    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: mappedRole,
      });

    if (roleError) {
      console.warn("Aviso: falha ao inserir em user_roles:", roleError);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: newUserId,
      }),
      { status: 200 }
    );

  } catch (err: any) {
    console.error("Erro na função create_user:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message ?? String(err),
      }),
      { status: 400 }
    );
  }
});
