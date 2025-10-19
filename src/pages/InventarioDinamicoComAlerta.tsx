import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useGPSTracking } from '@/hooks/useGPSTracking';
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
  lado?: string;
  descricao_servico?: string;
  latitude_inicial?: number;
  longitude_inicial?: number;
  distance?: number;
}

export default function InventarioDinamicoComAlerta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const { position, watching, startWatching, stopWatching } = useGPSTracking();
  
  const [necessidades, setNecessidades] = useState<Necessidade[]>([]);
  const [necessidadesProximas, setNecessidadesProximas] = useState<Necessidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupoSelecionado, setGrupoSelecionado] = useState<'todos' | 'sv' | 'sh' | 'defensas'>('todos');
  const [tipoSV, setTipoSV] = useState<'placas' | 'porticos'>('placas');
  const [tipoSH, setTipoSH] = useState<'marcas_longitudinais' | 'cilindros' | 'inscricoes' | 'tachas'>('marcas_longitudinais');

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

      // Buscar de todas as tabelas de necessidades
      const tabelas = [
        { nome: 'necessidades_placas', tipo: 'placas' },
        { nome: 'necessidades_marcas_longitudinais', tipo: 'marcas_longitudinais' },
        { nome: 'necessidades_tachas', tipo: 'tachas' },
        { nome: 'necessidades_defensas', tipo: 'defensas' },
        { nome: 'necessidades_cilindros', tipo: 'cilindros' },
        { nome: 'necessidades_porticos', tipo: 'porticos' },
        { nome: 'necessidades_marcas_transversais', tipo: 'inscricoes' },
      ];

      for (const tabela of tabelas) {
        const { data, error } = await supabase
          .from(tabela.nome as any)
          .select('*')
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id);

        if (error) {
          console.error(`Erro ao carregar ${tabela.nome}:`, error);
          continue;
        }

        if (data && Array.isArray(data)) {
          const necessidadesMapeadas = data.map((item: any) => ({
            id: item.id,
            tipo_elemento: tabela.tipo,
            acao: item.servico || item.acao || item.descricao_servico || 'N/A',
            km_inicial: item.km_inicial || item.km,
            lado: item.lado,
            descricao_servico: item.descricao_servico || item.servico,
            latitude_inicial: item.latitude_inicial || item.latitude,
            longitude_inicial: item.longitude_inicial || item.longitude,
          }));
          todasNecessidades.push(...necessidadesMapeadas);
        }
      }

      setNecessidades(todasNecessidades);
    } catch (error) {
      console.error('Erro ao carregar necessidades:', error);
    } finally {
      setLoading(false);
    }
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

  // Calcular contadores por grupo
  const getContadores = () => {
    const todos = necessidades.length;
    const sh = necessidades.filter(n => ['marcas_longitudinais', 'cilindros', 'inscricoes', 'tachas'].includes(n.tipo_elemento)).length;
    const sv = necessidades.filter(n => ['placas', 'porticos'].includes(n.tipo_elemento)).length;
    const def = necessidades.filter(n => n.tipo_elemento === 'defensas').length;
    return { todos, sh, sv, def };
  };

  const contadores = getContadores();

  const necessidadesFiltradas = position && necessidades.length > 0
    ? sortByProximity(
        tipoAtivo === null ? necessidades : necessidades.filter(n => n.tipo_elemento === tipoAtivo),
        position.latitude,
        position.longitude
      )
    : tipoAtivo === null ? necessidades : necessidades.filter(n => n.tipo_elemento === tipoAtivo);

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

      {/* Filtros - Tabs aninhadas igual ao desktop */}
      <Tabs value={grupoSelecionado} onValueChange={(v) => setGrupoSelecionado(v as any)} className="mb-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todos">Todos ({contadores.todos})</TabsTrigger>
          <TabsTrigger value="sh">SH ({contadores.sh})</TabsTrigger>
          <TabsTrigger value="sv">SV ({contadores.sv})</TabsTrigger>
          <TabsTrigger value="defensas">Def ({contadores.def})</TabsTrigger>
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
                      <div className="space-y-1">
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">
                            km {nec.km_inicial?.toFixed(3) || '-'}
                          </Badge>
                          {nec.lado && (
                            <Badge variant="outline">
                              {nec.lado}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {nec.distance !== undefined && (
                        <Badge variant={nec.distance <= RAIO_ALERTA ? 'destructive' : 'secondary'}>
                          {nec.distance < 1000 
                            ? `${Math.round(nec.distance)}m` 
                            : `${(nec.distance / 1000).toFixed(2)}km`}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{nec.acao}</p>
                    {nec.descricao_servico && (
                      <p className="text-xs text-muted-foreground">{nec.descricao_servico}</p>
                    )}
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
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {getTipoLabel(nec.tipo_elemento)}
                    </CardTitle>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">
                        km {nec.km_inicial?.toFixed(3) || '-'}
                      </Badge>
                      {nec.lado && (
                        <Badge variant="outline">
                          {nec.lado}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {nec.distance !== undefined && (
                    <Badge variant={nec.distance <= RAIO_ALERTA ? 'destructive' : 'secondary'}>
                      {nec.distance < 1000 
                        ? `${Math.round(nec.distance)}m` 
                        : `${(nec.distance / 1000).toFixed(2)}km`}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{nec.acao}</p>
                {nec.descricao_servico && (
                  <p className="text-xs text-muted-foreground">{nec.descricao_servico}</p>
                )}
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