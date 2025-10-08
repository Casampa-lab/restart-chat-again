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

    // Buscar dados da supervisora através do perfil do usuário
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('supervisora_id')
      .eq('id', ncData.user_id)
      .single();

    if (profileError || !profileData?.supervisora_id) {
      throw new Error('Não foi possível identificar a supervisora');
    }

    const { data: supervisoraData, error: supervisoraError } = await supabase
      .from('supervisoras')
      .select('nome_empresa, email_envio')
      .eq('id', profileData.supervisora_id)
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
      .eq('supervisora_id', profileData.supervisora_id)
      .not('email', 'is', null);

    // Montar lista de destinatários
    const destinatarios: string[] = [];
    
    // Email principal: responsável da executora
    if (ncData.lotes?.email_executora) {
      destinatarios.push(ncData.lotes.email_executora);
    }

    // Cópias
    const copias: string[] = [];
    
    // Fiscal da execução
    if (ncData.lotes?.email_fiscal_execucao) {
      copias.push(ncData.lotes.email_fiscal_execucao);
    }

    // Coordenadores da supervisora
    if (coordEmails && coordEmails.length > 0) {
      coordEmails.forEach(coord => {
        if (coord.email && !copias.includes(coord.email)) {
          copias.push(coord.email);
        }
      });
    }

    if (destinatarios.length === 0 && copias.length === 0) {
      throw new Error('Nenhum destinatário encontrado para enviar o email');
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
      : `${supervisoraData.nome_empresa} <noreply@operavia.online>`;

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

    // Enviar email via Resend
    const emailPayload: any = {
      from: emailFrom,
      to: destinatarios,
      subject: `Não Conformidade: ${ncData.numero_nc} - ${ncData.rodovias?.codigo}`,
      html: emailHtml,
      attachments: [
        {
          filename: `NC_${ncData.numero_nc}.pdf`,
          content: pdf_base64,
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

    // Atualizar data de notificação na NC
    await supabase
      .from('nao_conformidades')
      .update({ data_notificacao: new Date().toISOString() })
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
