import * as XLSX from 'xlsx';

export interface PlacaExcelRow {
  BR: string;
  SNV: string;
  'Tipo de Placa': string;
  'Código da Placa': string;
  'Velocidade (km/h)': string | number;
  Lado: string;
  Posição: string;
  Km: number;
  Latitude: number;
  Longitude: number;
  'Tipo de Suporte': string;
  'Quantidade de Suporte': number;
  'Tipo de Substrato': string;
  'Tipo (película fundo)': string;
  'Cor (película fundo)': string;
  'Retrorrefletância (película fundo) (cd.lux/m-2)': number;
  'Tipo (película legenda/orla)': string;
  'Cor (película/orla)': string;
  'Retrorrefletância (película legenda/orla) (cd.lux/m-2)': number;
  'Largura (m)': number;
  'Altura (m)': string | number;
  'Área (m²)': number;
}

export interface PlacaData {
  br: string;
  snv: string;
  tipo: string;
  codigo: string;
  velocidade: string | null;
  lado: string;
  posicao: string;
  km: number;
  latitude: number | null;
  longitude: number | null;
  tipo_suporte: string;
  qtde_suporte: number | null;
  substrato: string;
  pelicula: string;
  retrorrefletividade: number | null;
  largura: number | null;
  altura: number | null;
  area_m2: number | null;
  dimensoes_mm: string | null;
  foto_hiperlink: string | null; // Nome do arquivo da foto extraído do hiperlink
}

export async function parseExcelFile(file: File): Promise<PlacaData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json<PlacaExcelRow>(worksheet, {
          header: 1,
          raw: false,
          defval: null,
        });

        // A primeira linha contém os cabeçalhos
        if (jsonData.length < 2) {
          reject(new Error('Planilha vazia ou sem dados'));
          return;
        }

        // Remover as primeiras linhas (cabeçalhos e descrição)
        const dataRows = jsonData.slice(7); // Dados começam na linha 8

        // Mapear os dados
        const placas: PlacaData[] = dataRows
          .filter((row: any) => row && row[0]) // Filtrar linhas vazias
          .map((row: any, index: number) => {
            const velocidade = row[4] !== '-' ? String(row[4]) : null;
            const altura = row[24] !== '-' ? parseFloat(row[24]) : null;
            
            // Extrair nome do arquivo da coluna AE (índice 30)
            let fotoNome: string | null = null;
            if (row[30]) {
              fotoNome = String(row[30]).trim();
              // Remover extensão se houver
              if (fotoNome.includes('.')) {
                fotoNome = fotoNome.split('.')[0];
              }
            }
            
            return {
              br: String(row[0] || ''),
              snv: String(row[1] || ''),
              tipo: String(row[2] || ''),
              codigo: String(row[3] || ''),
              velocidade,
              lado: String(row[5] || ''),
              posicao: String(row[6] || ''),
              km: parseFloat(row[7]) || 0,
              latitude: row[8] ? parseFloat(row[8]) : null,
              longitude: row[9] ? parseFloat(row[9]) : null,
              tipo_suporte: String(row[11] || ''),
              qtde_suporte: row[12] ? parseInt(row[12]) : null,
              substrato: String(row[15] || ''),
              pelicula: `${row[17]} ${row[18]}`, // Tipo + Cor película fundo
              retrorrefletividade: row[19] ? parseFloat(row[19]) : null,
              largura: row[23] ? parseFloat(row[23]) : null,
              altura,
              area_m2: row[25] ? parseFloat(row[25]) : null,
              dimensoes_mm: row[23] && altura 
                ? `${parseFloat(row[23]) * 1000}x${altura * 1000}` 
                : null,
              foto_hiperlink: fotoNome,
            };
          });

        resolve(placas);
      } catch (error) {
        console.error('Erro ao processar Excel:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}
