import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { urlToBase64 } from './pdfHelpers';

interface FotoData {
  foto_url: string;
  latitude?: number;
  longitude?: number;
  sentido?: string;
  descricao?: string;
  ordem: number;
}

interface NCData {
  numero_nc: string;
  data_ocorrencia: string;
  tipo_nc: string;
  problema_identificado: string;
  descricao_problema?: string;
  justificativa?: string;
  observacao?: string;
  km_inicial?: number;
  km_final?: number;
  km_referencia?: number;
  snv?: string;
  rodovia: {
    codigo: string;
    uf: string;
  };
  lote: {
    numero: string;
    contrato: string;
    responsavel_executora?: string;
    email_executora?: string;
    nome_fiscal_execucao?: string;
    email_fiscal_execucao?: string;
  };
  empresa: {
    nome: string;
    contrato_executora?: string;
  };
  supervisora: {
    nome_empresa: string;
    contrato: string;
    logo_url?: string;
  };
  fotos: FotoData[];
  natureza?: string;
  grau?: string;
  tipo_obra?: string;
  comentarios_supervisora?: string;
  comentarios_executora?: string;
}

export async function generateNCPDF(ncData: NCData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let yPos = 15;

  // ==================== HEADER COM LOGOS ====================
  // Logo DNIT (esquerda)
  try {
    const logoDNIT = '/logo-dnit.jpg';
    const dnitBase64 = await urlToBase64(logoDNIT);
    doc.addImage(dnitBase64, 'JPEG', margin, yPos, 35, 12);
  } catch (error) {
    console.error('Erro ao carregar logo DNIT:', error);
    doc.setFontSize(8);
    doc.text('DNIT', margin, yPos + 6);
  }

  // Logo Supervisora (direita)
  if (ncData.supervisora.logo_url) {
    try {
      const logoSupBase64 = await urlToBase64(ncData.supervisora.logo_url);
      doc.addImage(logoSupBase64, 'PNG', pageWidth - margin - 35, yPos, 35, 12);
    } catch (error) {
      console.error('Erro ao carregar logo supervisora:', error);
      doc.setFontSize(8);
      doc.text(ncData.supervisora.nome_empresa.substring(0, 15), pageWidth - margin - 35, yPos + 6);
    }
  }

  yPos += 18;

  // ==================== TÍTULO ====================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRO DE NÃO CONFORMIDADE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  doc.setFontSize(12);
  // Número já vem com prefixo "NC", não duplicar
  doc.text(`Nº ${ncData.numero_nc}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // ==================== IDENTIFICAÇÃO (COMPACTA) ====================
  doc.setFont('helvetica', 'normal');
  const identificacaoData = [
    ['Data', new Date(ncData.data_ocorrencia).toLocaleDateString('pt-BR'), 
     'Rodovia', `${ncData.rodovia.codigo}/${ncData.rodovia.uf}`,
     'Lote', ncData.lote.numero],
    ['Km', ncData.km_inicial && ncData.km_final 
        ? `${ncData.km_inicial.toFixed(3)} ao ${ncData.km_final.toFixed(3)}` 
        : (ncData.km_referencia ? `km ${ncData.km_referencia.toFixed(3)}` : 'N/A'),
     'SNV', ncData.snv || 'N/A'],
    ['Supervisora', ncData.supervisora.nome_empresa.substring(0, 40),
     'Contrato', ncData.supervisora.contrato || 'N/A'],
    ['Construtora', ncData.empresa.nome.substring(0, 40),
     'Contrato', ncData.empresa.contrato_executora || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    body: identificacaoData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      2: { fontStyle: 'bold', cellWidth: 22 },
      4: { fontStyle: 'bold', cellWidth: 12 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // ==================== NATUREZA/GRAU/TIPO ====================
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Natureza:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  const naturezaText = ncData.natureza || '⚠️ NÃO INFORMADO';
  doc.text(naturezaText, margin + 18, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Grau:', margin + 60, yPos);
  doc.setFont('helvetica', 'normal');
  const grauText = ncData.grau || '⚠️ NÃO INFORMADO';
  doc.text(grauText, margin + 72, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo:', margin + 110, yPos);
  doc.setFont('helvetica', 'normal');
  const tipoObraText = ncData.tipo_obra || '⚠️ NÃO INFORMADO';
  doc.text(tipoObraText, margin + 122, yPos);
  
  yPos += 8;

  // ==================== DESCRIÇÃO (RESUMIDA) ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Descrição:', margin, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  const descResumida = (ncData.justificativa || ncData.descricao_problema || ncData.problema_identificado).substring(0, 200);
  const descLines = doc.splitTextToSize(descResumida, pageWidth - 2 * margin);
  doc.text(descLines.slice(0, 3), margin, yPos);
  yPos += 12;

  // ==================== GRID 2x2 DE FOTOS ====================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Documentação Fotográfica', margin, yPos);
  yPos += 5;

  const fotoWidth = (pageWidth - 3 * margin) / 2;
  const fotoHeight = 50;
  const fotoSpacing = 5;

  const fotosOrdenadas = [...ncData.fotos].sort((a, b) => a.ordem - b.ordem);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const fotoIndex = row * 2 + col;
      if (fotoIndex >= fotosOrdenadas.length) break;
      
      const foto = fotosOrdenadas[fotoIndex];
      
      const xPos = margin + col * (fotoWidth + margin);
      const yFoto = yPos + row * (fotoHeight + fotoSpacing + 10);

      // Título da foto
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(`Foto ${fotoIndex + 1}`, xPos, yFoto);

      if (foto?.foto_url) {
        try {
          console.log(`🔄 [Foto ${fotoIndex + 1}] Iniciando carregamento:`, foto.foto_url);
          const startTime = Date.now();
          
          const fotoBase64 = await urlToBase64(foto.foto_url);
          
          console.log(`✅ [Foto ${fotoIndex + 1}] Carregada em ${Date.now() - startTime}ms`);
          doc.addImage(fotoBase64, 'JPEG', xPos, yFoto + 2, fotoWidth, fotoHeight);
        } catch (error) {
          console.error(`❌ [Foto ${fotoIndex + 1}] Erro ao carregar:`, error);
          doc.rect(xPos, yFoto + 2, fotoWidth, fotoHeight);
          doc.setFontSize(6);
          doc.setTextColor(255, 0, 0);
          doc.text('[Erro ao carregar imagem]', xPos + fotoWidth/2, yFoto + fotoHeight/2 + 2, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }

        // Coordenadas GPS (compactas)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        const gpsY = yFoto + fotoHeight + 4;
        
        if (foto.latitude && foto.longitude) {
          const gpsText = `${foto.sentido || 'N/A'} | GPS: ${foto.latitude.toFixed(6)}, ${foto.longitude.toFixed(6)}`;
          doc.text(gpsText, xPos, gpsY);
        } else {
          doc.setTextColor(255, 0, 0);
          doc.text('⚠️ GPS não capturado', xPos, gpsY);
          doc.setTextColor(0, 0, 0);
        }
      } else {
        doc.rect(xPos, yFoto + 2, fotoWidth, fotoHeight);
        doc.setFontSize(6);
        doc.text('[Sem foto]', xPos + fotoWidth/2, yFoto + fotoHeight/2 + 2, { align: 'center' });
      }
    }
  }

  yPos += 2 * (fotoHeight + fotoSpacing + 10) + 5;

  // ==================== COMENTÁRIOS (SE COUBER) ====================
  if (yPos < 260 && ncData.comentarios_supervisora) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Comentários:', margin, yPos);
    yPos += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const comentLines = doc.splitTextToSize(ncData.comentarios_supervisora, pageWidth - 2 * margin);
    doc.text(comentLines.slice(0, 2), margin, yPos);
  }

  // ==================== FOOTER ====================
  const footerY = 285;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${ncData.empresa.nome} | Contrato: ${ncData.lote.contrato || 'N/A'}`, margin, footerY);
  doc.text(`UF: ${ncData.rodovia.uf}`, pageWidth - margin - 60, footerY);
  doc.text('Email: contato@operavia.com.br', pageWidth - margin - 60, footerY + 4);

  return doc.output('blob');
}
