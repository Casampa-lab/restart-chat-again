import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Contadores {
  cadastro_inicial_ativo: number;
  criados_necessidade_ativo: number;
  total_ativo: number;
  cadastro_inicial_inativo: number;
  total_inativo: number;
  total_geral: number;
}

export function useInventarioContadores(
  tabela: string,
  loteId?: string,
  rodoviaId?: string
) {
  const [contadores, setContadores] = useState<Contadores>({
    cadastro_inicial_ativo: 0,
    criados_necessidade_ativo: 0,
    total_ativo: 0,
    cadastro_inicial_inativo: 0,
    total_inativo: 0,
    total_geral: 0,
  });
  const [marcoZeroExiste, setMarcoZeroExiste] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loteId && rodoviaId) {
      carregarContadores();
      verificarMarcoZero();
    }
  }, [loteId, rodoviaId, tabela]);

  const verificarMarcoZero = async () => {
    if (!loteId || !rodoviaId) return;
    const { data } = await supabase
      .from('marcos_inventario')
      .select('*')
      .eq('lote_id', loteId)
      .eq('rodovia_id', rodoviaId)
      .eq('tipo', 'marco_zero')
      .maybeSingle();
    setMarcoZeroExiste(!!data);
  };

  const carregarContadores = async () => {
    setLoading(true);
    try {
      // Cadastro inicial ativo
      const { count: cadastroAtivo } = await supabase
        .from(tabela as any)
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId)
        .eq('origem', 'cadastro_inicial')
        .eq('ativo', true);

      // Criados por necessidade ativos
      const { count: necessidadeAtivo } = await supabase
        .from(tabela as any)
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId)
        .eq('origem', 'necessidade')
        .eq('ativo', true);

      // Total ativo
      const { count: totalAtivo } = await supabase
        .from(tabela as any)
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId)
        .eq('ativo', true);

      // Cadastro inicial inativo (substituídos)
      const { count: cadastroInativo } = await supabase
        .from(tabela as any)
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId)
        .eq('origem', 'cadastro_inicial')
        .eq('ativo', false);

      // Total inativo
      const { count: totalInativo } = await supabase
        .from(tabela as any)
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId)
        .eq('ativo', false);

      // Total geral
      const { count: totalGeral } = await supabase
        .from(tabela as any)
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId);

      setContadores({
        cadastro_inicial_ativo: cadastroAtivo || 0,
        criados_necessidade_ativo: necessidadeAtivo || 0,
        total_ativo: totalAtivo || 0,
        cadastro_inicial_inativo: cadastroInativo || 0,
        total_inativo: totalInativo || 0,
        total_geral: totalGeral || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return { contadores, marcoZeroExiste, loading, refetch: carregarContadores };
}
