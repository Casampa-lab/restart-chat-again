import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TipoOrigemBadge } from "@/components/TipoOrigemBadge";
import { ConsolidatedInventoryBadge } from "@/components/ConsolidatedInventoryBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCompare, TrendingUp, Database, FileText, ArrowLeft, Home, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TIPO_ELEMENTO_LABELS: Record<string, string> = {
  placas: "Placas",
  marcas_longitudinais: "Marcas Longitudinais",
  inscricoes: "Inscrições",
  tachas: "Tachas",
  cilindros: "Cilindros",
  porticos: "Pórticos",
  defensas: "Defensas",
};

const GRUPOS_ELEMENTOS = {
  todos: ["placas", "marcas_longitudinais", "inscricoes", "tachas", "cilindros", "porticos", "defensas"],
  sv: ["placas", "porticos"],
  sh: ["marcas_longitudinais", "inscricoes", "tachas", "cilindros"],
  def: ["defensas"],
};

interface EvolucaoGeral {
  tipo_elemento: string;
  total_elementos: number;
  originais: number;
  manutencao_pre_projeto: number;
  execucao_projeto: number;
}

export default function InventarioDinamico() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("sh");
  const [tipoElemento, setTipoElemento] = useState<string>("marcas_longitudinais");

  // Buscar Marco Zero da sessão ativa do usuário
  const { data: marcoZeroData } = useQuery({
    queryKey: ["marco-zero-sessao-ativa", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Buscar sessão ativa do usuário
      const { data: sessao } = await supabase
        .from("sessoes_trabalho")
        .select("lote_id, rodovia_id")
        .eq("user_id", user.id)
        .eq("ativa", true)
        .maybeSingle();
      
      if (!sessao) return null;
      
      // Buscar Marco Zero
      const { data } = await supabase
        .from("vw_inventario_consolidado")
        .select("*")
        .eq("lote_id", sessao.lote_id)
        .eq("rodovia_id", sessao.rodovia_id)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user,
  });

  // Buscar estatísticas gerais
  const { data: evolucaoGeral } = useQuery({
    queryKey: ["evolucao-geral"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_inventario_evolucao_geral" as any)
        .select("*");
      if (error) throw error;
      return data as unknown as EvolucaoGeral[];
    },
  });

  // Buscar dados de evolução por tipo
  const { data: evolucaoDetalhada, isLoading } = useQuery({
    queryKey: ["evolucao-detalhada", tipoElemento],
    queryFn: async () => {
      const viewName = `vw_${tipoElemento}_evolucao`;
      const { data, error } = await supabase
        .from(viewName as any)
        .select("*")
        .order("data_ultima_modificacao", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Calcular totais gerais e por grupo
  const totaisGerais = evolucaoGeral?.reduce(
    (acc, item) => ({
      total: acc.total + item.total_elementos,
      originais: acc.originais + item.originais,
      manutencao: acc.manutencao + item.manutencao_pre_projeto,
      execucao: acc.execucao + item.execucao_projeto,
    }),
    { total: 0, originais: 0, manutencao: 0, execucao: 0 }
  );

  const totaisGrupo = evolucaoGeral
    ?.filter((item) => GRUPOS_ELEMENTOS[grupoSelecionado as keyof typeof GRUPOS_ELEMENTOS]?.includes(item.tipo_elemento))
    .reduce(
      (acc, item) => ({
        total: acc.total + item.total_elementos,
        originais: acc.originais + item.originais,
        manutencao: acc.manutencao + item.manutencao_pre_projeto,
        execucao: acc.execucao + item.execucao_projeto,
      }),
      { total: 0, originais: 0, manutencao: 0, execucao: 0 }
    );

  // Quando mudar de grupo, selecionar o primeiro tipo do grupo
  const handleGrupoChange = (grupo: string) => {
    setGrupoSelecionado(grupo);
    const primeiroTipo = GRUPOS_ELEMENTOS[grupo as keyof typeof GRUPOS_ELEMENTOS]?.[0];
    if (primeiroTipo) {
      setTipoElemento(primeiroTipo);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Início
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/modulos">VABLE</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Inventário Dinâmico</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitCompare className="h-8 w-8" />
          Inventário Dinâmico
        </h1>
        <p className="text-muted-foreground">
          Comparação entre o Baseline (cadastro inicial) e o estado atual da rodovia
        </p>
      </div>

      {/* Estatísticas Gerais */}
      {marcoZeroData ? (
        // VERSÃO CONSOLIDADA - Após Marco Zero
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Estado Consolidado</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <ConsolidatedInventoryBadge 
                total={marcoZeroData.total_geral}
                dataMarcoZero={new Date(marcoZeroData.data_marco)}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Status do Marco Zero</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white mb-2">
                ✅ Marco Zero Registrado
              </Badge>
              <p className="text-xs text-muted-foreground">
                Contadores unificados em fonte única consolidada
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        // VERSÃO ORIGINAL - Antes do Marco Zero
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Elementos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totaisGerais?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Todos os tipos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>⚪ Cadastro Inicial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totaisGerais?.originais || 0}</div>
              <p className="text-xs text-muted-foreground">
                {totaisGerais?.total
                  ? ((totaisGerais.originais / totaisGerais.total) * 100).toFixed(1)
                  : 0}
                % do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>🟡 Manutenção Pré-Projeto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totaisGerais?.manutencao || 0}</div>
              <p className="text-xs text-muted-foreground">
                {totaisGerais?.total
                  ? ((totaisGerais.manutencao / totaisGerais.total) * 100).toFixed(1)
                  : 0}
                % do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>🟢 Execução de Projeto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totaisGerais?.execucao || 0}</div>
              <p className="text-xs text-muted-foreground">
                {totaisGerais?.total
                  ? ((totaisGerais.execucao / totaisGerais.total) * 100).toFixed(1)
                  : 0}
                % do total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs por Grupo de Elementos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Evolução por Tipo de Elemento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs de Grupo Principal */}
          <Tabs value={grupoSelecionado} onValueChange={handleGrupoChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="sv">🚦 SV</TabsTrigger>
              <TabsTrigger value="sh">🛣️ SH</TabsTrigger>
              <TabsTrigger value="def">🛡️ Def</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sub-filtro de Tipo de Elemento */}
          {grupoSelecionado !== "todos" && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
              <Select value={tipoElemento} onValueChange={setTipoElemento}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRUPOS_ELEMENTOS[grupoSelecionado as keyof typeof GRUPOS_ELEMENTOS]?.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {TIPO_ELEMENTO_LABELS[tipo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Estatísticas do Grupo ou Tipo */}
          <div className="grid md:grid-cols-4 gap-4">
            {grupoSelecionado === "todos" ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totaisGerais?.total || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>⚪ Originais</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totaisGerais?.originais || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {totaisGerais?.total
                        ? ((totaisGerais.originais / totaisGerais.total) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>🟡 Manutenção</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totaisGerais?.manutencao || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {totaisGerais?.total
                        ? ((totaisGerais.manutencao / totaisGerais.total) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>🟢 Execução</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totaisGerais?.execucao || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {totaisGerais?.total
                        ? ((totaisGerais.execucao / totaisGerais.total) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              evolucaoGeral
                ?.filter((item) => item.tipo_elemento === tipoElemento)
                .map((item) => (
                  <>
                    <Card key={`${item.tipo_elemento}-total`}>
                      <CardHeader className="pb-2">
                        <CardDescription>Total</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{item.total_elementos}</div>
                      </CardContent>
                    </Card>
                    <Card key={`${item.tipo_elemento}-originais`}>
                      <CardHeader className="pb-2">
                        <CardDescription>⚪ Originais</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{item.originais}</div>
                        <p className="text-xs text-muted-foreground">
                          {((item.originais / item.total_elementos) * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card key={`${item.tipo_elemento}-manutencao`}>
                      <CardHeader className="pb-2">
                        <CardDescription>🟡 Manutenção</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{item.manutencao_pre_projeto}</div>
                        <p className="text-xs text-muted-foreground">
                          {((item.manutencao_pre_projeto / item.total_elementos) * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card key={`${item.tipo_elemento}-execucao`}>
                      <CardHeader className="pb-2">
                        <CardDescription>🟢 Execução</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{item.execucao_projeto}</div>
                        <p className="text-xs text-muted-foreground">
                          {((item.execucao_projeto / item.total_elementos) * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                  </>
                ))
            )}
          </div>

          {/* Tabela de Evolução Detalhada */}
          {grupoSelecionado !== "todos" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Registros Alterados - {TIPO_ELEMENTO_LABELS[tipoElemento]}
                  </CardTitle>
                  <CardDescription>
                    Mostrando apenas elementos que sofreram alterações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando dados...
                    </div>
                  ) : evolucaoDetalhada && evolucaoDetalhada.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Última Modificação</TableHead>
                            <TableHead>Baseline</TableHead>
                            <TableHead>Alterações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {evolucaoDetalhada
                            .filter((item: any) => item.modificado_por_intervencao)
                            .slice(0, 50)
                            .map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <TipoOrigemBadge
                                    tipoOrigem={item.tipo_origem}
                                    modificadoPorIntervencao={item.modificado_por_intervencao}
                                    showLabel={false}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {item.id.substring(0, 8)}...
                                </TableCell>
                                <TableCell>
                                  {item.km_inicial
                                    ? `KM ${item.km_inicial?.toFixed(3)} - ${item.km_final?.toFixed(3)}`
                                    : item.km
                                    ? `KM ${item.km?.toFixed(3)}`
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  {item.data_ultima_modificacao ? (
                                    <span className="text-sm">
                                      {format(
                                        new Date(item.data_ultima_modificacao),
                                        "dd/MM/yyyy HH:mm",
                                        { locale: ptBR }
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.data_baseline ? (
                                    <Badge variant="outline">
                                      {format(new Date(item.data_baseline), "dd/MM/yyyy", {
                                        locale: ptBR,
                                      })}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">Sem baseline</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      item.status_alteracao === "Modificado"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {item.status_alteracao}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum elemento alterado nesta categoria
                    </div>
                  )}
                </CardContent>
              </Card>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre o Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Como Funciona o Inventário Dinâmico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">📸 Baseline (Linha de Base)</h3>
            <p className="text-sm text-muted-foreground">
              O <strong>baseline</strong> é a fotografia imutável do cadastro inicial da rodovia.
              Serve como referência permanente para comparações e auditoria. Este cadastro{" "}
              <strong>nunca é alterado</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">🔄 Inventário Dinâmico (Estado Atual)</h3>
            <p className="text-sm text-muted-foreground">
              O <strong>inventário dinâmico</strong> representa o estado real e atual da rodovia,
              sendo atualizado automaticamente após cada intervenção aprovada. Reflete as mudanças
              físicas na infraestrutura.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">🎯 Tipos de Alteração</h3>
            <div className="grid md:grid-cols-3 gap-4 mt-2">
              <div className="p-3 border rounded-lg">
                <TipoOrigemBadge tipoOrigem="execucao" modificadoPorIntervencao={true} />
                <p className="text-xs text-muted-foreground mt-2">
                  Alterações estruturais aprovadas pelo projeto executivo
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <TipoOrigemBadge
                  tipoOrigem="manutencao_pre_projeto"
                  modificadoPorIntervencao={true}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Manutenções de conservação sem alteração estrutural (IN 3/2025)
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <TipoOrigemBadge modificadoPorIntervencao={false} />
                <p className="text-xs text-muted-foreground mt-2">
                  Estado original do cadastro inicial
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Conformidade Normativa:</strong> Este sistema atende aos requisitos da{" "}
              <strong>IN nº 3/2025 do DNIT</strong> e do <strong>Manual BR-LEGAL 2</strong>,
              garantindo transparência, rastreabilidade e auditabilidade completa de todas as
              alterações na infraestrutura rodoviária.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
