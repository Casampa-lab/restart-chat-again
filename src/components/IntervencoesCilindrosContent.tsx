import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { IntervencoesCilindrosForm } from "@/components/IntervencoesCilindrosForm";
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

interface IntervencaoCilindro {
  id: string;
  data_intervencao: string;
  motivo: string;
  cor_corpo: string | null;
  cor_refletivo: string | null;
  tipo_refletivo: string | null;
  quantidade: number | null;
  fora_plano_manutencao?: boolean;
  justificativa_fora_plano?: string | null;
  ficha_cilindros_id: string;
  pendente_aprovacao_coordenador: boolean;
  ficha_cilindros?: {
    lote_id: string;
    rodovia_id: string;
    km_inicial: number;
    km_final: number;
  };
}

const IntervencoesCilindrosContent = () => {
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoCilindro[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedIntervencoes, setSelectedIntervencoes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [intervencaoToDelete, setIntervencaoToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [intervencaoToEdit, setIntervencaoToEdit] = useState<IntervencaoCilindro | null>(null);
  const [novaIntervencaoOpen, setNovaIntervencaoOpen] = useState(false);
  const [showEnviadas, setShowEnviadas] = useState(true);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: intervencoesData, error: intervencoesError } = await supabase
        .from("ficha_cilindros_intervencoes")
        .select("*")
        .eq("user_id", user.id)
        .order("data_intervencao", { ascending: false });

      if (intervencoesError) throw intervencoesError;

      const intervencoesFull = await Promise.all(
        (intervencoesData || []).map(async (int) => {
          if (int.ficha_cilindros_id) {
            const { data: cilindro } = await supabase
              .from("ficha_cilindros")
              .select("id, lote_id, rodovia_id, km_inicial, km_final")
              .eq("id", int.ficha_cilindros_id)
              .single();
            return { ...int, ficha_cilindros: cilindro };
          }
          return { ...int, ficha_cilindros: null };
        })
      );

      setIntervencoes(intervencoesFull as IntervencaoCilindro[]);

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
        .from("ficha_cilindros_intervencoes")
        .update({ pendente_aprovacao_coordenador: false })
        .in("id", Array.from(selectedIntervencoes));

      if (error) throw error;

      toast.success(`${selectedIntervencoes.size} intervenção(ões) enviada(s) ao coordenador!`);
      setSelectedIntervencoes(new Set());
      loadData();
    } catch (error: any) {
      toast.error("Erro ao enviar intervenções: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!intervencaoToDelete) return;

    try {
      const { error } = await supabase
        .from("ficha_cilindros_intervencoes")
        .delete()
        .eq("id", intervencaoToDelete);

      if (error) throw error;

      toast.success("Intervenção excluída com sucesso!");
      
      // Recarregar dados usando a mesma lógica do useEffect inicial
      const { data: intervencoesData, error: reloadError } = await supabase
        .from("ficha_cilindros_intervencoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_intervencao", { ascending: false });

      if (reloadError) throw reloadError;

      // Para cada intervenção com FK, buscar dados do cilindro
      const intervencoesFull = await Promise.all(
        (intervencoesData || []).map(async (int) => {
          if (int.ficha_cilindros_id) {
            const { data: cilindro } = await supabase
              .from("ficha_cilindros")
              .select("id, lote_id, rodovia_id, km_inicial, km_final")
              .eq("id", int.ficha_cilindros_id)
              .single();
            return { ...int, ficha_cilindros: cilindro };
          }
          return { ...int, ficha_cilindros: null };
        })
      );

      setIntervencoes(intervencoesFull as IntervencaoCilindro[]);
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
        .from("ficha_cilindros_intervencoes")
        .update({
          data_intervencao: intervencaoToEdit.data_intervencao,
          motivo: intervencaoToEdit.motivo,
          cor_corpo: intervencaoToEdit.cor_corpo,
          cor_refletivo: intervencaoToEdit.cor_refletivo,
          tipo_refletivo: intervencaoToEdit.tipo_refletivo,
          quantidade: intervencaoToEdit.quantidade,
          fora_plano_manutencao: intervencaoToEdit.fora_plano_manutencao,
          justificativa_fora_plano: intervencaoToEdit.justificativa_fora_plano,
        })
        .eq("id", intervencaoToEdit.id);

      if (error) throw error;

      toast.success("Intervenção atualizada com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar intervenção: " + error.message);
    } finally {
      setEditDialogOpen(false);
      setIntervencaoToEdit(null);
    }
  };

  const filteredIntervencoes = showEnviadas 
    ? intervencoes 
    : intervencoes.filter(i => i.pendente_aprovacao_coordenador);

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
          <label htmlFor="show-enviadas-cil" className="text-sm cursor-pointer">
            Mostrar intervenções enviadas
          </label>
          <input
            type="checkbox"
            id="show-enviadas-cil"
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Minhas Intervenções em Cilindros</CardTitle>
            <CardDescription>
              Histórico de intervenções em cilindros delimitadores registradas
            </CardDescription>
          </div>
          <Button onClick={() => setNovaIntervencaoOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Nova
          </Button>
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
                    <TableHead>Motivo</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Cor Corpo</TableHead>
                    <TableHead>Cor Refletivo</TableHead>
                    <TableHead>Tipo Refletivo</TableHead>
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
                          disabled={!intervencao.pendente_aprovacao_coordenador}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(intervencao.data_intervencao), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {intervencao.ficha_cilindros && lotes[intervencao.ficha_cilindros.lote_id] || "-"}
                      </TableCell>
                      <TableCell>
                        {intervencao.ficha_cilindros && rodovias[intervencao.ficha_cilindros.rodovia_id] || "-"}
                      </TableCell>
                      <TableCell>
                        {intervencao.ficha_cilindros 
                          ? `${intervencao.ficha_cilindros.km_inicial.toFixed(3)} - ${intervencao.ficha_cilindros.km_final.toFixed(3)}`
                          : "-"}
                      </TableCell>
                      <TableCell>{intervencao.motivo}</TableCell>
                      <TableCell>{intervencao.quantidade || "-"}</TableCell>
                      <TableCell>{intervencao.cor_corpo || "-"}</TableCell>
                      <TableCell>{intervencao.cor_refletivo || "-"}</TableCell>
                      <TableCell>{intervencao.tipo_refletivo || "-"}</TableCell>
                      <TableCell>
                        {intervencao.pendente_aprovacao_coordenador ? (
                          <Badge variant="outline" className="bg-yellow-50">Pendente</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50">Aprovada</Badge>
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
            <DialogTitle>Editar Intervenção em Cilindros</DialogTitle>
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
                  <Label>Motivo (SNV)</Label>
                  <Input
                    value={intervencaoToEdit.motivo}
                    onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, motivo: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Cor Corpo</Label>
                  <Select
                    value={intervencaoToEdit.cor_corpo || ""}
                    onValueChange={(value) => setIntervencaoToEdit({...intervencaoToEdit, cor_corpo: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Branco">Branco</SelectItem>
                      <SelectItem value="Amarelo">Amarelo</SelectItem>
                      <SelectItem value="Laranja">Laranja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cor Refletivo</Label>
                  <Select
                    value={intervencaoToEdit.cor_refletivo || ""}
                    onValueChange={(value) => setIntervencaoToEdit({...intervencaoToEdit, cor_refletivo: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Branco">Branco</SelectItem>
                      <SelectItem value="Amarelo">Amarelo</SelectItem>
                      <SelectItem value="Laranja">Laranja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo Refletivo</Label>
                  <Select
                    value={intervencaoToEdit.tipo_refletivo || ""}
                    onValueChange={(value) => setIntervencaoToEdit({...intervencaoToEdit, tipo_refletivo: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta Intensidade">Alta Intensidade</SelectItem>
                      <SelectItem value="Grau Engenharia">Grau Engenharia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={intervencaoToEdit.quantidade || ""}
                  onChange={(e) => setIntervencaoToEdit({...intervencaoToEdit, quantidade: e.target.value ? parseInt(e.target.value) : null})}
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
            <DialogTitle>Registrar Nova Intervenção em Cilindros</DialogTitle>
          </DialogHeader>
          <IntervencoesCilindrosForm 
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

export default IntervencoesCilindrosContent;
