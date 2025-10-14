import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

type TipoElemento = 
  | 'marcas_longitudinais'
  | 'placas'
  | 'tachas'
  | 'inscricoes'
  | 'cilindros'
  | 'porticos'
  | 'defensas';

const mapTipoParaTabela = (tipo: TipoElemento): string => {
  const map: Record<TipoElemento, string> = {
    marcas_longitudinais: 'ficha_marcas_longitudinais',
    placas: 'ficha_placa',
    tachas: 'ficha_tachas',
    inscricoes: 'ficha_inscricoes',
    cilindros: 'ficha_cilindros',
    porticos: 'ficha_porticos',
    defensas: 'defensas'
  };
  return map[tipo];
};

const extractIdColumnName = (tabela: string): string => {
  if (tabela === 'defensas') return 'defensa_id';
  if (tabela === 'ficha_placa') return 'ficha_placa_id';
  return `${tabela}_id`;
};

const mapTipoElementoParaTipoNC = (tipo: TipoElemento): string => {
  if (tipo === 'marcas_longitudinais' || tipo === 'tachas' || tipo === 'inscricoes') {
    return 'Sinalização Horizontal';
  }
  if (tipo === 'placas' || tipo === 'porticos') {
    return 'Sinalização Vertical';
  }
  return 'Dispositivos de Segurança';
};

export async function aprovarElemento(elementoId: string, observacao?: string) {
  try {
    // 1. Buscar elemento pendente
    const { data: elemento, error: fetchError } = await supabase
      .from('elementos_pendentes_aprovacao')
      .select('*')
      .eq('id', elementoId)
      .single();

    if (fetchError) throw fetchError;
    if (!elemento) throw new Error('Elemento não encontrado');

    const tabela = mapTipoParaTabela(elemento.tipo_elemento as TipoElemento);
    
    // 2. Preparar dados para inserção
    const dadosElemento = elemento.dados_elemento as any;
    
    // Remover campos que não existem na tabela de destino
    const { 
      codigo_placa, 
      km_referencia, 
      motivo,
      data_intervencao,
      placa_recuperada,
      fora_plano_manutencao,
      justificativa_fora_plano,
      ...dadosLimpos 
    } = dadosElemento;

    const dadosInventario: any = {
      ...dadosLimpos,
      user_id: elemento.user_id,
      lote_id: elemento.lote_id,
      rodovia_id: elemento.rodovia_id,
      origem: 'necessidade_campo',
      // Mapear campos específicos de placas
      ...(elemento.tipo_elemento === 'placas' && codigo_placa ? { codigo: codigo_placa } : {}),
      ...(elemento.tipo_elemento === 'placas' && km_referencia ? { km: parseFloat(km_referencia) } : {}),
      data_vistoria: new Date().toISOString().split('T')[0]
    };

    // 3. Criar no inventário apropriado usando query builder dinâmica
    const { data: novoItem, error: insertError } = await supabase
      .from(tabela as any)
      .insert(dadosInventario)
      .select()
      .single();

    if (insertError) throw insertError;
    if (!novoItem) throw new Error('Falha ao criar item no inventário');

    // 4. Criar intervenção vinculada
    const idColumnName = extractIdColumnName(tabela);
    const intervencaoData: any = {
      [idColumnName]: (novoItem as any).id,
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: 'Inclusão por Necessidade de Campo',
      fora_plano_manutencao: true,
      justificativa_fora_plano: elemento.justificativa
    };

    const { error: intervencaoError } = await supabase
      .from(`${tabela}_intervencoes` as any)
      .insert(intervencaoData);

    if (intervencaoError) throw intervencaoError;

    // 5. Atualizar status com coordenador_id
    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from('elementos_pendentes_aprovacao')
      .update({ 
        status: 'aprovado',
        coordenador_id: user?.id,
        data_decisao: new Date().toISOString(),
        observacao_coordenador: observacao || null
      })
      .eq('id', elementoId);

    if (updateError) throw updateError;

    toast.success('Elemento aprovado e adicionado ao inventário dinâmico');
    
    // Invalidar cache para atualizar automaticamente
    queryClient.invalidateQueries({ queryKey: ['elementos-pendentes'] });
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao aprovar elemento:', error);
    toast.error(`Erro ao aprovar elemento: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function rejeitarElemento(elementoId: string, observacao: string) {
  try {
    if (!observacao || observacao.trim() === '') {
      throw new Error('Observação é obrigatória para rejeição');
    }

    // 1. Buscar elemento pendente
    const { data: elemento, error: fetchError } = await supabase
      .from('elementos_pendentes_aprovacao')
      .select('*')
      .eq('id', elementoId)
      .single();

    if (fetchError) throw fetchError;
    if (!elemento) throw new Error('Elemento não encontrado');

    // 2. Atualizar status
    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from('elementos_pendentes_aprovacao')
      .update({
        status: 'rejeitado',
        coordenador_id: user?.id,
        observacao_coordenador: observacao,
        data_decisao: new Date().toISOString()
      })
      .eq('id', elementoId);

    if (updateError) throw updateError;

    // 3. Criar NC automaticamente
    const tipoNC = mapTipoElementoParaTipoNC(elemento.tipo_elemento as TipoElemento);
    
    // Gerar número de NC
    const { data: ncNumber } = await supabase.rpc('generate_nc_number');
    
    const dadosElemento = elemento.dados_elemento as any;
    const ncData: any = {
      numero_registro: ncNumber,
      user_id: elemento.user_id,
      rodovia_id: elemento.rodovia_id,
      lote_id: elemento.lote_id,
      tipo: tipoNC,
      problema: 'Item Implantado Fora do Projeto',
      descricao: `Elemento não cadastrado rejeitado pelo coordenador.\n\nJustificativa do técnico: ${elemento.justificativa}\n\nMotivo da rejeição: ${observacao}`,
      situacao: 'Não Atendida',
      km: dadosElemento?.km || dadosElemento?.km_inicial || null,
      latitude: dadosElemento?.latitude || dadosElemento?.latitude_inicial || null,
      longitude: dadosElemento?.longitude || dadosElemento?.longitude_inicial || null
    };

    const { error: ncError } = await supabase
      .from('registro_nc')
      .insert(ncData as any);

    if (ncError) throw ncError;

    // 4. Enviar email notificando a NC
    try {
      await supabase.functions.invoke('send-nc-notification', {
        body: {
          ncId: ncNumber,
          tipo: tipoNC,
          problema: 'Item Implantado Fora do Projeto',
          descricao: `Elemento rejeitado: ${observacao}`
        }
      });
    } catch (emailError) {
      console.error('Erro ao enviar email de NC:', emailError);
      // Não falha a operação se o email não for enviado
    }

    toast.success('Elemento rejeitado e NC criada automaticamente');
    
    // Invalidar cache para atualizar automaticamente
    queryClient.invalidateQueries({ queryKey: ['elementos-pendentes'] });
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao rejeitar elemento:', error);
    toast.error(`Erro ao rejeitar elemento: ${error.message}`);
    return { success: false, error: error.message };
  }
}
