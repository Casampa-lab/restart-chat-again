import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Send, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NCEditDialog from "@/components/NCEditDialog";
import { generateNCPDF } from "@/lib/pdfGenerator";
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

interface NaoConformidade {
  id: string;
  numero_nc: string;
  data_ocorrencia: string;
  tipo_nc: string;
  problema_identificado: string;
  situacao: string;
  empresa: string;
  enviado_coordenador: boolean;
  data_notificacao: string | null;
  status_aprovacao: string;
  observacao_coordenador: string | null;
  rodovias: {
    codigo: string;
  };
  lotes: {
    numero: string;
  };
}

const MinhasNCs = () => {
  const navigate = useNavigate();
  const [ncs, setNcs] = useState<NaoConformidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ncToDelete, setNcToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ncToEdit, setNcToEdit] = useState<string | null>(null);
  const [showEnviadas, setShowEnviadas] = useState(true);

  const loadNCs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("nao_conformidades")
        .select(`
          id,
          numero_nc,
          data_ocorrencia,
          tipo_nc,
          problema_identificado,
          situacao,
          empresa,
          enviado_coordenador,
          data_notificacao,
          status_aprovacao,
          observacao_coordenador,
          rodovias(codigo),
          lotes(numero)
        `)
        .eq("user_id", user.id)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNcs(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar NCs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNCs();
  }, []);

  const handleDelete = async () => {
    if (!ncToDelete) return;

    try {
      const { error } = await supabase
        .from("nao_conformidades")
        .update({ deleted: true })
        .eq("id", ncToDelete);

      if (error) throw error;

      toast.success("NC excluída com sucesso!");
      loadNCs();
    } catch (error: any) {
      toast.error("Erro ao excluir NC: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setNcToDelete(null);
    }
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case "Atendida": return "bg-green-500";
      case "Não Atendida": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const handleEnviarParaCoordenador = async (ncId: string) => {
    try {
      const { error } = await supabase
        .from("nao_conformidades")
        .update({ enviado_coordenador: true })
        .eq("id", ncId);

      if (error) throw error;

      toast.success("NC enviada para revisão do coordenador!");
      loadNCs();
    } catch (error: any) {
      toast.error("Erro ao enviar NC: " + error.message);
    }
  };

  const getStatusBadge = (nc: NaoConformidade) => {
    if (!nc.enviado_coordenador) {
      return <Badge variant="outline" className="bg-gray-100">Rascunho</Badge>;
    }
    
    if (nc.status_aprovacao === 'rejeitado') {
      return <Badge variant="destructive">Rejeitada</Badge>;
    }
    
    if (nc.status_aprovacao === 'aprovado' && nc.data_notificacao) {
      return <Badge variant="outline" className="bg-green-100">Notificada</Badge>;
    }
    
    if (nc.status_aprovacao === 'aprovado') {
      return <Badge variant="outline" className="bg-blue-100">Aprovada</Badge>;
    }
    
    return <Badge variant="outline" className="bg-yellow-100">Aguardando Aprovação</Badge>;
  };

  const filteredNCs = showEnviadas 
    ? ncs 
    : ncs.filter(nc => !nc.enviado_coordenador);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Button variant="navigation" onClick={() => navigate('/modo-campo')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <Button 
              onClick={() => navigate('/modo-campo/registrar-nc')}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova NC
            </Button>
            
            <div className="flex items-center gap-2">
              <label htmlFor="show-enviadas" className="text-sm cursor-pointer">
                Mostrar NCs enviadas
              </label>
              <input
                type="checkbox"
                id="show-enviadas"
                checked={showEnviadas}
                onChange={(e) => setShowEnviadas(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Não-Conformidades</CardTitle>
            <CardDescription>
              Revise e envie suas NCs para o coordenador e fiscal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : filteredNCs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {showEnviadas 
                  ? "Nenhuma NC cadastrada ainda"
                  : "Nenhuma NC não enviada"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número NC</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Rodovia</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Problema</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observação Coord.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNCs.map((nc) => (
                      <TableRow key={nc.id}>
                        <TableCell className="font-medium">{nc.numero_nc}</TableCell>
                        <TableCell>{new Date(nc.data_ocorrencia).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{nc.rodovias.codigo}</TableCell>
                        <TableCell>{nc.lotes.numero}</TableCell>
                        <TableCell>{nc.tipo_nc}</TableCell>
                        <TableCell>{nc.problema_identificado}</TableCell>
                        <TableCell>
                          <Badge className={getSituacaoColor(nc.situacao)}>
                            {nc.situacao}
                          </Badge>
                        </TableCell>
                         <TableCell>
                          {getStatusBadge(nc)}
                        </TableCell>
                        <TableCell>
                          {nc.observacao_coordenador ? (
                            <div className="max-w-xs truncate" title={nc.observacao_coordenador}>
                              {nc.observacao_coordenador}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnviarParaCoordenador(nc.id)}
                              disabled={nc.enviado_coordenador || nc.status_aprovacao === 'rejeitado'}
                              title={
                                nc.status_aprovacao === 'rejeitado' 
                                  ? "Corrija a NC primeiro antes de reenviar" 
                                  : nc.enviado_coordenador 
                                    ? "NC já foi enviada ao coordenador" 
                                    : "Enviar para Coordenador"
                              }
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNcToEdit(nc.id);
                                setEditDialogOpen(true);
                              }}
                              disabled={nc.enviado_coordenador && nc.status_aprovacao !== 'rejeitado'}
                              title={
                                nc.status_aprovacao === 'rejeitado'
                                  ? "Editar NC rejeitada"
                                  : nc.enviado_coordenador 
                                    ? "Não é possível editar NCs em revisão" 
                                    : "Editar NC"
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNcToDelete(nc.id);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={nc.enviado_coordenador && nc.status_aprovacao !== 'rejeitado'}
                              title="Excluir NC"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

      <NCEditDialog
        ncId={ncToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSaved={loadNCs}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta NC? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MinhasNCs;