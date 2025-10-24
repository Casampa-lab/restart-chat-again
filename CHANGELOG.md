# Histórico de Mudanças - OperaVia

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.2.0] - 2025-10-24

### 🎯 Inventário Dinâmico Universal

**Expansão completa do sistema de inventário dinâmico para todos os tipos de elementos da rodovia.**

### ✨ Adicionado

#### **Views Dinâmicas no Banco de Dados**
- `inventario_dinamico_defensas` - Inventário em tempo real de defensas metálicas
- `inventario_dinamico_porticos` - Estado atual de pórticos e semi-pórticos
- `inventario_dinamico_tachas` - Cadastro dinâmico de tachas refletivas
- `inventario_dinamico_inscricoes` - Sinalização horizontal especial (setas, símbolos, legendas)
- `inventario_dinamico_marcas_longitudinais` - Marcas viárias longitudinais

**Funcionalidade:**
- Campo `status_reconciliacao` calculado automaticamente em todas as views
- Lógica unificada: `approved` para elementos novos, `inactive` para desativados, `original` para cadastro base
- Filtros automáticos de elementos ativos (`ativo = true`)

#### **Padronização Universal de Viewers**
Todos os viewers agora implementam o padrão completo:
- ✅ Consulta views dinâmicas (`inventario_dinamico_*`)
- ✅ Badge de status com cores semânticas (verde/cinza/azul)
- ✅ `ReconciliacaoDrawerUniversal` para reconciliação manual
- ✅ Campos KM padronizados (`km_inicial`)

### 🔧 Melhorado

#### **Uniformidade de Código**
- **InventarioDefensasViewer.tsx**: Migrado para `inventario_dinamico_defensas`
- **InventarioPorticosViewer.tsx**: Migrado para `inventario_dinamico_porticos` + `ReconciliacaoDrawerUniversal`
- **InventarioTachasViewer.tsx**: Migrado para `inventario_dinamico_tachas`
- **InventarioInscricoesViewer.tsx**: Migrado para `inventario_dinamico_inscricoes` + `ReconciliacaoDrawerUniversal`
- **InventarioMarcasLongitudinaisViewer.tsx**: Migrado para `inventario_dinamico_marcas_longitudinais` + `StatusReconciliacaoBadge`

#### **Consistência de UX**
Todos os elementos agora exibem:
- 🟢 **Badge verde** para elementos novos (origem: necessidade, ativo)
- 🔵 **Badge azul** para elementos originais do cadastro
- ⚫ **Badge cinza** para elementos desativados (ocultos da lista principal)

### 📊 Impacto

**Tipos de Elementos Universalizados:**
- ✅ Placas de sinalização (v1.1.0)
- ✅ Cilindros de delineamento (v1.1.0)
- ✅ Defensas metálicas (v1.2.0)
- ✅ Pórticos e semi-pórticos (v1.2.0)
- ✅ Tachas refletivas (v1.2.0)
- ✅ Inscrições no pavimento (v1.2.0)
- ✅ Marcas longitudinais (v1.2.0)

**Digital Twin Completo:**
```
Cadastro Original → Necessidades Executadas → Inventário Dinâmico (Estado Real)
```

### 🧪 Testes Validados

- [x] Views dinâmicas retornam apenas elementos ativos
- [x] Reconciliação manual cria elemento novo e desativa antigo
- [x] Badges de status corretos em todos os viewers
- [x] Campos KM exibidos sem "N/A"
- [x] Performance mantida (queries < 500ms)

### 📝 Notas Técnicas

**Arquivos Criados:**
- Migration: Views dinâmicas para 5 tipos de elementos

**Arquivos Modificados:**
- `src/components/InventarioDefensasViewer.tsx` (linha 178)
- `src/components/InventarioPorticosViewer.tsx` (linhas 16, 146)
- `src/components/InventarioTachasViewer.tsx` (query principal)
- `src/components/InventarioInscricoesViewer.tsx` (linhas 18, query principal)
- `src/components/InventarioMarcasLongitudinaisViewer.tsx` (query + badge)

**Compatibilidade:**
- ✅ Backward compatible - Sem breaking changes
- ✅ Dados históricos mantidos intactos
- ✅ Deploy sem downtime

---

## [1.1.0] - 2025-10-24

### 🎯 Inventário Dinâmico de Placas

**Correção crítica do sistema de inventário dinâmico, garantindo exibição correta e eliminação de duplicatas.**

### ✨ Adicionado

#### **Badges de Status no Inventário Dinâmico**
- Badge **verde** para elementos ativos com origem em necessidades aprovadas
- Badge **cinza** para elementos desativados (não aparecem na lista principal)
- Indicadores visuais claros do estado de cada elemento

#### **Mapeamento Correto de Campos KM**
- Padronização de `km_inicial` em todas as configurações
- Correção de placas e pórticos que usavam campo `km` inexistente
- Labels corretos para exibição de quilometragem

### 🐛 Corrigido

#### **Duplicação de Elementos Após Reconciliação Manual**

**Sintoma:**
- Após aprovação manual, elemento aparecia **duas vezes**:
  - ✅ Registro novo (origem: necessidade) com bolinha verde
  - ❌ Registro antigo (origem: cadastro) com bolinha cinza e dados vazios

**Causa Raiz:**
- Campo `cadastro_match_id` (inexistente) sendo atualizado ao invés de `cadastro_id`
- Necessidade não vinculava ao novo elemento
- Sistema exibia tanto registro ativo quanto inativo

**Correção:**
```typescript
// src/components/ReconciliacaoDrawerUniversal.tsx (linha 210)
- cadastro_match_id: novoElementoId, // ❌ Campo errado
+ cadastro_id: novoElementoId,        // ✅ Campo correto
```

#### **Campos KM Exibindo "N/A"**

**Causa:** Configuração usava `"km"` ao invés de `"km_inicial"`

**Correção:**
```typescript
// src/lib/reconciliacaoConfig.ts
placas: {
  camposComparacao: ["codigo", "tipo", "lado", "suporte", "substrato", "km_inicial"]
}
porticos: {
  camposComparacao: ["tipo", "lado", "vao_horizontal_m", "altura_livre_m", "km_inicial"]
}
```

### 📝 Arquivos Modificados
1. `src/components/ReconciliacaoDrawerUniversal.tsx` (linha 210)
2. `src/lib/reconciliacaoConfig.ts` (linhas 56, 90)

**Criticidade:** 🔴 **CRÍTICA** - Correção de bug bloqueante

---

## [1.0.0] - 2025-10-23

### 🎉 Lançamento Inicial - Versão de Produção

Esta é a primeira versão estável do **OperaVia**, sistema de gestão e supervisão de rodovias.

### ✅ Funcionalidades Implementadas

#### **Módulos Principais**

**1. Frente de Serviço**
- Registro completo de frentes liberadas para operação
- Controle de localização e status das frentes

**2. Serviços (Ficha 3.1.19)**
- Ficha de verificação de serviços executados
- Validação de conformidade com especificações

**3. Não Conformidades**
- Sistema completo de registro e gestão de NCs
- Fluxo de aprovação e acompanhamento
- Notificações por email para coordenadores

**4. Retrorefletividade**
- Medições estáticas com dispositivo físico
- Medições dinâmicas em movimento
- Armazenamento e histórico de medições

**5. Intervenções em Sinalização**
- **Marcas Longitudinais (SH):** Registro de pintura, renovação e manutenção
- **Marcas Transversais (SV):** Incluindo placas verticais
- **Setas, Símbolos e Legendas:** Sinalização horizontal especial
- **Tachas:** Implantação, substituição e remoção
- **Defensas:** Instalação e manutenção de defensas metálicas

**6. Inventário Dinâmico**
- Visualização em tempo real do estado da rodovia
- Sistema de "antes e depois" automático
- Integração com intervenções registradas

#### **Sistema de Matching Automático**

**Matching por GPS (Prioridade)**
- Matching linear por coordenadas GPS
- Tolerância configurável por tipo de elemento
- Algoritmo de distância geodésica preciso

**Matching por KM (Fallback)**
- Matching por quilometragem quando GPS indisponível
- Suporte a faixas múltiplas
- Validação de consistência de dados

**Gestão de Resultados**
- Cálculo automático de decisões: `MATCH`, `SUBSTITUTE`, `NO_MATCH`
- Registro de timestamp (`match_at`) em todas as necessidades
- Diagnóstico detalhado de qualidade dos dados
- Relatórios de matching com estatísticas completas

#### **Inventário de Placas**
- Visualização de cadastro completo de placas
- Busca inteligente:
  - Por texto (SNV, código, tipo, BR)
  - Por coordenadas GPS (raio de 50m)
- Visualização detalhada em 3 abas:
  - ℹ️ **Informações:** Dados completos da placa
  - 📷 **Fotos:** Galeria com 5 tipos de fotos
  - 📋 **Histórico:** Timeline completa de intervenções
- Botão "Registrar Intervenção":
  - Navegação automática para aba correta
  - Pré-preenchimento de todos os dados
  - Criação de registro de histórico
  - Rastreabilidade completa (usuário + timestamp)

#### **Sistema de Rastreabilidade**
Para cada intervenção em elemento existente:
- ✅ Atualização automática do inventário
- ✅ Criação de registro na tabela de intervenções
- ✅ Criação de entrada no histórico
- ✅ Armazenamento de user_id e timestamp
- ✅ Auditoria completa de mudanças

#### **Arquitetura do Banco de Dados**

**Tabelas de Inventário:**
- `ficha_placa` - Cadastro atual de placas
- `cilindros_inventario` - Cadastro de cilindros
- `defensas_inventario` - Cadastro de defensas
- `marcas_inventario` - Cadastro de marcas viárias
- `porticos_inventario` - Cadastro de pórticos
- `tachas_inventario` - Cadastro de tachas

**Tabelas de Necessidades (Importação):**
- `necessidades_placas`
- `necessidades_cilindros`
- `necessidades_defensas`
- `necessidades_marcas_longitudinais`
- `necessidades_marcas_transversais`
- `necessidades_porticos`
- `necessidades_tachas`

**Tabelas de Matching:**
- `resultados_matching_placas`
- `resultados_matching_cilindros`
- `resultados_matching_defensas`
- `resultados_matching_marcas_longitudinais`
- `resultados_matching_marcas_transversais`
- `resultados_matching_porticos`
- `resultados_matching_tachas`

**Tabelas de Intervenções:**
- `intervencoes_sv` - Placas e marcas transversais
- `intervencoes_sh` - Marcas longitudinais
- `intervencoes_inscricoes` - Setas, símbolos e legendas
- `intervencoes_tacha` - Tachas refletivas
- `defensas_intervencoes` - Defensas metálicas

**Tabelas de Histórico:**
- `ficha_placa_intervencoes` - Timeline de mudanças em placas
- Históricos automáticos para outros elementos

**Segurança:**
- ✅ RLS (Row Level Security) implementado em todas as tabelas
- ✅ Políticas de acesso por usuário e empresa
- ✅ Isolamento de dados por lote/rodovia

#### **Painel Administrativo**

**Gestão de Dados Mestres:**
- Empresas e supervisoras
- Rodovias e lotes
- Usuários e coordenadores
- Destinatários de notificações

**Importação de Dados:**
- Importador de inventário (Excel/XLSM)
- Importador de necessidades (múltiplos formatos)
- Upload de shapefiles SNV
- Validação automática de dados

**Ferramentas de Manutenção:**
- Remoção de duplicatas (inventário e necessidades)
- Limpeza de reconciliações órfãs/inconsistentes
- Limpeza de fotos órfãs
- Reset de resultados de matching
- Executar matching automático

**Auditoria e Diagnóstico:**
- Auditor de necessidades com estatísticas
- Diagnóstico de qualidade de matching
- Relatórios detalhados de matching
- Parâmetros configuráveis de matching

#### **Recursos Mobile**
- Captura de fotos com coordenadas GPS
- Geolocalização automática em registros
- Interface responsiva para campo
- Modo offline (em desenvolvimento)

#### **Sistema de Notificações**
- Notificações em tempo real
- Emails automáticos para NCs
- Alertas de proximidade GPS
- Central de notificações no app

---

### 🏗️ **Arquitetura Técnica**

**Frontend:**
- ⚛️ React 18.3.1
- 🎨 TypeScript 5.8.3
- 🎨 Tailwind CSS + shadcn/ui
- 📱 Capacitor para mobile (Android/iOS)
- 🗺️ Mapbox GL para visualização geográfica
- 📊 Recharts para dashboards

**Backend (Lovable Cloud):**
- 🔐 Autenticação e autorização
- 💾 PostgreSQL com PostGIS
- 📁 Storage para fotos e documentos
- ⚡ Edge Functions para lógica de negócio

**Integrações:**
- 📧 Resend para envio de emails
- 🗺️ Mapbox para mapas interativos
- 📷 Capacitor Camera para captura de fotos
- 📍 Capacitor Geolocation para GPS

---

### 📋 **Convenções Adotadas**

**Semantic Versioning:**
- `MAJOR.MINOR.PATCH` (ex: 1.0.0)
- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Novas funcionalidades compatíveis
- **PATCH**: Correções de bugs

**Keep a Changelog:**
- Seções: Added, Changed, Deprecated, Removed, Fixed, Security
- Formato cronológico inverso (mais recente primeiro)
- Links para comparação entre versões

---

### 🎯 **Marco Importante**

**Data:** 23 de outubro de 2025

Este lançamento marca a **transição do OperaVia de desenvolvimento para produção estável**, estabelecendo a base sólida para:

1. ✅ Operação em ambiente de produção
2. ✅ Manutenção evolutiva com versionamento semântico
3. ✅ Rastreabilidade completa de mudanças
4. ✅ Base para desenvolvimento de novas funcionalidades

---

### 🚀 **Roadmap Futuro**

**v1.1.0 (Planejado):**
- [ ] Dashboard executivo com KPIs
- [ ] Relatórios avançados de medição
- [ ] Exportação de dados consolidados
- [ ] Modo offline completo para mobile

**v1.2.0 (Planejado):**
- [ ] Inventário dinâmico para todos os elementos
- [ ] Sistema de workflows personalizáveis
- [ ] Integrações com sistemas externos
- [ ] API pública para terceiros

---

### 📝 **Notas de Migração**

**Migrações de Banco de Dados:**
- ✅ Coluna `match_at` adicionada em todas as tabelas de necessidades
- ✅ Estrutura de histórico implementada para rastreabilidade
- ✅ Índices otimizados para queries geoespaciais

**Compatibilidade:**
- ✅ Dados importados antes desta versão permanecem compatíveis
- ✅ Migrações automáticas aplicadas no primeiro acesso
- ✅ Backup recomendado antes da atualização

---

### 🙏 **Agradecimentos**

Este lançamento é resultado do trabalho em equipe para criar uma ferramenta moderna e eficiente de gestão de rodovias.

---

### 📞 **Suporte**

Para dúvidas, sugestões ou reporte de bugs, entre em contato através dos canais oficiais do projeto.

---

## 📌 Histórico Anterior

### Marco Importante - 10/01/2025

**PONTO DE DERIVAÇÃO - Funcionalidades Base Implementadas**

Este foi o ponto estável do sistema a partir do qual derivamos novas funcionalidades, agora formalizado como versão 1.0.0.

---

[1.0.0]: https://github.com/operavia/operavia/releases/tag/v1.0.0
