import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin, Eye, Image as ImageIcon, Calendar, Ruler, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
interface FichaPlaca {
  id: string;
  br: string | null;
  snv: string | null;
  tipo: string | null;
  codigo: string | null;
  velocidade: string | null;
  lado: string | null;
  km: number | null;
  latitude: number | null;
  longitude: number | null;
  suporte: string | null;
  qtde_suporte: number | null;
  substrato: string | null;
  pelicula: string | null;
  dimensoes_mm: string | null;
  area_m2: number | null;
  altura_m: number | null;
  retrorrefletividade: number | null;
  foto_frontal_url: string | null;
  foto_lateral_url: string | null;
  foto_posterior_url: string | null;
  foto_base_url: string | null;
  foto_identificacao_url: string | null;
  data_vistoria: string;
  // Campos do dicionário adicionais
  rodovia_id: string;
  lote_id: string;
}

interface Intervencao {
  id: string;
  data_intervencao: string;
  motivo: string;
  placa_recuperada: boolean;
  suporte: string | null;
  substrato: string | null;
  pelicula: string | null;
  retro_fundo: number | null;
  retro_orla_legenda: number | null;
  created_at: string;
}

interface InventarioPlacasViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (placaData: any) => void;
}

export function InventarioPlacasViewer({ loteId, rodoviaId, onRegistrarIntervencao }: InventarioPlacasViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedPlaca, setSelectedPlaca] = useState<FichaPlaca | null>(null);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);

  // Função para calcular distância entre dois pontos (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distância em metros
  };

  const { data: placas, isLoading } = useQuery({
    queryKey: ["inventario-placas", loteId, rodoviaId, searchTerm, searchLat, searchLng],
    queryFn: async () => {
      let query = supabase
        .from("ficha_placa")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      if (searchTerm) {
        query = query.or(
          `snv.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,tipo.ilike.%${searchTerm}%,br.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data as FichaPlaca[];

      // Filtrar por coordenadas se fornecidas
      if (searchLat && searchLng) {
        const lat = parseFloat(searchLat);
        const lng = parseFloat(searchLng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          filteredData = filteredData
            .map((placa) => ({
              ...placa,
              distance: placa.latitude && placa.longitude
                ? calculateDistance(lat, lng, placa.latitude, placa.longitude)
                : Infinity,
            }))
            .filter((placa) => placa.distance <= 50) // 50 metros de raio
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        // Se não houver busca por coordenadas, ordena por km
        filteredData = filteredData.sort((a, b) => (a.km || 0) - (b.km || 0));
      }

      return filteredData;
    },
  });

  const openPlacaDetail = async (placa: FichaPlaca) => {
    setSelectedPlaca(placa);
    
    // Buscar intervenções vinculadas a esta placa
    const { data, error } = await supabase
      .from("ficha_placa_intervencoes")
      .select("*")
      .eq("ficha_placa_id", placa.id)
      .order("data_intervencao", { ascending: false });
    
    if (!error && data) {
      setIntervencoes(data as Intervencao[]);
    }
  };

  const fotos = selectedPlaca
    ? [
        { label: "Frontal", url: selectedPlaca.foto_frontal_url },
        { label: "Lateral", url: selectedPlaca.foto_lateral_url },
        { label: "Posterior", url: selectedPlaca.foto_posterior_url },
        { label: "Base", url: selectedPlaca.foto_base_url },
        { label: "Identificação", url: selectedPlaca.foto_identificacao_url },
      ].filter((f) => f.url)
    : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Inventário de Placas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campos de Pesquisa */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por SNV, código, tipo ou BR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Busca por Coordenadas GPS */}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2 text-muted-foreground">
                Buscar por Coordenadas GPS (raio de 50m)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="Latitude (ex: -19.924500)"
                  value={searchLat}
                  onChange={(e) => setSearchLat(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="Longitude (ex: -43.935200)"
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

          {/* Resultados */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando inventário...
            </div>
          ) : placas && placas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead>SNV</TableHead>
                      <TableHead>Código da placa</TableHead>
                      <TableHead>Tipo de placa</TableHead>
                      <TableHead>Km</TableHead>
                      <TableHead>Lado</TableHead>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead>Data Vistoria</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {placas.map((placa) => (
                      <TableRow key={placa.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{placa.snv || "-"}</TableCell>
                        <TableCell>{placa.codigo || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{placa.tipo || "-"}</Badge>
                        </TableCell>
                        <TableCell>{placa.km?.toFixed(2) || "-"}</TableCell>
                        <TableCell>{placa.lado || "-"}</TableCell>
                        {searchLat && searchLng && (
                          <TableCell>
                            <Badge variant="secondary">
                              {(placa as any).distance?.toFixed(1)}m
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          {placa.data_vistoria
                            ? new Date(placa.data_vistoria).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPlacaDetail(placa)}
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
                ? "Nenhuma placa encontrada com esse critério"
                : "Nenhuma placa cadastrada neste inventário"}
            </div>
          )}

          {placas && placas.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {placas.length} {placas.length === 1 ? "placa encontrada" : "placas encontradas"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedPlaca} onOpenChange={() => setSelectedPlaca(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Placa - SNV: {selectedPlaca?.snv || "N/A"}</span>
              <div className="flex gap-2">
                {onRegistrarIntervencao && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      onRegistrarIntervencao(selectedPlaca);
                      setSelectedPlaca(null);
                    }}
                  >
                    Registrar Intervenção
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedPlaca(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedPlaca && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                {/* Identificação */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Identificação</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">BR:</span>
                      <p className="text-sm">{selectedPlaca.br || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SNV:</span>
                      <p className="text-sm">{selectedPlaca.snv || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Código da placa:</span>
                      <p className="text-sm">{selectedPlaca.codigo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de placa:</span>
                      <p className="text-sm">{selectedPlaca.tipo || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Velocidade:</span>
                      <p className="text-sm">{selectedPlaca.velocidade || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Lado:</span>
                      <p className="text-sm">{selectedPlaca.lado || "-"}</p>
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
                      <span className="text-sm font-medium text-muted-foreground">Km:</span>
                      <p className="text-sm">{selectedPlaca.km?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Latitude:</span>
                      <p className="text-sm">
                        {selectedPlaca.latitude ? selectedPlaca.latitude.toFixed(6) : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Longitude:</span>
                      <p className="text-sm">
                        {selectedPlaca.longitude ? selectedPlaca.longitude.toFixed(6) : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dimensões */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Dimensões
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Largura (m):</span>
                      <p className="text-sm">{selectedPlaca.dimensoes_mm?.split('x')[0] || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Altura (m):</span>
                      <p className="text-sm">{selectedPlaca.altura_m?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Área (m²):</span>
                      <p className="text-sm">{selectedPlaca.area_m2?.toFixed(2) || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Características do Substrato e Película */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Características do Substrato e Película</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de Substrato:</span>
                      <p className="text-sm">{selectedPlaca.substrato || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de Película:</span>
                      <p className="text-sm">{selectedPlaca.pelicula || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Retrorrefletividade Fundo (cd.lux/m²):</span>
                      <p className="text-sm">{selectedPlaca.retrorrefletividade || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Características do Suporte */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Características do Suporte</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de Suporte:</span>
                      <p className="text-sm">{selectedPlaca.suporte || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Quantidade de Suporte:</span>
                      <p className="text-sm">{selectedPlaca.qtde_suporte || "-"}</p>
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
                    <p className="text-sm">
                      {new Date(selectedPlaca.data_vistoria).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fotos" className="mt-4">
                {fotos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fotos.map((foto, index) => (
                      <div key={index} className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          {foto.label}
                        </h4>
                        <img
                          src={foto.url!}
                          alt={foto.label}
                          className="w-full h-auto rounded-lg border shadow-sm"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma foto disponível
                  </p>
                )}
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                {intervencoes && intervencoes.length > 0 ? (
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
                          {intervencao.placa_recuperada && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Placa Recuperada
                            </Badge>
                          )}
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <span className="text-sm font-medium">Motivo:</span>
                              <p className="text-sm">{intervencao.motivo}</p>
                            </div>
                            {intervencao.suporte && (
                              <div>
                                <span className="text-sm font-medium">Suporte:</span>
                                <p className="text-sm">{intervencao.suporte}</p>
                              </div>
                            )}
                            {intervencao.substrato && (
                              <div>
                                <span className="text-sm font-medium">Substrato:</span>
                                <p className="text-sm">{intervencao.substrato}</p>
                              </div>
                            )}
                            {intervencao.pelicula && (
                              <div>
                                <span className="text-sm font-medium">Película:</span>
                                <p className="text-sm">{intervencao.pelicula}</p>
                              </div>
                            )}
                            {intervencao.retro_fundo && (
                              <div>
                                <span className="text-sm font-medium">Retro Fundo:</span>
                                <p className="text-sm">{intervencao.retro_fundo} cd.lux/m²</p>
                              </div>
                            )}
                            {intervencao.retro_orla_legenda && (
                              <div>
                                <span className="text-sm font-medium">Retro Orla/Legenda:</span>
                                <p className="text-sm">{intervencao.retro_orla_legenda} cd.lux/m²</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma intervenção registrada
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
