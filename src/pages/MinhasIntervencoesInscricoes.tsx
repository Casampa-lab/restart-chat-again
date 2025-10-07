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


interface IntervencaoInscricao {
  id: string;
  data_intervencao: string;
  km_inicial: number;
  km_final: number;
  tipo_intervencao: string;
  tipo_inscricao: string;
  cor: string;
  dimensoes: string | null;
  area_m2: number;
  material_utilizado: string | null;
  observacao: string | null;
  lote_id: string;
  rodovia_id: string;
}

const MinhasIntervencoesInscricoes = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoInscricao[]>([]);
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
        const { data: intervencoesData, error: intervencoesError } = await supabase
          .from("intervencoes_inscricoes")
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
            <CardTitle>3.1.5 - Minhas Intervenções em Inscrições nos Pavimentos</CardTitle>
            <CardDescription>
              Histórico de intervenções em inscrições registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {intervencoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma intervenção registrada ainda.
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
                      <TableHead>Tipo Intervenção</TableHead>
                      <TableHead>Tipo Inscrição</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Dimensões</TableHead>
                      <TableHead>Área (m²)</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intervencoes.map((intervencao) => (
                      <TableRow key={intervencao.id}>
                        <TableCell>
                          {format(new Date(intervencao.data_intervencao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{lotes[intervencao.lote_id] || "-"}</TableCell>
                        <TableCell>{rodovias[intervencao.rodovia_id] || "-"}</TableCell>
                        <TableCell>
                          {intervencao.km_inicial.toFixed(3)} - {intervencao.km_final.toFixed(3)}
                        </TableCell>
                        <TableCell>{intervencao.tipo_intervencao}</TableCell>
                        <TableCell className="max-w-xs truncate">{intervencao.tipo_inscricao}</TableCell>
                        <TableCell>{intervencao.cor}</TableCell>
                        <TableCell>{intervencao.dimensoes || "-"}</TableCell>
                        <TableCell>{intervencao.area_m2.toFixed(2)}</TableCell>
                        <TableCell>{intervencao.material_utilizado || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {intervencao.observacao || "-"}
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

export default MinhasIntervencoesInscricoes;
