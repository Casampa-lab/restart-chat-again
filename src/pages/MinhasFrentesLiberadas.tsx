import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2 } from "lucide-react";
import logoBrLegal from "@/assets/logo-brlegal2.png";


interface FrenteLiberada {
  id: string;
  data_liberacao: string;
  km_inicial: number;
  km_final: number;
  tipo_servico: string;
  responsavel: string;
  observacao: string | null;
  created_at: string;
  rodovia_id: string;
  lote_id: string;
}

const MinhasFrentesLiberadas = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [frentes, setFrentes] = useState<FrenteLiberada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadFrentes = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("frentes_liberadas")
          .select("*")
          .eq("user_id", user.id)
          .order("data_liberacao", { ascending: false });

        if (error) throw error;
        setFrentes(data || []);
      } catch (error) {
        console.error("Erro ao carregar frentes liberadas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFrentes();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

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
            <img src={logoBrLegal} alt="BR-LEGAL 2" className="h-16 object-contain" />
            <Button variant="navigation" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Minhas Frentes Liberadas</CardTitle>
            <CardDescription>
              Histórico de frentes liberadas registradas por você
            </CardDescription>
          </CardHeader>
          <CardContent>
            {frentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma frente liberada registrada ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Liberação</TableHead>
                      <TableHead>KM Inicial</TableHead>
                      <TableHead>KM Final</TableHead>
                      <TableHead>Tipo de Serviço</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {frentes.map((frente) => (
                      <TableRow key={frente.id}>
                        <TableCell>{formatDate(frente.data_liberacao)}</TableCell>
                        <TableCell>{frente.km_inicial.toFixed(3)}</TableCell>
                        <TableCell>{frente.km_final.toFixed(3)}</TableCell>
                        <TableCell>{frente.tipo_servico}</TableCell>
                        <TableCell>{frente.responsavel}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {frente.observacao || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

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

export default MinhasFrentesLiberadas;
