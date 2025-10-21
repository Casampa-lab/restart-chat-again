import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin, Eye, FileText, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList, AlertCircle, Filter, CheckCircle, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RegistrarItemNaoCadastrado } from "@/components/RegistrarItemNaoCadastrado";
import { ReconciliacaoDrawerUniversal } from "@/components/ReconciliacaoDrawerUniversal";
import { NecessidadeBadge } from "@/components/NecessidadeBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useInventarioContadores } from "@/hooks/useInventarioContadores";
import { ContadoresBadges } from "@/components/ContadoresBadges";

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

interface FichaDefensa {
  id: string;
  lado: string;
  km_inicial: number;
  km_final: number;
  extensao_metros: number;
  data_vistoria: string;
  rodovia_id: string;
  lote_id: string;
}

interface IntervencaoDefensa {
  id: string;
  data_intervencao: string;
  motivo: string;
  extensao_metros?: number;
  estado_conservacao?: string;
  tipo_avaria?: string;
  necessita_intervencao?: boolean;
  nivel_risco?: string;
  observacao?: string;
  foto_url?: string;
}

interface InventarioDefensasViewerProps {
  loteId: string;
  rodoviaId: string;
  onRegistrarIntervencao?: (defensa: FichaDefensa) => void;
}

export const InventarioDefensasViewer = ({
  loteId,
  rodoviaId,
  onRegistrarIntervencao,
}: InventarioDefensasViewerProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLong, setGpsLong] = useState("");
  const [selectedDefensa, setSelectedDefensa] = useState<FichaDefensa | null>(null);
  const [intervencoes, setIntervencoes] = useState<IntervencaoDefensa[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showRegistrarNaoCadastrado, setShowRegistrarNaoCadastrado] = useState(false);
  const [showOnlyPendentes, setShowOnlyPendentes] = useState(false);
  const [reconciliacaoOpen, setReconciliacaoOpen] = useState(false);
  const [selectedNecessidade, setSelectedNecessidade] = useState<any>(null);
  const [selectedCadastroForReconciliacao, setSelectedCadastroForReconciliacao] = useState<any>(null);

  // Hook para contadores de inventário
  const { contadores, marcoZeroExiste, loading: loadingContadores, refetch: refetchContadores } = 
    useInventarioContadores('defensas', loteId, rodoviaId);

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

  const { data: necessidadesMap, refetch: refetchNecessidades } = useQuery({
    queryKey: ["necessidades-match-defensas", loteId, rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_defensas")
        .select(`*, reconciliacao:reconciliacoes(id, status, distancia_match_metros)`)
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
    staleTime: 0,
    gcTime: 0,
  });

  // Contar matches pendentes de reconciliação
  const matchesPendentes = Array.from(necessidadesMap?.values() || []).filter(
    nec => !nec.reconciliado
  ).length;

  // Contar TODAS as necessidades com match (não apenas divergências)
  const totalMatchesProcessados = Array.from(necessidadesMap?.values() || []).length;

  const { data: defensas, isLoading } = useQuery({
    queryKey: ["inventario-defensas", loteId, rodoviaId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("defensas")
        .select("*", { count: "exact" })
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .range(0, 9999);

      if (searchTerm) {
        query = query.or(`lado.ilike.%${searchTerm}%,funcao.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as FichaDefensa[];
    },
    enabled: !!loteId && !!rodoviaId,
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const openDefensaDetail = async (defensa: FichaDefensa) => {
    setSelectedDefensa(defensa);
    
    // Buscar intervenções da defensa
    const { data: intervencoesData, error: intervencoesError } = await supabase
      .from("defensas_intervencoes")
      .select("*")
      .eq("defensa_id", defensa.id)
      .order("data_intervencao", { ascending: false });

    if (intervencoesError) {
      console.error("Erro ao buscar intervenções:", intervencoesError);
      setIntervencoes([]);
    } else {
      setIntervencoes(intervencoesData || []);
    }
  };

  const filteredByGps = gpsLat && gpsLong && defensas
    ? defensas
        .filter((defensa) => {
          const kmMedio = (defensa.km_inicial + defensa.km_final) / 2;
          return true;
        })
        .sort((a, b) => {
          const kmA = (a.km_inicial + a.km_final) / 2;
          const kmB = (b.km_inicial + b.km_final) / 2;
          return kmA - kmB;
        })
    : defensas;

  const filteredDefensas = filteredByGps?.filter(defensa => {
    if (!showOnlyPendentes) return true;
    const nec = necessidadesMap?.get(defensa.id);
    return nec && !nec.reconciliado;
  }) || [];

  const handleReconciliar = async () => {
    await refetchNecessidades();
    setReconciliacaoOpen(false);
    setSelectedNecessidade(null);
    setSelectedCadastroForReconciliacao(null);
    toast.success("Reconciliação processada");
  };

  // Função para ordenar dados
  const sortedDefensas = filteredDefensas ? [...filteredDefensas].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof FichaDefensa];
    let bVal: any = b[sortColumn as keyof FichaDefensa];
    
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
    <div className="space-y-4">
      {/* Badges de Contadores */}
      <div className="flex items-center justify-between">
        <ContadoresBadges
          cadastroInicialAtivo={contadores.cadastro_inicial_ativo}
          criadosNecessidadeAtivo={contadores.criados_necessidade_ativo}
          totalAtivo={contadores.total_ativo}
          cadastroInicialInativo={contadores.cadastro_inicial_inativo}
          totalInativo={contadores.total_inativo}
          marcoZeroExiste={marcoZeroExiste}
          loading={loadingContadores}
          onRefresh={refetchContadores}
        />
      </div>

      {/* Botões Ver Necessidades */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/minhas-necessidades?tipo=defensas")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Ver Necessidades
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/minhas-intervencoes?tab=defensas")}
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
                  id="filtro-pendentes-defensas"
                />
                <Label htmlFor="filtro-pendentes-defensas" className="cursor-pointer text-sm font-medium">
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
                id="filtro-pendentes-defensas"
              />
              <Label htmlFor="filtro-pendentes-defensas" className="cursor-pointer text-sm font-medium">
                <Filter className="h-4 w-4 inline mr-1" />
                Apenas pendentes
              </Label>
            </div>
          </div>
        )
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo, lado, estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Latitude"
            value={gpsLat}
            onChange={(e) => setGpsLat(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Longitude"
            value={gpsLong}
            onChange={(e) => setGpsLong(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 text-center"
                  onClick={() => handleSort("tramo")}
                >
                  <div className="whitespace-normal leading-tight flex items-center justify-center">
                    Tramo
                    <SortIcon column="tramo" />
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
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 text-center"
                  onClick={() => handleSort("km_inicial")}
                >
                  <div className="whitespace-normal leading-tight flex items-center justify-center">
                    km<br/>Inicial
                    <SortIcon column="km_inicial" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 text-center"
                  onClick={() => handleSort("km_final")}
                >
                  <div className="whitespace-normal leading-tight flex items-center justify-center">
                    km<br/>Final
                    <SortIcon column="km_final" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 text-center"
                  onClick={() => handleSort("extensao_metros")}
                >
                  <div className="whitespace-normal leading-tight flex items-center justify-center">
                    Comprimento<br/>Total (m)
                    <SortIcon column="extensao_metros" />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="whitespace-normal leading-tight">Qtde<br/>Lâminas</div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="whitespace-normal leading-tight">Nível de<br/>Contenção</div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="whitespace-normal leading-tight">Projeto</div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="whitespace-normal leading-tight">Status</div>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <div className="whitespace-normal leading-tight">Ações</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDefensas?.map((defensa) => (
                <TableRow key={defensa.id}>
                  <TableCell className="text-center">{(defensa as any).tramo || "-"}</TableCell>
                  <TableCell className="text-center">{defensa.lado}</TableCell>
                  <TableCell className="text-center">{defensa.km_inicial}</TableCell>
                  <TableCell className="text-center">{defensa.km_final}</TableCell>
                  <TableCell className="text-center">{defensa.extensao_metros}</TableCell>
                  <TableCell className="text-center">{(defensa as any).quantidade_laminas || "-"}</TableCell>
                  <TableCell className="text-center">{(defensa as any).nivel_contencao_en1317 || "-"}</TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const necessidade = necessidadesMap?.get(defensa.id);
                      return necessidade ? (
                        <NecessidadeBadge 
                          necessidade={{
                            id: necessidade.id,
                            servico: necessidade.servico as "Implantar" | "Substituir" | "Remover" | "Manter",
                            distancia_match_metros: necessidade.distancia_match_metros || 0,
                            km: necessidade.km_inicial,
                            divergencia: necessidade.divergencia,
                            reconciliado: necessidade.reconciliado,
                            solucao_planilha: necessidade.solucao_planilha,
                            servico_inferido: necessidade.servico_inferido,
                          }}
                          tipo="defensas" 
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
                        const necessidade = necessidadesMap?.get(defensa.id);
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
                                  setSelectedCadastroForReconciliacao(defensa);
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
                      size="sm"
                      onClick={() => openDefensaDetail(defensa)}
                      className="h-8 w-8 p-0"
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

      <Dialog open={showRegistrarNaoCadastrado} onOpenChange={setShowRegistrarNaoCadastrado}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <RegistrarItemNaoCadastrado
              tipo_elemento="defensas"
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

      <Dialog open={!!selectedDefensa} onOpenChange={() => setSelectedDefensa(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ficha de Visualização - Defensa</span>
              <div className="flex gap-2">
                {onRegistrarIntervencao && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      onRegistrarIntervencao(selectedDefensa);
                      setSelectedDefensa(null);
                    }}
                  >
                    Registrar Intervenção
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedDefensa(null)}
                >
                  Voltar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedDefensa && (
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
                      <p className="text-sm">{(selectedDefensa as any).br || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">SNV:</span>
                      <p className="text-sm">{(selectedDefensa as any).snv || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tramo:</span>
                      <p className="text-sm">{(selectedDefensa as any).tramo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">ID Defensa:</span>
                      <p className="text-sm">{(selectedDefensa as any).id_defensa || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Características */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Características</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Lado:</span>
                      <p className="text-sm">{selectedDefensa.lado}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Função:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).funcao && (selectedDefensa as any).funcao !== "Não se Aplica" ? (
                          (selectedDefensa as any).funcao
                        ) : (
                          <span className="text-muted-foreground italic">Não especificado no cadastro</span>
                        )}
                      </p>
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
                      <p className="text-sm">{selectedDefensa.km_inicial}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Latitude Inicial:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).latitude_inicial 
                          ? (selectedDefensa as any).latitude_inicial.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Longitude Inicial:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).longitude_inicial 
                          ? (selectedDefensa as any).longitude_inicial.toFixed(6) 
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
                      <p className="text-sm">{selectedDefensa.km_final}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Latitude Final:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).latitude_final 
                          ? (selectedDefensa as any).latitude_final.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Longitude Final:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).longitude_final 
                          ? (selectedDefensa as any).longitude_final.toFixed(6) 
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dimensões */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Dimensões</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Extensão (m):</span>
                      <p className="text-sm">{selectedDefensa.extensao_metros}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Comprimento Total (m):</span>
                      <p className="text-sm">{(selectedDefensa as any).comprimento_total_tramo_m || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Quantidade Lâminas:</span>
                      <p className="text-sm">{(selectedDefensa as any).quantidade_laminas || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Níveis */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Níveis</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Risco:</span>
                      <p className="text-sm">{(selectedDefensa as any).risco || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Nível Contenção EN1317:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).nivel_contencao_en1317 && (selectedDefensa as any).nivel_contencao_en1317 !== "Não se Aplica" ? (
                          (selectedDefensa as any).nivel_contencao_en1317
                        ) : (
                          <span className="text-muted-foreground italic">Não especificado no cadastro</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Nível Contenção NCHRP350:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).nivel_contencao_nchrp350 && (selectedDefensa as any).nivel_contencao_nchrp350 !== "Não se Aplica" ? (
                          (selectedDefensa as any).nivel_contencao_nchrp350
                        ) : (
                          <span className="text-muted-foreground italic">Não especificado no cadastro</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Classificação Contenção:</span>
                      <p className="text-sm">{(selectedDefensa as any).classificacao_nivel_contencao || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Dados Técnicos */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Dados Técnicos</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Velocidade (km/h):</span>
                      <p className="text-sm">{(selectedDefensa as any).velocidade_kmh || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">VMD (veíc./dia):</span>
                      <p className="text-sm">{(selectedDefensa as any).vmd_veic_dia || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">% Veículos Pesados:</span>
                      <p className="text-sm">{(selectedDefensa as any).percentual_veiculos_pesados || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Geometria:</span>
                      <p className="text-sm">
                        {(selectedDefensa as any).geometria && (selectedDefensa as any).geometria !== "Não se Aplica" ? (
                          (selectedDefensa as any).geometria
                        ) : (
                          <span className="text-muted-foreground italic">Não especificado no cadastro</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Espaço de Trabalho:</span>
                      <p className="text-sm">{(selectedDefensa as any).espaco_trabalho || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Terminais */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Terminais</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Terminal Entrada:</span>
                      <p className="text-sm">{(selectedDefensa as any).terminal_entrada || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Terminal Saída:</span>
                      <p className="text-sm">{(selectedDefensa as any).terminal_saida || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Distâncias */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Distâncias</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Dist. Pista-Obstáculo (m):</span>
                      <p className="text-sm">{(selectedDefensa as any).distancia_pista_obstaculo_m || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Dist. Face Defensa-Obstáculo (m):</span>
                      <p className="text-sm">{(selectedDefensa as any).distancia_face_defensa_obstaculo_m || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Dist. Bordo-Face Defensa (m):</span>
                      <p className="text-sm">{(selectedDefensa as any).distancia_bordo_pista_face_defensa_m || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Adequação Funcional */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Adequação Funcional</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Adequação Lâmina:</span>
                      <p className="text-sm">{(selectedDefensa as any).adequacao_funcionalidade_lamina || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Lâminas Inadequadas:</span>
                      <p className="text-sm">{(selectedDefensa as any).adequacao_funcionalidade_laminas_inadequadas || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Adequação Terminais:</span>
                      <p className="text-sm">{(selectedDefensa as any).adequacao_funcionalidade_terminais || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Terminais Inadequados:</span>
                      <p className="text-sm">{(selectedDefensa as any).adequacao_funcionalidade_terminais_inadequados || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Obstáculo */}
                {(selectedDefensa as any).especificacao_obstaculo_fixo && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Obstáculo</h3>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Especificação:</span>
                      <p className="text-sm">{(selectedDefensa as any).especificacao_obstaculo_fixo}</p>
                    </div>
                  </div>
                )}

                {/* Data da Foto */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Data</h3>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Data da Foto:</span>
                    <p className="text-sm">{new Date(selectedDefensa.data_vistoria).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="foto" className="mt-4">
                <div className="border rounded-lg p-8 text-center">
                  {(() => {
                    const fotoUrl = (selectedDefensa as any).foto_url;
                    const linkFotografia = (selectedDefensa as any).link_fotografia;
                    
                    // Se tem URL da foto no Supabase
                    if (fotoUrl && fotoUrl !== "HIPERLINK") {
                      return (
                        <>
                          <p className="text-muted-foreground mb-4">Foto da defensa:</p>
                          <img 
                            src={fotoUrl} 
                            alt="Foto da defensa" 
                            className="mx-auto max-w-full rounded-lg"
                          />
                        </>
                      );
                    }
                    
                    // Se tem link externo
                    if (linkFotografia && linkFotografia !== "HIPERLINK" && linkFotografia.startsWith('http')) {
                      return (
                        <>
                          <p className="text-muted-foreground mb-4">Foto disponível via link externo:</p>
                          <a 
                            href={linkFotografia} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline hover:text-primary/80"
                          >
                            Abrir foto em nova aba
                          </a>
                        </>
                      );
                    }
                    
                    // Nenhuma foto disponível
                    return (
                      <div className="text-center">
                        <p className="text-muted-foreground mb-2">Nenhuma foto disponível</p>
                        <p className="text-sm text-muted-foreground/70">
                          As fotos devem ser importadas junto com a planilha ou os links devem estar preenchidos corretamente no Excel
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="historico" className="space-y-4 mt-4">
                <h3 className="font-semibold">Histórico de Intervenções</h3>
                {intervencoes.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">Nenhuma intervenção registrada para esta defensa.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {intervencoes.map((intervencao) => (
                      <div key={intervencao.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Data:</span>
                            <p className="text-sm">{new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Motivo:</span>
                            <p className="text-sm">{intervencao.motivo}</p>
                          </div>
                          {intervencao.extensao_metros && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Extensão:</span>
                              <p className="text-sm">{intervencao.extensao_metros} metros</p>
                            </div>
                          )}
                          {intervencao.estado_conservacao && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                              <p className="text-sm">{intervencao.estado_conservacao}</p>
                            </div>
                          )}
                          {intervencao.tipo_avaria && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Tipo Avaria:</span>
                              <p className="text-sm">{intervencao.tipo_avaria}</p>
                            </div>
                          )}
                          {intervencao.necessita_intervencao !== undefined && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Necessita Intervenção:</span>
                              <p className="text-sm">{intervencao.necessita_intervencao ? 'Sim' : 'Não'}</p>
                            </div>
                          )}
                          {intervencao.nivel_risco && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Nível Risco:</span>
                              <p className="text-sm">{intervencao.nivel_risco}</p>
                            </div>
                          )}
                          {intervencao.observacao && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Observação:</span>
                              <p className="text-sm">{intervencao.observacao}</p>
                            </div>
                          )}
                          {intervencao.foto_url && (
                            <div className="col-span-2">
                              <span className="text-sm font-medium text-muted-foreground">Foto:</span>
                              <p className="text-sm break-all">{intervencao.foto_url}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
        tipoElemento="defensas"
      />
    </div>
  );
};
