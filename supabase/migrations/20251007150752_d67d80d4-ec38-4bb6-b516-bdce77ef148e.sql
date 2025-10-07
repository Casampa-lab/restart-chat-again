-- Add enviado_coordenador field to all user record tables

-- Defensas
ALTER TABLE public.defensas 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Frentes Liberadas
ALTER TABLE public.frentes_liberadas 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Ficha Placa
ALTER TABLE public.ficha_placa 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Ficha Verificação
ALTER TABLE public.ficha_verificacao 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Intervenções SH
ALTER TABLE public.intervencoes_sh 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Intervenções SV
ALTER TABLE public.intervencoes_sv 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Intervenções Inscrições
ALTER TABLE public.intervencoes_inscricoes 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Intervenções Tacha
ALTER TABLE public.intervencoes_tacha 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Retrorrefletividade Estática
ALTER TABLE public.retrorrefletividade_estatica 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Retrorrefletividade Dinâmica
ALTER TABLE public.retrorrefletividade_dinamica 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;

-- Registro NC
ALTER TABLE public.registro_nc 
ADD COLUMN IF NOT EXISTS enviado_coordenador boolean DEFAULT false;