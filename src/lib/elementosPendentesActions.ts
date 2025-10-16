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
    
    // Remover TODOS os campos que não existem nas tabelas de inventário
    const { 
      // Campos de intervenção que não vão para inventário
      codigo_placa, 
      km_referencia, 
      motivo,
      data_intervencao,
      placa_recuperada,
      fora_plano_manutencao,
      justificativa_fora_plano,
      
      // Campos de formulário que não existem nas tabelas
      pelicula,        // Será mapeado para tipo_pelicula_fundo
      retro_fundo,     // Será mapeado para retro_pelicula_fundo (se vier dos forms antigos)
      retro_orla_legenda, // Será mapeado para retro_pelicula_legenda_orla (se vier dos forms antigos)
      tipo_placa,      // Usado apenas para filtro, não existe na tabela
      
      ...dadosLimpos 
    } = dadosElemento;

    const dadosInventario: any = {
      ...dadosLimpos,
      user_id: elemento.user_id,
      lote_id: elemento.lote_id,
      rodovia_id: elemento.rodovia_id,
      origem: 'necessidade_campo',
      data_vistoria: new Date().toISOString().split('T')[0], // TODOS usam data_vistoria
      
      // Mapeamentos específicos de placas
      ...(elemento.tipo_elemento === 'placas' && codigo_placa ? { codigo: codigo_placa } : {}),
      ...(elemento.tipo_elemento === 'placas' && km_referencia ? { km: parseFloat(km_referencia) } : {}),
      // Mapear nomes antigos para os corretos (suporte a dados antigos)
      ...(elemento.tipo_elemento === 'placas' && pelicula ? { tipo_pelicula_fundo: pelicula } : {}),
      ...(elemento.tipo_elemento === 'placas' && retro_fundo ? { retro_pelicula_fundo: parseFloat(String(retro_fundo)) } : {}),
      ...(elemento.tipo_elemento === 'placas' && retro_orla_legenda ? { retro_pelicula_legenda_orla: parseFloat(String(retro_orla_legenda)) } : {}),
      ...(elemento.tipo_elemento === 'placas' && pelicula ? { tipo_pelicula_fundo: pelicula } : {}),
    };

    // Validar campos obrigatórios por tipo
    const camposObrigatorios: Record<string, string[]> = {
      defensas: ['tipo_defensa', 'lado', 'km_inicial', 'km_final', 'extensao_metros'],
      placas: ['codigo'],
      tachas: ['km_inicial', 'km_final', 'quantidade'],
      marcas_longitudinais: ['km_inicial', 'km_final'],
      cilindros: ['cor_corpo', 'km_inicial', 'km_final'],
      porticos: ['tipo'],
      inscricoes: ['tipo_inscricao', 'cor']
    };

    const obrigatorios = camposObrigatorios[elemento.tipo_elemento] || [];
    const faltando = obrigatorios.filter(campo => !dadosInventario[campo]);

    if (faltando.length > 0) {
      console.error('❌ Campos obrigatórios faltando:', faltando);
      throw new Error(`Campos obrigatórios faltando para ${elemento.tipo_elemento}: ${faltando.join(', ')}`);
    }

    console.log('📝 APROVAÇÃO - Detalhes:');
    console.log('  Tipo:', elemento.tipo_elemento);
    console.log('  Tabela destino:', tabela);
    console.log('  Dados originais:', JSON.stringify(dadosElemento, null, 2));
    console.log('  Dados limpos:', JSON.stringify(dadosInventario, null, 2));
    console.log('  Campos enviados:', Object.keys(dadosInventario));

    // 3. Criar no inventário apropriado usando query builder dinâmica
    const { data: novoItem, error: insertError } = await supabase
      .from(tabela as any)
      .insert(dadosInventario)
      .select()
      .single();

    if (insertError) {
      console.error('❌ ERRO na inserção:', insertError);
      console.error('   Detalhes:', insertError.details);
      console.error('   Hint:', insertError.hint);
      console.error('   Dados tentados:', JSON.stringify(dadosInventario, null, 2));
      throw new Error(`Falha ao inserir em ${tabela}: ${insertError.message}`);
    }
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
    queryClient.invalidateQueries({ queryKey: ['contador-elementos-pendentes'] });
    
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
    
    if (!ncNumber) {
      throw new Error('Erro ao gerar número da NC');
    }
    
    const dadosElemento = elemento.dados_elemento as any;
    
    const getTipoLabel = (tipo: string): string => {
      const labels: Record<string, string> = {
        marcas_longitudinais: 'Marcas Longitudinais',
        placas: 'Placas',
        tachas: 'Tachas',
        inscricoes: 'Inscrições',
        cilindros: 'Cilindros',
        porticos: 'Pórticos',
        defensas: 'Defensas'
      };
      return labels[tipo] || tipo;
    };
    
    const ncData: any = {
      numero_nc: ncNumber,
      user_id: elemento.user_id,
      rodovia_id: elemento.rodovia_id,
      lote_id: elemento.lote_id,
      tipo_nc: tipoNC,
      problema_identificado: 'Item Implantado Fora do Projeto',
      descricao_problema: `Elemento não cadastrado rejeitado pelo coordenador.\n\n` +
                           `Tipo: ${getTipoLabel(elemento.tipo_elemento)}\n` +
                           `Justificativa do técnico: ${elemento.justificativa}\n\n` +
                           `Motivo da rejeição: ${observacao}`,
      situacao: 'Não Atendida',
      empresa: 'A definir',
      data_ocorrencia: new Date().toISOString().split('T')[0],
      km_referencia: dadosElemento?.km || dadosElemento?.km_inicial || null,
      latitude: dadosElemento?.latitude || dadosElemento?.latitude_inicial || null,
      longitude: dadosElemento?.longitude || dadosElemento?.longitude_inicial || null,
      observacao: `Rejeitado em ${new Date().toLocaleDateString('pt-BR')} - Coordenador`
    };

    const { data: ncCreated, error: ncError } = await supabase
      .from('nao_conformidades')
      .insert(ncData as any)
      .select()
      .single();

    if (ncError || !ncCreated) {
      console.error('Erro ao criar NC:', ncError);
      throw new Error('Erro ao criar NC: ' + (ncError?.message || 'NC não retornada'));
    }

    // 4. Criar notificação in-app para o técnico
    const { error: notifError } = await supabase
      .from('notificacoes')
      .insert({
        user_id: elemento.user_id,
        tipo: 'elemento_rejeitado',
        titulo: '❌ Elemento Rejeitado',
        mensagem: `Seu elemento ${getTipoLabel(elemento.tipo_elemento)} foi rejeitado. Uma NC foi criada automaticamente: ${ncNumber}. Motivo: ${observacao}`,
        elemento_pendente_id: elementoId,
        nc_id: ncCreated.id
      });

    if (notifError) {
      console.error('Erro ao criar notificação in-app:', notifError);
    }

    // 5. Tentar enviar notificação por email (não bloqueia se falhar)
    try {
      const { error: emailError } = await supabase.functions.invoke('send-nc-notification', {
        body: {
          nc_id: ncCreated.id, // ✅ Agora passa o UUID correto
          pdf_base64: ''
        }
      });
      
      if (emailError) {
        console.error('Erro ao enviar email de notificação:', emailError);
      } else {
        console.log('✅ Email de notificação enviado com sucesso');
      }
    } catch (emailError) {
      console.error('Erro ao invocar função de email:', emailError);
    }

    toast.success('Elemento rejeitado e NC criada automaticamente');
    
    // Invalidar cache para atualizar automaticamente
    queryClient.invalidateQueries({ queryKey: ['elementos-pendentes'] });
    queryClient.invalidateQueries({ queryKey: ['contador-elementos-pendentes'] });
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao rejeitar elemento:', error);
    toast.error(`Erro ao rejeitar elemento: ${error.message}`);
    return { success: false, error: error.message };
  }
}
