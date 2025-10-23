// Component para visualizar relatórios de matching
// Tarefa 6: API/UI - Relatórios

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { formatReasonCode } from '@/lib/triagemService';

interface RelatorioMatchingProps {
  rodoviaId?: string;
  loteId?: string;
}

interface EstatisticasMatching {
  total: number;
  por_decision: Record<string, number>;
  por_tipo: Record<string, number>;
  por_reason: Record<string, number>;
  avg_score: number;
}

export function RelatorioMatching({ rodoviaId, loteId }: RelatorioMatchingProps) {
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['matching_stats', rodoviaId, loteId, tipoFiltro],
    queryFn: async () => {
      const tabelas = tipoFiltro === 'todos' 
        ? [
            'necessidades_placas',
            'necessidades_porticos',
            'necessidades_marcas_transversais',
            'necessidades_marcas_longitudinais',
            'necessidades_tachas',
            'necessidades_defensas',
            'necessidades_cilindros'
          ]
        : [`necessidades_${tipoFiltro}`];
      
      const queries = tabelas.map(async (tabela) => {
        let allData: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          let query = supabase
            .from(tabela as any)
            .select('match_decision, match_score, reason_code, estado')
            .range(offset, offset + pageSize - 1);
          
          if (rodoviaId) query = query.eq('rodovia_id', rodoviaId);
          if (loteId) query = query.eq('lote_id', loteId);
          
          const { data } = await query;
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            offset += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }
        
        return { tabela, data: allData };
      });
      
      const results = await Promise.all(queries);
      const allData = results.flatMap(r => r.data);
      
      const total = allData.length;
      
      const por_decision: Record<string, number> = {};
      const por_tipo: Record<string, number> = {};
      const por_reason: Record<string, number> = {};
      
      let totalScore = 0;
      let countScore = 0;
      
      allData.forEach((item: any) => {
        if (item.match_decision) {
          por_decision[item.match_decision] = (por_decision[item.match_decision] || 0) + 1;
        }
        
        if (item.reason_code) {
          por_reason[item.reason_code] = (por_reason[item.reason_code] || 0) + 1;
        }
        
        if (item.match_score !== null && item.match_score !== undefined) {
          totalScore += item.match_score;
          countScore++;
        }
      });
      
      results.forEach(({ tabela, data }) => {
        const tipo = tabela.replace('necessidades_', '');
        por_tipo[tipo] = data.length;
      });
      
      const avg_score = countScore > 0 ? totalScore / countScore : 0;
      
      return {
        total,
        por_decision,
        por_tipo,
        por_reason,
        avg_score
      } as EstatisticasMatching;
    }
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Relatório de Matching</CardTitle>
          <CardDescription>Nenhuma necessidade processada ainda</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const matchDirect = stats.por_decision['MATCH_DIRECT'] || 0;
  const substituicao = stats.por_decision['SUBSTITUICAO'] || 0;
  const ambiguous = stats.por_decision['AMBIGUOUS'] || 0;
  const noMatch = stats.por_decision['NO_MATCH'] || 0;
  
  const topReasons = Object.entries(stats.por_reason)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Relatório de Matching</CardTitle>
        <CardDescription>
          Estatísticas de matching entre necessidades e inventário
        </CardDescription>
        
        <div className="pt-4">
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="placas">Placas</SelectItem>
              <SelectItem value="porticos">Pórticos</SelectItem>
              <SelectItem value="marcas_transversais">Inscrições</SelectItem>
              <SelectItem value="marcas_longitudinais">Marcas Long.</SelectItem>
              <SelectItem value="tachas">Tachas</SelectItem>
              <SelectItem value="defensas">Defensas</SelectItem>
              <SelectItem value="cilindros">Cilindros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Total */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total de Necessidades</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        
        {/* Decisões de Match */}
        <div className="space-y-4">
          <h3 className="font-semibold">Decisões de Matching</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">Match Direto</Badge>
                  <span className="text-sm text-muted-foreground">
                    {matchDirect} ({((matchDirect / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={(matchDirect / stats.total) * 100} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-600">Substituição</Badge>
                  <span className="text-sm text-muted-foreground">
                    {substituicao} ({((substituicao / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={(substituicao / stats.total) * 100} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-orange-600">Ambíguo</Badge>
                  <span className="text-sm text-muted-foreground">
                    {ambiguous} ({((ambiguous / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={(ambiguous / stats.total) * 100} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Sem Match</Badge>
                  <span className="text-sm text-muted-foreground">
                    {noMatch} ({((noMatch / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={(noMatch / stats.total) * 100} className="h-2" />
            </div>
          </div>
        </div>
        
        {/* Match Score Médio */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Match Score Médio</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold">{(stats.avg_score * 100).toFixed(1)}%</p>
            <Progress value={stats.avg_score * 100} className="flex-1 h-3" />
          </div>
        </div>
        
        {/* Top Reason Codes */}
        <div className="space-y-3">
          <h3 className="font-semibold">Top 5 Reason Codes</h3>
          <div className="space-y-2">
            {topReasons.map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatReasonCode(reason)}</p>
                  <p className="text-xs text-muted-foreground">{reason}</p>
                </div>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
        
        {/* Por Tipo de Elemento */}
        {tipoFiltro === 'todos' && (
          <div className="space-y-3">
            <h3 className="font-semibold">Por Tipo de Elemento</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.por_tipo).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm capitalize">{tipo.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
