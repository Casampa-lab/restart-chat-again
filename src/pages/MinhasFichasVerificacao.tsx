import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Plus, Send, Edit, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useWorkSession } from "@/hooks/useWorkSession";
import { FichaVerificacaoForm } from "@/components/FichaVerificacaoForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Ficha {
  id: string;
  tipo: string;
  data_verificacao: string;
  contrato: string | null;
  empresa: string | null;
  snv: string | null;
  status: string;
}

interface FichaComEstatisticas extends Ficha {
  total_pontos: number;
  pontos_conformes: number;
  pontos_nao_conformes: number;
  percentual_conformidade: number;
}

interface Item {
  ordem: number;
  foto_url: string;
  latitude_inicial?: number | null;
  longitude_inicial?: number | null;
  sentido: string | null;
  km_inicial: number | null;
  [key: string]: any;
}

export default function MinhasFichasVerificacao() {
  const navigate = useNavigate();
  const [fichas, setFichas] = useState<FichaComEstatisticas[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFicha, setSelectedFicha] = useState<Ficha | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [mostrarEnviadas, setMostrarEnviadas] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState<string | null>(null);
  
  const { activeSession } = useWorkSession(userId);

  useEffect(() => {
    const getUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      fetchFichas();
    };
    getUserAndFetch();

    // Configurar realtime para atualizações automáticas
    const channel = supabase
      .channel('ficha-verificacao-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ficha_verificacao'
        },
        () => {
          console.log('Ficha atualizada, recarregando lista...');
          fetchFichas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFichas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: fichasData, error: fichasError } = await supabase
        .from("ficha_verificacao")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fichasError) throw fichasError;

      // Para cada ficha, calcular estatísticas de conformidade
      const fichasComEstatisticas = await Promise.all(
        (fichasData || []).map(async (ficha) => {
          const { data: itens, error: itensError } = await supabase
            .from("ficha_verificacao_itens")
            .select("*")
            .eq("ficha_id", ficha.id);

          if (itensError) {
            console.error("Erro ao buscar itens:", itensError);
            return {
              ...ficha,
              total_pontos: 0,
              pontos_conformes: 0,
              pontos_nao_conformes: 0,
              percentual_conformidade: 0
            };
          }

          const total_pontos = itens?.length || 0;
          let pontos_conformes = 0;
          let pontos_nao_conformes = 0;

          // Para SH: verificar retro_bd_conforme, retro_e_conforme, retro_be_conforme
          // Para SV: verificar retro_sv_conforme
          itens?.forEach(item => {
            const campos = ficha.tipo === "Sinalização Horizontal" 
              ? ['retro_bd_conforme', 'retro_e_conforme', 'retro_be_conforme']
              : ['retro_sv_conforme'];

            const todosCamposConformes = campos.every(campo => 
              item[campo] === true || item[campo] === null
            );

            const algumCampoNaoConforme = campos.some(campo => 
              item[campo] === false
            );

            if (algumCampoNaoConforme) {
              pontos_nao_conformes++;
            } else if (todosCamposConformes) {
              pontos_conformes++;
            }
          });

          const percentual = total_pontos > 0 
            ? (pontos_conformes / total_pontos) * 100 
            : 0;

          return {
            ...ficha,
            total_pontos,
            pontos_conformes,
            pontos_nao_conformes,
            percentual_conformidade: percentual
          };
        })
      );

      setFichas(fichasComEstatisticas);
    } catch (error: any) {
      toast.error("Erro ao carregar fichas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (ficha: Ficha) => {
    try {
      const { data, error } = await supabase
        .from("ficha_verificacao_itens")
        .select("*")
        .eq("ficha_id", ficha.id)
        .order("ordem");

      if (error) throw error;
      setItens(data || []);
      setSelectedFicha(ficha);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error("Erro ao carregar itens: " + error.message);
    }
  };

  const handleEnviarParaCoordenador = async (fichaId: string) => {
    try {
      const { error } = await supabase
        .from("ficha_verificacao")
        .update({ 
          status: 'pendente_aprovacao_coordenador',
          enviado_coordenador_em: new Date().toISOString()
        })
        .eq("id", fichaId);

      if (error) throw error;

      toast.success("Ficha enviada para validação do coordenador!");
      fetchFichas();
    } catch (error: any) {
      toast.error("Erro ao enviar ficha: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!fichaToDelete) return;

    try {
      // Deletar itens da ficha
      const { error: itensError } = await supabase
        .from("ficha_verificacao_itens")
        .delete()
        .eq("ficha_id", fichaToDelete);

      if (itensError) throw itensError;

      // Deletar ficha
      const { error } = await supabase
        .from("ficha_verificacao")
        .delete()
        .eq("id", fichaToDelete);

      if (error) throw error;

      toast.success("Ficha excluída com sucesso!");
      fetchFichas();
    } catch (error: any) {
      toast.error("Erro ao excluir ficha: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setFichaToDelete(null);
    }
  };

  const fichasFiltradas = mostrarEnviadas
    ? fichas
    : fichas.filter(f => !f.status || f.status === "rascunho");

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Button
          variant="navigation"
          onClick={() => navigate("/modo-campo")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Minhas Fichas de Verificação (3.1.19)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Revise e envie suas fichas para o coordenador e fiscal
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeSession && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Ficha
              </Button>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="mostrar-enviadas" 
                checked={mostrarEnviadas}
                onCheckedChange={(checked) => setMostrarEnviadas(checked as boolean)}
              />
              <Label htmlFor="mostrar-enviadas" className="cursor-pointer text-sm font-normal">
                Mostrar fichas enviadas
              </Label>
            </div>
          </div>
        </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : fichas.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma ficha encontrada.</p>
            ) : fichasFiltradas.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {mostrarEnviadas 
                  ? "Nenhuma ficha cadastrada ainda"
                  : "Nenhuma ficha não enviada"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Pontos Verificados</TableHead>
                  <TableHead>Conformidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fichasFiltradas.map((ficha) => (
                        <TableRow key={ficha.id}>
                          <TableCell>
                            <Badge variant={ficha.tipo === "Sinalização Horizontal" ? "default" : "secondary"}>
                              {ficha.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(ficha.data_verificacao).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <p className="font-semibold text-lg">{ficha.total_pontos}</p>
                              <p className="text-xs text-muted-foreground">pontos</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge 
                                variant={
                                  ficha.percentual_conformidade >= 90 ? "default" :
                                  ficha.percentual_conformidade >= 70 ? "secondary" :
                                  "destructive"
                                }
                                className="w-full justify-center text-base"
                              >
                                {ficha.percentual_conformidade.toFixed(0)}% conforme
                              </Badge>
                              <div className="flex gap-2 text-xs justify-center">
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  {ficha.pontos_conformes} OK
                                </span>
                                {ficha.pontos_nao_conformes > 0 && (
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    {ficha.pontos_nao_conformes} NC
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              ficha.status === 'rascunho' || !ficha.status ? 'outline' :
                              ficha.status === 'pendente_aprovacao_coordenador' ? 'secondary' :
                              ficha.status === 'aprovado' ? 'default' :
                              'destructive'
                            }>
                              {ficha.status === 'rascunho' || !ficha.status ? 'Rascunho' :
                               ficha.status === 'pendente_aprovacao_coordenador' ? 'Pendente' :
                               ficha.status === 'aprovado' ? 'Aprovado' :
                               'Rejeitado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEnviarParaCoordenador(ficha.id)}
                                      disabled={ficha.status && ficha.status !== "rascunho"}
                                      title={
                                        ficha.status && ficha.status !== "rascunho"
                                          ? "Ficha já foi enviada ao coordenador"
                                          : "Enviar para Coordenador"
                                      }
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{ficha.status && ficha.status !== "rascunho" ? "Já enviada" : "Enviar para coordenador"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewDetails(ficha)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Visualizar pontos de verificação</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setFichaToDelete(ficha.id);
                                        setDeleteDialogOpen(true);
                                      }}
                                      disabled={ficha.status && ficha.status !== "rascunho"}
                                      title={
                                        ficha.status && ficha.status !== "rascunho"
                                          ? "Não é possível excluir fichas enviadas"
                                          : "Excluir ficha"
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{ficha.status && ficha.status !== "rascunho" ? "Não pode excluir" : "Excluir ficha"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFicha?.tipo} - Detalhes
            </DialogTitle>
          </DialogHeader>

          {selectedFicha && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">Data:</p>
                  <p>{new Date(selectedFicha.data_verificacao).toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedFicha.contrato && (
                  <div>
                    <p className="text-sm font-semibold">Contrato:</p>
                    <p>{selectedFicha.contrato}</p>
                  </div>
                )}
                {selectedFicha.empresa && (
                  <div>
                    <p className="text-sm font-semibold">Empresa:</p>
                    <p>{selectedFicha.empresa}</p>
                  </div>
                )}
                {selectedFicha.snv && (
                  <div>
                    <p className="text-sm font-semibold">SNV:</p>
                    <p>{selectedFicha.snv}</p>
                  </div>
                )}
              </div>

              {itens.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Pontos de Verificação:</p>
                  <div className="space-y-4">
                    {itens.map((item) => (
                      <Card key={item.ordem}>
                        <CardHeader>
                          <CardTitle>Ponto {item.ordem}</CardTitle>
                          <img
                            src={item.foto_url}
                            alt={`Ponto ${item.ordem}`}
                            className="w-full h-64 object-cover rounded"
                          />
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {item.km_inicial && <p><strong>KM:</strong> {item.km_inicial}</p>}
                          {item.sentido && <p><strong>Sentido:</strong> {item.sentido}</p>}
                          {item.latitude_inicial && item.longitude_inicial && (
                            <p><strong>Coordenadas:</strong> {item.latitude_inicial}, {item.longitude_inicial}</p>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                            {Object.entries(item)
                              .filter(([key]) => !['ordem', 'foto_url', 'latitude_inicial', 'longitude_inicial', 'sentido', 'km_inicial', 'ficha_id', 'id', 'created_at'].includes(key))
                              .filter(([key]) => !key.endsWith('_medicoes')) // Não exibir arrays de medições
                              .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                              .map(([key, value]) => {
                                if (key.endsWith('_conforme')) return null;
                                if (key.endsWith('_obs') && !value) return null;
                                
                                // Para campos de retrorefletividade, mostrar apenas a média
                                const isRetro = key.startsWith('retro_');
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                const conforme = item[`${key}_conforme`];
                                
                                return (
                                  <div key={key} className="border-l-2 border-primary pl-2">
                                    <p className="font-semibold">{label}:</p>
                                    <p className={isRetro ? "text-lg font-bold text-primary" : ""}>
                                      {typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value}
                                      {isRetro && ' mcd/lux'}
                                    </p>
                                    {conforme !== undefined && (
                                      <Badge variant={conforme ? "default" : "destructive"} className="mt-1">
                                        {conforme ? "Conforme" : "Não conforme"}
                                      </Badge>
                                    )}
                                    {item[`${key}_obs`] && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Obs: {item[`${key}_obs`]}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para criar nova ficha */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ficha de Verificação</DialogTitle>
          </DialogHeader>
          {activeSession && (
            <FichaVerificacaoForm 
              loteId={activeSession.lote_id}
              rodoviaId={activeSession.rodovia_id}
              onSuccess={() => {
                setCreateDialogOpen(false);
                fetchFichas();
                toast.success("Ficha criada! Aparecerá na lista em instantes.");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFichaToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
