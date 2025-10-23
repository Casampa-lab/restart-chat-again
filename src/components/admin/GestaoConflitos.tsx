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
import { AlertCircle, CheckCircle2, XCircle, MapPin, Info, Download, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface GestaoConflitosProps {
  loteId?: string;
  rodoviaId?: string;
}

interface ConflitoDados {
  id: string;
  tipo_elemento: string;
  tipo_conflito: string;
  tem_conflito_servico: boolean;
  conflito_detalhes: any;
  observacao_conflito?: string;
  km?: number;
  km_inicial?: number;
  codigo?: string;
  tipo?: string;
  lado?: string;
  servico?: string;
  latitude?: number;
  longitude?: number;
  latitude_inicial?: number;
  longitude_inicial?: number;
  rodovia?: { id: string; codigo: string };
  lote?: { id: string; numero: string };
}

const TIPOS_NECESSIDADES = [
  { value: 'placas', label: 'Placas', tabela_nec: 'necessidades_placas' },
  { value: 'porticos', label: 'Pórticos', tabela_nec: 'necessidades_porticos' },
  { value: 'inscricoes', label: 'Inscrições', tabela_nec: 'necessidades_inscricoes' },
  { value: 'marcas_longitudinais', label: 'Marcas Longitudinais', tabela_nec: 'necessidades_marcas_longitudinais' },
  { value: 'tachas', label: 'Tachas', tabela_nec: 'necessidades_tachas' },
  { value: 'defensas', label: 'Defensas', tabela_nec: 'necessidades_defensas' },
  { value: 'marcas_transversais', label: 'Marcas Transversais', tabela_nec: 'necessidades_marcas_transversais' },
];

const TIPO_CONFLITO_LABELS: Record<string, string> = {
  'SERVICO_CONTRADICTORIO': 'Serviço Contraditório',
  'DUPLICATA_PROJETO': 'Duplicata no Projeto',
};

export function GestaoConflitos({ loteId, rodoviaId }: GestaoConflitosProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [filtros, setFiltros] = useState({
    tipoElemento: '',
    tipoConflito: '',
    kmInicio: '',
    kmFim: '',
  });
  
  const [conflitoSelecionado, setConflitoSelecionado] = useState<ConflitoDados | null>(null);
  const [dialogDetalhesAberto, setDialogDetalhesAberto] = useState(false);
  const [dialogResolucaoAberto, setDialogResolucaoAberto] = useState(false);
  const [observacaoResolucao, setObservacaoResolucao] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 25;

  // Query: Buscar conflitos
  const { data: conflitos = [], isLoading } = useQuery({
    queryKey: ['conflitos', loteId, rodoviaId, filtros],
    queryFn: async () => {
      const queries = TIPOS_NECESSIDADES.map(async (tipo) => {
        let query = supabase
          .from(tipo.tabela_nec as any)
          .select(`
            id,
            tem_conflito_servico,
            tipo_conflito,
            conflito_detalhes,
            observacao_conflito,
            km,
            km_inicial,
            codigo,
            tipo,
            lado,
            servico,
            latitude,
            longitude,
            latitude_inicial,
            longitude_inicial,
            rodovia:rodovias(id, codigo),
            lote:lotes(id, numero)
          `)
          .eq('tem_conflito_servico', true);
        
        if (loteId) query = query.eq('lote_id', loteId);
        if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);
        if (filtros.tipoConflito) query = query.eq('tipo_conflito', filtros.tipoConflito);
        if (filtros.kmInicio) {
          const kmIni = parseFloat(filtros.kmInicio);
          query = query.gte('km', kmIni).or(`km_inicial.gte.${kmIni}`);
        }
        if (filtros.kmFim) {
          const kmFim = parseFloat(filtros.kmFim);
          query = query.lte('km', kmFim).or(`km_inicial.lte.${kmFim}`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return ((data || []) as any[]).map((item: any) => ({
          ...item,
          tipo_elemento: tipo.value
        }));
      });
      
      if (filtros.tipoElemento) {
        const tipoFiltrado = TIPOS_NECESSIDADES.find(t => t.value === filtros.tipoElemento);
        if (tipoFiltrado) {
          const idx = TIPOS_NECESSIDADES.indexOf(tipoFiltrado);
          const resultado = await queries[idx];
          return resultado;
        }
      }
      
      const resultados = await Promise.all(queries);
      const todosConflitos = resultados.flat();
      
      return todosConflitos.sort((a, b) => {
        const kmA = a.km || a.km_inicial || 0;
        const kmB = b.km || b.km_inicial || 0;
        return kmA - kmB;
      });
    },
    enabled: !!user
  });

  // Query: Estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: ['estatisticas-conflitos', loteId, rodoviaId],
    queryFn: async () => {
      const queries = TIPOS_NECESSIDADES.map(async (tipo) => {
        let query = supabase
          .from(tipo.tabela_nec as any)
          .select('tem_conflito_servico, tipo_conflito, conflito_detalhes')
          .eq('tem_conflito_servico', true);
        
        if (loteId) query = query.eq('lote_id', loteId);
        if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);
        
        const { data, error } = await query;
        if (error) throw error;
        
        return { tipo: tipo.value, conflitos: data || [] };
      });
      
      const resultados = await Promise.all(queries);
      
      let total = 0;
      let contraditorio = 0;
      let duplicata = 0;
      const porElemento: Record<string, number> = {};
      
      resultados.forEach(({ tipo, conflitos }) => {
        total += conflitos.length;
        porElemento[tipo] = conflitos.length;
        
        conflitos.forEach((c: any) => {
          if (c.tipo_conflito === 'SERVICO_CONTRADICTORIO') contraditorio++;
          else if (c.tipo_conflito === 'DUPLICATA_PROJETO') duplicata++;
        });
      });
      
      return {
        total_conflitos: total,
        por_tipo: {
          SERVICO_CONTRADICTORIO: contraditorio,
          DUPLICATA_PROJETO: duplicata
        },
        por_elemento: porElemento,
        pendentes_resolucao: total,
        resolvidos: 0
      };
    },
    enabled: !!user
  });

  // Mutation: Resolver conflito
  const resolverConflito = useMutation({
    mutationFn: async ({ 
      tipoElemento, 
      necessidadeId, 
      observacao 
    }: {
      tipoElemento: string;
      necessidadeId: string;
      observacao: string;
    }) => {
      const tipoConfig = TIPOS_NECESSIDADES.find(t => t.value === tipoElemento);
      if (!tipoConfig) throw new Error('Tipo inválido');
      
      const { error } = await supabase
        .from(tipoConfig.tabela_nec as any)
        .update({
          observacao_conflito: observacao,
          tem_conflito_servico: false, // Marca como resolvido
        })
        .eq('id', necessidadeId);
      
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

  // Mutation: Excluir necessidade
  const excluirNecessidade = useMutation({
    mutationFn: async ({ 
      tipoElemento, 
      necessidadeId 
    }: {
      tipoElemento: string;
      necessidadeId: string;
    }) => {
      const tipoConfig = TIPOS_NECESSIDADES.find(t => t.value === tipoElemento);
      if (!tipoConfig) throw new Error('Tipo inválido');
      
      const { error } = await supabase
        .from(tipoConfig.tabela_nec as any)
        .delete()
        .eq('id', necessidadeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflitos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-conflitos'] });
      toast.success('Necessidade excluída com sucesso');
      setDialogDetalhesAberto(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir necessidade: ' + error.message);
    }
  });

  const abrirDialogDetalhes = (conflito: ConflitoDados) => {
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
      tipoElemento: conflitoSelecionado.tipo_elemento,
      necessidadeId: conflitoSelecionado.id,
      observacao: observacaoResolucao
    });
  };

  const exportarParaExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const dados = conflitos.map(c => {
      const detalhes = c.conflito_detalhes || {};
      return {
        'Tipo Conflito': TIPO_CONFLITO_LABELS[c.tipo_conflito] || c.tipo_conflito,
        'Rodovia': c.rodovia?.codigo || '-',
        'Lote': c.lote?.numero || '-',
        'KM': (c.km || c.km_inicial || 0).toFixed(3),
        'Tipo Elemento': TIPOS_NECESSIDADES.find(t => t.value === c.tipo_elemento)?.label || c.tipo_elemento,
        'Código': c.codigo || '-',
        'Lado': c.lado || '-',
        'Serviço': c.servico || '-',
        'Linha Excel 1': detalhes.linha_excel_1 || '-',
        'Linha Excel 2': detalhes.linha_excel_2 || '-',
        'Observação': c.observacao_conflito || '-'
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
      ['Serviço Contraditório', estatisticas?.por_tipo.SERVICO_CONTRADICTORIO || 0],
      ['Duplicata de Projeto', estatisticas?.por_tipo.DUPLICATA_PROJETO || 0]
    ];
    
    const statsSheet = XLSX.utils.aoa_to_sheet(stats);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estatísticas');
    
    XLSX.writeFile(workbook, `conflitos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório exportado com sucesso');
  };

  const limparFiltros = () => {
    setFiltros({
      tipoElemento: '',
      tipoConflito: '',
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
              {estatisticas?.por_tipo.SERVICO_CONTRADICTORIO || 0}
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
              {estatisticas?.por_tipo.DUPLICATA_PROJETO || 0}
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

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros Avançados</CardTitle>
          <CardDescription>Refine a busca por conflitos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Tipo de Elemento</Label>
              <Select value={filtros.tipoElemento} onValueChange={(value) => setFiltros({ ...filtros, tipoElemento: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {TIPOS_NECESSIDADES.map(tipo => (
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
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="SERVICO_CONTRADICTORIO">Serviço Contraditório</SelectItem>
                  <SelectItem value="DUPLICATA_PROJETO">Duplicata</SelectItem>
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
        <Button onClick={exportarParaExcel} variant="outline" size="sm">
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
                  ? "Não há conflitos detectados para este lote e rodovia."
                  : "Selecione um lote e rodovia no topo da página."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Elemento</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Lado</TableHead>
                    <TableHead>Rodovia</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflitosVisiveis.map((conflito) => (
                    <TableRow 
                      key={conflito.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => abrirDialogDetalhes(conflito)}
                    >
                      <TableCell>
                        <Badge variant={conflito.tipo_conflito === 'SERVICO_CONTRADICTORIO' ? 'destructive' : 'default'}>
                          {conflito.tipo_conflito === 'SERVICO_CONTRADICTORIO' ? '🔴 Contraditório' : '🟡 Duplicata'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {(conflito.km || conflito.km_inicial || 0).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        {TIPOS_NECESSIDADES.find(t => t.value === conflito.tipo_elemento)?.label}
                      </TableCell>
                      <TableCell className="font-mono">{conflito.codigo || '-'}</TableCell>
                      <TableCell>{conflito.lado || '-'}</TableCell>
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
              </AlertDialogTitle>
              <AlertDialogDescription>
                Duas necessidades contraditórias foram detectadas no mesmo local
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
                      {conflitoSelecionado.latitude?.toFixed(6) || conflitoSelecionado.latitude_inicial?.toFixed(6) || '-'}, 
                      {conflitoSelecionado.longitude?.toFixed(6) || conflitoSelecionado.longitude_inicial?.toFixed(6) || '-'}
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
              {conflitoSelecionado.conflito_detalhes && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2 border-blue-300">
                    <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                      <CardTitle className="text-blue-700 dark:text-blue-400 text-sm">
                        📄 Necessidade 1 (Linha {conflitoSelecionado.conflito_detalhes.linha_excel_1 || '?'})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-4">
                      <div>
                        <Label>Serviço:</Label>
                        <Badge className="ml-2 bg-blue-500">
                          {conflitoSelecionado.conflito_detalhes.servico_1 || '-'}
                        </Badge>
                      </div>
                      <div>
                        <Label>Código:</Label>
                        <span className="ml-2 font-mono">{conflitoSelecionado.codigo || '-'}</span>
                      </div>
                      <div>
                        <Label>Lado:</Label>
                        <span className="ml-2">{conflitoSelecionado.lado || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-purple-300">
                    <CardHeader className="bg-purple-50 dark:bg-purple-950/20">
                      <CardTitle className="text-purple-700 dark:text-purple-400 text-sm">
                        📄 Necessidade 2 (Linha {conflitoSelecionado.conflito_detalhes.linha_excel_2 || '?'})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-4">
                      <div>
                        <Label>Serviço:</Label>
                        <Badge className="ml-2 bg-purple-500">
                          {conflitoSelecionado.conflito_detalhes.servico_2 || '-'}
                        </Badge>
                      </div>
                      <div>
                        <Label>Código:</Label>
                        <span className="ml-2 font-mono">{conflitoSelecionado.codigo || '-'}</span>
                      </div>
                      <div>
                        <Label>Lado:</Label>
                        <span className="ml-2">{conflitoSelecionado.lado || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
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
              
              {/* Observação existente */}
              {conflitoSelecionado.observacao_conflito && (
                <Card>
                  <CardHeader>
                    <CardTitle>📝 Observação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{conflitoSelecionado.observacao_conflito}</p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <AlertDialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogDetalhesAberto(false)}>
                Fechar
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir esta necessidade? Esta ação não pode ser desfeita.')) {
                    excluirNecessidade.mutate({
                      tipoElemento: conflitoSelecionado.tipo_elemento,
                      necessidadeId: conflitoSelecionado.id
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Necessidade
              </Button>
              
              <Button onClick={abrirDialogResolucao}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como Resolvido
              </Button>
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
