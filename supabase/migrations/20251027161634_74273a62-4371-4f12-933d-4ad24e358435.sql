-- Limpar policies antigas das 7 tabelas de intervenções

-- defensas_intervencoes
drop policy if exists "Coordenadores can view all defensas intervencoes" on public.defensas_intervencoes;
drop policy if exists "Users can view their own defensas intervencoes" on public.defensas_intervencoes;

-- ficha_cilindros_intervencoes
drop policy if exists "Users can create their own cilindros interventions" on public.ficha_cilindros_intervencoes;
drop policy if exists "Coordenadores can view all cilindros intervencoes" on public.ficha_cilindros_intervencoes;
drop policy if exists "Users can view their own cilindros intervencoes" on public.ficha_cilindros_intervencoes;

-- ficha_inscricoes_intervencoes
drop policy if exists "Users can create intervencoes for inscricoes" on public.ficha_inscricoes_intervencoes;
drop policy if exists "Coordenadores can view all inscricoes intervencoes" on public.ficha_inscricoes_intervencoes;
drop policy if exists "Users can view their own inscricoes intervencoes" on public.ficha_inscricoes_intervencoes;

-- ficha_marcas_longitudinais_intervencoes
drop policy if exists "Users can create intervencoes for marcas longitudinais" on public.ficha_marcas_longitudinais_intervencoes;
drop policy if exists "Coordenadores can view all marcas longitudinais intervencoes" on public.ficha_marcas_longitudinais_intervencoes;
drop policy if exists "Users can view their own marcas longitudinais intervencoes" on public.ficha_marcas_longitudinais_intervencoes;

-- ficha_placa_intervencoes
drop policy if exists "Users can delete intervencoes of fichas placa" on public.ficha_placa_intervencoes;
drop policy if exists "Users can create intervencoes for fichas placa" on public.ficha_placa_intervencoes;
drop policy if exists "Users can create intervencoes for placas" on public.ficha_placa_intervencoes;
drop policy if exists "Coordenadores can view all intervencoes" on public.ficha_placa_intervencoes;
drop policy if exists "Users can view intervencoes of their own fichas placa" on public.ficha_placa_intervencoes;
drop policy if exists "Users can view their own placas intervencoes" on public.ficha_placa_intervencoes;
drop policy if exists "Users can update intervencoes of fichas placa" on public.ficha_placa_intervencoes;

-- ficha_porticos_intervencoes
drop policy if exists "Users can create intervencoes for porticos" on public.ficha_porticos_intervencoes;
drop policy if exists "Coordenadores can view all porticos intervencoes" on public.ficha_porticos_intervencoes;
drop policy if exists "Users can view their own porticos intervencoes" on public.ficha_porticos_intervencoes;

-- ficha_tachas_intervencoes
drop policy if exists "Users can create intervencoes for tachas" on public.ficha_tachas_intervencoes;
drop policy if exists "Coordenadores can view all tachas intervencoes" on public.ficha_tachas_intervencoes;
drop policy if exists "Users can view their own tachas intervencoes" on public.ficha_tachas_intervencoes;