import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, MapPin, Eye, Calendar, Library, FileText, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList, AlertCircle, Filter, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RegistrarItemNaoCadastrado } from "@/components/RegistrarItemNaoCadastrado";
import { ReconciliacaoDrawer } from "@/components/ReconciliacaoDrawer";
import { NecessidadeBadge } from "@/components/NecessidadeBadge";
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
  observacao: string | null;
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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");
  const [selectedInscricao, setSelectedInscricao] = useState<FichaInscricao | null>(null);
  const [intervencoes, setIntervencoes] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showRegistrarNaoCadastrado, setShowRegistrarNaoCadastrado] = useState(false);
  const [showOnlyDivergencias, setShowOnlyDivergencias] = useState(false);
  const [reconciliacaoOpen, setReconciliacaoOpen] = useState(false);
  const [selectedNecessidade, setSelectedNecessidade] = useState<any>(null);
  const [selectedCadastroForReconciliacao, setSelectedCadastroForReconciliacao] = useState<any>(null);

  // Buscar informações e tolerância da rodovia
  const { data: rodovia } = useQuery({
    queryKey: ["rodovia", rodoviaId],
    queryFn: async () => {
      const result = (await supabase
        .from("rodovias")
        .select("codigo, tolerancia_match_metros")
        .eq("id", rodoviaId)
        .single()) as unknown as { data: any; error: any };
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const toleranciaMetros = rodovia?.tolerancia_match_metros || 50;

  // Query de necessidades relacionadas (retorna Map indexado por cadastro_id)
  const { data: necessidadesMap, refetch: refetchNecessidades } = useQuery({
    queryKey: ["necessidades-match-inscricoes", loteId, rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_marcas_transversais")
        .select(`id, servico, servico_final, cadastro_id, km_inicial, divergencia, solucao_planilha, servico_inferido, solucao_confirmada, latitude_inicial, longitude_inicial, reconciliacao:reconciliacoes(id, status, distancia_match_metros)`)
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .not("cadastro_id", "is", null);
      
      if (error) throw error;
      
      const map = new Map<string, any>();
      data?.forEach((nec: any) => {
        const reconciliacao = Array.isArray(nec.reconciliacao) ? nec.reconciliacao[0] : nec.reconciliacao;
        if (reconciliacao?.status === 'pendente_aprovacao' && reconciliacao?.distancia_match_metros <= toleranciaMetros) {
          map.set(nec.cadastro_id, { ...nec, servico: nec.servico_final || nec.servico, distancia_match_metros: reconciliacao.distancia_match_metros });
        }
      });
      
      return map;
    },
    enabled: !!loteId && !!rodoviaId,
  });

  // Contar TODAS as necessidades com match processados (não apenas divergências)
  const totalMatchesProcessados = Array.from(necessidadesMap?.values() || []).length;

  const matchesPendentes = Array.from(necessidadesMap?.values() || []).filter(
    (nec: any) => !nec.solucao_confirmada
  ).length;

  // Debug: Log dos contadores  
  console.log('🔍 [INSCRIÇÕES] Debug Banner:', {
    loteId,
    rodoviaId,
    necessidadesMapSize: necessidadesMap?.size,
    totalMatchesProcessados,
    matchesPendentes
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

  const handleReconciliar = async () => {
    await refetchNecessidades();
    setReconciliacaoOpen(false);
    setSelectedNecessidade(null);
    setSelectedCadastroForReconciliacao(null);
    toast.success("Reconciliação processada");
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
            .filter((inscricao) => inscricao.distance <= toleranciaMetros)
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        filteredData = filteredData.sort((a, b) => (a.km_inicial || 0) - (b.km_inicial || 0));
      }

      return filteredData;
    },
  });

  const filteredInscricoes = inscricoes?.filter(inscricao => {
    if (!showOnlyDivergencias) return true;
    const nec = necessidadesMap?.get(inscricao.id);
    return nec && !nec.solucao_confirmada;
  }) || [];

  // Função para ordenar dados
  const sortedInscricoes = filteredInscricoes ? [...filteredInscricoes].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof FichaInscricao];
    let bVal: any = b[sortColumn as keyof FichaInscricao];
    
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
              Inventário de Setas, Símbolos e Legendas
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-necessidades?tipo=marcas_transversais")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Necessidades
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-intervencoes?tab=inscricoes")}
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
              <div className="flex items-center gap-2">
                <Switch
                  checked={showOnlyDivergencias}
                  onCheckedChange={setShowOnlyDivergencias}
                  id="filtro-divergencias-inscricoes"
                />
                <Label htmlFor="filtro-divergencias-inscricoes" className="cursor-pointer text-sm font-medium">
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
                  id="filtro-divergencias-inscricoes"
                />
                <Label htmlFor="filtro-divergencias-inscricoes" className="cursor-pointer text-sm font-medium">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Apenas divergências
                </Label>
              </div>
            </div>
          )
        )}

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
          ) : filteredInscricoes && filteredInscricoes.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      {searchLat && searchLng && <TableHead>Distância</TableHead>}
                      <TableHead>Sigla</TableHead>
                      <TableHead>Descrição</TableHead>
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
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("km_inicial")}
                      >
                        <div className="flex items-center">
                          km
                          <SortIcon column="km_inicial" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("material_utilizado")}
                      >
                        <div className="flex items-center">
                          Material
                          <SortIcon column="material_utilizado" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("area_m2")}
                      >
                        <div className="flex items-center">
                          Área (m²)
                          <SortIcon column="area_m2" />
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Projeto</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInscricoes.map((inscricao) => {
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
                          <TableCell className="text-center">
                            {(() => {
                              const necessidade = necessidadesMap?.get(inscricao.id);
                              return necessidade ? (
                                <NecessidadeBadge 
                                  necessidade={{
                                    id: necessidade.id,
                                    servico: necessidade.servico as "Implantar" | "Substituir" | "Remover" | "Manter",
                                    distancia_match_metros: necessidade.distancia_match_metros || 0,
                                    km: necessidade.km_inicial,
                                    divergencia: necessidade.divergencia,
                                    reconciliado: necessidade.solucao_confirmada,
                                    solucao_planilha: necessidade.solucao_planilha,
                                    servico_inferido: necessidade.servico_inferido,
                                  }}
                                  tipo="marcas_transversais" 
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
                                const necessidade = necessidadesMap?.get(inscricao.id);
                                if (!necessidade) return null;
                                
                                return (
                                  <>
                                    <StatusReconciliacaoBadge 
                                      status={necessidade.status_reconciliacao} 
                                    />
                                    {necessidade?.divergencia && !necessidade.solucao_confirmada && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedNecessidade(necessidade);
                                          setSelectedCadastroForReconciliacao(inscricao);
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
              {showOnlyDivergencias
                ? "Nenhuma divergência encontrada"
                : searchTerm || (searchLat && searchLng)
                ? "Nenhuma inscrição encontrada com esse critério"
                : "Nenhuma inscrição cadastrada neste inventário"}
            </div>
          )}

          {filteredInscricoes && filteredInscricoes.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {filteredInscricoes.length} {filteredInscricoes.length === 1 ? "inscrição encontrada" : "inscrições encontradas"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRegistrarNaoCadastrado} onOpenChange={setShowRegistrarNaoCadastrado}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <RegistrarItemNaoCadastrado
              tipo_elemento="marcas_transversais"
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
                        <span className="text-sm font-medium text-muted-foreground">km Final:</span>
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

      {/* Drawer de Reconciliação */}
      <ReconciliacaoDrawer
        open={reconciliacaoOpen}
        onOpenChange={setReconciliacaoOpen}
        necessidade={selectedNecessidade}
        cadastro={selectedCadastroForReconciliacao}
        onReconciliar={handleReconciliar}
      />
    </>
  );
}
