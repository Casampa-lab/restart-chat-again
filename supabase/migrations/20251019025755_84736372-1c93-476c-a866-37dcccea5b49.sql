-- Adicionar campos GPS específicos para cada medição de retrorrefletividade

-- Campos GPS para medições SH (Sinalização Horizontal)
ALTER TABLE ficha_verificacao_itens
  ADD COLUMN IF NOT EXISTS retro_bd_gps_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS retro_bd_gps_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS retro_e_gps_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS retro_e_gps_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS retro_be_gps_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS retro_be_gps_lng NUMERIC;

-- Campos GPS para medição SV (Sinalização Vertical)
ALTER TABLE ficha_verificacao_itens
  ADD COLUMN IF NOT EXISTS retro_sv_gps_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS retro_sv_gps_lng NUMERIC;

-- Comentários explicativos
COMMENT ON COLUMN ficha_verificacao_itens.retro_bd_gps_lat IS 'Latitude capturada durante medição de retrorrefletividade BD (Bordo Direito)';
COMMENT ON COLUMN ficha_verificacao_itens.retro_bd_gps_lng IS 'Longitude capturada durante medição de retrorrefletividade BD';
COMMENT ON COLUMN ficha_verificacao_itens.retro_e_gps_lat IS 'Latitude capturada durante medição de retrorrefletividade Eixo';
COMMENT ON COLUMN ficha_verificacao_itens.retro_e_gps_lng IS 'Longitude capturada durante medição de retrorrefletividade Eixo';
COMMENT ON COLUMN ficha_verificacao_itens.retro_be_gps_lat IS 'Latitude capturada durante medição de retrorrefletividade BE (Bordo Esquerdo)';
COMMENT ON COLUMN ficha_verificacao_itens.retro_be_gps_lng IS 'Longitude capturada durante medição de retrorrefletividade BE';
COMMENT ON COLUMN ficha_verificacao_itens.retro_sv_gps_lat IS 'Latitude capturada durante medição de retrorrefletividade SV (Sinalização Vertical)';
COMMENT ON COLUMN ficha_verificacao_itens.retro_sv_gps_lng IS 'Longitude capturada durante medição de retrorrefletividade SV';