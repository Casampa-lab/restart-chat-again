# Mapa de Necessidades - Placas

## Card 4 - Implementação Completa

Este componente implementa o **Card 4** do sistema de matching, fornecendo uma visualização geográfica das necessidades de placas **sem filtros de distância**.

## Características Principais

### ✅ 1. Sem Bloqueio por Distância
```typescript
// ANTES (com filtro de distância):
const filteredData = data.filter(item => item.distance <= tolerance);

// DEPOIS (Card 4):
const filteredData = data; // Todos os itens, sempre
```

A distância GPS é usada apenas para:
- **Ordenar visualmente** no mapa
- **Indicador de proximidade** (badge/tooltip)
- **Diagnóstico** (ajuda a entender o contexto)

### ✅ 2. Ordenação por km_inicial
```typescript
.order('km_inicial', { ascending: true })
```

**Benefícios:**
- Navegação sequencial pela rodovia
- Facilita inspeção visual em ordem geográfica
- Independente de ter ou não GPS

### ✅ 3. Badge de Vínculo

**Indicadores implementados:**

| Badge | Significado | Cor |
|-------|-------------|-----|
| 🟢 Match Direto | `MATCH_DIRECT` | Verde |
| 🔄 Substituição | `SUBSTITUICAO` | Azul |
| ⚠️ Múltiplos | `MULTIPLE_CANDIDATES` | Âmbar |
| ⚠️ Faixa Cinza | `GRAY_ZONE` | Amarelo |
| ⚠️ Ambíguo | `AMBIGUOUS` | Laranja |
| ❌ Sem Match | `NO_MATCH` | Vermelho |
| ⏳ Pendente | `null` | Cinza |

**Ícone de vínculo:**
```tsx
{cadastro_id && <LinkIcon className="h-3 w-3 text-primary" />}
```

Mostra 🔗 quando a necessidade está vinculada a um elemento do cadastro.

### ✅ 4. Distância como Indicador (não filtro)

```typescript
// Marcador no mapa
const el = document.createElement('div');
el.style.backgroundColor = DECISION_COLORS[match_decision];

// Tooltip com informações
.setPopup(
  new mapboxgl.Popup({ offset: 25 }).setHTML(`
    <div>KM ${km_inicial.toFixed(3)}</div>
    <div>${DECISION_LABELS[match_decision]}</div>
  `)
)
```

**Não há:**
- ❌ Filtro automático por distância
- ❌ Remoção de itens distantes
- ❌ Bloqueio de visualização

**Há apenas:**
- ✅ Indicação visual de distância
- ✅ Cores diferentes por tipo de match
- ✅ Tooltips informativos

## Fluxo de Uso

### 1. Acesso
```
Admin → Matching → Abrir Mapa de Necessidades
```

### 2. Seleção de Contexto
- Selecionar **Rodovia**
- Selecionar **Lote**
- Clicar em "Abrir Mapa de Necessidades"

### 3. Visualização

**Mapa (Direita):**
- Marcadores coloridos por tipo de match
- Clique no marcador → seleciona necessidade
- Zoom automático para mostrar todos os marcadores

**Lista (Esquerda):**
- Ordenada por `km_inicial ASC`
- Badge de decisão de match
- Indicador de vínculo (🔗)
- GPS disponível ou "Sem coordenadas GPS"

### 4. Filtros Disponíveis

```typescript
// Busca textual
searchTerm: string // código ou km

// Filtro por decisão
filterDecision: 
  | 'TODOS'
  | 'PENDENTE'
  | 'MATCH_DIRECT'
  | 'SUBSTITUICAO'
  | 'MULTIPLE_CANDIDATES'
  | 'GRAY_ZONE'
  | 'AMBIGUOUS'
  | 'NO_MATCH'
```

⚠️ **Importante:** Nenhum destes filtros remove itens por distância GPS!

## Casos de Uso

### Caso 1: Necessidade com GPS
```json
{
  "id": "abc-123",
  "codigo": "R-19",
  "km_inicial": 42.350,
  "latitude_inicial": -15.7801,
  "longitude_inicial": -47.9292,
  "match_decision": "MATCH_DIRECT",
  "cadastro_id": "xyz-789"
}
```

**Resultado:**
- ✅ Aparece no mapa (marcador verde)
- ✅ Aparece na lista (com badge verde)
- ✅ Ícone de vínculo 🔗
- ✅ Clicável para ver detalhes

### Caso 2: Necessidade sem GPS (fallback por KM)
```json
{
  "id": "def-456",
  "codigo": "R-1",
  "km_inicial": 50.125,
  "latitude_inicial": null,
  "longitude_inicial": null,
  "match_decision": "SUBSTITUICAO",
  "cadastro_id": "uvw-321"
}
```

**Resultado:**
- ⚠️ **Não** aparece no mapa (sem coordenadas)
- ✅ Aparece na lista (com badge azul)
- ✅ Ícone de vínculo 🔗
- ✅ Indicador "Sem coordenadas GPS"
- ✅ Match foi feito via KM (funcionou!)

### Caso 3: Necessidade pendente de matching
```json
{
  "id": "ghi-789",
  "codigo": "A-21b",
  "km_inicial": 35.750,
  "latitude_inicial": -15.7850,
  "longitude_inicial": -47.9350,
  "match_decision": null,
  "cadastro_id": null
}
```

**Resultado:**
- ✅ Aparece no mapa (marcador cinza)
- ✅ Aparece na lista (com badge cinza "⏳ Pendente")
- ❌ Sem ícone de vínculo
- ✅ Aguardando execução de matching

## Diferenças do Sistema Anterior

| Aspecto | Antes | Agora (Card 4) |
|---------|-------|----------------|
| **Filtro distância** | ✅ Filtrava automaticamente | ❌ Não filtra |
| **Itens distantes** | ❌ Removidos da visualização | ✅ Sempre visíveis |
| **Ordenação** | Por distância GPS | Por km_inicial |
| **Badge vínculo** | ❌ Não existia | ✅ Implementado |
| **Fallback KM** | ❌ Bloqueava sem GPS | ✅ Funciona perfeitamente |

## Integração com Matching

### Antes do Matching
```typescript
// match_decision = null
// cadastro_id = null
// Badge: "⏳ Pendente"
// Cor: Cinza
```

### Após ExecutarMatching
```typescript
// match_decision = 'MATCH_DIRECT' | 'SUBSTITUICAO' | etc
// cadastro_id = 'uuid' | null
// Badge: correspondente à decisão
// Cor: correspondente ao resultado
```

### Com Fallback por KM
```typescript
// Se GPS null:
//   - Não aparece no mapa
//   - Aparece na lista normalmente
//   - Matching usa km_inicial
//   - Resultado aparece normalmente
```

## Benefícios

1. **Transparência Total**
   - Todos os itens sempre visíveis
   - Nenhum filtro oculto
   - Diagnóstico completo

2. **Suporte a Fallback KM**
   - Necessidades sem GPS não são excluídas
   - Aparecem na lista ordenada por KM
   - Podem ser matchadas por proximidade de KM

3. **Navegação Intuitiva**
   - Ordem sequencial por km_inicial
   - Fácil encontrar gaps ou problemas
   - Zoom automático no mapa

4. **Indicadores Claros**
   - Badge colorido por decisão
   - Ícone de vínculo quando matchado
   - Score e reason_code visíveis

## Troubleshooting

### "Nenhuma necessidade no mapa"
✅ **Normal** se:
- Nenhuma necessidade tem GPS
- Todas usaram fallback por KM
- Verifique a lista lateral (deve ter itens)

### "Item aparece na lista mas não no mapa"
✅ **Esperado** se:
- `latitude_inicial` ou `longitude_inicial` são `null`
- Item foi matchado via fallback por KM
- Não é um erro - é uma feature!

### "Distância não está sendo usada"
✅ **Correto!** 
- Distância é apenas indicador visual
- Não filtra, não remove
- Card 4 funcionando como especificado
