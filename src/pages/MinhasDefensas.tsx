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
import { ArrowLeft, CheckCircle2, XCircle, Send, Trash2, Pencil } from "lucide-react";
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
import { format } from "date-fns";
const logoOperaVia = "/logo-operavia.png";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Defensa {
  id: string;
  data_vistoria: string;
  km_inicial: number;
  km_final: number;
  lado: string;
  extensao_metros: number;
  lote_id: string;
  rodovia_id: string;
  enviado_coordenador: boolean;
}

const MinhasDefensas = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [defensas, setDefensas] = useState<Defensa[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedDefensas, setSelectedDefensas] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [defensaToDelete, setDefensaToDelete] = useState<string | null>(null);
  const [showEnviadas, setShowEnviadas] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [defensaToEdit, setDefensaToEdit] = useState<Defensa | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const { data: defensasData, error: defensasError } = await supabase
          .from("defensas")
          .select("*")
          .eq("user_id", user.id)
          .order("data_vistoria", { ascending: false });

        if (defensasError) throw defensasError;

        setDefensas((defensasData || []) as any);

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
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleToggleSelect = (id: string) => {
    const newSelection = new Set(selectedDefensas);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDefensas(newSelection);
  };

  const handleEnviarSelecionadas = async () => {
    if (selectedDefensas.size === 0) {
      toast.error("Selecione pelo menos uma inspeção para enviar");
      return;
    }

    try {
      const { error } = await supabase
        .from("defensas")
        .update({ enviado_coordenador: true })
        .in("id", Array.from(selectedDefensas));

      if (error) throw error;

      toast.success(`${selectedDefensas.size} inspeção(ões) enviada(s) ao coordenador!`);
      setSelectedDefensas(new Set());
      
      // Reload data
      const { data: defensasData } = await supabase
        .from("defensas")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_vistoria", { ascending: false });
      setDefensas((defensasData || []) as any);
    } catch (error: any) {
      toast.error("Erro ao enviar inspeções: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!defensaToDelete) return;

    try {
      const { error } = await supabase
        .from("defensas")
        .delete()
        .eq("id", defensaToDelete);

      if (error) throw error;

      toast.success("Inspeção excluída com sucesso!");
      
      // Reload data
      const { data: defensasData } = await supabase
        .from("defensas")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_vistoria", { ascending: false });
      setDefensas((defensasData || []) as any);
    } catch (error: any) {
      toast.error("Erro ao excluir inspeção: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setDefensaToDelete(null);
    }
  };

  const handleEdit = async () => {
    if (!defensaToEdit) return;

    try {
      const { error } = await supabase
        .from("defensas")
        .update({
          data_vistoria: defensaToEdit.data_vistoria,
          km_inicial: defensaToEdit.km_inicial,
          km_final: defensaToEdit.km_final,
          lado: defensaToEdit.lado,
          extensao_metros: defensaToEdit.extensao_metros,
        })
        .eq("id", defensaToEdit.id);

      if (error) throw error;

      toast.success("Inspeção atualizada com sucesso!");
      
      const { data: defensasData } = await supabase
        .from("defensas")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_vistoria", { ascending: false });
      setDefensas((defensasData || []) as any);
    } catch (error: any) {
      toast.error("Erro ao atualizar inspeção: " + error.message);
    } finally {
      setEditDialogOpen(false);
      setDefensaToEdit(null);
    }
  };

  const filteredDefensas = showEnviadas
    ? defensas 
    : defensas.filter(d => !d.enviado_coordenador);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <img src={logoOperaVia} alt="OperaVia" className="h-24 object-contain" />
            <Button variant="navigation" size="sm" onClick={() => navigate("/minhas-intervencoes")}>
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
              <label htmlFor="show-enviadas" className="text-sm cursor-pointer">
                Mostrar inspeções enviadas
              </label>
              <input
                type="checkbox"
                id="show-enviadas"
                checked={showEnviadas}
                onChange={(e) => setShowEnviadas(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
            </div>
            
            {selectedDefensas.size > 0 && (
              <Button onClick={handleEnviarSelecionadas}>
                <Send className="mr-2 h-4 w-4" />
                Enviar {selectedDefensas.size} ao Coordenador
              </Button>
            )}
          </div>

        <Card>
          <CardHeader>
            <CardTitle>3.1.4 - Meus Cadastros de Defensas</CardTitle>
            <CardDescription>
              Histórico de cadastros de defensas registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDefensas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {showEnviadas 
                  ? "Nenhuma inspeção registrada ainda."
                  : "Nenhuma inspeção não enviada"}
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
                      <TableHead>Trecho (km)</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Extensão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDefensas.map((defensa) => (
                      <TableRow key={defensa.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedDefensas.has(defensa.id)}
                            onChange={() => handleToggleSelect(defensa.id)}
                            disabled={defensa.enviado_coordenador}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(defensa.data_vistoria), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{lotes[defensa.lote_id] || "-"}</TableCell>
                        <TableCell>{rodovias[defensa.rodovia_id] || "-"}</TableCell>
                        <TableCell>
                          {defensa.km_inicial.toFixed(3)} - {defensa.km_final.toFixed(3)}
                        </TableCell>
                        <TableCell>{defensa.lado}</TableCell>
                        <TableCell>{defensa.extensao_metros.toFixed(1)}m</TableCell>
                        <TableCell>
                          {defensa.enviado_coordenador ? (
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
                                setDefensaToEdit(defensa);
                                setEditDialogOpen(true);
                              }}
                              title="Editar inspeção"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDefensaToDelete(defensa.id);
                                setDeleteDialogOpen(true);
                              }}
                              title="Excluir inspeção"
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
              Tem certeza que deseja excluir esta inspeção? Esta ação não pode ser desfeita.
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
            <DialogTitle>Editar Inspeção de Defensa</DialogTitle>
          </DialogHeader>
          {defensaToEdit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data da Inspeção</Label>
                  <Input
                    type="date"
                    value={defensaToEdit.data_vistoria}
                    onChange={(e) => setDefensaToEdit({...defensaToEdit, data_vistoria: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Lado</Label>
                  <Select value={defensaToEdit.lado} onValueChange={(value) => setDefensaToEdit({...defensaToEdit, lado: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Direito">Direito</SelectItem>
                      <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                      <SelectItem value="Ambos">Ambos</SelectItem>
                      <SelectItem value="Canteiro Central">Canteiro Central</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>km Inicial</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={defensaToEdit.km_inicial}
                    onChange={(e) => setDefensaToEdit({...defensaToEdit, km_inicial: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>km Final</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={defensaToEdit.km_final}
                    onChange={(e) => setDefensaToEdit({...defensaToEdit, km_final: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label>Extensão (metros)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={defensaToEdit.extensao_metros}
                  onChange={(e) => setDefensaToEdit({...defensaToEdit, extensao_metros: parseFloat(e.target.value)})}
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
              Críticas e sugestões: <a href="mailto:contato@operavia.online" className="text-primary hover:underline">contato@operavia.online</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MinhasDefensas;
