import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Trash2, Send, Pencil } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
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
import logoOperaVia from "@/assets/logo-operavia.jpg";

interface IntervencaoSV {
  id: string;
  data_intervencao: string;
  km_referencia: number;
  tipo_intervencao: string;
  tipo_placa: string;
  codigo_placa: string | null;
  lado: string;
  dimensoes: string | null;
  material: string | null;
  tipo_suporte: string | null;
  estado_conservacao: string;
  quantidade: number;
  observacao: string | null;
  created_at: string;
  lote_id: string;
  rodovia_id: string;
  enviado_coordenador: boolean;
}

const MinhasIntervencoesSV = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoSV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIntervencoes, setSelectedIntervencoes] = useState<Set<string>>(new Set());
  const [showEnviadas, setShowEnviadas] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [intervencaoToEdit, setIntervencaoToEdit] = useState<IntervencaoSV | null>(null);

  useEffect(() => {
    if (user) {
      fetchIntervencoes();
    }
  }, [user]);

  const fetchIntervencoes = async () => {
    try {
      const { data, error } = await supabase
        .from("intervencoes_sv")
        .select("*")
        .eq("user_id", user?.id)
        .order("data_intervencao", { ascending: false });

      if (error) throw error;
      setIntervencoes(data || []);

      const { data: lotesData } = await supabase.from("lotes").select("id, numero");
      if (lotesData) {
        const lotesMap: Record<string, string> = {};
        lotesData.forEach((lote) => { lotesMap[lote.id] = lote.numero; });
        setLotes(lotesMap);
      }

      const { data: rodoviasData } = await supabase.from("rodovias").select("id, codigo");
      if (rodoviasData) {
        const rodoviasMap: Record<string, string> = {};
        rodoviasData.forEach((rodovia) => { rodoviasMap[rodovia.id] = rodovia.codigo; });
        setRodovias(rodoviasMap);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar intervenções: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelection = new Set(selectedIntervencoes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIntervencoes(newSelection);
  };

  const handleEnviarSelecionadas = async () => {
    if (selectedIntervencoes.size === 0) {
      toast.error("Selecione pelo menos uma intervenção para enviar");
      return;
    }

    try {
      const { error } = await supabase
        .from("intervencoes_sv")
        .update({ enviado_coordenador: true })
        .in("id", Array.from(selectedIntervencoes));

      if (error) throw error;
      toast.success(`${selectedIntervencoes.size} intervenção(ões) enviada(s) ao coordenador!`);
      setSelectedIntervencoes(new Set());
      fetchIntervencoes();
    } catch (error: any) {
      toast.error("Erro ao enviar intervenções: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("intervencoes_sv")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Intervenção excluída com sucesso!");
      fetchIntervencoes();
    } catch (error: any) {
      toast.error("Erro ao excluir intervenção: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = async () => {
    if (!intervencaoToEdit) return;

    try {
      const { error } = await supabase
        .from("intervencoes_sv")
        .update({
          data_intervencao: intervencaoToEdit.data_intervencao,
          km_referencia: intervencaoToEdit.km_referencia,
          tipo_intervencao: intervencaoToEdit.tipo_intervencao,
          tipo_placa: intervencaoToEdit.tipo_placa,
          codigo_placa: intervencaoToEdit.codigo_placa,
          lado: intervencaoToEdit.lado,
          dimensoes: intervencaoToEdit.dimensoes,
          material: intervencaoToEdit.material,
          tipo_suporte: intervencaoToEdit.tipo_suporte,
          estado_conservacao: intervencaoToEdit.estado_conservacao,
          quantidade: intervencaoToEdit.quantidade,
          observacao: intervencaoToEdit.observacao,
        })
        .eq("id", intervencaoToEdit.id);

      if (error) throw error;

      toast.success("Intervenção atualizada com sucesso!");
      fetchIntervencoes();
    } catch (error: any) {
      toast.error("Erro ao atualizar intervenção: " + error.message);
    } finally {
      setEditDialogOpen(false);
      setIntervencaoToEdit(null);
    }
  };

  const filteredIntervencoes = showEnviadas 
    ? intervencoes 
    : intervencoes.filter(i => !i.enviado_coordenador);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
              <label htmlFor="show-enviadas" className="text-sm cursor-pointer">
                Mostrar intervenções enviadas
              </label>
              <input
                type="checkbox"
                id="show-enviadas"
                checked={showEnviadas}
                onChange={(e) => setShowEnviadas(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
            </div>
            
            {selectedIntervencoes.size > 0 && (
              <Button onClick={handleEnviarSelecionadas}>
                <Send className="mr-2 h-4 w-4" />
                Enviar {selectedIntervencoes.size} ao Coordenador
              </Button>
            )}
          </div>

        <Card>
          <CardHeader>
            <CardTitle>Intervenções Registradas em Sinalização Vertical</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredIntervencoes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {showEnviadas 
                  ? "Nenhuma intervenção registrada ainda."
                  : "Nenhuma intervenção não enviada"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Sel.</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Rodovia</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Tipo Intervenção</TableHead>
                      <TableHead>Tipo Placa</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Dimensões</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Suporte</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIntervencoes.map((intervencao) => (
                      <TableRow key={intervencao.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIntervencoes.has(intervencao.id)}
                            onChange={() => handleToggleSelect(intervencao.id)}
                            disabled={intervencao.enviado_coordenador}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(intervencao.data_intervencao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{lotes[intervencao.lote_id] || "-"}</TableCell>
                        <TableCell>{rodovias[intervencao.rodovia_id] || "-"}</TableCell>
                        <TableCell>{intervencao.km_referencia}</TableCell>
                        <TableCell>{intervencao.tipo_intervencao}</TableCell>
                        <TableCell>{intervencao.tipo_placa}</TableCell>
                        <TableCell>{intervencao.codigo_placa || "-"}</TableCell>
                        <TableCell>{intervencao.lado}</TableCell>
                        <TableCell>{intervencao.dimensoes || "-"}</TableCell>
                        <TableCell>{intervencao.material || "-"}</TableCell>
                        <TableCell>{intervencao.tipo_suporte || "-"}</TableCell>
                        <TableCell>{intervencao.estado_conservacao}</TableCell>
                        <TableCell>{intervencao.quantidade}</TableCell>
                        <TableCell>
                          {intervencao.enviado_coordenador ? (
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
                                setIntervencaoToEdit(intervencao);
                                setEditDialogOpen(true);
                              }}
                              title="Editar intervenção"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(intervencao.id)}
                              title="Excluir intervenção"
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

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:operavia.online@gmail.com" className="text-primary hover:underline">operavia.online@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta intervenção? Esta ação não pode ser desfeita.
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
            <DialogTitle>Editar Intervenção em Sinalização Vertical</DialogTitle>
          </DialogHeader>
          {intervencaoToEdit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data da Intervenção</Label>
                  <Input
                    type="date"
                    value={intervencaoToEdit.data_intervencao}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, data_intervencao: e.target.value})}
                  />
                </div>
                <div>
                  <Label>KM Referência</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={intervencaoToEdit.km_referencia}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, km_referencia: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo Intervenção</Label>
                  <Input
                    value={intervencaoToEdit.tipo_intervencao}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, tipo_intervencao: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Tipo Placa</Label>
                  <Input
                    value={intervencaoToEdit.tipo_placa}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, tipo_placa: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código Placa</Label>
                  <Input
                    value={intervencaoToEdit.codigo_placa || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, codigo_placa: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Lado</Label>
                  <Select value={intervencaoToEdit.lado} onValueChange={(value) => setIntervencaoToEdit({...intervencaoToEdit, lado: value})}>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Dimensões</Label>
                  <Input
                    value={intervencaoToEdit.dimensoes || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, dimensoes: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Material</Label>
                  <Input
                    value={intervencaoToEdit.material || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, material: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Tipo Suporte</Label>
                  <Input
                    value={intervencaoToEdit.tipo_suporte || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, tipo_suporte: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado de Conservação</Label>
                  <Input
                    value={intervencaoToEdit.estado_conservacao}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, estado_conservacao: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={intervencaoToEdit.quantidade}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, quantidade: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea
                  value={intervencaoToEdit.observacao || ""}
                  onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, observacao: e.target.value})}
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
    </div>
  );
};

export default MinhasIntervencoesSV;
