# Sistema de Inventário Dinâmico - Documentação Completa

## 📋 Conceito Fundamental

O **Inventário Dinâmico** representa o estado real e atualizado da rodovia, calculado através da fórmula:

```
ESTADO ATUAL = CADASTRO INICIAL + INTERVENÇÕES EXECUTADAS
```

Este sistema mantém rastreabilidade completa de todas as mudanças, permitindo:
- ✅ Auditoria contínua
- ✅ Prestação de contas
- ✅ Histórico de evolução da infraestrutura
- ✅ Planejamento de novas intervenções
- ✅ "Digital Twin" da rodovia

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

## 🏗️ Arquitetura do Sistema

### Componentes Principais

#### 1. **Tabelas de Inventário (Cadastro Inicial)**
Representam o estado original ou "foto inicial" da rodovia:

- `ficha_placa` - Placas de sinalização vertical
- `ficha_marcas_longitudinais` - Faixas e demarcações
- `ficha_cilindros` - Delineadores e balizadores
- `ficha_inscricoes` - Zebrados, setas, símbolos e legendas
- `ficha_porticos` - Pórticos de sinalização
- `defensas` - Barreiras de segurança
- `ficha_tachas` - Tachas refletivas

**Campos de Controle do Inventário Dinâmico:**
```sql
modificado_por_intervencao BOOLEAN DEFAULT FALSE
ultima_intervencao_id UUID REFERENCES <tabela>_intervencoes(id)
data_ultima_modificacao TIMESTAMP
```

#### 2. **Tabelas de Intervenções**
Registram todas as ações executadas na rodovia:

- `ficha_placa_intervencoes`
- `ficha_marcas_longitudinais_intervencoes`
- `ficha_cilindros_intervencoes`
- `ficha_inscricoes_intervencoes`
- `ficha_porticos_intervencoes`
- `defensas_intervencoes`
- `ficha_tachas_intervencoes`

**Campos de Workflow:**
```sql
pendente_aprovacao_coordenador BOOLEAN DEFAULT TRUE
aplicado_ao_inventario BOOLEAN DEFAULT FALSE
coordenador_id UUID
data_aprovacao_coordenador TIMESTAMP
fora_plano_manutencao BOOLEAN DEFAULT FALSE
justificativa_fora_plano TEXT
observacao_coordenador TEXT
```

#### 3. **Tabelas de Histórico**
Mantêm registro imutável de todas as mudanças:

- `ficha_placa_historico`
- `ficha_marcas_longitudinais_historico`
- `ficha_cilindros_historico`
- `ficha_inscricoes_historico`
- `ficha_porticos_historico`
- `defensas_historico`
- `ficha_tachas_historico`

**Estrutura do Histórico:**
```sql
CREATE TABLE <tipo>_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id UUID NOT NULL,           -- ID do elemento no inventário
  intervencao_id UUID NOT NULL,        -- ID da intervenção aplicada
  dados_antes JSONB NOT NULL,          -- Estado completo ANTES
  dados_depois JSONB NOT NULL,         -- Estado completo DEPOIS
  aplicado_por UUID,                   -- Coordenador que aprovou
  created_at TIMESTAMP DEFAULT now()
);
```

#### 4. **Funções de Aplicação**
Automatizam o processo de atualização do inventário:

- `aplicar_intervencao_placa(intervencao_id, coordenador_id)`
- `aplicar_intervencao_marcas_longitudinais(intervencao_id, coordenador_id)`
- `aplicar_intervencao_cilindros(intervencao_id, coordenador_id)`
- `aplicar_intervencao_inscricoes(intervencao_id, coordenador_id)`
- `aplicar_intervencao_porticos(intervencao_id, coordenador_id)`
- `aplicar_intervencao_defensas(intervencao_id, coordenador_id)`
- `aplicar_intervencao_tachas(intervencao_id, coordenador_id)`

---

## 🔄 Fluxo de Trabalho

### 1. Registro da Intervenção (Fiscalização)
```
Fiscal → Registra intervenção em campo
     ↓
     Sistema cria registro em <tipo>_intervencoes
     ↓
     pendente_aprovacao_coordenador = TRUE
     aplicado_ao_inventario = FALSE
```

### 2. Revisão do Coordenador
```
Coordenador → Revisa intervenção pendente
     ↓
     OPÇÃO A: Aprovar → Prossegue para aplicação
     OPÇÃO B: Rejeitar → Adiciona observação, não aplica
```

### 3. Aplicação ao Inventário (Automática)
```
Coordenador → Clica "Aplicar ao Inventário"
     ↓
     Sistema executa função aplicar_intervencao_<tipo>()
     ↓
     1. Captura estado ANTES (JSON completo)
     2. Atualiza inventário baseado no motivo
     3. Captura estado DEPOIS (JSON completo)
     4. Insere registro no histórico
     5. Marca intervenção como aplicada
```

### 4. Auditoria e Rastreamento
```
Qualquer momento → Consulta histórico
     ↓
     SELECT * FROM <tipo>_historico WHERE cadastro_id = ?
     ↓
     Visualiza: QUEM, QUANDO, O QUE mudou
```

---

## 📊 Tipos de Motivos e Suas Ações

### Motivos que ATUALIZAM o Inventário:

#### 1. **Substituição**
- Atualiza características técnicas (material, cor, dimensões, etc.)
- Mantém localização
- **Exemplo**: Placa antiga → Placa nova com película refletiva melhor

#### 2. **Pintura Nova / Repintura**
- Atualiza estado de conservação
- Pode atualizar material e espessura
- **Exemplo**: Faixa desgastada → Faixa repintada

#### 3. **Implantação**
- Adiciona novos elementos ao inventário
- **Exemplo**: Nova placa em trecho sem sinalização

#### 4. **Recuperação**
- Atualiza estado mas mantém características
- **Exemplo**: Defensa amassada → Defensa retificada

#### 5. **Reposição**
- Substitui elementos faltantes
- **Exemplo**: Tachas ausentes → Tachas recolocadas

### Motivos que NÃO atualizam (só registram):

#### 6. **Remoção**
- Marca elemento como removido
- **NÃO deleta** do banco (mantém histórico)
- Sinalizado por `modificado_por_intervencao = true`

#### 7. **Manutenção / Limpeza**
- Registra ação mas não altera características
- Mantém histórico de manutenções preventivas

---

## 🎯 Exemplos Práticos

### Exemplo 1: Substituição de Placa

**Estado Inicial (Cadastro):**
```json
{
  "id": "abc123",
  "codigo": "R-19",
  "tipo": "Regulamentação",
  "suporte": "Poste simples",
  "substrato": "Aço galvanizado",
  "tipo_pelicula_fundo": "Grau Técnico I",
  "retro_pelicula_fundo": 45.5,
  "retro_pelicula_legenda_orla": 250.3,
  "modificado_por_intervencao": false,
  "ultima_intervencao_id": null
}
```

**Intervenção Registrada:**
```json
{
  "id": "int456",
  "ficha_placa_id": "abc123",
  "motivo": "Substituição",
  "data_intervencao": "2025-10-14",
  "suporte": "Poste duplo",
  "tipo_pelicula_fundo_novo": "Grau Engenharia III",
  "retro_fundo": 420.0,
  "retro_orla_legenda": 700.0,
  "pendente_aprovacao_coordenador": true,
  "aplicado_ao_inventario": false
}
```

**Após Aprovação e Aplicação:**

1. **Inventário Atualizado:**
```json
{
  "id": "abc123",
  "codigo": "R-19",
  "tipo": "Regulamentação",
  "suporte": "Poste duplo",              // ← Atualizado
  "substrato": "Aço galvanizado",
  "tipo_pelicula_fundo": "Grau Engenharia III",  // ← Atualizado
  "retro_pelicula_fundo": 420.0,          // ← Atualizado
  "retro_pelicula_legenda_orla": 700.0,   // ← Atualizado
  "modificado_por_intervencao": true,     // ← Marcado
  "ultima_intervencao_id": "int456",      // ← Rastreado
  "data_ultima_modificacao": "2025-10-14 10:30:00"
}
```

2. **Histórico Criado:**
```json
{
  "id": "hist789",
  "cadastro_id": "abc123",
  "intervencao_id": "int456",
  "dados_antes": { /* JSON completo do estado anterior */ },
  "dados_depois": { /* JSON completo do estado novo */ },
  "aplicado_por": "coord001",
  "created_at": "2025-10-14 10:30:00"
}
```

3. **Intervenção Marcada:**
```json
{
  "id": "int456",
  "aplicado_ao_inventario": true,         // ← Aplicado
  "pendente_aprovacao_coordenador": false, // ← Aprovado
  "coordenador_id": "coord001",
  "data_aprovacao_coordenador": "2025-10-14 10:30:00"
}
```

---

### Exemplo 2: Pintura Nova de Marcas Longitudinais

**Estado Inicial:**
```json
{
  "id": "marca001",
  "tipo_demarcacao": "LBO",
  "cor": "Branca",
  "largura_cm": 15.0,
  "espessura_cm": 0.3,
  "material": "Tinta acrílica desgastada",
  "km_inicial": 100.5,
  "km_final": 105.2,
  "extensao_metros": 4700
}
```

**Intervenção:**
```json
{
  "motivo": "Pintura Nova",
  "material": "Termoplástico",
  "espessura_cm": 0.5,
  "data_intervencao": "2025-10-14"
}
```

**Resultado:**
```json
{
  "id": "marca001",
  "tipo_demarcacao": "LBO",
  "cor": "Branca",
  "largura_cm": 15.0,
  "espessura_cm": 0.5,              // ← Atualizado
  "material": "Termoplástico",       // ← Atualizado
  "km_inicial": 100.5,
  "km_final": 105.2,
  "extensao_metros": 4700,
  "modificado_por_intervencao": true,
  "ultima_intervencao_id": "int_marca_123"
}
```

---

## 🔍 Consultas Úteis

### 1. Ver Estado Atual do Inventário
```sql
-- Placas modificadas por intervenções
SELECT 
  fp.*,
  fpi.motivo,
  fpi.data_intervencao,
  fpi.data_aprovacao_coordenador
FROM ficha_placa fp
LEFT JOIN ficha_placa_intervencoes fpi ON fpi.id = fp.ultima_intervencao_id
WHERE fp.modificado_por_intervencao = true;
```

### 2. Ver Histórico Completo de um Elemento
```sql
-- Histórico de mudanças de uma placa
SELECT 
  h.*,
  i.motivo,
  i.data_intervencao,
  p.nome as aprovado_por
FROM ficha_placa_historico h
JOIN ficha_placa_intervencoes i ON i.id = h.intervencao_id
JOIN profiles p ON p.id = h.aplicado_por
WHERE h.cadastro_id = 'abc123'
ORDER BY h.created_at DESC;
```

### 3. Intervenções Pendentes de Aprovação
```sql
-- Todas as intervenções aguardando coordenador
SELECT 
  'Placas' as tipo,
  fpi.*,
  fp.codigo,
  fp.km
FROM ficha_placa_intervencoes fpi
JOIN ficha_placa fp ON fp.id = fpi.ficha_placa_id
WHERE fpi.pendente_aprovacao_coordenador = true
  AND fpi.aplicado_ao_inventario = false

UNION ALL

SELECT 
  'Marcas' as tipo,
  fmi.*,
  fm.tipo_demarcacao,
  fm.km_inicial
FROM ficha_marcas_longitudinais_intervencoes fmi
JOIN ficha_marcas_longitudinais fm ON fm.id = fmi.ficha_marcas_longitudinais_id
WHERE fmi.pendente_aprovacao_coordenador = true
  AND fmi.aplicado_ao_inventario = false;

-- (Repetir para outros tipos)
```

### 4. Relatório de Intervenções Aplicadas
```sql
-- Intervenções aplicadas no último mês
SELECT 
  tipo_elemento,
  COUNT(*) as total_intervencoes,
  COUNT(DISTINCT cadastro_id) as elementos_afetados
FROM (
  SELECT 
    'Placas' as tipo_elemento,
    h.cadastro_id,
    h.created_at
  FROM ficha_placa_historico h
  WHERE h.created_at >= CURRENT_DATE - INTERVAL '30 days'
  
  UNION ALL
  
  SELECT 
    'Marcas Longitudinais',
    h.cadastro_id,
    h.created_at
  FROM ficha_marcas_longitudinais_historico h
  WHERE h.created_at >= CURRENT_DATE - INTERVAL '30 days'
  
  -- (Repetir para outros tipos)
) AS todas_intervencoes
GROUP BY tipo_elemento
ORDER BY total_intervencoes DESC;
```

### 5. Elementos Nunca Modificados (Cadastro Original)
```sql
-- Placas que nunca sofreram intervenção
SELECT *
FROM ficha_placa
WHERE modificado_por_intervencao = false
  OR modificado_por_intervencao IS NULL;
```

---

## 🔒 Segurança e Permissões

### RLS Policies

Todas as tabelas de histórico têm políticas que permitem:
- ✅ **Coordenadores e Admins**: Acesso completo (leitura)
- ❌ **Fiscais**: Sem acesso direto ao histórico
- ❌ **Público**: Sem acesso

```sql
-- Exemplo de política
CREATE POLICY "Coordenadores veem histórico"
ON ficha_placa_historico FOR SELECT
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);
```

### Funções SECURITY DEFINER

Todas as funções `aplicar_intervencao_*` são **SECURITY DEFINER**, garantindo que:
- ✅ Executam com privilégios elevados
- ✅ Podem modificar inventário mesmo com RLS ativo
- ✅ Apenas coordenadores/admins podem executá-las
- ✅ Registram quem aplicou a mudança

---

## 📈 Benefícios do Sistema

### 1. **Rastreabilidade Completa**
- Toda mudança tem autor, data e justificativa
- Histórico imutável em JSON
- Possibilidade de "replay" de mudanças

### 2. **Auditoria Facilitada**
- Relatórios automáticos de modificações
- Comparação antes/depois
- Identificação de padrões de manutenção

### 3. **Planejamento Inteligente**
- Identificar elementos críticos (muitas intervenções)
- Prever necessidades futuras
- Otimizar rotas de fiscalização

### 4. **Prestação de Contas**
- Documentação automática de todas as ações
- Transparência total para órgãos fiscalizadores
- Evidências para medições e pagamentos

### 5. **Digital Twin**
- Representação virtual sempre atualizada
- Base para simulações e análises
- Integração futura com BIM/GIS

---

## 🚀 Evolução Futura

### Fase 1 (Atual) - ✅ Implementado
- [x] 7 tabelas de inventário com campos de controle
- [x] 7 tabelas de intervenções com workflow completo
- [x] 7 tabelas de histórico
- [x] 7 funções de aplicação

### Fase 2 - Interface de Coordenação
- [ ] Painel de intervenções pendentes
- [ ] Visualização de histórico por elemento
- [ ] Comparação visual antes/depois
- [ ] Aprovação em lote

### Fase 3 - Relatórios Automatizados
- [ ] Relatório de inventário dinâmico
- [ ] Dashboard de modificações
- [ ] Alertas de elementos críticos
- [ ] Exportação para Excel/PDF

### Fase 4 - Integração Avançada
- [ ] Timeline visual de mudanças
- [ ] Mapa com overlay de modificações
- [ ] API para sistemas externos
- [ ] Sincronização com GIS

---

## 📝 Notas Importantes

### ⚠️ Cuidados ao Aplicar Intervenções

1. **Irreversibilidade**: Uma vez aplicada, a intervenção modifica o inventário permanentemente
2. **Validação**: Coordenador deve revisar TODOS os dados antes de aprovar
3. **Backup**: Histórico mantém estado anterior, mas reverteres requer intervenção manual
4. **Ordem**: Aplicar intervenções na ordem cronológica correta

### 💡 Boas Práticas

1. **Aprovação Rápida**: Não deixar intervenções pendentes por muito tempo
2. **Observações Claras**: Coordenador deve justificar rejeições
3. **Revisão Periódica**: Auditar histórico mensalmente
4. **Limpeza de Dados**: Remover intervenções rejeitadas antigas

### 🔧 Manutenção

1. **Índices**: Criar índices em `cadastro_id` nas tabelas de histórico
2. **Arquivamento**: Considerar particionar histórico por ano
3. **Monitoramento**: Alertar sobre intervenções não aplicadas há > 30 dias

---

## 🎓 Glossário

- **Cadastro Inicial**: Estado original da rodovia no início do contrato
- **Intervenção**: Qualquer ação executada na rodovia (manutenção, substituição, etc.)
- **Inventário Dinâmico**: Estado atual = Cadastro + Intervenções
- **Histórico**: Registro imutável de todas as mudanças
- **Workflow**: Fluxo Registro → Revisão → Aprovação → Aplicação
- **RLS**: Row Level Security - segurança em nível de linha
- **JSONB**: Formato binário do JSON no PostgreSQL
- **SECURITY DEFINER**: Função que executa com privilégios do proprietário

---

**Versão**: 2.0  
**Data**: 2025-10-14  
**Status**: Sistema Completo Implementado ✅  
**Autor**: Sistema RodoviaSupervisão

---

## 🔗 Documentos Relacionados

- [PLANO-NECESSIDADES.md](./PLANO-NECESSIDADES.md)
- [INVENTARIO-DINAMICO.md](./INVENTARIO-DINAMICO.md)
- [MAPEAMENTO-COMPLETO-PLANILHAS.md](./MAPEAMENTO-COMPLETO-PLANILHAS.md)
- [PLANO-SUPERVISAO.md](./PLANO-SUPERVISAO.md)
