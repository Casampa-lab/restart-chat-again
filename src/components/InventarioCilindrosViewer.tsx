import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Library, Eye, MapPin, Calendar, X, FileText, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList, AlertCircle, Filter, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RegistrarItemNaoCadastrado } from "@/components/RegistrarItemNaoCadastrado";
import { ReconciliacaoDrawerUniversal } from "@/components/ReconciliacaoDrawerUniversal";
import { NecessidadeBadge } from "@/components/NecessidadeBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  onRegistrarIntervencao?: (cilindroData: any) => void;
}

export function InventarioCilindrosViewer({ loteId, rodoviaId, onRegistrarIntervencao }: InventarioCilindrosViewerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLon, setSearchLon] = useState("");
  const [selectedCilindro, setSelectedCilindro] = useState<Cilindro | null>(null);
  const [intervencoes, setIntervencoes] = useState<IntervencaoCilindro[]>([]);
  const [rodovia, setRodovia] = useState<{ codigo: string } | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showRegistrarNaoCadastrado, setShowRegistrarNaoCadastrado] = useState(false);
  const [showOnlyDivergencias, setShowOnlyDivergencias] = useState(false);
  const [reconciliacaoOpen, setReconciliacaoOpen] = useState(false);
  const [selectedNecessidade, setSelectedNecessidade] = useState<any>(null);
  const [selectedCadastroForReconciliacao, setSelectedCadastroForReconciliacao] = useState<any>(null);

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
      const result = (await supabase
        .from("rodovias")
        .select("codigo")
        .eq("id", rodoviaId)
        .single()) as unknown as { data: any; error: any };
      setRodovia(result.data);
      return result.data;
    },
  });

  // Query de necessidades relacionadas (retorna Map indexado por cadastro_id)
  const { data: necessidadesMap, refetch: refetchNecessidades } = useQuery({
    queryKey: ["necessidades-match-cilindros", loteId, rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_cilindros")
        .select(`
          *,
          reconciliacao:reconciliacoes(
            id,
            status,
            distancia_match_metros,
            overlap_porcentagem,
            tipo_match
          )
        `)
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .not("cadastro_id", "is", null);
      
      if (error) throw error;
      
      const map = new Map<string, any>();
      data?.forEach((nec: any) => {
        const reconciliacao = Array.isArray(nec.reconciliacao) ? nec.reconciliacao[0] : nec.reconciliacao;
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
    nec => {
      const rec = Array.isArray(nec.reconciliacao) ? nec.reconciliacao[0] : nec.reconciliacao;
      return rec?.status === 'pendente_aprovacao';
    }
  ).length;

  // Contar TODAS as necessidades com match (não apenas divergências)
  const totalMatchesProcessados = Array.from(necessidadesMap?.values() || []).length;

  // Debug: Log dos contadores
  console.log('🔍 [CILINDROS] Debug Banner:', {
    loteId,
    rodoviaId,
    necessidadesMapSize: necessidadesMap?.size,
    totalMatchesProcessados,
    matchesPendentes
  });

  // Buscar cilindros do inventário
  const { data: cilindros, isLoading } = useQuery({
    queryKey: ["cilindros", loteId, rodoviaId, searchTerm, searchLat, searchLon],
    queryFn: async () => {
      let query = supabase
        .from("ficha_cilindros")
        .select("*", { count: "exact" })
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .range(0, 9999)
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
            return distance <= toleranciaMetros;
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

  const handleReconciliar = async () => {
    await refetchNecessidades();
    setReconciliacaoOpen(false);
    setSelectedNecessidade(null);
    setSelectedCadastroForReconciliacao(null);
    toast.success("Reconciliação processada");
  };

  const filteredCilindros = cilindros?.filter(cilindro => {
    if (!showOnlyDivergencias) return true;
    const nec = necessidadesMap?.get(cilindro.id);
    return nec && !nec.reconciliado;
  }) || [];

  // Função para ordenar dados
  const sortedCilindros = filteredCilindros ? [...filteredCilindros].sort((a: any, b: any) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn];
    let bVal: any = b[sortColumn];
    
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Inventário de Cilindros Delineadores
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-necessidades?tipo=cilindros")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Necessidades
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-intervencoes?tab=cilindros")}
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
                      checked={showOnlyDivergencias}
                      onCheckedChange={setShowOnlyDivergencias}
                      id="filtro-divergencias-cilindros"
                    />
                    <Label htmlFor="filtro-divergencias-cilindros" className="cursor-pointer text-sm font-medium">
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
                    checked={showOnlyDivergencias}
                    onCheckedChange={setShowOnlyDivergencias}
                    id="filtro-divergencias-cilindros"
                  />
                  <Label htmlFor="filtro-divergencias-cilindros" className="cursor-pointer text-sm font-medium">
                    <Filter className="h-4 w-4 inline mr-1" />
                    Apenas pendentes
                  </Label>
                </div>
              </div>
            )
          )}

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
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    {searchLat && searchLon && <TableHead>Distância</TableHead>}
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
                      onClick={() => handleSort("km_inicial")}
                    >
                      <div className="flex items-center">
                        km Inicial
                        <SortIcon column="km_inicial" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("km_final")}
                    >
                      <div className="flex items-center">
                        km Final
                        <SortIcon column="km_final" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("cor_corpo")}
                    >
                      <div className="flex items-center">
                        Cor Corpo
                        <SortIcon column="cor_corpo" />
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
                      onClick={() => handleSort("quantidade")}
                    >
                      <div className="flex items-center">
                        Quantidade
                        <SortIcon column="quantidade" />
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
                      onClick={() => handleSort("data_vistoria")}
                    >
                      <div className="flex items-center">
                        Data
                        <SortIcon column="data_vistoria" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Projeto</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCilindros && sortedCilindros.length > 0 ? (
                    sortedCilindros.map((cilindro: any) => (
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
                          {(() => {
                            const necessidade = necessidadesMap?.get(cilindro.id);
                            return necessidade ? (
                              <NecessidadeBadge 
                                necessidade={{
                                  id: necessidade.id,
                                  servico: necessidade.servico as "Implantar" | "Substituir" | "Remover" | "Manter",
                                  distancia_match_metros: necessidade.distancia_match_metros || 0,
                                  km_inicial: necessidade.km_inicial,
                                  divergencia: necessidade.divergencia,
                                  reconciliado: necessidade.reconciliado,
                                  solucao_planilha: necessidade.solucao_planilha,
                                  servico_inferido: necessidade.servico_inferido,
                                }}
                                tipo="cilindros" 
                              />
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                Sem previsão
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            {(() => {
                              const necessidade = necessidadesMap?.get(cilindro.id);
                              if (!necessidade) return null;
                              
                              return (
                                <>
                                  <StatusReconciliacaoBadge 
                                    status={necessidade.status_reconciliacao} 
                                  />
                                  {necessidade?.divergencia && !necessidade.reconciliado && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedNecessidade(necessidade);
                                        setSelectedCadastroForReconciliacao(cilindro);
                                        setReconciliacaoOpen(true);
                                      }}
                                      className="bg-warning/10 hover:bg-warning/20 border-warning text-warning-foreground font-medium shadow-sm transition-all hover:shadow-md"
                                    >
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Verificar Match
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
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
                      <TableCell colSpan={searchLat && searchLon ? 11 : 10} className="text-center text-muted-foreground py-8">
                        {showOnlyDivergencias ? "Nenhuma divergência encontrada" : "Nenhum cilindro cadastrado"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRegistrarNaoCadastrado} onOpenChange={setShowRegistrarNaoCadastrado}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <RegistrarItemNaoCadastrado
              tipo_elemento="cilindros"
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
                    if (onRegistrarIntervencao) {
                      onRegistrarIntervencao(selectedCilindro);
                      setSelectedCilindro(null);
                    } else {
                      toast.info("Funcionalidade em desenvolvimento");
                    }
                  }}
                >
                  Implementar Intervenção
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
                      <span className="text-sm font-medium text-muted-foreground">km Inicial:</span>
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
                      <span className="text-sm font-medium text-muted-foreground">km Final:</span>
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
                <p className="text-center py-8 text-muted-foreground">
                  Fotos de intervenções estão disponíveis no histórico
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

      {/* Drawer de Reconciliação */}
      <ReconciliacaoDrawerUniversal
        open={reconciliacaoOpen}
        onOpenChange={setReconciliacaoOpen}
        necessidade={selectedNecessidade}
        cadastro={selectedCadastroForReconciliacao}
        onReconciliar={handleReconciliar}
        tipoElemento="cilindros"
      />
    </>
  );
}