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
import { Search, MapPin, Eye, Calendar, Library, FileText, ArrowUpDown, ArrowUp, ArrowDown, Plus, ClipboardList, AlertCircle, Filter, CheckCircle, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RegistrarItemNaoCadastrado } from "@/components/RegistrarItemNaoCadastrado";
import { ReconciliacaoDrawerUniversal } from "@/components/ReconciliacaoDrawerUniversal";
import { NecessidadeBadge } from "@/components/NecessidadeBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OrigemIndicator } from "@/components/OrigemIndicator";
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
  corpo: string | null;
  refletivo: string | null;
  tipo_refletivo: string | null;
  cor_refletivo: string | null;
  descricao: string | null;
  extensao_km: number | null;
  local_implantacao: string | null;
  espacamento_m: number | null;
  quantidade: number;
  origem?: string;
  tipo_origem?: string;
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
  const [showRegistrarNaoCadastrado, setShowRegistrarNaoCadastrado] = useState(false);
  const [showOnlyPendentes, setShowOnlyPendentes] = useState(false);
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

  const { data: necessidadesMap, refetch: refetchNecessidades } = useQuery({
    queryKey: ["necessidades-match-tachas", loteId, rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("necessidades_tachas")
        .select(`*, reconciliacao:reconciliacoes(id, status, distancia_match_metros)`)
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
    nec => !nec.reconciliado
  ).length;

  // Contar TODAS as necessidades com match (não apenas divergências)
  const totalMatchesProcessados = Array.from(necessidadesMap?.values() || []).length;

  // Debug: Log dos contadores
  console.log('🔍 [TACHAS] Debug Banner:', {
    loteId,
    rodoviaId,
    necessidadesMapSize: necessidadesMap?.size,
    totalMatchesProcessados,
    matchesPendentes,
    necesssidadesArray: Array.from(necessidadesMap?.values() || [])
  });

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
          `snv.ilike.%${searchTerm}%,corpo.ilike.%${searchTerm}%,cor_refletivo.ilike.%${searchTerm}%,local_implantacao.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`
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
            // Não filtrar por distância - apenas ordenar
            .sort((a, b) => a.distance - b.distance);
        }
      } else {
        filteredData = filteredData.sort((a, b) => a.km_inicial - b.km_inicial);
      }

      return filteredData;
    },
  });

  const filteredTachas = tachas?.filter(tacha => {
    if (!showOnlyPendentes) return true;
    const nec = necessidadesMap?.get(tacha.id);
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
  const sortedTachas = filteredTachas ? [...filteredTachas].sort((a, b) => {
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-necessidades?tipo=tachas")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Ver Necessidades
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/minhas-intervencoes?tab=tacha")}
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
                      id="filtro-pendentes-tachas"
                    />
                    <Label htmlFor="filtro-pendentes-tachas" className="cursor-pointer text-sm font-medium">
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
                    id="filtro-pendentes-tachas"
                  />
                  <Label htmlFor="filtro-pendentes-tachas" className="cursor-pointer text-sm font-medium">
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
                placeholder="Pesquisar por SNV, descrição, corpo, cor ou local..."
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
          ) : sortedTachas && sortedTachas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      {searchLat && searchLng && <TableHead className="text-center">Distância</TableHead>}
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
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("descricao")}
                      >
                        <div className="flex items-center">
                          Descrição
                          <SortIcon column="descricao" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("corpo")}
                      >
                        <div className="flex items-center justify-center">
                          Corpo
                          <SortIcon column="corpo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("refletivo")}
                      >
                        <div className="flex items-center justify-center">
                          Refletivo
                          <SortIcon column="refletivo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("cor_refletivo")}
                      >
                        <div className="flex items-center justify-center">
                          Cor Refletivo
                          <SortIcon column="cor_refletivo" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("km_inicial")}
                      >
                        <div className="flex items-center justify-center">
                          km Inicial
                          <SortIcon column="km_inicial" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("extensao_km")}
                      >
                        <div className="flex items-center justify-center">
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
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("quantidade")}
                      >
                        <div className="flex items-center justify-center">
                          Quantidade
                          <SortIcon column="quantidade" />
                        </div>
                      </TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTachas.map((tacha) => (
                      <TableRow key={tacha.id} className="hover:bg-muted/50">
                        {searchLat && searchLng && (
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {(tacha as any).distance?.toFixed(1)}m
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <OrigemIndicator 
                            origem={tacha.origem}
                            tipoOrigem={tacha.tipo_origem}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{tacha.snv || "-"}</TableCell>
                        <TableCell>
                          {tacha.descricao || <span className="text-muted-foreground italic text-xs">Não informado</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {tacha.corpo || <span className="text-muted-foreground italic text-xs">Não especificado</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {tacha.refletivo || <span className="text-muted-foreground italic text-xs">Não especificado</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {tacha.cor_refletivo || <span className="text-muted-foreground italic text-xs">Não especificado</span>}
                        </TableCell>
                        <TableCell className="text-center">{tacha.km_inicial.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{tacha.extensao_km?.toFixed(2) || "-"}</TableCell>
                        <TableCell>
                          {tacha.local_implantacao && tacha.local_implantacao !== "Não se Aplica" ? (
                            tacha.local_implantacao
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Não especificado no cadastro</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{tacha.quantidade}</TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const necessidade = necessidadesMap?.get(tacha.id);
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
                                tipo="tachas" 
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
                              const necessidade = necessidadesMap?.get(tacha.id);
                              if (!necessidade) return null;
                              
                              return (
                                <>
                                  <StatusReconciliacaoBadge 
                                    status={necessidade.status_reconciliacao} 
                                  />
                                  {necessidade && !necessidade.reconciliado && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedNecessidade(necessidade);
                                        setSelectedCadastroForReconciliacao(tacha);
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

      <Dialog open={showRegistrarNaoCadastrado} onOpenChange={setShowRegistrarNaoCadastrado}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <RegistrarItemNaoCadastrado
              tipo_elemento="tachas"
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
                  </div>
                </div>

                {/* Características */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Características</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Corpo:</span>
                      <p className="text-sm">{selectedTacha.corpo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Refletivo:</span>
                      <p className="text-sm">{selectedTacha.refletivo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo do Refletivo:</span>
                      <p className="text-sm">{selectedTacha.tipo_refletivo || "Não informado"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Cor do Refletivo:</span>
                      <p className="text-sm">{selectedTacha.cor_refletivo || "Não informado"}</p>
                    </div>
                  </div>
                  
                  {selectedTacha.descricao && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                      <p className="text-sm mt-1">{selectedTacha.descricao}</p>
                    </div>
                  )}
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
                      <span className="text-sm font-medium text-muted-foreground">km Final:</span>
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
              </TabsContent>

              <TabsContent value="foto" className="mt-4">
                <p className="text-center py-8 text-muted-foreground">
                  Fotos de intervenções estão disponíveis no histórico
                </p>
              </TabsContent>

              <TabsContent value="historico" className="space-y-4 mt-4">
                <h3 className="font-semibold">Histórico de Intervenções</h3>
                {intervencoes.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma intervenção registrada para esta tacha.</p>
                ) : (
                  <div className="space-y-4">
                    {intervencoes.map((intervencao) => (
                      <div key={intervencao.id} className="border rounded-lg p-4 space-y-2">
                        <p><strong>Data:</strong> {new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Motivo:</strong> {intervencao.motivo}</p>
                        {intervencao.quantidade && (
                          <p><strong>Quantidade:</strong> {intervencao.quantidade}</p>
                        )}
                        {intervencao.corpo && (
                          <p><strong>Corpo:</strong> {intervencao.corpo}</p>
                        )}
                        {intervencao.refletivo && (
                          <p><strong>Descrição:</strong> {intervencao.refletivo}</p>
                        )}
                        {intervencao.tipo_refletivo && (
                          <p><strong>Tipo do Refletivo:</strong> {intervencao.tipo_refletivo}</p>
                        )}
                        {intervencao.cor_refletivo && (
                          <p><strong>Cor do Refletivo:</strong> {intervencao.cor_refletivo}</p>
                        )}
                        {intervencao.local_implantacao && (
                          <p><strong>Local de Implantação:</strong> {intervencao.local_implantacao}</p>
                        )}
                        {intervencao.descricao && (
                          <p><strong>Descrição:</strong> {intervencao.descricao}</p>
                        )}
                        {intervencao.observacao && (
                          <p><strong>Observações:</strong> {intervencao.observacao}</p>
                        )}
                        {intervencao.foto_url && (
                          <div className="mt-2">
                            <strong>Foto:</strong>
                            <img
                              src={supabase.storage.from('tachas').getPublicUrl(intervencao.foto_url).data.publicUrl}
                              alt="Intervenção"
                              className="rounded-lg mt-2 max-w-sm"
                            />
                          </div>
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

      {/* Drawer de Reconciliação */}
      <ReconciliacaoDrawerUniversal
        open={reconciliacaoOpen}
        onOpenChange={setReconciliacaoOpen}
        necessidade={selectedNecessidade}
        cadastro={selectedCadastroForReconciliacao}
        onReconciliar={handleReconciliar}
        tipoElemento="tachas"
      />
    </>
  );
}
