import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import IntervencoesSHForm from "@/components/IntervencoesSHForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Send, Trash2, Pencil } from "lucide-react";
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

interface IntervencaoSH {
  id: string;
  data_intervencao: string;
  km_inicial: number;
  km_final: number;
  tipo_intervencao: string;
  tipo_demarcacao: string;
  cor: string;
  espessura_cm: number | null;
  area_m2: number;
  material_utilizado: string | null;
  observacao: string | null;
  lote_id: string;
  rodovia_id: string;
  enviado_coordenador: boolean;
}

const IntervencoesSHContent = () => {
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoSH[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedIntervencoes, setSelectedIntervencoes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [intervencaoToDelete, setIntervencaoToDelete] = useState<string | null>(null);
  const [showEnviadas, setShowEnviadas] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [intervencaoToEdit, setIntervencaoToEdit] = useState<IntervencaoSH | null>(null);
  const [novaIntervencaoOpen, setNovaIntervencaoOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const { data: intervencoesData, error: intervencoesError } = await supabase
          .from("ficha_marcas_longitudinais_intervencoes")
          .select("*")
          .eq("user_id", user.id)
          .order("data_intervencao", { ascending: false });

        if (intervencoesError) throw intervencoesError;
        setIntervencoes(intervencoesData as any || []);

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
        .from("intervencoes_sh")
        .update({ enviado_coordenador: true })
        .in("id", Array.from(selectedIntervencoes));

      if (error) throw error;

      toast.success(`${selectedIntervencoes.size} intervenção(ões) enviada(s) ao coordenador!`);
      setSelectedIntervencoes(new Set());
      
      const { data: intervencoesData } = await supabase
        .from("intervencoes_sh")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_intervencao", { ascending: false });
      setIntervencoes(intervencoesData || []);
    } catch (error: any) {
      toast.error("Erro ao enviar intervenções: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!intervencaoToDelete) return;

    try {
      const { error } = await supabase
        .from("intervencoes_sh")
        .delete()
        .eq("id", intervencaoToDelete);

      if (error) throw error;

      toast.success("Intervenção excluída com sucesso!");
      
      const { data: intervencoesData } = await supabase
        .from("intervencoes_sh")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_intervencao", { ascending: false });
      setIntervencoes(intervencoesData || []);
    } catch (error: any) {
      toast.error("Erro ao excluir intervenção: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setIntervencaoToDelete(null);
    }
  };

  const handleEdit = async () => {
    if (!intervencaoToEdit) return;

    try {
      const { error } = await supabase
        .from("intervencoes_sh")
        .update({
          data_intervencao: intervencaoToEdit.data_intervencao,
          km_inicial: intervencaoToEdit.km_inicial,
          km_final: intervencaoToEdit.km_final,
          tipo_intervencao: intervencaoToEdit.tipo_intervencao,
          tipo_demarcacao: intervencaoToEdit.tipo_demarcacao,
          cor: intervencaoToEdit.cor,
          espessura_cm: intervencaoToEdit.espessura_cm,
          area_m2: intervencaoToEdit.area_m2,
          material_utilizado: intervencaoToEdit.material_utilizado,
          observacao: intervencaoToEdit.observacao,
        })
        .eq("id", intervencaoToEdit.id);

      if (error) throw error;

      toast.success("Intervenção atualizada com sucesso!");
      
      const { data: intervencoesData } = await supabase
        .from("intervencoes_sh")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_intervencao", { ascending: false });
      setIntervencoes(intervencoesData || []);
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label htmlFor="show-enviadas-sh" className="text-sm cursor-pointer">
            Mostrar intervenções enviadas
          </label>
          <input
            type="checkbox"
            id="show-enviadas-sh"
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>3.1.5 - Minhas Intervenções em Sinalização Horizontal</CardTitle>
              <CardDescription>
                Histórico de intervenções em sinalização horizontal registradas
              </CardDescription>
            </div>
            <Button onClick={() => setNovaIntervencaoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Nova
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredIntervencoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showEnviadas 
                ? "Nenhuma intervenção registrada ainda."
                : "Nenhuma intervenção não enviada"}
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
                    <TableHead>Tipo Intervenção</TableHead>
                    <TableHead>Tipo Demarcação</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Área (m²)</TableHead>
                    <TableHead>Espessura</TableHead>
                    <TableHead>Material</TableHead>
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
                      <TableCell>
                        {intervencao.km_inicial.toFixed(3)} - {intervencao.km_final.toFixed(3)}
                      </TableCell>
                      <TableCell>{intervencao.tipo_intervencao}</TableCell>
                      <TableCell className="max-w-xs truncate">{intervencao.tipo_demarcacao}</TableCell>
                      <TableCell>{intervencao.cor}</TableCell>
                      <TableCell>{intervencao.area_m2.toFixed(2)}</TableCell>
                      <TableCell>{intervencao.espessura_cm ? `${intervencao.espessura_cm} cm` : "-"}</TableCell>
                      <TableCell>{intervencao.material_utilizado || "-"}</TableCell>
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
                            onClick={() => {
                              setIntervencaoToDelete(intervencao.id);
                              setDeleteDialogOpen(true);
                            }}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <DialogTitle>Editar Intervenção em Sinalização Horizontal</DialogTitle>
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
                  <Label>Tipo Intervenção</Label>
                  <Input
                    value={intervencaoToEdit.tipo_intervencao}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, tipo_intervencao: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>km Inicial</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={intervencaoToEdit.km_inicial}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, km_inicial: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>km Final</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={intervencaoToEdit.km_final}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, km_final: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label>Tipo de Demarcação</Label>
                <Input
                  value={intervencaoToEdit.tipo_demarcacao}
                  onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, tipo_demarcacao: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Cor</Label>
                  <Input
                    value={intervencaoToEdit.cor}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, cor: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Área (m²)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={intervencaoToEdit.area_m2}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, area_m2: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Espessura (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={intervencaoToEdit.espessura_cm || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, espessura_cm: e.target.value ? parseFloat(e.target.value) : null})}
                  />
                </div>
              </div>
              <div>
                <Label>Material Utilizado</Label>
                <Input
                  value={intervencaoToEdit.material_utilizado || ""}
                  onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, material_utilizado: e.target.value})}
                />
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea
                  value={intervencaoToEdit.observacao || ""}
                  onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, observacao: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntervencoesSHContent;
