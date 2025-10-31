import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSupervisora } from "@/hooks/useSupervisora";
import { useWorkSession } from "@/hooks/useWorkSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, ExternalLink, Trash2, Filter, FileSpreadsheet, Map, BarChart3, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia-optimized.webp";

// const NecessidadesMap = lazy(() => import("@/components/NecessidadesMap"));
import NecessidadesMap from "@/components/NecessidadesMap";



interface Necessidade {
  id: string;
  servico: "Implantar" | "Substituir" | "Remover" | "Manter";
  cadastro_id: string | null;
  distancia_match_metros: number | null;
  overlap_porcentagem: number | null;
  tipo_match: string | null;
  status_revisao: string;
  motivo_revisao: string | null;
  arquivo_origem: string;
  linha_planilha: number;
  created_at: string;
  divergencia: boolean | null;
  reconciliado: boolean | null;
  rodovia?: { codigo: string; nome: string };
  lote?: { numero: string };
  [key: string]: any;
}

const TIPOS_NECESSIDADES = [
  { value: "cilindros", label: "Cilindros Delimitadores", table: "necessidades_cilindros" },
  { value: "defensas", label: "Defensas", table: "necessidades_defensas" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", table: "necessidades_marcas_longitudinais" },
  { value: "porticos", label: "Pórticos", table: "necessidades_porticos" },
  { value: "placas", label: "Placas de Sinalização Vertical", table: "necessidades_placas" },
  { value: "tachas", label: "Tachas Refletivas", table: "necessidades_tachas" },
  { value: "marcas_transversais", label: "Inscrições", table: "necessidades_marcas_transversais" },
];

const COLUNAS_POR_TIPO: Record<string, { header: string[]; fields: string[] }> = {
  marcas_longitudinais: {
    header: ["Tipo", "Material", "Extensão (m)"],
    fields: ["tipo_demarcacao", "material", "extensao_metros"]
  },
  tachas: {
    header: ["Refletivo", "Corpo", "Quantidade"],
    fields: ["refletivo", "corpo", "quantidade"]
  },
  marcas_transversais: {
    header: ["Tipo", "Cor", "Área (m²)"],
    fields: ["tipo_marca", "cor", "area_m2"]
  },
  cilindros: {
    header: ["Cor Corpo", "Cor Refletivo", "Quantidade"],
    fields: ["cor_corpo", "cor_refletivo", "quantidade"]
  },
  placas: {
    header: ["Código", "Tipo", "Dimensões"],
    fields: ["codigo", "tipo", "dimensoes_mm"]
  },
  porticos: {
    header: ["Tipo", "Altura (m)", "Vão (m)"],
    fields: ["tipo", "altura_livre_m", "vao_horizontal_m"]
  },
  defensas: {
    header: ["Nível", "Extensão (m)", "Lado"],
    fields: ["nivel_contencao_nchrp350", "extensao_metros", "lado"]
  }
};

const renderCelulaPorTipo = (nec: any, field: string) => {
  const valor = nec[field];
  
  if (!valor && valor !== 0) return "N/A";
  
  // Formatação especial para campos numéricos
  if (field.includes("extensao_metros")) {
    return `${Number(valor).toFixed(2)}m`;
  }
  
  if (field.includes("area_m2")) {
    return `${Number(valor).toFixed(2)}m²`;
  }
  
  if (field.includes("extensao_km")) {
    return `${Number(valor).toFixed(3)}km`;
  }
  
  if (field.includes("altura") || field.includes("vao")) {
    return `${Number(valor).toFixed(2)}m`;
  }
  
  // Badge para campos de tipo/código
  if (field.includes("tipo") || field.includes("codigo") || field.includes("refletivo")) {
    return <Badge variant="outline" className="font-mono text-xs">{valor}</Badge>;
  }
  
  // Quantidade em destaque
  if (field === "quantidade") {
    return <span className="font-medium">{valor}</span>;
  }
  
  return valor;
};

const MinhasNecessidades = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { user, loading: authLoading } = useAuth();
  const { data: supervisora } = useSupervisora();
  const { activeSession } = useWorkSession(user?.id);
  
  // Pegar tipo da URL ou usar primeiro como padrão
  const tipoFromUrl = searchParams.get("tipo");
  const tipoInicial = tipoFromUrl && TIPOS_NECESSIDADES.find(t => t.value === tipoFromUrl)
    ? tipoFromUrl
    : TIPOS_NECESSIDADES[0].value;
  
  const [tipoAtivo, setTipoAtivo] = useState(tipoInicial);
  const [necessidades, setNecessidades] = useState<Necessidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroServico, setFiltroServico] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [visualizacao, setVisualizacao] = useState<"tabela" | "mapa">("mapa");
  const [verTodasRodovias, setVerTodasRodovias] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const loadNecessidades = async (tipo: string) => {
    setLoading(true);
    try {
      const tipoConfig = TIPOS_NECESSIDADES.find(t => t.value === tipo);
      if (!tipoConfig) return;

      // Carregar TODOS os registros (sem limit = sem restrição de 1000)
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      const maxIterations = 50; // Máximo 50k registros para prevenir travamentos
      let iteration = 0;

      while (hasMore && iteration < maxIterations) {
        iteration++;
        
        let query = supabase
          .from(tipoConfig.table as any)
          .select(`
            *,
            rodovia:rodovias(codigo),
            lote:lotes(numero)
          `);
        
        // Filtrar por lote se houver sessão ativa
        if (activeSession?.lote_id) {
          query = query.eq("lote_id", activeSession.lote_id);
        }
        
        // Filtrar por rodovia APENAS se modo "Ver Todas" estiver desativado
        if (activeSession?.rodovia_id && !verTodasRodovias) {
          query = query.eq("rodovia_id", activeSession.rodovia_id);
        }
        
        const { data, error } = await query
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
          
          // Feedback visual de progresso (apenas a cada 10 iterações em dev)
          if (import.meta.env.DEV && iteration % 10 === 0) {
            console.log(`Carregando... ${allData.length} registros`);
          }
        } else {
          hasMore = false;
        }
      }

      if (iteration >= maxIterations) {
        console.warn(`Limite de ${maxIterations * batchSize} registros atingido`);
        toast.warning(`Carregados ${allData.length} registros (pode haver mais)`, {
          duration: 5000
        });
      }

      if (import.meta.env.DEV) {
        console.log("✅ Necessidades carregadas:", allData.length, "registros");
        console.log("Serviços encontrados:", [...new Set(allData.map((d: any) => d.servico))]);
      }
      
      setNecessidades(allData);
    } catch (error: any) {
      toast.error("Erro ao carregar necessidades: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeSession) {
      // Força reload removendo cache anterior
      setNecessidades([]);
      loadNecessidades(tipoAtivo);
    }
  }, [user, activeSession?.lote_id, tipoAtivo, verTodasRodovias]);

  // Scroll automático + highlight quando houver highlight na URL
  useEffect(() => {
    if (highlightId && necessidades && necessidades.length > 0) {
      const timer = setTimeout(() => {
        const elemento = document.getElementById(`necessidade-row-${highlightId}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: "smooth", block: "center" });
          elemento.classList.add("animate-pulse", "bg-yellow-50");
          
          setTimeout(() => {
            elemento.classList.remove("animate-pulse");
          }, 3000);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [highlightId, necessidades]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta necessidade?")) return;

    try {
      const tipoConfig = TIPOS_NECESSIDADES.find(t => t.value === tipoAtivo);
      if (!tipoConfig) return;

      const { error } = await supabase
        .from(tipoConfig.table as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Necessidade excluída");
      loadNecessidades(tipoAtivo);
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const getServicoBadge = (servico: string) => {
    const configs = {
      "Implantar": { variant: "default" as const, className: "bg-green-500 hover:bg-green-600", icon: "🟢" },
      "Substituir": { variant: "secondary" as const, className: "bg-yellow-500 hover:bg-yellow-600", icon: "🟡" },
      "Remover": { variant: "destructive" as const, className: "", icon: "🔴" },
      "Manter": { variant: "outline" as const, className: "bg-blue-500 hover:bg-blue-600 text-white", icon: "🔵" },
    };

    const config = configs[servico as keyof typeof configs] || configs["Implantar"];

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.icon} {servico}
      </Badge>
    );
  };

  const necessidadesFiltradas = necessidades.filter(n => {
    if (filtroServico !== "todos" && n.servico !== filtroServico) return false;
    if (filtroStatus !== "todos" && n.status_revisao !== filtroStatus) return false;
    if (busca && !JSON.stringify(n).toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const logoToDisplay = supervisora?.usar_logo_customizado && supervisora?.logo_url 
    ? supervisora.logo_url 
    : logoOperaVia;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-lg px-3 py-2 shadow-md">
                <img 
                  src={logoToDisplay}
                  alt="Logo"
                  className="h-16 object-contain cursor-pointer hover:scale-105 transition-transform" 
                  onClick={() => navigate("/")}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Necessidades Levantadas pelo Projeto</h1>
                <p className="text-sm text-primary-foreground/80">Serviços planejados para as rodovias</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="lg"
                onClick={() => navigate("/")}
                className="font-semibold shadow-md"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={tipoAtivo} onValueChange={setTipoAtivo} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6 relative z-20 bg-background">
            {TIPOS_NECESSIDADES.map(tipo => (
              <TabsTrigger key={tipo.value} value={tipo.value} className="relative z-20">
                {tipo.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TIPOS_NECESSIDADES.map(tipo => (
            <TabsContent key={tipo.value} value={tipo.value}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {tipo.label}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        Total: {necessidadesFiltradas.length} necessidades
                        {activeSession && (
                          <Badge variant="outline" className={verTodasRodovias ? "border-blue-500 text-blue-700 bg-blue-50" : ""}>
                            {verTodasRodovias ? (
                              <>🌍 Lote {activeSession.lote?.numero} - Todas Rodovias</>
                            ) : (
                              <>{activeSession.rodovia?.codigo} - Lote {activeSession.lote?.numero}</>
                            )}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>

                    {/* Filtros e Visualização */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Botão Ver Todas Rodovias */}
                      <Button
                        size="sm"
                        variant={verTodasRodovias ? "default" : "outline"}
                        onClick={() => setVerTodasRodovias(!verTodasRodovias)}
                        className={verTodasRodovias ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                      >
                        <Map className="h-4 w-4 mr-2" />
                        {verTodasRodovias ? "🌍 Todas Rodovias" : "Ver Todas Rodovias"}
                      </Button>
                      
                      <div className="flex border rounded-lg overflow-hidden">
                        <Button
                          variant={visualizacao === "tabela" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setVisualizacao("tabela")}
                          className="rounded-none"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Tabela
                        </Button>
                        <Button
                          variant={visualizacao === "mapa" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setVisualizacao("mapa")}
                          className="rounded-none"
                        >
                          <Map className="h-4 w-4 mr-2" />
                          Mapa
                        </Button>
                      </div>

                      <Select value={filtroServico} onValueChange={setFiltroServico}>
                        <SelectTrigger className="w-[180px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os serviços</SelectItem>
                          <SelectItem value="Implantar">🟢 Implantar</SelectItem>
                          <SelectItem value="Substituir">🟡 Substituir</SelectItem>
                          <SelectItem value="Remover">🔴 Remover</SelectItem>
                          <SelectItem value="Manter">🔵 Manter</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Filtro de Status de Revisão (só para elementos lineares) */}
                      {["marcas_longitudinais", "tachas", "defensas"].includes(tipoAtivo) && (
                        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Status de Revisão" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os Status</SelectItem>
                            <SelectItem value="ok">✅ OK</SelectItem>
                            <SelectItem value="pendente_coordenador">⚠️ Pendentes</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <Input
                        placeholder="Buscar..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-[200px]"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Alerta de Divergências Pendentes */}
                  {necessidadesFiltradas.filter(n => n.divergencia && !n.reconciliado).length > 0 && (
                    <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="font-semibold text-amber-900">
                              {necessidadesFiltradas.filter(n => n.divergencia && !n.reconciliado).length} divergências pendentes de reconciliação
                            </p>
                            <p className="text-sm text-amber-700">
                              Existem diferenças entre a decisão do projeto e a análise automática do sistema
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          className="bg-amber-600 hover:bg-amber-700"
                          onClick={() => navigate(`/reconciliacao-pendente?grupo=${tipoAtivo}`)}
                        >
                          Reconciliar Agora
                        </Button>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : necessidadesFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma necessidade encontrada
                    </div>
                  ) : visualizacao === "mapa" ? (
                    <Suspense fallback={
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    }>
                      <NecessidadesMap 
                        necessidades={necessidadesFiltradas} 
                        tipo={tipoAtivo}
                        rodoviaId={activeSession?.rodovia_id}
                        loteId={activeSession?.lote_id}
                        rodovia={activeSession?.rodovia}
                        lote={activeSession?.lote}
                      />
                    </Suspense>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serviço</TableHead>
                            <TableHead>Rodovia/Lote</TableHead>
                            <TableHead>Localização</TableHead>
                            {COLUNAS_POR_TIPO[tipoAtivo]?.header.map(col => (
                              <TableHead key={col}>{col}</TableHead>
                            ))}
                            <TableHead>Match</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {necessidadesFiltradas.map((nec) => (
                            <TableRow key={nec.id} id={`necessidade-row-${nec.id}`}>
                              <TableCell>
                                {getServicoBadge(nec.servico)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{nec.rodovia?.codigo || "-"}</div>
                                  <div className="text-muted-foreground">Lote {nec.lote?.numero || "-"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {nec.km_inicial && nec.km_final ? (
                                    <>km {Number(nec.km_inicial).toFixed(3)} - {Number(nec.km_final).toFixed(3)}</>
                                  ) : nec.km_inicial ? (
                                    <>km {Number(nec.km_inicial).toFixed(3)}</>
                                  ) : (
                                    "-"
                                  )}
                                </div>
                              </TableCell>
                              {/* Colunas dinâmicas baseadas no tipo */}
                              {COLUNAS_POR_TIPO[tipoAtivo]?.fields.map(field => (
                                <TableCell key={field} className="text-sm">
                                  {renderCelulaPorTipo(nec, field)}
                                </TableCell>
                              ))}
                              <TableCell>
                                {nec.cadastro_id ? (
                                  <div className="space-y-1">
                                    {/* Match por GPS (placas e outros pontos únicos) */}
                                    {nec.distancia_match_metros !== null && nec.distancia_match_metros !== undefined && (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs gap-1 ${
                                          nec.divergencia && !nec.reconciliado 
                                            ? 'border-amber-400 text-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors' 
                                            : ''
                                        }`}
                                        onClick={() => {
                                          if (nec.divergencia && !nec.reconciliado) {
                                            navigate(`/reconciliacao-pendente?grupo=${tipoAtivo}&highlight=${nec.id}`);
                                          }
                                        }}
                                      >
                                        {nec.divergencia && !nec.reconciliado ? (
                                          <AlertCircle className="h-3 w-3" />
                                        ) : (
                                          <ExternalLink className="h-3 w-3" />
                                        )}
                                        {nec.distancia_match_metros.toFixed(0)}m
                                      </Badge>
                                    )}
                                    
                                    {/* Match por Overlap (elementos lineares) */}
                                    {nec.overlap_porcentagem !== null && nec.overlap_porcentagem !== undefined && (
                                      <div className="flex flex-col gap-1">
                                        <Badge 
                                          variant={
                                            nec.tipo_match === 'exato' ? 'default' : 
                                            nec.tipo_match === 'alto' ? 'secondary' : 
                                            'outline'
                                          }
                                          className={`text-xs ${
                                            nec.divergencia && !nec.reconciliado 
                                              ? 'border-amber-400 text-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors' 
                                              : ''
                                          }`}
                                          onClick={() => {
                                            if (nec.divergencia && !nec.reconciliado) {
                                              navigate(`/reconciliacao-pendente?grupo=${tipoAtivo}&highlight=${nec.id}`);
                                            }
                                          }}
                                        >
                                          {nec.divergencia && !nec.reconciliado ? (
                                            <AlertCircle className="h-3 w-3 inline mr-1" />
                                          ) : (
                                            '📏 '
                                          )}
                                          {nec.overlap_porcentagem.toFixed(1)}% overlap
                                        </Badge>
                                        {nec.tipo_match && (
                                          <span className="text-xs text-muted-foreground">
                                            ({nec.tipo_match})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Status de Revisão */}
                                    {nec.status_revisao === 'pendente_coordenador' && (
                                      <Badge 
                                        variant="destructive" 
                                        className="text-xs cursor-pointer hover:bg-destructive/90 transition-colors"
                                        onClick={() => navigate(`/reconciliacao-pendente?grupo=${tipoAtivo}&highlight=${nec.id}`)}
                                      >
                                        ⚠️ Requer Revisão
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sem match</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(nec.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:contato@operavia.online" className="text-primary hover:underline">contato@operavia.online</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MinhasNecessidades;
