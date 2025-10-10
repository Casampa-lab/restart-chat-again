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
interface FichaMarcaLongitudinal {
  id: string;
  snv: string | null;
  km_inicial: number | null;
  km_final: number | null;
  latitude_inicial: number | null;
  longitude_inicial: number | null;
  latitude_final: number | null;
  longitude_final: number | null;
  data_vistoria: string;
  tipo_demarcacao: string | null;
  cor: string | null;
  largura_cm: number | null;
  extensao_metros: number | null;
  espessura_cm: number | null;
  material: string | null;
  estado_conservacao: string | null;
  observacao: string | null;
  foto_url: string | null;
}

interface InventarioMarcasLongitudinaisViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (marcaData: any) => void;
}

export function InventarioMarcasLongitudinaisViewer({ 
  loteId, 
  rodoviaId,
  onRegistrarIntervencao 
}: InventarioMarcasLongitudinaisViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedMarca, setSelectedMarca] = useState<FichaMarcaLongitudinal | null>(null);
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

  const { data: marcas, isLoading } = useQuery({
    queryKey: ["inventario-marcas-longitudinais", loteId, rodoviaId, searchTerm, searchLat, searchLng],
    queryFn: async () => {
      let query = supabase
        .from("ficha_marcas_longitudinais")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      if (searchTerm) {
        query = query.or(
          `tipo_demarcacao.ilike.%${searchTerm}%,cor.ilike.%${searchTerm}%,material.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data as FichaMarcaLongitudinal[];

      if (searchLat && searchLng) {
        const lat = parseFloat(searchLat);
        const lng = parseFloat(searchLng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          filteredData = filteredData
            .map((marca) => ({
              ...marca,
              distance: marca.latitude_inicial && marca.longitude_inicial
                ? calculateDistance(lat, lng, marca.latitude_inicial, marca.longitude_inicial)
                : Infinity,
            }))
            .filter((marca) => marca.distance <= 50)
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        filteredData = filteredData.sort((a, b) => (a.km_inicial || 0) - (b.km_inicial || 0));
      }

      return filteredData;
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Inventário de Marcas Longitudinais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por tipo, cor ou material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2 text-muted-foreground">
                Buscar por Coordenadas GPS (raio de 50m)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="Latitude"
                  value={searchLat}
                  onChange={(e) => setSearchLat(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="Longitude"
                  value={searchLng}
                  onChange={(e) => setSearchLng(e.target.value)}
                />
              </div>
              {searchLat && searchLng && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchLat("");
                    setSearchLng("");
                  }}
                  className="mt-2 text-xs"
                >
                  Limpar coordenadas
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando inventário...
            </div>
          ) : marcas && marcas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>KM Inicial</TableHead>
                      <TableHead>KM Final</TableHead>
                      <TableHead>Extensão (m)</TableHead>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead>Data Vistoria</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marcas.map((marca) => (
                      <TableRow key={marca.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Badge variant="outline">{marca.tipo_demarcacao || "-"}</Badge>
                        </TableCell>
                        <TableCell>{marca.cor || "-"}</TableCell>
                        <TableCell>{marca.km_inicial?.toFixed(2) || "-"}</TableCell>
                        <TableCell>{marca.km_final?.toFixed(2) || "-"}</TableCell>
                        <TableCell>{marca.extensao_metros?.toFixed(1) || "-"}m</TableCell>
                        {searchLat && searchLng && (
                          <TableCell>
                            <Badge variant="secondary">
                              {(marca as any).distance?.toFixed(1)}m
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          {marca.data_vistoria
                            ? new Date(marca.data_vistoria).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setSelectedMarca(marca);
                              const { data } = await supabase
                                .from("ficha_marcas_longitudinais_intervencoes")
                                .select("*")
                                .eq("ficha_marcas_longitudinais_id", marca.id)
                                .order("data_intervencao", { ascending: false });
                              setIntervencoes(data || []);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || (searchLat && searchLng)
                ? "Nenhuma marca encontrada com esse critério"
                : "Nenhuma marca cadastrada neste inventário"}
            </div>
          )}

          {marcas && marcas.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {marcas.length} {marcas.length === 1 ? "marca encontrada" : "marcas encontradas"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedMarca} onOpenChange={() => setSelectedMarca(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Marca Longitudinal</span>
              <div className="flex gap-2">
                {onRegistrarIntervencao && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      onRegistrarIntervencao(selectedMarca);
                      setSelectedMarca(null);
                    }}
                  >
                    Registrar Intervenção
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMarca(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedMarca && (
            <div className="space-y-6 mt-4">
              {/* Foto */}
              {selectedMarca.foto_url && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                    Fotografia
                  </h3>
                  <div className="flex justify-center">
                    <img
                      src={supabase.storage.from('marcas-longitudinais').getPublicUrl(selectedMarca.foto_url).data.publicUrl}
                      alt="Marca Longitudinal"
                      className="rounded-lg max-w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Identificação */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Identificação</h3>
                <div className="grid grid-cols-3 gap-4">
                  {selectedMarca.snv && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SNV:</span>
                      <p className="text-sm">{selectedMarca.snv}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Tipo de Demarcação:</span>
                    <p className="text-sm">{selectedMarca.tipo_demarcacao || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Cor:</span>
                    <p className="text-sm">{selectedMarca.cor || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Localização */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localização
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">KM Inicial:</span>
                      <p className="text-sm">{selectedMarca.km_inicial?.toFixed(3) || "-"}</p>
                    </div>
                    {selectedMarca.latitude_inicial && selectedMarca.longitude_inicial && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Coordenadas Inicial:</span>
                        <p className="text-xs font-mono">
                          Lat: {selectedMarca.latitude_inicial.toFixed(6)}<br />
                          Lng: {selectedMarca.longitude_inicial.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">KM Final:</span>
                      <p className="text-sm">{selectedMarca.km_final?.toFixed(3) || "-"}</p>
                    </div>
                    {selectedMarca.latitude_final && selectedMarca.longitude_final && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Coordenadas Final:</span>
                        <p className="text-xs font-mono">
                          Lat: {selectedMarca.latitude_final.toFixed(6)}<br />
                          Lng: {selectedMarca.longitude_final.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Características e Dimensões */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Características e Dimensões</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Material:</span>
                    <p className="text-sm">{selectedMarca.material || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Largura da Faixa:</span>
                    <p className="text-sm">{selectedMarca.largura_cm ? `${selectedMarca.largura_cm} cm` : "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Espessura:</span>
                    <p className="text-sm">{selectedMarca.espessura_cm ? `${selectedMarca.espessura_cm} cm` : "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Extensão:</span>
                    <p className="text-sm">{selectedMarca.extensao_metros ? `${selectedMarca.extensao_metros.toFixed(2)} m` : "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Estado de Conservação:</span>
                    <p className="text-sm">{selectedMarca.estado_conservacao || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Data da Vistoria:</span>
                    <p className="text-sm">
                      {new Date(selectedMarca.data_vistoria).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedMarca.observacao && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedMarca.observacao}</p>
                </div>
              )}

              {/* Histórico de Intervenções */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">
                  Histórico de Intervenções ({intervencoes.length})
                </h3>
                {intervencoes.length > 0 ? (
                  <div className="space-y-3">
                    {intervencoes.map((intervencao) => (
                      <div key={intervencao.id} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-sm">{intervencao.motivo}</p>
                          <Badge variant="outline">
                            {new Date(intervencao.data_intervencao).toLocaleDateString("pt-BR")}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          {intervencao.tipo_demarcacao && (
                            <div>
                              <span className="text-muted-foreground">Tipo:</span>{" "}
                              <span className="font-medium">{intervencao.tipo_demarcacao}</span>
                            </div>
                          )}
                          {intervencao.cor && (
                            <div>
                              <span className="text-muted-foreground">Cor:</span>{" "}
                              <span className="font-medium">{intervencao.cor}</span>
                            </div>
                          )}
                          {intervencao.material && (
                            <div>
                              <span className="text-muted-foreground">Material:</span>{" "}
                              <span className="font-medium">{intervencao.material}</span>
                            </div>
                          )}
                          {intervencao.largura_cm && (
                            <div>
                              <span className="text-muted-foreground">Largura:</span>{" "}
                              <span className="font-medium">{intervencao.largura_cm} cm</span>
                            </div>
                          )}
                          {intervencao.espessura_cm && (
                            <div>
                              <span className="text-muted-foreground">Espessura:</span>{" "}
                              <span className="font-medium">{intervencao.espessura_cm} cm</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-muted-foreground text-sm">
                    Nenhuma intervenção registrada
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
