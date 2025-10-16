import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateNCPDF } from "@/lib/pdfGenerator";
import { Download } from "lucide-react";
import { toast } from "sonner";

const TestePDF = () => {
  const handleGeneratePDF = async () => {
    try {
      const dadosExemplo = {
        numero_nc: "NC00001",
        data_ocorrencia: "2025-01-15",
        tipo_nc: "Sinalização Horizontal",
        problema_identificado: "Falta de pintura na faixa central",
        descricao_problema: "Durante inspeção na BR-101, foi identificada ausência de pintura na faixa de divisão de fluxo, no trecho entre km 250 e km 252. A sinalização está desgastada e compromete a segurança dos usuários da via.",
        observacao: "Requer correção urgente",
        km_inicial: 250,
        km_final: 252,
        km_referencia: 251,
        rodovia: {
          codigo: "BR-101",
          uf: "SC"
        },
        lote: {
          numero: "05",
          contrato: "DNIT/2024/0123",
          responsavel_executora: "João Silva",
          email_executora: "joao.silva@executora.com.br",
          nome_fiscal_execucao: "Maria Santos",
          email_fiscal_execucao: "maria.santos@dnit.gov.br"
        },
        empresa: {
          nome: "Construtora Exemplo LTDA"
        },
        supervisora: {
          nome_empresa: "Operavia Engenharia",
          contrato: "SUP/2024/456",
          logo_url: "/logo-operavia.jpg" // Logo de exemplo
        },
        fotos: [
          {
            foto_url: "",
            latitude: -27.5954,
            longitude: -48.5480,
            sentido: "Norte",
            descricao: "Vista geral do trecho sem sinalização",
            ordem: 1
          },
          {
            foto_url: "",
            latitude: -27.5960,
            longitude: -48.5485,
            sentido: "Sul",
            descricao: "Detalhe da faixa desgastada",
            ordem: 2
          },
          {
            foto_url: "",
            latitude: -27.5965,
            longitude: -48.5490,
            sentido: "Norte",
            descricao: "Ponto crítico identificado",
            ordem: 3
          },
          {
            foto_url: "",
            latitude: -27.5970,
            longitude: -48.5495,
            sentido: "Sul",
            descricao: "Final do trecho analisado",
            ordem: 4
          }
        ],
        natureza: "Técnica",
        grau: "Grave",
        tipo_obra: "Conservação Rodoviária",
        comentarios_supervisora: "A não conformidade foi identificada durante inspeção de rotina. Recomenda-se a execução imediata dos serviços de repintura para garantir a segurança viária.",
        comentarios_executora: "Empresa ciente da não conformidade. Programação de correção prevista para os próximos 15 dias úteis."
      };

      toast.info("Gerando PDF...");
      const blob = await generateNCPDF(dadosExemplo);
      
      // Criar link para download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // numero_nc já vem com prefixo "NC", não duplicar
      link.download = `${dadosExemplo.numero_nc}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Teste de Geração de PDF</CardTitle>
          <CardDescription>
            Clique no botão abaixo para gerar um PDF de exemplo de uma Não Conformidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Dados do exemplo:</h3>
            <ul className="text-sm space-y-1">
              <li>• Número: NC00001</li>
              <li>• Rodovia: BR-101/SC</li>
              <li>• Trecho: km 250 ao km 252</li>
              <li>• Tipo: Sinalização Horizontal</li>
              <li>• Grau: Grave</li>
              <li>• Inclui 4 fotos com coordenadas GPS</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleGeneratePDF} 
            className="w-full"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Gerar PDF de Exemplo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestePDF;