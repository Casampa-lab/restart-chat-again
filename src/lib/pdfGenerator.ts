import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FotoData {
  foto_url: string;
  latitude: number | null;
  longitude: number | null;
  sentido: string;
  descricao: string;
  ordem: number;
}

interface NCData {
  numero_nc: string;
  data_ocorrencia: string;
  tipo_nc: string;
  problema_identificado: string;
  descricao_problema: string;
  observacao: string;
  km_inicial: number | null;
  km_final: number | null;
  km_referencia: number | null;
  rodovia: {
    codigo: string;
    uf: string;
  };
  lote: {
    numero: string;
    contrato: string;
    responsavel_executora: string;
    email_executora: string;
    nome_fiscal_execucao: string;
    email_fiscal_execucao: string;
  };
  empresa: {
    nome: string;
  };
  supervisora: {
    nome_empresa: string;
    contrato: string;
  };
  fotos: FotoData[];
  natureza: string;
  grau: string;
  tipo_obra: string;
  comentarios_supervisora?: string;
  comentarios_executora?: string;
}

export async function generateNCPDF(ncData: NCData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 20;

  // Header - DNIT e Supervisora
  doc.setFontSize(10);
  doc.text('DNIT', margin, yPos);
  doc.text('Logotipo Supervisora', pageWidth - margin - 40, yPos);
  
  yPos += 8;
  doc.setFontSize(8);
  doc.text('Departamento Nacional de Infraestrutura de Transportes', margin, yPos);
  
  yPos += 10;
  
  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRO DE NÃO CONFORMIDADE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(14);
  doc.text(`Nº ${ncData.numero_nc}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Identificação
  const identificacaoData = [
    ['Data:', new Date(ncData.data_ocorrencia).toLocaleDateString('pt-BR')],
    ['Rodovia:', ncData.rodovia.codigo, 'Km:', 
     ncData.km_inicial && ncData.km_final 
       ? `${ncData.km_inicial} ao ${ncData.km_final}` 
       : ncData.km_referencia?.toString() || 'N/A',
     'Lote:', ncData.lote.numero],
    ['Supervisora:', ncData.supervisora.nome_empresa, 'Contrato:', ncData.supervisora.contrato],
    ['Construtora:', ncData.empresa.nome, 'Contrato:', ncData.lote.contrato],
    ['Tipo de Obra:', ncData.tipo_obra],
  ];

  autoTable(doc, {
    startY: yPos,
    body: identificacaoData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Natureza e Grau
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Natureza:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(ncData.natureza, margin + 20, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Grau:', margin + 80, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(ncData.grau, margin + 95, yPos);
  
  yPos += 8;

  // Descrição da Ocorrência
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição da Ocorrência', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  doc.text(`Problema identificado: ${ncData.problema_identificado}`, margin, yPos);
  yPos += 5;
  
  if (ncData.descricao_problema) {
    const descLines = doc.splitTextToSize(ncData.descricao_problema, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 4;
  }
  
  yPos += 8;

  // Comentários
  if (ncData.comentarios_supervisora) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Comentários da Supervisora:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const comentSuperLines = doc.splitTextToSize(ncData.comentarios_supervisora, pageWidth - 2 * margin);
    doc.text(comentSuperLines, margin, yPos);
    yPos += comentSuperLines.length * 4 + 5;
  }

  if (ncData.comentarios_executora) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Comentários da Executora:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const comentExecLines = doc.splitTextToSize(ncData.comentarios_executora, pageWidth - 2 * margin);
    doc.text(comentExecLines, margin, yPos);
    yPos += comentExecLines.length * 4 + 5;
  }

  // Nova página para fotos se necessário
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = 20;
  }

  // Documentação Fotográfica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Documentação Fotográfica', margin, yPos);
  yPos += 8;

  // Fotos (2 por linha)
  const fotoWidth = (pageWidth - 3 * margin) / 2;
  const fotoHeight = 60;
  let fotoCol = 0;
  let fotoStartY = yPos;

  for (let i = 0; i < 4; i++) {
    const foto = ncData.fotos[i];
    const xPos = margin + (fotoCol * (fotoWidth + margin));
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Foto ${i + 1} - Não conformidade`, xPos, fotoStartY);
    
    if (foto && foto.foto_url) {
      // Tentar adicionar a imagem
      try {
        doc.addImage(foto.foto_url, 'JPEG', xPos, fotoStartY + 3, fotoWidth, fotoHeight);
      } catch (error) {
        // Se falhar, apenas desenhar um retângulo
        doc.rect(xPos, fotoStartY + 3, fotoWidth, fotoHeight);
        doc.setFontSize(8);
        doc.text('[Imagem não disponível]', xPos + fotoWidth/2, fotoStartY + fotoHeight/2, { align: 'center' });
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const infoY = fotoStartY + fotoHeight + 6;
      doc.text(`Sentido: ${foto.sentido || 'N/A'}`, xPos, infoY);
      doc.text(`Lat: ${foto.latitude?.toFixed(6) || 'N/A'}`, xPos, infoY + 3);
      doc.text(`Long: ${foto.longitude?.toFixed(6) || 'N/A'}`, xPos, infoY + 6);
      if (foto.descricao) {
        const descLines = doc.splitTextToSize(`Descrição: ${foto.descricao}`, fotoWidth);
        doc.text(descLines, xPos, infoY + 9);
      }
    } else {
      // Placeholder para foto vazia
      doc.rect(xPos, fotoStartY + 3, fotoWidth, fotoHeight);
      doc.setFontSize(8);
      doc.text('[Sem foto]', xPos + fotoWidth/2, fotoStartY + fotoHeight/2, { align: 'center' });
    }
    
    fotoCol++;
    if (fotoCol >= 2) {
      fotoCol = 0;
      fotoStartY += fotoHeight + 25;
      
      // Adicionar nova página se necessário
      if (fotoStartY > pageHeight - 100 && i < 3) {
        doc.addPage();
        fotoStartY = 20;
      }
    }
  }

  // Footer
  yPos = pageHeight - 20;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`EMPRESA: ${ncData.empresa.nome}`, margin, yPos);
  doc.text(`CONTRATO: ${ncData.lote.contrato}`, margin, yPos + 4);
  doc.text(`UF: ${ncData.rodovia.uf}`, pageWidth - margin - 20, yPos);

  return doc.output('blob');
}
