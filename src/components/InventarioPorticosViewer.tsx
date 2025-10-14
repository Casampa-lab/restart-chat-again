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
import { Search, MapPin, Eye, Calendar, Library, FileText, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList } from "lucide-react";
import { RegistrarItemNaoCadastrado } from "@/components/RegistrarItemNaoCadastrado";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedPortico, setSelectedPortico] = useState<FichaPortico | null>(null);
  const [intervencoes, setIntervencoes] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showRegistrarNaoCadastrado, setShowRegistrarNaoCadastrado] = useState(false);

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
        .select("*", { count: "exact" })
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .range(0, 9999);

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

  // Função para ordenar dados
  const sortedPorticos = porticos ? [...porticos].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof FichaPortico];
    let bVal: any = b[sortColumn as keyof FichaPortico];
    
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Inventário de Pórticos, Semipórticos e Braços Projetados
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-necessidades?tipo=porticos")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Necessidades
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-intervencoes?tab=porticos")}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                Ver Intervenções
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowRegistrarNaoCadastrado(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Item Não Cadastrado
              </Button>
            </div>
          </div>
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
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("snv")}
                    >
                      <div className="flex items-center">
                        SNV
                        <SortIcon column="snv" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("km")}
                    >
                      <div className="flex items-center">
                        Km
                        <SortIcon column="km" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("tipo")}
                    >
                      <div className="flex items-center">
                        Tipo
                        <SortIcon column="tipo" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("altura_livre_m")}
                    >
                      <div className="flex items-center">
                        Altura Livre (m)
                        <SortIcon column="altura_livre_m" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("vao_horizontal_m")}
                    >
                      <div className="flex items-center">
                        Vão Horizontal
                        <SortIcon column="vao_horizontal_m" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("lado")}
                    >
                      <div className="flex items-center">
                        Lado
                        <SortIcon column="lado" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("data_vistoria")}
                    >
                      <div className="flex items-center">
                        Data Vistoria
                        <SortIcon column="data_vistoria" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPorticos.map((portico) => (
                    <TableRow key={portico.id}>
                      <TableCell className="font-mono text-sm">{portico.snv || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {portico.km?.toFixed(3) || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{portico.tipo}</Badge>
                      </TableCell>
                      <TableCell>{portico.altura_livre_m?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{portico.vao_horizontal_m?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{portico.lado || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(portico.data_vistoria).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(portico)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
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

      <Dialog open={showRegistrarNaoCadastrado} onOpenChange={setShowRegistrarNaoCadastrado}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <RegistrarItemNaoCadastrado
              tipo_elemento="porticos"
              loteId={loteId}
              rodoviaId={rodoviaId}
              onSuccess={() => {
                setShowRegistrarNaoCadastrado(false);
                toast.success("Registro enviado para aprovação");
              }}
              onCancel={() => setShowRegistrarNaoCadastrado(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPortico} onOpenChange={() => setSelectedPortico(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Pórtico/Semipórtico/Braço</span>
              <div className="flex gap-2">
                {onRegistrarIntervencao && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      onRegistrarIntervencao(selectedPortico);
                      setSelectedPortico(null);
                    }}
                  >
                    Registrar Intervenção
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedPortico(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
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
                  <div className="grid grid-cols-3 gap-4">
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
                          {intervencao.observacao && (
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-sm font-medium">Observações:</span>
                              <p className="text-sm text-muted-foreground">{intervencao.observacao}</p>
                            </div>
                          )}
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