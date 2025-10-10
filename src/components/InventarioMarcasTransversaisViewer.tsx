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
  espessura_cm: number | null;
  material: string | null;
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
          `tipo_demarcacao.ilike.%${searchTerm}%,cor.ilike.%${searchTerm}%,material.ilike.%${searchTerm}%`
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
              distance: marca.latitude_inicial && marca.longitude_inicial
                ? calculateDistance(lat, lng, marca.latitude_inicial, marca.longitude_inicial)
                : Infinity,
            }))
            .filter((marca) => marca.distance <= 50)
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        filteredData = filteredData.sort((a, b) => {
          const kmA = a.km_inicial || 0;
          const kmB = b.km_inicial || 0;
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Material</TableHead>
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
                            {marca.km_inicial?.toFixed(3)} - {marca.km_final?.toFixed(3)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{marca.tipo_demarcacao || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{marca.cor || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{marca.material || "-"}</TableCell>
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
                    <label className="text-sm font-medium text-muted-foreground">KM Inicial</label>
                    <p className="font-mono">{selectedMarca.km_inicial?.toFixed(3) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">KM Final</label>
                    <p className="font-mono">{selectedMarca.km_final?.toFixed(3) || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Demarcação</label>
                    <p>{selectedMarca.tipo_demarcacao || "-"}</p>
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
                    <label className="text-sm font-medium text-muted-foreground">Estado de Conservação</label>
                    <p>{selectedMarca.estado_conservacao || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Largura (cm)</label>
                    <p>{selectedMarca.largura_cm || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Espessura (cm)</label>
                    <p>{selectedMarca.espessura_cm || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data da Vistoria</label>
                    <p>{new Date(selectedMarca.data_vistoria).toLocaleDateString("pt-BR")}</p>
                  </div>
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
