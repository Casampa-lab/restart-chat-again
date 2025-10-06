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
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import logoBrLegal from "@/assets/logo-brlegal2.png";
import logoGoverno from "@/assets/logo-governo.png";

interface Retrorrefletividade {
  id: string;
  data_medicao: string;
  km_referencia: number;
  lado: string;
  tipo_dispositivo: string;
  codigo_dispositivo: string | null;
  valor_medido: number;
  valor_minimo: number;
  situacao: string;
  observacao: string | null;
  lote_id: string;
  rodovia_id: string;
}

const MinhasRetrorrefletividades = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [medicoes, setMedicoes] = useState<Retrorrefletividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Load retrorrefletividade data
        const { data: medicoesData, error: medicoesError } = await supabase
          .from("retrorrefletividade_estatica")
          .select("*")
          .eq("user_id", user.id)
          .order("data_medicao", { ascending: false });

        if (medicoesError) throw medicoesError;

        setMedicoes(medicoesData || []);

        // Load lotes
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

        // Load rodovias
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
        <Card>
          <CardHeader>
            <CardTitle>3.1.3.1 - Minhas Medições de Retrorrefletividade Estática</CardTitle>
            <CardDescription>
              Histórico de medições de retrorrefletividade registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {medicoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma medição registrada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Rodovia</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Medido</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicoes.map((medicao) => (
                      <TableRow key={medicao.id}>
                        <TableCell>
                          {format(new Date(medicao.data_medicao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{lotes[medicao.lote_id] || "-"}</TableCell>
                        <TableCell>{rodovias[medicao.rodovia_id] || "-"}</TableCell>
                        <TableCell>{medicao.km_referencia.toFixed(3)}</TableCell>
                        <TableCell>{medicao.lado}</TableCell>
                        <TableCell className="max-w-xs truncate">{medicao.tipo_dispositivo}</TableCell>
                        <TableCell>{medicao.codigo_dispositivo || "-"}</TableCell>
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
                        <TableCell className="max-w-xs truncate">
                          {medicao.observacao || "-"}
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
          <div className="flex items-center justify-between gap-4">
            <img src={logoGoverno} alt="Governo Federal - Ministério dos Transportes" className="h-12 object-contain" />
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:cassia.sampaio@dnit.gov.br" className="text-primary hover:underline">cassia.sampaio@dnit.gov.br</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MinhasRetrorrefletividades;
