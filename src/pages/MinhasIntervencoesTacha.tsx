import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MinhasIntervencoesTacha() {
  const navigate = useNavigate();
  const [intervencoes, setIntervencoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntervencoes();
  }, []);

  const fetchIntervencoes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("intervencoes_tacha")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIntervencoes(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar intervenções: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta intervenção?")) return;

    try {
      const { error } = await supabase
        .from("intervencoes_tacha")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Intervenção excluída com sucesso!");
      fetchIntervencoes();
    } catch (error: any) {
      toast.error("Erro ao excluir intervenção: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Button
          variant="navigation"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Intervenções em Tachas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : intervencoes.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma intervenção registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>KM Inicial</TableHead>
                      <TableHead>KM Final</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Tacha</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intervencoes.map((intervencao) => (
                      <TableRow key={intervencao.id}>
                        <TableCell>
                          {new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{intervencao.km_inicial}</TableCell>
                        <TableCell>{intervencao.km_final}</TableCell>
                        <TableCell>{intervencao.tipo_intervencao}</TableCell>
                        <TableCell>{intervencao.tipo_tacha}</TableCell>
                        <TableCell>{intervencao.cor}</TableCell>
                        <TableCell>{intervencao.lado}</TableCell>
                        <TableCell>{intervencao.quantidade}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(intervencao.id)}
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
    </div>
  );
}
