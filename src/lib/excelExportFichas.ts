import ExcelJS from 'exceljs';

interface FichaComDetalhes {
  id: string;
  tipo: string;
  data_verificacao: string;
  contrato?: string | null;
  empresa?: string | null;
  snv?: string | null;
  status: string;
  user_id: string;
  enviado_coordenador_em?: string;
  profiles?: {
    nome: string;
  };
  rodovias?: {
    codigo: string;
  };
  lotes?: {
    numero: string;
  };
  itens: ItemDetalhado[];
}

interface ItemDetalhado {
  ordem: number;
  foto_url: string;
  latitude?: number | null;
  longitude?: number | null;
  km?: number | null;
  sentido?: string | null;
  retro_bd?: number | null;
  retro_bd_medicoes?: number[] | null;
  retro_e?: number | null;
  retro_e_medicoes?: number[] | null;
  retro_be?: number | null;
  retro_be_medicoes?: number[] | null;
  retro_sv?: number | null;
  retro_sv_medicoes?: number[] | null;
  [key: string]: any;
}

export const exportFichaVerificacaoParaDNIT = async (ficha: FichaComDetalhes) => {
  const workbook = new ExcelJS.Workbook();
  
  // Configuração do cabeçalho
  const cabecalho = {
    rodovia: ficha.rodovias?.codigo || '',
    trecho: '',
    subTrecho: '',
    contrato: ficha.contrato || '',
    lote: ficha.lotes?.numero || '',
    empresa: ficha.empresa || '',
    sr: '',
  };

  // Separar pontos por sentido
  const pontosCrescente = ficha.itens.filter(i => i.sentido?.toLowerCase().includes('cresc'));
  const pontosDecrescente = ficha.itens.filter(i => i.sentido?.toLowerCase().includes('decresc'));

  // ABA 1: Dados Brutos - Sentido Crescente
  if (pontosCrescente.length > 0) {
    const sheetCrescente = workbook.addWorksheet('Crescente - Dados Brutos');
    preencherAbaDadosBrutos(sheetCrescente, cabecalho, pontosCrescente, 'Crescente', ficha.tipo);
  }

  // ABA 2: Dados Brutos - Sentido Decrescente
  if (pontosDecrescente.length > 0) {
    const sheetDecrescente = workbook.addWorksheet('Decrescente - Dados Brutos');
    preencherAbaDadosBrutos(sheetDecrescente, cabecalho, pontosDecrescente, 'Decrescente', ficha.tipo);
  }

  // ABA 3: Análise - Sentido Crescente
  if (pontosCrescente.length > 0) {
    const sheetAnaliseCrescente = workbook.addWorksheet('Crescente - Análise');
    preencherAbaAnalise(sheetAnaliseCrescente, cabecalho, pontosCrescente, 'Crescente', ficha.tipo);
  }

  // ABA 4: Análise - Sentido Decrescente
  if (pontosDecrescente.length > 0) {
    const sheetAnaliseDecrescente = workbook.addWorksheet('Decrescente - Análise');
    preencherAbaAnalise(sheetAnaliseDecrescente, cabecalho, pontosDecrescente, 'Decrescente', ficha.tipo);
  }

  // Salvar arquivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Retrorrefletividade_${ficha.tipo === 'Sinalização Horizontal' ? 'SH' : 'SV'}_${ficha.rodovias?.codigo || 'Rodovia'}_L${ficha.lotes?.numero || 'Lote'}_${new Date(ficha.data_verificacao).toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const preencherAbaDadosBrutos = (
  sheet: ExcelJS.Worksheet,
  cabecalho: any,
  pontos: ItemDetalhado[],
  sentido: string,
  tipo: string
) => {
  // Linha 1: Título
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `RELATÓRIO DE RETROREFLETIVIDADE - ${tipo.toUpperCase()}`;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Linhas 3-6: Cabeçalho DNIT
  sheet.getCell('A3').value = 'Rodovia:';
  sheet.getCell('B3').value = cabecalho.rodovia;
  sheet.getCell('C3').value = 'Trecho:';
  sheet.getCell('D3').value = cabecalho.trecho;
  
  sheet.getCell('A4').value = 'Sub-Trecho:';
  sheet.getCell('B4').value = cabecalho.subTrecho;
  sheet.getCell('C4').value = 'Contrato/Lote:';
  sheet.getCell('D4').value = `${cabecalho.contrato} / Lote ${cabecalho.lote}`;

  sheet.getCell('A5').value = 'Empresa:';
  sheet.getCell('B5').value = cabecalho.empresa;
  sheet.getCell('C5').value = 'SR:';
  sheet.getCell('D5').value = cabecalho.sr;

  sheet.getCell('A6').value = 'Sentido:';
  sheet.getCell('B6').value = sentido;

  // Linha 9: Cabeçalho da tabela
  const headerRow = 9;
  let headers: string[];
  
  if (tipo === 'Sinalização Horizontal') {
    headers = ['Distância (km)', 'Lat/Long BD', 'Retro BD', 'Lat/Long Eixo', 'Retro Eixo', 'Lat/Long BE', 'Retro BE', 'Observações'];
  } else {
    headers = ['Distância (km)', 'Lat/Long', 'Retro SV', 'Observações'];
  }

  headers.forEach((header, idx) => {
    const cell = sheet.getCell(headerRow, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Linhas 10+: Dados
  let currentRow = headerRow + 1;
  pontos.forEach((ponto) => {
    const latLong = `${ponto.latitude || ''}, ${ponto.longitude || ''}`;
    
    if (tipo === 'Sinalização Horizontal') {
      // Linha principal com médias
      sheet.getCell(currentRow, 1).value = ponto.km;
      sheet.getCell(currentRow, 2).value = latLong;
      sheet.getCell(currentRow, 3).value = ponto.retro_bd;
      sheet.getCell(currentRow, 4).value = latLong;
      sheet.getCell(currentRow, 5).value = ponto.retro_e;
      sheet.getCell(currentRow, 6).value = latLong;
      sheet.getCell(currentRow, 7).value = ponto.retro_be;
      sheet.getCell(currentRow, 8).value = '';
      currentRow++;

      // Linhas com leituras individuais expandidas
      const maxLeituras = Math.max(
        ponto.retro_bd_medicoes?.length || 0,
        ponto.retro_e_medicoes?.length || 0,
        ponto.retro_be_medicoes?.length || 0
      );

      for (let i = 0; i < maxLeituras; i++) {
        sheet.getCell(currentRow, 1).value = `${ponto.km} (Leitura ${i + 1})`;
        sheet.getCell(currentRow, 3).value = ponto.retro_bd_medicoes?.[i] || '';
        sheet.getCell(currentRow, 5).value = ponto.retro_e_medicoes?.[i] || '';
        sheet.getCell(currentRow, 7).value = ponto.retro_be_medicoes?.[i] || '';
        currentRow++;
      }
    } else {
      // SV: Linha principal
      sheet.getCell(currentRow, 1).value = ponto.km;
      sheet.getCell(currentRow, 2).value = latLong;
      sheet.getCell(currentRow, 3).value = ponto.retro_sv;
      sheet.getCell(currentRow, 4).value = '';
      currentRow++;

      // Leituras individuais
      if (ponto.retro_sv_medicoes) {
        ponto.retro_sv_medicoes.forEach((medicao, idx) => {
          sheet.getCell(currentRow, 1).value = `${ponto.km} (Leitura ${idx + 1})`;
          sheet.getCell(currentRow, 3).value = medicao;
          currentRow++;
        });
      }
    }
  });

  // Ajustar largura das colunas
  sheet.columns.forEach((column, idx) => {
    if (column) {
      column.width = idx === 0 ? 18 : 20;
    }
  });
};

const preencherAbaAnalise = (
  sheet: ExcelJS.Worksheet,
  cabecalho: any,
  pontos: ItemDetalhado[],
  sentido: string,
  tipo: string
) => {
  // Cabeçalho similar
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `ANÁLISE DE RETROREFLETIVIDADE - ${sentido.toUpperCase()}`;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.getCell('A3').value = 'Rodovia:';
  sheet.getCell('B3').value = cabecalho.rodovia;
  sheet.getCell('A4').value = 'Contrato/Lote:';
  sheet.getCell('B4').value = `${cabecalho.contrato} / Lote ${cabecalho.lote}`;
  sheet.getCell('A5').value = 'Sentido:';
  sheet.getCell('B5').value = sentido;

  // Tabela de análise
  const headerRow = 8;
  const headers = tipo === 'Sinalização Horizontal'
    ? ['Segmento (km)', 'Média Retro BD', 'Média Retro E', 'Média Retro BE', 'Nº Pontos', 'Status']
    : ['Segmento (km)', 'Média Retro SV', 'Nº Pontos', 'Status'];
  
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(headerRow, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
  });

  // Dados de análise - consolidação por segmentos
  let currentRow = headerRow + 1;
  
  if (tipo === 'Sinalização Horizontal') {
    const mediaBD = calcularMedia(pontos.map(p => p.retro_bd).filter(v => v != null) as number[]);
    const mediaE = calcularMedia(pontos.map(p => p.retro_e).filter(v => v != null) as number[]);
    const mediaBE = calcularMedia(pontos.map(p => p.retro_be).filter(v => v != null) as number[]);
    
    sheet.getCell(currentRow, 1).value = 'Média Geral';
    sheet.getCell(currentRow, 2).value = mediaBD.toFixed(1);
    sheet.getCell(currentRow, 3).value = mediaE.toFixed(1);
    sheet.getCell(currentRow, 4).value = mediaBE.toFixed(1);
    sheet.getCell(currentRow, 5).value = pontos.length;
    sheet.getCell(currentRow, 6).value = (mediaBD >= 200 && mediaE >= 200 && mediaBE >= 200) ? 'Conforme' : 'Não conforme';
  } else {
    const mediaSV = calcularMedia(pontos.map(p => p.retro_sv).filter(v => v != null) as number[]);
    
    sheet.getCell(currentRow, 1).value = 'Média Geral';
    sheet.getCell(currentRow, 2).value = mediaSV.toFixed(1);
    sheet.getCell(currentRow, 3).value = pontos.length;
    sheet.getCell(currentRow, 4).value = mediaSV >= 100 ? 'Conforme' : 'Não conforme';
  }

  // Ajustar largura
  sheet.columns.forEach((column) => {
    if (column) {
      column.width = 18;
    }
  });
};

const calcularMedia = (valores: number[]): number => {
  if (valores.length === 0) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
};
