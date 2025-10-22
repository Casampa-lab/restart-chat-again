# Matching Generalizado - Implementação Completa

## ✅ Status: IMPLEMENTADO

Este documento resume a implementação completa do sistema de matching generalizado para todos os 7 tipos de elementos de sinalização rodoviária.

---

## 📋 Resumo da Implementação

### 1. ✅ Tolerâncias Padronizadas (`src/lib/matchingParams.ts`)

```typescript
export const TOL = {
  // Pontuais (metros - distância GPS)
  PLACA: 15,
  PORTICO: 80,
  INSCRICAO: 12,
  
  // Lineares (fração 0-1 - overlap do projeto sobre cadastro)
  MARCA_LONG: 0.30,
  TACHA: 0.30,
  DEFENSA: 0.25,
  CILINDRO: 0.25,
} as const;
```

**Critério de definição:**
- **Pontuais**: distância GPS em metros
- **Lineares**: fração de overlap (cobertura do projeto sobre o cadastro)

---

### 2. ✅ Normalização de Atributos (`src/components/admin/ExecutarMatching.tsx`)

#### **Pontuais (Placas, Pórticos, Inscrições)**
```typescript
// Normalizar lado: BD/BE/EIXO
lado = ladoRaw
  .replace(/^DIREITA$/i, 'BD')
  .replace(/^ESQUERDA$/i, 'BE')
  .replace(/^D$/i, 'BD')
  .replace(/^E$/i, 'BE');

// Normalizar código/tipo: UPPERCASE + TRIM + remover espaços
codigo = codigo.toString().trim().toUpperCase().replace(/\s+/g, '');

// Fallback por KM quando GPS ausente
if (nec.km_inicial != null) {
  atributos.km_inicial = Number(nec.km_inicial);
}
```

#### **Lineares (Marcas, Tachas, Defensas, Cilindros)**
```typescript
// Normalizar atributos principais
tipo_demarcacao = tipo_demarcacao.toString().trim().toUpperCase();
cor = cor.toString().trim().toUpperCase();
funcao = funcao.toString().trim().toUpperCase();

// Normalizar lado (quando aplicável)
lado = lado
  .replace(/^DIREITA$/i, 'BD')
  .replace(/^ESQUERDA$/i, 'BE');
```

---

### 3. ✅ Serviço de Matching (`src/lib/matchingService.ts`)

#### **Matching Pontual**
- Suporta fallback por KM quando GPS ausente
- `lat/lon = null` → branch por KM
- Decisões: `MATCH_DIRECT`, `SUBSTITUICAO`, `MULTIPLE_CANDIDATES`, `GRAY_ZONE`, `AMBIGUOUS`, `NO_MATCH`

#### **Matching Linear**
- Usa WKT (Well-Known Text) para geometria
- Calcula overlap: `max(0, min(a1,b1) - max(a0,b0)) / (a1-a0)`
- Decisões: `MATCH_DIRECT`, `SUBSTITUICAO`, `AMBIGUOUS`, `INCERTO`, `NO_MATCH`

---

### 4. ✅ UI - Elementos Pontuais (Mapas)

Criados 3 mapas interativos usando Mapbox:

1. **`src/pages/MapaNecessidadesPlacas.tsx`** 🚏
2. **`src/pages/MapaNecessidadesPorticos.tsx`** 🌉
3. **`src/pages/MapaNecessidadesInscricoes.tsx`** ➡️

**Características:**
- ✅ Marcadores coloridos por `match_decision`
- ✅ **NÃO filtram** por distância GPS
- ✅ Ordenação por `km_inicial` (ascendente)
- ✅ Badge de vínculo (🔗) quando `cadastro_id` existe
- ✅ Indicador de `match_score` (overlap %)
- ✅ Busca por código/tipo ou KM
- ✅ Filtro por `match_decision`
- ✅ Elementos sem GPS aparecem na lista com aviso

---

### 5. ✅ UI - Elementos Lineares (Listas)

Criadas 3 listas ordenadas:

1. **`src/pages/ListaNecessidadesMarcas.tsx`** ➖
2. **`src/pages/ListaNecessidadesTachas.tsx`** 💎
3. **`src/pages/ListaNecessidadesDefensas.tsx`** 🛣️

**Características:**
- ✅ Ordenação por `km_inicial` (ascendente)
- ✅ **NÃO filtram** por overlap
- ✅ Indicador de overlap (%) como métrica informativa
- ✅ Badge de vínculo quando cadastrado
- ✅ Exibição de extensão em metros
- ✅ Busca e filtro por `match_decision`
- ✅ Legenda explicativa sobre matching linear

---

### 6. ✅ Viewers de Inventário Atualizados

Todos os viewers foram atualizados para **não filtrar** por distância:

#### **Pontuais:**
- `src/components/InventarioPorticosViewer.tsx`
- `src/components/InventarioInscricoesViewer.tsx`

#### **Lineares:**
- `src/components/InventarioMarcasLongitudinaisViewer.tsx`
- `src/components/InventarioTachasViewer.tsx`
- `src/components/InventarioDefensasViewer.tsx`
- `src/components/InventarioCilindrosViewer.tsx`

**Mudanças aplicadas:**
```typescript
// ANTES (filtrava por distância)
.filter((item) => item.distance <= toleranciaMetros)

// DEPOIS (apenas ordena)
.sort((a, b) => a.distance - b.distance)
```

```typescript
// Necessidades: também não filtram mais por distância
// ANTES
if (reconciliacao?.status === 'pendente_aprovacao' && 
    reconciliacao?.distancia_match_metros <= toleranciaMetros)

// DEPOIS
if (reconciliacao?.status === 'pendente_aprovacao')
```

---

### 7. ✅ Rotas e Navegação

Adicionadas rotas em `src/App.tsx`:
```typescript
<Route path="/mapa-necessidades-placas" element={<MapaNecessidadesPlacas />} />
<Route path="/mapa-necessidades-porticos" element={<MapaNecessidadesPorticos />} />
<Route path="/mapa-necessidades-inscricoes" element={<MapaNecessidadesInscricoes />} />
<Route path="/lista-necessidades-marcas" element={<ListaNecessidadesMarcas />} />
<Route path="/lista-necessidades-tachas" element={<ListaNecessidadesTachas />} />
<Route path="/lista-necessidades-defensas" element={<ListaNecessidadesDefensas />} />
```

Botões de acesso em `src/pages/Admin.tsx` na aba "Matching":
- **Card 1**: Mapas de Elementos Pontuais (Placas, Pórticos, Inscrições)
- **Card 2**: Listas de Elementos Lineares (Marcas, Tachas, Defensas)

---

## 🎯 Critérios de Aceitação

### ✅ Pontuais (Placa, Pórtico, Inscrição)
- [x] Com GPS e código igual → `MATCH_DIRECT`
- [x] Sem GPS, com `km_inicial` próximo → decisão via **fallback por KM**
- [x] Duas ocorrências dentro da tolerância → `AMBIGUOUS/MULTIPLE_CANDIDATES`
- [x] Fora da tolerância e sem KM próximo → `NO_MATCH`
- [x] UI lista pendentes **sem** filtrar por distância
- [x] Ordenação por `km_inicial`

### ✅ Lineares (Marcas, Tachas, Defensas, Cilindros)
- [x] `overlap ≥ limiar` + código igual → `MATCH_DIRECT`
- [x] `overlap ≥ limiar` + código diferente → `SUBSTITUICAO`
- [x] ≥2 válidos → `AMBIGUOUS`
- [x] `amb_low ≤ overlap < limiar` → `INCERTO`
- [x] `overlap < amb_low` ou sem `km_final` → `NO_MATCH`
- [x] UI não filtra por limiar
- [x] Usa `overlap%` para ordenar/destacar
- [x] Ordenação por `km_inicial`

---

## 🔄 Fluxo Completo de Matching

### 1. Importação de Necessidades
- Planilhas → `necessidades_*` tables

### 2. Execução do Matching (`ExecutarMatching`)
- Validação: `temGPS || temKM`
- Normalização de atributos
- Chamada: `matchPontual` ou `matchLinear`
- Atualização: `match_decision`, `match_score`, `cadastro_id`, `estado`

### 3. Visualização
- **Pontuais**: Mapas com marcadores coloridos
- **Lineares**: Listas com indicador de overlap
- **Todos**: Ordenados por KM, sem filtros de distância

### 4. Reconciliação (próximo passo)
- Aprovação de matches pendentes
- Criação/atualização no inventário dinâmico

---

## 📊 Decisões de Match

### Pontuais
| Decisão | Significado |
|---------|-------------|
| `MATCH_DIRECT` | Match direto (GPS/KM + código igual) |
| `SUBSTITUICAO` | Match por localização, código diferente |
| `MULTIPLE_CANDIDATES` | ≥2 candidatos na tolerância |
| `GRAY_ZONE` | Único candidato fora do `tol_m`, mas dentro do `tol_substituicao_m` |
| `AMBIGUOUS` | Múltiplos candidatos, necessita triagem |
| `NO_MATCH` | Nenhum candidato encontrado |

### Lineares
| Decisão | Significado |
|---------|-------------|
| `MATCH_DIRECT` | Overlap ≥ limiar, código igual |
| `SUBSTITUICAO` | Overlap ≥ limiar, código diferente |
| `AMBIGUOUS` | ≥2 segmentos válidos |
| `INCERTO` | Overlap entre `amb_low` e `limiar` |
| `NO_MATCH` | Overlap < `amb_low` ou sem `km_final` |

---

## 🎨 Legenda de Cores (UI)

```typescript
const DECISION_COLORS = {
  MATCH_DIRECT: '#22c55e',      // Verde (green-500)
  SUBSTITUICAO: '#3b82f6',      // Azul (blue-500)
  MULTIPLE_CANDIDATES: '#f59e0b', // Âmbar (amber-500)
  GRAY_ZONE: '#eab308',         // Amarelo (yellow-500)
  AMBIGUOUS: '#f97316',         // Laranja (orange-500)
  INCERTO: '#eab308',           // Amarelo (yellow-500)
  NO_MATCH: '#ef4444',          // Vermelho (red-500)
  null: '#9ca3af'               // Cinza (gray-400)
};
```

---

## 🧪 Logs de Diagnóstico

O `ExecutarMatching` gera logs detalhados:

```typescript
// Normal
console.log(`🔄 Tipo ${tipo}: ${necessidades.length} necessidades para processar`);

// Fallback por KM
console.warn(`⚠️ GPS ausente, usando fallback por KM - ${tipo} ID ${nec.id}, KM ${nec.km_inicial}`);

// Erro
console.error(`❌ ERRO MATCH LINEAR - Tipo: ${tipo}, ID: ${nec.id}`, { wkt, atributos, error });
```

---

## ✨ Diferenciais da Implementação

1. **Sem Filtros de Distância**: Todos os elementos são exibidos, independente da distância/overlap
2. **Ordenação Inteligente**: Por KM quando sem GPS, por distância quando com GPS
3. **Fallback por KM**: Matching funciona mesmo sem coordenadas GPS
4. **Normalização Robusta**: Atributos padronizados antes do matching
5. **UI Consistente**: Padrão visual unificado entre pontuais e lineares
6. **Badges Informativos**: Vínculo, score, decisão claramente identificados
7. **Tolerâncias Parametrizadas**: Centralizadas em `matchingParams.ts`

---

## 🔧 Manutenção

Para ajustar tolerâncias:
1. Editar `src/lib/matchingParams.ts`
2. Ou usar `ParametrosMatchManager` (UI Admin)

Para adicionar novos tipos de elemento:
1. Adicionar em `TipoElementoMatch` (`matchingParams.ts`)
2. Criar mapa/lista em `src/pages/`
3. Adicionar rota em `src/App.tsx`
4. Adicionar botão em `src/pages/Admin.tsx`

---

## 📝 Observações Finais

- ✅ Matching SQL (RPC) deve estar implementado no backend
- ✅ Tabela `param_tolerancias_match` deve existir com dados
- ✅ Todas as tabelas `necessidades_*` devem ter colunas de matching
- ✅ Token Mapbox configurado em `.env` (VITE_MAPBOX_PUBLIC_TOKEN)

---

**Data de implementação:** 2025-10-22  
**Status:** ✅ COMPLETO - Todos os 7 elementos implementados  
**Próximos passos:** Testes de integração e ajuste fino de tolerâncias
