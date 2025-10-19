import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  km_final: number | null;
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
    km_final: number;
  } | null;
}

const IntervencoesInscricoesContent = () => {
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoInscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});

  useEffect(() => {
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
                .select("id, lote_id, rodovia_id, km_inicial, km_final")
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
    loadData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Minhas Intervenções em Inscrições</CardTitle>
          <CardDescription>Histórico de intervenções em inscrições registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {intervencoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma intervenção registrada ainda.</div>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Área (m²)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intervencoes.map((int) => {
                    const loteId = int.ficha_inscricoes?.lote_id || "";
                    const rodoviaid = int.ficha_inscricoes?.rodovia_id || "";
                    const kmInicial = int.km_inicial || int.ficha_inscricoes?.km_inicial || 0;
                    const kmFinal = int.km_final || int.ficha_inscricoes?.km_final || 0;
                    return (
                      <TableRow key={int.id}>
                        <TableCell>{format(new Date(int.data_intervencao), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{lotes[loteId] || "-"}</TableCell>
                        <TableCell>{rodovias[rodoviaid] || "-"}</TableCell>
                        <TableCell>{kmInicial.toFixed(3)} - {kmFinal.toFixed(3)}</TableCell>
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
    </div>
  );
};

export default IntervencoesInscricoesContent;
