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

interface NecessidadePortico {
  id: string;
  rodovia_id: string;
  lote_id: string;
  tipo: string;
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';

const DECISION_COLORS = {
  MATCH_DIRECT: '#22c55e',
  SUBSTITUICAO: '#3b82f6',
  MULTIPLE_CANDIDATES: '#f59e0b',
  GRAY_ZONE: '#eab308',
  AMBIGUOUS: '#f97316',
  NO_MATCH: '#ef4444',
  null: '#9ca3af'
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

export default function MapaNecessidadesPorticos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('lote');
  const rodoviaId = searchParams.get('rodovia');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNecessidade, setSelectedNecessidade] = useState<NecessidadePortico | null>(null);
  const [filterDecision, setFilterDecision] = useState<string>('TODOS');
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  const { data: necessidades, isLoading } = useQuery({
    queryKey: ['necessidades-porticos-mapa', loteId, rodoviaId],
    queryFn: async () => {
      let query = supabase
        .from('necessidades_porticos')
        .select('*')
        .order('km_inicial', { ascending: true });

      if (loteId) query = query.eq('lote_id', loteId);
      if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NecessidadePortico[];
    },
    enabled: !!(loteId || rodoviaId),
  });

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

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-47.9, -15.8],
      zoom: 8
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Atualizar marcadores
  useEffect(() => {
    if (!map.current || !necessidades) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const necessidadesFiltradas = necessidades.filter(nec => {
      const matchSearch = searchTerm === '' || 
        nec.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nec.km_inicial?.toString().includes(searchTerm);
      
      const matchFilter = filterDecision === 'TODOS' || nec.match_decision === filterDecision;
      
      return matchSearch && matchFilter && nec.latitude_inicial && nec.longitude_inicial;
    });

    if (necessidadesFiltradas.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();

      necessidadesFiltradas.forEach(nec => {
        if (!nec.latitude_inicial || !nec.longitude_inicial) return;

        const color = DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null;
        
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.backgroundColor = color;
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([nec.longitude_inicial, nec.latitude_inicial])
          .addTo(map.current!);

        el.addEventListener('click', () => {
          setSelectedNecessidade(nec);
        });

        markers.current.push(marker);
        bounds.extend([nec.longitude_inicial, nec.latitude_inicial]);
      });

      if (necessidadesFiltradas.length > 0) {
        map.current.fitBounds(bounds, { padding: 50 });
      }
    }
  }, [necessidades, searchTerm, filterDecision]);

  const necessidadesFiltradas = (necessidades || []).filter(nec => {
    const matchSearch = searchTerm === '' || 
      nec.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nec.km_inicial?.toString().includes(searchTerm);
    
    const matchFilter = filterDecision === 'TODOS' || nec.match_decision === filterDecision;
    
    return matchSearch && matchFilter;
  });

  if (!MAPBOX_TOKEN) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <p>Token Mapbox não configurado. Configure VITE_MAPBOX_PUBLIC_TOKEN.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 h-screen flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">🌉 Mapa de Necessidades - Pórticos</h1>
          {rodovia && <p className="text-sm text-muted-foreground">{rodovia.codigo} - {rodovia.uf}</p>}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-0 h-[600px] lg:h-full">
            <div ref={mapContainer} className="w-full h-full rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Necessidades ({necessidadesFiltradas.length})</CardTitle>
            <div className="space-y-2 pt-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tipo ou KM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterDecision} onValueChange={setFilterDecision}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas</SelectItem>
                  <SelectItem value="MATCH_DIRECT">✅ Match Direto</SelectItem>
                  <SelectItem value="SUBSTITUICAO">🔄 Substituição</SelectItem>
                  <SelectItem value="MULTIPLE_CANDIDATES">⚠️ Múltiplos</SelectItem>
                  <SelectItem value="GRAY_ZONE">⚠️ Faixa Cinza</SelectItem>
                  <SelectItem value="AMBIGUOUS">⚠️ Ambíguo</SelectItem>
                  <SelectItem value="NO_MATCH">❌ Sem Match</SelectItem>
                  <SelectItem value="null">⏳ Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] lg:h-[calc(100vh-400px)]">
              <div className="p-4 space-y-2">
                {necessidadesFiltradas.map((nec) => (
                  <div
                    key={nec.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedNecessidade?.id === nec.id ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedNecessidade(nec)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            style={{ 
                              backgroundColor: DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null,
                              color: 'white'
                            }}
                          >
                            {DECISION_LABELS[nec.match_decision as keyof typeof DECISION_LABELS] || DECISION_LABELS.null}
                          </Badge>
                          {nec.cadastro_id && <LinkIcon className="h-3 w-3 text-blue-500" />}
                        </div>
                        <p className="font-medium">{nec.tipo}</p>
                        <p className="text-sm text-muted-foreground">KM {nec.km_inicial?.toFixed(3)}</p>
                        {!nec.latitude_inicial && (
                          <p className="text-xs text-amber-600 mt-1">⚠️ Sem coordenadas GPS</p>
                        )}
                        {nec.match_score !== null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Score: {(nec.match_score * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(DECISION_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: DECISION_COLORS[key as keyof typeof DECISION_COLORS] }}
                />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
