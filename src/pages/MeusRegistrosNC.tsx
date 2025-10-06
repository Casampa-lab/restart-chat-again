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

interface RegistroNC {
  id: string;
  numero_registro: string;
  data_registro: string;
  km_inicial: number;
  km_final: number;
  tipo_obra: string;
  natureza: string;
  grau: string;
  problema_identificado: string;
  supervisora: string;
  construtora: string;
}

interface Foto {
  ordem: number;
  foto_url: string;
  snv: string | null;
  km: number | null;
  sentido: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
}

export default function MeusRegistrosNC() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<RegistroNC[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroNC | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("registro_nc")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar registros: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (registro: RegistroNC) => {
    try {
      const { data, error } = await supabase
        .from("registro_nc_fotos")
        .select("*")
        .eq("registro_nc_id", registro.id)
        .order("ordem");

      if (error) throw error;
      setFotos(data || []);
      setSelectedRegistro(registro);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error("Erro ao carregar fotos: " + error.message);
    }
  };

  const getGrauColor = (grau: string) => {
    switch (grau) {
      case "Leve": return "bg-blue-500";
      case "Média": return "bg-yellow-500";
      case "Grave": return "bg-orange-500";
      case "Gravíssima": return "bg-red-500";
      default: return "bg-gray-500";
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
            <CardTitle>Meus Registros de Não Conformidade (3.1.18)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : registros.length === 0 ? (
              <p className="text-muted-foreground">Nenhum registro encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Natureza</TableHead>
                      <TableHead>Grau</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registros.map((registro) => (
                      <TableRow key={registro.id}>
                        <TableCell className="font-medium">{registro.numero_registro}</TableCell>
                        <TableCell>
                          {new Date(registro.data_registro).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {registro.km_inicial} - {registro.km_final}
                        </TableCell>
                        <TableCell>{registro.tipo_obra}</TableCell>
                        <TableCell>{registro.natureza}</TableCell>
                        <TableCell>
                          <Badge className={getGrauColor(registro.grau)}>
                            {registro.grau}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(registro)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRegistro?.numero_registro} - Detalhes
            </DialogTitle>
          </DialogHeader>

          {selectedRegistro && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">Data:</p>
                  <p>{new Date(selectedRegistro.data_registro).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">KM:</p>
                  <p>{selectedRegistro.km_inicial} ao {selectedRegistro.km_final}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Tipo de Obra:</p>
                  <p>{selectedRegistro.tipo_obra}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Natureza:</p>
                  <p>{selectedRegistro.natureza}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Grau:</p>
                  <Badge className={getGrauColor(selectedRegistro.grau)}>
                    {selectedRegistro.grau}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold">Supervisora:</p>
                  <p>{selectedRegistro.supervisora}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Construtora:</p>
                  <p>{selectedRegistro.construtora}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Problema Identificado:</p>
                <p className="whitespace-pre-wrap">{selectedRegistro.problema_identificado}</p>
              </div>

              {fotos.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Fotos:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fotos.map((foto) => (
                      <Card key={foto.ordem}>
                        <CardHeader>
                          <img
                            src={foto.foto_url}
                            alt={`Foto ${foto.ordem}`}
                            className="w-full h-48 object-cover rounded"
                          />
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                          {foto.snv && <p><strong>SNV:</strong> {foto.snv}</p>}
                          {foto.km && <p><strong>KM:</strong> {foto.km}</p>}
                          {foto.sentido && <p><strong>Sentido:</strong> {foto.sentido}</p>}
                          {foto.latitude && foto.longitude && (
                            <p><strong>Coordenadas:</strong> {foto.latitude}, {foto.longitude}</p>
                          )}
                          {foto.descricao && (
                            <p className="whitespace-pre-wrap"><strong>Descrição:</strong> {foto.descricao}</p>
                          )}
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
