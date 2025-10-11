import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Library, Eye, MapPin, Calendar, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Cilindro {
  id: string;
  snv: string | null;
  cor_corpo: string;
  cor_refletivo: string | null;
  tipo_refletivo: string | null;
  km_inicial: number;
  km_final: number;
  latitude_inicial: number | null;
  longitude_inicial: number | null;
  latitude_final: number | null;
  longitude_final: number | null;
  extensao_km: number | null;
  local_implantacao: string | null;
  espacamento_m: number | null;
  quantidade: number | null;
  observacao: string | null;
  foto_url: string | null;
  data_vistoria: string;
}

interface IntervencaoCilindro {
  id: string;
  data_intervencao: string;
  motivo: string;
  cor_corpo: string | null;
  cor_refletivo: string | null;
  tipo_refletivo: string | null;
  quantidade: number | null;
}

interface InventarioCilindrosViewerProps {
  loteId: string;
  rodoviaId: string;
}

export function InventarioCilindrosViewer({ loteId, rodoviaId }: InventarioCilindrosViewerProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLon, setSearchLon] = useState("");
  const [selectedCilindro, setSelectedCilindro] = useState<Cilindro | null>(null);
  const [intervencoes, setIntervencoes] = useState<IntervencaoCilindro[]>([]);
  const [rodovia, setRodovia] = useState<{ codigo: string } | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Fetch rodovia data
  useQuery({
    queryKey: ["rodovia", rodoviaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rodovias")
        .select("codigo")
        .eq("id", rodoviaId)
        .single();
      setRodovia(data);
      return data;
    },
  });

  const { data: cilindros, isLoading } = useQuery({
    queryKey: ["cilindros", loteId, rodoviaId, searchTerm, searchLat, searchLon],
    queryFn: async () => {
      let query = supabase
        .from("ficha_cilindros")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .order("km_inicial", { ascending: true });

      if (searchTerm) {
        query = query.or(`snv.ilike.%${searchTerm}%,cor_corpo.ilike.%${searchTerm}%,local_implantacao.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("Erro ao carregar cilindros");
        throw error;
      }

      // Filter by GPS coordinates if provided
      if (searchLat && searchLon && data) {
        const targetLat = parseFloat(searchLat);
        const targetLon = parseFloat(searchLon);
        
        const filtered = data
          .filter((cilindro: Cilindro) => {
            if (!cilindro.latitude_inicial || !cilindro.longitude_inicial) return false;
            const distance = calculateDistance(
              targetLat,
              targetLon,
              cilindro.latitude_inicial,
              cilindro.longitude_inicial
            );
            return distance <= 50; // 50m radius
          })
          .map((cilindro: Cilindro) => ({
            ...cilindro,
            distance: calculateDistance(
              targetLat,
              targetLon,
              cilindro.latitude_inicial!,
              cilindro.longitude_inicial!
            ),
          }))
          .sort((a, b) => a.distance - b.distance);
        
        return filtered;
      }

      return data || [];
    },
  });

  const handleViewDetails = async (cilindro: Cilindro) => {
    setSelectedCilindro(cilindro);
    const { data } = await supabase
      .from("ficha_cilindros_intervencoes")
      .select("*")
      .eq("ficha_cilindros_id", cilindro.id)
      .order("data_intervencao", { ascending: false });
    setIntervencoes(data || []);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Inventário de Cilindros Delineadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SNV, cor ou local..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                type="number"
                step="0.000001"
                placeholder="Latitude (buscar por GPS)"
                value={searchLat}
                onChange={(e) => setSearchLat(e.target.value)}
              />
              <Input
                type="number"
                step="0.000001"
                placeholder="Longitude (buscar por GPS)"
                value={searchLon}
                onChange={(e) => setSearchLon(e.target.value)}
              />
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {searchLat && searchLon && <TableHead>Distância</TableHead>}
                    <TableHead>SNV</TableHead>
                    <TableHead>Km Inicial</TableHead>
                    <TableHead>Km Final</TableHead>
                    <TableHead>Cor Corpo</TableHead>
                    <TableHead>Cor Refletivo</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Espaçamento (m)</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cilindros && cilindros.length > 0 ? (
                    cilindros.map((cilindro: any) => (
                      <TableRow key={cilindro.id}>
                        {searchLat && searchLon && (
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {cilindro.distance?.toFixed(1)}m
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>{cilindro.snv || "-"}</TableCell>
                        <TableCell>{cilindro.km_inicial?.toFixed(3)}</TableCell>
                        <TableCell>{cilindro.km_final?.toFixed(3)}</TableCell>
                        <TableCell>{cilindro.cor_corpo}</TableCell>
                        <TableCell>{cilindro.cor_refletivo || "-"}</TableCell>
                        <TableCell>{cilindro.quantidade || "-"}</TableCell>
                        <TableCell>{cilindro.espacamento_m || "-"}</TableCell>
                        <TableCell>{new Date(cilindro.data_vistoria).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(cilindro)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={searchLat && searchLon ? 10 : 9} className="text-center text-muted-foreground py-8">
                        Nenhum cilindro cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCilindro} onOpenChange={() => setSelectedCilindro(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ficha de Visualização - Cilindro Delineador</span>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => {
                    toast.info("Funcionalidade em desenvolvimento");
                  }}
                >
                  Registrar Intervenção
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedCilindro(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedCilindro && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="foto">Foto</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                {/* Identificação */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Identificação</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">BR:</span>
                      <p className="text-sm">{rodovia?.codigo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SNV:</span>
                      <p className="text-sm">{selectedCilindro.snv || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Cor (Corpo):</span>
                      <p className="text-sm">{selectedCilindro.cor_corpo}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Local:</span>
                      <p className="text-sm">{selectedCilindro.local_implantacao || "-"}</p>
                    </div>
                  </div>
                </div>
                {/* Características */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Características</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Data Vistoria:</span>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(selectedCilindro.data_vistoria).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Cor (Refletivo):</span>
                      <p className="text-sm">{selectedCilindro.cor_refletivo || "-"}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-muted-foreground">Tipo Refletivo:</span>
                    <p className="text-sm">{selectedCilindro.tipo_refletivo || "-"}</p>
                  </div>
                </div>

                {/* Localização Inicial */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização Inicial
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Km Inicial:</span>
                      <p className="text-sm">{selectedCilindro.km_inicial?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Latitude Inicial:</span>
                      <p className="text-sm">
                        {selectedCilindro.latitude_inicial 
                          ? selectedCilindro.latitude_inicial.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Longitude Inicial:</span>
                      <p className="text-sm">
                        {selectedCilindro.longitude_inicial 
                          ? selectedCilindro.longitude_inicial.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Localização Final */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização Final
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Km Final:</span>
                      <p className="text-sm">{selectedCilindro.km_final?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Latitude Final:</span>
                      <p className="text-sm">
                        {selectedCilindro.latitude_final 
                          ? selectedCilindro.latitude_final.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Longitude Final:</span>
                      <p className="text-sm">
                        {selectedCilindro.longitude_final 
                          ? selectedCilindro.longitude_final.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dimensões e Quantidade */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Dimensões e Quantidade</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Quantidade:</span>
                      <p className="text-sm">{selectedCilindro.quantidade || "-"} unidades</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Extensão (km):</span>
                      <p className="text-sm">{selectedCilindro.extensao_km?.toFixed(3) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Espaçamento (m):</span>
                      <p className="text-sm">{selectedCilindro.espacamento_m || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedCilindro.observacao && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Observações</h3>
                    <p className="text-sm">{selectedCilindro.observacao}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="foto" className="mt-4">
                {selectedCilindro.foto_url ? (
                  <div className="flex justify-center">
                    <img
                      src={supabase.storage.from('cilindros').getPublicUrl(selectedCilindro.foto_url).data.publicUrl}
                      alt="Cilindro"
                      className="rounded-lg max-w-full h-auto"
                    />
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
                            <div className="font-medium">
                              Intervenção #{intervencoes.length - index}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(intervencao.data_intervencao).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <span className="text-sm font-medium">Motivo:</span>
                              <p className="text-sm">{intervencao.motivo}</p>
                            </div>
                            {intervencao.cor_corpo && (
                              <div>
                                <span className="text-sm font-medium">Cor (Corpo):</span>
                                <p className="text-sm">{intervencao.cor_corpo}</p>
                              </div>
                            )}
                            {intervencao.cor_refletivo && (
                              <div>
                                <span className="text-sm font-medium">Cor (Refletivo):</span>
                                <p className="text-sm">{intervencao.cor_refletivo}</p>
                              </div>
                            )}
                            {intervencao.tipo_refletivo && (
                              <div>
                                <span className="text-sm font-medium">Tipo Refletivo:</span>
                                <p className="text-sm">{intervencao.tipo_refletivo}</p>
                              </div>
                            )}
                            {intervencao.quantidade && (
                              <div>
                                <span className="text-sm font-medium">Quantidade:</span>
                                <p className="text-sm">{intervencao.quantidade}</p>
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