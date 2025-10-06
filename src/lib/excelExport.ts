import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

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

// Função auxiliar para buscar dados relacionados
const fetchRelatedData = async () => {
  const [{ data: lotes }, { data: empresas }, { data: rodovias }] = await Promise.all([
    supabase.from('lotes').select('id, numero, empresa_id'),
    supabase.from('empresas').select('id, nome'),
    supabase.from('rodovias').select('id, codigo, nome')
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
      ['Data', 'Lote', 'Empresa', 'Rodovia', 'Tipo de Serviço', 'km Inicial', 'km Final', 'Responsável', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const empresa = lote ? empresasMap.get(lote.empresa_id) : null;
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_liberacao),
          lote?.numero || '',
          empresa?.nome || '',
          rodovia ? `${rodovia.codigo} - ${rodovia.nome}` : '',
          item.tipo_servico || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          item.responsavel || '',
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

// Exportar Retrorrefletividade Estática
export const exportRetrorrefletividadeEstatica = async () => {
  try {
    const { data, error } = await supabase
      .from('retrorrefletividade_estatica')
      .select('*')
      .order('data_medicao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.3.1 - RETRORREFLETIVIDADE ESTÁTICA'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km', 'Lado', 'Tipo Dispositivo', 'Código', 'Valor Medido', 'Valor Mínimo', 'Situação', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_medicao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_referencia),
          item.lado || '',
          item.tipo_dispositivo || '',
          item.codigo_dispositivo || '',
          formatNumber(item.valor_medido),
          formatNumber(item.valor_minimo),
          item.situacao || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retro Estática');
    XLSX.writeFile(wb, `Retrorrefletividade_Estatica_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar retrorrefletividade estática:', error);
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
      .order('data_inspecao', { ascending: false });

    if (error) throw error;

    const { lotesMap, rodoviasMap } = await fetchRelatedData();

    const wsData = [
      ['3.1.4 - INSPEÇÃO DE DEFENSAS'],
      [],
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Extensão (m)', 'Tipo', 'Lado', 'Estado', 'Tipo Avaria', 'Nível Risco', 'Necessita Intervenção', 'Observação'],
      ...(data || []).map(item => {
        const lote = lotesMap.get(item.lote_id);
        const rodovia = rodoviasMap.get(item.rodovia_id);
        return [
          formatDate(item.data_inspecao),
          lote?.numero || '',
          rodovia?.codigo || '',
          formatNumber(item.km_inicial),
          formatNumber(item.km_final),
          formatNumber(item.extensao_metros),
          item.tipo_defensa || '',
          item.lado || '',
          item.estado_conservacao || '',
          item.tipo_avaria || '',
          item.nivel_risco || '',
          item.necessita_intervencao ? 'Sim' : 'Não',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];
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
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Tipo Intervenção', 'Tipo Demarcação', 'Cor', 'Área (m²)', 'Espessura (cm)', 'Material', 'Observação'],
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
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 40 }
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
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Tipo Intervenção', 'Tipo Inscrição', 'Cor', 'Área (m²)', 'Dimensões', 'Material', 'Observação'],
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
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 40 }
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
      ['Data', 'Lote', 'Rodovia', 'km', 'Tipo Intervenção', 'Tipo Placa', 'Código', 'Lado', 'Dimensões', 'Material', 'Suporte', 'Estado', 'Qtd', 'Observação'],
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
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 },
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 40 }
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
      ['Data', 'Lote', 'Rodovia', 'km Inicial', 'km Final', 'Tipo Intervenção', 'Tipo Tacha', 'Cor', 'Lado', 'Quantidade', 'Estado', 'Material', 'Observação'],
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
          item.tipo_tacha || '',
          item.cor || '',
          item.lado || '',
          item.quantidade || '',
          item.estado_conservacao || '',
          item.material || '',
          item.observacao || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 15 }, { wch: 20 }, { wch: 40 }
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
          item.pelicula || '',
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
