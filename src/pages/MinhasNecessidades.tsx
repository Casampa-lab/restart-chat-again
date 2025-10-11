import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSupervisora } from "@/hooks/useSupervisora";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, ExternalLink, Trash2, Filter, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import logoOperaVia from "@/assets/logo-operavia.jpg";

interface Necessidade {
  id: string;
  servico: "Inclusão" | "Substituição" | "Remoção";
  cadastro_id: string | null;
  distancia_match_metros: number | null;
  arquivo_origem: string;
  linha_planilha: number;
  created_at: string;
  rodovia?: { codigo: string; nome: string };
  lote?: { numero: string };
  [key: string]: any;
}

const TIPOS_NECESSIDADES = [
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", table: "necessidades_marcas_longitudinais" },
  { value: "tachas", label: "Tachas", table: "necessidades_tachas" },
  { value: "marcas_transversais", label: "Zebrados", table: "necessidades_marcas_transversais" },
  { value: "cilindros", label: "Cilindros", table: "necessidades_cilindros" },
  { value: "placas", label: "Placas", table: "necessidades_placas" },
  { value: "porticos", label: "Pórticos", table: "necessidades_porticos" },
  { value: "defensas", label: "Defensas", table: "necessidades_defensas" },
];

const MinhasNecessidades = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { data: supervisora } = useSupervisora();
  
  // Pegar tipo da URL ou usar primeiro como padrão
  const tipoFromUrl = searchParams.get("tipo");
  const tipoInicial = tipoFromUrl && TIPOS_NECESSIDADES.find(t => t.value === tipoFromUrl)
    ? tipoFromUrl
    : TIPOS_NECESSIDADES[0].value;
  
  const [tipoAtivo, setTipoAtivo] = useState(tipoInicial);
  const [necessidades, setNecessidades] = useState<Necessidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroServico, setFiltroServico] = useState<string>("todos");
  const [busca, setBusca] = useState("");

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

      const { data, error } = await supabase
        .from(tipoConfig.table as any)
        .select(`
          *,
          rodovia:rodovias(codigo, nome),
          lote:lotes(numero)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNecessidades((data as any) || []);
    } catch (error: any) {
      toast.error("Erro ao carregar necessidades: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNecessidades(tipoAtivo);
    }
  }, [user, tipoAtivo]);

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
      "Inclusão": { variant: "default" as const, className: "bg-green-500 hover:bg-green-600", icon: "🟢" },
      "Substituição": { variant: "secondary" as const, className: "bg-yellow-500 hover:bg-yellow-600", icon: "🟡" },
      "Remoção": { variant: "destructive" as const, className: "", icon: "🔴" },
    };

    const config = configs[servico as keyof typeof configs] || configs["Inclusão"];

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.icon} {servico}
      </Badge>
    );
  };

  const necessidadesFiltradas = necessidades.filter(n => {
    if (filtroServico !== "todos" && n.servico !== filtroServico) return false;
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
                <h1 className="text-xl font-bold text-primary-foreground">Minhas Necessidades</h1>
                <p className="text-sm text-primary-foreground/80">Serviços planejados para as rodovias</p>
              </div>
            </div>
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
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={tipoAtivo} onValueChange={setTipoAtivo} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            {TIPOS_NECESSIDADES.map(tipo => (
              <TabsTrigger key={tipo.value} value={tipo.value}>
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
                      <CardDescription>
                        Total: {necessidadesFiltradas.length} necessidades
                      </CardDescription>
                    </div>

                    {/* Filtros */}
                    <div className="flex items-center gap-2">
                      <Select value={filtroServico} onValueChange={setFiltroServico}>
                        <SelectTrigger className="w-[180px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os serviços</SelectItem>
                          <SelectItem value="Inclusão">🟢 Inclusão</SelectItem>
                          <SelectItem value="Substituição">🟡 Substituição</SelectItem>
                          <SelectItem value="Remoção">🔴 Remoção</SelectItem>
                        </SelectContent>
                      </Select>

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
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : necessidadesFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma necessidade encontrada
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serviço</TableHead>
                            <TableHead>Rodovia/Lote</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Arquivo</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {necessidadesFiltradas.map((nec) => (
                            <TableRow key={nec.id}>
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
                                    <>KM {nec.km_inicial} - {nec.km_final}</>
                                  ) : nec.km ? (
                                    <>KM {nec.km}</>
                                  ) : (
                                    "-"
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {nec.cadastro_id ? (
                                  <div className="text-sm">
                                    <Badge variant="outline" className="gap-1">
                                      <ExternalLink className="h-3 w-3" />
                                      {nec.distancia_match_metros?.toFixed(0)}m
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sem match</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {nec.arquivo_origem}
                                <br />
                                Linha {nec.linha_planilha}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(nec.created_at).toLocaleDateString("pt-BR")}
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
              Críticas e sugestões: <a href="mailto:operavia.online@gmail.com" className="text-primary hover:underline">operavia.online@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MinhasNecessidades;
