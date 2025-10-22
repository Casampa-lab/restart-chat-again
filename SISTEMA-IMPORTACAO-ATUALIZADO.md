# Sistema de Importação - Processo em 2 Etapas (Importação + Matching)

## 🎯 Objetivo da Atualização

Atualizar o sistema de importação em massa para suportar os **novos campos do Inventário Dinâmico** e garantir compatibilidade com as estruturas de tabelas mais recentes.

---

## 🧩 PADRÃO DEFINITIVO DE CAMPOS DE LOCALIZAÇÃO (OBRIGATÓRIO)

### ✅ 1. Padrão único para todos os datasets (Cadastro e Necessidades)

Os campos de localização devem **sempre** ter sufixo:

**Elementos Pontuais:**
- `km_inicial`
- `latitude_inicial`
- `longitude_inicial`

**Elementos Lineares:**
- `km_inicial`, `km_final`
- `latitude_inicial`, `longitude_inicial`
- `latitude_final`, `longitude_final`

**❌ PROIBIDO:** Campos sem sufixo (`km`, `latitude`, `longitude`)

**✅ OBRIGATÓRIO:** O sufixo `_inicial` e `_final` é padronizado em todas as planilhas.

### ✅ 2. Regras de escrita

- **Nunca usar** `KM` ou `Km` — o correto é `km` (minúsculo)
- Nomes de colunas devem ser usados **exatamente** como definidos
- O sistema deve converter `"KM"` ou `"Km"` em `km` na importação, alertando o usuário

### ✅ 3. Aplicação da regra

- Essa regra vale para **Cadastro** e **Necessidades** (Projeto) igualmente
- Todos os cálculos, matches e validações de posição utilizam esses campos como base
- Campos como `lado`, `codigo`, `tipo`, `trecho_id` **não** possuem sufixo
- O parser deve apenas interpretar equivalentes (ex.: `Latitude_Inicial`, `Longitude inicial`) sem renomear

**📌 Nota:** Este padrão está documentado em todos os PLANOs do sistema para garantir consistência.

---

## ✅ Mudanças Implementadas

### 1. **Campos de Controle do Inventário Dinâmico** (Todas as Tabelas)

Adicionados automaticamente durante a importação:

```typescript
{
  origem: "cadastro_inicial",                // Identifica origem dos dados
  modificado_por_intervencao: false,         // Flag de modificação
  ultima_intervencao_id: null,               // ID da última intervenção aplicada
  data_ultima_modificacao: null              // Data da última modificação
}
```

**Tabelas Afetadas:**
- ✅ `ficha_placa`
- ✅ `ficha_marcas_longitudinais`
- ✅ `ficha_cilindros`
- ✅ `ficha_inscricoes`
- ✅ `ficha_tachas`
- ✅ `ficha_porticos`
- ✅ `defensas`

---

### 2. **Campos Específicos de Inscrições/Zebrados**

#### Novos Mapeamentos Adicionados:

```typescript
ficha_inscricoes: {
  "sigla": "sigla",                          // ZPA, MOF, PEM, LEGENDA
  "descrição": "tipo_inscricao",            // Descrição longa
  "tipo": "tipo_inscricao",
  "área_(m²)": "area_m2",
  "espessura_(mm)": "espessura_mm",         // NOVO: Espessura em mm
  "outros_materiais": "espessura_mm",       // Para CADASTRO
  "material": "material_utilizado",
  "cor": "cor",
  "snv": "snv",
}
```

#### Campos Válidos Atualizados:

```typescript
ficha_inscricoes: [
  "sigla",                    // NOVO
  "tipo_inscricao",
  "cor",
  "area_m2",
  "espessura_mm",            // NOVO
  "dimensoes",
  "material_utilizado",
  "data_vistoria",
  "km_inicial", "km_final",
  "latitude_inicial", "longitude_inicial",
  "latitude_final", "longitude_final",
  "observacao", "foto_url", "snv",
  "origem",                   // NOVO
  "modificado_por_intervencao", // NOVO
  "ultima_intervencao_id",    // NOVO
  "data_ultima_modificacao"   // NOVO
]
```

---

### 3. **VALID_FIELDS Completos por Tabela**

Todos os campos de controle do Inventário Dinâmico foram adicionados aos arrays `VALID_FIELDS`:

#### ficha_marcas_longitudinais
```typescript
[
  // ... campos existentes
  "origem",
  "modificado_por_intervencao",
  "ultima_intervencao_id",
  "data_ultima_modificacao"
]
```

#### ficha_tachas
```typescript
[
  // ... campos existentes
  "origem",
  "modificado_por_intervencao",
  "ultima_intervencao_id",
  "data_ultima_modificacao"
]
```

#### ficha_porticos
```typescript
[
  // ... campos existentes
  "origem",
  "modificado_por_intervencao",
  "ultima_intervencao_id",
  "data_ultima_modificacao"
]
```

#### defensas
```typescript
[
  // ... campos existentes
  "origem",
  "modificado_por_intervencao",
  "ultima_intervencao_id",
  "data_ultima_modificacao"
]
```

---

### 4. **Alteração de Constraint: Coluna `servico` NULLABLE**

Para suportar o processo de importação em 2 etapas, a coluna `servico` nas tabelas de necessidades foi alterada:

#### Antes:
```sql
servico TEXT NOT NULL
```

#### Depois:
```sql
servico TEXT NULL  -- Permitir NULL durante importação pura
```

#### Justificativa:
- **Etapa 1 (Importação)**: Registros são inseridos **sem** matching automático
- Campo `servico` permanece `NULL` até o matching dedicado
- **Etapa 2 (Matching)**: Algoritmos preenchem `servico` baseado em análise GPS/atributos

#### Tabelas Afetadas:
- ✅ `necessidades_cilindros`
- ✅ `necessidades_defensas`
- ✅ `necessidades_marcas_longitudinais`
- ✅ `necessidades_marcas_transversais`
- ✅ `necessidades_placas`
- ✅ `necessidades_porticos`
- ✅ `necessidades_tachas`

---

### 5. **Colunas de Matching Adicionadas**

Para armazenar os resultados do processo de matching manual, foram adicionadas 4 novas colunas em todas as tabelas de necessidades:

#### Novas Colunas:
```sql
-- Tipo ENUM para decisão de matching
CREATE TYPE match_decision_enum AS ENUM ('MATCH_DIRECT', 'SUBSTITUICAO', 'AMBIGUOUS', 'NO_MATCH');

-- Colunas adicionadas
match_decision match_decision_enum,        -- Decisão do algoritmo de matching
match_score NUMERIC(4,3),                  -- Score de similaridade (0-1)
reason_code TEXT,                          -- Código explicativo do motivo
estado TEXT DEFAULT 'PROPOSTO'             -- ATIVO | PROPOSTO | REJEITADO
```

#### Descrição das Colunas:
- **`match_decision`**: Resultado da análise automática de matching
  - `MATCH_DIRECT`: Match direto encontrado (alta confiança)
  - `SUBSTITUICAO`: Necessidade substitui item existente
  - `AMBIGUOUS`: Múltiplos matches possíveis (requer triagem manual)
  - `NO_MATCH`: Nenhum match encontrado no inventário
- **`match_score`**: Score numérico de 0 a 1 indicando grau de similaridade
- **`reason_code`**: Código explicativo (ex: "MULTIPLE_CANDIDATES", "ATTR_MISMATCH")
- **`estado`**: Estado da necessidade no fluxo de aprovação
  - `PROPOSTO`: Aguardando aprovação/triagem
  - `ATIVO`: Aprovado e conclusivo
  - `REJEITADO`: Rejeitado pelo coordenador

#### Valores Default:
- Após importação (Etapa 1): Todos `NULL`
- Após matching (Etapa 2): Populados pelos algoritmos RPC
- Estado inicial: `'PROPOSTO'`

#### Tabelas Afetadas:
- ✅ `necessidades_cilindros`
- ✅ `necessidades_defensas`
- ✅ `necessidades_marcas_longitudinais`
- ✅ `necessidades_marcas_transversais`
- ✅ `necessidades_placas`
- ✅ `necessidades_porticos`
- ✅ `necessidades_tachas`

#### Índices Criados:
Para melhorar performance de queries por matching:
```sql
CREATE INDEX idx_necessidades_*_match_decision ON necessidades_*(match_decision);
CREATE INDEX idx_necessidades_*_estado ON necessidades_*(estado);
```

#### Comentários no Banco:
```sql
COMMENT ON COLUMN necessidades_*.servico IS 
  'Tipo de serviço (Remover/Substituir/Implantar/Manter). NULL até matching na aba dedicada';
```

---

## 📊 Como Funciona a Importação Agora

### 1. **Upload do Excel (Etapa 1 - Importação Pura)**
```
Usuário → Seleciona Excel de NECESSIDADES
     ↓
Sistema lê e valida planilha
     ↓
Insere registros SEM matching (campos NULL)
     ↓
Feedback: "X registros importados, aguardando matching"
```

### 2. **Processamento dos Dados**
```typescript
// Para cada linha do Excel
const record = {
  // Campos obrigatórios
  user_id: user.id,
  lote_id: loteId,
  rodovia_id: rodoviaId,
  data_vistoria: "2023-01-01", // Default
  
  // NOVOS: Campos de controle do Inventário Dinâmico
  origem: "cadastro_inicial",
  modificado_por_intervencao: false,
  ultima_intervencao_id: null,
  data_ultima_modificacao: null,
  
  // Campos do Excel (mapeados)
  ...camposMapeados
}
```

### 3. **Inserção no Banco**
```
Validação de campos
     ↓
     Batch insert (1000 registros por vez)
     ↓
     Upload de fotos (se houver)
     ↓
     Associação foto ↔ registro
```

### 4. **Matching Dedicado (Etapa 2 - Aba "Matching")**
```
Usuário → Acessa aba "Matching"
     ↓
Sistema executa algoritmos de matching
     ↓
Preenche: cadastro_id, servico, distancia, divergencia
     ↓
Feedback: "X de Y necessidades matched"
```

---

## 🔍 Compatibilidade com Planilhas

### Planilhas CADASTRO

**Zebrados/Inscrições:**
```
BR | SNV | Sigla | Descrição | Cor | Km | Latitude | Longitude | Material | Outros materiais | Área (m²)
```

Mapeamento:
- `Sigla` → `sigla` ✅
- `Descrição` → `tipo_inscricao` ✅
- `Outros materiais` → `espessura_mm` ✅ (para CADASTRO)

**Marcas Longitudinais:**
```
BR | SNV | Tipo | Código | Cor | Posição | Largura | Espessura | Km Inicial | Km Final | ...
```

**Tachas:**
```
BR | SNV | Tipo | Cor | Largura | Km Inicial | Latitude Inicial | ... | Extensão | Espaçamento | Quantidade
```

**Pórticos:**
```
BR | SNV | Tipo | Km | Latitude | Longitude | Vão horizontal | Altura livre | Fotografia
```

**Defensas:**
```
BR | SNV | Tramo | ID | Geometria | Km Inicial | Latitude Inicial | ... | Extensão | Tipo | ...
```

---

## 🚨 Pontos de Atenção

### 1. **Separação de Responsabilidades**

**Importação**:
- ✅ Valida estrutura da planilha
- ✅ Converte tipos de dados
- ✅ Insere no banco
- ❌ NÃO faz matching
- ❌ NÃO identifica tipo de serviço

**Matching (Aba Dedicada)**:
- ✅ Algoritmos GPS/overlap
- ✅ Cálculo de distância
- ✅ Comparação de atributos
- ✅ Identificação de serviço
- ✅ Cálculo de divergências

### 2. **Campos Obrigatórios vs Opcionais**

Todos os campos de controle do Inventário Dinâmico são **opcionais** (nullable) para permitir importação de dados antigos:

```sql
origem TEXT DEFAULT 'cadastro_inicial'
modificado_por_intervencao BOOLEAN DEFAULT FALSE
ultima_intervencao_id UUID NULL
data_ultima_modificacao TIMESTAMP NULL
```

### 3. **Valores Default Aplicados**

Durante a importação, o sistema garante:

```typescript
origem: "cadastro_inicial"              // Sempre
modificado_por_intervencao: false       // Sempre
ultima_intervencao_id: null             // Até primeira intervenção
data_ultima_modificacao: null           // Até primeira intervenção
```

### 4. **Diferença: Espessura em CADASTRO vs NECESSIDADES**

**CADASTRO:**
- Campo: `Outros materiais`
- Conteúdo: Espessura (ex: "3.00")
- Mapeamento: → `espessura_mm`

**NECESSIDADES:**
- Campo: `Espessura (mm)`
- Conteúdo: Espessura explícita
- Mapeamento: → `espessura_mm`

Ambos mapeiam para o mesmo campo! ✅

---

## 🔄 Retrocompatibilidade

### Importações Antigas

Dados importados **ANTES** desta atualização:
- ✅ Continuam funcionando normalmente
- ✅ Campos de controle ficam `NULL` ou com valores default
- ✅ Não é necessário reimportar

### Atualizações de Registros Antigos

Quando um registro antigo receber uma intervenção:
```sql
-- Antes (importado sem campos de controle)
origem: NULL → será NULL
modificado_por_intervencao: NULL → será atualizado para TRUE
ultima_intervencao_id: NULL → receberá ID da intervenção
data_ultima_modificacao: NULL → receberá timestamp
```

---

## 📈 Benefícios da Atualização

### 1. **Rastreabilidade desde o Início**
- Toda importação marcada como `origem: "cadastro_inicial"`
- Diferencia cadastro inicial de intervenções

### 2. **Inventário Dinâmico Completo**
- Suporte total para aplicação de intervenções
- Histórico desde a importação

### 3. **Campos Específicos Mapeados**
- `sigla` e `espessura_mm` para Inscrições
- Suporte completo às planilhas CADASTRO e NECESSIDADES

### 4. **Preparado para Evolução**
- Base sólida para funcionalidades futuras
- Sistema escalável e bem documentado

---

## 🧩 Classificação dos Tipos de Match

O processo de matching compara registros do **Cadastro (situação existente)** com os do **Projeto (Necessidades)**.
Cada comparação gera um tipo de correspondência (match type), conforme o nível de compatibilidade posicional e de atributos.

### 1️⃣ MATCH DIRETO (`MATCH_DIRECT`)

**Descrição:**
O sistema encontrou **um único elemento** no cadastro que coincide com o elemento do projeto **dentro da tolerância espacial definida**, com **mesmo código e tipo**.

**Critérios típicos:**
- **Pontuais:** distância ≤ tolerância (ex.: ≤ 15 m para placas, ≤ 80 m para pórticos)
- **Lineares:** sobreposição ≥ limiar (ex.: ≥ 30% do comprimento)
- **Código e tipo idênticos**

**Exemplo:**
Placa `R-1A` prevista em `km_inicial = 10,008` casa com `R-1A` existente em `km_inicial = 10,000` → ✅ **MATCH DIRETO**

**Uso:**
Não requer intervenção. É o caso ideal — associação automática confirmada.

---

### 2️⃣ MATCH DE SUBSTITUIÇÃO (`SUBSTITUICAO`)

**Descrição:**
O sistema encontrou um elemento **na mesma posição**, mas o **código ou tipo** não são idênticos.
Interpreta-se como uma **substituição física ou atualização de sinal**.

**Critérios típicos:**
- Distância ou sobreposição dentro da tolerância
- Divergência de código (`R-1A` ↔ `R-2`) ou de tipo (`PLACA` ↔ `PORTICO`)

**Exemplo:**
No cadastro há `R-1A`; no projeto, `R-2` no mesmo local → 🔄 **MATCH DE SUBSTITUIÇÃO**

**Uso:**
Indicador de **mudança de elemento**. Permite atualizar inventário mantendo vínculo histórico.

---

### 3️⃣ MATCH AMBÍGUO (`AMBIGUOUS`)

**Descrição:**
Mais de um elemento do cadastro cumpre simultaneamente os critérios de correspondência.
O sistema **não consegue decidir automaticamente** qual é o correto.

**Critérios típicos:**
- Duas ou mais ocorrências dentro da mesma tolerância de distância ou sobreposição
- Atributos semelhantes (lado, código, tipo)

**Exemplo:**
Placa do projeto em `km = 10,000` encontra duas placas `R-1A` próximas (9,995 e 10,006).
➡️ ⚠️ **MATCH AMBÍGUO** – requer escolha manual

**Uso:**
Listada para **revisão humana**. A decisão manual atualiza o vínculo definitivo.

---

### 4️⃣ MATCH INCERTO (OU LIMÍTROFE)

**Descrição:**
A correspondência existe, mas **no limite da tolerância**, gerando dúvida se o elemento é o mesmo ou apenas próximo.

**Critérios típicos:**
- Distância próxima do limite (ex.: 14–16 m)
- Sobreposição parcial < limiar definido (ex.: 20–25%)

**Exemplo:**
Faixa projetada de `50,000–50,300` sobrepõe apenas 22% da faixa cadastrada `49,950–50,250`.
➡️ ⚠️ **MATCH INCERTO** — próximo demais do limite para decisão automática

**Uso:**
Pode exigir revisão fiscal ou ajuste fino da tolerância.

**Nota:** Este tipo ainda não está implementado no sistema atual, que retorna `AMBIGUOUS` ou `NO_MATCH` para casos limítrofes.

---

### 5️⃣ SEM MATCH (`NO_MATCH`)

**Descrição:**
Nenhum elemento do cadastro atende aos critérios de distância ou sobreposição.

**Critérios típicos:**
- Distância > tolerância (pontual)
- Sobreposição < mínimo aceitável (linear)

**Exemplo:**
Pórtico previsto em `km_inicial = 7,000`, sem nada próximo no cadastro.
➡️ ❌ **SEM MATCH** — indica **novo elemento**

**Uso:**
Registra-se como **implantação nova**. Importante para estimar acréscimos de sinalização/dispositivos.

---

### 6️⃣ MATCH DUPLICADO (caso especial)

**Descrição:**
Mais de um elemento do projeto corresponde ao **mesmo** elemento do cadastro.
Pode indicar erro de duplicidade no projeto.

**Critérios típicos:**
- Vários registros do projeto dentro da mesma tolerância de um único cadastro

**Uso:**
Requer análise: o sistema deve **alertar** para evitar dupla contagem.

**Nota:** Este tipo ainda não está implementado no sistema atual. Registros duplicados são processados independentemente.

---

## ⚙️ Resumo Técnico dos Tipos de Match

| Código | Tipo de Match          | Critério base                                            | Ação recomendada       | Status Implementação |
|--------|------------------------|----------------------------------------------------------|------------------------|---------------------|
| 1      | `MATCH_DIRECT`         | Único par válido (distância/sobreposição + código igual) | Confirma automático    | ✅ Implementado |
| 2      | `SUBSTITUICAO`         | Único par válido, código/tipo diferente                  | Registrar substituição | ✅ Implementado |
| 3      | `AMBIGUOUS`            | Mais de um par válido                                    | Revisão manual         | ✅ Implementado |
| 4      | `MATCH_INCERTO`        | Dentro do limite de tolerância                           | Revisão fiscal         | ⚠️ Não implementado |
| 5      | `NO_MATCH`             | Nenhum par válido                                        | Novo elemento          | ✅ Implementado |
| 6      | `MATCH_DUPLICADO`      | Mesmo cadastro com múltiplas associações                 | Revisar projeto        | ⚠️ Não implementado |

---

## 🔧 Manutenção Futura

### Quando Adicionar Novos Campos

1. **Atualizar FIELD_MAPPINGS:**
```typescript
<tabela>: {
  "nome_excel": "nome_campo_db",
}
```

2. **Atualizar VALID_FIELDS:**
```typescript
<tabela>: [
  "campo1", "campo2", ..., "novo_campo"
]
```

3. **Definir Valores Default (se necessário):**
```typescript
if (tableName === "<tabela>") {
  record.novo_campo = "valor_default";
}
```

### Quando Atualizar Estrutura de Tabela

1. Executar migration no banco
2. Atualizar `VALID_FIELDS` na edge function
3. Atualizar `FIELD_MAPPINGS` se houver novos nomes
4. Testar importação com planilha de exemplo

---

## 🎓 Exemplo Prático: Importar Zebrados

### Arquivo Excel (CADASTRO):
```
| BR     | SNV        | Sigla | Descrição                         | Cor     | Km     | Latitude   | Longitude  | Material      | Outros materiais | Área (m²) |
|--------|------------|-------|-----------------------------------|---------|--------|------------|------------|---------------|------------------|-----------|
| BR-267 | 267BMG0150 | ZPA   | Zebrado de preenchimento...       | Branca  | 212.29 | -21.936720 | -44.193329 | Termoplástico | 3.00             | 16.00     |
| BR-267 | 267BMG0165 | MOF   | Seta indicativa mudança...        | Branca  | 212.36 | -21.936567 | -44.193974 | Termoplástico | 3.00             | 4.07      |
```

### Registro Inserido:
```json
{
  "id": "uuid-gerado",
  "user_id": "user-123",
  "lote_id": "lote-456",
  "rodovia_id": "rodovia-789",
  "data_vistoria": "2023-01-01",
  
  "br": "BR-267",
  "snv": "267BMG0150",
  "sigla": "ZPA",
  "tipo_inscricao": "Zebrado de preenchimento...",
  "cor": "Branca",
  "km_inicial": 212.29,
  "latitude_inicial": -21.936720,
  "longitude_inicial": -44.193329,
  "material_utilizado": "Termoplástico",
  "espessura_mm": 3.00,
  "area_m2": 16.00,
  
  "origem": "cadastro_inicial",
  "modificado_por_intervencao": false,
  "ultima_intervencao_id": null,
  "data_ultima_modificacao": null,
  
  "created_at": "2025-10-14T12:00:00Z",
  "updated_at": "2025-10-14T12:00:00Z"
}
```

---

## 📚 Documentos Relacionados

- [INVENTARIO-DINAMICO-COMPLETO.md](./INVENTARIO-DINAMICO-COMPLETO.md)
- [MAPEAMENTO-COMPLETO-PLANILHAS.md](./MAPEAMENTO-COMPLETO-PLANILHAS.md)
- [PLANO-CADASTRO.md](./PLANO-CADASTRO.md)

---

**Versão**: 2.0  
**Data**: 2025-10-14  
**Status**: Sistema Atualizado e Testado ✅  
**Próximo Passo**: Importar CADASTRO e NECESSIDADES dos 7 grupos
