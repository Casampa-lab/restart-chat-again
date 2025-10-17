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
      const { data, error } = await supabase
        .from(configAtual.tabelaNecessidades as any)
        .select("*")
        .eq("divergencia", true)
        .eq("reconciliado", false)
        .eq("lote_id", activeSession.lote_id)
        .eq("rodovia_id", activeSession.rodovia_id)
        .order("km", { ascending: true });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && !!activeSession,
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
      ? (selectedNecessidade.solucao_planilha || selectedNecessidade.servico)
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

  const handleRefreshContadores = async () => {
    // Invalidar TODAS as queries relacionadas a contagens
    await queryClient.invalidateQueries({ 
      queryKey: ["estatisticas-gerais", activeSession.lote_id, activeSession.rodovia_id] 
    });
    await queryClient.invalidateQueries({
      queryKey: ["divergencias"]
    });
    await queryClient.invalidateQueries({
      queryKey: ["count-divergencias-coordenacao", activeSession.lote_id, activeSession.rodovia_id]
    });
    
    // Refetch imediato para garantir dados atualizados
    await queryClient.refetchQueries({ 
      queryKey: ["estatisticas-gerais", activeSession.lote_id, activeSession.rodovia_id] 
    });
    
    toast({ title: "✅ Contadores atualizados" });
  };

  return (
    <div className="space-y-6">
      {/* Botão de Refresh */}
      <div className="flex justify-end">
        <Button 
          onClick={handleRefreshContadores}
          variant="outline"
          size="sm"
        >
          🔄 Atualizar Contadores
        </Button>
      </div>

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
    </div>
  );
}