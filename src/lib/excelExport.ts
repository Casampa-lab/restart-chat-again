import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Função auxiliar para formatar data
const formatDate = (date: string | null) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
};

// Função auxiliar para formatar número
const formatNumber = (num: number | null) => {
  if (num === null || num === undefined) return '';
  return num.toString().replace('.', ',');
};

// Função auxiliar para aplicar estilo de destaque em células
const aplicarEstiloForaPlano = (ws: XLSX.WorkSheet, rowIndex: number, numCols: number) => {
  for (let col = 0; col < numCols; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
    if (!ws[cellAddress]) continue;
    
    ws[cellAddress].s = {
      fill: {
        fgColor: { rgb: "FFF3CD" } // Amarelo claro
      },
      font: {
        bold: true,
        color: { rgb: "856404" }
      }
    };
  }
};

// Função auxiliar para buscar dados relacionados
const fetchRelatedData = async () => {
  const [{ data: lotes }, { data: empresas }, { data: rodovias }] = await Promise.all([
    supabase.from('lotes').select('id, numero, empresa_id'),
    supabase.from('empresas').select('id, nome'),
    supabase.from('rodovias').select('id, codigo')
  ]);

  return {
    lotesMap: new Map(lotes?.map(l => [l.id, l]) || []),
    empresasMap: new Map(empresas?.map(e => [e.id, e]) || []),
    rodoviasMap: new Map(rodovias?.map(r => [r.id, r]) || [])
  };
};

// Exportar Frentes Liberadas
export const exportFrentesLiberadas = async () => {
  try {
    const { data, error } = await supabase
      .from('frentes_liberadas')
      .select('*')
      .order('data_liberacao', { ascending: false});

    if (error) throw error;

    const { lotesMap, empresasMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['2.2 - FRENTES LIBERADAS PARA EXECUÇÃO'],
      [],
      ['Data', 'Lote', 'Empresa', 'Rodovia', 'Extensão Contratada (km)', 'km Inicial', 'km Final', 'Portaria de Aprovação', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const empresa = lote ? empresasMap.get(lote.empresa_id) : null;
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_liberacao),
          lote?.numero || '',
          empresa?.nome || '',
          rodovia?.codigo || '',
          formatNumber(item.extensao_contratada),
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          item.portaria_aprovacao_projeto || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 30 }, 
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Frentes Liberadas');
    XLSX.writeFile(wb, `Frentes_Liberadas_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar frentes liberadas:', error);
    throw error;
  }
};

// Exportar NCs (Não Conformidades)
export const exportNaoConformidades = async () => {
  try {
    const { data, error } = await supabase
      .from('nao_conformidades')
      .select('*')
      .eq('deleted', false)
      .order('data_ocorrencia', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['2.3 - NÃO CONFORMIDADES'],
      [],
      ['Número NC', 'Data', 'Empresa', 'Lote', 'Rodovia', 'km', 'Tipo', 'Problema', 'Situação', 'Prazo (dias)', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          item.numero_nc || '',
          formatDate(item.data_ocorrencia),
          item.empresa || '',
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_referencia),
          item.tipo_nc || '',
          item.problema_identificado || '',
          item.situacao || '',
          item.prazo_atendimento || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
    ws['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 15 },
      { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Não Conformidades');
    XLSX.writeFile(wb, `Nao_Conformidades_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar NCs:', error);
    throw error;
  }
};

// Exportar Retrorrefletividade Estática - Horizontal
export const exportRetrorrefletividadeEstaticaHorizontal = async () => {
  try {
    const { data, error } = await supabase
      .from('retrorrefletividade_estatica')
      .select('*')
      .eq('tipo_sinalizacao', 'Horizontal')
      .order('data_medicao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.3.1 - RETRORREFLETIVIDADE ESTÁTICA - SINALIZAÇÃO HORIZONTAL'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km', 'Posição', 'Cor', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'Média', 'Valor Mín', 'Situação', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        const itemData = item as any;
        return [
          formatDate(item.data_medicao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_referencia),
          itemData.posicao_horizontal || '',
          itemData.cor_horizontal || '',
          formatNumber(itemData.leitura_horizontal_1),
          formatNumber(itemData.leitura_horizontal_2),
          formatNumber(itemData.leitura_horizontal_3),
          formatNumber(itemData.leitura_horizontal_4),
          formatNumber(itemData.leitura_horizontal_5),
          formatNumber(itemData.leitura_horizontal_6),
          formatNumber(itemData.leitura_horizontal_7),
          formatNumber(itemData.leitura_horizontal_8),
          formatNumber(itemData.leitura_horizontal_9),
          formatNumber(itemData.leitura_horizontal_10),
          formatNumber(itemData.valor_medido_horizontal),
          formatNumber(itemData.valor_minimo_horizontal),
          itemData.situacao_horizontal || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 19 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retro Horizontal');
    XLSX.writeFile(wb, `Retrorrefletividade_Horizontal_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar retrorrefletividade horizontal:', error);
    throw error;
  }
};

// Exportar Retrorrefletividade Estática - Vertical
export const exportRetrorrefletividadeEstaticaVertical = async () => {
  try {
    const { data, error } = await supabase
      .from('retrorrefletividade_estatica')
      .select('*')
      .eq('tipo_sinalizacao', 'Vertical')
      .order('data_medicao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.3.1 - RETRORREFLETIVIDADE ESTÁTICA - SINALIZAÇÃO VERTICAL'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km', 'Lado', 'Dispositivo', 'Código', 'Cor Fundo', 'Valor Fundo', 'Mín Fundo', 'Sit. Fundo', 'Cor Legenda', 'Valor Legenda', 'Mín Legenda', 'Sit. Legenda', 'Situação Geral', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        const itemData = item as any;
        return [
          formatDate(item.data_medicao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_referencia),
          item.lado || '',
          item.tipo_dispositivo || '',
          item.codigo_dispositivo || '',
          itemData.cor_fundo || '',
          formatNumber(item.valor_medido_fundo),
          formatNumber(item.valor_minimo_fundo),
          item.situacao_fundo || '',
          itemData.cor_legenda || '',
          formatNumber(item.valor_medido_legenda),
          formatNumber(item.valor_minimo_legenda),
          item.situacao_legenda || '',
          item.situacao || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 16 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
      { wch: 15 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retro Vertical');
    XLSX.writeFile(wb, `Retrorrefletividade_Vertical_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar retrorrefletividade vertical:', error);
    throw error;
  }
};

// Exportar Retrorrefletividade Dinâmica
export const exportRetrorrefletividadeDinamica = async () => {
  try {
    const { data, error } = await supabase
      .from('retrorrefletividade_dinamica')
      .select('*')
      .order('data_medicao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.3.2 - RETRORREFLETIVIDADE DINÂMICA'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Faixa', 'Tipo', 'Cor', 'Valor Medido', 'Valor Mínimo', 'Situação', 'Velocidade', 'Clima', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_medicao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          item.faixa || '',
          item.tipo_demarcacao || '',
          item.cor || '',
          formatNumber(item.valor_medido),
          formatNumber(item.valor_minimo),
          item.situacao || '',
          item.velocidade_medicao || '',
          item.condicao_climatica || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retro Dinâmica');
    XLSX.writeFile(wb, `Retrorrefletividade_Dinamica_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar retrorrefletividade dinâmica:', error);
    throw error;
  }
};

// Exportar Defensas
export const exportDefensas = async () => {
  try {
    const { data, error } = await supabase
      .from('defensas')
      .select('*')
      .order('data_vistoria', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.4 - INSPEÇÃO DE DEFENSAS'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Extensão (m)', 'Tipo', 'Lado'],
      ...(data || []).map((item: any) => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_vistoria),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          formatNumber(item.extensao_metros),
          item.tipo_defensa || '',
          item.lado || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 20 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defensas');
    XLSX.writeFile(wb, `Defensas_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar defensas:', error);
    throw error;
  }
};

// Exportar Intervenções SH
export const exportIntervencoesSH = async () => {
  try {
    const { data, error } = await supabase
      .from('intervencoes_sh')
      .select('*')
      .order('data_intervencao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.5 - INTERVENÇÕES - SINALIZAÇÃO HORIZONTAL'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Tipo Intervenção', 'Tipo Demarcação', 'Cor', 'Área (m²)', 'Espessura (cm)', 'Material', 'Fora do Plano', 'Justificativa', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_intervencao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          item.tipo_intervencao || '',
          item.tipo_demarcacao || '',
          item.cor || '',
          formatNumber(item.area_m2),
          formatNumber(item.espessura_cm),
          item.material_utilizado || '',
          item.fora_plano_manutencao ? 'SIM' : 'NÃO',
          item.justificativa_fora_plano || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Destacar linhas marcadas como fora do plano
    (data || []).forEach((item, index) => {
      if (item.fora_plano_manutencao) {
        aplicarEstiloForaPlano(ws, index + 3, 14); // +3 por causa do título e cabeçalho
      }
    });
    
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Intervenções SH');
    XLSX.writeFile(wb, `Intervencoes_SH_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar intervenções SH:', error);
    throw error;
  }
};

// Exportar Intervenções Inscrições
export const exportIntervencoesInscricoes = async () => {
  try {
    const { data, error } = await supabase
      .from('intervencoes_inscricoes')
      .select('*')
      .order('data_intervencao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.5 - INTERVENÇÕES - INSCRIÇÕES'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Tipo Intervenção', 'Tipo Inscrição', 'Cor', 'Área (m²)', 'Dimensões', 'Material', 'Fora do Plano', 'Justificativa', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_intervencao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          item.tipo_intervencao || '',
          item.tipo_inscricao || '',
          item.cor || '',
          formatNumber(item.area_m2),
          item.dimensoes || '',
          item.material_utilizado || '',
          item.fora_plano_manutencao ? 'SIM' : 'NÃO',
          item.justificativa_fora_plano || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Destacar linhas marcadas como fora do plano
    (data || []).forEach((item, index) => {
      if (item.fora_plano_manutencao) {
        aplicarEstiloForaPlano(ws, index + 3, 14);
      }
    });
    
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Intervenções Inscrições');
    XLSX.writeFile(wb, `Intervencoes_Inscricoes_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar intervenções inscrições:', error);
    throw error;
  }
};

// Exportar Intervenções SV
export const exportIntervencoesSV = async () => {
  try {
    const { data, error } = await supabase
      .from('intervencoes_sv')
      .select('*')
      .order('data_intervencao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.5 - INTERVENÇÕES - SINALIZAÇÃO VERTICAL'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km', 'Tipo Intervenção', 'Tipo Placa', 'Código', 'Lado', 'Dimensões', 'Material', 'Suporte', 'Estado', 'Qtd', 'Fora do Plano', 'Justificativa', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_intervencao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_referencia),
          item.tipo_intervencao || '',
          item.tipo_placa || '',
          item.codigo_placa || '',
          item.lado || '',
          item.dimensoes || '',
          item.material || '',
          item.tipo_suporte || '',
          item.estado_conservacao || '',
          item.quantidade || '',
          item.fora_plano_manutencao ? 'SIM' : 'NÃO',
          item.justificativa_fora_plano || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Destacar linhas marcadas como fora do plano
    (data || []).forEach((item, index) => {
      if (item.fora_plano_manutencao) {
        aplicarEstiloForaPlano(ws, index + 3, 16);
      }
    });
    
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 },
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 40 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Intervenções SV');
    XLSX.writeFile(wb, `Intervencoes_SV_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar intervenções SV:', error);
    throw error;
  }
};

// Exportar Intervenções Tacha
export const exportIntervencoesTacha = async () => {
  try {
    const { data, error } = await supabase
      .from('intervencoes_tacha')
      .select('*')
      .order('data_intervencao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.5 - INTERVENÇÕES - TACHAS'],
      [],
      ['Data', 'Lote', 'Rodovia', 'KM Inicial', 'KM Final', 'Tipo Intervenção', 'SNV', 'Descrição', 'Corpo', 'Refletivo', 'Cor Refletivo', 'Local', 'Quantidade', 'Espaçamento', 'Fora do Plano', 'Justificativa', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_intervencao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          item.tipo_intervencao || '',
          item.snv || '',
          item.descricao || '',
          item.corpo || '',
          item.refletivo || '',
          item.cor_refletivo || '',
          item.local_implantacao || '',
          item.quantidade || '',
          item.espacamento_m || '',
          item.fora_plano_manutencao ? 'SIM' : 'NÃO',
          item.justificativa_fora_plano || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Destacar linhas marcadas como fora do plano
    (data || []).forEach((item, index) => {
      if (item.fora_plano_manutencao) {
        aplicarEstiloForaPlano(ws, index + 3, 17);
      }
    });
    
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 16 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Intervenções Tacha');
    XLSX.writeFile(wb, `Intervencoes_Tacha_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar intervenções tacha:', error);
    throw error;
  }
};

// Exportar Fichas de Verificação
export const exportFichasVerificacao = async () => {
  try {
    const { data, error } = await supabase
      .from('ficha_verificacao')
      .select('*, itens:ficha_verificacao_itens(count)')
      .order('data_verificacao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.19 - FICHAS DE VERIFICAÇÃO'],
      [],
      ['Data', 'Lote', 'Rodovia', 'Tipo', 'SNV', 'Empresa', 'Contrato', 'Total de Itens'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_verificacao),
          lote?.numero || '',
          rodovia?.codigo || '',
          item.tipo || '',
          item.snv || '',
          item.empresa || '',
          item.contrato || '',
          0 // count of items
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
      { wch: 25 }, { wch: 20 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fichas Verificação');
    XLSX.writeFile(wb, `Fichas_Verificacao_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar fichas de verificação:', error);
    throw error;
  }
};

// Exportar Fichas de Placa
export const exportFichasPlaca = async () => {
  try {
    const { data, error } = await supabase
      .from('ficha_placa')
      .select('*')
      .order('data_vistoria', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.20 - FICHAS DE CADASTRO DE PLACA'],
      [],
      ['Data Vistoria', 'Lote', 'Rodovia', 'km', 'Tipo', 'Código', 'Lado', 'Dimensões', 'Pelicula', 'Substrato', 'Suporte', 'Área (m²)', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_vistoria),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km),
          item.tipo || '',
          item.codigo || '',
          item.lado || '',
          item.dimensoes_mm || '',
          item.tipo_pelicula_fundo || '',
          item.substrato || '',
          item.suporte || '',
          formatNumber(item.area_m2),
          item.descricao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];
    ws['!cols'] = [
      { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 12 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fichas Placa');
    XLSX.writeFile(wb, `Fichas_Placa_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar fichas de placa:', error);
    throw error;
  }
};

// Exportar Registro NC
export const exportRegistroNC = async () => {
  try {
    const { data, error } = await supabase
      .from('registro_nc')
      .select('*, fotos:registro_nc_fotos(count)')
      .order('data_registro', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.18 - REGISTRO DE NÃO CONFORMIDADES'],
      [],
      ['Nº Registro', 'Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Natureza', 'Grau', 'Problema', 'Tipo Obra', 'Construtora', 'Supervisora', 'Fotos'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          item.numero_registro || '',
          formatDate(item.data_registro),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          item.natureza || '',
          item.grau || '',
          item.problema_identificado || '',
          item.tipo_obra || '',
          item.construtora || '',
          item.supervisora || '',
          0 // count of photos
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];
    ws['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
      { wch: 25 }, { wch: 25 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registro NC');
    XLSX.writeFile(wb, `Registro_NC_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar registro NC:', error);
    throw error;
  }
};

// Exportar Dados das Rodovias (2.1)
export const exportDadosRodovias = async () => {
  try {
    // Buscar dados dos lotes com rodovias e empresas
    const { data: lotesRodovias, error } = await supabase
      .from('lotes_rodovias')
      .select(`
        *,
        lotes (
          numero,
          empresas (nome, cnpj)
        ),
        rodovias (codigo, uf)
      `)
      .order('lotes(numero)');

    if (error) throw error;

    if (!lotesRodovias || lotesRodovias.length === 0) {
      throw new Error('Nenhum dado de rodovia encontrado');
    }

    // Preparar dados para o Excel
    const dados = (lotesRodovias || []).map((lr: any) => ({
      lote: lr.lotes?.numero || '',
      empresa: lr.lotes?.empresas?.nome || '',
      rodovia: lr.rodovias?.codigo || '',
      snv: lr.snv || '',
      km_inicial: lr.km_inicial || '',
      km_final: lr.km_final || '',
      extensao: lr.extensao_km || (lr.km_final && lr.km_inicial ? (lr.km_final - lr.km_inicial).toFixed(2) : '')
    }));

    // Pegar dados do primeiro registro para o rodapé
    const primeiraEmpresa = lotesRodovias[0]?.lotes?.empresas?.nome || '';
    const primeiraUF = lotesRodovias[0]?.rodovias?.uf || '';

    const wsData = [
      ['DADOS DAS RODOVIAS'],
      [],
      ['Lote', 'Empresa', 'Rodovia', 'SNV', 'Km inicial', 'Km final', 'Extensão (km)'],
      ...dados.map(d => [
        d.lote,
        d.empresa,
        d.rodovia,
        d.snv,
        formatNumber(d.km_inicial),
        formatNumber(d.km_final),
        formatNumber(d.extensao)
      ]),
      [],
      [],
      [],
      ['EMPRESA:', primeiraEmpresa, '', '', 'OUTUBRO/2017', '', 'VERSÃO 02'],
      ['CONTRATO:', '', '', '', '', '', ''],
      ['UF:', primeiraUF, '', '', '', '', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Definir larguras das colunas
    ws['!cols'] = [
      { wch: 12 },  // Lote
      { wch: 30 },  // Empresa
      { wch: 15 },  // Rodovia
      { wch: 15 },  // SNV
      { wch: 12 },  // Km inicial
      { wch: 12 },  // Km final
      { wch: 15 }   // Extensão
    ];

    // Mesclar célula do título
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }  // Título
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados das Rodovias');
    
    XLSX.writeFile(wb, `2.1_Dados_Rodovias_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar dados das rodovias:', error);
    throw error;
  }
};

// Função auxiliar para gerar link do Google Maps
const gerarLinkGoogleMaps = (lat: number, lng: number): string => {
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

// Função para aplicar estilo customizado
const aplicarEstiloCustom = (ws: XLSX.WorkSheet, rowIndex: number, numCols: number, bgColor: string) => {
  for (let col = 0; col < numCols; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      fill: { fgColor: { rgb: bgColor } }
    };
  }
};

// Mapeamento de tabelas por tipo de elemento
const TABELAS_POR_TIPO: Record<string, {
  necessidades: string;
  cadastro: string;
  campos_chave: string[];
}> = {
  placas: {
    necessidades: 'necessidades_placas',
    cadastro: 'ficha_placa',
    campos_chave: ['codigo', 'tipo', 'km', 'lado', 'latitude', 'longitude']
  },
  marcas_longitudinais: {
    necessidades: 'necessidades_marcas_longitudinais',
    cadastro: 'ficha_marcas_longitudinais',
    campos_chave: ['codigo', 'tipo_demarcacao', 'cor', 'km_inicial', 'km_final', 'latitude_inicial', 'longitude_inicial']
  },
  tachas: {
    necessidades: 'necessidades_tachas',
    cadastro: 'ficha_tachas',
    campos_chave: ['tipo_tacha', 'cor_tacha', 'km_inicial', 'km_final', 'latitude_inicial', 'longitude_inicial']
  },
  inscricoes: {
    necessidades: 'necessidades_inscricoes',
    cadastro: 'ficha_inscricoes',
    campos_chave: ['tipo_inscricao', 'sigla', 'cor', 'km_inicial', 'km_final', 'latitude_inicial', 'longitude_inicial']
  },
  cilindros: {
    necessidades: 'necessidades_cilindros',
    cadastro: 'ficha_cilindros',
    campos_chave: ['cor_corpo', 'cor_refletivo', 'km_inicial', 'km_final', 'latitude_inicial', 'longitude_inicial']
  },
  porticos: {
    necessidades: 'necessidades_porticos',
    cadastro: 'ficha_porticos',
    campos_chave: ['tipo_portico', 'km', 'latitude', 'longitude']
  },
  defensas: {
    necessidades: 'necessidades_defensas',
    cadastro: 'defensas',
    campos_chave: ['tipo_defensa', 'lado', 'km_inicial', 'km_final', 'latitude_inicial', 'longitude_inicial']
  }
};

// Função auxiliar para buscar dados do elemento
const buscarDadosElemento = async (
  elemento_id: string,
  tipo_elemento: string,
  origem: string
): Promise<any | null> => {
  const config = TABELAS_POR_TIPO[tipo_elemento];
  if (!config) return null;

  const tabela = origem === 'necessidade' ? config.necessidades : config.cadastro;

  try {
    const { data, error } = await supabase
      .from(tabela as any)
      .select(config.campos_chave.join(', '))
      .eq('id', elemento_id)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

// Exportar Auditoria de Sinalizações GPS
export const exportAuditoriaSinalizacoes = async (filtros?: {
  status?: string;
  tipo_elemento?: string;
  tipo_problema?: string;
}) => {
  try {
    toast.info("Gerando relatório GPS completo...");

    let query = supabase
      .from('auditoria_sinalizacoes')
      .select('*')
      .order('sinalizado_em', { ascending: false });

    if (filtros?.status) query = query.eq('status', filtros.status);
    if (filtros?.tipo_elemento) query = query.eq('tipo_elemento', filtros.tipo_elemento);
    if (filtros?.tipo_problema) query = query.eq('tipo_problema', filtros.tipo_problema);

    const { data: sinalizacoes, error } = await query;
    if (error) throw error;

    if (!sinalizacoes?.length) {
      toast.warning("Nenhuma sinalização encontrada");
      return;
    }

    // Buscar nomes dos usuários
    const userIds = [...new Set(sinalizacoes.map(s => s.sinalizado_por))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome')
      .in('id', userIds);
    
    const profilesMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);

    // Buscar dados completos de cada elemento
    const sinalizacoesCompletas = await Promise.all(
      sinalizacoes.map(async (s) => {
        const dadosElemento = await buscarDadosElemento(
          s.elemento_id,
          s.tipo_elemento,
          s.origem
        );
        return { ...s, dados_elemento: dadosElemento };
      })
    );

    const wb = XLSX.utils.book_new();

    // === ABA 1: RESUMO ===
    const porTipo: Record<string, number> = {};
    const porProblema: Record<string, number> = {};
    const porStatus: Record<string, number> = {};

    sinalizacoes.forEach((s) => {
      porTipo[s.tipo_elemento] = (porTipo[s.tipo_elemento] || 0) + 1;
      porProblema[s.tipo_problema] = (porProblema[s.tipo_problema] || 0) + 1;
      porStatus[s.status] = (porStatus[s.status] || 0) + 1;
    });

    const resumo = [
      ['RELATÓRIO DE AUDITORIA GPS'],
      [`Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [],
      ['Total de Sinalizações:', sinalizacoes.length],
      [],
      ['Por Tipo de Elemento:'],
      ...Object.entries(porTipo).map(([tipo, qtd]) => [tipo, qtd]),
      [],
      ['Por Tipo de Problema:'],
      ...Object.entries(porProblema).map(([tipo, qtd]) => [tipo, qtd]),
      [],
      ['Por Status:'],
      ...Object.entries(porStatus).map(([status, qtd]) => [status, qtd])
    ];

    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // === ABA 2: SINALIZAÇÕES DETALHADAS ===
    const dados = sinalizacoesCompletas.map((s) => {
      const dados = s.dados_elemento;
      
      // Formatação de km (pontual vs linear)
      let kmFormatado = 'N/A';
      if (dados) {
        if (dados.km !== undefined && dados.km !== null) {
          // Pontual (placas, pórticos)
          kmFormatado = formatNumber(dados.km);
        } else if (dados.km_inicial !== undefined && dados.km_final !== undefined) {
          // Linear (marcas, tachas, etc)
          kmFormatado = `${formatNumber(dados.km_inicial)} - ${formatNumber(dados.km_final)}`;
        }
      }

      // Coordenadas
      let lat = 'N/A';
      let lng = 'N/A';
      if (dados) {
        if (dados.latitude !== undefined && dados.latitude !== null) {
          lat = dados.latitude.toString();
          lng = dados.longitude?.toString() || 'N/A';
        } else if (dados.latitude_inicial !== undefined && dados.latitude_inicial !== null) {
          lat = dados.latitude_inicial.toString();
          lng = dados.longitude_inicial?.toString() || 'N/A';
        }
      }

      // Código/Tipo do elemento
      let codigo = dados?.codigo || dados?.sigla || '-';
      let tipoElemento = dados?.tipo || dados?.tipo_demarcacao || dados?.tipo_tacha || 
                         dados?.tipo_inscricao || dados?.tipo_portico || dados?.tipo_defensa || '-';

      // Lado
      let lado = dados?.lado || '-';

      return {
        'Data': formatDate(s.sinalizado_em),
        'Tipo Serviço': s.tipo_elemento,
        'Tipo Problema': s.tipo_problema,
        'Código': codigo,
        'Tipo Elemento': tipoElemento,
        'km': kmFormatado,
        'Lado': lado,
        'Latitude': lat,
        'Longitude': lng,
        'Descrição': s.descricao || '-',
        'Sinalizado Por': profilesMap.get(s.sinalizado_por) || 'N/A',
        'Status': s.status
      };
    });

    const wsDados = XLSX.utils.json_to_sheet(dados);

    // Estilização das linhas por status
    const numCols = 12; // Total de colunas
    dados.forEach((row, index) => {
      const rowIndex = index + 1; // +1 porque linha 0 é cabeçalho
      let bgColor = 'FFFFFF'; // Branco padrão

      if (row.Status === 'pendente') {
        bgColor = 'FFF9C4'; // Amarelo claro
      } else if (row.Status === 'resolvido') {
        bgColor = 'C8E6C9'; // Verde claro
      } else if (row.Status === 'ignorado') {
        bgColor = 'E0E0E0'; // Cinza claro
      }

      aplicarEstiloCustom(wsDados, rowIndex, numCols, bgColor);
    });

    // Cabeçalho em negrito e azul
    for (let col = 0; col < numCols; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!wsDados[cellAddress]) continue;
      wsDados[cellAddress].s = {
        fill: { fgColor: { rgb: 'BBDEFB' } },
        font: { bold: true }
      };
    }

    XLSX.utils.book_append_sheet(wb, wsDados, 'Sinalizações');

    XLSX.writeFile(wb, `Auditoria_GPS_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast.success("Relatório completo exportado com sucesso!");
  } catch (error: any) {
    console.error('Erro ao exportar auditoria GPS:', error);
    toast.error("Erro ao exportar relatório");
  }
};
