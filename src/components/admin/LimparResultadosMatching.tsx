import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Eraser, AlertTriangle } from "lucide-react";

const TABELAS_NECESSIDADES = [
  { nome: 'necessidades_placas', label: 'Placas' },
  { nome: 'necessidades_tachas', label: 'Tachas' },
  { nome: 'necessidades_defensas', label: 'Defensas' },
  { nome: 'necessidades_marcas_longitudinais', label: 'Marcas Longitudinais' },
  { nome: 'necessidades_marcas_transversais', label: 'Marcas Transversais' },
  { nome: 'necessidades_cilindros', label: 'Cilindros' },
  { nome: 'necessidades_porticos', label: 'Pórticos' },
];

export function LimparResultadosMatching() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmacao, setConfirmacao] = useState(false);
  const [executando, setExecutando] = useState(false);
  const queryClient = useQueryClient();

  // Buscar contadores de matches por tabela
  const { data: contadores, isLoading } = useQuery({
    queryKey: ['contadores-matches'],
    queryFn: async () => {
      const results = await Promise.all(
        TABELAS_NECESSIDADES.map(async ({ nome, label }) => {
          const { count } = await (supabase as any)
            .from(nome)
            .select('*', { count: 'exact', head: true })
            .not('match_decision', 'is', null);
          
          return { tabela: nome, label, count: count || 0 };
        })
      );
      return results;
    },
    enabled: dialogOpen,
  });

  const totalMatches = contadores?.reduce((sum, c) => sum + c.count, 0) || 0;

  const executarLimpeza = async () => {
    setExecutando(true);
    
    try {
      console.log('🧹 Iniciando limpeza de matches...');
      
      const promises = TABELAS_NECESSIDADES.map(async ({ nome, label }) => {
        const { error, count } = await (supabase as any)
          .from(nome)
          .update({
            match_decision: null,
            match_score: null,
            reason_code: null,
            estado: 'PROPOSTO'
          })
          .not('match_decision', 'is', null)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ Erro ao limpar ${label}:`, error);
          throw error;
        }
        
        console.log(`✅ ${label}: ${count || 0} registros limpos`);
        return { tabela: nome, label, limpos: count || 0 };
      });

      const resultados = await Promise.all(promises);
      const totalLimpo = resultados.reduce((sum, r) => sum + r.limpos, 0);

      console.log('✅ Limpeza concluída:', resultados);
      
      toast.success(
        `Limpeza concluída com sucesso!`,
        {
          description: `${totalLimpo} registros resetados em ${TABELAS_NECESSIDADES.length} tabelas.`,
          duration: 5000,
        }
      );

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['contadores-matches'] });
      queryClient.invalidateQueries({ queryKey: ['necessidades-matches'] });
      
      setDialogOpen(false);
      setConfirmacao(false);
      
    } catch (error: any) {
      console.error('❌ Erro na limpeza de matches:', error);
      toast.error('Erro ao limpar matches', {
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setExecutando(false);
    }
  };

  return (
    <Card className="border-2 border-orange-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Eraser className="h-5 w-5" />
              Limpar Resultados de Matching
            </CardTitle>
            <CardDescription>
              Remove todos os resultados de matching para permitir reprocessamento
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Eraser className="mr-2 h-4 w-4" />
                Abrir Limpeza
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Limpeza de Matches
                </DialogTitle>
                <DialogDescription>
                  Esta ação resetará todos os resultados de matching para o estado inicial (PROPOSTO).
                </DialogDescription>
              </DialogHeader>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>{totalMatches} registros</strong> serão afetados por esta operação.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold mb-2">Breakdown por Tipo:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de Elemento</TableHead>
                          <TableHead className="text-right">Registros com Match</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contadores?.map((c) => (
                          <TableRow key={c.tabela}>
                            <TableCell className="font-medium">{c.label}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={c.count > 0 ? "default" : "secondary"}>
                                {c.count}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive" className="bg-orange-600">
                              {totalMatches}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Ação irreversível!</strong> Todos os campos de matching 
                      (match_decision, match_score, reason_code) serão resetados para NULL 
                      e o estado voltará para 'PROPOSTO'.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                    <Checkbox 
                      id="confirmacao-limpeza" 
                      checked={confirmacao}
                      onCheckedChange={(checked) => setConfirmacao(checked as boolean)}
                      disabled={executando}
                    />
                    <Label 
                      htmlFor="confirmacao-limpeza" 
                      className="text-sm font-medium cursor-pointer"
                    >
                      Confirmo que desejo limpar todos os resultados de matching
                    </Label>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setConfirmacao(false);
                  }}
                  disabled={executando}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={executarLimpeza}
                  disabled={!confirmacao || executando || totalMatches === 0}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {executando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Eraser className="mr-2 h-4 w-4" />
                      Executar Limpeza
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Use esta ferramenta para resetar todos os resultados de matching e executar 
          o processo novamente com novos parâmetros ou após ajustes no cadastro.
        </div>
      </CardContent>
    </Card>
  );
}
