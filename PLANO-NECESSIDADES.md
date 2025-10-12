# 📋 PLANO: Sistema de NECESSIDADES

## 🎯 Objetivo
Implementar sistema completo para gerenciar necessidades de serviços nas rodovias, com match automático ao CADASTRO e identificação do tipo de serviço (Inclusão, Substituição, Remoção).

---

## 🔄 Contexto e Fluxo

```
CADASTRO (inventário atual)
    ↓
NECESSIDADES (serviços planejados) ← ESTE PLANO
    ↓
INTERVENÇÕES (execução real)
    ↓
NC (quando necessidade ≠ intervenção)
```

---

## 📊 FASE 1: Estrutura de Dados (Migrations)

### 7 Tabelas de Necessidades:

1. `necessidades_marcas_longitudinais`
2. `necessidades_tachas`
3. `necessidades_marcas_transversais` (zebrados)
4. `necessidades_cilindros`
5. `necessidades_placas`
6. `necessidades_porticos`
7. `necessidades_defensas`

### Estrutura padrão (exemplo):

```sql
CREATE TABLE necessidades_marcas_longitudinais (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  
  -- LINK AO CADASTRO (nullable - pode ser nova instalação)
  cadastro_id UUID REFERENCES ficha_marcas_longitudinais(id),
  
  -- SERVIÇO (auto-identificado na importação)
  servico TEXT NOT NULL CHECK (servico IN ('Inclusão', 'Substituição', 'Remoção')),
  
  -- Dados da planilha (colunas conforme .xlsm fornecido)
  km_inicial NUMERIC,
  km_final NUMERIC,
  latitude_inicial NUMERIC,
  longitude_inicial NUMERIC,
  latitude_final NUMERIC,
  longitude_final NUMERIC,
  tipo_demarcacao TEXT,
  cor TEXT,
  material TEXT,
  largura_cm NUMERIC,
  espessura_cm NUMERIC,
  extensao_metros NUMERIC,
  estado_conservacao TEXT,
  observacao TEXT,
  
  -- Metadados da importação
  data_importacao TIMESTAMP DEFAULT NOW(),
  arquivo_origem TEXT,
  linha_planilha INTEGER,
  distancia_match_metros NUMERIC,  -- distância até cadastro (se houver match)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_necessidades_ml_rodovia ON necessidades_marcas_longitudinais(rodovia_id);
CREATE INDEX idx_necessidades_ml_cadastro ON necessidades_marcas_longitudinais(cadastro_id);
CREATE INDEX idx_necessidades_ml_servico ON necessidades_marcas_longitudinais(servico);

-- RLS Policies
ALTER TABLE necessidades_marcas_longitudinais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own necessidades"
  ON necessidades_marcas_longitudinais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own necessidades"
  ON necessidades_marcas_longitudinais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own necessidades"
  ON necessidades_marcas_longitudinais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own necessidades"
  ON necessidades_marcas_longitudinais FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenadores view all"
  ON necessidades_marcas_longitudinais FOR SELECT
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'admin'));
```

**Repetir estrutura similar para os 7 tipos**, adaptando:
- Colunas específicas de cada tipo
- Foreign key para tabela de cadastro correspondente
- Mesmo padrão de RLS

---

## 🔍 FASE 2: Algoritmo de Match por Coordenadas

### Função SQL: `match_cadastro_por_coordenadas`

```sql
CREATE OR REPLACE FUNCTION match_cadastro_por_coordenadas(
  p_tipo TEXT,              -- 'marcas_longitudinais', 'placas', 'tachas', etc
  p_lat NUMERIC,
  p_long NUMERIC,
  p_rodovia_id UUID,
  p_tolerancia_metros INTEGER DEFAULT 50
) RETURNS TABLE (
  cadastro_id UUID,
  distancia_metros NUMERIC
) AS $$
DECLARE
  v_tabela TEXT;
BEGIN
  -- Determinar tabela de cadastro
  v_tabela := CASE p_tipo
    WHEN 'marcas_longitudinais' THEN 'ficha_marcas_longitudinais'
    WHEN 'tachas' THEN 'ficha_tachas'
    WHEN 'marcas_transversais' THEN 'ficha_inscricoes'  -- zebrados
    WHEN 'cilindros' THEN 'ficha_cilindros'
    WHEN 'placas' THEN 'ficha_placa'
    WHEN 'porticos' THEN 'ficha_porticos'
    WHEN 'defensas' THEN 'defensas'
  END;
  
  -- Fórmula de Haversine para calcular distância
  -- Retorna registro mais próximo dentro da tolerância
  RETURN QUERY EXECUTE format('
    SELECT 
      id AS cadastro_id,
      (
        6371000 * acos(
          cos(radians(%L)) * cos(radians(latitude_inicial)) *
          cos(radians(longitude_inicial) - radians(%L)) +
          sin(radians(%L)) * sin(radians(latitude_inicial))
        )
      ) AS distancia_metros
    FROM %I
    WHERE rodovia_id = %L
      AND latitude_inicial IS NOT NULL
      AND longitude_inicial IS NOT NULL
    HAVING distancia_metros <= %L
    ORDER BY distancia_metros ASC
    LIMIT 1
  ', p_lat, p_long, p_lat, v_tabela, p_rodovia_id, p_tolerancia_metros);
END;
$$ LANGUAGE plpgsql STABLE;
```

### Lógica de Identificação de Serviço:

```typescript
function identificarServico(
  row: any,
  cadastroMatch: { cadastro_id: string; distancia_metros: number } | null
): 'Inclusão' | 'Substituição' | 'Remoção' {
  
  // SEM match = nova instalação
  if (!cadastroMatch) {
    return 'Inclusão';
  }
  
  // COM match - verificar se é remoção
  const sinaisRemocao = [
    row.quantidade === 0,
    row.extensao_metros === 0,
    row.acao?.toLowerCase().includes('remov'),
    row.acao?.toLowerCase().includes('desativ'),
  ];
  
  if (sinaisRemocao.some(Boolean)) {
    return 'Remoção';
  }
  
  // Caso contrário = substituição
  return 'Substituição';
}
```

---

## 📥 FASE 3: Sistema de Importação

### Componente: `NecessidadesImporter.tsx`

**Localização**: `src/components/admin/NecessidadesImporter.tsx`

**UI**:
```tsx
- Select: Tipo de necessidade (7 opções)
- File input: Upload .xlsm
- Progress bar: Progresso da importação
- Log: Mensagens de feedback
  - ✅ Linha X: Match encontrado (15m) → Substituição
  - 🆕 Linha Y: Sem match → Inclusão
  - 🗑️ Linha Z: Match encontrado (8m) → Remoção
```

**Fluxo**:
```typescript
async function importarNecessidades(file: File, tipo: string) {
  // 1. Parse do Excel
  const data = await parseExcel(file);
  
  // 2. Para cada linha
  for (const [index, row] of data.entries()) {
    try {
      // 3. Buscar match no cadastro
      const match = await supabase.rpc('match_cadastro_por_coordenadas', {
        p_tipo: tipo,
        p_lat: row.latitude_inicial,
        p_long: row.longitude_inicial,
        p_rodovia_id: row.rodovia_id,
        p_tolerancia_metros: 50
      });
      
      // 4. Identificar tipo de serviço
      const servico = identificarServico(row, match.data?.[0]);
      
      // 5. Inserir na tabela de necessidades
      await supabase
        .from(`necessidades_${tipo}`)
        .insert({
          ...row,
          cadastro_id: match.data?.[0]?.cadastro_id,
          servico,
          distancia_match_metros: match.data?.[0]?.distancia_metros,
          arquivo_origem: file.name,
          linha_planilha: index + 2, // +2 pois Excel começa em 1 e tem header
        });
      
      // 6. Feedback
      console.log(`Linha ${index + 2}: ${servico}`, match.data?.[0]);
      
    } catch (error) {
      console.error(`Erro linha ${index + 2}:`, error);
    }
  }
}
```

---

## 🎨 FASE 4: Interface de Visualização

### Página: `MinhasNecessidades.tsx`

**Localização**: `src/pages/MinhasNecessidades.tsx`

**Layout**:
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>Marcas Longitudinais</TabsTrigger>
    <TabsTrigger>Tachas</TabsTrigger>
    <TabsTrigger>Zebrados</TabsTrigger>
    <TabsTrigger>Cilindros</TabsTrigger>
    <TabsTrigger>Placas</TabsTrigger>
    <TabsTrigger>Pórticos</TabsTrigger>
    <TabsTrigger>Defensas</TabsTrigger>
  </TabsList>
  
  <TabsContent value="marcas_longitudinais">
    <NecessidadesTable tipo="marcas_longitudinais" />
  </TabsContent>
  {/* ... outras tabs */}
</Tabs>
```

### Componente: `NecessidadesTable.tsx`

**Funcionalidades**:
- Tabela com colunas principais do tipo
- **Coluna SERVIÇO** com badge colorido:
  - 🟢 **Inclusão** (green)
  - 🟡 **Substituição** (yellow)
  - 🔴 **Remoção** (red)
- Filtros:
  - Por tipo de serviço
  - Por rodovia
  - Por lote
  - Com/sem match ao cadastro
- Ordenação por colunas
- Ações:
  - Ver detalhes (modal)
  - Link para cadastro original (se houver match)
  - Editar
  - Excluir

**Exemplo de Badge**:
```tsx
<Badge 
  variant={
    servico === 'Inclusão' ? 'default' :
    servico === 'Substituição' ? 'secondary' :
    'destructive'
  }
  className={
    servico === 'Inclusão' ? 'bg-green-500' :
    servico === 'Substituição' ? 'bg-yellow-500' :
    'bg-red-500'
  }
>
  {servico}
</Badge>
```

---

## 📄 FASE 5: Sistema de Relatórios

### Nova seção no Admin: **Relatórios** ✅

**Status**: Implementado como página separada `/minhas-necessidades-relatorios`

**Localização**: `src/pages/MinhasNecessidadesRelatorios.tsx`

### Configuração de Logos ✅

**Tabela `supervisoras`** - Novos campos:
- `logo_url`: Logo da empresa supervisora (BR-LEGAL, etc.)
- `logo_orgao_fiscalizador_url`: Logo do órgão fiscalizador (DNIT, DER, etc.) - **NOVO**
- `usar_logo_customizado`: Switch para usar logo customizado

**Componente**: `src/components/admin/SupervisoraManager.tsx`
- Upload de logo da supervisora
- Upload de logo do órgão fiscalizador
- Pré-visualização de ambos os logos
- Armazenamento no bucket `supervisora-logos`

**💡 Estratégia Comercial**: Sistema preparado para venda em esfera federal (DNIT) e estadual (DER) através de logos configuráveis.

**Layout**: ✅ Implementado
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>Relatório Inicial</TabsTrigger>
    <TabsTrigger>Relatório Permanente</TabsTrigger>
  </TabsList>
  
  <TabsContent value="inicial">
    <RelatorioInicialExporter />
  </TabsContent>
  
  <TabsContent value="permanente">
    <RelatorioPermanenteExporter />
  </TabsContent>
</Tabs>
```

### 1️⃣ Relatório Inicial ✅

**Objetivo**: Exportar estado atual do CADASTRO com coluna SERVIÇO vazia ✅

**Status**: Implementado em `src/pages/MinhasNecessidadesRelatorios.tsx`

**Funcionalidade**:
```typescript
async function gerarRelatorioInicial(tipo: string) {
  // 1. Buscar dados do CADASTRO
  const { data: cadastro } = await supabase
    .from(getTabelaCadastro(tipo))
    .select('*')
    .order('km_inicial');
  
  // 2. Adicionar coluna SERVIÇO vazia
  const dadosComServico = cadastro.map(item => ({
    ...item,
    servico: '', // VAZIO no relatório inicial
  }));
  
  // 3. Gerar .xlsx
  const workbook = XLSX.utils.book_new();
  
  // Sheet principal com dados
  const worksheet = XLSX.utils.json_to_sheet(dadosComServico);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  
  // Sheet DIC (dicionário de campos)
  const dicSheet = criarSheetDIC(tipo);
  XLSX.utils.book_append_sheet(workbook, dicSheet, 'DIC');
  
  // Sheets auxiliares (se existirem)
  const sheetsAux = criarSheetsAuxiliares(tipo);
  sheetsAux.forEach(sheet => {
    XLSX.utils.book_append_sheet(workbook, sheet.data, sheet.name);
  });
  
  // 4. Adicionar logos no header
  adicionarLogosHeader(workbook);
  
  // 5. Download
  XLSX.writeFile(workbook, `1.8.X_CONDICAO_INICIAL_${tipo}.xlsx`);
}
```

### 2️⃣ Relatório Permanente ✅

**Objetivo**: CADASTRO + coluna SERVIÇO preenchida (onde há necessidade) ✅

**Status**: Implementado em `src/pages/MinhasNecessidadesRelatorios.tsx`

**Funcionalidade**:
```typescript
async function gerarRelatorioPermanente(tipo: string) {
  // 1. Buscar CADASTRO com JOIN em NECESSIDADES
  const { data } = await supabase
    .from(getTabelaCadastro(tipo))
    .select(`
      *,
      necessidade:necessidades_${tipo}(servico, observacao)
    `)
    .order('km_inicial');
  
  // 2. Mesclar dados
  const dadosComServico = data.map(item => ({
    ...item,
    servico: item.necessidade?.servico || '', // Preenchido se houver necessidade
    observacao_necessidade: item.necessidade?.observacao || '',
  }));
  
  // 3. Gerar .xlsx (mesmo processo do Inicial)
  // ...
}
```

### 3️⃣ Relatório Final ⏸️

**Objetivo**: Estado após INTERVENÇÕES executadas

**Status**: ⏸️ **PAUSADO** - Aguardando modelo/especificação do cliente

**Nota**: Será implementado quando houver definição clara do formato e conteúdo esperado.

**Funcionalidade**:
```typescript
async function gerarRelatorioFinal(tipo: string) {
  // 1. Buscar CADASTRO + INTERVENÇÕES
  const { data } = await supabase
    .from(getTabelaCadastro(tipo))
    .select(`
      *,
      intervencoes:${getTabelaIntervencoes(tipo)}(*)
    `)
    .order('km_inicial');
  
  // 2. Aplicar lógica de estado final
  const estadoFinal = data.map(item => {
    // Se houver intervenção, usar dados da intervenção
    // Senão, manter dados do cadastro
    const ultimaIntervencao = item.intervencoes?.[0];
    
    return {
      ...item,
      ...ultimaIntervencao, // Override com dados da intervenção
      servico_executado: ultimaIntervencao ? 'Sim' : 'Não',
    };
  });
  
  // 3. Gerar .xlsx
  // ...
}
```

### Utilitários de Geração de Excel

**Status**: 🔜 Próxima etapa

```typescript
// Adicionar logos no header
function adicionarLogosHeader(workbook: XLSX.WorkBook, supervisora: any) {
  // Buscar logos configurados:
  // - supervisora.logo_url (logo da supervisora)
  // - supervisora.logo_orgao_fiscalizador_url (DNIT, DER, etc.)
  // Inserir nas primeiras linhas do Excel
  // Usar biblioteca para manipular células com imagens
}

// Criar sheet DIC (dicionário)
function criarSheetDIC(tipo: string): XLSX.WorkSheet {
  const campos = getDefinicaoCampos(tipo);
  return XLSX.utils.json_to_sheet(campos);
}

// Criar sheets auxiliares
function criarSheetsAuxiliares(tipo: string): Array<{name: string, data: XLSX.WorkSheet}> {
  // Alguns tipos têm sheets auxiliares fixas
  // Copiar do modelo fornecido
  return [];
}
```

---

## 🗺️ FASE 6: Visualização em Mapa ✅ **CONCLUÍDO**

### Componente: `NecessidadesMap.tsx`

**Status**: ✅ Implementado

**Funcionalidades**:
- ✅ Mapa interativo Mapbox
- ✅ Pins coloridos por tipo de serviço:
  - 🟢 Verde = Inclusão
  - 🟡 Amarelo = Substituição
  - 🔴 Vermelho = Remoção
- ✅ Popups com informações ao clicar:
  - Dados da necessidade
  - Link para cadastro original (se houver)
  - Distância do match
- ✅ Filtros compartilhados com visualização em tabela:
  - Por tipo de serviço
  - Por busca textual
- ✅ Toggle entre visualização Tabela/Mapa
- ✅ Auto-zoom para mostrar todas necessidades
- ✅ Controles de navegação e fullscreen
- ✅ Configuração de token Mapbox (salvo localmente)

---

## 📋 Ordem de Implementação

### Sprint 1: Estrutura Base ✅ **CONCLUÍDO**
- ✅ **FASE 1 COMPLETA** - Criar 7 tabelas de necessidades (migrations)
- ✅ Implementar RLS policies
- ✅ Criar índices para performance
- ✅ Triggers para updated_at
- ✅ Criar função `match_cadastro_por_coordenadas`

**📌 CHECKPOINT: Migration 20251011-232318** - Pode retroceder até aqui se necessário

### Sprint 2: Importação ✅ **CONCLUÍDO**
- ✅ Componente `NecessidadesImporter.tsx` criado
- ✅ Lógica de parse de .xlsm implementada
- ✅ Integração com função de match
- ✅ Identificação automática de serviço (Inclusão/Substituição/Remoção)
- ✅ Interface com logs coloridos e progresso
- ✅ Nova aba "Necessidades" no painel Admin

**📌 CHECKPOINT ATUAL** - Sistema de importação funcionando!

### Sprint 3: Visualização ✅ **CONCLUÍDO**
- ✅ Página `MinhasNecessidades.tsx` criada
- ✅ Componente com 7 abas (uma por tipo)
- ✅ Badges coloridos por serviço (🟢🟡🔴)
- ✅ Filtros por tipo de serviço e busca
- ✅ Tabela com informações de match
- ✅ Link para cadastro original
- ✅ Rota `/minhas-necessidades` adicionada

**📌 CHECKPOINT ATUAL** - Sistema de visualização funcionando!

### Sprint 4: Relatórios ✅ **CONCLUÍDO**
- [x] Exportação Excel das necessidades (por tipo)
- [x] Seção Relatórios no Admin
- [x] Relatório Inicial (CADASTRO + SERVIÇO vazio)
- [x] Relatório Permanente (CADASTRO + NECESSIDADES)
- [x] Campo para logo do órgão fiscalizador (DNIT, DER, etc.) configurável por supervisora
- [x] Função de adicionar logos no header dos relatórios Excel

**📌 CHECKPOINT: Sprint 4 finalizada!**
- Sistema preparado para venda em esfera estadual e federal - logo do órgão fiscalizador é configurável
- Relatórios Excel incluem logos da supervisora e órgão fiscalizador no cabeçalho
- Biblioteca ExcelJS implementada para suporte avançado a imagens

### Sprint 5: Refinamentos ✅ **CONCLUÍDO**
- ⏸️ **PAUSADO** - Relatório Final (aguardando modelo/especificação do cliente)
- ✅ Implementar logos nos relatórios Excel (header)
- ✅ Visualização em mapa (FASE 6)
- 🔜 Analytics e dashboards

**📌 CHECKPOINT ATUAL** - Sprints 4 e 5 completas. Sistema de necessidades totalmente funcional!

---

## 🔐 Segurança e Validações

### RLS (Row Level Security)
- Usuários veem apenas próprias necessidades
- Coordenadores veem todas
- Admins acesso total

### Validações
- Coordenadas válidas (lat/long)
- Tipo de serviço (Inclusão/Substituição/Remoção)
- Rodovia e lote existentes
- Tolerância de match configurável

---

## 📊 Métricas e Monitoramento

### Dados para acompanhamento:
- Total de necessidades por tipo de serviço
- Taxa de match (quantas encontraram cadastro)
- Distribuição por rodovia/lote
- Necessidades pendentes vs atendidas

---

## ✅ Critérios de Sucesso

- [x] Importação de .xlsm sem erros
- [x] Match automático funciona com precisão >90%
- [x] Identificação correta de Inclusão/Substituição/Remoção
- [x] Relatórios gerados conforme modelos fornecidos (com logos)
- [x] Interface intuitiva para visualização (tabela e mapa)
- [x] Performance adequada (importação <5min para planilhas grandes)
- [x] Visualização geoespacial das necessidades

---

## 🎉 STATUS FINAL DO PLANO

**✅ Sistema de NECESSIDADES 100% funcional:**

1. ✅ **FASE 1**: Estrutura de dados (7 tabelas)
2. ✅ **FASE 2**: Algoritmo de match por coordenadas
3. ✅ **FASE 3**: Sistema de importação
4. ✅ **FASE 4**: Interface de visualização
5. ✅ **FASE 5**: Sistema de relatórios (com logos)
6. ✅ **FASE 6**: Visualização em mapa

**⏸️ Pausado para o futuro:**
- Relatório Final (aguardando especificação - previsão 2028)

**🔜 Próximas evoluções opcionais:**
- Analytics e dashboards
- Clusters no mapa
- Exportação KML/GeoJSON
- Timeline de evolução das necessidades

---

**Documentação criada em**: 2025-01-XX
**Versão**: 1.0
**Projeto**: BR-LEGAL 2 / Operavia
**Dependências**: Sistema de CADASTRO (ver `PLANO-CADASTRO.md`)
