import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Send, Trash2, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";
import logoOperaVia from "@/assets/logo-operavia.jpg";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RetrorrefletividadeDinamica {
  id: string;
  data_medicao: string;
  km_inicial: number;
  km_final: number;
  faixa: string;
  tipo_demarcacao: string;
  cor: string;
  valor_medido: number;
  valor_minimo: number;
  situacao: string;
  velocidade_medicao: number | null;
  condicao_climatica: string | null;
  observacao: string | null;
  lote_id: string;
  rodovia_id: string;
  enviado_coordenador: boolean;
}

const MinhasRetrorrefletividadesDinamicas = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [medicoes, setMedicoes] = useState<RetrorrefletividadeDinamica[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedMedicoes, setSelectedMedicoes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicaoToDelete, setMedicaoToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [medicaoToEdit, setMedicaoToEdit] = useState<RetrorrefletividadeDinamica | null>(null);
  const [showEnviadas, setShowEnviadas] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: medicoesData, error: medicoesError } = await supabase
        .from("retrorrefletividade_dinamica")
        .select("*")
        .eq("user_id", user.id)
        .order("data_medicao", { ascending: false });

      if (medicoesError) throw medicoesError;

      setMedicoes(medicoesData || []);

      const { data: lotesData } = await supabase
        .from("lotes")
        .select("id, numero");

      if (lotesData) {
        const lotesMap: Record<string, string> = {};
        lotesData.forEach((lote) => {
          lotesMap[lote.id] = lote.numero;
        });
        setLotes(lotesMap);
      }

      const { data: rodoviasData } = await supabase
        .from("rodovias")
        .select("id, codigo");

      if (rodoviasData) {
        const rodoviasMap: Record<string, string> = {};
        rodoviasData.forEach((rodovia) => {
          rodoviasMap[rodovia.id] = rodovia.codigo;
        });
        setRodovias(rodoviasMap);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleToggleSelect = (id: string) => {
    const newSelection = new Set(selectedMedicoes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMedicoes(newSelection);
  };

  const handleEnviarSelecionadas = async () => {
    if (selectedMedicoes.size === 0) {
      toast.error("Selecione pelo menos uma medição para enviar");
      return;
    }

    try {
      const { error } = await supabase
        .from("retrorrefletividade_dinamica")
        .update({ enviado_coordenador: true })
        .in("id", Array.from(selectedMedicoes));

      if (error) throw error;

      toast.success(`${selectedMedicoes.size} medição(ões) enviada(s) ao coordenador!`);
      setSelectedMedicoes(new Set());
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao enviar medições: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!medicaoToDelete) return;

    try {
      const { error } = await supabase
        .from("retrorrefletividade_dinamica")
        .delete()
        .eq("id", medicaoToDelete);

      if (error) throw error;

      toast.success("Medição excluída com sucesso!");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir medição: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setMedicaoToDelete(null);
    }
  };

  const handleEdit = async () => {
    if (!medicaoToEdit) return;

    try {
      const { error } = await supabase
        .from("retrorrefletividade_dinamica")
        .update({
          data_medicao: medicaoToEdit.data_medicao,
          km_inicial: medicaoToEdit.km_inicial,
          km_final: medicaoToEdit.km_final,
          faixa: medicaoToEdit.faixa,
          tipo_demarcacao: medicaoToEdit.tipo_demarcacao,
          cor: medicaoToEdit.cor,
          valor_medido: medicaoToEdit.valor_medido,
          valor_minimo: medicaoToEdit.valor_minimo,
          situacao: medicaoToEdit.situacao,
          velocidade_medicao: medicaoToEdit.velocidade_medicao,
          condicao_climatica: medicaoToEdit.condicao_climatica,
          observacao: medicaoToEdit.observacao,
        })
        .eq("id", medicaoToEdit.id);

      if (error) throw error;

      toast.success("Medição atualizada com sucesso!");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar medição: " + error.message);
    } finally {
      setEditDialogOpen(false);
      setMedicaoToEdit(null);
    }
  };

  const filteredMedicoes = showEnviadas
    ? medicoes
    : medicoes.filter(m => !m.enviado_coordenador);

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
            <img src={logoOperaVia} alt="OperaVia" className="h-16 object-contain" />
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
              <label htmlFor="show-enviadas-retro-din" className="text-sm cursor-pointer">
                Mostrar medições enviadas
              </label>
              <input
                type="checkbox"
                id="show-enviadas-retro-din"
                checked={showEnviadas}
                onChange={(e) => setShowEnviadas(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
            </div>
            
            <Button 
              onClick={handleEnviarSelecionadas}
              disabled={selectedMedicoes.size === 0}
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar {selectedMedicoes.size > 0 ? selectedMedicoes.size : ''} ao Coordenador
            </Button>
          </div>

        <Card>
          <CardHeader>
            <CardTitle>3.1.3.2 - Minhas Medições de Retrorrefletividade Dinâmica</CardTitle>
            <CardDescription>
              Histórico de medições de retrorrefletividade dinâmica registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredMedicoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {showEnviadas 
                  ? "Nenhuma medição registrada ainda."
                  : "Nenhuma medição não enviada"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Sel.</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Rodovia</TableHead>
                      <TableHead>Trecho (KM)</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Medido</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead>Velocidade</TableHead>
                      <TableHead>Clima</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedicoes.map((medicao) => (
                      <TableRow key={medicao.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedMedicoes.has(medicao.id)}
                            onChange={() => handleToggleSelect(medicao.id)}
                            disabled={medicao.enviado_coordenador}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(medicao.data_medicao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{lotes[medicao.lote_id] || "-"}</TableCell>
                        <TableCell>{rodovias[medicao.rodovia_id] || "-"}</TableCell>
                        <TableCell>
                          {medicao.km_inicial.toFixed(3)} - {medicao.km_final.toFixed(3)}
                        </TableCell>
                        <TableCell>{medicao.faixa}</TableCell>
                        <TableCell className="max-w-xs truncate">{medicao.tipo_demarcacao}</TableCell>
                        <TableCell>{medicao.cor}</TableCell>
                        <TableCell>{medicao.valor_medido.toFixed(1)}</TableCell>
                        <TableCell>{medicao.valor_minimo.toFixed(1)}</TableCell>
                        <TableCell>{medicao.velocidade_medicao ? `${medicao.velocidade_medicao} km/h` : "-"}</TableCell>
                        <TableCell>{medicao.condicao_climatica || "-"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            medicao.situacao === "Conforme"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          }`}>
                            {medicao.situacao}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {medicao.observacao || "-"}
                        </TableCell>
                        <TableCell>
                          {medicao.enviado_coordenador ? (
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
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMedicaoToEdit(medicao);
                                setEditDialogOpen(true);
                              }}
                              title="Editar medição"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMedicaoToDelete(medicao.id);
                                setDeleteDialogOpen(true);
                              }}
                              title="Excluir medição"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
              Tem certeza que deseja excluir esta medição? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Medição de Retrorrefletividade Dinâmica</DialogTitle>
          </DialogHeader>
          {medicaoToEdit && (
            <div className="space-y-4">
              <div>
                <Label>Data de Medição</Label>
                <Input
                  type="date"
                  value={medicaoToEdit.data_medicao}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, data_medicao: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>KM Inicial</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={medicaoToEdit.km_inicial}
                    onChange={(e) => setMedicaoToEdit({...medicaoToEdit, km_inicial: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>KM Final</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={medicaoToEdit.km_final}
                    onChange={(e) => setMedicaoToEdit({...medicaoToEdit, km_final: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label>Faixa</Label>
                <Input
                  value={medicaoToEdit.faixa}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, faixa: e.target.value})}
                />
              </div>
              <div>
                <Label>Tipo de Demarcação</Label>
                <Input
                  value={medicaoToEdit.tipo_demarcacao}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, tipo_demarcacao: e.target.value})}
                />
              </div>
              <div>
                <Label>Cor</Label>
                <Input
                  value={medicaoToEdit.cor}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, cor: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Medido</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={medicaoToEdit.valor_medido}
                    onChange={(e) => setMedicaoToEdit({...medicaoToEdit, valor_medido: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Valor Mínimo</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={medicaoToEdit.valor_minimo}
                    onChange={(e) => setMedicaoToEdit({...medicaoToEdit, valor_minimo: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label>Velocidade de Medição (km/h)</Label>
                <Input
                  type="number"
                  value={medicaoToEdit.velocidade_medicao || ""}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, velocidade_medicao: e.target.value ? parseFloat(e.target.value) : null})}
                />
              </div>
              <div>
                <Label>Condição Climática</Label>
                <Input
                  value={medicaoToEdit.condicao_climatica || ""}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, condicao_climatica: e.target.value})}
                />
              </div>
              <div>
                <Label>Situação</Label>
                <Select
                  value={medicaoToEdit.situacao}
                  onValueChange={(value) => setMedicaoToEdit({...medicaoToEdit, situacao: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conforme">Conforme</SelectItem>
                    <SelectItem value="Não Conforme">Não Conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea
                  value={medicaoToEdit.observacao || ""}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, observacao: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:operavia.online@gmail.com" className="text-primary hover:underline">operavia.online@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MinhasRetrorrefletividadesDinamicas;
