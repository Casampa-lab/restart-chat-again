import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, ArrowLeft, Search, Navigation, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';

interface NecessidadePlaca {
  id: string;
  rodovia_id: string;
  lote_id: string;
  codigo: string;
  lado: string;
  km_inicial: number;
  latitude_inicial: number | null;
  longitude_inicial: number | null;
  servico: string;
  match_decision: string | null;
  cadastro_id: string | null;
  match_score: number | null;
  reason_code: string | null;
  estado: string | null;
}

// Mapbox public token - deve ser configurado via secrets
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';

const DECISION_COLORS = {
  MATCH_DIRECT: '#22c55e',      // green-500
  SUBSTITUICAO: '#3b82f6',      // blue-500
  MULTIPLE_CANDIDATES: '#f59e0b', // amber-500
  GRAY_ZONE: '#eab308',         // yellow-500
  AMBIGUOUS: '#f97316',         // orange-500
  NO_MATCH: '#ef4444',          // red-500
  null: '#9ca3af'               // gray-400
};

const DECISION_LABELS = {
  MATCH_DIRECT: '✅ Match Direto',
  SUBSTITUICAO: '🔄 Substituição',
  MULTIPLE_CANDIDATES: '⚠️ Múltiplos',
  GRAY_ZONE: '⚠️ Faixa Cinza',
  AMBIGUOUS: '⚠️ Ambíguo',
  NO_MATCH: '❌ Sem Match',
  null: '⏳ Pendente'
};

export default function MapaNecessidadesPlacas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('lote');
  const rodoviaId = searchParams.get('rodovia');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNecessidade, setSelectedNecessidade] = useState<NecessidadePlaca | null>(null);
  const [filterDecision, setFilterDecision] = useState<string>('TODOS');
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  // Fetch necessidades de placas
  const { data: necessidades, isLoading } = useQuery({
    queryKey: ['necessidades-placas-mapa', loteId, rodoviaId],
    queryFn: async () => {
      let query = supabase
        .from('necessidades_placas')
        .select('*')
        .order('km_inicial', { ascending: true });

      if (loteId) query = query.eq('lote_id', loteId);
      if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NecessidadePlaca[];
    },
    enabled: !!(loteId || rodoviaId),
  });

  // Fetch rodovia info para centrar o mapa
  const { data: rodovia } = useQuery({
    queryKey: ['rodovia-info', rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rodovias')
        .select('codigo, uf')
        .eq('id', rodoviaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!rodoviaId,
  });

  // Filtrar necessidades
  const filteredNecessidades = necessidades?.filter(nec => {
    const matchSearch = !searchTerm || 
      nec.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nec.km_inicial?.toString().includes(searchTerm);
    
    const matchDecision = filterDecision === 'TODOS' || 
      (filterDecision === 'PENDENTE' && !nec.match_decision) ||
      nec.match_decision === filterDecision;
    
    return matchSearch && matchDecision;
  }) || [];

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    if (map.current) return; // Já inicializado

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-47.9292, -15.7801], // Centro do Brasil como fallback
      zoom: 6,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    return () => {
      map.current?.remove();
    };
  }, []);

  // Atualizar markers no mapa
  useEffect(() => {
    if (!map.current || !filteredNecessidades?.length) return;

    // Limpar markers existentes
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Calcular bounds para todas as necessidades
    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoords = false;

    // Adicionar markers para necessidades com GPS
    filteredNecessidades.forEach(nec => {
      if (nec.latitude_inicial && nec.longitude_inicial) {
        hasValidCoords = true;
        bounds.extend([nec.longitude_inicial, nec.latitude_inicial]);

        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.backgroundColor = DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null;
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.transition = 'transform 0.2s';
        
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([nec.longitude_inicial, nec.latitude_inicial])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div class="p-2">
                <div class="font-bold">${nec.codigo}</div>
                <div class="text-sm text-gray-600">KM ${nec.km_inicial.toFixed(3)}</div>
                <div class="text-sm">${DECISION_LABELS[nec.match_decision as keyof typeof DECISION_LABELS] || DECISION_LABELS.null}</div>
              </div>
            `)
          )
          .addTo(map.current!);

        marker.getElement().addEventListener('click', () => {
          setSelectedNecessidade(nec);
        });

        markers.current.push(marker);
      }
    });

    // Ajustar zoom para mostrar todos os markers
    if (hasValidCoords && markers.current.length > 0) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 400, right: 50 },
        maxZoom: 14,
      });
    }
  }, [filteredNecessidades]);

  // Scroll para necessidade selecionada
  const handleSelectNecessidade = (nec: NecessidadePlaca) => {
    setSelectedNecessidade(nec);
    
    if (nec.latitude_inicial && nec.longitude_inicial && map.current) {
      map.current.flyTo({
        center: [nec.longitude_inicial, nec.latitude_inicial],
        zoom: 16,
        duration: 1500,
      });
    }
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Token Mapbox não configurado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Para usar o mapa, configure a variável de ambiente VITE_MAPBOX_PUBLIC_TOKEN.
            </p>
            <p className="text-sm text-muted-foreground">
              Obtenha seu token em: <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mapa de Necessidades - Placas</h1>
              {rodovia && (
                <p className="text-sm text-muted-foreground">
                  {rodovia.codigo} - {rodovia.uf}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filteredNecessidades.length} necessidades
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Lista de Necessidades */}
        <div className="w-96 border-r bg-background flex flex-col">
          {/* Filtros */}
          <div className="p-4 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar código ou km..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterDecision} onValueChange={setFilterDecision}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas Decisões</SelectItem>
                <SelectItem value="PENDENTE">⏳ Pendentes</SelectItem>
                <SelectItem value="MATCH_DIRECT">✅ Match Direto</SelectItem>
                <SelectItem value="SUBSTITUICAO">🔄 Substituição</SelectItem>
                <SelectItem value="MULTIPLE_CANDIDATES">⚠️ Múltiplos</SelectItem>
                <SelectItem value="GRAY_ZONE">⚠️ Faixa Cinza</SelectItem>
                <SelectItem value="AMBIGUOUS">⚠️ Ambíguo</SelectItem>
                <SelectItem value="NO_MATCH">❌ Sem Match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Carregando necessidades...
                </div>
              ) : filteredNecessidades.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma necessidade encontrada
                </div>
              ) : (
                filteredNecessidades.map((nec) => (
                  <Card
                    key={nec.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedNecessidade?.id === nec.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectNecessidade(nec)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                              style={{
                                borderColor: DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null,
                                color: DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null,
                              }}
                            >
                              {nec.codigo}
                            </Badge>
                            {nec.cadastro_id && (
                              <LinkIcon className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Navigation className="h-3 w-3" />
                            <span className="font-mono">KM {nec.km_inicial.toFixed(3)}</span>
                            <Separator orientation="vertical" className="h-3" />
                            <span>{nec.lado}</span>
                          </div>
                          
                          {nec.latitude_inicial && nec.longitude_inicial ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="font-mono">
                                {nec.latitude_inicial.toFixed(6)}, {nec.longitude_inicial.toFixed(6)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              <span>Sem coordenadas GPS</span>
                            </div>
                          )}
                        </div>

                        <Badge
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                          style={{
                            borderColor: DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null,
                            backgroundColor: `${DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null}15`,
                          }}
                        >
                          {DECISION_LABELS[nec.match_decision as keyof typeof DECISION_LABELS] || DECISION_LABELS.null}
                        </Badge>
                      </div>

                      {nec.match_score !== null && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            Score: {Math.round(nec.match_score * 100)}%
                            {nec.reason_code && ` • ${nec.reason_code}`}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Legenda */}
          <Card className="absolute bottom-4 right-4 p-4 shadow-lg">
            <div className="space-y-2 text-xs">
              <div className="font-semibold mb-2">Legenda</div>
              {Object.entries(DECISION_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{
                      backgroundColor: DECISION_COLORS[key as keyof typeof DECISION_COLORS],
                    }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Info Necessidade Selecionada */}
          {selectedNecessidade && (
            <Card className="absolute top-4 left-4 right-4 p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="font-mono">
                      {selectedNecessidade.codigo}
                    </Badge>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: DECISION_COLORS[selectedNecessidade.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null,
                        backgroundColor: `${DECISION_COLORS[selectedNecessidade.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null}15`,
                      }}
                    >
                      {DECISION_LABELS[selectedNecessidade.match_decision as keyof typeof DECISION_LABELS] || DECISION_LABELS.null}
                    </Badge>
                    {selectedNecessidade.cadastro_id && (
                      <Badge variant="secondary" className="gap-1">
                        <LinkIcon className="h-3 w-3" />
                        Vinculado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">KM:</span>{' '}
                      <span className="font-mono">{selectedNecessidade.km_inicial.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lado:</span> {selectedNecessidade.lado}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Serviço:</span> {selectedNecessidade.servico}
                    </div>
                    {selectedNecessidade.match_score !== null && (
                      <div>
                        <span className="text-muted-foreground">Score:</span>{' '}
                        {Math.round(selectedNecessidade.match_score * 100)}%
                      </div>
                    )}
                    {selectedNecessidade.reason_code && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Motivo:</span>{' '}
                        {selectedNecessidade.reason_code}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedNecessidade(null)}
                >
                  ×
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
