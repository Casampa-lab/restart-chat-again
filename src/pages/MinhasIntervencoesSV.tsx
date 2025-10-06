import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
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

interface IntervencaoSV {
  id: string;
  data_intervencao: string;
  km_referencia: number;
  tipo_intervencao: string;
  tipo_placa: string;
  codigo_placa: string | null;
  lado: string;
  dimensoes: string | null;
  material: string | null;
  tipo_suporte: string | null;
  estado_conservacao: string;
  quantidade: number;
  observacao: string | null;
  created_at: string;
  lote_id: string;
  rodovia_id: string;
}

const MinhasIntervencoesSV = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoSV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchIntervencoes();
    }
  }, [user]);

  const fetchIntervencoes = async () => {
    try {
      const { data, error } = await supabase
        .from("intervencoes_sv")
        .select("*")
        .eq("user_id", user?.id)
        .order("data_intervencao", { ascending: false });

      if (error) throw error;
      setIntervencoes(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar intervenções: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("intervencoes_sv")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Intervenção excluída com sucesso!");
      setIntervencoes(intervencoes.filter((i) => i.id !== deleteId));
    } catch (error: any) {
      toast.error("Erro ao excluir intervenção: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Minhas Intervenções em SV</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Intervenções Registradas em Sinalização Vertical</CardTitle>
          </CardHeader>
          <CardContent>
            {intervencoes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma intervenção registrada ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Tipo Intervenção</TableHead>
                      <TableHead>Tipo Placa</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Dimensões</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Suporte</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intervencoes.map((intervencao) => (
                      <TableRow key={intervencao.id}>
                        <TableCell>
                          {format(new Date(intervencao.data_intervencao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{intervencao.km_referencia}</TableCell>
                        <TableCell>{intervencao.tipo_intervencao}</TableCell>
                        <TableCell>{intervencao.tipo_placa}</TableCell>
                        <TableCell>{intervencao.codigo_placa || "-"}</TableCell>
                        <TableCell>{intervencao.lado}</TableCell>
                        <TableCell>{intervencao.dimensoes || "-"}</TableCell>
                        <TableCell>{intervencao.material || "-"}</TableCell>
                        <TableCell>{intervencao.tipo_suporte || "-"}</TableCell>
                        <TableCell>{intervencao.estado_conservacao}</TableCell>
                        <TableCell>{intervencao.quantidade}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(intervencao.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
    </div>
  );
};

export default MinhasIntervencoesSV;
