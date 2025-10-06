import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Ficha {
  id: string;
  tipo: string;
  data_verificacao: string;
  contrato: string | null;
  empresa: string | null;
  snv: string | null;
}

interface Item {
  ordem: number;
  foto_url: string;
  latitude: number | null;
  longitude: number | null;
  sentido: string | null;
  km: number | null;
  [key: string]: any;
}

export default function MinhasFichasVerificacao() {
  const navigate = useNavigate();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFicha, setSelectedFicha] = useState<Ficha | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchFichas();
  }, []);

  const fetchFichas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("ficha_verificacao")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFichas(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar fichas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (ficha: Ficha) => {
    try {
      const { data, error } = await supabase
        .from("ficha_verificacao_itens")
        .select("*")
        .eq("ficha_id", ficha.id)
        .order("ordem");

      if (error) throw error;
      setItens(data || []);
      setSelectedFicha(ficha);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error("Erro ao carregar itens: " + error.message);
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
            <CardTitle>Minhas Fichas de Verificação (3.1.19)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : fichas.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma ficha encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>SNV</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fichas.map((ficha) => (
                      <TableRow key={ficha.id}>
                        <TableCell>
                          <Badge variant={ficha.tipo === "Sinalização Horizontal" ? "default" : "secondary"}>
                            {ficha.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(ficha.data_verificacao).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{ficha.empresa || "-"}</TableCell>
                        <TableCell>{ficha.snv || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(ficha)}
                          >
                            <Eye className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFicha?.tipo} - Detalhes
            </DialogTitle>
          </DialogHeader>

          {selectedFicha && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">Data:</p>
                  <p>{new Date(selectedFicha.data_verificacao).toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedFicha.contrato && (
                  <div>
                    <p className="text-sm font-semibold">Contrato:</p>
                    <p>{selectedFicha.contrato}</p>
                  </div>
                )}
                {selectedFicha.empresa && (
                  <div>
                    <p className="text-sm font-semibold">Empresa:</p>
                    <p>{selectedFicha.empresa}</p>
                  </div>
                )}
                {selectedFicha.snv && (
                  <div>
                    <p className="text-sm font-semibold">SNV:</p>
                    <p>{selectedFicha.snv}</p>
                  </div>
                )}
              </div>

              {itens.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Pontos de Verificação:</p>
                  <div className="space-y-4">
                    {itens.map((item) => (
                      <Card key={item.ordem}>
                        <CardHeader>
                          <CardTitle>Ponto {item.ordem}</CardTitle>
                          <img
                            src={item.foto_url}
                            alt={`Ponto ${item.ordem}`}
                            className="w-full h-64 object-cover rounded"
                          />
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {item.km && <p><strong>KM:</strong> {item.km}</p>}
                          {item.sentido && <p><strong>Sentido:</strong> {item.sentido}</p>}
                          {item.latitude && item.longitude && (
                            <p><strong>Coordenadas:</strong> {item.latitude}, {item.longitude}</p>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                            {Object.entries(item)
                              .filter(([key]) => !['ordem', 'foto_url', 'latitude', 'longitude', 'sentido', 'km', 'ficha_id', 'id', 'created_at'].includes(key))
                              .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                              .map(([key, value]) => {
                                if (key.endsWith('_conforme')) return null;
                                if (key.endsWith('_obs') && !value) return null;
                                
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                const conforme = item[`${key}_conforme`];
                                
                                return (
                                  <div key={key} className="border-l-2 border-primary pl-2">
                                    <p className="font-semibold">{label}:</p>
                                    <p>{typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value}</p>
                                    {conforme !== undefined && (
                                      <Badge variant={conforme ? "default" : "destructive"} className="mt-1">
                                        {conforme ? "Conforme" : "Não conforme"}
                                      </Badge>
                                    )}
                                    {item[`${key}_obs`] && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Obs: {item[`${key}_obs`]}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
