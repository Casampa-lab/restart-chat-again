import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('[Chat Assistant] Processing request with', messages.length, 'messages');

    // System prompt customizado para BR-LEGAL 2
    const systemPrompt = `Você é um assistente especializado no sistema BR-LEGAL 2, uma plataforma de gestão de rodovias brasileiras desenvolvida com React + TypeScript + Supabase + Tailwind CSS.

O sistema gerencia:
- Inventário de sinalizações (placas, marcas longitudinais, tachas, cilindros, defensas, pórticos, inscrições)
- Necessidades de manutenção e intervenções
- Relatórios SUPRA no padrão DNIT
- Não conformidades
- Reconciliação de elementos

Contexto técnico:
- Stack: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase
- Padrões: DNIT, Contran (regulamentação brasileira de trânsito)
- Módulos: Inventário Dinâmico, Necessidades, Supervisão, Relatórios, Coordenação

Ajude o desenvolvedor com dúvidas sobre desenvolvimento, arquitetura, lógica de negócio, regulamentações e integrações. Sempre forneça respostas claras, práticas e em português do Brasil.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Chat Assistant] OpenAI API error:', response.status, error);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit atingido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    console.log('[Chat Assistant] Streaming response started');

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Chat Assistant] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar requisição' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
