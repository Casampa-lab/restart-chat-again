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
import { Search, MapPin, Eye, Calendar, Library, FileText } from "lucide-react";

interface FichaInscricao {
  id: string;
  km_inicial: number | null;
  km_final: number | null;
  latitude_inicial: number | null;
  longitude_inicial: number | null;
  latitude_final: number | null;
  longitude_final: number | null;
  data_vistoria: string;
  tipo_inscricao: string;
  cor: string;
  dimensoes: string | null;
  area_m2: number | null;
  material_utilizado: string | null;
  estado_conservacao: string | null;
  observacao: string | null;
  foto_url: string | null;
  rodovia_id: string;
}

// Mapeamento de siglas para descrições completas (apenas quando não há separador)
const INSCRICAO_SIGLAS: Record<string, string> = {
  'LRV': 'Linha de estímulo a redução de velocidade',
  'PEM': 'Seta indicativa de posicionamento na pista',
  'LDP': 'Linha Dê a preferência',
  'SIP': 'Símbolo indicativo de interseção',
  'LRE': 'Linha de retenção',
  'ZPA': 'Zebrado de área não utilizável',
  'FX': 'Faixa de pedestre',
  'LBO': 'Linha de bordo',
  'LMS': 'Linha de divisão de fluxos opostos',
  'LMC': 'Linha de divisão de fluxos de mesmo sentido',
};

// Função para extrair sigla e descrição do tipo_inscricao
const parseTipoInscricao = (tipoInscricao: string): { sigla: string; descricao: string } => {
  // Primeiro tenta separar por hífen ou espaço
  const parts = tipoInscricao.split(/\s*[-–]\s*/);
  
  // Se conseguiu separar (ex: "LEGENDA - LOMBADA")
  if (parts.length >= 2) {
    const sigla = parts[0].trim();
    const descricao = parts.slice(1).join(' - ').trim();
    return { sigla, descricao };
  }
  
  // Se não tem separador, tenta usar o mapeamento de siglas conhecidas
  const siglaUpper = tipoInscricao.toUpperCase().trim();
  if (INSCRICAO_SIGLAS[siglaUpper]) {
    return { sigla: siglaUpper, descricao: INSCRICAO_SIGLAS[siglaUpper] };
  }
  
  // Caso padrão: retorna o tipo completo como sigla e descrição
  return { sigla: tipoInscricao, descricao: tipoInscricao };
};

interface InventarioInscricoesViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (inscricaoData: any) => void;
}

export function InventarioInscricoesViewer({ 
  loteId, 
  rodoviaId,
  onRegistrarIntervencao 
}: InventarioInscricoesViewerProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedInscricao, setSelectedInscricao] = useState<FichaInscricao | null>(null);
  const [intervencoes, setIntervencoes] = useState<any[]>([]);

  // Buscar informações da rodovia
  const { data: rodovia } = useQuery({
    queryKey: ["rodovia", rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rodovias")
        .select("codigo")
        .eq("id", rodoviaId)
        .single();
      if (error) throw error;
      return data;
    },
  });

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

  const { data: inscricoes, isLoading } = useQuery({
    queryKey: ["inventario-inscricoes", loteId, rodoviaId, searchTerm, searchLat, searchLng],
    queryFn: async () => {
      let query = supabase
        .from("ficha_inscricoes")
        .select("*", { count: "exact" })
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .range(0, 9999);

      if (searchTerm) {
        query = query.or(
          `tipo_inscricao.ilike.%${searchTerm}%,cor.ilike.%${searchTerm}%,material_utilizado.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data as FichaInscricao[];

      if (searchLat && searchLng) {
        const lat = parseFloat(searchLat);
        const lng = parseFloat(searchLng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          filteredData = filteredData
            .map((inscricao) => ({
              ...inscricao,
              distance: inscricao.latitude_inicial && inscricao.longitude_inicial
                ? calculateDistance(lat, lng, inscricao.latitude_inicial, inscricao.longitude_inicial)
                : Infinity,
            }))
            .filter((inscricao) => inscricao.distance <= 50)
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Inventário de Setas, Símbolos e Legendas
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/minhas-necessidades?tipo=marcas_transversais")}
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
          ) : inscricoes && inscricoes.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead>Sigla</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Km</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Área (m²)</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inscricoes.map((inscricao) => {
                      const { sigla, descricao } = parseTipoInscricao(inscricao.tipo_inscricao);
                      return (
                        <TableRow key={inscricao.id} className="hover:bg-muted/50">
                          {searchLat && searchLng && (
                            <TableCell>
                              <Badge variant="secondary">
                                {(inscricao as any).distance?.toFixed(1)}m
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="outline">{sigla}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={descricao}>
                            {descricao}
                          </TableCell>
                          <TableCell>{inscricao.cor}</TableCell>
                          <TableCell>{inscricao.km_inicial?.toFixed(2) || "-"}</TableCell>
                          <TableCell>{inscricao.material_utilizado || "-"}</TableCell>
                          <TableCell>{inscricao.area_m2?.toFixed(2) || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setSelectedInscricao(inscricao);
                                const { data } = await supabase
                                  .from("ficha_inscricoes_intervencoes")
                                  .select("*")
                                  .eq("ficha_inscricoes_id", inscricao.id)
                                  .order("data_intervencao", { ascending: false });
                                setIntervencoes(data || []);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || (searchLat && searchLng)
                ? "Nenhuma inscrição encontrada com esse critério"
                : "Nenhuma inscrição cadastrada neste inventário"}
            </div>
          )}

          {inscricoes && inscricoes.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {inscricoes.length} {inscricoes.length === 1 ? "inscrição encontrada" : "inscrições encontradas"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedInscricao} onOpenChange={() => setSelectedInscricao(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Inscrição</span>
              <div className="flex gap-2">
                {onRegistrarIntervencao && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      onRegistrarIntervencao(selectedInscricao);
                      setSelectedInscricao(null);
                    }}
                  >
                    Registrar Intervenção
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedInscricao(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedInscricao && (() => {
            const { sigla, descricao } = parseTipoInscricao(selectedInscricao.tipo_inscricao);
            return (
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
                        <span className="text-sm font-medium text-muted-foreground">Sigla:</span>
                        <p className="text-sm font-semibold">{sigla}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                        <p className="text-sm">{descricao}</p>
                      </div>
                    </div>
                  </div>

                  {/* Características */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Características</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Cor:</span>
                        <p className="text-sm">{selectedInscricao.cor}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Material:</span>
                        <p className="text-sm">{selectedInscricao.material_utilizado || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                        <p className="text-sm">{selectedInscricao.estado_conservacao || "-"}</p>
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
                        <p className="text-sm">{selectedInscricao.km_inicial?.toFixed(2) || "-"}</p>
                      </div>
                      {selectedInscricao.latitude_inicial && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Latitude:</span>
                          <p className="text-sm font-mono text-xs">{selectedInscricao.latitude_inicial.toFixed(6)}</p>
                        </div>
                      )}
                      {selectedInscricao.longitude_inicial && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Longitude:</span>
                          <p className="text-sm font-mono text-xs">{selectedInscricao.longitude_inicial.toFixed(6)}</p>
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
                        <p className="text-sm">{selectedInscricao.km_final?.toFixed(2) || "-"}</p>
                      </div>
                      {selectedInscricao.latitude_final && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Latitude:</span>
                          <p className="text-sm font-mono text-xs">{selectedInscricao.latitude_final.toFixed(6)}</p>
                        </div>
                      )}
                      {selectedInscricao.longitude_final && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Longitude:</span>
                          <p className="text-sm font-mono text-xs">{selectedInscricao.longitude_final.toFixed(6)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dimensões e Área */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Dimensões e Área</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Dimensões:</span>
                        <p className="text-sm">{selectedInscricao.dimensoes || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Área:</span>
                        <p className="text-sm">{selectedInscricao.area_m2?.toFixed(2) || "-"} m²</p>
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
                      {new Date(selectedInscricao.data_vistoria).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  {/* Observações */}
                  {selectedInscricao.observacao && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Observações</h3>
                      <p className="text-sm whitespace-pre-wrap">{selectedInscricao.observacao}</p>
                    </div>
                  )}
                </TabsContent>

              <TabsContent value="foto" className="mt-4">
                {selectedInscricao.foto_url ? (
                  <div className="flex justify-center">
                    <img
                      src={supabase.storage.from('inscricoes').getPublicUrl(selectedInscricao.foto_url).data.publicUrl}
                      alt="Inscrição"
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
                            {intervencao.tipo_inscricao && (
                              <div>
                                <span className="text-sm font-medium">Tipo:</span>
                                <p className="text-sm">{intervencao.tipo_inscricao}</p>
                              </div>
                            )}
                            {intervencao.cor && (
                              <div>
                                <span className="text-sm font-medium">Cor:</span>
                                <p className="text-sm">{intervencao.cor}</p>
                              </div>
                            )}
                            {intervencao.dimensoes && (
                              <div>
                                <span className="text-sm font-medium">Dimensões:</span>
                                <p className="text-sm">{intervencao.dimensoes}</p>
                              </div>
                            )}
                            {intervencao.area_m2 && (
                              <div>
                                <span className="text-sm font-medium">Área:</span>
                                <p className="text-sm">{intervencao.area_m2} m²</p>
                              </div>
                            )}
                            {intervencao.material_utilizado && (
                              <div>
                                <span className="text-sm font-medium">Material:</span>
                                <p className="text-sm">{intervencao.material_utilizado}</p>
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
          );
        })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
