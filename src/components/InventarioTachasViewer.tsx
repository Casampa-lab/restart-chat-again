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

interface FichaTacha {
  id: string;
  km_inicial: number;
  km_final: number;
  latitude_inicial: number | null;
  longitude_inicial: number | null;
  latitude_final: number | null;
  longitude_final: number | null;
  data_vistoria: string;
  snv: string | null;
  descricao: string | null;
  corpo: string | null;
  refletivo: string | null;
  cor_refletivo: string | null;
  extensao_km: number | null;
  local_implantacao: string | null;
  espacamento_m: number | null;
  quantidade: number;
  observacao: string | null;
  foto_url: string | null;
}

interface InventarioTachasViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (tachaData: any) => void;
}

export function InventarioTachasViewer({ 
  loteId, 
  rodoviaId,
  onRegistrarIntervencao 
}: InventarioTachasViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedTacha, setSelectedTacha] = useState<FichaTacha | null>(null);
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

  const { data: tachas, isLoading } = useQuery({
    queryKey: ["inventario-tachas", loteId, rodoviaId, searchTerm, searchLat, searchLng],
    queryFn: async () => {
      let query = supabase
        .from("ficha_tachas")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      if (searchTerm) {
        query = query.or(
          `snv.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,corpo.ilike.%${searchTerm}%,cor_refletivo.ilike.%${searchTerm}%,local_implantacao.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data as FichaTacha[];

      if (searchLat && searchLng) {
        const lat = parseFloat(searchLat);
        const lng = parseFloat(searchLng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          filteredData = filteredData
            .map((tacha) => ({
              ...tacha,
              distance: tacha.latitude_inicial && tacha.longitude_inicial
                ? calculateDistance(lat, lng, tacha.latitude_inicial, tacha.longitude_inicial)
                : Infinity,
            }))
            .filter((tacha) => tacha.distance <= 50)
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        filteredData = filteredData.sort((a, b) => a.km_inicial - b.km_inicial);
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
            Inventário de Tachas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por SNV, descrição, corpo, cor ou local..."
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
          ) : tachas && tachas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead>SNV</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Corpo</TableHead>
                      <TableHead>Cor do refletivo</TableHead>
                      <TableHead>Km Inicial</TableHead>
                      <TableHead>km Final</TableHead>
                      <TableHead>Local de implantação</TableHead>
                      <TableHead>Quantidade</TableHead>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead>Data Vistoria</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tachas.map((tacha) => (
                      <TableRow key={tacha.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Badge variant="outline">{tacha.snv || "-"}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{tacha.descricao || "-"}</TableCell>
                        <TableCell>{tacha.corpo || "-"}</TableCell>
                        <TableCell>{tacha.cor_refletivo || "-"}</TableCell>
                        <TableCell>{tacha.km_inicial.toFixed(2)}</TableCell>
                        <TableCell>{tacha.km_final.toFixed(2)}</TableCell>
                        <TableCell>{tacha.local_implantacao || "-"}</TableCell>
                        <TableCell>{tacha.quantidade}</TableCell>
                        {searchLat && searchLng && (
                          <TableCell>
                            <Badge variant="secondary">
                              {(tacha as any).distance?.toFixed(1)}m
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          {new Date(tacha.data_vistoria).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setSelectedTacha(tacha);
                              const { data } = await supabase
                                .from("ficha_tachas_intervencoes")
                                .select("*")
                                .eq("ficha_tachas_id", tacha.id)
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
                ? "Nenhuma tacha encontrada com esse critério"
                : "Nenhuma tacha cadastrada neste inventário"}
            </div>
          )}

          {tachas && tachas.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {tachas.length} {tachas.length === 1 ? "tacha encontrada" : "tachas encontradas"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTacha} onOpenChange={() => setSelectedTacha(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Tacha</span>
              <div className="flex gap-2">
                {onRegistrarIntervencao && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      onRegistrarIntervencao(selectedTacha);
                      setSelectedTacha(null);
                    }}
                  >
                    Registrar Intervenção
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedTacha(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedTacha && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="foto">Foto</TabsTrigger>
                <TabsTrigger value="historico">Histórico ({intervencoes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                        Características
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">SNV:</span>
                          <p className="text-sm">{selectedTacha.snv || "-"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Descrição:</span>
                          <p className="text-sm">{selectedTacha.descricao || "-"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Corpo:</span>
                          <p className="text-sm">{selectedTacha.corpo || "-"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Refletivo:</span>
                          <p className="text-sm">{selectedTacha.refletivo || "-"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Cor do Refletivo:</span>
                          <p className="text-sm">{selectedTacha.cor_refletivo || "-"}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Localização
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Local de Implantação:</span>
                          <p className="text-sm">{selectedTacha.local_implantacao || "-"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">KM Inicial:</span>
                          <p className="text-sm">{selectedTacha.km_inicial.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">KM Final:</span>
                          <p className="text-sm">{selectedTacha.km_final.toFixed(2)}</p>
                        </div>
                        {selectedTacha.latitude_inicial && selectedTacha.longitude_inicial && (
                          <div>
                            <span className="text-sm font-medium">Coordenadas Iniciais:</span>
                            <p className="text-xs">
                              Lat: {selectedTacha.latitude_inicial.toFixed(6)}
                              <br />
                              Lng: {selectedTacha.longitude_inicial.toFixed(6)}
                            </p>
                          </div>
                        )}
                        {selectedTacha.latitude_final && selectedTacha.longitude_final && (
                          <div>
                            <span className="text-sm font-medium">Coordenadas Finais:</span>
                            <p className="text-xs">
                              Lat: {selectedTacha.latitude_final.toFixed(6)}
                              <br />
                              Lng: {selectedTacha.longitude_final.toFixed(6)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                      Dimensões e Quantidade
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium">Quantidade:</span>
                        <p className="text-sm">{selectedTacha.quantidade} unidades</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Extensão:</span>
                        <p className="text-sm">{selectedTacha.extensao_km ? `${selectedTacha.extensao_km.toFixed(2)} km` : "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Espaçamento:</span>
                        <p className="text-sm">{selectedTacha.espacamento_m ? `${selectedTacha.espacamento_m}m` : "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data
                    </h3>
                    <div>
                      <span className="text-sm font-medium">Data da Vistoria:</span>
                      <p className="text-sm">
                        {new Date(selectedTacha.data_vistoria).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {selectedTacha.observacao && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                        Observações
                      </h3>
                      <p className="text-sm">{selectedTacha.observacao}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="foto" className="mt-4">
                {selectedTacha.foto_url ? (
                  <div className="flex justify-center">
                    <img
                      src={supabase.storage.from('tachas').getPublicUrl(selectedTacha.foto_url).data.publicUrl}
                      alt="Tacha"
                      className="rounded-lg max-w-full h-auto"
                    />
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma foto disponível
                  </p>
                )}
              </TabsContent>

              <TabsContent value="historico" className="space-y-4 mt-4">
                <h3 className="font-semibold">Histórico de Intervenções</h3>
                {intervencoes.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma intervenção registrada para esta tacha.</p>
                ) : (
                  <div className="space-y-4">
                    {intervencoes.map((intervencao) => (
                      <div key={intervencao.id} className="border rounded-lg p-4">
                        <p><strong>Data:</strong> {new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Motivo:</strong> {intervencao.motivo}</p>
                        {intervencao.quantidade && (
                          <p><strong>Quantidade:</strong> {intervencao.quantidade}</p>
                        )}
                        {intervencao.tipo_tacha && (
                          <p><strong>Tipo:</strong> {intervencao.tipo_tacha}</p>
                        )}
                        {intervencao.cor && (
                          <p><strong>Cor:</strong> {intervencao.cor}</p>
                        )}
                        {intervencao.material && (
                          <p><strong>Material:</strong> {intervencao.material}</p>
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
    </>
  );
}
