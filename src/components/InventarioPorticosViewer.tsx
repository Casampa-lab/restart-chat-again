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
import { Search, MapPin, Eye, Calendar, Library, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList, AlertCircle, Filter, CheckCircle, AlertTriangle, CheckCircle2, RefreshCw, Link } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RegistrarItemNaoCadastrado } from "@/components/RegistrarItemNaoCadastrado";
import { NecessidadeBadge } from "@/components/NecessidadeBadge";
import { ReconciliacaoDrawerUniversal } from "@/components/ReconciliacaoDrawerUniversal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { OrigemIndicator } from "@/components/OrigemIndicator";
import { SolucaoBadge } from "@/components/SolucaoBadge";
import { toast } from "sonner";

// Component to show reconciliation status badge
function StatusReconciliacaoBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const config = {
    pendente_aprovacao: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: "🟡",
      label: "Aguardando Coordenação"
    },
    aprovado: {
      color: "bg-green-100 text-green-800 border-green-300",
      icon: "🟢",
      label: "Substituição Aprovada"
    },
    rejeitado: {
      color: "bg-red-100 text-red-800 border-red-300",
      icon: "🔴",
      label: "Mantido como Implantação"
    }
  };

  const item = config[status as keyof typeof config];
  if (!item) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={`${item.color} text-xs border`}>
            {item.icon}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{item.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FichaPortico {
  id: string;
  km_inicial: number | null;
  latitude_inicial: number | null;
  longitude_inicial: number | null;
  data_vistoria: string;
  snv: string | null;
  tipo: string;
  altura_livre_m: number | null;
  vao_horizontal_m: number | null;
  match_decision?: string | null;
  lado: string | null;
  foto_url: string | null;
  origem?: string;
  tipo_origem?: string;
  cadastro_match_id?: string | null;
  distancia_match_metros?: number | null;
  solucao_planilha?: string | null;
  status_servico?: string | null;
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
  const [showOnlyDivergencias, setShowOnlyDivergencias] = useState(false);
  const [ocultarRemocoes, setOcultarRemocoes] = useState(false);
  const [reconciliacaoOpen, setReconciliacaoOpen] = useState(false);
  const [selectedNecessidade, setSelectedNecessidade] = useState<any>(null);

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

  // Query da configuração da rodovia para pegar tolerância
  const { data: rodoviaConfig } = useQuery({
    queryKey: ["rodovia-config", rodoviaId],
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

  const toleranciaRodovia = rodoviaConfig?.tolerancia_match_metros || 50;

  const { data: porticos, isLoading } = useQuery({
    queryKey: ["inventario-dinamico-porticos", loteId, rodoviaId, searchTerm, searchLat, searchLng, toleranciaRodovia],
    queryFn: async () => {
      let query = supabase
        .from("inventario_dinamico_porticos")
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
              distance: portico.latitude_inicial && portico.longitude_inicial
                ? calculateDistance(lat, lng, portico.latitude_inicial, portico.longitude_inicial)
                : Infinity,
            }))
            // Não filtrar por distância - apenas ordenar
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        // Ordenar por km_inicial quando não há busca GPS
        filteredData = filteredData.sort((a, b) => {
          const kmA = a.km_inicial || 0;
          const kmB = b.km_inicial || 0;
          return kmA - kmB;
        });
      }

      return filteredData;
    },
  });

  // Query de necessidades relacionadas com reconciliacao
  const { data: necessidadesMap, refetch: refetchNecessidades } = useQuery({
    queryKey: ["necessidades-match-porticos", loteId, rodoviaId, toleranciaRodovia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_porticos")
        .select(`
          id, servico, servico_final, cadastro_id, tipo, km_inicial, divergencia, 
          latitude_inicial, longitude_inicial,
          reconciliacao:reconciliacoes(
            id,
            status,
            distancia_match_metros
          )
        `)
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .not("cadastro_id", "is", null);
      
      if (error) throw error;
      
      // Indexar por cadastro_id para busca O(1)
      const map = new Map<string, any>();
      data?.forEach((nec: any) => {
        const reconciliacao = Array.isArray(nec.reconciliacao) ? nec.reconciliacao[0] : nec.reconciliacao;
        
        // Não filtrar por distância - mostrar todas as necessidades vinculadas
        if (reconciliacao?.status === 'pendente_aprovacao') {
          map.set(nec.cadastro_id, {
            ...nec,
            servico: nec.servico_final || nec.servico,
            distancia_match_metros: reconciliacao.distancia_match_metros,
          });
        }
      });
      
      return map;
    },
    enabled: !!loteId && !!rodoviaId,
  });

  // Contar TODAS as necessidades com match processados (não apenas divergências)
  const totalMatchesProcessados = Array.from(necessidadesMap?.values() || []).length;

  // Contar matches pendentes de reconciliação
  const matchesPendentes = Array.from(necessidadesMap?.values() || []).filter(
    nec => nec.reconciliado !== true
  ).length;

  // Debug: Log dos contadores
  console.log('🔍 [PÓRTICOS] Debug Banner:', {
    loteId,
    rodoviaId,
    necessidadesMapSize: necessidadesMap?.size,
    totalMatchesProcessados,
    matchesPendentes
  });

  // Filtrar pórticos com matches pendentes se necessário e/ou ocultar remoções
  const filteredPorticos = porticos?.filter(portico => {
    // Filtro de divergências
    if (showOnlyDivergencias) {
      const nec = necessidadesMap?.get(portico.id);
      if (!nec || nec.reconciliado === true) return false;
    }
    // Filtro de remoções
    if (ocultarRemocoes && portico.solucao_planilha === 'Remover') {
      return false;
    }
    return true;
  }) || [];

  // Função para ordenar dados
  const sortedPorticos = filteredPorticos ? [...filteredPorticos].sort((a, b) => {
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

  const getTipoBadgeColor = (tipo: string) => {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes("pórtico") && !tipoLower.includes("semi")) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    }
    if (tipoLower.includes("semi")) {
      return "bg-purple-100 text-purple-800 border-purple-300";
    }
    if (tipoLower.includes("braço")) {
      return "bg-orange-100 text-orange-800 border-orange-300";
    }
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const handleViewDetails = async (portico: FichaPortico) => {
    setSelectedPortico(portico);
    await loadIntervencoes(portico.id);
  };

  const handleOpenReconciliacao = (portico: FichaPortico) => {
    const nec = necessidadesMap?.get(portico.id);
    if (nec) {
      setSelectedNecessidade(nec);
      setSelectedPortico(portico);
      setReconciliacaoOpen(true);
    }
  };

  const handleReconciliar = () => {
    refetchNecessidades();
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
              Item Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Banner de Status de Reconciliação */}
          {totalMatchesProcessados > 0 && (
            matchesPendentes === 0 ? (
              // Banner VERDE - Tudo OK
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
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showOnlyDivergencias}
                      onCheckedChange={setShowOnlyDivergencias}
                      id="filtro-divergencias"
                    />
                    <Label htmlFor="filtro-divergencias" className="cursor-pointer text-sm font-medium">
                      <Filter className="h-4 w-4 inline mr-1" />
                      Apenas divergências
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ocultarRemocoes}
                      onCheckedChange={setOcultarRemocoes}
                      id="ocultar-remocoes-porticos"
                    />
                    <Label htmlFor="ocultar-remocoes-porticos" className="cursor-pointer text-sm font-medium">
                      Ocultar Remoções
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              // Banner AMARELO - Com divergências
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
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showOnlyDivergencias}
                      onCheckedChange={setShowOnlyDivergencias}
                      id="filtro-divergencias"
                    />
                    <Label htmlFor="filtro-divergencias" className="cursor-pointer text-sm font-medium">
                      <Filter className="h-4 w-4 inline mr-1" />
                      Apenas divergências
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ocultarRemocoes}
                      onCheckedChange={setOcultarRemocoes}
                      id="ocultar-remocoes-porticos-2"
                    />
                    <Label htmlFor="ocultar-remocoes-porticos-2" className="cursor-pointer text-sm font-medium">
                      Ocultar Remoções
                    </Label>
                  </div>
                </div>
              </div>
            )
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por tipo, SNV ou lado..."
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

          {!porticos || porticos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum pórtico/semipórtico/braço cadastrado neste inventário</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="text-center">Origem</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 text-center"
                      onClick={() => handleSort("snv")}
                    >
                      <div className="whitespace-normal leading-tight flex items-center justify-center">
                        SNV
                        <SortIcon column="snv" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 text-center"
                      onClick={() => handleSort("km")}
                    >
                      <div className="whitespace-normal leading-tight flex items-center justify-center">
                        km
                        <SortIcon column="km" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 text-center"
                      onClick={() => handleSort("tipo")}
                    >
                      <div className="whitespace-normal leading-tight flex items-center justify-center">
                        Tipo
                        <SortIcon column="tipo" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50 text-center"
                      onClick={() => handleSort("lado")}
                    >
                      <div className="whitespace-normal leading-tight flex items-center justify-center">
                        Lado
                        <SortIcon column="lado" />
                      </div>
                    </TableHead>
                    {searchLat && searchLng && (
                      <TableHead className="text-center">
                        <div className="whitespace-normal leading-tight">
                          Distância
                        </div>
                      </TableHead>
                    )}
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 text-center"
                      onClick={() => handleSort("altura_livre_m")}
                    >
                      <div className="whitespace-normal leading-tight flex items-center justify-center">
                        Altura Livre<br/>(m)
                        <SortIcon column="altura_livre_m" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50 text-center"
                      onClick={() => handleSort("vao_horizontal_m")}
                    >
                      <div className="whitespace-normal leading-tight flex items-center justify-center">
                        Vão<br/>Horizontal (m)
                        <SortIcon column="vao_horizontal_m" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Solução</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPorticos.map((portico) => (
                    <TableRow key={portico.id}>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1 justify-start min-h-[28px]">
                          <div className="flex items-center">
                            <OrigemIndicator 
                              origem={portico.origem}
                              tipoOrigem={portico.tipo_origem}
                            />
                          </div>
                          
                          {portico.match_decision === 'AMBIGUOUS' && (
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
                          
                          {portico.match_decision === 'MATCH_DIRECT' && (
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
                          
                          {portico.match_decision === 'SUBSTITUICAO' && (
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
                          
                          {(portico.cadastro_match_id || portico.origem === 'NECESSIDADE_CONSOLIDADA') && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Link className="h-5 w-5 text-blue-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    Vinculado a registro de cadastro{' '}
                                    {portico.distancia_match_metros 
                                      ? `(${portico.distancia_match_metros.toFixed(2)}m)` 
                                      : ''}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-center">
                        {portico.snv || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {portico.km_inicial?.toFixed(3) || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={getTipoBadgeColor(portico.tipo)}
                        >
                          {portico.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {portico.lado || "-"}
                      </TableCell>
                      {searchLat && searchLng && (
                        <TableCell className="text-center">
                          {(portico as any).distance !== undefined ? (
                            <Badge variant="outline" className="text-xs">
                              {Math.round((portico as any).distance)}m
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {portico.altura_livre_m?.toFixed(2) || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {portico.vao_horizontal_m?.toFixed(2) || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <SolucaoBadge solucao={portico.solucao_planilha} />
                    </TableCell>
                    <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(portico)}
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
          
          {sortedPorticos && sortedPorticos.length > 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              {sortedPorticos.length} {sortedPorticos.length === 1 ? "item encontrado" : "itens encontrados"}
            </p>
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

      <ReconciliacaoDrawerUniversal
        open={reconciliacaoOpen}
        onOpenChange={setReconciliacaoOpen}
        necessidade={selectedNecessidade}
        cadastro={selectedPortico}
        onReconciliar={handleReconciliar}
        tipoElemento="porticos"
      />

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
                      <span className="text-sm font-medium text-muted-foreground">km:</span>
                      <p className="text-sm font-mono">{selectedPortico.km_inicial?.toFixed(3) || "-"}</p>
                    </div>
                    {selectedPortico.latitude_inicial && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Latitude:</span>
                        <p className="text-sm font-mono">{selectedPortico.latitude_inicial.toFixed(6)}</p>
                      </div>
                    )}
                    {selectedPortico.longitude_inicial && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Longitude:</span>
                        <p className="text-sm font-mono">{selectedPortico.longitude_inicial.toFixed(6)}</p>
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