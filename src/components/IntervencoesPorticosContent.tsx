import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { IntervencoesPorticosForm } from "@/components/IntervencoesPorticosForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { toast } from "sonner";
import { format } from "date-fns";

interface IntervencaoPortico {
  id: string;
  data_intervencao: string;
  motivo: string;
  tipo: string | null;
  altura_livre_m: number | null;
  vao_horizontal_m: number | null;
  observacao: string | null;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano: string | null;
  ficha_porticos_id: string;
  ficha_porticos?: {
    lote_id: string;
    rodovia_id: string;
    km_inicial: number;
  };
}

const IntervencoesPorticosContent = () => {
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoPortico[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [intervencaoToDelete, setIntervencaoToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [intervencaoToEdit, setIntervencaoToEdit] = useState<IntervencaoPortico | null>(null);
  const [novaIntervencaoOpen, setNovaIntervencaoOpen] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: intervencoesData, error: intervencoesError } = await supabase
        .from("ficha_porticos_intervencoes")
        .select("*")
        .eq("user_id", user.id)
        .order("data_intervencao", { ascending: false });

      if (intervencoesError) throw intervencoesError;

      const intervencoesFull = await Promise.all(
        (intervencoesData || []).map(async (int) => {
          if (int.ficha_porticos_id) {
            const { data: portico } = await supabase
              .from("ficha_porticos")
              .select("id, lote_id, rodovia_id, km_inicial")
              .eq("id", int.ficha_porticos_id)
              .single();
            return { ...int, ficha_porticos: portico };
          }
          return { ...int, ficha_porticos: null };
        })
      );

      setIntervencoes(intervencoesFull as IntervencaoPortico[]);

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

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDelete = async () => {
    if (!intervencaoToDelete) return;

    try {
      const { error } = await supabase
        .from("ficha_porticos_intervencoes")
        .delete()
        .eq("id", intervencaoToDelete);

      if (error) throw error;

      toast.success("Intervenção excluída com sucesso!");
      
      // Recarregar dados
      const { data: userPorticos } = await supabase
        .from("ficha_porticos")
        .select("id, lote_id, rodovia_id, km_inicial")
        .eq("user_id", user!.id);

      const porticosMap = new Map(
        (userPorticos || []).map(p => [p.id, p])
      );

      const { data: intervencoesData } = await supabase
        .from("ficha_porticos_intervencoes")
        .select("*")
        .in("ficha_porticos_id", Array.from(porticosMap.keys()))
        .order("data_intervencao", { ascending: false });

      const intervencoesComDados = (intervencoesData || []).map(i => ({
        ...i,
        ficha_porticos: porticosMap.get(i.ficha_porticos_id)
      }));

      setIntervencoes(intervencoesComDados as IntervencaoPortico[]);
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
        .from("ficha_porticos_intervencoes")
        .update({
          data_intervencao: intervencaoToEdit.data_intervencao,
          motivo: intervencaoToEdit.motivo,
          tipo: intervencaoToEdit.tipo,
          altura_livre_m: intervencaoToEdit.altura_livre_m,
          vao_horizontal_m: intervencaoToEdit.vao_horizontal_m,
          observacao: intervencaoToEdit.observacao,
          fora_plano_manutencao: intervencaoToEdit.fora_plano_manutencao,
          justificativa_fora_plano: intervencaoToEdit.justificativa_fora_plano,
        })
        .eq("id", intervencaoToEdit.id);

      if (error) throw error;

      toast.success("Intervenção atualizada com sucesso!");
      
      // Recarregar dados
      const { data: userPorticos } = await supabase
        .from("ficha_porticos")
        .select("id, lote_id, rodovia_id, km_inicial")
        .eq("user_id", user!.id);

      const porticosMap = new Map(
        (userPorticos || []).map(p => [p.id, p])
      );

      const { data: intervencoesData } = await supabase
        .from("ficha_porticos_intervencoes")
        .select("*")
        .in("ficha_porticos_id", Array.from(porticosMap.keys()))
        .order("data_intervencao", { ascending: false });

      const intervencoesComDados = (intervencoesData || []).map(i => ({
        ...i,
        ficha_porticos: porticosMap.get(i.ficha_porticos_id)
      }));

      setIntervencoes(intervencoesComDados as IntervencaoPortico[]);
    } catch (error: any) {
      toast.error("Erro ao atualizar intervenção: " + error.message);
    } finally {
      setEditDialogOpen(false);
      setIntervencaoToEdit(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Minhas Intervenções em Pórticos</CardTitle>
              <CardDescription>
                Histórico de intervenções em pórticos registradas
              </CardDescription>
            </div>
            <Button onClick={() => setNovaIntervencaoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Nova
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {intervencoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma intervenção registrada ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Rodovia</TableHead>
                    <TableHead>km</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Altura Livre (m)</TableHead>
                    <TableHead>Vão Horizontal (m)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intervencoes.map((intervencao) => (
                    <TableRow key={intervencao.id}>
                      <TableCell>
                        {format(new Date(intervencao.data_intervencao), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {intervencao.ficha_porticos && lotes[intervencao.ficha_porticos.lote_id] || "-"}
                      </TableCell>
                      <TableCell>
                        {intervencao.ficha_porticos && rodovias[intervencao.ficha_porticos.rodovia_id] || "-"}
                      </TableCell>
                      <TableCell>
                        {intervencao.ficha_porticos?.km_inicial.toFixed(3) || "-"}
                      </TableCell>
                      <TableCell>{intervencao.motivo}</TableCell>
                      <TableCell>{intervencao.tipo || "-"}</TableCell>
                      <TableCell>{intervencao.altura_livre_m?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{intervencao.vao_horizontal_m?.toFixed(2) || "-"}</TableCell>
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
            <DialogTitle>Editar Intervenção em Pórticos</DialogTitle>
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
                  <Label>Motivo</Label>
                  <Input
                    value={intervencaoToEdit.motivo}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, motivo: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={intervencaoToEdit.tipo || ""}
                  onValueChange={(value) => setIntervencaoToEdit({...intervencaoToEdit, tipo: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Simples">Simples</SelectItem>
                    <SelectItem value="Duplo">Duplo</SelectItem>
                    <SelectItem value="Triplo">Triplo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Altura Livre (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={intervencaoToEdit.altura_livre_m || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, altura_livre_m: e.target.value ? parseFloat(e.target.value) : null})}
                  />
                </div>
                <div>
                  <Label>Vão Horizontal (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={intervencaoToEdit.vao_horizontal_m || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, vao_horizontal_m: e.target.value ? parseFloat(e.target.value) : null})}
                  />
                </div>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea
                  value={intervencaoToEdit.observacao || ""}
                  onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, observacao: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label>Justificativa (se fora do plano)</Label>
                <Textarea
                  value={intervencaoToEdit.justificativa_fora_plano || ""}
                  onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, justificativa_fora_plano: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEdit}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={novaIntervencaoOpen} onOpenChange={setNovaIntervencaoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Intervenção em Pórticos</DialogTitle>
          </DialogHeader>
          <IntervencoesPorticosForm 
            onIntervencaoRegistrada={() => {
              setNovaIntervencaoOpen(false);
              loadData();
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntervencoesPorticosContent;
