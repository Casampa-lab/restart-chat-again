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

interface FichaMarcaTransversal {
  id: string;
  km: number | null;
  latitude: number | null;
  longitude: number | null;
  data_vistoria: string;
  snv: string | null;
  sigla: string | null;
  descricao: string | null;
  cor: string | null;
  material: string | null;
  outros_materiais: string | null;
  area_m2: number | null;
  espessura_cm: number | null;
  estado_conservacao: string | null;
  observacao: string | null;
  foto_url: string | null;
}

interface InventarioMarcasTransversaisViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (marcaData: any) => void;
}

export function InventarioMarcasTransversaisViewer({ 
  loteId, 
  rodoviaId,
  onRegistrarIntervencao 
}: InventarioMarcasTransversaisViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedMarca, setSelectedMarca] = useState<FichaMarcaTransversal | null>(null);
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
    queryKey: ["inventario-marcas-transversais", loteId, rodoviaId, searchTerm, searchLat, searchLng],
    queryFn: async () => {
      let query = supabase
        .from("ficha_marcas_transversais")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      if (searchTerm) {
        query = query.or(
          `sigla.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,cor.ilike.%${searchTerm}%,material.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data as FichaMarcaTransversal[];

      if (searchLat && searchLng) {
        const lat = parseFloat(searchLat);
        const lng = parseFloat(searchLng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          filteredData = filteredData
            .map((marca) => ({
              ...marca,
              distance: marca.latitude && marca.longitude
                ? calculateDistance(lat, lng, marca.latitude, marca.longitude)
                : Infinity,
            }))
            .filter((marca) => marca.distance <= 50)
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

  const loadIntervencoes = async (marcaId: string) => {
    const { data, error } = await supabase
      .from("ficha_marcas_transversais_intervencoes")
      .select("*")
      .eq("ficha_marcas_transversais_id", marcaId)
      .order("data_intervencao", { ascending: false });

    if (!error && data) {
      setIntervencoes(data);
    }
  };

  const handleViewDetails = async (marca: FichaMarcaTransversal) => {
    setSelectedMarca(marca);
    await loadIntervencoes(marca.id);
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
            Inventário de Marcas Transversais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Pesquisar por tipo, cor ou material..."
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

          {!marcas || marcas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma marca cadastrada neste inventário</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KM</TableHead>
                    <TableHead>SNV</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Área (m²)</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Data Vistoria</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marcas.map((marca) => (
                    <TableRow key={marca.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {marca.km?.toFixed(3) || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{marca.snv || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{marca.sigla || "-"}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{marca.descricao || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{marca.cor || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{marca.area_m2?.toFixed(2) || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            marca.estado_conservacao === "Bom" ? "default" :
                            marca.estado_conservacao === "Regular" ? "secondary" :
                            "destructive"
                          }
                        >
                          {marca.estado_conservacao || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(marca.data_vistoria).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(marca)}
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

      <Dialog open={!!selectedMarca} onOpenChange={() => setSelectedMarca(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Marca Transversal</DialogTitle>
          </DialogHeader>
          
          {selectedMarca && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados da Marca</TabsTrigger>
                <TabsTrigger value="intervencoes">
                  Intervenções ({intervencoes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">KM</label>
                    <p className="font-mono">{selectedMarca.km?.toFixed(3) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SNV</label>
                    <p className="font-mono">{selectedMarca.snv || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sigla</label>
                    <p><Badge>{selectedMarca.sigla || "-"}</Badge></p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                    <p>{selectedMarca.descricao || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cor</label>
                    <p>{selectedMarca.cor || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Material</label>
                    <p>{selectedMarca.material || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Outros Materiais</label>
                    <p>{selectedMarca.outros_materiais || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Área (m²)</label>
                    <p>{selectedMarca.area_m2?.toFixed(2) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Espessura (cm)</label>
                    <p>{selectedMarca.espessura_cm?.toFixed(1) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado de Conservação</label>
                    <p>{selectedMarca.estado_conservacao || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data da Vistoria</label>
                    <p>{new Date(selectedMarca.data_vistoria).toLocaleDateString("pt-BR")}</p>
                  </div>
                  {selectedMarca.latitude && selectedMarca.longitude && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Latitude</label>
                        <p className="font-mono text-sm">{selectedMarca.latitude}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Longitude</label>
                        <p className="font-mono text-sm">{selectedMarca.longitude}</p>
                      </div>
                    </>
                  )}
                </div>

                {selectedMarca.observacao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações</label>
                    <p className="mt-1 text-sm">{selectedMarca.observacao}</p>
                  </div>
                )}

                {selectedMarca.foto_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Foto</label>
                    <img
                      src={selectedMarca.foto_url}
                      alt="Marca Transversal"
                      className="mt-2 rounded-lg max-w-full h-auto"
                    />
                  </div>
                )}

                {onRegistrarIntervencao && (
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => {
                        onRegistrarIntervencao(selectedMarca);
                        setSelectedMarca(null);
                      }}
                      className="w-full"
                    >
                      Registrar Intervenção nesta Marca
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
                            {intervencao.tipo_demarcacao && (
                              <div>
                                <span className="font-medium text-muted-foreground">Tipo:</span>{" "}
                                {intervencao.tipo_demarcacao}
                              </div>
                            )}
                            {intervencao.cor && (
                              <div>
                                <span className="font-medium text-muted-foreground">Cor:</span>{" "}
                                {intervencao.cor}
                              </div>
                            )}
                            {intervencao.material && (
                              <div>
                                <span className="font-medium text-muted-foreground">Material:</span>{" "}
                                {intervencao.material}
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
