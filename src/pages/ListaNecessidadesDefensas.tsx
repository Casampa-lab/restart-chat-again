import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Link as LinkIcon, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';

interface NecessidadeDefensa {
  id: string;
  rodovia_id: string;
  lote_id: string;
  funcao: string;
  lado: string;
  km_inicial: number;
  km_final: number;
  servico: string;
  match_decision: string | null;
  cadastro_id: string | null;
  match_score: number | null;
  reason_code: string | null;
  estado: string | null;
}

const DECISION_COLORS = {
  MATCH_DIRECT: '#22c55e',
  SUBSTITUICAO: '#3b82f6',
  AMBIGUOUS: '#f97316',
  INCERTO: '#eab308',
  NO_MATCH: '#ef4444',
  null: '#9ca3af'
};

const DECISION_LABELS = {
  MATCH_DIRECT: '✅ Match Direto',
  SUBSTITUICAO: '🔄 Substituição',
  AMBIGUOUS: '⚠️ Ambíguo',
  INCERTO: '❓ Incerto',
  NO_MATCH: '❌ Sem Match',
  null: '⏳ Pendente'
};

export default function ListaNecessidadesDefensas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('lote');
  const rodoviaId = searchParams.get('rodovia');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNecessidade, setSelectedNecessidade] = useState<NecessidadeDefensa | null>(null);
  const [filterDecision, setFilterDecision] = useState<string>('TODOS');

  const { data: necessidades, isLoading } = useQuery({
    queryKey: ['necessidades-defensas-lista', loteId, rodoviaId],
    queryFn: async () => {
      let query = supabase
        .from('necessidades_defensas')
        .select('*')
        .order('km_inicial', { ascending: true });

      if (loteId) query = query.eq('lote_id', loteId);
      if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NecessidadeDefensa[];
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

  const necessidadesFiltradas = (necessidades || []).filter(nec => {
    const matchSearch = searchTerm === '' || 
      nec.funcao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nec.lado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nec.km_inicial?.toString().includes(searchTerm);
    
    const matchFilter = filterDecision === 'TODOS' || nec.match_decision === filterDecision;
    
    return matchSearch && matchFilter;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">🛣️ Lista de Necessidades - Defensas Metálicas</h1>
          {rodovia && <p className="text-sm text-muted-foreground">{rodovia.codigo} - {rodovia.uf}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Necessidades ({necessidadesFiltradas.length})</span>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar função, lado ou KM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterDecision} onValueChange={setFilterDecision}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas</SelectItem>
                    <SelectItem value="MATCH_DIRECT">✅ Match Direto</SelectItem>
                    <SelectItem value="SUBSTITUICAO">🔄 Substituição</SelectItem>
                    <SelectItem value="AMBIGUOUS">⚠️ Ambíguo</SelectItem>
                    <SelectItem value="INCERTO">❓ Incerto</SelectItem>
                    <SelectItem value="NO_MATCH">❌ Sem Match</SelectItem>
                    <SelectItem value="null">⏳ Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="p-4">
                <div className="space-y-2">
                  {necessidadesFiltradas.map((nec) => (
                    <div
                      key={nec.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedNecessidade?.id === nec.id 
                          ? 'bg-accent border-primary shadow-md' 
                          : 'hover:bg-accent/50 hover:shadow'
                      }`}
                      onClick={() => setSelectedNecessidade(nec)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              style={{ 
                                backgroundColor: DECISION_COLORS[nec.match_decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.null,
                                color: 'white'
                              }}
                            >
                              {DECISION_LABELS[nec.match_decision as keyof typeof DECISION_LABELS] || DECISION_LABELS.null}
                            </Badge>
                            {nec.cadastro_id && (
                              <Badge variant="outline" className="gap-1">
                                <LinkIcon className="h-3 w-3" />
                                Vinculado
                              </Badge>
                            )}
                            {nec.match_score !== null && (
                              <Badge variant="secondary" className="gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Overlap: {(nec.match_score * 100).toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Função:</span>
                              <p className="font-medium">{nec.funcao}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Lado:</span>
                              <p className="font-medium">{nec.lado}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Serviço:</span>
                              <p className="font-medium">{nec.servico}</p>
                            </div>
                          </div>

                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">KM Inicial:</span>
                              <span className="ml-1 font-mono font-medium">{nec.km_inicial?.toFixed(3)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">KM Final:</span>
                              <span className="ml-1 font-mono font-medium">{nec.km_final?.toFixed(3)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Extensão:</span>
                              <span className="ml-1 font-medium">
                                {((nec.km_final - nec.km_inicial) * 1000).toFixed(0)}m
                              </span>
                            </div>
                          </div>

                          {nec.reason_code && (
                            <p className="text-xs text-muted-foreground">
                              Código: {nec.reason_code}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(DECISION_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DECISION_COLORS[key as keyof typeof DECISION_COLORS] }}
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t space-y-2">
              <h4 className="text-sm font-medium">ℹ️ Sobre o Matching Linear</h4>
              <p className="text-xs text-muted-foreground">
                Para elementos lineares, o matching considera o <strong>overlap</strong> (cobertura) do trecho do projeto sobre o cadastro.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Limiar: 25%</strong> - Overlap mínimo para match direto ou substituição.
              </p>
              <p className="text-xs text-muted-foreground">
                Todas as necessidades são exibidas, ordenadas por KM inicial, independente do overlap.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
