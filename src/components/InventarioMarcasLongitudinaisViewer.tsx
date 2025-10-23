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
import { Search, MapPin, Eye, Calendar, Library, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList, AlertCircle, Filter, CheckCircle, RefreshCw, AlertTriangle, CheckCircle2, Link } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RegistrarItemNaoCadastrado } from "./RegistrarItemNaoCadastrado";
import { ReconciliacaoDrawerUniversal } from "./ReconciliacaoDrawerUniversal";
import { OrigemIndicator } from "@/components/OrigemIndicator";
import { toast } from "sonner";

interface FichaMarcaLongitudinal {
  id: string;
  snv: string | null;
  km_inicial: number | null;
  km_final: number | null;
  latitude_inicial: number | null;
  longitude_inicial: number | null;
  match_decision?: string | null;
  latitude_final: number | null;
  longitude_final: number | null;
  data_vistoria: string;
  tipo_demarcacao: string | null; // Código
  cor: string | null;
  largura_cm: number | null;
  extensao_metros: number | null;
  espessura_cm: number | null;
  material: string | null;
  // Campos adicionais do dicionário
  rodovia_id: string;
  lote_id: string;
  traco_m: number | null;
  espacamento_m: number | null;
  area_m2: number | null;
  codigo: string | null;
  posicao: string | null;
  origem?: string;
  tipo_origem?: string;
  cadastro_match_id?: string | null;
  distancia_match_metros?: number | null;
}

interface InventarioMarcasLongitudinaisViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (marcaData: any) => void;
}

export function InventarioMarcasLongitudinaisViewer({ 
  loteId, 
  rodoviaId,
  onRegistrarIntervencao 
}: InventarioMarcasLongitudinaisViewerProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedMarca, setSelectedMarca] = useState<FichaMarcaLongitudinal | null>(null);
  const [intervencoes, setIntervencoes] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showRegistrarNaoCadastrado, setShowRegistrarNaoCadastrado] = useState(false);
  const [showOnlyPendentes, setShowOnlyPendentes] = useState(false);
  const [reconciliacaoOpen, setReconciliacaoOpen] = useState(false);
  const [selectedNecessidade, setSelectedNecessidade] = useState<any>(null);

  // Buscar tolerância GPS da rodovia
  const { data: rodoviaConfig } = useQuery({
    queryKey: ["rodovia-tolerancia", rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rodovias")
        .select("tolerancia_match_metros")
        .eq("id", rodoviaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!rodoviaId,
  });

  const toleranciaMetros = rodoviaConfig?.tolerancia_match_metros || 50;

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

  const handleOpenReconciliacao = (marca: FichaMarcaLongitudinal) => {
    const nec = necessidadesMap?.get(marca.id);
    if (nec) {
      setSelectedNecessidade(nec);
      setSelectedMarca(marca);
      setReconciliacaoOpen(true);
    } else {
      toast.error("Erro: Necessidade não encontrada");
    }
  };

  const { data: necessidadesMap, refetch: refetchNecessidades } = useQuery({
    queryKey: ["necessidades-match-marcas", loteId, rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_marcas_longitudinais")
        .select(`*, reconciliacao:reconciliacoes(id, status, distancia_match_metros)`)
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .not("cadastro_id", "is", null);
      
      if (error) throw error;
      
      const map = new Map<string, any>();
      data?.forEach((nec: any) => {
        const reconciliacao = Array.isArray(nec.reconciliacao) ? nec.reconciliacao[0] : nec.reconciliacao;
        // Não filtrar por distância - mostrar todas as necessidades vinculadas
        if (reconciliacao?.status === 'pendente_aprovacao') {
          map.set(nec.cadastro_id, { ...nec, servico: nec.servico_final || nec.servico, distancia_match_metros: reconciliacao.distancia_match_metros });
        }
      });
      
      return map;
    },
    enabled: !!loteId && !!rodoviaId,
    staleTime: 0,
    gcTime: 0,
  });

  // Contar matches pendentes de reconciliação
  const matchesPendentes = Array.from(necessidadesMap?.values() || []).filter(
    nec => !nec.reconciliado
  ).length;

  // Contar TODAS as necessidades com match (não apenas divergências)
  const totalMatchesProcessados = Array.from(necessidadesMap?.values() || []).length;

  const { data: marcas, isLoading, refetch } = useQuery({
    queryKey: ["inventario-marcas-longitudinais", loteId, rodoviaId, searchTerm, searchLat, searchLng],
    queryFn: async () => {
      let query = supabase
        .from("ficha_marcas_longitudinais")
        .select("*", { count: "exact" })
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .range(0, 9999);

      if (searchTerm) {
        query = query.or(
          `tipo_demarcacao.ilike.%${searchTerm}%,cor.ilike.%${searchTerm}%,material.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data as FichaMarcaLongitudinal[];

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
          // Não filtrar por distância - apenas ordenar
          .sort((a, b) => a.distance - b.distance);
        }
      } else {
        filteredData = filteredData.sort((a, b) => (a.km_inicial || 0) - (b.km_inicial || 0));
      }

      return filteredData;
    },
  });

  // Filtrar marcas com matches pendentes se necessário
  const filteredMarcas = marcas?.filter(marca => {
    if (!showOnlyPendentes) return true;
    const nec = necessidadesMap?.get(marca.id);
    return nec && !nec.reconciliado;
  }) || [];

  // Função para ordenar dados
  const sortedMarcas = filteredMarcas ? [...filteredMarcas].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof FichaMarcaLongitudinal];
    let bVal: any = b[sortColumn as keyof FichaMarcaLongitudinal];
    
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
              Inventário de Marcas Longitudinais
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-intervencoes?tab=sh")}
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
              Item Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contador de Matches a Reconciliar */}
          {totalMatchesProcessados > 0 && (
            matchesPendentes === 0 ? (
              // Estado OK - Sem divergências
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/20 to-green-500/10 border-2 border-green-500/40 rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-bold text-base flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-green-600">{totalMatchesProcessados}</span>
                      <span>{totalMatchesProcessados === 1 ? 'item verificado' : 'itens verificados'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      ✅ Inventário OK - Projeto e Sistema em conformidade
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      refetchNecessidades();
                      toast("Atualizando dados...", { description: "Buscando informações mais recentes" });
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Atualizar
                  </Button>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showOnlyPendentes}
                      onCheckedChange={setShowOnlyPendentes}
                      id="filtro-pendentes-marcas"
                    />
                    <Label htmlFor="filtro-pendentes-marcas" className="cursor-pointer text-sm font-medium">
                      <Filter className="h-4 w-4 inline mr-1" />
                      Apenas pendentes
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              // Estado com Divergências
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/20 to-warning/10 border-2 border-warning/40 rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/20 border border-warning/40">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                  <div className="font-bold text-base flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-warning">{matchesPendentes}</span>
                    <span>{matchesPendentes === 1 ? 'match a reconciliar' : 'matches a reconciliar'}</span>
                  </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      🎨 Projeto ≠ 🤖 Sistema GPS - Verificação no local necessária
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showOnlyPendentes}
                    onCheckedChange={setShowOnlyPendentes}
                    id="filtro-pendentes-marcas"
                  />
                  <Label htmlFor="filtro-pendentes-marcas" className="cursor-pointer text-sm font-medium">
                    <Filter className="h-4 w-4 inline mr-1" />
                    Apenas pendentes
                  </Label>
                </div>
              </div>
            )
          )}

          {/* Campos de Pesquisa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por tipo, cor ou material..."
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
              value={searchLng}
              onChange={(e) => setSearchLng(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando inventário...
            </div>
          ) : sortedMarcas && sortedMarcas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead className="text-center">Origem</TableHead>
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
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("tipo_demarcacao")}
                      >
                        <div className="whitespace-normal leading-tight flex items-center justify-center">
                          Código
                          <SortIcon column="tipo_demarcacao" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("posicao")}
                      >
                        <div className="flex items-center">
                          Posição
                          <SortIcon column="posicao" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("cor")}
                      >
                        <div className="flex items-center">
                          Cor
                          <SortIcon column="cor" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("km_inicial")}
                      >
                        <div className="flex items-center justify-center">
                          km inicial - km final
                          <SortIcon column="km_inicial" />
                        </div>
                      </TableHead>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("material")}
                      >
                        <div className="whitespace-normal leading-tight flex items-center justify-center">
                          Material
                          <SortIcon column="material" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("extensao_metros")}
                      >
                        <div className="whitespace-normal leading-tight flex items-center justify-center">
                          Extensão (km)
                          <SortIcon column="extensao_metros" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMarcas.map((marca) => {
                      const necessidade = necessidadesMap?.get(marca.id);
                      
                      return (
                        <TableRow key={marca.id} className="hover:bg-muted/50">
                          <TableCell className="text-center">
                            <div className="flex items-center gap-1 justify-start min-h-[28px]">
                              <div className="flex items-center">
                                <OrigemIndicator 
                                  origem={marca.origem}
                                  tipoOrigem={marca.tipo_origem}
                                />
                              </div>
                              
                              {marca.match_decision === 'AMBIGUOUS' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Match ambíguo - precisa revisão manual</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {marca.match_decision === 'MATCH_DIRECT' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Match direto confirmado automaticamente</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {marca.match_decision === 'SUBSTITUICAO' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <RefreshCw className="h-5 w-5 text-blue-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Elemento será substituído</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {(marca.cadastro_match_id || marca.origem === 'NECESSIDADE_CONSOLIDADA') && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Link className="h-5 w-5 text-blue-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        Vinculado a registro de cadastro{' '}
                                        {marca.distancia_match_metros 
                                          ? `(${marca.distancia_match_metros.toFixed(2)}m)` 
                                          : ''}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{marca.snv || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {marca.tipo_demarcacao || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {marca.posicao || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>{marca.cor || "-"}</TableCell>
                          <TableCell className="text-center">
                            {marca.km_inicial !== null && marca.km_inicial !== undefined && 
                             marca.km_final !== null && marca.km_final !== undefined
                              ? `${marca.km_inicial.toFixed(2)} - ${marca.km_final.toFixed(2)}`
                              : marca.km_inicial !== null && marca.km_inicial !== undefined
                                ? marca.km_inicial.toFixed(2)
                                : "-"}
                          </TableCell>
                          {searchLat && searchLng && (
                            <TableCell>
                              <Badge variant="secondary">
                                {(marca as any).distance?.toFixed(1)}m
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {marca.material || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {marca.extensao_metros ? (marca.extensao_metros / 1000).toFixed(2) : "-"} km
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setSelectedMarca(marca);
                                const { data } = await supabase
                                  .from("ficha_marcas_longitudinais_intervencoes")
                                  .select("*")
                                  .eq("ficha_marcas_longitudinais_id", marca.id)
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
                ? "Nenhuma marca encontrada com esse critério"
                : "Nenhuma marca cadastrada neste inventário"}
            </div>
          )}

          {sortedMarcas && sortedMarcas.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {sortedMarcas.length} {sortedMarcas.length === 1 ? "marca encontrada" : "marcas encontradas"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRegistrarNaoCadastrado} onOpenChange={setShowRegistrarNaoCadastrado}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <RegistrarItemNaoCadastrado
              tipo_elemento="marcas_longitudinais"
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

      <Dialog open={!!selectedMarca} onOpenChange={() => setSelectedMarca(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ficha de Visualização - Marca Longitudinal</span>
              <div className="flex gap-2">
                {onRegistrarIntervencao && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      onRegistrarIntervencao(selectedMarca);
                      setSelectedMarca(null);
                    }}
                  >
                    Registrar Intervenção
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMarca(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedMarca && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="foto">Foto</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                {/* Identificação Básica */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Identificação</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SNV:</span>
                      <p className="text-sm">{selectedMarca.snv || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Código:</span>
                      <p className="text-sm">{selectedMarca.codigo || selectedMarca.tipo_demarcacao || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Posição:</span>
                      <p className="text-sm">{selectedMarca.posicao || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Cor:</span>
                      <p className="text-sm">{selectedMarca.cor || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Dimensões */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Dimensões</h3>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Largura da Faixa (m):</span>
                    <p className="text-sm">
                      {selectedMarca.largura_cm 
                        ? (selectedMarca.largura_cm / 100).toFixed(2) 
                        : "-"}
                    </p>
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
                      <span className="text-sm font-medium text-muted-foreground">km Inicial:</span>
                      <p className="text-sm">{selectedMarca.km_inicial?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Latitude Inicial:</span>
                      <p className="text-sm">
                        {selectedMarca.latitude_inicial 
                          ? selectedMarca.latitude_inicial.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Longitude Inicial:</span>
                      <p className="text-sm">
                        {selectedMarca.longitude_inicial 
                          ? selectedMarca.longitude_inicial.toFixed(6) 
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
                      <span className="text-sm font-medium text-muted-foreground">km Final:</span>
                      <p className="text-sm">{selectedMarca.km_final?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Latitude Final:</span>
                      <p className="text-sm">
                        {selectedMarca.latitude_final 
                          ? selectedMarca.latitude_final.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Longitude Final:</span>
                      <p className="text-sm">
                        {selectedMarca.longitude_final 
                          ? selectedMarca.longitude_final.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Características da Demarcação */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Características da Demarcação</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Traço (m):</span>
                      <p className="text-sm">{selectedMarca.traco_m?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Espaçamento (m):</span>
                      <p className="text-sm">{selectedMarca.espacamento_m?.toFixed(2) || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Material */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Material</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Material:</span>
                      <p className="text-sm">{selectedMarca.material || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Outros materiais:</span>
                      <p className="text-sm">-</p>
                    </div>
                  </div>
                </div>

                {/* Extensão */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Extensão</h3>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Extensão (km):</span>
                    <p className="text-sm">
                      {selectedMarca.extensao_metros 
                        ? (selectedMarca.extensao_metros / 1000).toFixed(2) 
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Área */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Área</h3>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Área (m²):</span>
                    <p className="text-sm">{selectedMarca.area_m2?.toFixed(2) || "-"}</p>
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
                      {new Date(selectedMarca.data_vistoria).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="foto" className="mt-4">
                <p className="text-center py-8 text-muted-foreground">
                  As fotos de intervenções estão disponíveis no histórico de intervenções.
                </p>
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
                            {intervencao.tipo_demarcacao && (
                              <div>
                                <span className="text-sm font-medium">Tipo:</span>
                                <p className="text-sm">{intervencao.tipo_demarcacao}</p>
                              </div>
                            )}
                            {intervencao.cor && (
                              <div>
                                <span className="text-sm font-medium">Cor:</span>
                                <p className="text-sm">{intervencao.cor}</p>
                              </div>
                            )}
                            {intervencao.material && (
                              <div>
                                <span className="text-sm font-medium">Material:</span>
                                <p className="text-sm">{intervencao.material}</p>
                              </div>
                            )}
                            {intervencao.largura_cm && (
                              <div>
                                <span className="text-sm font-medium">Largura:</span>
                                <p className="text-sm">{intervencao.largura_cm} cm</p>
                              </div>
                            )}
                            {intervencao.espessura_cm && (
                              <div>
                                <span className="text-sm font-medium">Espessura:</span>
                                <p className="text-sm">{intervencao.espessura_cm} cm</p>
                              </div>
                            )}
                            {intervencao.estado_conservacao && (
                              <div>
                                <span className="text-sm font-medium">Estado:</span>
                                <p className="text-sm">{intervencao.estado_conservacao}</p>
                              </div>
                            )}
                            {intervencao.observacao && (
                              <div className="col-span-2">
                                <span className="text-sm font-medium">Observação:</span>
                                <p className="text-sm">{intervencao.observacao}</p>
                              </div>
                            )}
                            {intervencao.foto_url && (
                              <div className="col-span-2">
                                <span className="text-sm font-medium">Foto:</span>
                                <img
                                  src={supabase.storage.from('marcas-longitudinais').getPublicUrl(intervencao.foto_url).data.publicUrl}
                                  alt="Intervenção"
                                  className="mt-2 rounded-lg max-w-full h-auto"
                                />
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

      {/* Drawer de Reconciliação */}
      <ReconciliacaoDrawerUniversal
        open={reconciliacaoOpen}
        onOpenChange={(open) => {
          setReconciliacaoOpen(open);
          if (!open) {
            // Limpar ambas as seleções quando fechar o drawer
            setSelectedNecessidade(null);
            setSelectedMarca(null);
          }
        }}
        necessidade={selectedNecessidade}
        cadastro={selectedMarca}
        tipoElemento="marcas_longitudinais"
        onReconciliar={async () => {
          await new Promise(resolve => setTimeout(resolve, 300));
          refetchNecessidades();
          refetch();
          setReconciliacaoOpen(false);
        }}
      />
    </>
  );
}
