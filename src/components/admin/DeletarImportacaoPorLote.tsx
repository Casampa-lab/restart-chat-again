import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ImportacaoAgrupada {
  import_batch_id: string | null;
  rodovia_id: string;
  lote_id: string;
  created_at: string;
  rodovia_codigo: string;
  lote_numero: string;
  total_registros: number;
}

const TABELAS_NECESSIDADES = [
  "necessidades_placas",
  "necessidades_porticos",
  "necessidades_marcas_transversais",
  "necessidades_marcas_longitudinais",
  "necessidades_tachas",
  "necessidades_defensas",
  "necessidades_cilindros",
];

export function DeletarImportacaoPorLote() {
  const { toast } = useToast();
  const [deletando, setDeletando] = useState(false);

  // Buscar importações agrupadas por lote/rodovia/timestamp
  const { data: importacoes, isLoading, refetch } = useQuery({
    queryKey: ["importacoes-agrupadas"],
    queryFn: async () => {
      const resultados: ImportacaoAgrupada[] = [];
      
      for (const tabela of TABELAS_NECESSIDADES) {
        const { data, error } = await supabase
          .from(tabela as any)
          .select(`
            import_batch_id,
            rodovia_id,
            lote_id,
            created_at,
            rodovia:rodovias!inner(codigo),
            lote:lotes!inner(numero)
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(`Erro ao buscar ${tabela}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          // ✅ Agrupar por import_batch_id (solução robusta)
          // Se import_batch_id for null (importações antigas), usar fallback para rodovia+lote+timestamp
          const grupos = data.reduce((acc: Record<string, ImportacaoAgrupada>, item: any) => {
            const key = item.import_batch_id 
              ? item.import_batch_id 
              : `legacy_${item.rodovia_id}_${item.lote_id}_${item.created_at.substring(0, 16)}`;
            
            if (!acc[key]) {
              acc[key] = {
                import_batch_id: item.import_batch_id,
                rodovia_id: item.rodovia_id,
                lote_id: item.lote_id,
                created_at: item.created_at,
                rodovia_codigo: item.rodovia?.codigo || "?",
                lote_numero: item.lote?.numero || "?",
                total_registros: 0,
              };
            }
            acc[key].total_registros += 1;
            return acc;
          }, {} as Record<string, ImportacaoAgrupada>);

          resultados.push(...Object.values(grupos));
        }
      }

      // Agrupar novamente se houver registros duplicados de tabelas diferentes
      const gruposFinal = resultados.reduce((acc: Record<string, ImportacaoAgrupada>, item: ImportacaoAgrupada) => {
        const key = item.import_batch_id 
          ? item.import_batch_id 
          : `legacy_${item.rodovia_id}_${item.lote_id}_${item.created_at.substring(0, 16)}`;
        
        if (!acc[key]) {
          acc[key] = item;
        } else {
          acc[key].total_registros += item.total_registros;
        }
        return acc;
      }, {} as Record<string, ImportacaoAgrupada>);

      return Object.values(gruposFinal);
    },
  });

  const handleDeletar = async (importacao: ImportacaoAgrupada) => {
    setDeletando(true);
    try {
      let totalDeletados = 0;

      for (const tabela of TABELAS_NECESSIDADES) {
        // ✅ Deletar por import_batch_id (solução robusta)
        // Se import_batch_id for null, usar fallback para rodovia+lote+timestamp
        let query = supabase
          .from(tabela as any)
          .delete({ count: 'exact' });

        if (importacao.import_batch_id) {
          // Importações novas: deletar por batch_id
          query = query.eq("import_batch_id", importacao.import_batch_id);
        } else {
          // Importações antigas: deletar por rodovia+lote+timestamp (janela de 1 minuto)
          const timestampBase = new Date(importacao.created_at);
          const timestampInicio = new Date(timestampBase);
          timestampInicio.setSeconds(0, 0);
          
          const timestampFim = new Date(timestampInicio);
          timestampFim.setMinutes(timestampFim.getMinutes() + 1);
          
          query = query
            .eq("rodovia_id", importacao.rodovia_id)
            .eq("lote_id", importacao.lote_id)
            .gte("created_at", timestampInicio.toISOString())
            .lt("created_at", timestampFim.toISOString());
        }

        const { error, count } = await query;

        if (error) {
          console.error(`Erro ao deletar de ${tabela}:`, error);
        } else {
          totalDeletados += count || 0;
        }
      }

      toast({
        title: "Importação Deletada",
        description: `${totalDeletados} registros removidos com sucesso`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletando(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deletar Importação por Lote</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando importações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Deletar Importação por Lote
        </CardTitle>
        <CardDescription>
          Remove importações incorretas agrupadas por rodovia, lote e timestamp
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Esta ação deleta TODOS os registros do lote/rodovia/timestamp selecionado e é IRREVERSÍVEL!
          </AlertDescription>
        </Alert>

        {!importacoes || importacoes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma importação encontrada
          </p>
        ) : (
          <div className="space-y-3">
            {importacoes.map((imp, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{imp.rodovia_codigo}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium">Lote {imp.lote_numero}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(imp.created_at).toLocaleString("pt-BR")}
                    </div>
                    {imp.import_batch_id && (
                      <div className="text-xs text-muted-foreground font-mono">
                        ID: {imp.import_batch_id.substring(0, 8)}...
                      </div>
                    )}
                    <div className="text-sm font-medium text-primary">
                      {imp.total_registros} registro(s)
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletando}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você está prestes a deletar <strong>{imp.total_registros} registro(s)</strong> da importação:
                          <br />
                          <br />
                          <strong>{imp.rodovia_codigo} - Lote {imp.lote_numero}</strong>
                          <br />
                          Importado em: {new Date(imp.created_at).toLocaleString("pt-BR")}
                          <br />
                          <br />
                          Esta ação não pode ser desfeita!
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletar(imp)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmar Exclusão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
