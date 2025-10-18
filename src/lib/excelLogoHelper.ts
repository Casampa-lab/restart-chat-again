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

/**
 * Adiciona logos e informações da supervisora no cabeçalho do Excel
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
 * Cria workbook Excel com logos e dados
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
