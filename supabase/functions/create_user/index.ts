
// create_user Edge Function
// Objetivo: criar usuário no auth, salvar no profiles e vincular à supervisora

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // Criar cliente com SERVICE_ROLE (pode criar usuário no auth)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,                // URL do seu projeto Supabase
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!    // Service Role Key (chave secreta)
  );

  try {
    // Lê o corpo enviado pelo front
    const { nome, email, senha, perfil, supervisora_id } = await req.json();

    // 1. Criar o usuário no auth
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (createError) throw createError;
    const newUserId = created.user.id;

    // 2. Inserir no profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: newUserId,
        nome,
        email,
        role: perfil,             // ex: "Tecnico de Campo", "Coordenador", "Admin"
        supervisora_id,
      });

    if (profileError) throw profileError;

    // 3. Inserir role também na user_roles (pra você continuar sendo admin e coordenador etc.)
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: perfil === "Administrador" ? "admin"
             : perfil === "Coordenador" ? "coordenador"
             : "tecnico",
      });

    if (roleError) {
      // não é crítico, só avisa
      console.warn("Falha ao salvar em user_roles:", roleError);
    }

    return new Response(JSON.stringify({
      ok: true,
      user_id: newUserId,
    }), { status: 200 });

  } catch (err: any) {
    console.error("Erro na função create_user:", err);
    return new Response(JSON.stringify({
      ok: false,
      error: err.message ?? err.toString(),
    }), { status: 400 });
  }
});
