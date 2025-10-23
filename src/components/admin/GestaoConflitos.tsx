import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle2, MapPin, Info, Download, Eye, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface GestaoConflitosProps {
  loteId?: string;
  rodoviaId?: string;
}

const TIPOS_ELEMENTO = [
  { value: 'PLACA', label: 'Placas' },
  { value: 'PORTICO', label: 'Pórticos' },
  { value: 'INSCRICAO', label: 'Inscrições' },
  { value: 'MARCA_LONG', label: 'Marcas Longitudinais' },
  { value: 'TACHAS', label: 'Tachas' },
  { value: 'DEFENSA', label: 'Defensas' },
  { value: 'CILINDRO', label: 'Cilindros' },
];

const TIPO_CONFLITO_LABELS: Record<string, string> = {
  'SERVICO_CONTRADICTORIO': 'Serviço Contraditório',
  'DUPLICATA_PROJETO': 'Duplicata no Projeto',
  'OVERLAP_INCOMPATIVEL': 'Overlap Incompatível',
  'ATRIBUTO_DIVERGENTE': 'Atributo Divergente',
};

export function GestaoConflitos({ loteId, rodoviaId }: GestaoConflitosProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [filtros, setFiltros] = useState({
    tipoElemento: 'todos',
    tipoConflito: 'todos',
    status: 'todos',
    kmInicio: '',
    kmFim: '',
  });
  
  const [conflitoSelecionado, setConflitoSelecionado] = useState<any>(null);
  const [dialogDetalhesAberto, setDialogDetalhesAberto] = useState(false);
  const [dialogResolucaoAberto, setDialogResolucaoAberto] = useState(false);
  const [observacaoResolucao, setObservacaoResolucao] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 25;

  // Mutation: Detectar conflitos via RPC
  const detectarConflitos = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('detectar_conflitos_servico' as any, {
        p_rodovia_id: rodoviaId || null,
        p_lote_id: loteId || null,
        p_tipo_elemento: filtros.tipoElemento !== 'todos' ? filtros.tipoElemento : null
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['conflitos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-conflitos'] });
      toast.success(`✅ ${data?.total || 0} conflito(s) detectado(s)`);
    },
    onError: (error: any) => {
      toast.error('Erro ao detectar conflitos: ' + error.message);
    }
  });

  // Query: Buscar conflitos da tabela centralizada
  const { data: conflitos = [], isLoading } = useQuery({
    queryKey: ['conflitos', loteId, rodoviaId, filtros],
    queryFn: async () => {
      let query = supabase
        .from('conflitos_servico' as any)
        .select(`
          *,
          rodovia:rodovias(id, codigo),
          lote:lotes(id, numero)
        `)
        .order('detectado_em', { ascending: false });
      
      if (loteId) query = query.eq('lote_id', loteId);
      if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);
      if (filtros.tipoElemento !== 'todos') query = query.eq('tipo_elemento', filtros.tipoElemento);
      if (filtros.tipoConflito !== 'todos') query = query.eq('tipo_conflito', filtros.tipoConflito);
      if (filtros.status !== 'todos') {
        query = query.eq('resolvido', filtros.status === 'resolvido');
      }
      if (filtros.kmInicio) query = query.gte('km', parseFloat(filtros.kmInicio));
      if (filtros.kmFim) query = query.lte('km', parseFloat(filtros.kmFim));
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user
  });

  // Query: Estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: ['estatisticas-conflitos', loteId, rodoviaId],
    queryFn: async () => {
      let query = supabase
        .from('conflitos_servico' as any)
        .select('tipo_conflito, tipo_elemento, resolvido');
      
      if (loteId) query = query.eq('lote_id', loteId);
      if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);
      
      const { data, error } = await query;
      if (error) throw error;
      
      const conflitos = data || [];
      const total = conflitos.length;
      const resolvidos = conflitos.filter((c: any) => c.resolvido).length;
      const pendentes = total - resolvidos;
      
      const porTipo: Record<string, number> = {};
      const porElemento: Record<string, number> = {};
      
      conflitos.forEach((c: any) => {
        porTipo[c.tipo_conflito] = (porTipo[c.tipo_conflito] || 0) + 1;
        porElemento[c.tipo_elemento] = (porElemento[c.tipo_elemento] || 0) + 1;
      });
      
      return {
        total_conflitos: total,
        por_tipo: porTipo,
        por_elemento: porElemento,
        pendentes_resolucao: pendentes,
        resolvidos: resolvidos
      };
    },
    enabled: !!user
  });

  // Mutation: Resolver conflito
  const resolverConflito = useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao: string }) => {
      const { error } = await supabase
        .from('conflitos_servico' as any)
        .update({
          resolvido: true,
          resolvido_em: new Date().toISOString(),
          resolvido_por: user?.id,
          observacao_resolucao: observacao,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflitos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-conflitos'] });
      toast.success('Conflito marcado como resolvido');
      setDialogResolucaoAberto(false);
      setDialogDetalhesAberto(false);
      setObservacaoResolucao("");
    },
    onError: (error: any) => {
      toast.error('Erro ao resolver conflito: ' + error.message);
    }
  });

  const abrirDialogDetalhes = (conflito: any) => {
    setConflitoSelecionado(conflito);
    setDialogDetalhesAberto(true);
  };

  const abrirDialogResolucao = () => {
    setDialogDetalhesAberto(false);
    setDialogResolucaoAberto(true);
  };

  const confirmarResolucao = () => {
    if (!conflitoSelecionado || !observacaoResolucao.trim()) {
      toast.error('Observação é obrigatória');
      return;
    }

    resolverConflito.mutate({
      id: conflitoSelecionado.id,
      observacao: observacaoResolucao
    });
  };

  const exportarParaExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const dados = conflitos.map((c: any) => {
      const detalhes = c.detalhes || {};
      return {
        'Status': c.resolvido ? 'Resolvido' : 'Pendente',
        'Tipo Conflito': TIPO_CONFLITO_LABELS[c.tipo_conflito] || c.tipo_conflito,
        'Rodovia': c.rodovia?.codigo || '-',
        'Lote': c.lote?.numero || '-',
        'KM': (c.km || c.km_inicial || 0).toFixed(3),
        'Tipo Elemento': TIPOS_ELEMENTO.find(t => t.value === c.tipo_elemento)?.label || c.tipo_elemento,
        'Código': detalhes.codigo || '-',
        'Lado': detalhes.lado || '-',
        'Serviço 1': detalhes.servico_1 || '-',
        'Serviço 2': detalhes.servico_2 || '-',
        'Linha Excel 1': detalhes.linha_excel_1 || '-',
        'Linha Excel 2': detalhes.linha_excel_2 || '-',
        'Detectado em': new Date(c.detectado_em).toLocaleString('pt-BR'),
        'Resolvido em': c.resolvido_em ? new Date(c.resolvido_em).toLocaleString('pt-BR') : '-',
        'Observação': c.observacao_resolucao || '-'
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Conflitos');
    
    const stats = [
      ['Estatísticas de Conflitos'],
      [''],
      ['Total de Conflitos', estatisticas?.total_conflitos || 0],
      ['Pendentes', estatisticas?.pendentes_resolucao || 0],
      ['Resolvidos', estatisticas?.resolvidos || 0],
      [''],
      ['Por Tipo de Conflito:'],
      ...Object.entries(estatisticas?.por_tipo || {}).map(([tipo, count]) => [
        TIPO_CONFLITO_LABELS[tipo] || tipo, 
        count
      ])
    ];
    
    const statsSheet = XLSX.utils.aoa_to_sheet(stats);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estatísticas');
    
    XLSX.writeFile(workbook, `conflitos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório exportado com sucesso');
  };

  const limparFiltros = () => {
    setFiltros({
      tipoElemento: 'todos',
      tipoConflito: 'todos',
      status: 'todos',
      kmInicio: '',
      kmFim: '',
    });
    setPaginaAtual(1);
  };

  // Paginação
  const conflitosVisiveis = conflitos.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );
  const totalPaginas = Math.ceil(conflitos.length / itensPorPagina);

  return (
    <div className="space-y-6">
      {/* Dashboard de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Conflitos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{estatisticas?.total_conflitos || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contraditórios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {estatisticas?.por_tipo?.SERVICO_CONTRADICTORIO || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">IMPLANTAR + REMOVER</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duplicatas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {estatisticas?.por_tipo?.DUPLICATA_PROJETO || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Linhas duplicadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {estatisticas?.pendentes_resolucao || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando revisão</p>
          </CardContent>
        </Card>
      </div>

      {/* Botão Detectar Conflitos */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle>🔍 Detector de Conflitos</CardTitle>
          <CardDescription>
            Execute a análise automática para detectar conflitos nas necessidades importadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => detectarConflitos.mutate()}
            disabled={detectarConflitos.isPending || !loteId || !rodoviaId}
            size="lg"
            className="w-full"
          >
            {detectarConflitos.isPending ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                Detectando conflitos...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Detectar Conflitos de Serviço
              </>
            )}
          </Button>
          {(!loteId || !rodoviaId) && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Selecione lote e rodovia no topo da página para detectar conflitos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros Avançados</CardTitle>
          <CardDescription>Refine a busca por conflitos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Tipo de Elemento</Label>
              <Select value={filtros.tipoElemento} onValueChange={(value) => setFiltros({ ...filtros, tipoElemento: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TIPOS_ELEMENTO.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Conflito</Label>
              <Select value={filtros.tipoConflito} onValueChange={(value) => setFiltros({ ...filtros, tipoConflito: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="SERVICO_CONTRADICTORIO">Serviço Contraditório</SelectItem>
                  <SelectItem value="DUPLICATA_PROJETO">Duplicata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">⏳ Pendente</SelectItem>
                  <SelectItem value="resolvido">✅ Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>KM Inicial</Label>
              <input
                type="number"
                step="0.001"
                placeholder="Ex: 225.500"
                value={filtros.kmInicio}
                onChange={(e) => setFiltros({ ...filtros, kmInicio: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Label>KM Final</Label>
              <input
                type="number"
                step="0.001"
                placeholder="Ex: 226.000"
                value={filtros.kmFim}
                onChange={(e) => setFiltros({ ...filtros, kmFim: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={limparFiltros} variant="outline" className="w-full">
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar de Ações */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {conflitos.length} conflito(s) encontrado(s)
        </div>
        <Button onClick={exportarParaExcel} variant="outline" size="sm" disabled={conflitos.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar para Excel
        </Button>
      </div>

      {/* Tabela de Conflitos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Conflitos</CardTitle>
          <CardDescription>Clique em uma linha para ver detalhes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando conflitos...</div>
          ) : conflitos.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground">Nenhum conflito encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {loteId && rodoviaId 
                  ? "Clique em 'Detectar Conflitos' para executar a análise"
                  : "Selecione um lote e rodovia no topo da página"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Elemento</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Rodovia</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflitosVisiveis.map((conflito: any) => (
                    <TableRow 
                      key={conflito.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => abrirDialogDetalhes(conflito)}
                    >
                      <TableCell>
                        {conflito.resolvido ? (
                          <Badge variant="secondary">✅ Resolvido</Badge>
                        ) : (
                          <Badge variant="default">⏳ Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={conflito.tipo_conflito === 'SERVICO_CONTRADICTORIO' ? 'destructive' : 'default'}>
                          {conflito.tipo_conflito === 'SERVICO_CONTRADICTORIO' ? '🔴 Contraditório' : '🟡 Duplicata'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {(conflito.km || conflito.km_inicial || 0).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        {TIPOS_ELEMENTO.find(t => t.value === conflito.tipo_elemento)?.label}
                      </TableCell>
                      <TableCell className="font-mono">{conflito.detalhes?.codigo || '-'}</TableCell>
                      <TableCell>{conflito.rodovia?.codigo || '-'}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDialogDetalhes(conflito);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                  >
                    Próximo
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      {conflitoSelecionado && (
        <AlertDialog open={dialogDetalhesAberto} onOpenChange={setDialogDetalhesAberto}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Conflito de Serviço Detectado
                {conflitoSelecionado.resolvido && (
                  <Badge variant="secondary" className="ml-2">✅ Resolvido</Badge>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {TIPO_CONFLITO_LABELS[conflitoSelecionado.tipo_conflito]} - Detectado em {new Date(conflitoSelecionado.detectado_em).toLocaleString('pt-BR')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-6">
              {/* Informações do Conflito */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>KM:</Label>
                    <div className="text-lg font-bold">
                      {(conflitoSelecionado.km || conflitoSelecionado.km_inicial || 0).toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <Label>Coordenadas:</Label>
                    <div className="text-sm font-mono">
                      {conflitoSelecionado.latitude?.toFixed(6) || '-'}, {conflitoSelecionado.longitude?.toFixed(6) || '-'}
                    </div>
                  </div>
                  <div>
                    <Label>Rodovia:</Label>
                    <div>{conflitoSelecionado.rodovia?.codigo || '-'}</div>
                  </div>
                  <div>
                    <Label>Lote:</Label>
                    <div>Lote {conflitoSelecionado.lote?.numero || '-'}</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Detalhes do Conflito */}
              {conflitoSelecionado.detalhes && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2 border-blue-300">
                    <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                      <CardTitle className="text-blue-700 dark:text-blue-400 text-sm">
                        📄 Necessidade 1 (Linha {conflitoSelecionado.detalhes.linha_excel_1 || '?'})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-4">
                      <div>
                        <Label>Serviço:</Label>
                        <Badge className="ml-2 bg-blue-500">
                          {conflitoSelecionado.detalhes.servico_1 || conflitoSelecionado.detalhes.servico || '-'}
                        </Badge>
                      </div>
                      <div>
                        <Label>Código:</Label>
                        <span className="ml-2 font-mono">{conflitoSelecionado.detalhes.codigo || '-'}</span>
                      </div>
                      <div>
                        <Label>Lado:</Label>
                        <span className="ml-2">{conflitoSelecionado.detalhes.lado || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {conflitoSelecionado.detalhes.servico_2 && (
                    <Card className="border-2 border-purple-300">
                      <CardHeader className="bg-purple-50 dark:bg-purple-950/20">
                        <CardTitle className="text-purple-700 dark:text-purple-400 text-sm">
                          📄 Necessidade 2 (Linha {conflitoSelecionado.detalhes.linha_excel_2 || '?'})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-4">
                        <div>
                          <Label>Serviço:</Label>
                          <Badge className="ml-2 bg-purple-500">
                            {conflitoSelecionado.detalhes.servico_2 || '-'}
                          </Badge>
                        </div>
                        <div>
                          <Label>Código:</Label>
                          <span className="ml-2 font-mono">{conflitoSelecionado.detalhes.codigo || '-'}</span>
                        </div>
                        <div>
                          <Label>Lado:</Label>
                          <span className="ml-2">{conflitoSelecionado.detalhes.lado || '-'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              
              {/* Alertas */}
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>⚠️ Inconsistência Detectada</AlertTitle>
                <AlertDescription>
                  {conflitoSelecionado.tipo_conflito === 'SERVICO_CONTRADICTORIO' 
                    ? "Não é possível IMPLANTAR e REMOVER o mesmo elemento no mesmo local. Verifique o projeto."
                    : "A mesma linha foi importada duas vezes com o mesmo serviço. Pode ser erro de duplicação na planilha."}
                </AlertDescription>
              </Alert>
              
              {conflitoSelecionado.tipo_conflito === 'SERVICO_CONTRADICTORIO' && (
                <Alert className="bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle className="text-blue-800 dark:text-blue-200">💡 Sugestão</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    Se a intenção é trocar o elemento, utilize <strong>SUBSTITUIR</strong> ao invés de IMPLANTAR+REMOVER.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Resolução */}
              {conflitoSelecionado.resolvido && conflitoSelecionado.observacao_resolucao && (
                <Card>
                  <CardHeader>
                    <CardTitle>✅ Resolução</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label>Resolvido em:</Label>
                      <div className="text-sm">{new Date(conflitoSelecionado.resolvido_em).toLocaleString('pt-BR')}</div>
                    </div>
                    <div>
                      <Label>Observação:</Label>
                      <div className="text-sm mt-1 p-3 bg-muted rounded-md">
                        {conflitoSelecionado.observacao_resolucao}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <AlertDialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogDetalhesAberto(false)}>
                Fechar
              </Button>
              
              {!conflitoSelecionado.resolvido && (
                <Button onClick={abrirDialogResolucao}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Resolvido
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog de Resolução */}
      <Dialog open={dialogResolucaoAberto} onOpenChange={setDialogResolucaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Resolver Conflito
            </DialogTitle>
            <DialogDescription>
              Documente a resolução deste conflito para auditoria
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Observação sobre a Resolução *</Label>
              <Textarea 
                placeholder="Descreva como o conflito foi resolvido (ex: Corrigido no projeto original para SUBSTITUIR, Uma das necessidades foi excluída após confirmação com projetista, etc.)"
                value={observacaoResolucao}
                onChange={(e) => setObservacaoResolucao(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDialogResolucaoAberto(false);
              setObservacaoResolucao("");
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarResolucao}
              disabled={!observacaoResolucao.trim() || resolverConflito.isPending}
            >
              {resolverConflito.isPending ? 'Salvando...' : 'Confirmar Resolução'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
