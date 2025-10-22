import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { useMarcoZeroRecente } from '@/hooks/useMarcoZeroRecente';
import { calculateDistance, sortByProximity } from '@/lib/gpsUtils';
import { AlertaProximidade } from '@/components/AlertaProximidade';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const TIPO_ELEMENTO_LABELS: Record<string, string> = {
  placas: "Placas",
  marcas_longitudinais: "Marcas Longitudinais",
  inscricoes: "Inscrições",
  tachas: "Tachas",
  cilindros: "Cilindros",
  porticos: "Pórticos",
  defensas: "Defensas",
};

interface EvolucaoGeral {
  tipo_elemento: string;
  total_elementos: number;
  originais: number;
  manutencao_pre_projeto: number;
  execucao_projeto: number;
}

interface Necessidade {
  id: string;
  tipo_elemento: string;
  acao: string;
  km_inicial?: number;
  km_final?: number;
  lado?: string;
  posicao?: string;
  descricao_servico?: string;
  latitude_inicial?: number;
  longitude_inicial?: number;
  distance?: number;
  snv?: string;
  observacao?: string;
  codigo?: string;
  tipo?: string;
  cor?: string;
  dimensoes?: string;
  quantidade?: number;
  espacamento_m?: number;
  extensao_metros?: number;
  material?: string;
}

interface ContagemElemento {
  cadastro_inicial: number;      // Cinza - elementos originais
  criados_match: number;          // Roxo - criados pelo RecalcularMatches
  necessidades_totais: number;    // Total de necessidades importadas
  necessidades_pendentes: number; // Verde - necessidades não matcheadas
  total_inventario?: number;      // Total no inventário (usado após Marco Zero)
}

interface Contadores {
  todos: ContagemElemento;
  sh: ContagemElemento;
  sv: ContagemElemento;
  def: ContagemElemento;
  por_tipo: Record<string, ContagemElemento>;
}

export default function InventarioDinamicoComAlerta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const { position, watching, startWatching, stopWatching } = useGPSTracking();
  
  // Verificar se existe Marco Zero (sem limite de tempo)
  const { data: marcoZero } = useQuery({
    queryKey: ["marco-zero-existe", activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      if (!activeSession?.lote_id || !activeSession?.rodovia_id) return null;

      const { data, error } = await supabase
        .from("marcos_inventario")
        .select("*")
        .eq("lote_id", activeSession.lote_id)
        .eq("rodovia_id", activeSession.rodovia_id)
        .eq("tipo", "marco_zero")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!activeSession?.lote_id && !!activeSession?.rodovia_id,
  });
  
  const [necessidades, setNecessidades] = useState<Necessidade[]>([]);
  const [necessidadesProximas, setNecessidadesProximas] = useState<Necessidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupoSelecionado, setGrupoSelecionado] = useState<'todos' | 'sv' | 'sh' | 'defensas'>('todos');
  const [tipoSV, setTipoSV] = useState<'placas' | 'porticos'>('placas');
  const [tipoSH, setTipoSH] = useState<'marcas_longitudinais' | 'cilindros' | 'inscricoes' | 'tachas'>('marcas_longitudinais');
  const [contadores, setContadores] = useState<Contadores>({
    todos: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
    sh: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
    sv: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
    def: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
    por_tipo: {},
  });

  const RAIO_ALERTA = 100; // metros

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

  useEffect(() => {
    if (activeSession) {
      carregarNecessidades();
      startWatching();
    }
    return () => {
      stopWatching();
    };
  }, [activeSession]);

  useEffect(() => {
    if (position && necessidades.length > 0) {
      verificarProximidade();
    }
  }, [position, necessidades]);

  const carregarNecessidades = async () => {
    if (!activeSession) return;

    try {
      setLoading(true);
      const todasNecessidades: Necessidade[] = [];
      const contadoresAux: Record<string, { cadastro: number, criados: number, necessidades: number, total: number }> = {};

      // Mapear tabelas de inventário e necessidades
      const tabelas = [
        { tipo: 'placas', cadastro: 'ficha_placa', necessidade: 'necessidades_placas' },
        { tipo: 'marcas_longitudinais', cadastro: 'ficha_marcas_longitudinais', necessidade: 'necessidades_marcas_longitudinais' },
        { tipo: 'tachas', cadastro: 'ficha_tachas', necessidade: 'necessidades_tachas' },
        { tipo: 'defensas', cadastro: 'defensas', necessidade: 'necessidades_defensas' },
        { tipo: 'cilindros', cadastro: 'ficha_cilindros', necessidade: 'necessidades_cilindros' },
        { tipo: 'porticos', cadastro: 'ficha_porticos', necessidade: 'necessidades_porticos' },
        { tipo: 'inscricoes', cadastro: 'ficha_inscricoes', necessidade: 'necessidades_marcas_transversais' },
      ];

      for (const tabela of tabelas) {
        // 1. Contar cadastro inicial ATIVO (AZUL)
        const { count: countCadastro } = await supabase
          .from(tabela.cadastro as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id)
          .eq('origem', 'cadastro_inicial')
          .eq('ativo', true);

        // 2. Contar criados pelo match ATIVOS (ROXO)
        const { count: countCriados } = await supabase
          .from(tabela.cadastro as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id)
          .eq('origem', 'necessidade')
          .eq('ativo', true);

        // 3. Contar TOTAL ATIVO no inventário (para pós-Marco Zero)
        const { count: countTotal } = await supabase
          .from(tabela.cadastro as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id)
          .eq('ativo', true);

        // 4. Buscar necessidades (para exibição e contagem)
        const { data: necessidadesData, count: countNecessidades } = await supabase
          .from(tabela.necessidade as any)
          .select('*', { count: 'exact' })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id);

        // Armazenar contadores
        contadoresAux[tabela.tipo] = {
          cadastro: countCadastro || 0,
          criados: countCriados || 0,
          necessidades: countNecessidades || 0,
          total: countTotal || 0,
        };

        // Mapear necessidades para exibição
        if (necessidadesData && Array.isArray(necessidadesData)) {
          const necessidadesMapeadas = necessidadesData.map((item: any) => ({
            id: item.id,
            tipo_elemento: tabela.tipo,
            acao: item.servico || item.acao || item.descricao_servico || 'N/A',
            km_inicial: item.km_inicial,
            km_final: item.km_final,
            lado: item.lado,
            posicao: item.posicao,
            descricao_servico: item.descricao_servico || item.servico,
            latitude_inicial: item.latitude_inicial,
            longitude_inicial: item.longitude_inicial,
            snv: item.snv,
            observacao: item.observacao || item.observacoes,
            codigo: item.codigo,
            tipo: item.tipo || item.tipo_placa || item.tipo_demarcacao,
            cor: item.cor,
            dimensoes: item.dimensoes || item.dimensoes_mm,
            quantidade: item.quantidade,
            espacamento_m: item.espacamento_m,
            extensao_metros: item.extensao_metros || item.extensao_m,
            material: item.material,
          }));
          todasNecessidades.push(...necessidadesMapeadas);
        }
      }

      setNecessidades(todasNecessidades);
      calcularContadores(contadoresAux);
    } catch (error) {
      console.error('Erro ao carregar necessidades:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularContadores = (contadoresPorTipo: Record<string, { cadastro: number, criados: number, necessidades: number, total: number }>) => {
    const resultado: Contadores = {
      todos: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
      sh: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
      sv: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
      def: { cadastro_inicial: 0, criados_match: 0, necessidades_totais: 0, necessidades_pendentes: 0, total_inventario: 0 },
      por_tipo: {},
    };

    const tiposSH = ['marcas_longitudinais', 'cilindros', 'inscricoes', 'tachas'];
    const tiposSV = ['placas', 'porticos'];
    const tiposDef = ['defensas'];

    Object.entries(contadoresPorTipo).forEach(([tipo, contagem]) => {
      const contElemento: ContagemElemento = {
        cadastro_inicial: contagem.cadastro,
        criados_match: contagem.criados,
        necessidades_totais: contagem.necessidades,
        necessidades_pendentes: contagem.necessidades - contagem.criados,
        total_inventario: contagem.total,
      };

      // Por tipo
      resultado.por_tipo[tipo] = contElemento;

      // Todos
      resultado.todos.cadastro_inicial += contElemento.cadastro_inicial;
      resultado.todos.criados_match += contElemento.criados_match;
      resultado.todos.necessidades_totais += contElemento.necessidades_totais;
      resultado.todos.necessidades_pendentes += contElemento.necessidades_pendentes;
      resultado.todos.total_inventario! += contElemento.total_inventario!;

      // SH
      if (tiposSH.includes(tipo)) {
        resultado.sh.cadastro_inicial += contElemento.cadastro_inicial;
        resultado.sh.criados_match += contElemento.criados_match;
        resultado.sh.necessidades_totais += contElemento.necessidades_totais;
        resultado.sh.necessidades_pendentes += contElemento.necessidades_pendentes;
        resultado.sh.total_inventario! += contElemento.total_inventario!;
      }

      // SV
      if (tiposSV.includes(tipo)) {
        resultado.sv.cadastro_inicial += contElemento.cadastro_inicial;
        resultado.sv.criados_match += contElemento.criados_match;
        resultado.sv.necessidades_totais += contElemento.necessidades_totais;
        resultado.sv.necessidades_pendentes += contElemento.necessidades_pendentes;
        resultado.sv.total_inventario! += contElemento.total_inventario!;
      }

      // Defensas
      if (tiposDef.includes(tipo)) {
        resultado.def.cadastro_inicial += contElemento.cadastro_inicial;
        resultado.def.criados_match += contElemento.criados_match;
        resultado.def.necessidades_totais += contElemento.necessidades_totais;
        resultado.def.necessidades_pendentes += contElemento.necessidades_pendentes;
        resultado.def.total_inventario! += contElemento.total_inventario!;
      }
    });

    setContadores(resultado);
  };

  const verificarProximidade = async () => {
    if (!position) return;

    const proximas = necessidades
      .filter(nec => nec.latitude_inicial && nec.longitude_inicial)
      .map(nec => ({
        ...nec,
        distance: calculateDistance(
          position.latitude,
          position.longitude,
          nec.latitude_inicial!,
          nec.longitude_inicial!
        ),
      }))
      .filter(nec => nec.distance <= RAIO_ALERTA)
      .sort((a, b) => a.distance - b.distance);

    if (proximas.length > 0 && proximas.length !== necessidadesProximas.length) {
      setNecessidadesProximas(proximas);
      
      // Vibração de alerta
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
        setTimeout(async () => {
          await Haptics.impact({ style: ImpactStyle.Light });
        }, 100);
      } catch (error) {
        console.error('Erro ao vibrar:', error);
      }
    } else if (proximas.length === 0) {
      setNecessidadesProximas([]);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      placas: '🚦 Placas',
      marcas_longitudinais: '➖ Marcas Longitudinais',
      tachas: '⚪ Tachas',
      defensas: '🛡️ Defensas',
      cilindros: '🔵 Cilindros',
      porticos: '🌉 Pórticos',
      inscricoes: '📝 Inscrições',
    };
    return labels[tipo] || tipo;
  };

  // Determinar tipo ativo baseado no grupo e subtipo selecionado
  const getTipoElementoAtivo = () => {
    if (grupoSelecionado === 'todos') return null; // Mostrar todos
    if (grupoSelecionado === 'defensas') return 'defensas';
    if (grupoSelecionado === 'sv') return tipoSV;
    if (grupoSelecionado === 'sh') return tipoSH;
    return null;
  };

  const tipoAtivo = getTipoElementoAtivo();

  const necessidadesFiltradas = (() => {
    const filtradas = tipoAtivo === null 
      ? necessidades 
      : necessidades.filter(n => n.tipo_elemento === tipoAtivo);
    
    if (!position) return filtradas;
    
    // Separar necessidades com e sem coordenadas
    const comCoordenadas = filtradas.filter(n => n.latitude_inicial && n.longitude_inicial);
    const semCoordenadas = filtradas.filter(n => !n.latitude_inicial || !n.longitude_inicial);
    
    // Ordenar as que têm coordenadas por proximidade
    const ordenadas = sortByProximity(comCoordenadas, position.latitude, position.longitude);
    
    // Ordenar as sem coordenadas por km
    const semCoordenadasOrdenadas = semCoordenadas.sort((a, b) => 
      (a.km_inicial || 0) - (b.km_inicial || 0)
    );
    
    // Juntar: primeiro as próximas, depois as sem coordenadas
    return [...ordenadas, ...semCoordenadasOrdenadas];
  })();

  // Agrupar necessidades por tipo para visualização "Todos"
  const necessidadesAgrupadas = () => {
    const grupos: Record<string, Necessidade[]> = {};
    necessidadesFiltradas.forEach(nec => {
      if (!grupos[nec.tipo_elemento]) {
        grupos[nec.tipo_elemento] = [];
      }
      grupos[nec.tipo_elemento].push(nec);
    });
    return grupos;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/modo-campo')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inventário Dinâmico</h1>
            {activeSession && (
              <p className="text-sm text-muted-foreground">
                Lote {activeSession.lote?.numero || '-'} | {activeSession.rodovia?.codigo || '-'}
              </p>
            )}
          </div>
        </div>

      {/* Status GPS */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className={watching ? "h-5 w-5 text-green-500" : "h-5 w-5 text-muted-foreground"} />
              <span className="text-sm">
                {watching ? 'GPS Ativo' : 'GPS Desativado'}
              </span>
            </div>
            {position && (
              <Badge variant="outline">
                {position.latitude.toFixed(6)}°, {position.longitude.toFixed(6)}°
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Proximidade */}
      {necessidadesProximas.length > 0 && (
        <div className="space-y-3 mb-4">
          {necessidadesProximas.map(nec => (
            <AlertaProximidade
              key={nec.id}
              necessidade={nec}
              distance={nec.distance!}
              onVerDetalhes={() => {
                // TODO: Abrir modal com detalhes
                console.log('Ver detalhes:', nec);
              }}
              onRegistrarAgora={() => {
                navigate('/modo-campo/registrar-intervencao', {
                  state: { necessidade: nec }
                });
              }}
            />
          ))}
        </div>
      )}

      {/* Legenda de Contadores */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          {marcoZero ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                <span className="font-semibold">Inventário Dinâmico (Pós-Marco Zero)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Total de elementos cadastrados incluindo intervenções estruturais aprovadas
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <span>Cadastro Inicial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Criados (Match)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Necessidades Pendentes</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros - Tabs aninhadas igual ao desktop */}
      <Tabs value={grupoSelecionado} onValueChange={(v) => setGrupoSelecionado(v as any)} className="mb-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todos">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs">Todos</span>
              {marcoZero ? (
                <Badge className="bg-muted text-foreground text-[10px] px-1 py-0 h-4 leading-4 border-0">
                  {contadores.todos.total_inventario}
                </Badge>
              ) : (
                <div className="flex gap-0.5">
                  <Badge className="bg-gray-200 text-black text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.todos.cadastro_inicial}
                  </Badge>
                  <Badge className="bg-purple-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.todos.criados_match}
                  </Badge>
                  <Badge className="bg-green-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.todos.necessidades_pendentes}
                  </Badge>
                </div>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="sh">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs">SH</span>
              {marcoZero ? (
                <Badge className="bg-muted text-foreground text-[10px] px-1 py-0 h-4 leading-4 border-0">
                  {contadores.sh.total_inventario}
                </Badge>
              ) : (
                <div className="flex gap-0.5">
                  <Badge className="bg-gray-200 text-black text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.sh.cadastro_inicial}
                  </Badge>
                  <Badge className="bg-purple-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.sh.criados_match}
                  </Badge>
                  <Badge className="bg-green-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.sh.necessidades_pendentes}
                  </Badge>
                </div>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="sv">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs">SV</span>
              {marcoZero ? (
                <Badge className="bg-muted text-foreground text-[10px] px-1 py-0 h-4 leading-4 border-0">
                  {contadores.sv.total_inventario}
                </Badge>
              ) : (
                <div className="flex gap-0.5">
                  <Badge className="bg-gray-200 text-black text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.sv.cadastro_inicial}
                  </Badge>
                  <Badge className="bg-purple-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.sv.criados_match}
                  </Badge>
                  <Badge className="bg-green-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.sv.necessidades_pendentes}
                  </Badge>
                </div>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="defensas">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs">Def</span>
              {marcoZero ? (
                <Badge className="bg-muted text-foreground text-[10px] px-1 py-0 h-4 leading-4 border-0">
                  {contadores.def.total_inventario}
                </Badge>
              ) : (
                <div className="flex gap-0.5">
                  <Badge className="bg-gray-200 text-black text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.def.cadastro_inicial}
                  </Badge>
                  <Badge className="bg-purple-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.def.criados_match}
                  </Badge>
                  <Badge className="bg-green-500 text-white text-[10px] px-1 py-0 h-4 leading-4 border-0">
                    {contadores.def.necessidades_pendentes}
                  </Badge>
                </div>
              )}
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo Todos - agrupado */}
        <TabsContent value="todos" className="mt-0">
          <div className="mt-4">
            {renderListaNecessidadesAgrupadas()}
          </div>
        </TabsContent>

        {/* Conteúdo SV */}
        <TabsContent value="sv" className="mt-0">
          <Tabs value={tipoSV} onValueChange={(v) => setTipoSV(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="placas">Placas</TabsTrigger>
              <TabsTrigger value="porticos">Pórticos (P/SM)</TabsTrigger>
            </TabsList>
            <TabsContent value="placas" className="mt-0">
              {renderListaNecessidades()}
            </TabsContent>
            <TabsContent value="porticos" className="mt-0">
              {renderListaNecessidades()}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Conteúdo SH */}
        <TabsContent value="sh" className="mt-0">
          <Tabs value={tipoSH} onValueChange={(v) => setTipoSH(v as any)}>
            <TabsList className="grid w-full grid-cols-4 mt-4">
              <TabsTrigger value="marcas_longitudinais">M. Long.</TabsTrigger>
              <TabsTrigger value="cilindros">Cilindros</TabsTrigger>
              <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
              <TabsTrigger value="tachas">Tachas</TabsTrigger>
            </TabsList>
            <TabsContent value="marcas_longitudinais" className="mt-0">
              {renderListaNecessidades()}
            </TabsContent>
            <TabsContent value="cilindros" className="mt-0">
              {renderListaNecessidades()}
            </TabsContent>
            <TabsContent value="inscricoes" className="mt-0">
              {renderListaNecessidades()}
            </TabsContent>
            <TabsContent value="tachas" className="mt-0">
              {renderListaNecessidades()}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Conteúdo Defensas */}
        <TabsContent value="defensas" className="mt-0">
          <div className="mt-4">
            {renderListaNecessidades()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Função auxiliar para renderizar a lista de necessidades agrupadas (para tab "Todos")
  function renderListaNecessidadesAgrupadas() {
    if (loading) {
      return (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando necessidades...</p>
          </CardContent>
        </Card>
      );
    }

    if (necessidadesFiltradas.length === 0) {
      return (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhuma necessidade encontrada
            </p>
          </CardContent>
        </Card>
      );
    }

    const grupos = necessidadesAgrupadas();
    const tiposOrdenados = Object.keys(grupos).sort();

    return (
      <div className="space-y-6">
        {tiposOrdenados.map(tipo => (
          <div key={tipo}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <h3 className="text-lg font-semibold">{getTipoLabel(tipo)}</h3>
              <Badge variant="secondary">{grupos[tipo].length}</Badge>
            </div>
            <div className="space-y-3">
              {grupos[tipo].map(nec => (
                <Card key={nec.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="outline" className="font-semibold">
                            km {nec.km_inicial?.toFixed(3) || '-'}
                            {nec.km_final && ` → ${nec.km_final.toFixed(3)}`}
                          </Badge>
                          {nec.posicao && (
                            <Badge variant="default" className="bg-blue-600">
                              {nec.posicao}
                            </Badge>
                          )}
                          {!nec.posicao && nec.lado && (
                            <Badge variant="outline">
                              {nec.lado}
                            </Badge>
                          )}
                          {nec.snv && (
                            <Badge variant="secondary" className="text-xs">
                              SNV {nec.snv}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Características técnicas específicas */}
                        <div className="flex flex-wrap gap-2 text-xs">
                      {nec.codigo && (
                        <span className="text-muted-foreground">📋 {nec.codigo}</span>
                      )}
                      {nec.tipo && nec.tipo !== nec.codigo && (
                        <span className="text-muted-foreground">🔧 {nec.tipo}</span>
                      )}
                          {nec.cor && (
                            <span className="text-muted-foreground">🎨 {nec.cor}</span>
                          )}
                          {nec.dimensoes && (
                            <span className="text-muted-foreground">📏 {nec.dimensoes}</span>
                          )}
                          {nec.quantidade && (
                            <span className="text-muted-foreground">×{nec.quantidade}</span>
                          )}
                          {nec.espacamento_m && (
                            <span className="text-muted-foreground">↔️ {nec.espacamento_m}m</span>
                          )}
                          {nec.extensao_metros && (
                            <span className="text-muted-foreground">📐 {nec.extensao_metros.toFixed(0)}m</span>
                          )}
                          {nec.material && (
                            <span className="text-muted-foreground">🧱 {nec.material}</span>
                          )}
                        </div>
                      </div>
                    <div className="flex flex-col gap-2 items-end">
                      {nec.distance !== undefined && nec.latitude_inicial && nec.longitude_inicial && (
                        <Badge variant={nec.distance <= RAIO_ALERTA ? 'destructive' : 'secondary'}>
                          {nec.distance < 1000 
                            ? `${Math.round(nec.distance)}m` 
                            : `${(nec.distance / 1000).toFixed(2)}km`}
                        </Badge>
                      )}
                      {(!nec.latitude_inicial || !nec.longitude_inicial) && (
                        <Badge variant="outline" className="text-muted-foreground">
                          📍 Sem GPS
                        </Badge>
                      )}
                    </div>
                  </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">{nec.acao}</p>
                        {nec.descricao_servico && nec.descricao_servico !== nec.acao && (
                          <p className="text-xs text-muted-foreground">{nec.descricao_servico}</p>
                        )}
                      </div>
                      
                      {nec.observacao && (
                        <div className="bg-muted/50 p-2 rounded-md">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">💬 Observação:</span> {nec.observacao}
                          </p>
                        </div>
                      )}
                      
                      {nec.latitude_inicial && nec.longitude_inicial && (
                        <div className="text-xs text-muted-foreground font-mono">
                          📍 {nec.latitude_inicial.toFixed(6)}, {nec.longitude_inicial.toFixed(6)}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => navigate('/modo-campo/registrar-intervencao', {
                        state: { necessidade: nec }
                      })}
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Registrar Intervenção
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Função auxiliar para renderizar a lista de necessidades
  function renderListaNecessidades() {
    return (
      <>
      {loading ? (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando necessidades...</p>
          </CardContent>
        </Card>
      ) : necessidadesFiltradas.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhuma necessidade encontrada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 mt-4">
          {necessidadesFiltradas.map(nec => (
            <Card key={nec.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-base">
                      {getTipoLabel(nec.tipo_elemento)}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline" className="font-semibold">
                        km {nec.km_inicial?.toFixed(3) || '-'}
                        {nec.km_final && ` → ${nec.km_final.toFixed(3)}`}
                      </Badge>
                      {nec.posicao && (
                        <Badge variant="default" className="bg-blue-600">
                          {nec.posicao}
                        </Badge>
                      )}
                      {!nec.posicao && nec.lado && (
                        <Badge variant="outline">
                          {nec.lado}
                        </Badge>
                      )}
                      {nec.snv && (
                        <Badge variant="secondary" className="text-xs">
                          SNV {nec.snv}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Características técnicas específicas */}
                    <div className="flex flex-wrap gap-2 text-xs">
                  {nec.codigo && (
                    <span className="text-muted-foreground">📋 {nec.codigo}</span>
                  )}
                  {nec.tipo && nec.tipo !== nec.codigo && (
                    <span className="text-muted-foreground">🔧 {nec.tipo}</span>
                  )}
                      {nec.cor && (
                        <span className="text-muted-foreground">🎨 {nec.cor}</span>
                      )}
                      {nec.dimensoes && (
                        <span className="text-muted-foreground">📏 {nec.dimensoes}</span>
                      )}
                      {nec.quantidade && (
                        <span className="text-muted-foreground">×{nec.quantidade}</span>
                      )}
                      {nec.espacamento_m && (
                        <span className="text-muted-foreground">↔️ {nec.espacamento_m}m</span>
                      )}
                      {nec.extensao_metros && (
                        <span className="text-muted-foreground">📐 {nec.extensao_metros.toFixed(0)}m</span>
                      )}
                      {nec.material && (
                        <span className="text-muted-foreground">🧱 {nec.material}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {nec.distance !== undefined && nec.latitude_inicial && nec.longitude_inicial && (
                      <Badge variant={nec.distance <= RAIO_ALERTA ? 'destructive' : 'secondary'}>
                        {nec.distance < 1000 
                          ? `${Math.round(nec.distance)}m` 
                          : `${(nec.distance / 1000).toFixed(2)}km`}
                      </Badge>
                    )}
                    {(!nec.latitude_inicial || !nec.longitude_inicial) && (
                      <Badge variant="outline" className="text-muted-foreground">
                        📍 Sem GPS
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{nec.acao}</p>
                    {nec.descricao_servico && nec.descricao_servico !== nec.acao && (
                      <p className="text-xs text-muted-foreground">{nec.descricao_servico}</p>
                    )}
                  </div>
                  
                  {nec.observacao && (
                    <div className="bg-muted/50 p-2 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">💬 Observação:</span> {nec.observacao}
                      </p>
                    </div>
                  )}
                  
                  {nec.latitude_inicial && nec.longitude_inicial && (
                    <div className="text-xs text-muted-foreground font-mono">
                      📍 {nec.latitude_inicial.toFixed(6)}, {nec.longitude_inicial.toFixed(6)}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => navigate('/modo-campo/registrar-intervencao', {
                    state: { necessidade: nec }
                  })}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Registrar Intervenção
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </>
    );
  }
}