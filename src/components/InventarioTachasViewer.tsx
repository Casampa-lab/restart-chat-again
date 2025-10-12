import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Eye, Calendar, Library, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedTacha, setSelectedTacha] = useState<FichaTacha | null>(null);
  const [intervencoes, setIntervencoes] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
        .select("*", { count: "exact" })
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .range(0, 9999);

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

  // Função para ordenar dados
  const sortedTachas = tachas ? [...tachas].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof FichaTacha];
    let bVal: any = b[sortColumn as keyof FichaTacha];
    
    if (aVal == null) aVal = "";
    if (bVal == null) bVal = "";
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  }) : [];

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Inventário de Tachas
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/minhas-necessidades?tipo=tachas")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Ver Necessidades
            </Button>
          </div>
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
          ) : sortedTachas && sortedTachas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("snv")}
                      >
                        <div className="flex items-center">
                          SNV
                          <SortIcon column="snv" />
                        </div>
                      </TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("corpo")}
                      >
                        <div className="flex items-center">
                          Corpo
                          <SortIcon column="corpo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("refletivo")}
                      >
                        <div className="flex items-center">
                          Refletivo
                          <SortIcon column="refletivo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("cor_refletivo")}
                      >
                        <div className="flex items-center">
                          Cor Refletivo
                          <SortIcon column="cor_refletivo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("km_inicial")}
                      >
                        <div className="flex items-center">
                          Km Inicial
                          <SortIcon column="km_inicial" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("extensao_km")}
                      >
                        <div className="flex items-center">
                          Extensão (km)
                          <SortIcon column="extensao_km" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("local_implantacao")}
                      >
                        <div className="flex items-center">
                          Local
                          <SortIcon column="local_implantacao" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("espacamento_m")}
                      >
                        <div className="flex items-center">
                          Espaçamento (m)
                          <SortIcon column="espacamento_m" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("quantidade")}
                      >
                        <div className="flex items-center">
                          Quantidade
                          <SortIcon column="quantidade" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTachas.map((tacha) => (
                      <TableRow key={tacha.id} className="hover:bg-muted/50">
                        {searchLat && searchLng && (
                          <TableCell>
                            <Badge variant="secondary">
                              {(tacha as any).distance?.toFixed(1)}m
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-sm">{tacha.snv || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{tacha.descricao || "Tacha bidirecional"}</TableCell>
                        <TableCell>{tacha.corpo || "-"}</TableCell>
                        <TableCell>{tacha.refletivo || "-"}</TableCell>
                        <TableCell>{tacha.cor_refletivo || "-"}</TableCell>
                        <TableCell>{tacha.km_inicial.toFixed(2)}</TableCell>
                        <TableCell>{tacha.extensao_km?.toFixed(2) || "-"}</TableCell>
                        <TableCell>{tacha.local_implantacao || "-"}</TableCell>
                        <TableCell>{tacha.espacamento_m || "-"}</TableCell>
                        <TableCell>{tacha.quantidade}</TableCell>
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

          {sortedTachas && sortedTachas.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {sortedTachas.length} {sortedTachas.length === 1 ? "tacha encontrada" : "tachas encontradas"}
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
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                {/* Identificação */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Identificação</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">BR:</span>
                      <p className="text-sm">
                        {selectedTacha.snv ? `BR-${selectedTacha.snv.split('BMG')[0]}` : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SNV:</span>
                      <p className="text-sm">{selectedTacha.snv || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                      <p className="text-sm">{selectedTacha.descricao || "Tacha bidirecional"}</p>
                    </div>
                  </div>
                </div>

                {/* Características */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Características</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Corpo:</span>
                      <p className="text-sm">{selectedTacha.corpo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Refletivo:</span>
                      <p className="text-sm">{selectedTacha.refletivo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Cor do Refletivo:</span>
                      <p className="text-sm">{selectedTacha.cor_refletivo || "Não informado"}</p>
                    </div>
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
                      <span className="text-sm font-medium text-muted-foreground">KM Inicial:</span>
                      <p className="text-sm">{selectedTacha.km_inicial.toFixed(2)}</p>
                    </div>
                    {selectedTacha.latitude_inicial && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Latitude:</span>
                        <p className="text-sm font-mono text-xs">{selectedTacha.latitude_inicial.toFixed(6)}</p>
                      </div>
                    )}
                    {selectedTacha.longitude_inicial && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Longitude:</span>
                        <p className="text-sm font-mono text-xs">{selectedTacha.longitude_inicial.toFixed(6)}</p>
                      </div>
                    )}
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
                      <span className="text-sm font-medium text-muted-foreground">KM Final:</span>
                      <p className="text-sm">{selectedTacha.km_final.toFixed(2)}</p>
                    </div>
                    {selectedTacha.latitude_final && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Latitude:</span>
                        <p className="text-sm font-mono text-xs">{selectedTacha.latitude_final.toFixed(6)}</p>
                      </div>
                    )}
                    {selectedTacha.longitude_final && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Longitude:</span>
                        <p className="text-sm font-mono text-xs">{selectedTacha.longitude_final.toFixed(6)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dimensões e Quantidade */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Dimensões e Quantidade</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Extensão (km):</span>
                      <p className="text-sm">{selectedTacha.extensao_km?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Local Implantação:</span>
                      <p className="text-sm">{selectedTacha.local_implantacao || "Não informado"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Espaçamento (m):</span>
                      <p className="text-sm">{selectedTacha.espacamento_m || "Não informado"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Quantidade:</span>
                      <p className="text-sm font-semibold">{selectedTacha.quantidade} und</p>
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data da Vistoria
                  </h3>
                  <p className="text-sm">
                    {new Date(selectedTacha.data_vistoria).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Observações */}
                {selectedTacha.observacao && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Observações</h3>
                    <p className="text-sm whitespace-pre-wrap">{selectedTacha.observacao}</p>
                  </div>
                )}
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
