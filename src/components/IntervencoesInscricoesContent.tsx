import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import IntervencoesInscricoesForm from "@/components/IntervencoesInscricoesForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
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

interface IntervencaoInscricao {
  id: string;
  data_intervencao: string;
  km_inicial: number | null;
  motivo: string;
  tipo_inscricao: string | null;
  cor: string | null;
  dimensoes: string | null;
  area_m2: number | null;
  material_utilizado: string | null;
  observacao: string | null;
  ficha_inscricoes_id: string | null;
  pendente_aprovacao_coordenador: boolean;
  ficha_inscricoes?: {
    lote_id: string;
    rodovia_id: string;
    km_inicial: number;
  } | null;
}

interface IntervencoesInscricoesContentProps {
  modoOperacao?: 'manutencao' | 'execucao' | null;
}

const IntervencoesInscricoesContent = ({ modoOperacao }: IntervencoesInscricoesContentProps = {}) => {
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoInscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [novaIntervencaoOpen, setNovaIntervencaoOpen] = useState(false);
  const [selectedIntervencoes, setSelectedIntervencoes] = useState<Set<string>>(new Set());
  const [showEnviadas, setShowEnviadas] = useState(true);

  const loadData = async () => {
    if (!user) return;
    try {
      // Buscar TODAS as intervenções do usuário
      const { data: intervencoesData } = await supabase
        .from("ficha_inscricoes_intervencoes")
        .select("*")
        .eq("user_id", user.id)
        .order("data_intervencao", { ascending: false });
      
      // Para cada intervenção com FK, buscar dados da inscrição
      const intervencoesFull = await Promise.all(
        (intervencoesData || []).map(async (int) => {
          if (int.ficha_inscricoes_id) {
            const { data: inscricao } = await supabase
              .from("ficha_inscricoes")
              .select("id, lote_id, rodovia_id, km_inicial")
              .eq("id", int.ficha_inscricoes_id)
              .single();
            return { ...int, ficha_inscricoes: inscricao };
          }
          return { ...int, ficha_inscricoes: null };
        })
      );
      
      setIntervencoes(intervencoesFull);

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
        .from("ficha_inscricoes_intervencoes")
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

  const filteredIntervencoes = showEnviadas 
    ? intervencoes 
    : intervencoes.filter(i => i.pendente_aprovacao_coordenador);

  if (loading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-4">
      {modoOperacao && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Modo selecionado: {modoOperacao === 'manutencao' 
              ? '🟠 Manutenção Rotineira (IN-3)' 
              : '🟢 Execução de Projeto'
            }
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label htmlFor="show-enviadas-insc" className="text-sm cursor-pointer">
            Mostrar intervenções enviadas
          </label>
          <input
            type="checkbox"
            id="show-enviadas-insc"
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
            <CardTitle>Minhas Intervenções em Inscrições</CardTitle>
            <CardDescription>Histórico de intervenções em inscrições registradas</CardDescription>
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
                    <TableHead>KM</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Área (m²)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIntervencoes.map((int) => {
                    const loteId = int.ficha_inscricoes?.lote_id || "";
                    const rodoviaid = int.ficha_inscricoes?.rodovia_id || "";
                    const km = int.km_inicial || int.ficha_inscricoes?.km_inicial || 0;
                    return (
                      <TableRow key={int.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIntervencoes.has(int.id)}
                            onChange={() => handleToggleSelect(int.id)}
                            disabled={!int.pendente_aprovacao_coordenador}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>{format(new Date(int.data_intervencao), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{lotes[loteId] || "-"}</TableCell>
                        <TableCell>{rodovias[rodoviaid] || "-"}</TableCell>
                        <TableCell>{km.toFixed(3)}</TableCell>
                        <TableCell>{int.motivo}</TableCell>
                        <TableCell>{int.tipo_inscricao || "-"}</TableCell>
                        <TableCell>{int.cor || "-"}</TableCell>
                        <TableCell>{int.area_m2?.toFixed(2) || "-"}</TableCell>
                        <TableCell>
                          {int.pendente_aprovacao_coordenador ? 
                            <Badge variant="outline" className="bg-yellow-50">Pendente</Badge> : 
                            <Badge variant="outline" className="bg-green-50">Aprovada</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={novaIntervencaoOpen} onOpenChange={setNovaIntervencaoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Intervenção em Inscrições</DialogTitle>
          </DialogHeader>
          <IntervencoesInscricoesForm 
            modoOperacao={modoOperacao}
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

export default IntervencoesInscricoesContent;
