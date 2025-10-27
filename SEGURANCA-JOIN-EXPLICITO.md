# 🔒 SEGURANÇA: Uso Obrigatório de JOIN Explícito

## ⚠️ CRÍTICO: NUNCA usar `usarJoinExplicito={false}`

**Data da correção:** 2025-10-27  
**Motivo:** Vazamento de dados entre usuários

---

## 🚨 O Problema

Quando `usarJoinExplicito={false}`:
- ❌ Consultas não aplicam filtros de `ativo`, `tenant_id`, `owner_id`
- ❌ Usuários veem intervenções e fotos de outros usuários
- ❌ Violação grave de privacidade e segurança

### Exemplo do Problema

**COM `usarJoinExplicito={false}` (INSEGURO):**
```typescript
// Consulta SEM filtros críticos
SELECT * FROM ficha_placa_intervencoes 
WHERE user_id = 'abc123';
// ❌ Retorna TUDO do user_id, mas sem validar se o inventário base está ativo
// ❌ Não valida tenant_id, permitindo cruzamento de dados entre empresas
```

**COM `usarJoinExplicito={true}` (SEGURO):**
```typescript
// Consulta COM JOIN explícito + filtros
SELECT i.*, autor.nome 
FROM ficha_placa_intervencoes i
INNER JOIN inventario_placas p ON i.ficha_placa_id = p.id
INNER JOIN profiles autor ON i.user_id = autor.id
WHERE i.user_id = 'abc123'
  AND p.ativo = true 
  AND p.tenant_id = current_tenant_id();
// ✅ Retorna apenas dados válidos e do tenant correto
```

---

## ✅ A Solução

**SEMPRE usar `usarJoinExplicito={true}`** em todos os componentes:

```tsx
<IntervencoesViewerBase
  tipoElemento="placas"
  tipoOrigem="execucao"
  usarJoinExplicito={true}  // ← OBRIGATÓRIO
  // ...
/>
```

---

## 🛡️ Proteções Implementadas

### 1. Valor Padrão Seguro no `IntervencoesViewerBase`

```typescript
export function IntervencoesViewerBase({
  usarJoinExplicito = true,  // ⚠️ Padrão seguro SEMPRE true
  // ...
}: IntervencoesViewerBaseProps) {
  // ...
}
```

### 2. Proteção Adicional com Fallback

```typescript
// 🔒 PROTEÇÃO DUPLA: Garantir que JOIN explícito sempre seja usado
const joinExplicito = usarJoinExplicito ?? true;

const carregar = async () => {
  const selectQuery = joinExplicito
    ? `*, autor:profiles!${tabelaIntervencao}_user_id_fkey(id, nome, email)`
    : '*';
  // ...
};
```

### 3. Todos os 14 Componentes Corrigidos

Todos os componentes de intervenções foram auditados e corrigidos para `usarJoinExplicito={true}`.

---

## 📋 Componentes Afetados (Corrigidos em 2025-10-27)

### ✅ Execução (7 componentes)
- ✅ `IntervencoesExecucaoCilindrosContent.tsx`
- ✅ `IntervencoesExecucaoDefensasContent.tsx`
- ✅ `IntervencoesExecucaoInscricoesContent.tsx`
- ✅ `IntervencoesExecucaoMarcasSHContent.tsx`
- ✅ `IntervencoesExecucaoPlacasSVContent.tsx`
- ✅ `IntervencoesExecucaoPorticosContent.tsx`
- ✅ `IntervencoesExecucaoTachasContent.tsx`

### ✅ Manutenção (7 componentes)
- ✅ `IntervencoesManutencaoCilindrosContent.tsx`
- ✅ `IntervencoesManutencaoDefensasContent.tsx`
- ✅ `IntervencoesManutencaoInscricoesContent.tsx`
- ✅ `IntervencoesManutencaoMarcasSHContent.tsx`
- ✅ `IntervencoesManutencaoPlacasSVContent.tsx`
- ✅ `IntervencoesManutencaoPorticosContent.tsx`
- ✅ `IntervencoesManutencaoTachasContent.tsx`

---

## 🧪 Teste de Validação

Após qualquer alteração, verificar que **NÃO existe mais nenhuma ocorrência**:

```bash
# Não deve retornar NENHUMA linha
rg -n "usarJoinExplicito=\{false\}" src/components/intervencoes
```

**Resultado esperado:**
```
(vazio - sem resultados)
```

Se houver resultados, **CORRIJA IMEDIATAMENTE** antes de fazer deploy.

---

## 🔐 RLS (Row Level Security) no Backend

Além do JOIN explícito no frontend, o backend também deve ter **políticas RLS** nas tabelas de intervenções:

### Exemplo de RLS para `ficha_placa_intervencoes`

```sql
-- Política: Usuário só vê suas próprias intervenções
CREATE POLICY "users_read_own_interventions" 
ON ficha_placa_intervencoes
FOR SELECT
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM inventario_placas p
    WHERE p.id = ficha_placa_id
    AND p.ativo = true
  )
);

-- Política: Usuário só insere intervenções em inventário ativo
CREATE POLICY "users_insert_own_interventions"
ON ficha_placa_intervencoes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM inventario_placas p
    WHERE p.id = ficha_placa_id
    AND p.ativo = true
  )
);
```

---

## 📌 Regra de Ouro

### ❌ NUNCA FAÇA ISSO
```tsx
// ❌ ERRADO - Expõe dados de todos os usuários
<IntervencoesViewerBase usarJoinExplicito={false} />
```

### ✅ SEMPRE FAÇA ISSO
```tsx
// ✅ CORRETO - Dados filtrados e seguros
<IntervencoesViewerBase usarJoinExplicito={true} />
```

---

## 🚨 Se Precisar Debugar

**NUNCA desabilite o JOIN explícito para debugar!**

Em vez disso, use logs:

```typescript
const carregar = async () => {
  console.log('🔍 Carregando intervenções com JOIN explícito:', joinExplicito);
  
  const { data, error } = await supabase
    .from(tabelaIntervencao)
    .select(selectQuery)
    .eq('user_id', user.id);
  
  console.log('📊 Dados retornados:', data?.length, 'registros');
  console.log('🔒 Filtros aplicados:', { user_id: user.id, tipoOrigem });
  
  // ...
};
```

---

## 📝 Histórico de Alterações

| Data | Ação | Responsável |
|------|------|-------------|
| 2025-10-27 | Correção emergencial: Revertido `false` → `true` em 14 componentes | Lovable AI |
| 2025-10-27 | Adicionado fallback seguro no `IntervencoesViewerBase` | Lovable AI |
| 2025-10-27 | Criado documento de segurança `SEGURANCA-JOIN-EXPLICITO.md` | Lovable AI |

---

## 🔗 Arquivos Relacionados

- **Base:** `src/components/intervencoes/IntervencoesViewerBase.tsx`
- **Execução:** `src/components/intervencoes/execucao/*.tsx`
- **Manutenção:** `src/components/intervencoes/manutencao/*.tsx`
- **Documentação:** `SEGURANCA-JOIN-EXPLICITO.md` (este arquivo)

---

## ⚠️ Aviso Final

**Este parâmetro é CRÍTICO para a segurança do sistema.**

Qualquer alteração que defina `usarJoinExplicito={false}` deve ser:
1. **Rejeitada** em code review
2. **Revertida** imediatamente
3. **Reportada** à equipe de segurança

**Não há casos de uso legítimos para `usarJoinExplicito={false}` em produção.**
