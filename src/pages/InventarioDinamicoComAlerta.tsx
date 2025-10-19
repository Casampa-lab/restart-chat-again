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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [grupoFiltro, setGrupoFiltro] = useState<'todos' | 'sv' | 'sh' | 'defensas'>('sh');
  const [tipoElemento, setTipoElemento] = useState<string>('marcas_longitudinais');

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
            acao: item.acao || item.descricao_servico || 'N/A',
            km_inicial: item.km_inicial,
            lado: item.lado,
            descricao_servico: item.descricao_servico,
            latitude_inicial: item.latitude_inicial,
            longitude_inicial: item.longitude_inicial,
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

  // Determinar qual tipo elemento deve ser exibido baseado no grupo
  const getTipoElementoAtivo = () => {
    if (grupoFiltro === 'todos') return 'todos';
    if (grupoFiltro === 'defensas') return 'defensas';
    return tipoElemento;
  };

  const tipoAtivo = getTipoElementoAtivo();

  const necessidadesFiltradas = position && necessidades.length > 0
    ? sortByProximity(
        tipoAtivo === 'todos' 
          ? necessidades 
          : necessidades.filter(n => n.tipo_elemento === tipoAtivo),
        position.latitude,
        position.longitude
      )
    : necessidades.filter(n => tipoAtivo === 'todos' || n.tipo_elemento === tipoAtivo);

  // Quando mudar de grupo, selecionar o primeiro tipo apropriado
  const handleGrupoChange = (grupo: string) => {
    setGrupoFiltro(grupo as any);
    if (grupo === 'sv') setTipoElemento('placas');
    else if (grupo === 'sh') setTipoElemento('marcas_longitudinais');
    else if (grupo === 'defensas') setTipoElemento('defensas');
  };

  // Calcular estatísticas do tipo selecionado
  const statsAtual = evolucaoGeral?.find((item) => item.tipo_elemento === tipoAtivo);

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

      {/* Filtros - Grupos */}
      <Tabs value={grupoFiltro} onValueChange={handleGrupoChange} className="mb-4">
        <TabsList className="grid grid-cols-4 h-auto">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="sv">🚦 SV</TabsTrigger>
          <TabsTrigger value="sh">➖ SH</TabsTrigger>
          <TabsTrigger value="defensas">🛡️ Def</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Select horizontal discreto - igual ao desktop */}
      {grupoFiltro !== 'todos' && grupoFiltro !== 'defensas' && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
          <Select value={tipoElemento} onValueChange={setTipoElemento}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {grupoFiltro === 'sv' && (
                <>
                  <SelectItem value="placas">🚦 {TIPO_ELEMENTO_LABELS.placas}</SelectItem>
                  <SelectItem value="porticos">🌉 {TIPO_ELEMENTO_LABELS.porticos}</SelectItem>
                </>
              )}
              {grupoFiltro === 'sh' && (
                <>
                  <SelectItem value="marcas_longitudinais">➖ {TIPO_ELEMENTO_LABELS.marcas_longitudinais}</SelectItem>
                  <SelectItem value="inscricoes">📝 {TIPO_ELEMENTO_LABELS.inscricoes}</SelectItem>
                  <SelectItem value="tachas">⚪ {TIPO_ELEMENTO_LABELS.tachas}</SelectItem>
                  <SelectItem value="cilindros">🔵 {TIPO_ELEMENTO_LABELS.cilindros}</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mini Cards de Estatísticas - Grid 2x2 para mobile */}
      {grupoFiltro !== 'todos' && statsAtual && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsAtual.total_elementos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">⚪ Originais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsAtual.originais}</div>
              <p className="text-xs text-muted-foreground">
                {((statsAtual.originais / statsAtual.total_elementos) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">🟡 Manutenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsAtual.manutencao_pre_projeto}</div>
              <p className="text-xs text-muted-foreground">
                {((statsAtual.manutencao_pre_projeto / statsAtual.total_elementos) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">🟢 Execução</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsAtual.execucao_projeto}</div>
              <p className="text-xs text-muted-foreground">
                {((statsAtual.execucao_projeto / statsAtual.total_elementos) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Necessidades */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando necessidades...</p>
          </CardContent>
        </Card>
      ) : necessidadesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhuma necessidade encontrada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
}