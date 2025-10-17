import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function LimparReconciliacoesOrfas() {
  const [limpando, setLimpando] = useState(false);
  const [contador, setContador] = useState<number | null>(null);

  const handleAnalisarELimpar = async () => {
    setLimpando(true);
    setContador(null); // Reset do estado visual
    
    try {
      // 1️⃣ VERIFICAR
      const { data: reconciliacoesOrfas, error: findError } = await supabase
        .rpc('find_orphaned_reconciliacoes');

      if (findError) throw findError;

      const qtd = reconciliacoesOrfas?.length || 0;
      setContador(qtd);

      // 2️⃣ SE NÃO HOUVER ÓRFÃS → Mostrar sucesso e parar
      if (qtd === 0) {
        toast.success("✓ Nenhuma reconciliação órfã encontrada!");
        return;
      }

      // 3️⃣ SE HOUVER ÓRFÃS → Pedir confirmação
      const confirmar = window.confirm(
        `Encontradas ${qtd} reconciliação${qtd > 1 ? 'ões' : ''} órfã${qtd > 1 ? 's' : ''}.\n\n` +
        'Deseja removê-las? Esta ação não pode ser desfeita.'
      );

      if (!confirmar) {
        toast.info('Limpeza cancelada');
        return;
      }

      // 4️⃣ LIMPAR
      const { error: deleteError } = await supabase
        .from('reconciliacoes')
        .delete()
        .in('id', reconciliacoesOrfas.map((r: any) => r.id));

      if (deleteError) throw deleteError;

      toast.success(`✓ ${qtd} reconciliação${qtd > 1 ? 'ões' : ''} órfã${qtd > 1 ? 's' : ''} removida${qtd > 1 ? 's' : ''}!`);
      setContador(0);
      
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao processar: ' + error.message);
    } finally {
      setLimpando(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Limpar Reconciliações Órfãs
        </CardTitle>
        <CardDescription>
          Remove reconciliações cujo elemento no cadastro foi deletado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleAnalisarELimpar}
          disabled={limpando}
          variant="destructive"
          className="w-full"
        >
          {limpando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Analisar e Limpar Órfãs
            </>
          )}
        </Button>

        {contador !== null && (
          <div className={`p-3 rounded border ${
            contador === 0 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {contador === 0 
              ? "✓ Nenhuma reconciliação órfã encontrada" 
              : `⚠️ ${contador} reconciliação${contador > 1 ? 'ões' : ''} órfã${contador > 1 ? 's' : ''} encontrada${contador > 1 ? 's' : ''}`
            }
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Reconciliações órfãs ocorrem quando o inventário é deletado mas a necessidade permanece</p>
          <p>• Execute esta limpeza após deletar grandes volumes de inventário</p>
          <p>• Não afeta necessidades ou histórico, apenas registros de match inválidos</p>
        </div>
      </CardContent>
    </Card>
  );
}
