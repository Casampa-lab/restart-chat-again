import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NCEmailRequest {
  numero_nc: string;
  empresa: string;
  tipo_nc: string;
  problema_identificado: string;
  data_ocorrencia: string;
  rodovia: string;
  km_referencia: string;
  observacao: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se a API key está configurada
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não configurada");
      throw new Error("RESEND_API_KEY não está configurada");
    }

    const ncData: NCEmailRequest = await req.json();
    
    console.log("Enviando email para NC:", ncData.numero_nc);
    console.log("Dados recebidos:", JSON.stringify(ncData));

    // Buscar destinatários ativos do banco
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/destinatarios_email?ativo=eq.true&select=email,nome,tipo`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar destinatários: ${response.statusText}`);
    }

    const destinatarios = await response.json();
    
    if (destinatarios.length === 0) {
      console.log("Nenhum destinatário ativo encontrado");
      return new Response(
        JSON.stringify({ message: "Nenhum destinatário ativo cadastrado" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emails = destinatarios.map((d: any) => d.email);
    console.log(`Enviando para ${emails.length} destinatários:`, emails);

    // Enviar email usando API direta do Resend
    const emailPayload = {
      from: "DNIT - Não Conformidades <cassia.sampaio@dnit.gov.br>",
      to: emails,
      subject: `Nova Não Conformidade: ${ncData.numero_nc}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Nova Não Conformidade Registrada</h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Número NC:</strong> ${ncData.numero_nc}</p>
            <p><strong>Empresa:</strong> ${ncData.empresa}</p>
            <p><strong>Tipo:</strong> ${ncData.tipo_nc}</p>
            <p><strong>Problema:</strong> ${ncData.problema_identificado}</p>
            <p><strong>Data:</strong> ${new Date(ncData.data_ocorrencia).toLocaleDateString('pt-BR')}</p>
            <p><strong>Rodovia:</strong> ${ncData.rodovia}</p>
            <p><strong>KM:</strong> ${ncData.km_referencia}</p>
          </div>
          
          ${ncData.observacao ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #374151;">Observações:</h3>
              <p style="color: #6b7280;">${ncData.observacao}</p>
            </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px;">
            Este é um email automático do Sistema de Registro de Não Conformidades do DNIT.
          </p>
        </div>
      `,
    };

    console.log("Payload do email:", JSON.stringify(emailPayload));

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    console.log("Status da resposta:", emailResponse.status);
    const emailData = await emailResponse.json();
    console.log("Resposta completa:", JSON.stringify(emailData));

    if (!emailResponse.ok) {
      throw new Error(`Erro ao enviar email: ${JSON.stringify(emailData)}`);
    }

    console.log("Email enviado com sucesso:", emailData.id);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailData.id,
      destinatarios: emails.length 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
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
