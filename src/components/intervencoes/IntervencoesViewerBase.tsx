import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Info, Plus, Eye, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { findCoordinatorsByLoteId } from "@/lib/coordenadores";

interface IntervencoesViewerBaseProps {
  tipoElemento: string;
  tipoOrigem: 'execucao' | 'manutencao_pre_projeto';
  titulo: string;
  tabelaIntervencao: string;
  onEditarElemento?: (elemento: any) => void;
  badgeColor?: string;
  badgeLabel?: string;
  usarJoinExplicito?: boolean;
}

export function IntervencoesViewerBase({
  tipoElemento,
  tipoOrigem,
  titulo,
  tabelaIntervencao,
  onEditarElemento,
  badgeColor = "bg-primary",
  badgeLabel,
  usarJoinExplicito = false
}: IntervencoesViewerBaseProps) {
  const { user } = useAuth();
  const [elementos, setElementos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarEnviadas, setMostrarEnviadas] = useState(true);

  const carregar = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const selectQuery = usarJoinExplicito
        ? `
            *,
            autor:profiles!${tabelaIntervencao}_user_id_fkey(id, nome, email)
          `
        : '*';

      const { data, error } = await supabase
        .from(tabelaIntervencao as any)
        .select(selectQuery)
        .eq('user_id', user.id)
        .eq('tipo_origem', tipoOrigem)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar intervenções:', {
          tabela: tabelaIntervencao,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      setElementos(data || []);
    } catch (error) {
      console.error('Erro ao carregar elementos:', error);
      toast.error('Erro ao carregar elementos registrados');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarParaCoordenador = async (intervencaoId: string) => {
    try {
      // Buscar dados da intervenção
      const { data: intervencao, error: fetchError } = await supabase
        .from(tabelaIntervencao as any)
        .select('id, lote_id, km_inicial, data_intervencao, created_at, motivo, codigo, tipo')
        .eq('id', intervencaoId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!intervencao) throw new Error('Intervenção não encontrada');

      const loteId = (intervencao as any).lote_id;
      if (!loteId) {
        toast.error('Esta intervenção não tem Lote definido. Não é possível enviar.');
        return;
      }

      // Atualizar status
      const { error: updateError } = await supabase
        .from(tabelaIntervencao as any)
        .update({
          pendente_aprovacao_coordenador: false,
          data_aprovacao_coordenador: new Date().toISOString(),
          enviado_coordenador: true,
          enviado_coordenador_em: new Date().toISOString(),
        })
        .eq('id', intervencaoId);

      if (updateError) throw updateError;

      // Buscar coordenadores
      const destinatarios = await findCoordinatorsByLoteId(supabase as any, loteId);

      if (!destinatarios.length) {
        // Reverter status se ninguém for encontrado
        await supabase
          .from(tabelaIntervencao as any)
          .update({ 
            pendente_aprovacao_coordenador: true,
            data_aprovacao_coordenador: null,
            enviado_coordenador: false,
            enviado_coordenador_em: null
          })
          .eq('id', intervencaoId);

        toast.error(
          'Nenhum coordenador encontrado para este Lote. Cadastre em "Configurações → Coordenações" ou defina o coordenador no cadastro do Lote.',
        );
        return;
      }

      // Criar identificação da intervenção
      const intervencaoAny = intervencao as any;
      const identificacao = intervencaoAny.motivo || intervencaoAny.codigo || intervencaoAny.tipo || 'Intervenção';
      const kmTexto = intervencaoAny.km_inicial ? `KM ${intervencaoAny.km_inicial.toFixed(3)}` : 'localização não informada';
      const dataTexto = intervencaoAny.data_intervencao
        ? new Date(intervencaoAny.data_intervencao).toLocaleDateString("pt-BR")
        : new Date(intervencaoAny.created_at).toLocaleDateString("pt-BR");

      // Criar notificações
      const notifications = destinatarios.map((uid: string) => ({
        user_id: uid,
        tipo: 'intervencao_pendente',
        titulo: `Nova ${tipoOrigem === 'manutencao_pre_projeto' ? 'Manutenção' : 'Execução'} - ${tipoElemento}`,
        mensagem: `${identificacao} (${kmTexto} / ${dataTexto}) aguarda sua validação`,
        lida: false,
        elemento_pendente_id: null,
        nc_id: null,
      }));

      const { error: notifError } = await supabase.from("notificacoes").insert(notifications);
      if (notifError) console.error("Erro ao notificar coordenadores:", notifError);

      toast.success(`Intervenção enviada para ${destinatarios.length} coordenador(es)!`);
      carregar();
    } catch (error: any) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar intervenção: ' + error.message);
    }
  };

  const handleExcluir = async (intervencaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta intervenção?')) return;

    try {
      const { error } = await supabase
        .from(tabelaIntervencao as any)
        .delete()
        .eq('id', intervencaoId);

      if (error) throw error;

      toast.success('Intervenção excluída com sucesso!');
      carregar();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir intervenção: ' + error.message);
    }
  };

  useEffect(() => {
    carregar();
  }, [user, tipoOrigem]);

  const renderTipoIdentificacao = (elem: any) => {
    // Priorizar solução para elementos que a possuem (cilindros, defensas, pórticos)
    if (elem.solucao) return elem.solucao;
    // Depois verificar campos específicos de identificação
    if (elem.codigo) return elem.codigo;
    if (elem.tipo_demarcacao) return elem.tipo_demarcacao;
    if (elem.tipo) return elem.tipo;
    if (elem.tipo_tacha) return elem.tipo_tacha;
    // Motivo só como última opção (para elementos que não têm outros identificadores)
    if (elem.motivo && elem.motivo !== '-') return elem.motivo;
    return 'Sem identificação';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const elementosFiltrados = mostrarEnviadas 
    ? elementos 
    : elementos.filter((e) => e.pendente_aprovacao_coordenador !== false && !e.enviado_coordenador);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {titulo}
              {badgeLabel && (
                <Badge className={badgeColor}>{badgeLabel}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {elementosFiltrados.length} de {elementos.length} registro(s)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mostrar-enviadas"
              checked={mostrarEnviadas}
              onCheckedChange={(checked) => setMostrarEnviadas(checked as boolean)}
            />
            <Label htmlFor="mostrar-enviadas" className="cursor-pointer text-sm font-normal">
              Mostrar enviadas
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {elementos.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Nenhum elemento registrado ainda para este tipo.
            </AlertDescription>
          </Alert>
        ) : elementosFiltrados.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {mostrarEnviadas ? "Nenhum elemento registrado" : "Nenhum elemento não enviado"}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solução</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {elementosFiltrados.map((elem) => (
                  <TableRow key={elem.id}>
                    <TableCell>
                      <Badge variant={tipoOrigem === 'execucao' ? 'default' : 'secondary'}>
                        {renderTipoIdentificacao(elem)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">📍</span>
                        {elem.km_final ? (
                          <span>{elem.km_inicial?.toFixed(3)} - {elem.km_final?.toFixed(3)}</span>
                        ) : (
                          <span>{elem.km_inicial?.toFixed(3) || '-'}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {elem.data_intervencao 
                        ? format(new Date(elem.data_intervencao), 'dd/MM/yyyy') 
                        : format(new Date(elem.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          elem.enviado_coordenador || elem.pendente_aprovacao_coordenador === false
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {elem.enviado_coordenador || elem.pendente_aprovacao_coordenador === false
                          ? 'Enviada'
                          : 'Rascunho'}
                      </Badge>
                      {elem.fotos_urls?.length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          📸 {elem.fotos_urls.length}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEnviarParaCoordenador(elem.id)}
                                disabled={elem.enviado_coordenador || elem.pendente_aprovacao_coordenador === false}
                                title={
                                  elem.enviado_coordenador || elem.pendente_aprovacao_coordenador === false
                                    ? "Intervenção já foi enviada"
                                    : "Enviar para Coordenador"
                                }
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Enviar para Coordenador</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => onEditarElemento?.(elem)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar detalhes</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExcluir(elem.id)}
                                disabled={elem.enviado_coordenador || elem.pendente_aprovacao_coordenador === false}
                                title={
                                  elem.enviado_coordenador || elem.pendente_aprovacao_coordenador === false
                                    ? "Não pode excluir: intervenção já enviada"
                                    : "Excluir"
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
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

        {/* Botão para Adicionar Novo */}
        <Button 
          variant="default"
          className="w-full mt-4"
          onClick={() => onEditarElemento?.(null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Novo
        </Button>
      </CardContent>
    </Card>
  );
}
