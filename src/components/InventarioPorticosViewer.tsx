import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin, Eye, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FichaPortico {
  id: string;
  km: number | null;
  latitude: number | null;
  longitude: number | null;
  data_vistoria: string;
  snv: string | null;
  tipo: string;
  altura_livre_m: number | null;
  vao_horizontal_m: number | null;
  lado: string | null;
  estado_conservacao: string | null;
  observacao: string | null;
  foto_url: string | null;
}

interface InventarioPorticosViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (porticoData: any) => void;
}

export function InventarioPorticosViewer({ 
  loteId, 
  rodoviaId,
  onRegistrarIntervencao 
}: InventarioPorticosViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedPortico, setSelectedPortico] = useState<FichaPortico | null>(null);
  const [intervencoes, setIntervencoes] = useState<any[]>([]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const { data: porticos, isLoading } = useQuery({
    queryKey: ["inventario-porticos", loteId, rodoviaId, searchTerm, searchLat, searchLng],
    queryFn: async () => {
      let query = supabase
        .from("ficha_porticos")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      if (searchTerm) {
        query = query.or(
          `tipo.ilike.%${searchTerm}%,snv.ilike.%${searchTerm}%,lado.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data as FichaPortico[];

      if (searchLat && searchLng) {
        const lat = parseFloat(searchLat);
        const lng = parseFloat(searchLng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          filteredData = filteredData
            .map((portico) => ({
              ...portico,
              distance: portico.latitude && portico.longitude
                ? calculateDistance(lat, lng, portico.latitude, portico.longitude)
                : Infinity,
            }))
            .filter((portico) => portico.distance <= 50)
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        filteredData = filteredData.sort((a, b) => {
          const kmA = a.km || 0;
          const kmB = b.km || 0;
          return kmA - kmB;
        });
      }

      return filteredData;
    },
  });

  const loadIntervencoes = async (porticoId: string) => {
    const { data, error } = await supabase
      .from("ficha_porticos_intervencoes")
      .select("*")
      .eq("ficha_porticos_id", porticoId)
      .order("data_intervencao", { ascending: false });

    if (!error && data) {
      setIntervencoes(data);
    }
  };

  const handleViewDetails = async (portico: FichaPortico) => {
    setSelectedPortico(portico);
    await loadIntervencoes(portico.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Inventário de Pórticos, Semipórticos e Braços Projetados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Pesquisar por tipo, SNV ou lado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Buscar por Coordenadas GPS (raio de 50m)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Latitude"
                  value={searchLat}
                  onChange={(e) => setSearchLat(e.target.value)}
                  type="number"
                  step="0.000001"
                />
                <Input
                  placeholder="Longitude"
                  value={searchLng}
                  onChange={(e) => setSearchLng(e.target.value)}
                  type="number"
                  step="0.000001"
                />
              </div>
            </div>
          </div>

          {!porticos || porticos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum pórtico/semipórtico/braço cadastrado neste inventário</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KM</TableHead>
                    <TableHead>SNV</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Altura Livre (m)</TableHead>
                    <TableHead>Vão (m)</TableHead>
                    <TableHead>Lado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Data Vistoria</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porticos.map((portico) => (
                    <TableRow key={portico.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {portico.km?.toFixed(3) || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{portico.snv || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{portico.tipo}</Badge>
                      </TableCell>
                      <TableCell>{portico.altura_livre_m?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{portico.vao_horizontal_m?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{portico.lado || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            portico.estado_conservacao === "Bom" ? "default" :
                            portico.estado_conservacao === "Regular" ? "secondary" :
                            "destructive"
                          }
                        >
                          {portico.estado_conservacao || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(portico.data_vistoria).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(portico)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
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

      <Dialog open={!!selectedPortico} onOpenChange={() => setSelectedPortico(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pórtico/Semipórtico/Braço</DialogTitle>
          </DialogHeader>
          
          {selectedPortico && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="intervencoes">
                  Intervenções ({intervencoes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">KM</label>
                    <p className="font-mono">{selectedPortico.km?.toFixed(3) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SNV</label>
                    <p className="font-mono">{selectedPortico.snv || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                    <p>{selectedPortico.tipo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Lado</label>
                    <p>{selectedPortico.lado || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Altura Livre (m)</label>
                    <p>{selectedPortico.altura_livre_m?.toFixed(2) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Vão Horizontal (m)</label>
                    <p>{selectedPortico.vao_horizontal_m?.toFixed(2) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado de Conservação</label>
                    <p>{selectedPortico.estado_conservacao || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data da Vistoria</label>
                    <p>{new Date(selectedPortico.data_vistoria).toLocaleDateString("pt-BR")}</p>
                  </div>
                  {selectedPortico.latitude && selectedPortico.longitude && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Latitude</label>
                        <p className="font-mono text-sm">{selectedPortico.latitude}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Longitude</label>
                        <p className="font-mono text-sm">{selectedPortico.longitude}</p>
                      </div>
                    </>
                  )}
                </div>

                {selectedPortico.observacao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações</label>
                    <p className="mt-1 text-sm">{selectedPortico.observacao}</p>
                  </div>
                )}

                {selectedPortico.foto_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Foto</label>
                    <img
                      src={supabase.storage.from('porticos').getPublicUrl(selectedPortico.foto_url).data.publicUrl}
                      alt="Pórtico"
                      className="mt-2 rounded-lg max-w-full h-auto"
                    />
                  </div>
                )}

                {onRegistrarIntervencao && (
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => {
                        onRegistrarIntervencao(selectedPortico);
                        setSelectedPortico(null);
                      }}
                      className="w-full"
                    >
                      Registrar Intervenção
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="intervencoes" className="mt-4">
                {intervencoes.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma intervenção registrada
                  </p>
                ) : (
                  <div className="space-y-3">
                    {intervencoes.map((intervencao) => (
                      <Card key={intervencao.id}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Data:</span>{" "}
                              {new Date(intervencao.data_intervencao).toLocaleDateString("pt-BR")}
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Motivo:</span>{" "}
                              {intervencao.motivo}
                            </div>
                            {intervencao.tipo && (
                              <div>
                                <span className="font-medium text-muted-foreground">Tipo:</span>{" "}
                                {intervencao.tipo}
                              </div>
                            )}
                            {intervencao.altura_livre_m && (
                              <div>
                                <span className="font-medium text-muted-foreground">Altura (m):</span>{" "}
                                {intervencao.altura_livre_m}
                              </div>
                            )}
                            {intervencao.vao_horizontal_m && (
                              <div>
                                <span className="font-medium text-muted-foreground">Vão (m):</span>{" "}
                                {intervencao.vao_horizontal_m}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
