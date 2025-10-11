# 📋 PLANO: Sistema de CADASTRO (Inventário)

## 🎯 Objetivo
Sistema de gerenciamento de inventário de sinalização viária para rodovias, permitindo cadastro, visualização e importação em massa de diversos tipos de elementos viários.

---

## 📊 Estrutura de Dados Implementada

### 7 Tipos de Inventário

#### 1. **Marcas Longitudinais** (`ficha_marcas_longitudinais`)
Demarcação viária longitudinal (faixas contínuas, tracejadas, etc)
- Localização: km inicial/final, coordenadas GPS
- Características: tipo demarcação, cor, material, largura, espessura, extensão
- Estado: conservação, observações, SNV
- Fotos: foto_url

#### 2. **Tachas** (`ficha_tachas`)
Tachas refletivas para demarcação
- Localização: km inicial/final, coordenadas GPS, espaçamento
- Características: corpo, refletivo, cor, quantidade, local implantação
- Estado: observações, SNV
- Fotos: foto_url

#### 3. **Inscrições** (`ficha_inscricoes`)
Setas, símbolos, legendas pintadas no pavimento
- Localização: km inicial/final, coordenadas GPS
- Características: tipo inscrição, cor, dimensões, área, material
- Estado: conservação, observações
- Fotos: foto_url

#### 4. **Cilindros Delimitadores** (`ficha_cilindros`)
Cilindros/balizadores para delimitação
- Localização: km inicial/final, coordenadas GPS, extensão
- Características: cor corpo, tipo/cor refletivo, quantidade, espaçamento, local implantação
- Estado: observações, SNV
- Fotos: foto_url

#### 5. **Placas** (`ficha_placa`)
Sinalização vertical (placas de trânsito)
- Localização: km, coordenadas GPS, lado, sentido
- Características: código, modelo, tipo, velocidade, descrição
- Dimensões: largura, altura, distância, área
- Material: substrato, suporte, película, seção suporte
- Retrorrefletividade: fundo, orla/legenda
- Dados administrativos: BR, UF, SNV, empresa, contrato, patrimônio, data implantação
- Fotos: múltiplas (identificação, frontal, lateral, posterior, base)
- **Sub-tabelas**:
  - `ficha_placa_danos`: registro de problemas/danos
  - `ficha_placa_intervencoes`: histórico de intervenções

#### 6. **Pórticos** (`ficha_porticos`)
Estruturas suspensas sobre a pista
- Localização: km, coordenadas GPS, lado
- Características: tipo, vão horizontal, altura livre
- Estado: conservação, observações, SNV
- Fotos: foto_url

#### 7. **Defensas** (`defensas`)
Dispositivos de contenção lateral
- Localização: km inicial/final, coordenadas GPS, lado, extensão
- Classificação: tipo, nível contenção (NCHRP350, EN1317), geometria, função
- Características técnicas: quantidade lâminas, comprimento tramo, distâncias, velocidade, VMD, percentual pesados
- Terminais: entrada, saída
- Risco: nível, especificação obstáculo
- Estado: conservação, tipo avaria, necessita intervenção
- Dados administrativos: BR, SNV, tramo, observação
- Fotos: foto_url, link_fotografia
- **Sub-tabelas**:
  - `defensas_intervencoes`: histórico de intervenções

---

## 🔄 Sistema de Importação em Massa

### Componente: `InventarioImporterManager.tsx`

**Funcionalidades**:
- Upload de planilhas Excel (.xlsx, .xlsm)
- Seleção do tipo de inventário
- Parse automático via `excelImport.ts`
- Upload de fotos referenciadas na planilha
- Inserção em lote no banco

**Fluxo**:
1. Usuário seleciona arquivo Excel
2. Sistema identifica colunas automaticamente
3. Para cada linha:
   - Extrai dados conforme mapeamento
   - Se houver fotos referenciadas, faz upload para Supabase Storage
   - Inserta registro no banco
4. Feedback de progresso e erros

**Buckets de Storage**:
- `marcas-longitudinais`
- `tachas`
- `inscricoes`
- `cilindros`
- `placa-photos`
- `porticos`
- `defensas`

---

## 🎨 Interface de Visualização

### Viewers por Tipo

Cada tipo de inventário tem seu viewer dedicado:
- `InventarioMarcasLongitudinaisViewer.tsx`
- `InventarioTachasViewer.tsx`
- `InventarioInscricoesViewer.tsx`
- `InventarioCilindrosViewer.tsx`
- `InventarioPlacasViewer.tsx`
- `InventarioPorticosViewer.tsx`
- `InventarioDefensasViewer.tsx`

**Funcionalidades comuns**:
- Tabela com dados principais
- Filtros por rodovia, lote
- Busca textual
- Ordenação por colunas
- Paginação
- Ações: ver detalhes, editar, excluir
- Modal com detalhes completos
- Visualização de fotos

---

## 🗺️ Hierarquia de Dados

```
Supervisora
  └── Lotes
       └── Rodovias
            └── Inventário
                 ├── Marcas Longitudinais
                 ├── Tachas
                 ├── Inscrições
                 ├── Cilindros
                 ├── Placas
                 ├── Pórticos
                 └── Defensas
```

**Tabelas de suporte**:
- `supervisoras`: empresas supervisoras (multi-tenant)
- `lotes`: agrupamentos de rodovias
- `rodovias`: rodovias individuais (BR-xxx)

---

## 👥 Controle de Acesso (RLS)

### Regras implementadas:

**Usuários comuns**:
- ✅ Visualizam apenas dados que criaram (`user_id = auth.uid()`)
- ✅ Criam, editam e excluem apenas próprios registros

**Coordenadores**:
- ✅ Visualizam todos os dados
- ✅ Acesso via `has_role(auth.uid(), 'coordenador')`

**Administradores**:
- ✅ Acesso total
- ✅ Acesso via `has_role(auth.uid(), 'admin')`

---

## 📱 Páginas de Usuário

Cada usuário acessa suas próprias fichas:
- `/minhas-fichas-placa` - Placas cadastradas
- `/minhas-fichas-verificacao` - Fichas de verificação
- `/minhas-defensas` - Defensas cadastradas
- `/minhas-intervencoes-tachas` - Intervenções em tachas
- `/minhas-intervencoes-inscricoes` - Intervenções em inscrições

---

## 🔐 Sistema de Autenticação

**Implementado**:
- Login/Signup via Supabase Auth
- Profiles em `public.profiles`
- Trigger automático (`handle_new_user`) ao criar usuário
- Código de convite para vincular supervisora
- Roles: `admin`, `coordenador`, `user`

---

## 📂 Estrutura de Código

```
src/
├── components/
│   ├── admin/
│   │   ├── InventarioImporterManager.tsx
│   │   ├── LotesManager.tsx
│   │   ├── RodoviasManager.tsx
│   │   └── SupervisoraManager.tsx
│   │
│   ├── Inventario*Viewer.tsx (7 viewers)
│   ├── FichaPlacaForm.tsx
│   └── DefensasForm.tsx
│
├── pages/
│   ├── Admin.tsx
│   ├── MinhasFichasPlaca.tsx
│   ├── MinhasDefensas.tsx
│   └── Minhas*.tsx (outras páginas de usuário)
│
├── lib/
│   ├── excelImport.ts (parse de planilhas)
│   └── excelExport.ts (geração de relatórios)
│
└── constants/
    ├── planilhas.ts (definição dos tipos)
    └── codigosPlacas.ts (códigos de placas)
```

---

## 📊 Banco de Dados

### Funções auxiliares:
- `has_role(_user_id, _role)` - Verificação de role
- `user_has_module_access(_user_id, _modulo_codigo)` - Controle de acesso a módulos
- `get_user_supervisora_id(_user_id)` - ID da supervisora do usuário
- `generate_codigo_convite()` - Geração de código único

### Tabelas principais:
- 7 tabelas de inventário (listadas acima)
- `profiles` - Dados dos usuários
- `user_roles` - Atribuição de roles
- `supervisoras` - Empresas supervisoras
- `lotes` - Agrupamentos de rodovias
- `rodovias` - Rodovias

---

## ✅ Status Atual

**Implementado e funcionando**:
- ✅ Cadastro manual via formulários
- ✅ Importação em massa via Excel
- ✅ Visualização por tipo
- ✅ Upload e gestão de fotos
- ✅ Controle de acesso (RLS)
- ✅ Multi-tenancy (supervisoras)
- ✅ Autenticação e autorização
- ✅ Gestão administrativa (lotes, rodovias, usuários)

---

## 🔜 Próximas Etapas

Ver **`PLANO-NECESSIDADES.md`** para o sistema de gerenciamento de necessidades de serviços.

---

**Documentação criada em**: 2025-01-XX
**Versão**: 1.0
**Projeto**: BR-LEGAL 2 / Operavia
