import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InconsistenciaCount {
  tabela: string;
  count: number;
}

const TABELAS_NECESSIDADES = [
  'necessidades_placas',
  'necessidades_defensas',
  'necessidades_porticos',
  'necessidades_marcas_longitudinais',
  'necessidades_marcas_transversais',
  'necessidades_cilindros',
  'necessidades_tachas'
];

interface LimparReconciliacoesInconsistentesProps {
  loteId?: string;
  rodoviaId?: string;
}

export function LimparReconciliacoesInconsistentes({ loteId, rodoviaId }: LimparReconciliacoesInconsistentesProps = {}) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();

  // Buscar contadores de inconsistências
  const { data: inconsistencias, isLoading, refetch } = useQuery({
    queryKey: ["reconciliacoes-inconsistentes"],
    queryFn: async () => {
      const results: InconsistenciaCount[] = [];
      
      for (const tabela of TABELAS_NECESSIDADES) {
        const { count, error } = await supabase
          .from(tabela as any)
          .select("*", { count: 'exact', head: true })
          .eq("divergencia", true)
          .eq("reconciliado", false)
          .eq("status_reconciliacao", "aprovado");

        if (error) {
          console.error(`Erro ao contar ${tabela}:`, error);
          continue;
        }

        if (count && count > 0) {
          results.push({ tabela, count });
        }
      }

      return results;
    },
  });

  // Mutation para limpar registros
  const limparMutation = useMutation({
    mutationFn: async () => {
      const resultados: { tabela: string; deletados: number }[] = [];

      for (const tabela of TABELAS_NECESSIDADES) {
        const { data, error } = await supabase
          .from(tabela as any)
          .delete()
          .eq("divergencia", true)
          .eq("reconciliado", false)
          .eq("status_reconciliacao", "aprovado")
          .select();

        if (error) {
          console.error(`Erro ao deletar de ${tabela}:`, error);
          throw new Error(`Falha ao limpar ${tabela}: ${error.message}`);
        }

        const deletados = data?.length || 0;
        if (deletados > 0) {
          resultados.push({ tabela, deletados });
          console.log(`✅ ${tabela}: ${deletados} registros deletados`);
        }
      }

      return resultados;
    },
    onSuccess: async (resultados) => {
      const totalDeletados = resultados.reduce((sum, r) => sum + r.deletados, 0);
      
      toast.success(`${totalDeletados} registros inconsistentes removidos`, {
        description: resultados.map(r => `${r.tabela}: ${r.deletados}`).join(', ')
      });

      // Usar resetQueries para forçar refetch imediato de TODAS as variações
      await queryClient.resetQueries({ queryKey: ["divergencias"] });
      await queryClient.resetQueries({ queryKey: ["estatisticas-gerais"] });
      await queryClient.resetQueries({ queryKey: ["count-divergencias-coordenacao"] });
      await queryClient.invalidateQueries({ queryKey: ["reconciliacoes-inconsistentes"] });
      
      refetch();
    },
    onError: (error: Error) => {
      toast.error("Erro ao limpar registros", {
        description: error.message
      });
    },
  });

  const handleLimpar = () => {
    setShowConfirmDialog(true);
  };

  const confirmarLimpeza = () => {
    setShowConfirmDialog(false);
    limparMutation.mutate();
  };

  const totalInconsistencias = inconsistencias?.reduce((sum, inc) => sum + inc.count, 0) || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Limpar Reconciliações Inconsistentes
          </CardTitle>
          <CardDescription>
            Remove registros em estado inconsistente (divergência marcada como aprovada mas não reconciliada)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Escaneando banco de dados...
            </div>
          ) : totalInconsistencias > 0 ? (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{totalInconsistencias} registros inconsistentes</strong> encontrados no sistema
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm font-medium">Detalhamento por tabela:</p>
                <ul className="text-sm space-y-1">
                  {inconsistencias?.map(inc => (
                    <li key={inc.tabela} className="flex justify-between">
                      <span className="text-muted-foreground">{inc.tabela}:</span>
                      <span className="font-medium">{inc.count} registros</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={handleLimpar}
                variant="destructive"
                disabled={limparMutation.isPending}
                className="w-full"
              >
                {limparMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar {totalInconsistencias} Registros Inconsistentes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ Nenhum registro inconsistente encontrado. Sistema limpo!
              </AlertDescription>
            </Alert>
          )}

                <Button
                  onClick={async () => {
                    await refetch();
                    // Invalidar queries dependentes após re-escanear
                    await queryClient.resetQueries({ queryKey: ["divergencias"] });
                    await queryClient.resetQueries({ queryKey: ["estatisticas-gerais"] });
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Reescanear
                </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá deletar <strong>{totalInconsistencias} registros</strong> do banco de dados.
              <br /><br />
              Registros afetados são aqueles com:
              <ul className="list-disc list-inside mt-2">
                <li>divergencia = true</li>
                <li>reconciliado = false</li>
                <li>status_reconciliacao = 'aprovado'</li>
              </ul>
              <br />
              Esta ação não pode ser desfeita. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarLimpeza} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
