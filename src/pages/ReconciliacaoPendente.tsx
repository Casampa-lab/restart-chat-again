import { ReconciliacaoUniversal } from "@/components/ReconciliacaoUniversal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReconciliacaoPendente() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Sistema de Reconciliação</h1>
        <p className="text-muted-foreground">
          Resolva divergências entre o projeto e a análise automática do sistema para todos os grupos de elementos
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>ℹ️</span> Como funciona a Reconciliação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>📋 Projeto (Planilha):</strong> Serviço definido pelo engenheiro no plano de manutenção original
          </p>
          <p>
            <strong>🤖 Análise Automática:</strong> Serviço inferido pelo sistema através de matching GPS com o cadastro existente
          </p>
          <p className="pt-2 border-t">
            Quando há <strong>divergência</strong> entre esses dois, você deve decidir qual prevalece:
          </p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>✅ Manter decisão do projeto (recomendado quando o projetista conhecia a situação)</li>
            <li>🔄 Usar análise automática (quando o GPS confirma elemento diferente no local)</li>
          </ul>
        </CardContent>
      </Card>

      <ReconciliacaoUniversal grupo="placas" />
    </div>
  );
}