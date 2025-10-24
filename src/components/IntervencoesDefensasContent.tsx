import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import DefensasIntervencoesForm from "@/components/DefensasIntervencoesForm";
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

interface IntervencaoDefensa {
  id: string;
  data_intervencao: string;
  motivo: string;
  extensao_metros: number | null;
  tipo_avaria: string | null;
  estado_conservacao: string | null;
  nivel_risco: string | null;
  observacao: string | null;
  fora_plano_manutencao: boolean;
  justificativa_fora_plano: string | null;
  necessita_intervencao: boolean;
  defensa_id: string;
  defensas?: {
    lote_id: string;
    rodovia_id: string;
    km_inicial: number;
    km_final: number;
  };
}

const IntervencoesDefensasContent = () => {
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoDefensa[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [intervencaoToDelete, setIntervencaoToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [intervencaoToEdit, setIntervencaoToEdit] = useState<IntervencaoDefensa | null>(null);
  const [novaIntervencaoOpen, setNovaIntervencaoOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Buscar TODAS as intervenções do usuário
        const { data: intervencoesData, error: intervencoesError } = await supabase
          .from("defensas_intervencoes")
          .select("*")
          .eq("user_id", user.id)
          .order("data_intervencao", { ascending: false });

        if (intervencoesError) throw intervencoesError;

        // Para cada intervenção com FK, buscar dados da defensa
        const intervencoesFull = await Promise.all(
          (intervencoesData || []).map(async (int) => {
            if (int.defensa_id) {
              const { data: defensa } = await supabase
                .from("defensas")
                .select("id, lote_id, rodovia_id, km_inicial, km_final")
                .eq("id", int.defensa_id)
                .single();
              return { ...int, defensas: defensa };
            }
            return { ...int, defensas: null };
          })
        );

        setIntervencoes(intervencoesFull as IntervencaoDefensa[]);

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

  const handleDelete = async () => {
    if (!intervencaoToDelete) return;

    try {
      const { error } = await supabase
        .from("defensas_intervencoes")
        .delete()
        .eq("id", intervencaoToDelete);

      if (error) throw error;

      toast.success("Intervenção excluída com sucesso!");
      
      // Recarregar dados
      const { data: userDefensas } = await supabase
        .from("defensas")
        .select("id, lote_id, rodovia_id, km_inicial, km_final")
        .eq("user_id", user!.id);

      const defensasMap = new Map(
        (userDefensas || []).map(d => [d.id, d])
      );

      const { data: intervencoesData } = await supabase
        .from("defensas_intervencoes")
        .select("*")
        .in("defensa_id", Array.from(defensasMap.keys()))
        .order("data_intervencao", { ascending: false });

      const intervencoesComDados = (intervencoesData || []).map(i => ({
        ...i,
        defensas: defensasMap.get(i.defensa_id)
      }));

      setIntervencoes(intervencoesComDados as IntervencaoDefensa[]);
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
        .from("defensas_intervencoes")
        .update({
          data_intervencao: intervencaoToEdit.data_intervencao,
          motivo: intervencaoToEdit.motivo,
          extensao_metros: intervencaoToEdit.extensao_metros,
          tipo_avaria: intervencaoToEdit.tipo_avaria,
          estado_conservacao: intervencaoToEdit.estado_conservacao,
          nivel_risco: intervencaoToEdit.nivel_risco,
          observacao: intervencaoToEdit.observacao,
          fora_plano_manutencao: intervencaoToEdit.fora_plano_manutencao,
          justificativa_fora_plano: intervencaoToEdit.justificativa_fora_plano,
          necessita_intervencao: intervencaoToEdit.necessita_intervencao,
        })
        .eq("id", intervencaoToEdit.id);

      if (error) throw error;

      toast.success("Intervenção atualizada com sucesso!");
      
      // Recarregar dados
      const { data: userDefensas } = await supabase
        .from("defensas")
        .select("id, lote_id, rodovia_id, km_inicial, km_final")
        .eq("user_id", user!.id);

      const defensasMap = new Map(
        (userDefensas || []).map(d => [d.id, d])
      );

      const { data: intervencoesData } = await supabase
        .from("defensas_intervencoes")
        .select("*")
        .in("defensa_id", Array.from(defensasMap.keys()))
        .order("data_intervencao", { ascending: false });

      const intervencoesComDados = (intervencoesData || []).map(i => ({
        ...i,
        defensas: defensasMap.get(i.defensa_id)
      }));

      setIntervencoes(intervencoesComDados as IntervencaoDefensa[]);
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
              <CardTitle>Minhas Intervenções em Defensas</CardTitle>
              <CardDescription>
                Histórico de intervenções em defensas metálicas registradas
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
                    <TableHead>Trecho (km)</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Tipo Defensa</TableHead>
                    <TableHead>Extensão (m)</TableHead>
                    <TableHead>Tipo Avaria</TableHead>
                    <TableHead>Nível Risco</TableHead>
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
                        {intervencao.defensas && lotes[intervencao.defensas.lote_id] || "-"}
                      </TableCell>
                      <TableCell>
                        {intervencao.defensas && rodovias[intervencao.defensas.rodovia_id] || "-"}
                      </TableCell>
                      <TableCell>
                        {intervencao.defensas 
                          ? `${intervencao.defensas.km_inicial.toFixed(3)} - ${intervencao.defensas.km_final.toFixed(3)}`
                          : "-"}
                      </TableCell>
                      <TableCell>{intervencao.motivo}</TableCell>
                      <TableCell>{intervencao.extensao_metros?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{intervencao.tipo_avaria || "-"}</TableCell>
                      <TableCell>{intervencao.nivel_risco || "-"}</TableCell>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Intervenção em Defensas</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Extensão (metros)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={intervencaoToEdit.extensao_metros || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, extensao_metros: e.target.value ? parseFloat(e.target.value) : null})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tipo de Avaria</Label>
                  <Input
                    value={intervencaoToEdit.tipo_avaria || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, tipo_avaria: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Estado Conservação</Label>
                  <Input
                    value={intervencaoToEdit.estado_conservacao || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, estado_conservacao: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Nível de Risco</Label>
                  <Input
                    value={intervencaoToEdit.nivel_risco || ""}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, nivel_risco: e.target.value})}
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
            <DialogTitle>Registrar Nova Intervenção em Defensas</DialogTitle>
          </DialogHeader>
          <DefensasIntervencoesForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntervencoesDefensasContent;
