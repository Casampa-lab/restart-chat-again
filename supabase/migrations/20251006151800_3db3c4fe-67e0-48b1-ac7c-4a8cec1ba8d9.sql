-- Tabela para armazenar e-mails de coordenadores e fiscais
CREATE TABLE public.destinatarios_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('coordenador', 'fiscal')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.destinatarios_email ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin full access destinatarios_email"
  ON public.destinatarios_email
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can read active destinatarios"
  ON public.destinatarios_email
  FOR SELECT
  USING (ativo = true);