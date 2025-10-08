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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Retrorrefletividade {
  id: string;
  data_medicao: string;
  km_referencia: number;
  lado: string;
  tipo_dispositivo: string;
  codigo_dispositivo: string | null;
  // Campos legados (antes IN 03/2025)
  valor_medido: number | null;
  valor_minimo: number | null;
  // Novos campos separados por cor de película (IN 03/2025)
  cor_fundo: string | null;
  valor_medido_fundo: number | null;
  valor_minimo_fundo: number | null;
  situacao_fundo: string | null;
  cor_legenda: string | null;
  valor_medido_legenda: number | null;
  valor_minimo_legenda: number | null;
  situacao_legenda: string | null;
  situacao: string;
  observacao: string | null;
  lote_id: string;
  rodovia_id: string;
  enviado_coordenador: boolean;
}

const MinhasRetrorrefletividades = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [medicoes, setMedicoes] = useState<Retrorrefletividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedMedicoes, setSelectedMedicoes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicaoToDelete, setMedicaoToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [medicaoToEdit, setMedicaoToEdit] = useState<Retrorrefletividade | null>(null);
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
        .from("retrorrefletividade_estatica")
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
        .from("retrorrefletividade_estatica")
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
        .from("retrorrefletividade_estatica")
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
        .from("retrorrefletividade_estatica")
        .update({
          data_medicao: medicaoToEdit.data_medicao,
          km_referencia: medicaoToEdit.km_referencia,
          lado: medicaoToEdit.lado,
          tipo_dispositivo: medicaoToEdit.tipo_dispositivo,
          codigo_dispositivo: medicaoToEdit.codigo_dispositivo,
          valor_medido: medicaoToEdit.valor_medido,
          valor_minimo: medicaoToEdit.valor_minimo,
          situacao: medicaoToEdit.situacao,
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

  const filteredMedicoesHorizontal = (showEnviadas
    ? medicoes
    : medicoes.filter(m => !m.enviado_coordenador)
  ).filter(m => (m as any).tipo_sinalizacao === 'Horizontal');

  const filteredMedicoesVertical = (showEnviadas
    ? medicoes
    : medicoes.filter(m => !m.enviado_coordenador)
  ).filter(m => (m as any).tipo_sinalizacao === 'Vertical');

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
              <label htmlFor="show-enviadas-retro" className="text-sm cursor-pointer">
                Mostrar medições enviadas
              </label>
              <input
                type="checkbox"
                id="show-enviadas-retro"
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
            <CardTitle>3.1.3.1 - Minhas Medições de Retrorrefletividade Estática</CardTitle>
            <CardDescription>
              Histórico de medições de retrorrefletividade registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="horizontal" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="horizontal">Sinalização Horizontal</TabsTrigger>
                <TabsTrigger value="vertical">Sinalização Vertical</TabsTrigger>
              </TabsList>

              <TabsContent value="horizontal">
                {filteredMedicoesHorizontal.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {showEnviadas 
                      ? "Nenhuma medição horizontal registrada ainda."
                      : "Nenhuma medição horizontal não enviada"}
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
                          <TableHead>KM</TableHead>
                          <TableHead>Posição</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Média</TableHead>
                          <TableHead>Valor Mín</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMedicoesHorizontal.map((medicao) => {
                          const medicaoData = medicao as any;
                          return (
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
                              <TableCell>{medicao.km_referencia.toFixed(3)}</TableCell>
                              <TableCell>{medicaoData.posicao_horizontal || "-"}</TableCell>
                              <TableCell>{medicaoData.cor_horizontal || "-"}</TableCell>
                              <TableCell>{medicaoData.valor_medido_horizontal?.toFixed(1) || "-"}</TableCell>
                              <TableCell>{medicaoData.valor_minimo_horizontal?.toFixed(1) || "-"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  medicaoData.situacao_horizontal === "Conforme"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                }`}>
                                  {medicaoData.situacao_horizontal}
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
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="vertical">
                {filteredMedicoesVertical.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {showEnviadas 
                      ? "Nenhuma medição vertical registrada ainda."
                      : "Nenhuma medição vertical não enviada"}
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
                          <TableHead>KM</TableHead>
                          <TableHead>Lado</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Fundo</TableHead>
                          <TableHead>Legenda</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMedicoesVertical.map((medicao) => (
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
                        <TableCell>{medicao.km_referencia.toFixed(3)}</TableCell>
                        <TableCell>{medicao.lado}</TableCell>
                        <TableCell className="max-w-xs truncate">{medicao.tipo_dispositivo}</TableCell>
                        <TableCell>{medicao.codigo_dispositivo || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {medicao.valor_medido_fundo !== null ? (
                            <div className="space-y-1">
                              <div className="font-medium">{medicao.cor_fundo || 'N/A'}</div>
                              <div className="text-muted-foreground">
                                {medicao.valor_medido_fundo.toFixed(1)} / {medicao.valor_minimo_fundo?.toFixed(1) || 'N/A'}
                              </div>
                              <div className={`text-xs ${medicao.situacao_fundo === 'Conforme' ? 'text-green-600' : 'text-red-600'}`}>
                                {medicao.situacao_fundo}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              {medicao.valor_medido !== null ? medicao.valor_medido.toFixed(1) : '-'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {medicao.valor_medido_legenda !== null ? (
                            <div className="space-y-1">
                              <div className="font-medium">{medicao.cor_legenda || 'N/A'}</div>
                              <div className="text-muted-foreground">
                                {medicao.valor_medido_legenda.toFixed(1)} / {medicao.valor_minimo_legenda?.toFixed(1) || 'N/A'}
                              </div>
                              <div className={`text-xs ${medicao.situacao_legenda === 'Conforme' ? 'text-green-600' : 'text-red-600'}`}>
                                {medicao.situacao_legenda}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              {medicao.valor_minimo !== null ? medicao.valor_minimo.toFixed(1) : '-'}
                            </div>
                          )}
                        </TableCell>
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
          </TabsContent>
        </Tabs>
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
            <DialogTitle>Editar Medição de Retrorrefletividade</DialogTitle>
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
              <div>
                <Label>KM de Referência</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={medicaoToEdit.km_referencia}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, km_referencia: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Lado</Label>
                <Select
                  value={medicaoToEdit.lado}
                  onValueChange={(value) => setMedicaoToEdit({...medicaoToEdit, lado: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                    <SelectItem value="Direito">Direito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Dispositivo</Label>
                <Input
                  value={medicaoToEdit.tipo_dispositivo}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, tipo_dispositivo: e.target.value})}
                />
              </div>
              <div>
                <Label>Código do Dispositivo</Label>
                <Input
                  value={medicaoToEdit.codigo_dispositivo || ""}
                  onChange={(e) => setMedicaoToEdit({...medicaoToEdit, codigo_dispositivo: e.target.value})}
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
              Críticas e sugestões: <a href="mailto:contato@rodoviasuperv.com.br" className="text-primary hover:underline">contato@rodoviasuperv.com.br</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MinhasRetrorrefletividades;
