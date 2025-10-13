import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSupervisora } from "@/hooks/useSupervisora";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, MapPin, FileCheck, Calendar, Filter } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import logoOperaVia from "@/assets/logo-operavia.jpg";

const TIPOS_NECESSIDADES = [
  { value: "marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "tachas", label: "Tachas" },
  { value: "marcas_transversais", label: "Zebrados" },
  { value: "cilindros", label: "Cilindros" },
  { value: "placas", label: "Placas" },
  { value: "porticos", label: "Pórticos" },
  { value: "defensas", label: "Defensas" },
];

const COLORS = {
  Implantar: "#22c55e",
  Substituir: "#eab308",
  Remover: "#ef4444",
  Manter: "#3b82f6",
};

export default function DashboardNecessidades() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: supervisora } = useSupervisora();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [lotes, setLotes] = useState<any[]>([]);
  const [rodovias, setRodovias] = useState<any[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>("all");
  const [selectedRodoviaId, setSelectedRodoviaId] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadAvailableFilters();
    }
  }, [user]);

  useEffect(() => {
    if (user && lotes.length > 0) {
      loadStats();
    }
  }, [user, selectedLoteId, selectedRodoviaId, lotes]);

  const loadAvailableFilters = async () => {
    try {
      // Buscar empresa_id do usuário
      const { data: profile } = await supabase
        .from("profiles")
        .select("empresa_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.empresa_id) {
        console.error("Usuário não tem empresa associada");
        return;
      }

      // Buscar lotes da empresa com rodovias
      const { data: lotesData } = await supabase
        .from("lotes")
        .select(`
          id,
          numero,
          rodovia_id,
          rodovias!inner(id, codigo, nome)
        `)
        .eq("empresa_id", profile.empresa_id);

      if (lotesData && lotesData.length > 0) {
        // Transformar dados para ter a estrutura correta
        const lotesTransformados = lotesData.map((lote: any) => ({
          id: lote.id,
          numero: lote.numero,
          rodovia: Array.isArray(lote.rodovias) ? lote.rodovias[0] : lote.rodovias
        }));
        
        setLotes(lotesTransformados);
        
        // Extrair rodovias únicas
        const rodoviasMap = new Map();
        lotesTransformados.forEach(lote => {
          if (lote.rodovia) {
            rodoviasMap.set(lote.rodovia.id, lote.rodovia);
          }
        });
        setRodovias(Array.from(rodoviasMap.values()));
      }
    } catch (error) {
      console.error("Erro ao carregar filtros disponíveis:", error);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      // Definir quais lotes usar baseado no filtro
      let loteIds: string[] = [];
      
      if (selectedLoteId === "all") {
        loteIds = lotes.map(l => l.id);
      } else {
        loteIds = [selectedLoteId];
      }

      if (loteIds.length === 0) {
        setStats({
          porTipo: [],
          porServico: { Implantar: 0, Substituir: 0, Remover: 0, Manter: 0 },
          porRodovia: [],
          porLote: [],
          taxaMatch: 0,
          timeline: [],
          totalGeral: 0,
        });
        setLoading(false);
        return;
      }

      const allStats: any = {
        porTipo: [],
        porServico: { Implantar: 0, Substituir: 0, Remover: 0, Manter: 0 },
        porRodovia: [],
        porLote: [],
        taxaMatch: 0,
        timeline: [],
        totalGeral: 0,
      };

      let totalComMatch = 0;
      let totalSemMatch = 0;

      // Buscar dados de cada tipo
      for (const tipo of TIPOS_NECESSIDADES) {
        console.log(`Buscando necessidades de ${tipo.label} para lotes:`, loteIds);
        
        let query = supabase
          .from(`necessidades_${tipo.value}` as any)
          .select(`
            *,
            rodovia:rodovias(codigo, nome),
            lote:lotes(numero)
          `)
          .in("lote_id", loteIds);

        // Aplicar filtro de rodovia se selecionado
        if (selectedRodoviaId !== "all") {
          query = query.eq("rodovia_id", selectedRodoviaId);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Erro ao carregar ${tipo.label}:`, error);
          continue;
        }

        const necessidades = (data as any[]) || [];
        console.log(`${tipo.label}: ${necessidades.length} necessidades encontradas`);

        // Stats por tipo
        allStats.porTipo.push({
          tipo: tipo.label,
          total: necessidades.length,
          Implantar: necessidades.filter((n: any) => n.servico === "Implantar").length,
          Substituir: necessidades.filter((n: any) => n.servico === "Substituir").length,
          Remover: necessidades.filter((n: any) => n.servico === "Remover").length,
          Manter: necessidades.filter((n: any) => n.servico === "Manter").length,
        });

        // Stats por serviço
        allStats.porServico.Implantar += necessidades.filter((n: any) => n.servico === "Implantar").length;
        allStats.porServico.Substituir += necessidades.filter((n: any) => n.servico === "Substituir").length;
        allStats.porServico.Remover += necessidades.filter((n: any) => n.servico === "Remover").length;
        allStats.porServico.Manter += necessidades.filter((n: any) => n.servico === "Manter").length;

        // Taxa de match
        totalComMatch += necessidades.filter((n: any) => n.cadastro_id).length;
        totalSemMatch += necessidades.filter((n: any) => !n.cadastro_id).length;

        // Stats por rodovia
        necessidades.forEach((n: any) => {
          if (n.rodovia) {
            const existing = allStats.porRodovia.find((r: any) => r.rodovia === n.rodovia.codigo);
            if (existing) {
              existing.total++;
              existing[n.servico]++;
            } else {
              allStats.porRodovia.push({
                rodovia: n.rodovia.codigo,
                total: 1,
                Implantar: n.servico === "Implantar" ? 1 : 0,
                Substituir: n.servico === "Substituir" ? 1 : 0,
                Remover: n.servico === "Remover" ? 1 : 0,
                Manter: n.servico === "Manter" ? 1 : 0,
              });
            }
          }
        });

        // Stats por lote
        necessidades.forEach((n: any) => {
          if (n.lote) {
            const existing = allStats.porLote.find((l: any) => l.lote === n.lote.numero);
            if (existing) {
              existing.total++;
            } else {
              allStats.porLote.push({
                lote: `Lote ${n.lote.numero}`,
                total: 1,
              });
            }
          }
        });

        // Timeline (agrupado por mês)
        necessidades.forEach((n: any) => {
          const mes = new Date(n.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
          const existing = allStats.timeline.find((t: any) => t.mes === mes);
          if (existing) {
            existing.total++;
          } else {
            allStats.timeline.push({ mes, total: 1 });
          }
        });
      }

      // Calcular taxa de match
      const totalNecessidades = totalComMatch + totalSemMatch;
      allStats.taxaMatch = totalNecessidades > 0 
        ? Math.round((totalComMatch / totalNecessidades) * 100)
        : 0;

      allStats.totalGeral = totalNecessidades;

      // Ordenar
      allStats.porRodovia.sort((a: any, b: any) => b.total - a.total);
      allStats.porLote.sort((a: any, b: any) => b.total - a.total);
      allStats.timeline.sort((a: any, b: any) => {
        const [mesA, anoA] = a.mes.split(" ");
        const [mesB, anoB] = b.mes.split(" ");
        return new Date(`${mesA} 1, ${anoA}`).getTime() - new Date(`${mesB} 1, ${anoB}`).getTime();
      });
      
      setStats(allStats);
    } catch (error: any) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const logoToDisplay = supervisora?.usar_logo_customizado && supervisora?.logo_url 
    ? supervisora.logo_url 
    : logoOperaVia;

  const dadosPizza = Object.entries(stats.porServico).map(([name, value]) => ({
    name,
    value,
  }));

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
                <h1 className="text-xl font-bold text-primary-foreground">Dashboard de Necessidades</h1>
                <p className="text-sm text-primary-foreground/80">Analytics e estatísticas do sistema</p>
              </div>
            </div>
            <Button 
              variant="default" 
              size="lg"
              onClick={() => navigate("/minhas-necessidades")}
              className="font-semibold shadow-md"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>Selecione o lote ou rodovia para visualizar os dados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lote</label>
                <Select value={selectedLoteId} onValueChange={setSelectedLoteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os lotes</SelectItem>
                    {lotes.map((lote) => (
                      <SelectItem key={lote.id} value={lote.id}>
                        Lote {lote.numero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rodovia</label>
                <Select value={selectedRodoviaId} onValueChange={setSelectedRodoviaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma rodovia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as rodovias</SelectItem>
                    {rodovias.map((rodovia) => (
                      <SelectItem key={rodovia.id} value={rodovia.id}>
                        {rodovia.codigo} - {rodovia.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalGeral}</div>
              <p className="text-xs text-muted-foreground mt-1">Necessidades cadastradas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Implantar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.porServico.Implantar || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalGeral > 0 ? Math.round((stats.porServico.Implantar / stats.totalGeral) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Substituir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.porServico.Substituir || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalGeral > 0 ? Math.round((stats.porServico.Substituir / stats.totalGeral) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remover</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.porServico.Remover || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalGeral > 0 ? Math.round((stats.porServico.Remover / stats.totalGeral) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Manter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.porServico.Manter || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalGeral > 0 ? Math.round((stats.porServico.Manter / stats.totalGeral) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="visao-geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="por-tipo">Por Tipo</TabsTrigger>
            <TabsTrigger value="geografia">Geografia</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Distribuição por Tipo de Serviço
                  </CardTitle>
                  <CardDescription>Proporção de cada tipo de necessidade</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dadosPizza}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline de Importações
                  </CardTitle>
                  <CardDescription>Evolução das necessidades ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} name="Necessidades" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="por-tipo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Necessidades por Tipo de Elemento
                </CardTitle>
                <CardDescription>Distribuição detalhada por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stats.porTipo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Implantar" fill={COLORS.Implantar} />
                    <Bar dataKey="Substituir" fill={COLORS.Substituir} />
                    <Bar dataKey="Remover" fill={COLORS.Remover} />
                    <Bar dataKey="Manter" fill={COLORS.Manter} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geografia" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Por Rodovia
                  </CardTitle>
                  <CardDescription>Top rodovias com mais necessidades</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.porRodovia.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="rodovia" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Por Lote
                  </CardTitle>
                  <CardDescription>Distribuição por lote de concessão</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.porLote.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="lote" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance do Algoritmo de Match
                </CardTitle>
                <CardDescription>Taxa de sucesso do match automático por coordenadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taxa de Match Geral</span>
                    <span className="text-2xl font-bold text-green-600">{stats.taxaMatch}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full transition-all" 
                      style={{ width: `${stats.taxaMatch}%` }}
                    />
                  </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.totalGeral - (stats.porServico.Implantar || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Com Match no Cadastro</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.porServico.Implantar || 0}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Novas Inclusões</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
