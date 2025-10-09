import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin, Eye, Image as ImageIcon, Calendar, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FichaPlaca {
  id: string;
  codigo: string | null;
  tipo: string | null;
  modelo: string | null;
  snv: string | null;
  km: number | null;
  latitude: number | null;
  longitude: number | null;
  data_vistoria: string;
  data_implantacao: string | null;
  lado: string | null;
  br: string | null;
  uf: string | null;
  velocidade: string | null;
  foto_frontal_url: string | null;
  foto_lateral_url: string | null;
  foto_posterior_url: string | null;
  foto_base_url: string | null;
  foto_identificacao_url: string | null;
  substrato: string | null;
  pelicula: string | null;
  suporte: string | null;
  dimensoes_mm: string | null;
  retrorrefletividade: number | null;
  
}

interface InventarioPlacasViewerProps {
  loteId: string;
  rodoviaId: string;
}

export function InventarioPlacasViewer({ loteId, rodoviaId }: InventarioPlacasViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlaca, setSelectedPlaca] = useState<FichaPlaca | null>(null);

  const { data: placas, isLoading } = useQuery({
    queryKey: ["inventario-placas", loteId, rodoviaId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("ficha_placa")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .order("km", { ascending: true });

      if (searchTerm) {
        query = query.or(
          `snv.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,tipo.ilike.%${searchTerm}%,br.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FichaPlaca[];
    },
  });

  const openPlacaDetail = (placa: FichaPlaca) => {
    setSelectedPlaca(placa);
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
          {/* Campo de Pesquisa */}
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
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Lado</TableHead>
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
              {searchTerm
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
            <DialogTitle>
              Detalhes da Placa - SNV: {selectedPlaca?.snv || "N/A"}
            </DialogTitle>
          </DialogHeader>

          {selectedPlaca && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="fotos">
                  Fotos ({fotos.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                {/* Identificação */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                      Identificação
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">SNV:</span>
                        <p className="text-sm">{selectedPlaca.snv || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Código:</span>
                        <p className="text-sm">{selectedPlaca.codigo || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Tipo:</span>
                        <p className="text-sm">{selectedPlaca.tipo || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Modelo:</span>
                        <p className="text-sm">{selectedPlaca.modelo || "-"}</p>
                      </div>
                      {selectedPlaca.velocidade && (
                        <div>
                          <span className="text-sm font-medium">Velocidade:</span>
                          <p className="text-sm">{selectedPlaca.velocidade} km/h</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Localização */}
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localização
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">BR:</span>
                        <p className="text-sm">{selectedPlaca.br || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">UF:</span>
                        <p className="text-sm">{selectedPlaca.uf || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">KM:</span>
                        <p className="text-sm">{selectedPlaca.km?.toFixed(2) || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Lado:</span>
                        <p className="text-sm">{selectedPlaca.lado || "-"}</p>
                      </div>
                      {selectedPlaca.latitude && selectedPlaca.longitude && (
                        <div>
                          <span className="text-sm font-medium">Coordenadas:</span>
                          <p className="text-xs">
                            Lat: {selectedPlaca.latitude.toFixed(6)}
                            <br />
                            Lng: {selectedPlaca.longitude.toFixed(6)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Características Técnicas */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Características Técnicas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Substrato:</span>
                        <p className="text-sm">{selectedPlaca.substrato || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Película:</span>
                        <p className="text-sm">{selectedPlaca.pelicula || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Suporte:</span>
                        <p className="text-sm">{selectedPlaca.suporte || "-"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Dimensões:</span>
                        <p className="text-sm">{selectedPlaca.dimensoes_mm || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Retrorrefletividade:</span>
                        <p className="text-sm">
                          {selectedPlaca.retrorrefletividade
                            ? `${selectedPlaca.retrorrefletividade} cd.lux/m²`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Data da Vistoria:</span>
                      <p className="text-sm">
                        {new Date(selectedPlaca.data_vistoria).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {selectedPlaca.data_implantacao && (
                      <div>
                        <span className="text-sm font-medium">Data de Implantação:</span>
                        <p className="text-sm">
                          {new Date(selectedPlaca.data_implantacao).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fotos" className="space-y-4">
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
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma foto disponível para esta placa
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
