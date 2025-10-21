# Guia de Extensibilidade - BR-LEGAL 2

## Arquitetura Modular para Planilhas

Este sistema foi projetado para permitir a adição fácil de novas planilhas de coleta de dados.

### Estrutura Atual

```
src/
├── constants/
│   ├── planilhas.ts          # Registro central de todas as planilhas
│   └── naoConformidades.ts   # Constantes específicas da planilha 2.3
├── components/
│   ├── NaoConformidadeForm.tsx  # Formulário da planilha 2.3
│   └── admin/                   # Componentes administrativos
├── pages/
│   ├── MinhasNCs.tsx           # Listagem de NCs do técnico
│   └── Index.tsx               # Página principal com sessões
```

### Como Adicionar Uma Nova Planilha

#### Passo 1: Definir a Planilha

Adicione a configuração em `src/constants/planilhas.ts`:

```typescript
'3.1.2': {
  codigo: '3.1.2',
  nome: 'Conservação de Pavimento',
  categoria: 'conservacao',
  implementado: false, // Mude para true quando concluir
  descricao: 'Registro de condições e manutenção do pavimento',
  tabela: 'conservacao_pavimento' // Nome da tabela no Supabase
}
```

#### Passo 2: Criar a Tabela no Banco

Execute migration no Supabase:

```sql
-- Exemplo para planilha de conservação de pavimento
CREATE TABLE public.conservacao_pavimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  rodovia_id UUID NOT NULL,
  data_inspecao DATE NOT NULL,
  km_referencia NUMERIC,
  tipo_defeito TEXT NOT NULL,
  severidade TEXT NOT NULL,
  observacao TEXT,
  latitude_inicial NUMERIC NOT NULL,
  longitude_inicial NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies (seguir mesmo padrão de nao_conformidades)
ALTER TABLE public.conservacao_pavimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own records"
  ON public.conservacao_pavimento
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own records"
  ON public.conservacao_pavimento
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coordenador can view all"
  ON public.conservacao_pavimento
  FOR SELECT
  USING (has_role(auth.uid(), 'coordenador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
```

#### Passo 3: Criar Constantes Específicas

Crie arquivo `src/constants/conservacaoPavimento.ts`:

```typescript
export const TIPOS_DEFEITO = {
  TRINCA: "Trinca",
  AFUNDAMENTO: "Afundamento",
  PANELA: "Panela (buraco)",
  DESGASTE: "Desgaste superficial",
} as const;

export const SEVERIDADES = ["Baixa", "Média", "Alta"] as const;
```

#### Passo 4: Criar o Componente de Formulário

Crie `src/components/ConservacaoPavimentoForm.tsx`:

```typescript
// Similar ao NaoConformidadeForm.tsx
// Incluir:
// - Captura de GPS
// - Campos específicos da planilha
// - Validações
// - Envio para banco
```

#### Passo 5: Criar Página de Revisão

Crie `src/pages/MinhasConservacoes.tsx` (similar a MinhasNCs.tsx)

#### Passo 6: Adicionar Rota

Em `src/App.tsx`:

```typescript
<Route path="/minhas-conservacoes" element={<MinhasConservacoes />} />
```

#### Passo 7: Adicionar ao Menu Principal

Em `src/pages/Index.tsx`, adicionar botão condicional baseado em sessão ativa

### Padrões a Seguir

#### ✅ Boas Práticas

- **GPS obrigatório**: Todas as coletas devem ter localização GPS
- **Vinculação a sessão**: Sempre vincular a `lote_id` e `rodovia_id`
- **RLS Policies**: Técnicos veem só seus registros, coordenadores veem tudo
- **Status de envio**: Incluir campo `enviado_coordenador` para controle
- **Campos de auditoria**: `created_at`, `updated_at`, `user_id`

#### 🔒 Segurança

- Sempre habilitar RLS nas tabelas
- Políticas separadas para INSERT, SELECT, UPDATE, DELETE
- Usar função `has_role()` para verificar perfis
- Não permitir edição após envio ao coordenador

#### 📱 UX/UI

- Formulários responsivos (mobile-first)
- Captura de GPS automática ao abrir formulário
- Validação client-side antes de enviar
- Toasts de feedback (sucesso/erro)
- Loading states em botões

### Estrutura de Dados Recomendada

Toda tabela de coleta deve ter no mínimo:

```sql
CREATE TABLE public.nome_da_planilha (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculos essenciais
  user_id UUID NOT NULL,        -- Quem registrou
  lote_id UUID NOT NULL,         -- Em qual lote
  rodovia_id UUID NOT NULL,      -- Em qual rodovia

  -- Dados de localização (obrigatórios)
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  km_referencia NUMERIC,         -- Opcional, complementar ao GPS

  -- Dados temporais
  data_ocorrencia DATE NOT NULL, -- ou data_inspecao

  -- Controle de fluxo
  enviado_coordenador BOOLEAN DEFAULT false,

  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- ... campos específicos da planilha ...
);
```

### Próximas Planilhas Planejadas

1. **2.2 - Condições de Sinalização**
   - Avaliação quantitativa da sinalização
   - Retrorrefletância, estado das placas, etc.

2. **3.1.2 - Conservação de Pavimento**
   - Defeitos no pavimento
   - Classificação por severidade

3. **3.1.3.1 - Limpeza da Faixa de Domínio**
   - Capina, limpeza de vegetação
   - Área coberta

4. **3.1.3.2 - Limpeza de Dispositivos**
   - Limpeza de placas, defensas, tachas
   - Frequência e qualidade

5. **3.1.4 - Drenagem**
   - Estado de sarjetas, bueiros, galerias
   - Necessidade de manutenção

### Considerações para o Futuro

- **Modo offline**: Permitir cadastro sem internet e sincronizar depois
- **Fotos**: Anexar fotos às ocorrências (Supabase Storage)
- **Assinatura digital**: Para validação de fiscais
- **Relatórios**: Geração de PDF com dados coletados
- **Dashboard**: Visualização de dados agregados para coordenadores
