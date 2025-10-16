import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NCNotificationRequest {
  nc_id: string;
  pdf_base64: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não está configurada");
    }

    const { nc_id, pdf_base64 }: NCNotificationRequest = await req.json();
    
    console.log("Processando notificação para NC:", nc_id);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados completos da NC
    const { data: ncData, error: ncError } = await supabase
      .from('nao_conformidades')
      .select(`
        *,
        rodovias(codigo, uf),
        lotes(
          numero,
          contrato,
          responsavel_executora,
          email_executora,
          nome_fiscal_execucao,
          email_fiscal_execucao
        )
      `)
      .eq('id', nc_id)
      .single();

    if (ncError || !ncData) {
      throw new Error(`Erro ao buscar NC: ${ncError?.message}`);
    }

    // Verificar se NC já foi notificada anteriormente
    if (ncData.data_notificacao) {
      console.log("NC já foi notificada anteriormente em:", ncData.data_notificacao);
      return new Response(
        JSON.stringify({ error: "NC já foi notificada anteriormente" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Buscar supervisora_id - primeiro tenta do perfil do usuário, senão busca da empresa do lote
    let supervisora_id: string | null = null;
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('supervisora_id')
      .eq('id', ncData.user_id)
      .single();

    if (profileData?.supervisora_id) {
      supervisora_id = profileData.supervisora_id;
    } else {
      // Se usuário não tem supervisora_id (ex: admin), busca através da empresa do lote
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .select('empresas(supervisora_id)')
        .eq('id', ncData.lote_id)
        .single();

      if (loteError || !loteData || !(loteData as any).empresas?.supervisora_id) {
        throw new Error('Não foi possível identificar a supervisora do lote');
      }
      
      supervisora_id = (loteData as any).empresas.supervisora_id;
    }

    if (!supervisora_id) {
      throw new Error('Não foi possível identificar a supervisora');
    }

    const { data: supervisoraData, error: supervisoraError } = await supabase
      .from('supervisoras')
      .select('nome_empresa, email_envio')
      .eq('id', supervisora_id)
      .single();

    if (supervisoraError) {
      throw new Error('Erro ao buscar dados da supervisora');
    }

    // Buscar coordenadores através da tabela user_roles
    const { data: coordRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'coordenador');

    if (rolesError) {
      console.error('Erro ao buscar roles de coordenadores:', rolesError);
    }

    const coordIds = coordRoles?.map(r => r.user_id) || [];
    const { data: coordEmails, error: coordEmailsError } = await supabase
      .from('profiles')
      .select('email')
      .in('id', coordIds)
      .eq('supervisora_id', supervisora_id)
      .not('email', 'is', null);

    // Montar lista de destinatários conforme solicitado
    const destinatarios: string[] = [];
    const copias: string[] = [];
    
    // 1. Email da Executora (principal)
    if (ncData.lotes?.email_executora) {
      destinatarios.push(ncData.lotes.email_executora);
    }
    
    // 2. Fiscal de Execução (cópia)
    if (ncData.lotes?.email_fiscal_execucao) {
      copias.push(ncData.lotes.email_fiscal_execucao);
    }

    // 3. cassia.sampaio@me.com (cópia fixa)
    copias.push('cassia.sampaio@me.com');

    // 4. Coordenadores da supervisora (cópias)
    if (coordEmails && coordEmails.length > 0) {
      coordEmails.forEach(coord => {
        if (coord.email && !copias.includes(coord.email) && !destinatarios.includes(coord.email)) {
          copias.push(coord.email);
        }
      });
    }

    // Se não tem executora, primeiro coordenador vira principal
    if (destinatarios.length === 0 && copias.length > 0) {
      destinatarios.push(copias.shift()!);
    }

    if (destinatarios.length === 0) {
      throw new Error('Nenhum destinatário encontrado. Configure o email da executora no cadastro do lote ou adicione coordenadores.');
    }

    console.log('Destinatários:', destinatarios);
    console.log('Cópias:', copias);

    // Preparar conteúdo do email
    const kmInfo = ncData.km_inicial && ncData.km_final 
      ? `${ncData.km_inicial} ao ${ncData.km_final}`
      : ncData.km_referencia || 'N/A';

    // Determinar email de envio (usa o configurado na supervisora ou padrão)
    const emailFrom = supervisoraData.email_envio 
      ? `${supervisoraData.nome_empresa} <${supervisoraData.email_envio}>`
      : `${supervisoraData.nome_empresa} - Notificações <notificacao@operavia.online>`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Notificação de Não Conformidade</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número NC:</strong> ${ncData.numero_nc}</p>
          <p><strong>Data:</strong> ${new Date(ncData.data_ocorrencia).toLocaleDateString('pt-BR')}</p>
          <p><strong>Empresa:</strong> ${ncData.empresa}</p>
          <p><strong>Rodovia:</strong> ${ncData.rodovias?.codigo}</p>
          <p><strong>KM:</strong> ${kmInfo}</p>
          <p><strong>Lote:</strong> ${ncData.lotes?.numero}</p>
          <p><strong>Tipo:</strong> ${ncData.tipo_nc}</p>
          <p><strong>Problema:</strong> ${ncData.problema_identificado}</p>
        </div>
        
        ${ncData.observacao ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #374151;">Observações:</h3>
            <p style="color: #6b7280;">${ncData.observacao}</p>
          </div>
        ` : ''}
        
        <p style="margin-top: 20px;">
          O relatório detalhado em PDF está anexado a este email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        
        <p style="color: #9ca3af; font-size: 12px;">
          Este é um email automático do Sistema de Registro de Não Conformidades - ${supervisoraData.nome_empresa}.
        </p>
      </div>
    `;

    // Limpar base64 - remover prefixo data:application/pdf;base64, se existir
    const cleanBase64 = pdf_base64.replace(/^data:application\/pdf;base64,/, '');

    // Validação do base64
    console.log('Tamanho do PDF base64:', cleanBase64.length);
    console.log('Primeiros 50 caracteres:', cleanBase64.substring(0, 50));

    // Enviar email via Resend
    const emailPayload: any = {
      from: emailFrom,
      to: destinatarios,
      subject: `Não Conformidade: ${ncData.numero_nc} - ${ncData.rodovias?.codigo}`,
      html: emailHtml,
      attachments: [
        {
          filename: `NC_${ncData.numero_nc}.pdf`,
          content: cleanBase64,
          type: 'application/pdf',
          encoding: 'base64'
        }
      ]
    };

    if (copias.length > 0) {
      emailPayload.cc = copias;
    }

    console.log('Enviando email...');

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Erro ao enviar email: ${JSON.stringify(emailData)}`);
    }

    console.log('Email enviado com sucesso:', emailData.id);

    // Atualizar apenas status de envio na NC, preservando data_notificacao original
    await supabase
      .from('nao_conformidades')
      .update({ 
        enviado_coordenador: true
      })
      .eq('id', nc_id);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailData.id,
      destinatarios: destinatarios.length + copias.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao processar notificação:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
