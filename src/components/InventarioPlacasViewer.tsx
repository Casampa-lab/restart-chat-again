import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin, Eye, Image as ImageIcon, Calendar, Ruler, History, Library, FileText, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList, AlertCircle, Filter, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegistrarItemNaoCadastrado } from "./RegistrarItemNaoCadastrado";
import { NecessidadeBadge } from "./NecessidadeBadge";
import { ReconciliacaoDrawer } from "./ReconciliacaoDrawer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper function to determine badge color based on placa type
const getPlacaBadgeVariant = (tipo: string | null): { className: string } => {
  if (!tipo) return { className: "" };
  
  const tipoLower = tipo.toLowerCase();
  
  // Regulamentação - VERMELHO
  if (tipoLower.includes('regulament')) {
    return { className: "bg-red-500 hover:bg-red-600 text-white border-red-600" };
  }
  
  // Advertência - AMARELO
  if (tipoLower.includes('advert')) {
    return { className: "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600 font-semibold" };
  }
  
  // Indicação - VERDE (padrão)
  return { className: "bg-green-600 hover:bg-green-700 text-white border-green-700" };
};

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

interface FichaPlaca {
  id: string;
  br: string | null;
  snv: string | null;
  tipo: string | null;
  codigo: string | null;
  velocidade: string | null;
  lado: string | null;
  posicao: string | null;
  km: number | null;
  latitude: number | null;
  longitude: number | null;
  detalhamento_pagina: number | null;
  suporte: string | null;
  qtde_suporte: number | null;
  tipo_secao_suporte: string | null;
  secao_suporte_mm: string | null;
  substrato: string | null;
  si_sinal_impresso: string | null;
  tipo_pelicula_fundo: string | null;
  cor_pelicula_fundo: string | null;
  retro_pelicula_fundo: number | null;
  tipo_pelicula_legenda_orla: string | null;
  cor_pelicula_legenda_orla: string | null;
  retro_pelicula_legenda_orla: number | null;
  dimensoes_mm: string | null;
  area_m2: number | null;
  altura_m: number | null;
  distancia_m: number | null;
  link_fotografia: string | null;
  foto_url: string | null;
  foto_frontal_url: string | null;
  foto_lateral_url: string | null;
  foto_posterior_url: string | null;
  foto_base_url: string | null;
  foto_identificacao_url: string | null;
  data_vistoria: string;
  data_implantacao: string | null;
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
  tipo_pelicula_fundo_novo: string | null;
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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedPlaca, setSelectedPlaca] = useState<FichaPlaca | null>(null);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showRegistrarNaoCadastrado, setShowRegistrarNaoCadastrado] = useState(false);
  const [showOnlyDivergencias, setShowOnlyDivergencias] = useState(false);
  const [reconciliacaoOpen, setReconciliacaoOpen] = useState(false);
  const [selectedNecessidade, setSelectedNecessidade] = useState<any>(null);

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

  const { data: placas, isLoading, refetch } = useQuery({
    queryKey: ["inventario-placas", loteId, rodoviaId, searchTerm, searchLat, searchLng, toleranciaRodovia],
    queryFn: async () => {
      let query = supabase
        .from("ficha_placa")
        .select("*", { count: "exact" })
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .range(0, 9999);

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
            .filter((placa) => placa.distance <= toleranciaRodovia)
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        // Se não houver busca por coordenadas, ordena por km por padrão
        filteredData = filteredData.sort((a, b) => (a.km || 0) - (b.km || 0));
      }

      return filteredData;
    },
  });

  // Query de necessidades relacionadas
  const { data: necessidadesMap, refetch: refetchNecessidades } = useQuery({
    queryKey: ["necessidades-match-placas", loteId, rodoviaId, toleranciaRodovia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_placas")
        .select("id, servico, servico_final, cadastro_id, distancia_match_metros, codigo, tipo, km, divergencia, reconciliado, status_reconciliacao, solucao_planilha, servico_inferido, revisao_solicitada, localizado_em_campo, lado, suporte, substrato, latitude, longitude")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .not("cadastro_id", "is", null)
        .eq("status_reconciliacao", "pendente_aprovacao")
        .lte("distancia_match_metros", toleranciaRodovia);
      
      if (error) throw error;
      
      // Indexar por cadastro_id para busca O(1)
      // Usar servico_final como fonte da verdade para o badge
      const map = new Map<string, any>();
      data?.forEach(nec => {
        map.set(nec.cadastro_id, {
          ...nec,
          servico: nec.servico_final || nec.servico, // Priorizar servico_final
        });
      });
      
      return map;
    },
    enabled: !!loteId && !!rodoviaId,
  });

  // Contar TODAS as necessidades com match processados (não apenas divergências)
  const totalMatchesProcessados = Array.from(necessidadesMap?.values() || []).length;

  // Contar matches pendentes de reconciliação
  const matchesPendentes = Array.from(necessidadesMap?.values() || []).filter(
    nec => !nec.reconciliado
  ).length;

  // Filtrar placas com matches pendentes se necessário
  const filteredPlacas = placas?.filter(placa => {
    if (!showOnlyDivergencias) return true;
    const nec = necessidadesMap?.get(placa.id);
    return nec && !nec.reconciliado;
  }) || [];

  // Função para ordenar dados
  const sortedPlacas = filteredPlacas ? [...filteredPlacas].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof FichaPlaca];
    let bVal: any = b[sortColumn as keyof FichaPlaca];
    
    // Handle null/undefined
    if (aVal == null) aVal = "";
    if (bVal == null) bVal = "";
    
    // String comparison
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    // Number comparison
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

  const handleViewPlacaDetails = (placa: FichaPlaca) => {
    openPlacaDetail(placa);
  };

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

  const handleOpenReconciliacao = (placa: FichaPlaca) => {
    const nec = necessidadesMap?.get(placa.id);
    console.log("🔍 handleOpenReconciliacao chamado:", {
      placaId: placa.id,
      necessidadeEncontrada: !!nec,
      necessidade: nec
    });
    
    if (nec) {
      setSelectedNecessidade(nec);
      setSelectedPlaca(placa); // Importante: setar a placa para exibir no drawer
      setReconciliacaoOpen(true);
      console.log("✅ Drawer aberto com sucesso");
    } else {
      console.error("❌ Necessidade não encontrada no mapa para placa:", placa.id);
      toast.error("Erro: Necessidade não encontrada");
    }
  };

  const handleReconciliar = async () => {
    // Aguardar commit do Supabase antes de buscar dados atualizados
    await new Promise(resolve => setTimeout(resolve, 300));
    refetchNecessidades();
    refetch();
  };

  const fotos = selectedPlaca
    ? [
        { label: "Principal", url: selectedPlaca.foto_url },
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Inventário de Placas
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-necessidades?tipo=placas")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Necessidades
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-intervencoes?tab=sv")}
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
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-success/20 to-success/10 border-2 border-success/40 rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/20 border border-success/40">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <div className="font-bold text-base flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-success">{totalMatchesProcessados}</span>
                      <span>{totalMatchesProcessados === 1 ? 'item verificado' : 'itens verificados'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      ✅ Inventário OK - Projeto e Sistema em conformidade
                    </div>
                  </div>
                </div>
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
              </div>
            )
          )}

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
          ) : sortedPlacas && sortedPlacas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
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
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("codigo")}
                      >
                        <div className="whitespace-normal leading-tight flex items-center justify-center">
                          Código<br/>Placa
                          <SortIcon column="codigo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("suporte")}
                      >
                        <div className="whitespace-normal leading-tight flex items-center justify-center">
                          Tipo de<br/>Suporte
                          <SortIcon column="suporte" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("km")}
                      >
                        <div className="flex items-center justify-center">
                          km
                          <SortIcon column="km" />
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
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("servico")}
                      >
                        <div className="flex items-center justify-center">
                          Projeto
                          <SortIcon column="servico" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("status_reconciliacao")}
                      >
                        <div className="flex items-center justify-center">
                          Status
                          <SortIcon column="status_reconciliacao" />
                        </div>
                      </TableHead>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("tipo_pelicula_fundo")}
                      >
                        <div className="whitespace-normal leading-tight flex items-center justify-center">
                          Tipo<br/>(película fundo)
                          <SortIcon column="tipo_pelicula_fundo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50 text-center"
                        onClick={() => handleSort("tipo_pelicula_legenda_orla")}
                      >
                        <div className="whitespace-normal leading-tight flex items-center justify-center">
                          Tipo<br/>(película legenda/orla)
                          <SortIcon column="tipo_pelicula_legenda_orla" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlacas.map((placa) => {
                      const necessidade = necessidadesMap?.get(placa.id);
                      
                      return (
                        <TableRow key={placa.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{placa.snv || "-"}</TableCell>
                          <TableCell>
                            <Badge 
                              className={getPlacaBadgeVariant(placa.tipo).className}
                              title={placa.tipo || "Tipo desconhecido"}
                            >
                              {placa.codigo || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{placa.suporte || "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{placa.km?.toFixed(2) || "-"}</TableCell>
                          <TableCell>{placa.lado || "-"}</TableCell>
                          <TableCell className="text-center">
                            {necessidade ? (
                              <NecessidadeBadge 
                                necessidade={necessidade} 
                                tipo="placas"
                              />
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                Sem previsão
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              {necessidade && (
                                <StatusReconciliacaoBadge 
                                  status={necessidade.status_reconciliacao} 
                                />
                              )}
                              {necessidade?.divergencia && !necessidade.reconciliado && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("🔍 Abrindo reconciliação para:", {
                                      placa: placa.id,
                                      necessidade: necessidade.id,
                                      codigo: placa.codigo
                                    });
                                    handleOpenReconciliacao(placa);
                                  }}
                                  className="bg-warning/10 hover:bg-warning/20 border-warning text-warning-foreground font-medium shadow-sm transition-all hover:shadow-md"
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Verificar Match
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {searchLat && searchLng && (
                            <TableCell>
                              <Badge variant="secondary">
                                {(placa as any).distance?.toFixed(1)}m
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {placa.tipo_pelicula_fundo || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {placa.tipo_pelicula_legenda_orla || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPlacaDetails(placa);
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
                ? "Nenhuma placa encontrada com esse critério"
                : "Nenhuma placa cadastrada neste inventário"}
            </div>
          )}

          {sortedPlacas && sortedPlacas.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {sortedPlacas.length} {sortedPlacas.length === 1 ? "placa encontrada" : "placas encontradas"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog Registrar Não Cadastrado */}
      <Dialog open={showRegistrarNaoCadastrado} onOpenChange={setShowRegistrarNaoCadastrado}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <RegistrarItemNaoCadastrado
              tipo_elemento="placas"
              loteId={loteId}
              rodoviaId={rodoviaId}
              onSuccess={() => setShowRegistrarNaoCadastrado(false)}
              onCancel={() => setShowRegistrarNaoCadastrado(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedPlaca && !reconciliacaoOpen} onOpenChange={() => setSelectedPlaca(null)}>
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
                      <span className="text-sm font-medium text-muted-foreground">Tipo de placa:</span>
                      <p className="text-sm">{selectedPlaca.tipo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Código da placa:</span>
                      <p className="text-sm">{selectedPlaca.codigo || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Velocidade:</span>
                      <p className="text-sm">{selectedPlaca.velocidade || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Lado:</span>
                      <p className="text-sm">{selectedPlaca.lado || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Posição:</span>
                      <p className="text-sm">{selectedPlaca.posicao || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">km:</span>
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
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Detalhamento (página):</span>
                      <p className="text-sm">{selectedPlaca.detalhamento_pagina || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Suporte */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Suporte</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de Suporte:</span>
                      <p className="text-sm">{selectedPlaca.suporte || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Quantidade de Suporte:</span>
                      <p className="text-sm">{selectedPlaca.qtde_suporte || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de Seção de Suporte:</span>
                      <p className="text-sm">{selectedPlaca.tipo_secao_suporte || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Seção do Suporte (mm):</span>
                      <p className="text-sm">{selectedPlaca.secao_suporte_mm || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Substrato e Sinal Impresso */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Substrato</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de Substrato:</span>
                      <p className="text-sm">{selectedPlaca.substrato || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SI (Sinal Impresso):</span>
                      <p className="text-sm">{selectedPlaca.si_sinal_impresso || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Película Fundo */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Película Fundo</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo (película fundo):</span>
                      <p className="text-sm">{selectedPlaca.tipo_pelicula_fundo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Cor (película fundo):</span>
                      <p className="text-sm">{selectedPlaca.cor_pelicula_fundo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Retro Fundo (cd.lux/m²):</span>
                      <p className="text-sm">{selectedPlaca.retro_pelicula_fundo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Retro Orla/Legenda (cd.lux/m²):</span>
                      <p className="text-sm">{selectedPlaca.retro_pelicula_legenda_orla || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Película Legenda/Orla */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Película Legenda/Orla</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo (película legenda/orla):</span>
                      <p className="text-sm">{selectedPlaca.tipo_pelicula_legenda_orla || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Cor (película legenda/orla):</span>
                      <p className="text-sm">{selectedPlaca.cor_pelicula_legenda_orla || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Retrorrefletância (película legenda/orla) cd.lux/m²:</span>
                      <p className="text-sm">{selectedPlaca.retro_pelicula_legenda_orla || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Dimensões da Placa */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Dimensões da Placa
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Largura (m):</span>
                      <p className="text-sm">{selectedPlaca.distancia_m?.toFixed(2) || "-"}</p>
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

                {/* Data */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Data da Vistoria:</span>
                      <p className="text-sm">
                        {new Date(selectedPlaca.data_vistoria).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {selectedPlaca.data_implantacao && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Data de Implantação:</span>
                        <p className="text-sm">
                          {new Date(selectedPlaca.data_implantacao).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </TabsContent>

              <TabsContent value="fotos" className="mt-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Fotografia</h3>
                  {(selectedPlaca.foto_url || selectedPlaca.foto_identificacao_url || selectedPlaca.foto_frontal_url) ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-[400px] bg-muted rounded-lg overflow-hidden">
                        <img
                          src={selectedPlaca.foto_url || selectedPlaca.foto_identificacao_url || selectedPlaca.foto_frontal_url}
                          alt="Foto da Placa"
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
                            {intervencao.tipo_pelicula_fundo_novo && (
                              <div>
                                <span className="text-sm font-medium">Película de Fundo (novo):</span>
                                <p className="text-sm">{intervencao.tipo_pelicula_fundo_novo}</p>
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

      {/* Drawer de Reconciliação */}
      <ReconciliacaoDrawer
        open={reconciliacaoOpen}
              onOpenChange={(open) => {
                setReconciliacaoOpen(open);
                if (!open) {
                  // Limpar ambas as seleções quando fechar o drawer
                  setSelectedNecessidade(null);
                  setSelectedPlaca(null);
                }
              }}
        necessidade={selectedNecessidade}
        cadastro={selectedPlaca}
        onReconciliar={handleReconciliar}
      />
    </>
  );
}
