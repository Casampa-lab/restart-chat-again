import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TABELAS_NECESSIDADES = [
  { value: "necessidades_cilindros", label: "Cilindros" },
  { value: "necessidades_defensas", label: "Defensas" },
  { value: "necessidades_marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "necessidades_porticos", label: "Pórticos" },
  { value: "necessidades_placas", label: "Placas" },
  { value: "necessidades_tachas", label: "Tachas" },
  { value: "necessidades_marcas_transversais", label: "Marcas Transversais" },
];

interface DeleteTodasNecessidadesProps {
  loteId?: string;
  rodoviaId?: string;
}

interface DeletionProgress {
  tabela: string;
  status: 'pending' | 'deleting' | 'success' | 'error';
  count: number;
  error?: string;
}

export function DeleteTodasNecessidades({ loteId, rodoviaId }: DeleteTodasNecessidadesProps = {}) {
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState<DeletionProgress[]>([]);
  const [totalDeleted, setTotalDeleted] = useState(0);

  const handleDeleteAll = async () => {
    if (!loteId || !rodoviaId) {
      toast.error("Selecione o lote e rodovia no topo da página primeiro");
      return;
    }

    const { data: lote } = await supabase
      .from("lotes")
      .select("numero")
      .eq("id", loteId)
      .single();

    const { data: rodovia } = await supabase
      .from("rodovias")
      .select("codigo")
      .eq("id", rodoviaId)
      .single();

    const confirmMessage = 
      `⚠️ ATENÇÃO: Esta ação vai deletar TODAS as necessidades dos 7 tipos!\n\n` +
      `Rodovia: ${rodovia?.codigo}\n` +
      `Lote: ${lote?.numero}\n\n` +
      `Tipos que serão deletados:\n` +
      `• Cilindros\n` +
      `• Defensas\n` +
      `• Marcas Longitudinais\n` +
      `• Marcas Transversais\n` +
      `• Placas\n` +
      `• Pórticos\n` +
      `• Tachas\n\n` +
      `Esta ação NÃO PODE SER DESFEITA!\n\n` +
      `Deseja continuar?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Confirmação dupla para segurança
    if (!confirm("⚠️ CONFIRMAÇÃO FINAL: Tem ABSOLUTA CERTEZA que deseja deletar TODAS as necessidades?")) {
      return;
    }

    setDeleting(true);
    setProgress([]);
    setTotalDeleted(0);

    let total = 0;

    try {
      // Processar cada tabela sequencialmente
      for (const tabela of TABELAS_NECESSIDADES) {
        setProgress(prev => [
          ...prev,
          { tabela: tabela.label, status: 'deleting', count: 0 }
        ]);

        try {
          // Contar registros
          const { count: totalCount, error: countError } = await supabase
            .from(tabela.value as any)
            .select('*', { count: 'exact', head: true })
            .eq('lote_id', loteId)
            .eq('rodovia_id', rodoviaId);

          if (countError) throw countError;

          if (!totalCount || totalCount === 0) {
            setProgress(prev => prev.map(p => 
              p.tabela === tabela.label 
                ? { ...p, status: 'success', count: 0 }
                : p
            ));
            continue;
          }

          // Deletar reconciliações associadas
          const { data: necessidadesParaDeletar } = await supabase
            .from(tabela.value as any)
            .select('id')
            .eq('lote_id', loteId)
            .eq('rodovia_id', rodoviaId);

          if (necessidadesParaDeletar && necessidadesParaDeletar.length > 0) {
            const necessidadeIds = necessidadesParaDeletar.map((n: any) => n.id);
            
            await supabase
              .from('reconciliacoes')
              .delete()
              .in('necessidade_id', necessidadeIds);
          }

          // Deletar registros
          const { error: deleteError, count } = await supabase
            .from(tabela.value as any)
            .delete({ count: 'exact' })
            .eq('lote_id', loteId)
            .eq('rodovia_id', rodoviaId);

          if (deleteError) throw deleteError;

          const deletedCount = count || 0;
          total += deletedCount;

          setProgress(prev => prev.map(p => 
            p.tabela === tabela.label 
              ? { ...p, status: 'success', count: deletedCount }
              : p
          ));

          setTotalDeleted(total);

        } catch (error: any) {
          console.error(`Erro ao deletar ${tabela.label}:`, error);
          setProgress(prev => prev.map(p => 
            p.tabela === tabela.label 
              ? { ...p, status: 'error', count: 0, error: error.message }
              : p
          ));
        }
      }

      toast.success(`✅ Concluído! Total de ${total} necessidades deletadas`);

    } catch (error: any) {
      console.error('Erro geral:', error);
      toast.error('Erro ao deletar necessidades: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const progressPercentage = progress.length > 0 
    ? (progress.filter(p => p.status === 'success' || p.status === 'error').length / TABELAS_NECESSIDADES.length) * 100
    : 0;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Deletar TODAS as Necessidades de Uma Vez
        </CardTitle>
        <CardDescription>
          Esta ferramenta deleta todos os 7 tipos de necessidades do lote e rodovia selecionados com um único clique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ ZONA DE PERIGO:</strong> Esta ação vai deletar permanentemente TODAS as necessidades (Cilindros, Defensas, Marcas Longitudinais, Marcas Transversais, Placas, Pórticos e Tachas) do lote e rodovia selecionados. Esta ação NÃO PODE SER DESFEITA!
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleDeleteAll}
          disabled={!loteId || !rodoviaId || deleting}
          variant="destructive"
          size="lg"
          className="w-full"
        >
          {deleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deletando...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              DELETAR TODAS AS NECESSIDADES DO LOTE
            </>
          )}
        </Button>

        {deleting && progress.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso Total</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {progress.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                  <div className="flex items-center gap-2">
                    {item.status === 'deleting' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {item.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {item.status === 'error' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    <span className="font-medium">{item.tabela}</span>
                  </div>
                  <div className="text-right">
                    {item.status === 'success' && (
                      <span className="text-green-600">{item.count} deletados</span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-destructive text-xs">{item.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalDeleted > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Total deletado até agora:</strong> {totalDeleted} necessidades
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-semibold">Esta ferramenta vai deletar:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>✓ Cilindros Delimitadores</li>
            <li>✓ Defensas</li>
            <li>✓ Marcas Longitudinais</li>
            <li>✓ Marcas Transversais (Zebrados)</li>
            <li>✓ Placas de Sinalização Vertical</li>
            <li>✓ Pórticos</li>
            <li>✓ Tachas Refletivas</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            💡 <strong>Dica:</strong> Após deletar, você pode reimportar as planilhas sem risco de duplicatas (após aplicação dos constraints de unicidade).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
