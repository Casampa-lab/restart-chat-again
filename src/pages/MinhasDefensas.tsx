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
import { ArrowLeft, CheckCircle2, XCircle, Send, Trash2 } from "lucide-react";
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


interface Defensa {
  id: string;
  data_inspecao: string;
  km_inicial: number;
  km_final: number;
  lado: string;
  tipo_defensa: string;
  extensao_metros: number;
  estado_conservacao: string;
  tipo_avaria: string | null;
  necessita_intervencao: boolean;
  nivel_risco: string | null;
  observacao: string | null;
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
          .order("data_inspecao", { ascending: false });

        if (defensasError) throw defensasError;

        setDefensas(defensasData || []);

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
        .order("data_inspecao", { ascending: false });
      setDefensas(defensasData || []);
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
        .order("data_inspecao", { ascending: false });
      setDefensas(defensasData || []);
    } catch (error: any) {
      toast.error("Erro ao excluir inspeção: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setDefensaToDelete(null);
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
            <CardTitle>3.1.4 - Minhas Inspeções de Defensas</CardTitle>
            <CardDescription>
              Histórico de inspeções de defensas registradas
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
                      <TableHead>Trecho (KM)</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Extensão</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Avaria</TableHead>
                      <TableHead>Intervenção</TableHead>
                      <TableHead>Risco</TableHead>
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
                          {format(new Date(defensa.data_inspecao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{lotes[defensa.lote_id] || "-"}</TableCell>
                        <TableCell>{rodovias[defensa.rodovia_id] || "-"}</TableCell>
                        <TableCell>
                          {defensa.km_inicial.toFixed(3)} - {defensa.km_final.toFixed(3)}
                        </TableCell>
                        <TableCell>{defensa.lado}</TableCell>
                        <TableCell className="max-w-xs truncate">{defensa.tipo_defensa}</TableCell>
                        <TableCell>{defensa.extensao_metros.toFixed(1)}m</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            ["Ótimo", "Bom"].includes(defensa.estado_conservacao)
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : defensa.estado_conservacao === "Regular"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          }`}>
                            {defensa.estado_conservacao}
                          </span>
                        </TableCell>
                        <TableCell>{defensa.tipo_avaria || "-"}</TableCell>
                        <TableCell>
                          {defensa.necessita_intervencao ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell>{defensa.nivel_risco || "-"}</TableCell>
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

export default MinhasDefensas;
