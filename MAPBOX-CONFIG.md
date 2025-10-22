# Configuração do Mapbox

Este projeto usa Mapbox para visualização de mapas de necessidades.

## Obter Token do Mapbox

1. Acesse [mapbox.com](https://mapbox.com)
2. Crie uma conta ou faça login
3. Acesse o Dashboard
4. Vá para a seção "Tokens"
5. Copie seu **Public Token** (começa com `pk.`)

## Configurar Token no Projeto

### Opção 1: Variável de Ambiente (Recomendado)

Adicione o token no arquivo `.env`:

```env
VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHh4In0.xxxxxxxxxxxxx
```

### Opção 2: Via Supabase Edge Function Secrets (Produção)

Para ambientes de produção, use os secrets do Supabase:

```bash
supabase secrets set MAPBOX_PUBLIC_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHh4In0.xxxxxxxxxxxxx
```

## Funcionalidades do Mapa

### Mapa de Necessidades - Placas

Acesse via: **Admin → Aba Matching → Abrir Mapa de Necessidades**

**Características:**
- ✅ Visualização geográfica de todas as necessidades de placas
- ✅ Ordenação por `km_inicial` (não por distância GPS)
- ✅ Marcadores coloridos por tipo de match:
  - 🟢 Verde = Match Direto
  - 🔵 Azul = Substituição
  - 🟡 Amarelo = Faixa Cinza
  - 🟠 Laranja = Ambíguo / Múltiplos Candidatos
  - 🔴 Vermelho = Sem Match
  - ⚪ Cinza = Pendente (não matchado ainda)

**Filtros disponíveis:**
- Busca por código ou KM
- Filtro por decisão de match
- Lista lateral ordenada por KM

**Badges de vínculo:**
- 🔗 Ícone de link quando `cadastro_id` existe
- Badge colorido com tipo de decisão
- Score de match (quando disponível)
- Reason code detalhado

## Card 4 - Especificações Implementadas

✅ **Não bloquear pendentes por distância**
- Distância GPS é usada apenas como indicador visual
- Não há filtros que removem itens por distância
- Todos os itens são mostrados, independente da distância

✅ **Ordenação por km_inicial**
- Lista lateral sempre ordenada por `km_inicial ASC`
- Facilita navegação sequencial pela rodovia

✅ **Badge de vínculo**
- Mostra se tem `cadastro_id` (elemento vinculado)
- Indica tipo de match (MATCH_DIRECT, SUBSTITUICAO, etc)
- Exibe score e reason_code quando disponíveis

✅ **Distância como indicador**
- Usada para ordenar visualmente no mapa
- Não remove ou oculta nenhuma necessidade
- Ajuda no diagnóstico, mas não bloqueia ações

## Limitações

⚠️ **Necessidades sem GPS:**
- Aparecem na lista lateral
- Não aparecem no mapa (sem coordenadas)
- Indicador visual "Sem coordenadas GPS"
- Podem usar fallback por KM no matching

## Troubleshooting

### "Token Mapbox não configurado"
- Verifique se `VITE_MAPBOX_PUBLIC_TOKEN` está no `.env`
- Reinicie o servidor de desenvolvimento após adicionar a variável
- Confirme que o token é válido e público (começa com `pk.`)

### Mapa não carrega
- Verifique o console do navegador para erros
- Confirme conexão com internet
- Verifique se o token tem permissões corretas no Mapbox

### Marcadores não aparecem
- Verifique se as necessidades têm `latitude_inicial` e `longitude_inicial`
- Use fallback por KM para necessidades sem GPS
- Confira se a query está retornando dados
