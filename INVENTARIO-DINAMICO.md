# 📊 Inventário Dinâmico - Documentação Técnica

## 🎯 Conceito de Inventário Dinâmico

### Princípio Fundamental

```
Cadastro Atual + Necessidades Executadas = Inventário Dinâmico Real
```

O **Inventário Dinâmico** é uma representação em tempo real do estado da rodovia, onde:

- **Inventário/Cadastro** = Estado inicial dos elementos (foto do passado)
- **Necessidades** = Intervenções planejadas
- **Intervenções** = Registro de execução das necessidades
- **Inventário Dinâmico** = Estado real atual após intervenções

### Fluxo de Dados

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Inventário │────→│ Necessidades │────→│ Intervenções │
│  (Estático) │     │  (Planejado) │     │  (Executado) │
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       └────────────────────┴─────────────────────┘
                            ↓
                  ┌──────────────────┐
                  │    Inventário    │
                  │     Dinâmico     │
                  │  (Estado Real)   │
                  └──────────────────┘
```

### Tipos de Operação

- **Remover**: elementos saem do inventário
- **Substituir**: elementos são atualizados (mantém localização, muda características)
- **Implantar**: novos elementos entram no inventário
- **Manter**: elementos permanecem inalterados

### Princípio da Unificação

**Dados de condição e estado pertencem às intervenções, não ao cadastro.**

O cadastro representa apenas as características físicas permanentes do elemento. A condição, estado de conservação, avarias e observações são registradas nas intervenções, pois representam o estado em um momento específico no tempo.

---

## 📋 Estrutura dos 7 Grupos de Serviço

### 1️⃣ Marcas Longitudinais

#### 📦 Inventário (`ficha_marcas_longitudinais`)

**Campos de Identificação**:

- `id`: uuid (PK) - Identificador único
- `user_id`: uuid (required) - Usuário que registrou
- `lote_id`: uuid (required) - Lote da rodovia
- `rodovia_id`: uuid (required) - Rodovia
- `snv`: text - Sistema Nacional de Viação
- `br`: text - Identificação da BR

**Campos de Localização**:

- `km_inicial`: numeric (required) - Quilômetro inicial
- `km_final`: numeric - Quilômetro final
- `latitude_inicial`: numeric - Latitude inicial
- `longitude_inicial`: numeric - Longitude inicial
- `latitude_final`: numeric - Latitude final
- `longitude_final`: numeric - Longitude final
- `posicao`: text - Posição (Bordo Direito, Bordo Esquerdo, Eixo)
- `extensao_metros`: numeric - Extensão em metros

**Características Físicas**:

- `tipo_demarcacao`: text - Tipo (Contínua, Tracejada, etc)
- `codigo`: text - Código da demarcação (LBO, LBE, LFO, LFE, LEP)
- `cor`: text - Cor da demarcação
- `largura_cm`: numeric - Largura em centímetros
- `espessura_cm`: numeric - Espessura em centímetros
- `material`: text - Material utilizado
- `traco_m`: numeric - Comprimento do traço em metros
- `espacamento_m`: numeric - Espaçamento entre traços em metros
- `area_m2`: numeric - Área total em metros quadrados

**Metadados**:

- `data_vistoria`: date (required) - Data da vistoria
- `created_at`: timestamp - Data de criação do registro
- `updated_at`: timestamp - Data de última atualização
- `enviado_coordenador`: boolean (default: false) - Status de envio

**Campos Removidos** ❌ (migrados para intervenções):

- `estado_conservacao`: text - Movido para `ficha_marcas_longitudinais_intervencoes`
- `foto_url`: text - Movido para `ficha_marcas_longitudinais_intervencoes`
- `observacao`: text - Movido para `ficha_marcas_longitudinais_intervencoes`

#### 📋 Necessidades (`necessidades_marcas_longitudinais`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km_inicial`: numeric (required)
- `km_final`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric
- `posicao`: text

**Campos de Intervenção**:

- `motivo`: text (required) - Remover / Substituir / Implantar / Manter
- `tipo_marca`: text - Tipo da marca longitudinal
- `cor`: text - Cor da marca
- `material`: text - Material
- `extensao_metros`: numeric - Extensão em metros

**Matching**:

- `cadastro_matched_id`: uuid - ID do elemento no cadastro (match por GPS)
- `distancia_metros`: numeric - Distância do match GPS

**Metadados**:

- `data_necessidade`: date (required)
- `prioridade`: text (Alta/Média/Baixa)
- `status`: text (Pendente/Em Execução/Concluída)
- `observacao`: text
- `created_at`: timestamp
- `updated_at`: timestamp
- `enviado_coordenador`: boolean

#### ⚙️ Intervenções (`ficha_marcas_longitudinais_intervencoes`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `ficha_marcas_longitudinais_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos Específicos de Intervenção**:

- `motivo`: text (required) - Motivo da intervenção
- `data_intervencao`: date (required) - Data de execução
- `fora_plano_manutencao`: boolean (default: false)
- `justificativa_fora_plano`: text

**Características Alteradas**:

- `tipo_demarcacao`: text
- `cor`: text
- `material`: text
- `largura_cm`: numeric
- `espessura_cm`: numeric

**Campos de Condição** ✅ (recebidos do inventário):

- `estado_conservacao`: text - Estado de conservação
- `observacao`: text - Observações
- `foto_url`: text - URL da foto da intervenção

#### 🔄 Interface TypeScript

```typescript
interface MarcaLongitudinalInventario {
  id: string;
  user_id: string;
  lote_id: string;
  rodovia_id: string;
  snv?: string;
  br?: string;
  km_inicial: number;
  km_final?: number;
  latitude_inicial?: number;
  longitude_inicial?: number;
  latitude_final?: number;
  longitude_final?: number;
  posicao?: string;
  extensao_metros?: number;
  tipo_demarcacao?: string;
  codigo?: string;
  cor?: string;
  largura_cm?: number;
  espessura_cm?: number;
  material?: string;
  traco_m?: number;
  espacamento_m?: number;
  area_m2?: number;
  data_vistoria: string;
  created_at: string;
  updated_at: string;
  enviado_coordenador: boolean;
}

interface MarcaLongitudinalIntervencao {
  id: string;
  ficha_marcas_longitudinais_id: string;
  motivo: string;
  data_intervencao: string;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano?: string;
  tipo_demarcacao?: string;
  cor?: string;
  material?: string;
  largura_cm?: number;
  espessura_cm?: number;
  estado_conservacao?: string;
  observacao?: string;
  foto_url?: string;
  created_at: string;
}
```

---

### 2️⃣ Tachas (Taxas)

#### 📦 Inventário (`ficha_tachas`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)
- `snv`: text

**Campos de Localização**:

- `km_inicial`: numeric (required)
- `km_final`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric
- `local_implantacao`: text
- `extensao_km`: numeric
- `espacamento_m`: numeric

**Características Físicas**:

- `corpo`: text - Material do corpo
- `refletivo`: text - Material refletivo
- `cor_refletivo`: text - Cor do refletivo
- `quantidade`: integer (required, default: 1)

**Metadados**:

- `data_vistoria`: date (required)
- `created_at`: timestamp
- `updated_at`: timestamp
- `enviado_coordenador`: boolean (default: false)

**Campos Removidos** ❌ (migrados para intervenções):

- `descricao`: text - Movido para `ficha_tachas_intervencoes`
- `observacao`: text - Movido para `ficha_tachas_intervencoes`
- `foto_url`: text - Movido para `ficha_tachas_intervencoes`

#### 📋 Necessidades (`necessidades_tachas`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km_inicial`: numeric (required)
- `km_final`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric

**Campos de Intervenção**:

- `motivo`: text (required) - Remover / Substituir / Implantar / Manter
- `tipo_tacha`: text
- `cor`: text
- `quantidade`: integer

**Matching**:

- `cadastro_matched_id`: uuid
- `distancia_metros`: numeric

**Metadados**:

- `data_necessidade`: date (required)
- `prioridade`: text
- `status`: text
- `observacao`: text
- `created_at`: timestamp
- `updated_at`: timestamp

#### ⚙️ Intervenções (`ficha_tachas_intervencoes`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `ficha_tachas_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos Específicos de Intervenção**:

- `motivo`: text (required)
- `data_intervencao`: date (required)
- `fora_plano_manutencao`: boolean (default: false)
- `justificativa_fora_plano`: text

**Características Alteradas**:

- `tipo_tacha`: text
- `cor`: text
- `material`: text
- `lado`: text
- `quantidade`: integer

**Campos de Condição** ✅ (recebidos do inventário):

- `descricao`: text - Descrição da tacha/condição
- `observacao`: text - Observações
- `foto_url`: text - URL da foto

#### 🔄 Interface TypeScript

```typescript
interface TachaInventario {
  id: string;
  user_id: string;
  lote_id: string;
  rodovia_id: string;
  snv?: string;
  km_inicial: number;
  km_final: number;
  latitude_inicial?: number;
  longitude_inicial?: number;
  latitude_final?: number;
  longitude_final?: number;
  local_implantacao?: string;
  extensao_km?: number;
  espacamento_m?: number;
  corpo?: string;
  refletivo?: string;
  cor_refletivo?: string;
  quantidade: number;
  data_vistoria: string;
  created_at: string;
  updated_at: string;
  enviado_coordenador: boolean;
}

interface TachaIntervencao {
  id: string;
  ficha_tachas_id: string;
  motivo: string;
  data_intervencao: string;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano?: string;
  tipo_tacha?: string;
  cor?: string;
  material?: string;
  lado?: string;
  quantidade?: number;
  descricao?: string;
  observacao?: string;
  foto_url?: string;
  created_at: string;
}
```

---

### 3️⃣ Inscrições/Zebrados (Marcas Transversais)

#### 📦 Inventário (`ficha_inscricoes`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km_inicial`: numeric
- `km_final`: numeric
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric

**Características Físicas**:

- `tipo_inscricao`: text (required) - Tipo (LF-1, LF-2, FX-1, FX-2, etc)
- `cor`: text (required) - Cor da inscrição
- `material_utilizado`: text - Material utilizado
- `dimensoes`: text - Dimensões
- `area_m2`: numeric - Área em metros quadrados

**Metadados**:

- `data_vistoria`: date (required)
- `created_at`: timestamp
- `updated_at`: timestamp
- `enviado_coordenador`: boolean (default: false)

**Campos Removidos** ❌ (migrados para intervenções):

- `estado_conservacao`: text - Movido para `ficha_inscricoes_intervencoes`
- `foto_url`: text - Movido para `ficha_inscricoes_intervencoes`
- `observacao`: text (não estava no inventário, mas adicionado em intervenções)

#### 📋 Necessidades (`necessidades_marcas_transversais`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km_inicial`: numeric (required)
- `km_final`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric

**Campos de Intervenção**:

- `motivo`: text (required)
- `tipo_marca`: text
- `cor`: text
- `material`: text
- `area_m2`: numeric

**Matching**:

- `cadastro_matched_id`: uuid
- `distancia_metros`: numeric

**Metadados**:

- `data_necessidade`: date (required)
- `prioridade`: text
- `status`: text
- `observacao`: text
- `created_at`: timestamp
- `updated_at`: timestamp

#### ⚙️ Intervenções (`ficha_inscricoes_intervencoes`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `ficha_inscricoes_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos Específicos de Intervenção**:

- `motivo`: text (required)
- `data_intervencao`: date (required)
- `fora_plano_manutencao`: boolean (default: false)
- `justificativa_fora_plano`: text

**Características Alteradas**:

- `tipo_inscricao`: text
- `cor`: text
- `material_utilizado`: text
- `dimensoes`: text
- `area_m2`: numeric

**Campos de Condição** ✅ (recebidos do inventário):

- `estado_conservacao`: text
- `observacao`: text
- `foto_url`: text

#### 🔄 Interface TypeScript

```typescript
interface InscricaoInventario {
  id: string;
  user_id: string;
  lote_id: string;
  rodovia_id: string;
  km_inicial?: number;
  km_final?: number;
  latitude_inicial?: number;
  longitude_inicial?: number;
  latitude_final?: number;
  longitude_final?: number;
  tipo_inscricao: string;
  cor: string;
  material_utilizado?: string;
  dimensoes?: string;
  area_m2?: number;
  data_vistoria: string;
  created_at: string;
  updated_at: string;
  enviado_coordenador: boolean;
}

interface InscricaoIntervencao {
  id: string;
  ficha_inscricoes_id: string;
  motivo: string;
  data_intervencao: string;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano?: string;
  tipo_inscricao?: string;
  cor?: string;
  material_utilizado?: string;
  dimensoes?: string;
  area_m2?: number;
  estado_conservacao?: string;
  observacao?: string;
  foto_url?: string;
  created_at: string;
}
```

---

### 4️⃣ Cilindros

#### 📦 Inventário (`ficha_cilindros`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)
- `snv`: text

**Campos de Localização**:

- `km_inicial`: numeric (required, default: 0)
- `km_final`: numeric (required, default: 0)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric
- `local_implantacao`: text
- `extensao_km`: numeric
- `espacamento_m`: numeric

**Características Físicas**:

- `cor_corpo`: text (required) - Cor do corpo do cilindro
- `cor_refletivo`: text - Cor do refletivo
- `tipo_refletivo`: text - Tipo de refletivo
- `quantidade`: integer

**Metadados**:

- `data_vistoria`: date (required, default: CURRENT_DATE)
- `created_at`: timestamp
- `updated_at`: timestamp
- `enviado_coordenador`: boolean (default: false)

**Campos Removidos** ❌ (migrados para intervenções):

- `foto_url`: text - Movido para `ficha_cilindros_intervencoes`
- `observacao`: text (não estava no inventário original)

#### 📋 Necessidades (`necessidades_cilindros`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km_inicial`: numeric (required)
- `km_final`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric

**Campos de Intervenção**:

- `motivo`: text (required)
- `cor_corpo`: text
- `tipo_refletivo`: text
- `quantidade`: integer

**Matching**:

- `cadastro_matched_id`: uuid
- `distancia_metros`: numeric

**Metadados**:

- `data_necessidade`: date (required)
- `prioridade`: text
- `status`: text
- `observacao`: text
- `created_at`: timestamp
- `updated_at`: timestamp

#### ⚙️ Intervenções (`ficha_cilindros_intervencoes`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `ficha_cilindros_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos Específicos de Intervenção**:

- `motivo`: text (required)
- `data_intervencao`: date (required)
- `fora_plano_manutencao`: boolean (default: false)
- `justificativa_fora_plano`: text

**Características Alteradas**:

- `cor_corpo`: text
- `cor_refletivo`: text
- `tipo_refletivo`: text
- `quantidade`: integer

**Campos de Condição** ✅ (recebidos do inventário):

- `foto_url`: text

#### 🔄 Interface TypeScript

```typescript
interface CilindroInventario {
  id: string;
  user_id: string;
  lote_id: string;
  rodovia_id: string;
  snv?: string;
  km_inicial: number;
  km_final: number;
  latitude_inicial?: number;
  longitude_inicial?: number;
  latitude_final?: number;
  longitude_final?: number;
  local_implantacao?: string;
  extensao_km?: number;
  espacamento_m?: number;
  cor_corpo: string;
  cor_refletivo?: string;
  tipo_refletivo?: string;
  quantidade?: number;
  data_vistoria: string;
  created_at: string;
  updated_at: string;
  enviado_coordenador: boolean;
}

interface CilindroIntervencao {
  id: string;
  ficha_cilindros_id: string;
  motivo: string;
  data_intervencao: string;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano?: string;
  cor_corpo?: string;
  cor_refletivo?: string;
  tipo_refletivo?: string;
  quantidade?: number;
  foto_url?: string;
  created_at: string;
}
```

---

### 5️⃣ Placas

#### 📦 Inventário (`ficha_placa`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)
- `snv`: text
- `br`: text
- `numero_patrimonio`: text
- `contrato`: text
- `empresa`: text

**Campos de Localização**:

- `km`: numeric
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `lado`: text - Lado (Direito/Esquerdo)
- `posicao`: text
- `distancia_m`: numeric - Distância do bordo da pista
- `afastamento_m`: numeric (em ficha_verificacao_itens)

**Características da Placa**:

- `tipo`: text - Tipo (Regulamentação/Advertência/Indicação)
- `modelo`: text
- `codigo`: text - Código da placa
- `descricao`: text - Descrição do código
- `dimensoes_mm`: text - Dimensões em milímetros
- `area_m2`: numeric - Área em metros quadrados
- `velocidade`: text

**Características do Substrato**:

- `substrato`: text - Material do substrato
- `si_sinal_impresso`: text

**Características da Película**:

- `cor_pelicula_fundo`: text
- `tipo_pelicula_fundo`: text
- `retro_pelicula_fundo`: numeric - Retrorrefletividade do fundo
- `cor_pelicula_legenda_orla`: text
- `tipo_pelicula_legenda_orla`: text
- `retro_pelicula_legenda_orla`: numeric

**Características do Suporte**:

- `suporte`: text - Tipo de suporte
- `qtde_suporte`: integer - Quantidade de suportes
- `secao_suporte_mm`: text - Seção do suporte em mm
- `tipo_secao_suporte`: text
- `altura_m`: numeric - Altura em metros

**Documentação (fotos mantidas no inventário)**:

- `foto_url`: text
- `foto_frontal_url`: text
- `foto_identificacao_url`: text
- `foto_base_url`: text
- `foto_posterior_url`: text
- `foto_lateral_url`: text
- `link_fotografia`: text

**Metadados**:

- `data_vistoria`: date (required)
- `data_implantacao`: date
- `uf`: text
- `detalhamento_pagina`: integer
- `created_at`: timestamp
- `updated_at`: timestamp
- `enviado_coordenador`: boolean (default: false)

**⚠️ Observação**: Placas **NÃO tiveram migração de campos**. A estrutura original foi mantida.

#### 📋 Necessidades (`necessidades_placas`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `lado`: text

**Campos de Intervenção**:

- `motivo`: text (required) - Remover / Substituir / Implantar / Manter
- `codigo_placa`: text
- `tipo_placa`: text
- `dimensoes`: text

**Matching**:

- `cadastro_matched_id`: uuid
- `distancia_metros`: numeric

**Metadados**:

- `data_necessidade`: date (required)
- `prioridade`: text
- `status`: text
- `observacao`: text
- `created_at`: timestamp
- `updated_at`: timestamp

#### ⚙️ Intervenções (`ficha_placa_intervencoes`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `ficha_placa_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos Específicos de Intervenção**:

- `motivo`: text (required)
- `data_intervencao`: date (required)
- `fora_plano_manutencao`: boolean (default: false)
- `justificativa_fora_plano`: text
- `placa_recuperada`: boolean (default: false)

**Características Alteradas**:

- `substrato`: text
- `suporte`: text
- `tipo_pelicula_fundo_novo`: text
- `retro_fundo`: numeric
- `retro_orla_legenda`: numeric

#### 📋 Tabela Auxiliar: Danos (`ficha_placa_danos`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `ficha_placa_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos de Dano**:

- `problema`: text (required) - Tipo de dano/problema
- `data_ocorrencia`: date (required)
- `vandalismo`: boolean (default: false)
- `observacao`: text
- `solucao`: text

#### 🔄 Interface TypeScript

```typescript
interface PlacaInventario {
  id: string;
  user_id: string;
  lote_id: string;
  rodovia_id: string;
  snv?: string;
  br?: string;
  numero_patrimonio?: string;
  contrato?: string;
  empresa?: string;
  km?: number;
  latitude?: number;
  longitude?: number;
  lado?: string;
  posicao?: string;
  distancia_m?: number;
  tipo?: string;
  modelo?: string;
  codigo?: string;
  descricao?: string;
  dimensoes_mm?: string;
  area_m2?: number;
  velocidade?: string;
  substrato?: string;
  si_sinal_impresso?: string;
  cor_pelicula_fundo?: string;
  tipo_pelicula_fundo?: string;
  retro_pelicula_fundo?: number;
  cor_pelicula_legenda_orla?: string;
  tipo_pelicula_legenda_orla?: string;
  retro_pelicula_legenda_orla?: number;
  suporte?: string;
  qtde_suporte?: number;
  secao_suporte_mm?: string;
  tipo_secao_suporte?: string;
  altura_m?: number;
  foto_url?: string;
  foto_frontal_url?: string;
  foto_identificacao_url?: string;
  foto_base_url?: string;
  foto_posterior_url?: string;
  foto_lateral_url?: string;
  link_fotografia?: string;
  data_vistoria: string;
  data_implantacao?: string;
  uf?: string;
  detalhamento_pagina?: number;
  created_at: string;
  updated_at: string;
  enviado_coordenador: boolean;
}

interface PlacaIntervencao {
  id: string;
  ficha_placa_id: string;
  motivo: string;
  data_intervencao: string;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano?: string;
  placa_recuperada: boolean;
  substrato?: string;
  suporte?: string;
  tipo_pelicula_fundo_novo?: string;
  retro_fundo?: number;
  retro_orla_legenda?: number;
  created_at: string;
}

interface PlacaDano {
  id: string;
  ficha_placa_id: string;
  problema: string;
  data_ocorrencia: string;
  vandalismo: boolean;
  observacao?: string;
  solucao?: string;
  created_at: string;
}
```

---

### 6️⃣ Pórticos

#### 📦 Inventário (`ficha_porticos`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)
- `snv`: text

**Campos de Localização**:

- `km`: numeric
- `latitude`: numeric
- `longitude`: numeric
- `lado`: text - Lado (quando aplicável)

**Características Físicas**:

- `tipo`: text (required) - Tipo (Pórtico/Semi-Pórtico/Braço Projetado)
- `vao_horizontal_m`: numeric - Vão horizontal em metros
- `altura_livre_m`: numeric - Altura livre em metros

**Documentação**:

- `foto_url`: text - URL da foto

**Metadados**:

- `data_vistoria`: date (required)
- `created_at`: timestamp
- `updated_at`: timestamp
- `enviado_coordenador`: boolean (default: false)

**⚠️ Observação**: Pórticos **NÃO tiveram migração de campos**. A estrutura original foi mantida.

#### 📋 Necessidades (`necessidades_porticos`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km`: numeric (required)
- `latitude`: numeric
- `longitude`: numeric

**Campos de Intervenção**:

- `motivo`: text (required)
- `tipo`: text
- `vao_horizontal_m`: numeric
- `altura_livre_m`: numeric

**Matching**:

- `cadastro_matched_id`: uuid
- `distancia_metros`: numeric

**Metadados**:

- `data_necessidade`: date (required)
- `prioridade`: text
- `status`: text
- `observacao`: text
- `created_at`: timestamp
- `updated_at`: timestamp

#### ⚙️ Intervenções (`ficha_porticos_intervencoes`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `ficha_porticos_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos Específicos de Intervenção**:

- `motivo`: text (required)
- `data_intervencao`: date (required)
- `fora_plano_manutencao`: boolean (default: false)
- `justificativa_fora_plano`: text

**Características Alteradas**:

- `tipo`: text
- `vao_horizontal_m`: numeric
- `altura_livre_m`: numeric
- `observacao`: text

#### 🔄 Interface TypeScript

```typescript
interface PorticoInventario {
  id: string;
  user_id: string;
  lote_id: string;
  rodovia_id: string;
  snv?: string;
  km?: number;
  latitude_inicial?: number;
  longitudeinicial?: number;
  lado?: string;
  tipo: string;
  vao_horizontal_m?: number;
  altura_livre_m?: number;
  foto_url?: string;
  data_vistoria: string;
  created_at: string;
  updated_at: string;
  enviado_coordenador: boolean;
}

interface PorticoIntervencao {
  id: string;
  ficha_porticos_id: string;
  motivo: string;
  data_intervencao: string;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano?: string;
  tipo?: string;
  vao_horizontal_m?: number;
  altura_livre_m?: number;
  observacao?: string;
  created_at: string;
}
```

---

### 7️⃣ Defensas

#### 📦 Inventário (`defensas`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)
- `snv`: text
- `br`: text
- `id_defensa`: text

**Campos de Localização**:

- `km_inicial`: numeric (required)
- `km_final`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric
- `extensao_metros`: numeric (required)
- `lado`: text (required) - Lado da defensa

**Características da Defensa**:

- `quantidade_laminas`: integer - Quantidade de lâminas
- `comprimento_total_tramo_m`: numeric
- `geometria`: text
- `funcao`: text
- `tramo`: text

**Características de Contenção**:

- `nivel_contencao_nchrp350`: text
- `nivel_contencao_en1317`: text
- `classificacao_nivel_contencao`: text

**Características dos Terminais**:

- `terminal_entrada`: text
- `terminal_saida`: text
- `adequacao_funcionalidade_terminais`: text
- `adequacao_funcionalidade_terminais_inadequados`: text
- `adequacao_funcionalidade_lamina`: text
- `adequacao_funcionalidade_laminas_inadequadas`: text

**Características do Local**:

- `distancia_pista_obstaculo_m`: numeric
- `distancia_face_defensa_obstaculo_m`: numeric
- `distancia_bordo_pista_face_defensa_m`: numeric
- `espaco_trabalho`: text
- `especificacao_obstaculo_fixo`: text
- `risco`: text

**Características do Tráfego**:

- `velocidade_kmh`: integer
- `vmd_veic_dia`: integer - Volume Médio Diário
- `percentual_veiculos_pesados`: numeric

**Documentação**:

- `link_fotografia`: text

**Metadados**:

- `data_inspecao`: date (required)
- `created_at`: timestamp
- `updated_at`: timestamp
- `enviado_coordenador`: boolean (default: false)

**Campos Removidos** ❌ (migrados para intervenções):

- `estado_conservacao`: text - Movido para `defensas_intervencoes`
- `tipo_avaria`: text - Movido para `defensas_intervencoes`
- `necessita_intervencao`: boolean - Movido para `defensas_intervencoes`
- `nivel_risco`: text - Movido para `defensas_intervencoes`
- `observacao`: text - Movido para `defensas_intervencoes`
- `foto_url`: text - Movido para `defensas_intervencoes`

#### 📋 Necessidades (`necessidades_defensas`)

**Campos de Identificação**:

- `id`: uuid (PK)
- `user_id`: uuid (required)
- `lote_id`: uuid (required)
- `rodovia_id`: uuid (required)

**Campos de Localização**:

- `km_inicial`: numeric (required)
- `km_final`: numeric (required)
- `latitude_inicial`: numeric
- `longitude_inicial`: numeric
- `latitude_final`: numeric
- `longitude_final`: numeric

**Campos de Intervenção**:

- `motivo`: text (required)
- `extensao_metros`: numeric
- `quantidade_laminas`: integer

**Matching**:

- `cadastro_matched_id`: uuid
- `distancia_metros`: numeric

**Metadados**:

- `data_necessidade`: date (required)
- `prioridade`: text
- `status`: text
- `observacao`: text
- `created_at`: timestamp
- `updated_at`: timestamp

#### ⚙️ Intervenções (`defensas_intervencoes`)

**Campos de Vínculo**:

- `id`: uuid (PK)
- `defensa_id`: uuid (required) - FK para inventário
- `created_at`: timestamp

**Campos Específicos de Intervenção**:

- `motivo`: text (required)
- `data_intervencao`: date (required)
- `fora_plano_manutencao`: boolean (default: false)
- `justificativa_fora_plano`: text

**Características Alteradas**:

- `extensao_metros`: numeric

**Campos de Condição** ✅ (recebidos do inventário):

- `estado_conservacao`: text
- `tipo_avaria`: text
- `necessita_intervencao`: boolean
- `nivel_risco`: text
- `observacao`: text
- `foto_url`: text

#### 🔄 Interface TypeScript

```typescript
interface DefensaInventario {
  id: string;
  user_id: string;
  lote_id: string;
  rodovia_id: string;
  snv?: string;
  br?: string;
  id_defensa?: string;
  km_inicial: number;
  km_final: number;
  latitude_inicial?: number;
  longitude_inicial?: number;
  latitude_final?: number;
  longitude_final?: number;
  extensao_metros: number;
  lado: string;
  quantidade_laminas?: number;
  comprimento_total_tramo_m?: number;
  geometria?: string;
  funcao?: string;
  tramo?: string;
  nivel_contencao_nchrp350?: string;
  nivel_contencao_en1317?: string;
  classificacao_nivel_contencao?: string;
  terminal_entrada?: string;
  terminal_saida?: string;
  adequacao_funcionalidade_terminais?: string;
  adequacao_funcionalidade_terminais_inadequados?: string;
  adequacao_funcionalidade_lamina?: string;
  adequacao_funcionalidade_laminas_inadequadas?: string;
  distancia_pista_obstaculo_m?: number;
  distancia_face_defensa_obstaculo_m?: number;
  distancia_bordo_pista_face_defensa_m?: number;
  espaco_trabalho?: string;
  especificacao_obstaculo_fixo?: string;
  risco?: string;
  velocidade_kmh?: number;
  vmd_veic_dia?: number;
  percentual_veiculos_pesados?: number;
  link_fotografia?: string;
  data_inspecao: string;
  created_at: string;
  updated_at: string;
  enviado_coordenador: boolean;
}

interface DefensaIntervencao {
  id: string;
  defensa_id: string;
  motivo: string;
  data_intervencao: string;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano?: string;
  extensao_metros?: number;
  estado_conservacao?: string;
  tipo_avaria?: string;
  necessita_intervencao?: boolean;
  nivel_risco?: string;
  observacao?: string;
  foto_url?: string;
  created_at: string;
}
```

---

## 📊 Tabela Comparativa de Unificação

| #   | Tipo de Serviço          | Tabela Inventário            | Tabela Intervenções                       | Campos Migrados                                                                                       | Status                |
| --- | ------------------------ | ---------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | **Marcas Longitudinais** | `ficha_marcas_longitudinais` | `ficha_marcas_longitudinais_intervencoes` | `estado_conservacao`, `foto_url`, `observacao`                                                        | ✅ Unificado          |
| 2   | **Tachas**               | `ficha_tachas`               | `ficha_tachas_intervencoes`               | `descricao`, `observacao`, `foto_url`                                                                 | ✅ Unificado          |
| 3   | **Inscrições/Zebrados**  | `ficha_inscricoes`           | `ficha_inscricoes_intervencoes`           | `estado_conservacao`, `foto_url` (+ `observacao` adicionado)                                          | ✅ Unificado          |
| 4   | **Cilindros**            | `ficha_cilindros`            | `ficha_cilindros_intervencoes`            | `foto_url`                                                                                            | ✅ Unificado          |
| 5   | **Placas**               | `ficha_placa`                | `ficha_placa_intervencoes`                | _(nenhum)_                                                                                            | ⚪ Estrutura Original |
| 6   | **Pórticos**             | `ficha_porticos`             | `ficha_porticos_intervencoes`             | _(nenhum)_                                                                                            | ⚪ Estrutura Original |
| 7   | **Defensas**             | `defensas`                   | `defensas_intervencoes`                   | `estado_conservacao`, `tipo_avaria`, `necessita_intervencao`, `nivel_risco`, `observacao`, `foto_url` | ✅ Unificado          |

### Legenda

- ✅ **Unificado**: Campos de condição/estado migrados do inventário para intervenções
- ⚪ **Estrutura Original**: Mantido sem alterações na unificação

### Resumo da Migração

**Tipos Unificados (5)**:

1. Marcas Longitudinais - 3 campos migrados
2. Tachas - 3 campos migrados
3. Inscrições/Zebrados - 2 campos migrados + 1 adicionado
4. Cilindros - 1 campo migrado
5. Defensas - 6 campos migrados

**Tipos com Estrutura Original (2)**: 6. Placas - Mantém fotos no inventário devido à complexidade (múltiplas fotos) 7. Pórticos - Mantém estrutura simplificada

**Total de Campos Migrados**: 15+ campos movidos de inventário → intervenções

---

## 💡 Implicações para Desenvolvimento

### 1. **Importação de Inventário (Excel)**

#### Campos Esperados nos Arquivos Excel

**Marcas Longitudinais**:

- ❌ NÃO IMPORTAR: `estado_conservacao`, `foto_url`, `observacao`
- ✅ IMPORTAR: Todos os outros campos (localização, características físicas, metadados)

**Tachas**:

- ❌ NÃO IMPORTAR: `descricao`, `observacao`, `foto_url`
- ✅ IMPORTAR: Localização, características físicas

**Inscrições**:

- ❌ NÃO IMPORTAR: `estado_conservacao`, `foto_url`, `observacao`
- ✅ IMPORTAR: Tipo, cor, material, dimensões, área

**Cilindros**:

- ❌ NÃO IMPORTAR: `foto_url`, `observacao`
- ✅ IMPORTAR: Cor corpo, refletivos, localização

**Defensas**:

- ❌ NÃO IMPORTAR: `estado_conservacao`, `tipo_avaria`, `necessita_intervencao`, `nivel_risco`, `observacao`, `foto_url`
- ✅ IMPORTAR: Características físicas, contenção, terminais

**Placas e Pórticos**:

- ✅ IMPORTAR: Todos os campos (estrutura original mantida)

### 2. **Formulários de Cadastro**

**O que MOSTRAR ao usuário**:

- Campos de identificação (lote, rodovia, SNV, BR)
- Campos de localização (km, GPS, lado)
- Campos de características físicas (tipo, cor, material, dimensões)
- Data de vistoria

**O que NÃO MOSTRAR**:

- ❌ Estado de conservação (vai para intervenção)
- ❌ Observações sobre condição (vai para intervenção)
- ❌ Foto da condição atual (vai para intervenção)

### 3. **Formulários de Intervenção**

**Campos OBRIGATÓRIOS em toda intervenção**:

- `motivo`: Remover / Substituir / Implantar / Manter
- `data_intervencao`: Data de execução
- `fora_plano_manutencao`: boolean
- Se `fora_plano_manutencao = true` → `justificativa_fora_plano` (required)

**Campos de CONDIÇÃO a preencher** (tipos unificados):

- Marcas Longitudinais: `estado_conservacao`, `observacao`, `foto_url`
- Tachas: `descricao`, `observacao`, `foto_url`
- Inscrições: `estado_conservacao`, `observacao`, `foto_url`
- Cilindros: `foto_url`
- Defensas: `estado_conservacao`, `tipo_avaria`, `nivel_risco`, `observacao`, `foto_url`

**Campos de ALTERAÇÃO** (características que mudaram):

- Exemplo Marcas: novo `material`, nova `cor`, nova `largura_cm`
- Exemplo Tachas: novo `tipo_tacha`, nova `cor`, nova `quantidade`

### 4. **Viewers (Visualizadores de Inventário)**

**Aba "Dados Gerais"**:

- Mostrar campos do inventário (características fixas)
- **NÃO** mostrar estado de conservação, observações, fotos

**Aba "Fotos"** (tipos unificados):

- Mostrar mensagem: "As fotos estão disponíveis no histórico de intervenções"
- Link para aba "Histórico"

**Aba "Histórico"**:

- Listar todas as intervenções
- Para cada intervenção, mostrar:
  - Data da intervenção
  - Motivo
  - Estado de conservação (se aplicável)
  - Observações
  - Foto (se houver)
  - Características alteradas

### 5. **Exportação de Relatórios**

**Para gerar relatório completo de um elemento**:

```sql
-- Exemplo: Marcas Longitudinais
SELECT
  inv.*,
  int.data_intervencao,
  int.motivo,
  int.estado_conservacao,
  int.observacao,
  int.foto_url
FROM ficha_marcas_longitudinais inv
LEFT JOIN ficha_marcas_longitudinais_intervencoes int
  ON int.ficha_marcas_longitudinais_id = inv.id
WHERE inv.id = '<element_id>'
ORDER BY int.data_intervencao DESC;
```

**Para calcular Inventário Dinâmico**:

```sql
-- Elementos que foram REMOVIDOS (última intervenção = Remover)
-- Elementos que foram SUBSTITUÍDOS (última intervenção = Substituir) → mostrar novas características
-- Elementos que foram IMPLANTADOS (intervenção = Implantar) → não estão no cadastro original
-- Elementos MANTIDOS (sem intervenção ou última = Manter) → mostrar cadastro original
```

### 6. **Match entre Necessidades e Cadastro**

⚠️ **IMPORTANTE**: O matching de necessidades NÃO ocorre durante a importação.
Este processo é executado APÓS a importação, em uma aba dedicada "Matching",
onde os algoritmos GPS e overlap são aplicados às necessidades já importadas.

**Função SQL para matching**:

```sql
SELECT * FROM match_cadastro_por_coordenadas(
  p_tipo := 'marcas_longitudinais',  -- ou 'tachas', 'cilindros', etc.
  p_lat := -15.7942,
  p_long := -47.8822,
  p_rodovia_id := '<rodovia_uuid>',
  p_tolerancia_metros := 50  -- raio de busca
);
```

**Tipos suportados**:

- `marcas_longitudinais`
- `tachas`
- `marcas_transversais` (inscrições)
- `cilindros`
- `placas`
- `porticos`
- `defensas`

### 7. **Limpeza de Fotos Órfãs**

**Componente**: `src/components/admin/DeleteInventarioSelecionado.tsx`

**Tabelas que NÃO TÊM foto_url no inventário** (após unificação):

- `ficha_marcas_longitudinais` ❌
- `ficha_tachas` ❌
- `ficha_inscricoes` ❌
- `ficha_cilindros` ❌
- `defensas` ❌

**Tabelas que MANTÊM foto_url**:

- `ficha_placa` ✅
- `ficha_porticos` ✅

**Buckets de fotos de intervenção**:

- `marcas-longitudinais` (para intervenções)
- `tachas` (para intervenções)
- `inscricoes` (para intervenções)
- `cilindros` (para intervenções)
- `defensas` (para intervenções)

---

## 🔍 Queries SQL de Referência

### 1. Buscar Inventário com Última Intervenção

```sql
-- Marcas Longitudinais com última intervenção
WITH ultima_intervencao AS (
  SELECT DISTINCT ON (ficha_marcas_longitudinais_id)
    ficha_marcas_longitudinais_id,
    data_intervencao,
    motivo,
    estado_conservacao,
    observacao,
    foto_url
  FROM ficha_marcas_longitudinais_intervencoes
  ORDER BY ficha_marcas_longitudinais_id, data_intervencao DESC
)
SELECT
  inv.*,
  ui.data_intervencao AS ultima_intervencao_data,
  ui.motivo AS ultima_intervencao_motivo,
  ui.estado_conservacao AS condicao_atual,
  ui.observacao AS observacao_atual,
  ui.foto_url AS foto_atual
FROM ficha_marcas_longitudinais inv
LEFT JOIN ultima_intervencao ui ON ui.ficha_marcas_longitudinais_id = inv.id
WHERE inv.lote_id = '<lote_id>'
  AND inv.rodovia_id = '<rodovia_id>'
ORDER BY inv.km_inicial;
```

### 2. Buscar Necessidades com Match ao Cadastro

```sql
-- Necessidades de Tachas com match
SELECT
  nec.*,
  inv.id AS cadastro_id,
  inv.km_inicial AS cadastro_km,
  inv.corpo AS cadastro_corpo,
  inv.refletivo AS cadastro_refletivo,
  nec.distancia_metros
FROM necessidades_tachas nec
LEFT JOIN ficha_tachas inv ON inv.id = nec.cadastro_matched_id
WHERE nec.lote_id = '<lote_id>'
  AND nec.rodovia_id = '<rodovia_id>'
ORDER BY nec.km_inicial;
```

### 3. Histórico Completo de um Elemento

```sql
-- Histórico completo de uma defensa
SELECT
  'CADASTRO' AS tipo_registro,
  def.data_inspecao AS data,
  'Cadastro inicial' AS descricao,
  def.extensao_metros,
  NULL AS foto_url,
  NULL AS observacao
FROM defensas def
WHERE def.id = '<defensa_id>'

UNION ALL

SELECT
  'INTERVENCAO' AS tipo_registro,
  int.data_intervencao AS data,
  int.motivo AS descricao,
  int.extensao_metros,
  int.foto_url,
  int.observacao
FROM defensas_intervencoes int
WHERE int.defensa_id = '<defensa_id>'

ORDER BY data;
```

### 4. Calcular Inventário Dinâmico

```sql
-- Elementos ativos no Inventário Dinâmico (Cilindros)
WITH ultima_intervencao AS (
  SELECT DISTINCT ON (ficha_cilindros_id)
    ficha_cilindros_id,
    motivo,
    cor_corpo,
    cor_refletivo,
    tipo_refletivo,
    quantidade
  FROM ficha_cilindros_intervencoes
  ORDER BY ficha_cilindros_id, data_intervencao DESC
)
SELECT
  inv.id,
  inv.km_inicial,
  inv.km_final,
  CASE
    WHEN ui.motivo = 'Remover' THEN NULL  -- Elemento foi removido
    WHEN ui.motivo = 'Substituir' THEN ui.cor_corpo  -- Usar nova característica
    ELSE inv.cor_corpo  -- Usar característica original
  END AS cor_corpo_atual,
  CASE
    WHEN ui.motivo = 'Remover' THEN NULL
    WHEN ui.motivo = 'Substituir' THEN ui.cor_refletivo
    ELSE inv.cor_refletivo
  END AS cor_refletivo_atual,
  ui.motivo AS ultima_acao
FROM ficha_cilindros inv
LEFT JOIN ultima_intervencao ui ON ui.ficha_cilindros_id = inv.id
WHERE inv.lote_id = '<lote_id>'
  AND inv.rodovia_id = '<rodovia_id>'
  AND (ui.motivo IS NULL OR ui.motivo != 'Remover')  -- Excluir removidos
ORDER BY inv.km_inicial;
```

### 5. Elementos Implantados (não estavam no cadastro)

```sql
-- Novos elementos implantados via intervenção
SELECT
  int.*,
  'IMPLANTADO' AS origem
FROM ficha_tachas_intervencoes int
WHERE int.motivo = 'Implantar'
  AND NOT EXISTS (
    SELECT 1 FROM ficha_tachas inv
    WHERE inv.id = int.ficha_tachas_id
  );
```

### 6. Auditoria: Elementos Modificados

```sql
-- Defensas que foram modificadas
SELECT
  def.id,
  def.km_inicial,
  COUNT(int.id) AS qtde_intervencoes,
  MAX(int.data_intervencao) AS ultima_intervencao,
  ARRAY_AGG(int.motivo ORDER BY int.data_intervencao) AS historico_motivos
FROM defensas def
INNER JOIN defensas_intervencoes int ON int.defensa_id = def.id
WHERE def.lote_id = '<lote_id>'
  AND def.rodovia_id = '<rodovia_id>'
GROUP BY def.id, def.km_inicial
HAVING COUNT(int.id) > 0
ORDER BY def.km_inicial;
```

---

## 📝 Apêndice: Migrations Aplicadas

### Ordem Cronológica das Migrations de Unificação

| Data                | Migration ID                           | Tipo                     | Alterações                                                                                                                                                 |
| ------------------- | -------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-10-13 20:01:52 | `631149df-c5d0-4e2f-9e80-38dd57fdb7ca` | **Tachas**               | Removidos `descricao`, `observacao`, `foto_url` do inventário; Adicionados em intervenções                                                                 |
| 2025-10-13 20:14:15 | `0655039d-13e5-4e31-976e-f74a84c1a0ab` | **Cilindros**            | Removidos `foto_url`, `observacao` do inventário; Adicionados em intervenções                                                                              |
| 2025-10-13 20:18:51 | `5770d306-c9b5-4c34-a48e-a6cf07afacef` | **Inscrições**           | Removidos `estado_conservacao`, `foto_url` do inventário; Adicionados em intervenções (+ `observacao`)                                                     |
| 2025-10-13 20:35:17 | `d1e2815f-c0eb-4d8d-ac2d-1d93c02f8d19` | **Defensas**             | Removidos `estado_conservacao`, `tipo_avaria`, `necessita_intervencao`, `nivel_risco`, `observacao`, `foto_url` do inventário; Adicionados em intervenções |
| 2025-10-13 20:43:39 | `b0af324f-ac66-4243-a495-da2b8f1e5b0c` | **Marcas Longitudinais** | Removidos `estado_conservacao`, `foto_url`, `observacao` do inventário; Adicionados em intervenções                                                        |

### Padrão das Migrations

Todas as migrations seguiram o padrão:

```sql
-- 1. Adicionar campos na tabela de intervenções
ALTER TABLE <tabela_intervencoes>
ADD COLUMN IF NOT EXISTS <campo> <tipo>;

-- 2. Remover campos da tabela de inventário
ALTER TABLE <tabela_inventario>
DROP COLUMN IF EXISTS <campo>;
```

### Checklist de Verificação Pós-Migration

Para cada tipo unificado, verificar:

- [ ] Campos removidos do inventário
- [ ] Campos adicionados às intervenções
- [ ] Formulários de cadastro atualizados (não mostram campos de condição)
- [ ] Formulários de intervenção atualizados (capturam campos de condição)
- [ ] Viewers atualizados (mostram histórico em vez de condição atual)
- [ ] Queries de relatório ajustadas (JOIN com intervenções)
- [ ] Importação de Excel atualizada (não espera campos de condição)
- [ ] Limpeza de fotos órfãs ajustada (não procura no inventário)

---

## 🎓 Glossário de Termos

**Inventário Estático**: Cadastro original dos elementos da rodovia (foto do passado)

**Inventário Dinâmico**: Estado real atual da rodovia após aplicar intervenções executadas

**Necessidade**: Intervenção planejada (ainda não executada)

**Intervenção**: Registro de execução de uma ação sobre um elemento

**Match GPS**: Associação automática entre necessidade e cadastro usando coordenadas geográficas

**Unificação**: Processo de mover campos de condição/estado do inventário para intervenções

**Campos de Condição**: Campos que descrevem estado atual (ex: estado_conservacao, observacao, foto_url)

**Campos de Características**: Campos que descrevem propriedades físicas permanentes (ex: tipo, cor, dimensões)

---

## 📌 Notas Finais

Este documento é a **fonte da verdade** para a estrutura de dados do BR-LEGAL 2.

**Mantenha este documento atualizado** sempre que:

- Adicionar novos campos
- Criar novos tipos de serviço
- Modificar a estrutura de dados
- Aplicar novas migrations

**Versão**: 1.0
**Data de Criação**: 13 de Outubro de 2025
**Última Atualização**: 13 de Outubro de 2025
