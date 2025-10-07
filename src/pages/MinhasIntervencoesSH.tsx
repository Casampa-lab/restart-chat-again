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
import { ArrowLeft, Send, Trash2 } from "lucide-react";
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
import logoBrLegal from "@/assets/logo-brlegal2.png";


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

const MinhasIntervencoesSH = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoSH[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedIntervencoes, setSelectedIntervencoes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [intervencaoToDelete, setIntervencaoToDelete] = useState<string | null>(null);
  const [showEnviadas, setShowEnviadas] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const { data: intervencoesData, error: intervencoesError } = await supabase
          .from("intervencoes_sh")
          .select("*")
          .eq("user_id", user.id)
          .order("data_intervencao", { ascending: false });

        if (intervencoesError) throw intervencoesError;

        setIntervencoes(intervencoesData || []);

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

  const filteredIntervencoes = showEnviadas 
    ? intervencoes 
    : intervencoes.filter(i => !i.enviado_coordenador);

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
            <CardTitle>3.1.5 - Minhas Intervenções em Sinalização Horizontal</CardTitle>
            <CardDescription>
              Histórico de intervenções em sinalização horizontal registradas
            </CardDescription>
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
                      <TableHead>Trecho (KM)</TableHead>
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
              Tem certeza que deseja excluir esta intervenção? Esta ação não pode ser desfeita.
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

export default MinhasIntervencoesSH;
