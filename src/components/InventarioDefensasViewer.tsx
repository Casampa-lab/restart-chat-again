import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FichaDefensa {
  id: string;
  tipo_defensa: string;
  lado: string;
  km_inicial: number;
  km_final: number;
  extensao_metros: number;
  estado_conservacao: string;
  necessita_intervencao: boolean;
  tipo_avaria?: string;
  nivel_risco?: string;
  observacao?: string;
  data_inspecao: string;
  rodovia_id: string;
  lote_id: string;
}

interface IntervencaoDefensa {
  id: string;
  data_intervencao: string;
  motivo: string;
  extensao_metros?: number;
  tipo_defensa?: string;
  estado_conservacao?: string;
}

interface InventarioDefensasViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (defensa: FichaDefensa) => void;
}

export const InventarioDefensasViewer = ({
  loteId,
  rodoviaId,
  onRegistrarIntervencao,
}: InventarioDefensasViewerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLong, setGpsLong] = useState("");
  const [selectedDefensa, setSelectedDefensa] = useState<FichaDefensa | null>(null);
  const [intervencoes, setIntervencoes] = useState<IntervencaoDefensa[]>([]);

  const { data: defensas, isLoading } = useQuery({
    queryKey: ["inventario-defensas", loteId, rodoviaId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("defensas")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      if (searchTerm) {
        query = query.or(`tipo_defensa.ilike.%${searchTerm}%,lado.ilike.%${searchTerm}%,estado_conservacao.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FichaDefensa[];
    },
    enabled: !!loteId && !!rodoviaId,
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const openDefensaDetail = async (defensa: FichaDefensa) => {
    setSelectedDefensa(defensa);
    
    const { data, error } = await supabase
      .from("defensas")
      .select("*")
      .eq("id", defensa.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar intervenções:", error);
      return;
    }

    setIntervencoes([]);
  };

  const filteredDefensas = gpsLat && gpsLong && defensas
    ? defensas
        .filter((defensa) => {
          const kmMedio = (defensa.km_inicial + defensa.km_final) / 2;
          return true;
        })
        .sort((a, b) => {
          const kmA = (a.km_inicial + a.km_final) / 2;
          const kmB = (b.km_inicial + b.km_final) / 2;
          return kmA - kmB;
        })
    : defensas;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo, lado, estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Latitude"
            value={gpsLat}
            onChange={(e) => setGpsLat(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Longitude"
            value={gpsLong}
            onChange={(e) => setGpsLong(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo Defensa</TableHead>
                <TableHead>Lado</TableHead>
                <TableHead>KM Inicial</TableHead>
                <TableHead>KM Final</TableHead>
                <TableHead>Extensão (m)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Necessita Intervenção</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDefensas?.map((defensa) => (
                <TableRow key={defensa.id}>
                  <TableCell>{defensa.tipo_defensa}</TableCell>
                  <TableCell>{defensa.lado}</TableCell>
                  <TableCell>{defensa.km_inicial}</TableCell>
                  <TableCell>{defensa.km_final}</TableCell>
                  <TableCell>{defensa.extensao_metros}</TableCell>
                  <TableCell>{defensa.estado_conservacao}</TableCell>
                  <TableCell>{defensa.necessita_intervencao ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDefensaDetail(defensa)}
                    >
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedDefensa} onOpenChange={() => setSelectedDefensa(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Defensa</DialogTitle>
          </DialogHeader>

          {selectedDefensa && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="foto">Foto</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Características</h3>
                    <p><strong>Tipo:</strong> {selectedDefensa.tipo_defensa}</p>
                    <p><strong>Lado:</strong> {selectedDefensa.lado}</p>
                    <p><strong>Estado:</strong> {selectedDefensa.estado_conservacao}</p>
                    <p><strong>Necessita Intervenção:</strong> {selectedDefensa.necessita_intervencao ? "Sim" : "Não"}</p>
                    {selectedDefensa.tipo_avaria && (
                      <p><strong>Tipo de Avaria:</strong> {selectedDefensa.tipo_avaria}</p>
                    )}
                    {selectedDefensa.nivel_risco && (
                      <p><strong>Nível de Risco:</strong> {selectedDefensa.nivel_risco}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Localização e Dimensões</h3>
                    <p><strong>KM Inicial:</strong> {selectedDefensa.km_inicial}</p>
                    <p><strong>KM Final:</strong> {selectedDefensa.km_final}</p>
                    <p><strong>Extensão:</strong> {selectedDefensa.extensao_metros} metros</p>
                    <p><strong>Data Inspeção:</strong> {new Date(selectedDefensa.data_inspecao).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                {selectedDefensa.observacao && (
                  <div>
                    <h3 className="font-semibold mb-2">Observações</h3>
                    <p>{selectedDefensa.observacao}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {onRegistrarIntervencao && (
                    <Button onClick={() => {
                      onRegistrarIntervencao(selectedDefensa);
                      setSelectedDefensa(null);
                    }}>
                      Registrar Intervenção
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedDefensa(null)}>
                    Voltar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="foto" className="mt-4">
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma foto disponível
                </p>
              </TabsContent>

              <TabsContent value="historico" className="space-y-4">
                <h3 className="font-semibold">Histórico de Intervenções</h3>
                {intervencoes.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma intervenção registrada para esta defensa.</p>
                ) : (
                  <div className="space-y-4">
                    {intervencoes.map((intervencao) => (
                      <div key={intervencao.id} className="border rounded-lg p-4">
                        <p><strong>Data:</strong> {new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Motivo:</strong> {intervencao.motivo}</p>
                        {intervencao.extensao_metros && (
                          <p><strong>Extensão:</strong> {intervencao.extensao_metros} metros</p>
                        )}
                        {intervencao.tipo_defensa && (
                          <p><strong>Tipo:</strong> {intervencao.tipo_defensa}</p>
                        )}
                        {intervencao.estado_conservacao && (
                          <p><strong>Estado:</strong> {intervencao.estado_conservacao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
