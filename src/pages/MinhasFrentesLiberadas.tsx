import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Send, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logoBrLegal from "@/assets/logo-brlegal2.png";


interface FrenteLiberada {
  id: string;
  data_liberacao: string;
  km_inicial: number;
  km_final: number;
  tipo_servico: string;
  responsavel: string;
  observacao: string | null;
  created_at: string;
  rodovia_id: string;
  lote_id: string;
  enviado_coordenador: boolean;
}

const MinhasFrentesLiberadas = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [frentes, setFrentes] = useState<FrenteLiberada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrentes, setSelectedFrentes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [frenteToDelete, setFrenteToDelete] = useState<string | null>(null);
  const [showEnviadas, setShowEnviadas] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const loadFrentes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("frentes_liberadas")
        .select("*")
        .eq("user_id", user.id)
        .order("data_liberacao", { ascending: false });

      if (error) throw error;
      setFrentes(data || []);
    } catch (error) {
      console.error("Erro ao carregar frentes liberadas:", error);
      toast.error("Erro ao carregar frentes liberadas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFrentes();
  }, [user]);

  const handleToggleSelect = (id: string) => {
    const newSelection = new Set(selectedFrentes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedFrentes(newSelection);
  };

  const handleEnviarSelecionadas = async () => {
    if (selectedFrentes.size === 0) {
      toast.error("Selecione pelo menos uma frente para enviar");
      return;
    }

    try {
      const { error } = await supabase
        .from("frentes_liberadas")
        .update({ enviado_coordenador: true })
        .in("id", Array.from(selectedFrentes));

      if (error) throw error;

      toast.success(`${selectedFrentes.size} frente(s) enviada(s) ao coordenador!`);
      setSelectedFrentes(new Set());
      await loadFrentes();
    } catch (error: any) {
      toast.error("Erro ao enviar frentes: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!frenteToDelete) return;

    try {
      const { error } = await supabase
        .from("frentes_liberadas")
        .delete()
        .eq("id", frenteToDelete);

      if (error) throw error;

      toast.success("Frente excluída com sucesso!");
      await loadFrentes();
    } catch (error: any) {
      toast.error("Erro ao excluir frente: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setFrenteToDelete(null);
    }
  };

  const filteredFrentes = showEnviadas 
    ? frentes 
    : frentes.filter(f => !f.enviado_coordenador);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <img src={logoBrLegal} alt="BR-LEGAL 2" className="h-16 object-contain" />
            <Button variant="navigation" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label htmlFor="show-enviadas-frentes" className="text-sm cursor-pointer">
                Mostrar frentes enviadas
              </label>
              <input
                type="checkbox"
                id="show-enviadas-frentes"
                checked={showEnviadas}
                onChange={(e) => setShowEnviadas(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
            </div>
            
            {selectedFrentes.size > 0 && (
              <Button onClick={handleEnviarSelecionadas}>
                <Send className="mr-2 h-4 w-4" />
                Enviar {selectedFrentes.size} ao Coordenador
              </Button>
            )}
          </div>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Frentes Liberadas</CardTitle>
            <CardDescription>
              Histórico de frentes liberadas registradas por você
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFrentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {showEnviadas 
                  ? "Nenhuma frente liberada registrada ainda."
                  : "Nenhuma frente não enviada"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Sel.</TableHead>
                      <TableHead>Data Liberação</TableHead>
                      <TableHead>KM Inicial</TableHead>
                      <TableHead>KM Final</TableHead>
                      <TableHead>Tipo de Serviço</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFrentes.map((frente) => (
                      <TableRow key={frente.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedFrentes.has(frente.id)}
                            onChange={() => handleToggleSelect(frente.id)}
                            disabled={frente.enviado_coordenador}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>{formatDate(frente.data_liberacao)}</TableCell>
                        <TableCell>{frente.km_inicial.toFixed(3)}</TableCell>
                        <TableCell>{frente.km_final.toFixed(3)}</TableCell>
                        <TableCell>{frente.tipo_servico}</TableCell>
                        <TableCell>{frente.responsavel}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {frente.observacao || "-"}
                        </TableCell>
                        <TableCell>
                          {frente.enviado_coordenador ? (
                            <Badge variant="outline" className="bg-green-50">
                              Enviada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50">
                              Não enviada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFrenteToDelete(frente.id);
                              setDeleteDialogOpen(true);
                            }}
                            title="Excluir frente"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta frente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:cassia.sampaio@dnit.gov.br" className="text-primary hover:underline">cassia.sampaio@dnit.gov.br</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MinhasFrentesLiberadas;
