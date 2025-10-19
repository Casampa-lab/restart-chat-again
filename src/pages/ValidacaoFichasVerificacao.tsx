import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, FileCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { exportFichaVerificacaoParaDNIT } from "@/lib/excelExportFichas";

interface FichaComDetalhes {
  id: string;
  tipo: string;
  data_verificacao: string;
  status: string;
  user_id: string;
  enviado_coordenador_em: string;
  contrato: string;
  empresa: string;
  snv: string;
  profiles: {
    nome: string;
  };
  rodovias: {
    codigo: string;
  };
  lotes: {
    numero: string;
  };
  ficha_verificacao_itens: ItemDetalhado[];
}

interface ItemDetalhado {
  id: string;
  ordem: number;
  foto_url: string;
  latitude: number;
  longitude: number;
  km: string;
  sentido: string;
  largura_cm: number;
  largura_conforme: boolean;
  largura_obs: string;
  retro_bd: number;
  retro_bd_medicoes: number[];
  retro_bd_conforme: boolean;
  retro_bd_obs: string;
  retro_e: number;
  retro_e_medicoes: number[];
  retro_e_conforme: boolean;
  retro_e_obs: string;
  retro_be: number;
  retro_be_medicoes: number[];
  retro_be_conforme: boolean;
  retro_be_obs: string;
  marcas_conforme: boolean;
  marcas_obs: string;
  material_conforme: boolean;
  material_obs: string;
  tachas_conforme: boolean;
  tachas_obs: string;
  data_implantacao: string;
  data_implantacao_conforme: boolean;
  data_implantacao_obs: string;
  velocidade_conforme: boolean;
  velocidade_obs: string;
}

export default function ValidacaoFichasVerificacao() {
  const navigate = useNavigate();
  const [fichas, setFichas] = useState<FichaComDetalhes[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('pendente_aprovacao_coordenador');
  const [selectedFicha, setSelectedFicha] = useState<FichaComDetalhes | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aprovarDialogOpen, setAprovarDialogOpen] = useState(false);
  const [rejeitarDialogOpen, setRejeitarDialogOpen] = useState(false);
  const [observacaoCoordenador, setObservacaoCoordenador] = useState('');
  const [grauNC, setGrauNC] = useState('');
  const [problemaNC, setProblemaNC] = useState('');
  const [aprovando, setAprovando] = useState(false);
  const [rejeitando, setRejeitando] = useState(false);

  useEffect(() => {
    fetchFichas();
  }, [filtroStatus]);

  const fetchFichas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ficha_verificacao')
        .select(`
          *,
          profiles:user_id(nome),
          rodovias:rodovia_id(codigo),
          lotes:lote_id(numero),
          ficha_verificacao_itens(*)
        `)
        .order('enviado_coordenador_em', { ascending: false });

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFichas(data as any || []);
    } catch (error: any) {
      toast.error('Erro ao carregar fichas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFicha = (ficha: FichaComDetalhes) => {
    setSelectedFicha(ficha);
    setDialogOpen(true);
  };

  const handleAprovar = async () => {
    if (!selectedFicha) return;

    setAprovando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error: updateError } = await supabase
        .from('ficha_verificacao')
        .update({
          status: 'aprovado',
          aprovado_coordenador_em: new Date().toISOString(),
          coordenador_id: user.id,
          observacao_coordenador: observacaoCoordenador || null
        })
        .eq('id', selectedFicha.id);

      if (updateError) throw updateError;

      toast.success('Ficha aprovada com sucesso!');
      setAprovarDialogOpen(false);
      setObservacaoCoordenador('');
      setSelectedFicha(null);
      fetchFichas();
    } catch (error: any) {
      toast.error('Erro ao aprovar: ' + error.message);
    } finally {
      setAprovando(false);
    }
  };

  const handleRejeitar = async () => {
    if (!selectedFicha || !grauNC || !problemaNC) return;

    setRejeitando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar rodovia_id e lote_id diretamente da ficha
      const { data: fichaCompleta } = await supabase
        .from('ficha_verificacao')
        .select('rodovia_id, lote_id')
        .eq('id', selectedFicha.id)
        .single();

      // Criar NC
      const { data: nc, error: ncError } = await supabase
        .from('nao_conformidades')
        .insert([{
          problema_identificado: problemaNC,
          tipo_nc: 'Verificação de Campo',
          natureza: 'Corretiva',
          grau: grauNC,
          data_ocorrencia: new Date().toISOString().split('T')[0],
          user_id: selectedFicha.user_id,
          rodovia_id: fichaCompleta?.rodovia_id,
          lote_id: fichaCompleta?.lote_id
        }] as any)
        .select()
        .single();

      if (ncError) throw ncError;

      // Atualizar status da ficha
      const { error: updateError } = await supabase
        .from('ficha_verificacao')
        .update({
          status: 'rejeitado',
          rejeitado_coordenador_em: new Date().toISOString(),
          coordenador_id: user.id,
          observacao_coordenador: `NC ${nc.numero_nc} criada: ${problemaNC}`
        })
        .eq('id', selectedFicha.id);

      if (updateError) throw updateError;

      toast.success(`Ficha rejeitada. NC ${nc.numero_nc} criada.`);
      setRejeitarDialogOpen(false);
      setGrauNC('');
      setProblemaNC('');
      setSelectedFicha(null);
      fetchFichas();
    } catch (error: any) {
      toast.error('Erro ao rejeitar: ' + error.message);
    } finally {
      setRejeitando(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/coordenacao-fiscalizacao")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileCheck className="h-8 w-8" />
              Validação de Fichas de Verificação
            </h1>
            <p className="text-muted-foreground">Aprovar ou rejeitar fichas SH enviadas pelos técnicos</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente_aprovacao_coordenador">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Fichas */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando fichas...</p>
          ) : fichas.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma ficha encontrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Rodovia/Lote</TableHead>
                  <TableHead>Nº Pontos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fichas.map((ficha) => (
                  <TableRow key={ficha.id}>
                    <TableCell>{new Date(ficha.data_verificacao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{ficha.profiles?.nome || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="default">SH</Badge>
                    </TableCell>
                    <TableCell>{ficha.rodovias?.codigo || 'N/A'} / Lote {ficha.lotes?.numero || 'N/A'}</TableCell>
                    <TableCell>{ficha.ficha_verificacao_itens?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={
                        ficha.status === 'aprovado' ? 'default' :
                        ficha.status === 'rejeitado' ? 'destructive' :
                        'secondary'
                      }>
                        {ficha.status === 'pendente_aprovacao_coordenador' ? 'Pendente' :
                         ficha.status === 'aprovado' ? 'Aprovado' :
                         'Rejeitado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewFicha(ficha)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ficha.status === 'pendente_aprovacao_coordenador' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedFicha(ficha);
                                setAprovarDialogOpen(true);
                              }}
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedFicha(ficha);
                                setRejeitarDialogOpen(true);
                              }}
                            >
                              Rejeitar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ficha SH - {selectedFicha?.rodovias?.codigo} - {selectedFicha?.profiles?.nome}
            </DialogTitle>
          </DialogHeader>

          {selectedFicha && (
            <div className="space-y-6">
              {/* Cabeçalho */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-muted-foreground">Data:</p>
                      <p>{new Date(selectedFicha.data_verificacao).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Técnico:</p>
                      <p>{selectedFicha.profiles?.nome}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Rodovia/Lote:</p>
                      <p>{selectedFicha.rodovias?.codigo} / {selectedFicha.lotes?.numero}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Status:</p>
                      <Badge variant={selectedFicha.status === 'aprovado' ? 'default' : 'secondary'}>
                        {selectedFicha.status === 'pendente_aprovacao_coordenador' ? 'Pendente' :
                         selectedFicha.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pontos */}
              {selectedFicha.ficha_verificacao_itens?.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>Ponto {item.ordem}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.foto_url && (
                      <img
                        src={item.foto_url}
                        alt={`Ponto ${item.ordem}`}
                        className="w-full max-h-96 object-contain rounded border"
                      />
                    )}

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-semibold">📍 Coordenadas:</p>
                        <p>{item.latitude}, {item.longitude}</p>
                      </div>
                      <div>
                        <p className="font-semibold">📏 KM:</p>
                        <p>{item.km}</p>
                      </div>
                      <div>
                        <p className="font-semibold">➡️ Sentido:</p>
                        <p>{item.sentido}</p>
                      </div>
                    </div>

                    <Separator />
                    <h4 className="font-semibold">📊 Retrorefletividade (SH)</h4>

                    {/* Retro BD */}
                    {item.retro_bd && (
                      <div className="border rounded p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">BD (Bordo Direito)</p>
                          <Badge variant={item.retro_bd_conforme ? 'default' : 'destructive'}>
                            {item.retro_bd_conforme ? 'Conforme' : 'Não conforme'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          Média: {item.retro_bd} mcd/lux
                        </p>
                        {item.retro_bd_medicoes && item.retro_bd_medicoes.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Leituras individuais:
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {item.retro_bd_medicoes.map((medicao, idx) => (
                                <div key={idx} className="text-center p-2 bg-muted rounded text-sm">
                                  <p className="text-xs text-muted-foreground">#{idx + 1}</p>
                                  <p className="font-semibold">{medicao}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.retro_bd_obs && (
                          <p className="text-xs text-muted-foreground">Obs: {item.retro_bd_obs}</p>
                        )}
                      </div>
                    )}

                    {/* Retro E */}
                    {item.retro_e && (
                      <div className="border rounded p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">Eixo</p>
                          <Badge variant={item.retro_e_conforme ? 'default' : 'destructive'}>
                            {item.retro_e_conforme ? 'Conforme' : 'Não conforme'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          Média: {item.retro_e} mcd/lux
                        </p>
                        {item.retro_e_medicoes && item.retro_e_medicoes.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Leituras individuais:
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {item.retro_e_medicoes.map((medicao, idx) => (
                                <div key={idx} className="text-center p-2 bg-muted rounded text-sm">
                                  <p className="text-xs text-muted-foreground">#{idx + 1}</p>
                                  <p className="font-semibold">{medicao}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.retro_e_obs && (
                          <p className="text-xs text-muted-foreground">Obs: {item.retro_e_obs}</p>
                        )}
                      </div>
                    )}

                    {/* Retro BE */}
                    {item.retro_be && (
                      <div className="border rounded p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">BE (Bordo Esquerdo)</p>
                          <Badge variant={item.retro_be_conforme ? 'default' : 'destructive'}>
                            {item.retro_be_conforme ? 'Conforme' : 'Não conforme'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          Média: {item.retro_be} mcd/lux
                        </p>
                        {item.retro_be_medicoes && item.retro_be_medicoes.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Leituras individuais:
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {item.retro_be_medicoes.map((medicao, idx) => (
                                <div key={idx} className="text-center p-2 bg-muted rounded text-sm">
                                  <p className="text-xs text-muted-foreground">#{idx + 1}</p>
                                  <p className="font-semibold">{medicao}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.retro_be_obs && (
                          <p className="text-xs text-muted-foreground">Obs: {item.retro_be_obs}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Aprovação */}
      <Dialog open={aprovarDialogOpen} onOpenChange={setAprovarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Ficha de Verificação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja aprovar esta ficha?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Observação do Coordenador (opcional)</Label>
              <Textarea
                value={observacaoCoordenador}
                onChange={(e) => setObservacaoCoordenador(e.target.value)}
                placeholder="Adicione observações sobre a aprovação..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAprovarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAprovar} disabled={aprovando}>
                {aprovando ? 'Aprovando...' : 'Aprovar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={rejeitarDialogOpen} onOpenChange={setRejeitarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Ficha de Verificação</DialogTitle>
            <DialogDescription className="text-destructive font-semibold">
              Esta ficha será rejeitada e uma Não Conformidade será criada automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grau da NC *</Label>
              <Select value={grauNC} onValueChange={setGrauNC}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Grave">Grave</SelectItem>
                  <SelectItem value="Gravíssima">Gravíssima</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Problema Identificado *</Label>
              <Textarea
                value={problemaNC}
                onChange={(e) => setProblemaNC(e.target.value)}
                placeholder="Descreva o problema encontrado na ficha..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejeitarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejeitar} 
                disabled={rejeitando || !grauNC || !problemaNC}
              >
                {rejeitando ? 'Rejeitando...' : 'Rejeitar e Criar NC'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
