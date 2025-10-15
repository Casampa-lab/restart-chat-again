# Sistema de Importação - Atualização para Inventário Dinâmico

## 🎯 Objetivo da Atualização

Atualizar o sistema de importação em massa para suportar os **novos campos do Inventário Dinâmico** e garantir compatibilidade com as estruturas de tabelas mais recentes.

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

## 📊 Como Funciona a Importação Agora

### 1. **Upload do Excel**
```
Usuário → Seleciona Excel CADASTRO
     ↓
     Sistema lê planilha
     ↓
     Normaliza nomes de campos
     ↓
     Aplica mapeamentos
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

### 1. **Campos Obrigatórios vs Opcionais**

Todos os campos de controle do Inventário Dinâmico são **opcionais** (nullable) para permitir importação de dados antigos:

```sql
origem TEXT DEFAULT 'cadastro_inicial'
modificado_por_intervencao BOOLEAN DEFAULT FALSE
ultima_intervencao_id UUID NULL
data_ultima_modificacao TIMESTAMP NULL
```

### 2. **Valores Default Aplicados**

Durante a importação, o sistema garante:

```typescript
origem: "cadastro_inicial"              // Sempre
modificado_por_intervencao: false       // Sempre
ultima_intervencao_id: null             // Até primeira intervenção
data_ultima_modificacao: null           // Até primeira intervenção
```

### 3. **Diferença: Espessura em CADASTRO vs NECESSIDADES**

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
