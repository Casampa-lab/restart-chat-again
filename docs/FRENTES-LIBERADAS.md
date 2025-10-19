# 📋 Frentes Liberadas - Documentação

## 🎯 Objetivo

O módulo **Frentes Liberadas** permite o registro e controle administrativo das frentes de serviço autorizadas para execução de obras/serviços nas rodovias concessionadas.

## 📊 Modelo de Dados

### Tabela: `frentes_liberadas`

```sql
- id (uuid, PK)
- user_id (uuid, FK -> profiles)
- lote_id (uuid, FK -> lotes)
- rodovia_id (uuid, FK -> rodovias)
- data_liberacao (date)
- portaria_aprovacao_projeto (text)
- km_inicial (numeric)
- km_final (numeric)
- latitude_inicial (numeric)
- longitude_inicial (numeric)
- latitude_final (numeric)
- longitude_final (numeric)
- extensao_contratada_km (numeric)
- extensao_liberada_km (numeric)
- observacoes (text)
- enviado_coordenador (boolean, default: false)
- created_at (timestamp)
- updated_at (timestamp)
```

## 🏗️ Arquitetura Atual

### Modelo de Liberação

**Liberação Integral por Lote** (implementado atualmente):
- A liberação ocorre automaticamente assim que o projeto é aprovado
- Toda a extensão do lote é liberada de uma vez
- Não há necessidade de registros parciais em campo

### Acesso

**Desktop/Coordenação apenas**:
- ✅ Disponível na tela principal (Index) para coordenadores
- ❌ **Removido do Modo Campo** - não é função operacional de técnico de campo

**Justificativa**:
- Registro de portarias e aprovações de projeto é uma atividade administrativa/gerencial
- O controle de extensões contratadas vs. liberadas é estratégico, não operacional
- Coordenadores/gestores possuem melhor contexto para esses registros

## 🔮 Expansões Futuras Possíveis

### 1. Liberação Progressiva/Parcial

Permitir registros de liberação em etapas:

```typescript
interface FrenteLiberadaParcial {
  // Campos atuais +
  numero_etapa: number;
  etapa_descricao: string;
  dependencias: string[]; // IDs de etapas anteriores necessárias
  status_etapa: 'planejada' | 'liberada' | 'em_execucao' | 'concluida';
}
```

**Casos de uso**:
- Projetos com liberação faseada (segmentação por trechos)
- Obras condicionadas a aprovações ambientais parciais
- Execução progressiva conforme disponibilidade de recursos

### 2. Configuração por Supervisora

Adicionar controle de acesso configurável:

**Nova tabela**: `supervisora_configuracoes`
```sql
CREATE TABLE supervisora_configuracoes (
  id uuid PRIMARY KEY,
  supervisora_id uuid REFERENCES supervisoras,
  permitir_registro_campo_frentes boolean DEFAULT false,
  exigir_aprovacao_coordenador boolean DEFAULT true,
  permitir_liberacao_parcial boolean DEFAULT false
);
```

**Fluxo**:
1. Admin configura política da supervisora
2. Se `permitir_registro_campo_frentes = true`:
   - Funcionalidade aparece no Modo Campo
   - Técnicos podem registrar frentes no local
3. Se `exigir_aprovacao_coordenador = true`:
   - Registros ficam pendentes até revisão
   - Coordenador valida antes de efetivar

### 3. Integração com Necessidades

Vincular frentes liberadas com o planejamento de necessidades:

```typescript
interface NecessidadeComFrente {
  necessidade_id: uuid;
  frente_liberada_id: uuid;
  pode_executar: boolean; // Calculado: necessidade está dentro da frente?
  data_previsao_execucao: date;
}
```

**Benefícios**:
- Validação automática: "Esta necessidade pode ser executada?"
- Dashboard de execução vs. frentes liberadas
- Alerta de necessidades fora de frentes autorizadas

### 4. Timeline de Liberações

Visualização cronológica e geográfica:

```typescript
interface TimelineFrente {
  lote_id: uuid;
  rodovia_id: uuid;
  historico_liberacoes: Array<{
    data: date;
    km_inicial: number;
    km_final: number;
    extensao_km: number;
    documento: string; // Portaria
  }>;
  extensao_total_liberada: number;
  extensao_total_contratada: number;
  percentual_liberado: number;
}
```

**Recursos**:
- Mapa com overlay de frentes liberadas coloridas por data
- Gráfico de evolução de liberações ao longo do tempo
- Comparativo: liberado vs. contratado vs. executado

### 5. Anexos e Documentação

Vincular documentos oficiais:

**Nova tabela**: `frente_liberada_anexos`
```sql
CREATE TABLE frente_liberada_anexos (
  id uuid PRIMARY KEY,
  frente_liberada_id uuid REFERENCES frentes_liberadas,
  tipo_documento text, -- 'portaria', 'projeto', 'licenca_ambiental', etc.
  arquivo_url text,
  data_upload timestamp,
  uploaded_by uuid REFERENCES profiles
);
```

**Tipos de documento**:
- Portaria de aprovação do projeto (obrigatório)
- Projeto executivo aprovado
- Licenças ambientais
- Atas de reunião
- Notificações de início de serviço

### 6. Validação Geoespacial

Implementar verificações automáticas:

```typescript
async function validarIntervencaoNaFrente(
  intervencao_lat: number,
  intervencao_long: number,
  intervencao_km: number,
  lote_id: uuid,
  rodovia_id: uuid
): Promise<{
  dentro_frente_liberada: boolean;
  frente_id?: uuid;
  distancia_mais_proxima?: number;
  alerta?: string;
}> {
  // Verifica se coordenadas/km estão dentro de alguma frente liberada
  // Retorna alertas se fora de área autorizada
}
```

**Integração**:
- Alertas em tempo real no Modo Campo
- Bloqueio de registros fora de frentes (configurável)
- Relatórios de execuções não autorizadas

### 7. Relatórios Gerenciais

Dashboard executivo:

- **KPIs**:
  - Total de km liberados vs. contratados
  - Tempo médio entre contratação e liberação
  - Frentes liberadas vs. frentes em execução
  - Frentes concluídas

- **Relatórios**:
  - Evolução mensal de liberações
  - Comparativo entre lotes
  - Pendências de documentação
  - Projeções de conclusão

## 🛠️ Implementação Futura Sugerida

### Fase 1: Configuração por Supervisora (Prioridade Alta)
1. Criar tabela `supervisora_configuracoes`
2. Adicionar toggle no Admin: "Permitir registro de frentes em campo"
3. Condicionar aparecimento no Modo Campo baseado nessa config
4. Implementar fluxo de aprovação

### Fase 2: Liberação Parcial (Prioridade Média)
1. Adicionar campos de etapa
2. Criar UI para gestão de etapas
3. Implementar dependências entre etapas
4. Dashboard de progresso por etapa

### Fase 3: Validação Geoespacial (Prioridade Média)
1. Implementar função de verificação de coordenadas
2. Integrar com formulários de intervenção
3. Criar alertas visuais no mapa
4. Configurar políticas de bloqueio/alerta

### Fase 4: Relatórios Avançados (Prioridade Baixa)
1. Criar dashboards executivos
2. Implementar exportação de relatórios
3. Gráficos de evolução
4. Comparativos entre lotes/rodovias

## 📌 Conclusão

O módulo atual atende o modelo de **liberação integral por lote**, adequado para o estágio atual do projeto. As expansões futuras permitirão:

- ✅ Flexibilidade operacional (campo vs. escritório)
- ✅ Controle fino de liberações parciais
- ✅ Validação automática de conformidade geográfica
- ✅ Rastreabilidade documental completa
- ✅ Visibilidade gerencial aprimorada

A arquitetura modular facilita essas expansões sem breaking changes na estrutura atual.
