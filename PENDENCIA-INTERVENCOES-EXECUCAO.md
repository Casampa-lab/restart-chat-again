# ⚠️ PENDÊNCIA: Intervenções de Execução

## 🔴 Status: CORREÇÃO EMERGENCIAL APLICADA

**Data:** 27/10/2025  
**Motivo:** Evitar erros de salvamento em Inscrições e Tachas

---

## 📝 O que foi feito?

1. ✅ Tornamos `ficha_inscricoes_id` e `ficha_tachas_id` **opcionais** (nullable)
2. ✅ Adicionamos `user_id`, `lote_id`, `rodovia_id` nas tabelas de intervenções
3. ✅ Ajustamos RLS para permitir INSERT sem FK quando o usuário for dono

---

## 🚨 O que PRECISA ser feito depois?

Quando começar a registrar intervenções de **Execução de Projeto**, será necessário:

### **1. Ajustar formulários**
- `src/components/IntervencoesInscricoesForm.tsx`
- `src/components/IntervencoesTachaForm.tsx`

**Mudanças necessárias:**
- Adicionar campos `user_id`, `lote_id`, `rodovia_id` no INSERT
- Remover validação que exige `inscricaoSelecionada`/`tachaSelecionada` para modo "execucao"
- Manter validação apenas para "manutencao_pre_projeto"

### **2. Adicionar lógica de sessão de trabalho**
Os formulários devem pegar `lote_id` e `rodovia_id` da sessão ativa do usuário:

```typescript
// Buscar sessão ativa
const { data: sessao } = await supabase
  .from('sessoes_trabalho')
  .select('lote_id, rodovia_id')
  .eq('user_id', user.id)
  .eq('ativa', true)
  .single();

// Usar no INSERT
const { error } = await supabase
  .from("ficha_inscricoes_intervencoes")
  .insert({
    user_id: user.id,
    lote_id: sessao.lote_id,
    rodovia_id: sessao.rodovia_id,
    // ... resto dos campos
  });
```

### **3. Validar tipo_origem**
Garantir que:
- `tipo_origem = 'execucao'` → FK é NULL
- `tipo_origem = 'manutencao_pre_projeto'` → FK é obrigatório

---

## 📌 Checklist de Implementação Futura

- [ ] Remover validação de `inscricaoSelecionada` obrigatório em modo execução
- [ ] Adicionar `user_id`, `lote_id`, `rodovia_id` nos INSERTs
- [ ] Buscar dados da sessão ativa antes de salvar
- [ ] Testar fluxo completo de execução sem FK
- [ ] Adicionar constraint CHECK para validar FK conforme `tipo_origem`
- [ ] Atualizar documentação do sistema

---

## 🔗 Arquivos Relacionados

- `src/components/IntervencoesInscricoesForm.tsx` (linha 166-186)
- `src/components/IntervencoesTachaForm.tsx` (linha 142-161)
- `src/pages/RegistrarIntervencaoCampo.tsx`
- Tabelas: `ficha_inscricoes_intervencoes`, `ficha_tachas_intervencoes`

---

## 💡 Observação

Esta é uma **correção provisória** para evitar erros. O sistema ainda não está preparado para registrar intervenções de execução de forma completa. Quando esse módulo for ativado, este arquivo deve ser consultado para implementar as mudanças necessárias.
