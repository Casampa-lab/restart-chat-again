import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const codigo = formData.get('codigo') as string;

    if (!file || !codigo) {
      throw new Error('Arquivo e código são obrigatórios');
    }

    // Validar extensão
    if (!file.name.toLowerCase().endsWith('.svg')) {
      throw new Error('Apenas arquivos SVG são permitidos');
    }

    // Validar tamanho (máximo 1MB)
    if (file.size > 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo: 1MB');
    }

    // Detectar categoria baseado no prefixo do código
    let categoria = '';
    const prefixo = codigo.split('-')[0];
    
    if (prefixo === 'R') {
      categoria = 'regulamentacao';
    } else if (prefixo === 'A') {
      categoria = 'advertencia';
    } else {
      const prefixosIndicacao = ['ID', 'OD', 'ED', 'SAU', 'TNA', 'THC', 'TAD', 'TAR', 'TIT'];
      if (prefixosIndicacao.some(p => codigo.startsWith(p))) {
        categoria = 'indicacao';
      } else {
        throw new Error('Código de placa não reconhecido');
      }
    }

    // Ler conteúdo do arquivo
    const fileContent = await file.arrayBuffer();

    // Validar se é XML/SVG válido
    const textDecoder = new TextDecoder();
    const svgContent = textDecoder.decode(fileContent);
    
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      throw new Error('Arquivo não é um SVG válido');
    }

    // Upload para Supabase Storage
    const filePath = `${categoria}/${codigo}.svg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('placa-svgs')
      .upload(filePath, fileContent, {
        contentType: 'image/svg+xml',
        upsert: true, // Permite sobrescrever se já existir
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('placa-svgs')
      .getPublicUrl(filePath);

    console.log(`Upload concluído: ${codigo} → ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        path: filePath,
        url: publicUrl,
        codigo,
        categoria,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na função upload-placa-svg:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
