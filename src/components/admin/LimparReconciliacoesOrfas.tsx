import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function LimparReconciliacoesOrfas() {
  const [limpando, setLimpando] = useState(false);
  const [contador, setContador] = useState<number | null>(null);

  const handleVerificar = async () => {
    setLimpando(true);
    try {
      const { data, error } = await supabase
        .rpc('find_orphaned_reconciliacoes');

      if (error) throw error;

      setContador(data?.length || 0);
      
      if (data && data.length > 0) {
        toast.info(`Encontradas ${data.length} reconciliações órfãs`, {
          description: "Clique em 'Executar Limpeza' para removê-las"
        });
      } else {
        toast.success("Nenhuma reconciliação órfã encontrada! ✓");
      }
    } catch (error: any) {
      console.error('Erro ao verificar:', error);
      toast.error('Erro ao verificar: ' + error.message);
    } finally {
      setLimpando(false);
    }
  };

  const handleLimpar = async () => {
    if (!window.confirm('Confirma a limpeza de reconciliações órfãs? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLimpando(true);
    try {
      // Buscar reconciliações órfãs
      const { data: reconciliacoesOrfas, error: findError } = await supabase
        .rpc('find_orphaned_reconciliacoes');

      if (findError) throw findError;

      if (!reconciliacoesOrfas || reconciliacoesOrfas.length === 0) {
        toast.info("Nenhuma reconciliação órfã para limpar");
        setContador(0);
        return;
      }

      // Deletar as reconciliações órfãs
      const { error: deleteError } = await supabase
        .from('reconciliacoes')
        .delete()
        .in('id', reconciliacoesOrfas.map((r: any) => r.id));

      if (deleteError) throw deleteError;

      toast.success(`✓ ${reconciliacoesOrfas.length} reconciliações órfãs removidas!`);
      setContador(0);
    } catch (error: any) {
      console.error('Erro ao limpar:', error);
      toast.error('Erro ao limpar: ' + error.message);
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
        <div className="flex gap-2">
          <Button 
            onClick={handleVerificar}
            disabled={limpando}
            variant="outline"
          >
            {limpando ? "Verificando..." : "Verificar Órfãs"}
          </Button>
          
          <Button 
            onClick={handleLimpar}
            disabled={limpando || contador === 0}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {limpando ? "Limpando..." : "Executar Limpeza"}
          </Button>
        </div>

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
