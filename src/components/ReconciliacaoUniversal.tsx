import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WorkSession } from "@/hooks/useWorkSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GrupoElemento, getConfig, formatarCampo, CAMPO_LABELS } from "@/lib/reconciliacaoConfig";

interface Divergencia {
  id: string;
  km: number;
  codigo?: string;
  tipo?: string;
  solucao_planilha?: string;
  servico?: string;
  servico_inferido: string;
  servico_final: string;
  distancia_match_metros: number | null;
  cadastro_id: string | null;
  divergencia: boolean;
  reconciliado: boolean;
  [key: string]: any;
}

interface ReconciliacaoUniversalProps {
  grupo: GrupoElemento;
  activeSession: WorkSession;
}

export function ReconciliacaoUniversal({ grupo, activeSession }: ReconciliacaoUniversalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const config = getConfig(grupo);
  
  const [selectedNecessidade, setSelectedNecessidade] = useState<Divergencia | null>(null);
  const [cadastroDetalhes, setCadastroDetalhes] = useState<any>(null);
  const [justificativa, setJustificativa] = useState("");
  const [decisao, setDecisao] = useState<"projeto" | "inferencia" | null>(null);
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoElemento>(grupo);
  
  // Estados para reconciliação em lote
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [mostrarConfirmacaoLote, setMostrarConfirmacaoLote] = useState(false);
  const [justificativaLote, setJustificativaLote] = useState("");

  // Buscar tolerância GPS da rodovia da necessidade selecionada
  const { data: rodoviaConfig } = useQuery({
    queryKey: ["rodovia-tolerancia", selectedNecessidade?.rodovia_id],
    queryFn: async () => {
      if (!selectedNecessidade?.rodovia_id) return null;
      const { data, error } = await supabase
        .from("rodovias")
        .select("tolerancia_match_metros")
        .eq("id", selectedNecessidade.rodovia_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedNecessidade?.rodovia_id,
  });

  const toleranciaRodovia = rodoviaConfig?.tolerancia_match_metros || 50;

  // Buscar divergências não reconciliadas para o grupo ativo
  const { data: divergencias, isLoading } = useQuery({
    queryKey: ["divergencias", grupoAtivo, activeSession.lote_id, activeSession.rodovia_id],
    queryFn: async () => {
      const configAtual = getConfig(grupoAtivo);
      
      // Determinar coluna de ordenação baseado no tipo de geometria
      const colunaOrdenacao = configAtual.tipoGeometria === 'pontual' ? 'km' : 'km_inicial';
      
      const { data, error } = await supabase
        .from(configAtual.tabelaNecessidades as any)
        .select("*")
        .eq("divergencia", true)
        .eq("reconciliado", false)
        .eq("lote_id", activeSession.lote_id)
        .eq("rodovia_id", activeSession.rodovia_id)
        .order(colunaOrdenacao, { ascending: true });

      if (error) {
        console.error(`[Divergências] Erro ao buscar ${grupoAtivo}:`, error);
        throw error;
      }
      
      console.log(`[Divergências] ${grupoAtivo}: ${data?.length || 0} registros encontrados`);
      return (data || []) as any[];
    },
    enabled: !!user && !!activeSession,
    staleTime: 0,
    gcTime: 0,
  });

  // Buscar detalhes do cadastro quando seleciona necessidade
  const buscarCadastro = async (cadastroId: string) => {
    const configAtual = getConfig(grupoAtivo);
    const { data, error } = await supabase
      .from(configAtual.tabelaCadastro as any)
      .select("*")
      .eq("id", cadastroId)
      .single();

    if (error) throw error;
    setCadastroDetalhes(data);
  };

  // Estatísticas agregadas de todos os grupos
  const { data: estatisticasGerais } = useQuery({
    queryKey: ["estatisticas-gerais", activeSession.lote_id, activeSession.rodovia_id],
    queryFn: async () => {
      const grupos: GrupoElemento[] = ['placas', 'defensas', 'porticos', 'marcas_longitudinais', 'inscricoes', 'cilindros', 'tachas'];
      
      const resultados = await Promise.all(
        grupos.map(async (g) => {
          const cfg = getConfig(g);
          const { data } = await supabase
            .from(cfg.tabelaNecessidades as any)
            .select("id")
            .eq("divergencia", true)
            .eq("reconciliado", false)
            .eq("lote_id", activeSession.lote_id)
            .eq("rodovia_id", activeSession.rodovia_id);

          const pendentes = data?.length || 0;
          
          // Log temporário para debug
          console.log(`[Estatísticas] ${g}: ${pendentes} divergências`);
          
          return { grupo: g, total: pendentes, reconciliadas: 0, pendentes };
        })
      );

      const totais = resultados.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          reconciliadas: acc.reconciliadas + r.reconciliadas,
          pendentes: acc.pendentes + r.pendentes,
        }),
        { total: 0, reconciliadas: 0, pendentes: 0 }
      );

      return { totais, porGrupo: resultados };
    },
    enabled: !!user && !!activeSession,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Mutation para reconciliar
  const reconciliarMutation = useMutation({
    mutationFn: async ({ 
      necessidadeId, 
      servicoFinal, 
      justificativa 
    }: { 
      necessidadeId: string; 
      servicoFinal: string; 
      justificativa: string;
    }) => {
      const configAtual = getConfig(grupoAtivo);
      const { error } = await supabase
        .from(configAtual.tabelaNecessidades as any)
        .update({
          servico_final: servicoFinal,
          servico: servicoFinal,
          reconciliado: true,
          reconciliado_por: user?.id,
          data_reconciliacao: new Date().toISOString(),
          justificativa_reconciliacao: justificativa,
        })
        .eq("id", necessidadeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["divergencias", grupoAtivo, activeSession.lote_id, activeSession.rodovia_id] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-gerais", activeSession.lote_id, activeSession.rodovia_id] });
      toast({
        title: "Reconciliação concluída",
        description: "A decisão foi registrada com sucesso.",
      });
      setSelectedNecessidade(null);
      setCadastroDetalhes(null);
      setJustificativa("");
      setDecisao(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reconciliar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReconciliar = () => {
    if (!selectedNecessidade || !decisao) return;

    const servicoFinal = decisao === "projeto" 
      ? (selectedNecessidade.solucao_planilha && selectedNecessidade.solucao_planilha !== '-'
          ? selectedNecessidade.solucao_planilha 
          : selectedNecessidade.servico)
      : selectedNecessidade.servico_inferido;

    if (decisao === "inferencia" && !justificativa.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Ao escolher a análise automática, você deve fornecer uma justificativa.",
        variant: "destructive",
      });
      return;
    }

    reconciliarMutation.mutate({
      necessidadeId: selectedNecessidade.id,
      servicoFinal,
      justificativa: justificativa || `Decisão: ${decisao === "projeto" ? "Manter decisão do projeto" : "Usar análise automática"}`,
    });
  };

  const handleAbrirDialog = async (nec: Divergencia) => {
    setSelectedNecessidade(nec);
    if (nec.cadastro_id) {
      await buscarCadastro(nec.cadastro_id);
    }
  };

  // Mutation para reconciliação em lote
  const reconciliarLoteMutation = useMutation({
    mutationFn: async ({ 
      ids, 
      justificativa 
    }: { 
      ids: string[];
      justificativa: string;
    }) => {
      const configAtual = getConfig(grupoAtivo);
      
      // Buscar todas as necessidades selecionadas
      const { data: necessidades, error: fetchError } = await supabase
        .from(configAtual.tabelaNecessidades as any)
        .select("*")
        .in("id", ids);

      if (fetchError) throw fetchError;
      if (!necessidades) throw new Error("Necessidades não encontradas");

      // Preparar updates - SEMPRE usa decisão do projeto
    const updates = necessidades.map((nec: any) => {
      // Validar se solucao_planilha é um valor válido (não é null, undefined ou "-")
      const decisaoProjeto = (nec.solucao_planilha && nec.solucao_planilha !== '-') 
        ? nec.solucao_planilha 
        : nec.servico;
      
      return {
        id: nec.id,
        servico_final: decisaoProjeto,
        servico: decisaoProjeto,
        reconciliado: true,
        reconciliado_por: user?.id,
        data_reconciliacao: new Date().toISOString(),
        justificativa_reconciliacao: justificativa || "Reconciliação em lote - Decisão do Projeto",
      };
    });

      // Executar em paralelo
      const promises = updates.map(update => 
        supabase
          .from(configAtual.tabelaNecessidades as any)
          .update(update)
          .eq("id", update.id)
      );

      const results = await Promise.all(promises);
      
      // Verificar erros
      const erros = results.filter(r => r.error);
      if (erros.length > 0) {
        throw new Error(`Falha ao atualizar ${erros.length} itens`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["divergencias", grupoAtivo, activeSession.lote_id, activeSession.rodovia_id] });
      queryClient.invalidateQueries({ queryKey: ["estatisticas-gerais", activeSession.lote_id, activeSession.rodovia_id] });
      toast({
        title: "Reconciliação em lote concluída",
        description: `${variables.ids.length} divergências foram reconciliadas usando a decisão do projeto.`,
      });
      setItensSelecionados(new Set());
      setMostrarConfirmacaoLote(false);
      setJustificativaLote("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro na reconciliação em lote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmarReconciliacaoLote = () => {
    reconciliarLoteMutation.mutate({
      ids: Array.from(itensSelecionados),
      justificativa: justificativaLote,
    });
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Divergências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticasGerais?.totais.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Todos os grupos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{estatisticasGerais?.totais.pendentes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando decisão</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reconciliadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{estatisticasGerais?.totais.reconciliadas || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Decisões finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs por Grupo */}
      <Card>
        <CardHeader>
          <CardTitle>Divergências por Grupo de Elementos</CardTitle>
          <CardDescription>
            Selecione um grupo para visualizar e reconciliar divergências
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={grupoAtivo} onValueChange={(v) => setGrupoAtivo(v as GrupoElemento)}>
            <TabsList className="grid grid-cols-7 mb-4">
              {(Object.keys(getConfig('placas')) ? ['placas', 'defensas', 'porticos', 'marcas_longitudinais', 'inscricoes', 'cilindros', 'tachas'] : []).map((g) => {
                const cfg = getConfig(g as GrupoElemento);
                const stats = estatisticasGerais?.porGrupo.find(s => s.grupo === g);
                return (
                  <TabsTrigger key={g} value={g} className="relative">
                    {cfg.iconeProjeto}
                    {(stats?.pendentes || 0) > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-warning">
                        {stats?.pendentes}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(['placas', 'defensas', 'porticos', 'marcas_longitudinais', 'inscricoes', 'cilindros', 'tachas'] as GrupoElemento[]).map((g) => (
              <TabsContent key={g} value={g}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{getConfig(g).labelGrupo}</h3>
                    <Badge variant="outline">
                      {divergencias?.length || 0} divergências pendentes
                    </Badge>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                  ) : divergencias?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-success" />
                      <p>Nenhuma divergência pendente neste grupo!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={itensSelecionados.size === divergencias?.length && divergencias?.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setItensSelecionados(new Set(divergencias?.map(d => d.id) || []));
                                } else {
                                  setItensSelecionados(new Set());
                                }
                              }}
                              disabled={!divergencias || divergencias.length === 0}
                            />
                          </TableHead>
                          <TableHead>KM</TableHead>
                          <TableHead>Identificação</TableHead>
                          <TableHead className="text-center">Projeto 🎨</TableHead>
                          <TableHead className="text-center">Sistema 🤖</TableHead>
                          <TableHead className="text-center">Match GPS</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {divergencias?.map((div) => (
                          <TableRow key={div.id}>
                            <TableCell>
                              <Checkbox
                                checked={itensSelecionados.has(div.id)}
                                onCheckedChange={(checked) => {
                                  const novo = new Set(itensSelecionados);
                                  if (checked) {
                                    novo.add(div.id);
                                  } else {
                                    novo.delete(div.id);
                                  }
                                  setItensSelecionados(novo);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono">
                              {div.km?.toFixed(3) || div.km_inicial?.toFixed(3) || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {div.codigo && <div className="font-mono">{div.codigo}</div>}
                                {div.tipo && <div className="text-muted-foreground">{div.tipo}</div>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                {div.solucao_planilha || div.servico}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                {div.servico_inferido}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {div.cadastro_id ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {div.distancia_match_metros?.toFixed(0)}m
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                  Sem match
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAbrirDialog(div)}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Reconciliar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Reconciliação */}
      <Dialog open={!!selectedNecessidade} onOpenChange={() => {
        setSelectedNecessidade(null);
        setCadastroDetalhes(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reconciliar Divergência - {getConfig(grupoAtivo).labelGrupo}</DialogTitle>
            <DialogDescription>
              Compare os dados e escolha qual decisão deve prevalecer
            </DialogDescription>
          </DialogHeader>

          {selectedNecessidade && (
            <div className="space-y-4">
              {/* Localização */}
              <div className="flex items-center gap-2 text-sm bg-muted p-3 rounded-lg">
                <MapPin className="h-4 w-4" />
                <span>KM {selectedNecessidade.km?.toFixed(3) || selectedNecessidade.km_inicial?.toFixed(3)}</span>
                {selectedNecessidade.cadastro_id && selectedNecessidade.distancia_match_metros && (
                  <Badge variant="outline" className="ml-auto">
                    Match: {selectedNecessidade.distancia_match_metros.toFixed(0)}m
                  </Badge>
                )}
              </div>

              {/* Comparação Lado a Lado */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cadastro Existente */}
                {cadastroDetalhes && (
                  <div className="border-2 border-success rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <span className="text-2xl">{config.iconeCadastro}</span>
                      <div>
                        <div className="font-semibold text-success">Inventário (Cadastro)</div>
                        <div className="text-xs text-muted-foreground">Situação atual no local</div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {config.camposComparacao.map((campo) => (
                        <div key={campo} className="flex justify-between">
                          <span className="text-muted-foreground">{CAMPO_LABELS[campo] || campo}:</span>
                          <span className="font-medium">{formatarCampo(campo, cadastroDetalhes[campo])}</span>
                        </div>
                      ))}
                    </div>

                    {/* Fotos do Cadastro (para placas, pórticos e defensas) */}
                    {(grupoAtivo === 'placas' || grupoAtivo === 'porticos' || grupoAtivo === 'defensas') && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">Fotos do Local</div>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Placas - múltiplas fotos */}
                          {grupoAtivo === 'placas' && (
                            <>
                              {cadastroDetalhes.foto_frontal_url && (
                                <div>
                                  <div className="text-[10px] text-muted-foreground mb-1">Frontal</div>
                                  <img 
                                    src={cadastroDetalhes.foto_frontal_url} 
                                    alt="Foto Frontal" 
                                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(cadastroDetalhes.foto_frontal_url, '_blank')}
                                  />
                                </div>
                              )}
                              {cadastroDetalhes.foto_lateral_url && (
                                <div>
                                  <div className="text-[10px] text-muted-foreground mb-1">Lateral</div>
                                  <img 
                                    src={cadastroDetalhes.foto_lateral_url} 
                                    alt="Foto Lateral" 
                                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(cadastroDetalhes.foto_lateral_url, '_blank')}
                                  />
                                </div>
                              )}
                              {cadastroDetalhes.foto_posterior_url && (
                                <div>
                                  <div className="text-[10px] text-muted-foreground mb-1">Posterior</div>
                                  <img 
                                    src={cadastroDetalhes.foto_posterior_url} 
                                    alt="Foto Posterior" 
                                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(cadastroDetalhes.foto_posterior_url, '_blank')}
                                  />
                                </div>
                              )}
                              {cadastroDetalhes.foto_base_url && (
                                <div>
                                  <div className="text-[10px] text-muted-foreground mb-1">Base</div>
                                  <img 
                                    src={cadastroDetalhes.foto_base_url} 
                                    alt="Foto Base" 
                                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(cadastroDetalhes.foto_base_url, '_blank')}
                                  />
                                </div>
                              )}
                              {cadastroDetalhes.foto_url && !cadastroDetalhes.foto_frontal_url && (
                                <div className="col-span-2">
                                  <img 
                                    src={cadastroDetalhes.foto_url} 
                                    alt="Foto Placa" 
                                    className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(cadastroDetalhes.foto_url, '_blank')}
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {/* Pórticos - foto única */}
                          {grupoAtivo === 'porticos' && cadastroDetalhes.foto_url && (
                            <div className="col-span-2">
                              <img 
                                src={cadastroDetalhes.foto_url} 
                                alt="Foto Pórtico" 
                                className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => window.open(cadastroDetalhes.foto_url, '_blank')}
                              />
                            </div>
                          )}

                          {/* Defensas - link_fotografia */}
                          {grupoAtivo === 'defensas' && cadastroDetalhes.link_fotografia && (
                            <div className="col-span-2">
                              <img 
                                src={cadastroDetalhes.link_fotografia} 
                                alt="Foto Defensa" 
                                className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => window.open(cadastroDetalhes.link_fotografia, '_blank')}
                              />
                            </div>
                          )}

                          {/* Mensagem caso não haja fotos */}
                          {grupoAtivo === 'placas' && !cadastroDetalhes.foto_frontal_url && !cadastroDetalhes.foto_lateral_url && 
                           !cadastroDetalhes.foto_posterior_url && !cadastroDetalhes.foto_base_url && !cadastroDetalhes.foto_url && (
                            <div className="col-span-2 text-xs text-muted-foreground italic">
                              Sem fotos cadastradas
                            </div>
                          )}
                          {grupoAtivo === 'porticos' && !cadastroDetalhes.foto_url && (
                            <div className="col-span-2 text-xs text-muted-foreground italic">
                              Sem fotos cadastradas
                            </div>
                          )}
                          {grupoAtivo === 'defensas' && !cadastroDetalhes.link_fotografia && (
                            <div className="col-span-2 text-xs text-muted-foreground italic">
                              Sem fotos cadastradas
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Projeto (Necessidade) */}
                <div className="border-2 border-primary rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <span className="text-2xl">{config.iconeProjeto}</span>
                    <div>
                      <div className="font-semibold text-primary">Projeto (Necessidade)</div>
                      <div className="text-xs text-muted-foreground">Previsto na planilha</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {config.camposComparacao.map((campo) => (
                      <div key={campo} className="flex justify-between">
                        <span className="text-muted-foreground">{CAMPO_LABELS[campo] || campo}:</span>
                        <span className="font-medium">{formatarCampo(campo, selectedNecessidade[campo])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Escolha de Decisão */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                  variant={decisao === "projeto" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col gap-2"
                  onClick={() => setDecisao("projeto")}
                >
                  <div className="text-lg font-semibold">🎨 Decisão do Projeto</div>
                  <Badge className="bg-blue-500 text-white">
                    {selectedNecessidade.solucao_planilha || selectedNecessidade.servico}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Manter a decisão técnica do projetista
                  </div>
                </Button>

                <Button
                  variant={decisao === "inferencia" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col gap-2"
                  onClick={() => setDecisao("inferencia")}
                >
                  <div className="text-lg font-semibold">🤖 Análise Automática</div>
                  <Badge className="bg-purple-500 text-white">
                    {selectedNecessidade.servico_inferido}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Usar a análise baseada em GPS
                  </div>
                </Button>
              </div>

              {/* Justificativa */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Justificativa {decisao === "inferencia" && <span className="text-destructive">*</span>}
                </label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder={
                    decisao === "inferencia"
                      ? "Explique por que a análise automática está correta..."
                      : "Justificativa opcional para auditoria..."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedNecessidade(null);
              setCadastroDetalhes(null);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleReconciliar}
              disabled={!decisao || reconciliarMutation.isPending}
            >
              {reconciliarMutation.isPending ? "Salvando..." : "Confirmar Decisão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barra de Ações Flutuante */}
      {itensSelecionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 z-50 border-2 border-primary-foreground/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">
              {itensSelecionados.size} {itensSelecionados.size === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
          </div>
          <Button 
            onClick={() => setMostrarConfirmacaoLote(true)}
            variant="secondary"
            size="sm"
            className="font-semibold"
          >
            🎨 Reconciliar com Decisão do Projeto
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setItensSelecionados(new Set())}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Modal de Confirmação em Lote */}
      <Dialog open={mostrarConfirmacaoLote} onOpenChange={setMostrarConfirmacaoLote}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎨 Confirmar Reconciliação em Lote
            </DialogTitle>
            <DialogDescription>
              {itensSelecionados.size} divergências serão reconciliadas usando a <strong>Decisão do Projeto</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Lista de itens selecionados */}
            <div className="border rounded-lg p-3 bg-muted/50">
              <p className="text-sm font-medium mb-2">Itens que serão reconciliados:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {Array.from(itensSelecionados).map(id => {
                  const div = divergencias?.find(d => d.id === id);
                  if (!div) return null;
                  
                  const configAtual = getConfig(grupoAtivo);
                  const identificacao = configAtual.tipoGeometria === 'pontual'
                    ? `KM ${div.km?.toFixed(3)} - ${div.codigo || div.tipo}`
                    : `KM ${div.km_inicial?.toFixed(3)} a ${div.km_final?.toFixed(3)} - ${div.codigo || div.tipo}`;
                  
                  return (
                    <div key={id} className="text-sm p-2 bg-background rounded border">
                      {identificacao}
                      <Badge variant="outline" className="ml-2 text-xs">
                        Projeto: {div.solucao_planilha || div.servico}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Justificativa opcional */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Justificativa (opcional)
              </label>
              <Textarea
                placeholder="Ex: Reconciliação em lote após validação técnica..."
                value={justificativaLote}
                onChange={(e) => setJustificativaLote(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Aviso */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Todos os itens selecionados serão marcados como <strong>"Substituir"</strong> ou <strong>"Manter"</strong> 
                conforme definido na planilha de projeto.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setMostrarConfirmacaoLote(false);
                setJustificativaLote("");
              }}
              disabled={reconciliarLoteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmarReconciliacaoLote}
              disabled={reconciliarLoteMutation.isPending}
            >
              {reconciliarLoteMutation.isPending && (
                <span className="mr-2">⏳</span>
              )}
              Confirmar {itensSelecionados.size} Reconciliações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}