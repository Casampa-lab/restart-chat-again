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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import logoBrLegal from "@/assets/logo-brlegal2.png";
import logoGoverno from "@/assets/logo-governo.png";

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
}

const MinhasDefensas = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [defensas, setDefensas] = useState<Defensa[]>([]);
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>3.1.4 - Minhas Inspeções de Defensas</CardTitle>
            <CardDescription>
              Histórico de inspeções de defensas metálicas registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {defensas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma inspeção registrada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Rodovia</TableHead>
                      <TableHead>Trecho (KM)</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Extensão</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Avaria</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Intervenção</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defensas.map((defensa) => (
                      <TableRow key={defensa.id}>
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
                          <Badge variant={
                            defensa.estado_conservacao === "Ótimo" || defensa.estado_conservacao === "Bom" 
                              ? "default" 
                              : defensa.estado_conservacao === "Regular"
                              ? "secondary"
                              : "destructive"
                          }>
                            {defensa.estado_conservacao}
                          </Badge>
                        </TableCell>
                        <TableCell>{defensa.tipo_avaria || "-"}</TableCell>
                        <TableCell>
                          {defensa.nivel_risco && (
                            <Badge variant={
                              defensa.nivel_risco === "Baixo" 
                                ? "default" 
                                : defensa.nivel_risco === "Médio"
                                ? "secondary"
                                : "destructive"
                            }>
                              {defensa.nivel_risco}
                            </Badge>
                          )}
                          {!defensa.nivel_risco && "-"}
                        </TableCell>
                        <TableCell>
                          {defensa.necessita_intervencao ? (
                            <Badge variant="destructive">SIM</Badge>
                          ) : (
                            <Badge variant="outline">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {defensa.observacao || "-"}
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

export default MinhasDefensas;
