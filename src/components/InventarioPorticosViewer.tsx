import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin, Eye, Calendar, Library } from "lucide-react";
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
            <Library className="h-5 w-5" />
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
                    <TableHead>Km</TableHead>
                    <TableHead>SNV</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Altura Livre (m)</TableHead>
                    <TableHead>Vão Horizontal</TableHead>
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
            <Tabs defaultValue="gerais" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gerais">Dados Gerais</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
                <TabsTrigger value="historico">
                  Histórico ({intervencoes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gerais" className="space-y-4 mt-4">
                {/* Identificação */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Identificação</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SNV:</span>
                      <p className="text-sm">{selectedPortico.snv || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
                      <p className="text-sm">
                        <Badge variant="outline">{selectedPortico.tipo}</Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Lado:</span>
                      <p className="text-sm">{selectedPortico.lado || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Estado de Conservação:</span>
                      <p className="text-sm">
                        <Badge 
                          variant={
                            selectedPortico.estado_conservacao === "Bom" ? "default" :
                            selectedPortico.estado_conservacao === "Regular" ? "secondary" :
                            "destructive"
                          }
                        >
                          {selectedPortico.estado_conservacao || "-"}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">KM:</span>
                      <p className="text-sm font-mono">{selectedPortico.km?.toFixed(3) || "-"}</p>
                    </div>
                    {selectedPortico.latitude && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Latitude:</span>
                        <p className="text-sm font-mono">{selectedPortico.latitude.toFixed(6)}</p>
                      </div>
                    )}
                    {selectedPortico.longitude && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Longitude:</span>
                        <p className="text-sm font-mono">{selectedPortico.longitude.toFixed(6)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dimensões */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Dimensões</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Altura Livre (m):</span>
                      <p className="text-sm">{selectedPortico.altura_livre_m?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Vão Horizontal (m):</span>
                      <p className="text-sm">{selectedPortico.vao_horizontal_m?.toFixed(2) || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data
                  </h3>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Data da Vistoria:</span>
                    <p className="text-sm">{new Date(selectedPortico.data_vistoria).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                {/* Observações */}
                {selectedPortico.observacao && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Observações</h3>
                    <p className="text-sm">{selectedPortico.observacao}</p>
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

              <TabsContent value="fotos" className="mt-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Fotografia</h3>
                  {selectedPortico.foto_url ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-[400px] bg-muted rounded-lg overflow-hidden">
                        <img
                          src={selectedPortico.foto_url}
                          alt="Foto do Pórtico"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma foto disponível</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                {intervencoes.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">Nenhuma intervenção registrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">
                      Histórico de Intervenções ({intervencoes.length})
                    </h3>
                    <div className="space-y-4">
                      {intervencoes.map((intervencao, index) => (
                        <div key={intervencao.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="default">
                              Intervenção #{intervencoes.length - index}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(intervencao.data_intervencao).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <span className="text-sm font-medium">Motivo:</span>
                              <p className="text-sm">{intervencao.motivo}</p>
                            </div>
                            {intervencao.tipo && (
                              <div>
                                <span className="text-sm font-medium">Tipo:</span>
                                <p className="text-sm">{intervencao.tipo}</p>
                              </div>
                            )}
                            {intervencao.altura_livre_m && (
                              <div>
                                <span className="text-sm font-medium">Altura Livre (m):</span>
                                <p className="text-sm">{intervencao.altura_livre_m}</p>
                              </div>
                            )}
                            {intervencao.vao_horizontal_m && (
                              <div>
                                <span className="text-sm font-medium">Vão Horizontal (m):</span>
                                <p className="text-sm">{intervencao.vao_horizontal_m}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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