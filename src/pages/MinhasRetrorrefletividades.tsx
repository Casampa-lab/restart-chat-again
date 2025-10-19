import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Send, Trash2, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";
import logoOperaVia from "@/assets/logo-operavia.png";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RetrorrefletividadeEstatica {
  id: string;
  data_medicao: string;
  km_referencia: number;
  lado: string;
  tipo_dispositivo: string;
  codigo_dispositivo: string | null;
  valor_medido: number | null;
  valor_minimo: number | null;
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

const MinhasRetrorrefletividades = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [medicoesEstaticas, setMedicoesEstaticas] = useState<RetrorrefletividadeEstatica[]>([]);
  const [medicoesDinamicas, setMedicoesDinamicas] = useState<RetrorrefletividadeDinamica[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedMedicoesEstaticas, setSelectedMedicoesEstaticas] = useState<Set<string>>(new Set());
  const [selectedMedicoesDinamicas, setSelectedMedicoesDinamicas] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicaoToDelete, setMedicaoToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'estatica' | 'dinamica'>('estatica');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [medicaoEstaticaToEdit, setMedicaoEstaticaToEdit] = useState<RetrorrefletividadeEstatica | null>(null);
  const [medicaoDinamicaToEdit, setMedicaoDinamicaToEdit] = useState<RetrorrefletividadeDinamica | null>(null);
  const [showEnviadasEstaticas, setShowEnviadasEstaticas] = useState(true);
  const [showEnviadasDinamicas, setShowEnviadasDinamicas] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [estaticasRes, dinamicasRes, lotesRes, rodoviasRes] = await Promise.all([
        supabase.from("retrorrefletividade_estatica").select("*").eq("user_id", user.id).order("data_medicao", { ascending: false }),
        supabase.from("retrorrefletividade_dinamica").select("*").eq("user_id", user.id).order("data_medicao", { ascending: false }),
        supabase.from("lotes").select("id, numero"),
        supabase.from("rodovias").select("id, codigo")
      ]);

      if (estaticasRes.error) throw estaticasRes.error;
      if (dinamicasRes.error) throw dinamicasRes.error;

      setMedicoesEstaticas(estaticasRes.data || []);
      setMedicoesDinamicas(dinamicasRes.data || []);

      if (lotesRes.data) {
        const lotesMap: Record<string, string> = {};
        lotesRes.data.forEach((lote) => { lotesMap[lote.id] = lote.numero; });
        setLotes(lotesMap);
      }

      if (rodoviasRes.data) {
        const rodoviasMap: Record<string, string> = {};
        rodoviasRes.data.forEach((rodovia) => { rodoviasMap[rodovia.id] = rodovia.codigo; });
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

  const handleToggleSelectEstatica = (id: string) => {
    const newSelection = new Set(selectedMedicoesEstaticas);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedMedicoesEstaticas(newSelection);
  };

  const handleToggleSelectDinamica = (id: string) => {
    const newSelection = new Set(selectedMedicoesDinamicas);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedMedicoesDinamicas(newSelection);
  };

  const handleEnviarEstaticas = async () => {
    if (selectedMedicoesEstaticas.size === 0) {
      toast.error("Selecione pelo menos uma medição para enviar");
      return;
    }

    try {
      const { error } = await supabase
        .from("retrorrefletividade_estatica")
        .update({ enviado_coordenador: true })
        .in("id", Array.from(selectedMedicoesEstaticas));

      if (error) throw error;

      toast.success(`${selectedMedicoesEstaticas.size} medição(ões) enviada(s) ao coordenador!`);
      setSelectedMedicoesEstaticas(new Set());
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao enviar medições: " + error.message);
    }
  };

  const handleEnviarDinamicas = async () => {
    if (selectedMedicoesDinamicas.size === 0) {
      toast.error("Selecione pelo menos uma medição para enviar");
      return;
    }

    try {
      const { error } = await supabase
        .from("retrorrefletividade_dinamica")
        .update({ enviado_coordenador: true })
        .in("id", Array.from(selectedMedicoesDinamicas));

      if (error) throw error;

      toast.success(`${selectedMedicoesDinamicas.size} medição(ões) enviada(s) ao coordenador!`);
      setSelectedMedicoesDinamicas(new Set());
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao enviar medições: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!medicaoToDelete) return;

    try {
      const table = deleteType === 'estatica' ? 'retrorrefletividade_estatica' : 'retrorrefletividade_dinamica';
      const { error } = await supabase.from(table).delete().eq("id", medicaoToDelete);

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

  const handleEditEstatica = async () => {
    if (!medicaoEstaticaToEdit) return;

    try {
      const { error } = await supabase
        .from("retrorrefletividade_estatica")
        .update({
          data_medicao: medicaoEstaticaToEdit.data_medicao,
          km_referencia: medicaoEstaticaToEdit.km_referencia,
          lado: medicaoEstaticaToEdit.lado,
          tipo_dispositivo: medicaoEstaticaToEdit.tipo_dispositivo,
          codigo_dispositivo: medicaoEstaticaToEdit.codigo_dispositivo,
          valor_medido: medicaoEstaticaToEdit.valor_medido,
          valor_minimo: medicaoEstaticaToEdit.valor_minimo,
          situacao: medicaoEstaticaToEdit.situacao,
          observacao: medicaoEstaticaToEdit.observacao,
        })
        .eq("id", medicaoEstaticaToEdit.id);

      if (error) throw error;

      toast.success("Medição atualizada com sucesso!");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar medição: " + error.message);
    } finally {
      setEditDialogOpen(false);
      setMedicaoEstaticaToEdit(null);
    }
  };

  const handleEditDinamica = async () => {
    if (!medicaoDinamicaToEdit) return;

    try {
      const { error } = await supabase
        .from("retrorrefletividade_dinamica")
        .update({
          data_medicao: medicaoDinamicaToEdit.data_medicao,
          km_inicial: medicaoDinamicaToEdit.km_inicial,
          km_final: medicaoDinamicaToEdit.km_final,
          faixa: medicaoDinamicaToEdit.faixa,
          tipo_demarcacao: medicaoDinamicaToEdit.tipo_demarcacao,
          cor: medicaoDinamicaToEdit.cor,
          valor_medido: medicaoDinamicaToEdit.valor_medido,
          valor_minimo: medicaoDinamicaToEdit.valor_minimo,
          situacao: medicaoDinamicaToEdit.situacao,
          velocidade_medicao: medicaoDinamicaToEdit.velocidade_medicao,
          condicao_climatica: medicaoDinamicaToEdit.condicao_climatica,
          observacao: medicaoDinamicaToEdit.observacao,
        })
        .eq("id", medicaoDinamicaToEdit.id);

      if (error) throw error;

      toast.success("Medição atualizada com sucesso!");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar medição: " + error.message);
    } finally {
      setEditDialogOpen(false);
      setMedicaoDinamicaToEdit(null);
    }
  };

  const baseMedicoesEstaticas = showEnviadasEstaticas ? medicoesEstaticas : medicoesEstaticas.filter(m => !m.enviado_coordenador);
  const filteredEstaticasHorizontal = baseMedicoesEstaticas.filter(m => (m as any).tipo_sinalizacao === 'Horizontal');
  const filteredEstaticasVertical = baseMedicoesEstaticas.filter(m => (m as any).tipo_sinalizacao === 'Vertical');
  const filteredDinamicas = showEnviadasDinamicas ? medicoesDinamicas : medicoesDinamicas.filter(m => !m.enviado_coordenador);

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
            <Button variant="navigation" size="sm" onClick={() => navigate("/modo-campo")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>3.1.3 - Minhas Medições de Retrorrefletividade</CardTitle>
            <CardDescription>
              Histórico de medições de retrorrefletividade estática e dinâmica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="estatica" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="estatica">
                  <span className="text-xs font-bold mr-2">3.1.3.1</span>
                  Estática
                </TabsTrigger>
                <TabsTrigger value="dinamica">
                  <span className="text-xs font-bold mr-2">3.1.3.2</span>
                  Dinâmica
                </TabsTrigger>
              </TabsList>

              <TabsContent value="estatica">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label htmlFor="show-enviadas-estaticas" className="text-sm cursor-pointer">
                        Mostrar medições enviadas
                      </label>
                      <input
                        type="checkbox"
                        id="show-enviadas-estaticas"
                        checked={showEnviadasEstaticas}
                        onChange={(e) => setShowEnviadasEstaticas(e.target.checked)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </div>
                    <Button onClick={handleEnviarEstaticas} disabled={selectedMedicoesEstaticas.size === 0}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar {selectedMedicoesEstaticas.size > 0 ? selectedMedicoesEstaticas.size : ''} ao Coordenador
                    </Button>
                  </div>

                  <Tabs defaultValue="horizontal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="horizontal">Sinalização Horizontal</TabsTrigger>
                      <TabsTrigger value="vertical">Sinalização Vertical</TabsTrigger>
                    </TabsList>

                    <TabsContent value="horizontal">
                      {filteredEstaticasHorizontal.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {showEnviadasEstaticas 
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
                                <TableHead>km</TableHead>
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
                              {filteredEstaticasHorizontal.map((medicao) => {
                                const medicaoData = medicao as any;
                                return (
                                  <TableRow key={medicao.id}>
                                    <TableCell>
                                      <input
                                        type="checkbox"
                                        checked={selectedMedicoesEstaticas.has(medicao.id)}
                                        onChange={() => handleToggleSelectEstatica(medicao.id)}
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
                                            setMedicaoEstaticaToEdit(medicao);
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
                                            setDeleteType('estatica');
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
                      {filteredEstaticasVertical.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {showEnviadasEstaticas 
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
                                <TableHead>km</TableHead>
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
                              {filteredEstaticasVertical.map((medicao) => (
                                <TableRow key={medicao.id}>
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedMedicoesEstaticas.has(medicao.id)}
                                      onChange={() => handleToggleSelectEstatica(medicao.id)}
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
                                          setMedicaoEstaticaToEdit(medicao);
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
                                          setDeleteType('estatica');
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
                </div>
              </TabsContent>

              <TabsContent value="dinamica">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label htmlFor="show-enviadas-dinamicas" className="text-sm cursor-pointer">
                        Mostrar medições enviadas
                      </label>
                      <input
                        type="checkbox"
                        id="show-enviadas-dinamicas"
                        checked={showEnviadasDinamicas}
                        onChange={(e) => setShowEnviadasDinamicas(e.target.checked)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </div>
                    <Button onClick={handleEnviarDinamicas} disabled={selectedMedicoesDinamicas.size === 0}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar {selectedMedicoesDinamicas.size > 0 ? selectedMedicoesDinamicas.size : ''} ao Coordenador
                    </Button>
                  </div>

                  {filteredDinamicas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {showEnviadasDinamicas ? "Nenhuma medição registrada ainda." : "Nenhuma medição não enviada"}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Sel.</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>km Inicial</TableHead>
                            <TableHead>km Final</TableHead>
                            <TableHead>FAIXA</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cor</TableHead>
                            <TableHead>Valor Medido</TableHead>
                            <TableHead>Valor Mín</TableHead>
                            <TableHead>Situação</TableHead>
                            <TableHead>Velocidade</TableHead>
                            <TableHead>Cond. Climática</TableHead>
                            <TableHead>Observação</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDinamicas.map((medicao) => (
                            <TableRow key={medicao.id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedMedicoesDinamicas.has(medicao.id)}
                                  onChange={() => handleToggleSelectDinamica(medicao.id)}
                                  disabled={medicao.enviado_coordenador}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                              </TableCell>
                              <TableCell>
                                {format(new Date(medicao.data_medicao), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>{medicao.km_inicial.toFixed(3)}</TableCell>
                              <TableCell>{medicao.km_final.toFixed(3)}</TableCell>
                              <TableCell>{medicao.faixa}</TableCell>
                              <TableCell>{medicao.tipo_demarcacao}</TableCell>
                              <TableCell>{medicao.cor}</TableCell>
                              <TableCell>{medicao.valor_medido.toFixed(1)}</TableCell>
                              <TableCell>{medicao.valor_minimo.toFixed(1)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  medicao.situacao === "Conforme"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                }`}>
                                  {medicao.situacao}
                                </span>
                              </TableCell>
                              <TableCell>{medicao.velocidade_medicao?.toFixed(1) || "-"}</TableCell>
                              <TableCell>{medicao.condicao_climatica || "-"}</TableCell>
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
                                      setMedicaoDinamicaToEdit(medicao);
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
                                      setDeleteType('dinamica');
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
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
          {medicaoEstaticaToEdit && (
            <div className="space-y-4">
              <div>
                <Label>Data de Medição</Label>
                <Input
                  type="date"
                  value={medicaoEstaticaToEdit.data_medicao}
                  onChange={(e) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, data_medicao: e.target.value})}
                />
              </div>
              <div>
                <Label>km de Referência</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={medicaoEstaticaToEdit.km_referencia}
                  onChange={(e) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, km_referencia: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label>Lado</Label>
                <Select
                  value={medicaoEstaticaToEdit.lado}
                  onValueChange={(value) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, lado: value})}
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
                  value={medicaoEstaticaToEdit.tipo_dispositivo}
                  onChange={(e) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, tipo_dispositivo: e.target.value})}
                />
              </div>
              <div>
                <Label>Código do Dispositivo</Label>
                <Input
                  value={medicaoEstaticaToEdit.codigo_dispositivo || ""}
                  onChange={(e) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, codigo_dispositivo: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Medido</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={medicaoEstaticaToEdit.valor_medido}
                    onChange={(e) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, valor_medido: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Valor Mínimo</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={medicaoEstaticaToEdit.valor_minimo}
                    onChange={(e) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, valor_minimo: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label>Situação</Label>
                <Select
                  value={medicaoEstaticaToEdit.situacao}
                  onValueChange={(value) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, situacao: value})}
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
                  value={medicaoEstaticaToEdit.observacao || ""}
                  onChange={(e) => setMedicaoEstaticaToEdit({...medicaoEstaticaToEdit, observacao: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditEstatica}>Salvar</Button>
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

export default MinhasRetrorrefletividades;
