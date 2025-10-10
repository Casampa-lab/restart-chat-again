import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

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
  data_intervencao: string;
}

interface InventarioCilindrosViewerProps {
  loteId: string;
  rodoviaId: string;
}

export function InventarioCilindrosViewer({ loteId, rodoviaId }: InventarioCilindrosViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLon, setSearchLon] = useState("");
  const [selectedCilindro, setSelectedCilindro] = useState<Cilindro | null>(null);

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

  const { data: cilindros, isLoading } = useQuery({
    queryKey: ["cilindros", loteId, rodoviaId, searchTerm, searchLat, searchLon],
    queryFn: async () => {
      let query = supabase
        .from("intervencoes_cilindros")
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
        
        return data.filter((cilindro: Cilindro) => {
          if (!cilindro.latitude_inicial || !cilindro.longitude_inicial) return false;
          const distance = calculateDistance(
            targetLat,
            targetLon,
            cilindro.latitude_inicial,
            cilindro.longitude_inicial
          );
          return distance <= 50; // 50m radius
        });
      }

      return data || [];
    },
  });

  const handleViewDetails = (cilindro: Cilindro) => {
    setSelectedCilindro(cilindro);
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
          <CardTitle>Inventário - Cilindros Delimitadores</CardTitle>
          <CardDescription>
            Visualize os cilindros delimitadores cadastrados
          </CardDescription>
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

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SNV</TableHead>
                    <TableHead>KM Inicial</TableHead>
                    <TableHead>KM Final</TableHead>
                    <TableHead>Cor Corpo</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cilindros && cilindros.length > 0 ? (
                    cilindros.map((cilindro: Cilindro) => (
                      <TableRow key={cilindro.id}>
                        <TableCell>{cilindro.snv || "-"}</TableCell>
                        <TableCell>{cilindro.km_inicial?.toFixed(3)}</TableCell>
                        <TableCell>{cilindro.km_final?.toFixed(3)}</TableCell>
                        <TableCell>{cilindro.cor_corpo}</TableCell>
                        <TableCell>{cilindro.quantidade || "-"}</TableCell>
                        <TableCell>{new Date(cilindro.data_intervencao).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(cilindro)}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cilindro Delimitador</DialogTitle>
            <DialogDescription>
              Informações completas do registro
            </DialogDescription>
          </DialogHeader>
          
          {selectedCilindro && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="foto">Foto</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SNV</p>
                  <p className="text-sm">{selectedCilindro.snv || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p className="text-sm">{new Date(selectedCilindro.data_intervencao).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cor (Corpo)</p>
                  <p className="text-sm">{selectedCilindro.cor_corpo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cor (Refletivo)</p>
                  <p className="text-sm">{selectedCilindro.cor_refletivo || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo Refletivo</p>
                  <p className="text-sm">{selectedCilindro.tipo_refletivo || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quantidade</p>
                  <p className="text-sm">{selectedCilindro.quantidade || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">KM Inicial</p>
                  <p className="text-sm">{selectedCilindro.km_inicial?.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">KM Final</p>
                  <p className="text-sm">{selectedCilindro.km_final?.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Extensão (km)</p>
                  <p className="text-sm">{selectedCilindro.extensao_km?.toFixed(3) || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Espaçamento (m)</p>
                  <p className="text-sm">{selectedCilindro.espacamento_m || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Local de Implantação</p>
                  <p className="text-sm">{selectedCilindro.local_implantacao || "-"}</p>
                </div>
                {selectedCilindro.latitude_inicial && selectedCilindro.longitude_inicial && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Latitude Inicial</p>
                      <p className="text-sm">{selectedCilindro.latitude_inicial}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Longitude Inicial</p>
                      <p className="text-sm">{selectedCilindro.longitude_inicial}</p>
                    </div>
                  </>
                )}
                {selectedCilindro.latitude_final && selectedCilindro.longitude_final && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Latitude Final</p>
                      <p className="text-sm">{selectedCilindro.latitude_final}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Longitude Final</p>
                      <p className="text-sm">{selectedCilindro.longitude_final}</p>
                    </div>
                  </>
                )}
                {selectedCilindro.observacao && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Observações</p>
                    <p className="text-sm">{selectedCilindro.observacao}</p>
                  </div>
                )}
              </div>
            </div>
              </TabsContent>

              <TabsContent value="foto" className="mt-4">
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma foto disponível
                </p>
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum histórico disponível para este tipo de inventário
                </p>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}