import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSupervisora } from "@/hooks/useSupervisora";
import { useWorkSession } from "@/hooks/useWorkSession";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, MapPin, FileCheck, Calendar } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import logoOperaVia from "@/assets/logo-operavia.jpg";

const TIPOS_NECESSIDADES = [
  { value: "cilindros", label: "Cilindros Delimitadores" },
  { value: "defensas", label: "Defensas" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "porticos", label: "Pórticos" },
  { value: "placas", label: "Placas de Sinalização Vertical" },
  { value: "tachas", label: "Tachas Refletivas" },
  { value: "marcas_transversais", label: "Zebrados (Marcas Transversais)" },
];

const COLORS = {
  Implantar: "#22c55e",
  Substituir: "#eab308",
  Remover: "#ef4444",
  Manter: "#3b82f6",
};

const CORES_GRUPOS: Record<string, string> = {
  "Placas de Sinalização Vertical": "#3b82f6",
  "Marcas Longitudinais": "#10b981",
  "Tachas Refletivas": "#f59e0b",
  "Zebrados (Marcas Transversais)": "#8b5cf6",
  "Cilindros Delimitadores": "#ec4899",
  "Pórticos": "#06b6d4",
  "Defensas": "#ef4444",
};

export default function DashboardNecessidades() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: supervisora } = useSupervisora();
  const { activeSession } = useWorkSession(user?.id);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [loteInfo, setLoteInfo] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && activeSession) {
      loadStats();
    }
  }, [user, activeSession?.lote_id]);

  const loadStats = async () => {
    setLoading(true);
    try {
      console.log("Carregando stats para lote:", activeSession?.lote_id);

      // Usar o lote_id da sessão ativa
      const loteIdFiltro = activeSession?.lote_id;

      if (!loteIdFiltro) {
        console.error("Nenhuma sessão ativa encontrada");
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

      // Buscar info do lote
      const { data: loteData } = await supabase
        .from("lotes")
        .select("numero")
        .eq("id", loteIdFiltro)
        .maybeSingle();

      // Buscar info da rodovia
      const { data: rodoviaData } = await supabase
        .from("rodovias")
        .select("codigo")
        .eq("id", activeSession.rodovia_id)
        .maybeSingle();

      setLoteInfo({
        numero: loteData?.numero || "N/A",
        rodovia: rodoviaData ? {
          codigo: rodoviaData.codigo || "N/A"
        } : null
      });

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

      // Buscar dados de cada tipo usando QUERIES AGREGADAS (resolve limite de 1000)
      for (const tipo of TIPOS_NECESSIDADES) {
        console.log(`📊 Agregando stats de ${tipo.label} para lote ${loteIdFiltro}`);
        
        const tabela = `necessidades_${tipo.value}` as any;

        // ===== 1. TOTAL GERAL =====
        const { count: totalTipo } = await supabase
          .from(tabela)
          .select("*", { count: "exact", head: true })
          .eq("lote_id", loteIdFiltro);

        console.log(`  ✓ Total: ${totalTipo}`);

        // ===== 2. CONTAGEM POR SERVIÇO (4 queries paralelas) =====
        const [
          { count: countImplantar },
          { count: countSubstituir },
          { count: countRemover },
          { count: countManter }
        ] = await Promise.all([
          supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("servico", "Implantar"),
          supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("servico", "Substituir"),
          supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("servico", "Remover"),
          supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("servico", "Manter"),
        ]);

        console.log(`  ✓ Por serviço: I=${countImplantar} S=${countSubstituir} R=${countRemover} M=${countManter}`);

        // ===== 3. TAXA DE MATCH =====
        const [
          { count: comMatch },
          { count: semMatch }
        ] = await Promise.all([
          supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).not("cadastro_id", "is", null),
          supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).is("cadastro_id", null),
        ]);

        totalComMatch += comMatch || 0;
        totalSemMatch += semMatch || 0;

        console.log(`  ✓ Match: Com=${comMatch} Sem=${semMatch}`);

        // ===== 4. STATS POR RODOVIA =====
        // Buscar lista única de rodovias neste lote
        const { data: rodoviasData } = await supabase
          .from(tabela)
          .select("rodovia_id")
          .eq("lote_id", loteIdFiltro)
          .not("rodovia_id", "is", null);

        const rodoviasUnicas = [...new Set((rodoviasData || []).map((r: any) => r.rodovia_id))];

        for (const rodoviaId of rodoviasUnicas) {
          // Buscar código da rodovia
          const { data: rodoviaInfo } = await supabase
            .from("rodovias")
            .select("codigo")
            .eq("id", rodoviaId)
            .maybeSingle();

          if (!rodoviaInfo) continue;

          // Contar por serviço para esta rodovia
          const [
            { count: totalRodovia },
            { count: implantarRodovia },
            { count: substituirRodovia },
            { count: removerRodovia },
            { count: manterRodovia }
          ] = await Promise.all([
            supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("rodovia_id", rodoviaId),
            supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("rodovia_id", rodoviaId).eq("servico", "Implantar"),
            supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("rodovia_id", rodoviaId).eq("servico", "Substituir"),
            supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("rodovia_id", rodoviaId).eq("servico", "Remover"),
            supabase.from(tabela).select("*", { count: "exact", head: true }).eq("lote_id", loteIdFiltro).eq("rodovia_id", rodoviaId).eq("servico", "Manter"),
          ]);

          const existing = allStats.porRodovia.find((r: any) => r.rodovia === rodoviaInfo.codigo);
          if (existing) {
            existing.total += totalRodovia || 0;
            existing.Implantar += implantarRodovia || 0;
            existing.Substituir += substituirRodovia || 0;
            existing.Remover += removerRodovia || 0;
            existing.Manter += manterRodovia || 0;
          } else {
            allStats.porRodovia.push({
              rodovia: rodoviaInfo.codigo,
              total: totalRodovia || 0,
              Implantar: implantarRodovia || 0,
              Substituir: substituirRodovia || 0,
              Remover: removerRodovia || 0,
              Manter: manterRodovia || 0,
            });
          }
        }

        // ===== 5. ADICIONAR AOS TOTAIS =====
        allStats.porTipo.push({
          tipo: tipo.label,
          total: totalTipo || 0,
          Implantar: countImplantar || 0,
          Substituir: countSubstituir || 0,
          Remover: countRemover || 0,
          Manter: countManter || 0,
        });

        allStats.porServico.Implantar += countImplantar || 0;
        allStats.porServico.Substituir += countSubstituir || 0;
        allStats.porServico.Remover += countRemover || 0;
        allStats.porServico.Manter += countManter || 0;

        // ===== 6. TIMELINE (amostra para estimativa) =====
        // Buscar amostra de 500 registros para estimar distribuição temporal
        const { data: timelineData } = await supabase
          .from(tabela)
          .select("created_at")
          .eq("lote_id", loteIdFiltro)
          .order("created_at", { ascending: true })
          .limit(500);

        if (timelineData && timelineData.length > 0) {
          // Agrupar por mês e estimar total baseado na proporção da amostra
          const fatorMultiplicacao = (totalTipo || 0) / timelineData.length;
          
          timelineData.forEach((n: any) => {
            const data = new Date(n.created_at);
            const mes = `${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()}`;
            
            const existing = allStats.timeline.find((t: any) => t.mes === mes);
            if (existing) {
              existing.total += fatorMultiplicacao;
            } else {
              allStats.timeline.push({ mes, total: fatorMultiplicacao });
            }
          });
        }
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
      
      // Ordenar timeline por mês/ano
      allStats.timeline.sort((a: any, b: any) => {
        const [mesA, anoA] = a.mes.split("/").map(Number);
        const [mesB, anoB] = b.mes.split("/").map(Number);
        return (anoA * 100 + mesA) - (anoB * 100 + mesB);
      });
      
      setStats(allStats);
    } catch (error: any) {
      console.error("Erro ao carregar estatísticas:", error);
      console.error("Stack trace:", error.stack);
      setStats({
        porTipo: [],
        porServico: { Implantar: 0, Substituir: 0, Remover: 0, Manter: 0 },
        porRodovia: [],
        porLote: [],
        taxaMatch: 0,
        timeline: [],
        totalGeral: 0,
      });
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

  const dadosPizzaPorGrupo = stats.porTipo.map((item: any) => ({
    name: item.tipo,
    value: item.total,
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
                <p className="text-sm text-primary-foreground/80">
                  {loteInfo ? `Lote ${loteInfo.numero} - ${loteInfo.rodovia?.codigo || 'N/A'}` : 'Carregando...'}
                </p>
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
                    Distribuição por Grupo de Elementos
                  </CardTitle>
                  <CardDescription>Quantidade de necessidades por tipo de elemento</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={dadosPizzaPorGrupo}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosPizzaPorGrupo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CORES_GRUPOS[entry.name] || "#888888"} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toLocaleString()} necessidades`]}
                      />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle"
                        iconType="circle"
                        formatter={(value, entry: any) => `${value}: ${entry.payload.value.toLocaleString()}`}
                      />
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
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={stats.timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="mes" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [Math.round(value).toLocaleString(), 'Necessidades']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#8884d8" 
                        strokeWidth={3} 
                        name="Necessidades"
                        dot={{ r: 5 }}
                        activeDot={{ r: 8 }}
                      />
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
                  <ResponsiveContainer width="100%" height={400}>
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
                  <ResponsiveContainer width="100%" height={400}>
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
