import ExcelJS from "exceljs";

/**
 * Converte URL de imagem para base64
 */
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erro ao converter imagem para base64:", error);
    throw error;
  }
}

/**
 * Extrai base64 puro de data URL
 */
function extractBase64(dataUrl: string): string {
  return dataUrl.split(",")[1];
}

/**
 * Determina extensão da imagem a partir do data URL
 */
function getImageExtension(dataUrl: string): "png" | "jpeg" {
  if (dataUrl.includes("image/png")) return "png";
  return "jpeg";
}

/**
 * Calcula dimensões do logo mantendo aspect ratio
 */
async function calcularDimensoesLogo(
  dataUrl: string,
  alturaDesejada: number
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const larguraCalculada = alturaDesejada * aspectRatio;
      resolve({
        width: larguraCalculada,
        height: alturaDesejada,
      });
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    img.src = dataUrl;
  });
}

interface AdicionarLogosOptions {
  logoSupervisoraUrl?: string | null;
  logoOrgaoUrl?: string | null;
  nomeEmpresa?: string;
  contrato?: string;
}

interface CabecalhoSUPRAOptions {
  worksheet: ExcelJS.Worksheet;
  titulo: string;
  contrato: string;
  logoOrgao?: string;
  logoSupervisora?: string;
  numColunas: number;
}

/**
 * Adiciona cabeçalho no padrão SUPRA com logos e título
 */
export async function adicionarCabecalhoSUPRA(
  options: CabecalhoSUPRAOptions
): Promise<number> {
  const { worksheet, titulo, contrato, logoOrgao, logoSupervisora, numColunas } = options;

  // Inserir 2 linhas no topo para o cabeçalho
  worksheet.spliceRows(1, 0, [], []);

  // Linha 1: Título principal com contrato + logos
  const ultimaColuna = String.fromCharCode(64 + numColunas);
  worksheet.mergeCells(`A1:${ultimaColuna}1`);
  const celulaTitulo = worksheet.getCell("A1");
  const tituloComContrato = contrato ? `${titulo} - Contrato: ${contrato}` : titulo;
  celulaTitulo.value = tituloComContrato;
  celulaTitulo.font = { name: "Arial", size: 14, bold: true };
  celulaTitulo.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 60;

  // Logo DNIT (esquerda)
  if (logoOrgao) {
    try {
      const ALTURA_LOGO = 50;
      const base64Image = await urlToBase64(logoOrgao);
      const base64Data = extractBase64(base64Image);
      const extension = getImageExtension(base64Image);
      const dimensoes = await calcularDimensoesLogo(base64Image, ALTURA_LOGO);

      const imageId = worksheet.workbook.addImage({
        base64: base64Data,
        extension: extension,
      });

      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: dimensoes,
        editAs: "oneCell",
      });
    } catch (error) {
      console.error("Erro ao adicionar logo DNIT:", error);
    }
  }

  // Logo Supervisora (direita)
  if (logoSupervisora) {
    try {
      const ALTURA_LOGO = 50;
      const base64Image = await urlToBase64(logoSupervisora);
      const base64Data = extractBase64(base64Image);
      const extension = getImageExtension(base64Image);
      const dimensoes = await calcularDimensoesLogo(base64Image, ALTURA_LOGO);

      const imageId = worksheet.workbook.addImage({
        base64: base64Data,
        extension: extension,
      });

      const colunaDireita = Math.max(0, numColunas - 2);
      worksheet.addImage(imageId, {
        tl: { col: colunaDireita, row: 0 },
        ext: dimensoes,
        editAs: "oneCell",
      });
    } catch (error) {
      console.error("Erro ao adicionar logo Supervisora:", error);
    }
  }

  // Linha 2: Retornar número da linha onde devem começar os cabeçalhos
  return 2;
}

/**
 * Formata cabeçalhos das colunas no padrão SUPRA
 */
export function formatarCabecalhosColunas(
  worksheet: ExcelJS.Worksheet,
  linhaCabecalho: number,
  cabecalhos: string[]
): void {
  const row = worksheet.getRow(linhaCabecalho);
  row.values = cabecalhos;
  row.font = { name: "Arial", size: 10, bold: true };
  row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };
  row.height = 30;

  // Adicionar bordas
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
}

/**
 * Adiciona rodapé com data de geração e branding
 */
export function adicionarRodape(
  worksheet: ExcelJS.Worksheet,
  ultimaLinha: number,
  numColunas: number
): void {
  const linhaRodape = ultimaLinha + 1;
  const row = worksheet.getRow(linhaRodape);
  
  // Data de geração (primeira coluna)
  const mesAno = new Date().toLocaleDateString("pt-BR", { 
    month: "long", 
    year: "numeric" 
  }).toUpperCase();
  row.getCell(1).value = mesAno;
  row.getCell(1).font = { name: "Arial", size: 10, bold: true };
  row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  
  // Branding (última coluna)
  row.getCell(numColunas).value = "v4 operavia.online";
  row.getCell(numColunas).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0066CC" } };
  row.getCell(numColunas).alignment = { horizontal: "right", vertical: "middle" };
  
  row.height = 25;
  
  // Borda superior dupla
  row.eachCell((cell, colNumber) => {
    if (colNumber === 1 || colNumber === numColunas) {
      cell.border = {
        top: { style: "double" },
      };
    }
  });
}

/**
 * Formata células de dados no padrão SUPRA
 */
export function formatarCelulasDados(
  worksheet: ExcelJS.Worksheet,
  primeiraLinha: number,
  ultimaLinha: number
): void {
  for (let i = primeiraLinha; i <= ultimaLinha; i++) {
    const row = worksheet.getRow(i);
    row.height = 20;
    row.font = { name: "Arial", size: 10 };
    
    row.eachCell((cell) => {
      // Bordas finas
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      
      // Alinhamento baseado no tipo de valor
      const value = cell.value;
      if (typeof value === "number") {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (value && String(value).match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // Data
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  }
}

/**
 * Adiciona logos e informações da supervisora no cabeçalho do Excel (versão antiga)
 */
export async function adicionarLogosHeader(
  worksheet: ExcelJS.Worksheet,
  options: AdicionarLogosOptions
): Promise<void> {
  const { logoSupervisoraUrl, logoOrgaoUrl, nomeEmpresa, contrato } = options;

  // Inserir 4 linhas no topo para o cabeçalho
  worksheet.spliceRows(1, 0, [], [], [], []);

  // Mesclar células para o título
  worksheet.mergeCells("A1:D1");
  worksheet.getCell("A1").value = nomeEmpresa || "Sistema de Supervisão";
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  // Adicionar contrato na segunda linha
  if (contrato) {
    worksheet.mergeCells("A2:D2");
    worksheet.getCell("A2").value = contrato;
    worksheet.getCell("A2").font = { bold: true, size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  }

  // Ajustar altura das linhas do header
  worksheet.getRow(1).height = 40;
  worksheet.getRow(2).height = 25;
  worksheet.getRow(3).height = 10; // Espaçamento
  worksheet.getRow(4).height = 10; // Espaçamento

  // Adicionar logo da supervisora (lado esquerdo)
  if (logoSupervisoraUrl) {
    try {
      const ALTURA_PADRAO = 60;
      const base64Image = await urlToBase64(logoSupervisoraUrl);
      const base64Data = extractBase64(base64Image);
      const extension = getImageExtension(base64Image);
      const dimensoes = await calcularDimensoesLogo(base64Image, ALTURA_PADRAO);

      const imageId = worksheet.workbook.addImage({
        base64: base64Data,
        extension: extension,
      });

      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 }, // Top-left: coluna A, linha 1
        ext: dimensoes,
      });
    } catch (error) {
      console.error("Erro ao adicionar logo supervisora:", error);
    }
  }

  // Adicionar logo do órgão fiscalizador (lado direito)
  if (logoOrgaoUrl) {
    try {
      const ALTURA_PADRAO = 60;
      const base64Image = await urlToBase64(logoOrgaoUrl);
      const base64Data = extractBase64(base64Image);
      const extension = getImageExtension(base64Image);
      const dimensoes = await calcularDimensoesLogo(base64Image, ALTURA_PADRAO);

      const imageId = worksheet.workbook.addImage({
        base64: base64Data,
        extension: extension,
      });

      // Calcular posição à direita (última coluna visível)
      const lastCol = Math.max(10, worksheet.columnCount - 1);
      
      worksheet.addImage(imageId, {
        tl: { col: lastCol - 1, row: 0 }, // Duas colunas antes do fim
        ext: dimensoes,
      });
    } catch (error) {
      console.error("Erro ao adicionar logo órgão:", error);
    }
  }
}

/**
 * Cria workbook Excel com logos e dados (versão antiga)
 */
export async function criarWorkbookComLogos(
  dados: any[],
  nomeSheet: string,
  options: AdicionarLogosOptions
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(nomeSheet);

  // Adicionar logos no header
  await adicionarLogosHeader(worksheet, options);

  // Adicionar dados (a partir da linha 5, após o header)
  if (dados.length > 0) {
    const headers = Object.keys(dados[0]);
    
    // Linha 5: Headers
    worksheet.getRow(5).values = headers;
    worksheet.getRow(5).font = { bold: true };
    worksheet.getRow(5).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Dados a partir da linha 6
    dados.forEach((item, index) => {
      const row = worksheet.getRow(6 + index);
      row.values = headers.map(header => item[header]);
    });

    // Auto-ajustar largura das colunas
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: false }, cell => {
        const length = cell.value ? cell.value.toString().length : 10;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(maxLength + 2, 50);
    });
  }

  return workbook;
}
