import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { matchPontual, matchLinear, buildLineStringWKT, MatchResult } from '@/lib/matchingService';
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type TipoElemento = 'PLACA' | 'PORTICO' | 'INSCRICAO' | 'MARCA_LONG' | 'TACHAS' | 'DEFENSA' | 'CILINDRO' | 'TODOS';

export function ExecutarMatching() {
  const { toast } = useToast();
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoElemento>('TODOS');
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    processados: 0,
    matches: 0,
    substituicoes: 0,
    ambiguos: 0,
    semMatch: 0,
    erros: 0
  });

  const executarMatching = async () => {
    setExecutando(true);
    setProgresso(0);
    setEstatisticas({
      total: 0,
      processados: 0,
      matches: 0,
      substituicoes: 0,
      ambiguos: 0,
      semMatch: 0,
      erros: 0
    });

    try {
      // Buscar necessidades sem matching
      const tipos = tipoSelecionado === 'TODOS' 
        ? ['PLACA', 'PORTICO', 'INSCRICAO', 'MARCA_LONG', 'TACHAS', 'DEFENSA', 'CILINDRO']
        : [tipoSelecionado];

      let totalNecessidades = 0;
      let processados = 0;
      const stats = { matches: 0, substituicoes: 0, ambiguos: 0, semMatch: 0, erros: 0 };

      for (const tipo of tipos) {
        // Buscar necessidades do tipo específico que não foram matchadas ainda
        const { data: necessidades, error } = await supabase
          .from(`necessidades_${tipo.toLowerCase()}` as any)
          .select('*')
          .is('match_decision', null)
          .limit(1000);

        if (error) {
          console.error(`Erro ao buscar necessidades ${tipo}:`, error);
          continue;
        }

        if (!necessidades || necessidades.length === 0) continue;

        totalNecessidades += necessidades.length;
        setEstatisticas(prev => ({ ...prev, total: totalNecessidades }));

        // Processar cada necessidade
        for (const nec of (necessidades as any[])) {
          try {
            let matchResult: MatchResult;
            
            // Elementos pontuais
            if (['PLACA', 'PORTICO', 'INSCRICAO'].includes(tipo)) {
              // Extrair atributos relevantes
              const atributos: Record<string, any> = {};
              if (tipo === 'PLACA') {
                atributos.codigo = nec.codigo;
                atributos.lado = nec.lado;
              } else if (tipo === 'PORTICO') {
                atributos.tipo = nec.tipo;
              } else if (tipo === 'INSCRICAO') {
                atributos.tipo = nec.tipo;
                atributos.cor = nec.cor;
              }

              matchResult = await matchPontual(
                tipo as any,
                nec.latitude,
                nec.longitude,
                nec.rodovia_id,
                atributos,
                nec.servico || 'Substituição'
              );
            } 
            // Elementos lineares
            else {
              const atributos: Record<string, any> = {};
              if (tipo === 'MARCA_LONG') {
                atributos.cor = nec.cor;
                atributos.tipo = nec.tipo;
              } else if (tipo === 'TACHAS') {
                atributos.cor = nec.cor;
              } else if (tipo === 'DEFENSA') {
                atributos.tipo = nec.tipo;
              } else if (tipo === 'CILINDRO') {
                atributos.tipo = nec.tipo;
              }

              const wkt = buildLineStringWKT(
                nec.latitude_ini,
                nec.longitude_ini,
                nec.latitude_fim,
                nec.longitude_fim
              );

              matchResult = await matchLinear(
                tipo as any,
                wkt,
                nec.rodovia_id,
                atributos,
                nec.servico || 'Substituição'
              );
            }

            // Atualizar necessidade com resultado do match
            const { error: updateError } = await supabase
              .from(`necessidades_${tipo.toLowerCase()}` as any)
              .update({
                cadastro_id: matchResult.cadastro_id,
                match_decision: matchResult.decision,
                match_score: matchResult.match_score,
                reason_code: matchResult.reason_code,
                estado: matchResult.decision === 'MATCH_DIRECT' || matchResult.decision === 'SUBSTITUICAO' 
                  ? 'ATIVO' 
                  : 'PROPOSTO'
              })
              .eq('id', nec.id);

            if (updateError) {
              console.error(`Erro ao atualizar necessidade ${nec.id}:`, updateError);
              stats.erros++;
            } else {
              // Atualizar estatísticas
              if (matchResult.decision === 'MATCH_DIRECT') stats.matches++;
              else if (matchResult.decision === 'SUBSTITUICAO') stats.substituicoes++;
              else if (matchResult.decision === 'AMBIGUOUS') stats.ambiguos++;
              else if (matchResult.decision === 'NO_MATCH') stats.semMatch++;
            }

          } catch (err) {
            console.error(`Erro ao processar necessidade ${nec.id}:`, err);
            stats.erros++;
          }

          processados++;
          setProgresso((processados / totalNecessidades) * 100);
          setEstatisticas(prev => ({
            ...prev,
            processados,
            ...stats
          }));
        }
      }

      toast({
        title: "Matching concluído",
        description: `Processadas ${processados} necessidades. ${stats.matches} matches diretos, ${stats.substituicoes} substituições.`
      });

    } catch (error) {
      console.error('Erro ao executar matching:', error);
      toast({
        title: "Erro ao executar matching",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setExecutando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Executar Matching
        </CardTitle>
        <CardDescription>
          Execute o algoritmo de matching para associar necessidades ao inventário cadastrado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Elemento</label>
          <Select
            value={tipoSelecionado}
            onValueChange={(value) => setTipoSelecionado(value as TipoElemento)}
            disabled={executando}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Tipos</SelectItem>
              <SelectItem value="PLACA">Placas</SelectItem>
              <SelectItem value="PORTICO">Pórticos</SelectItem>
              <SelectItem value="INSCRICAO">Inscrições</SelectItem>
              <SelectItem value="MARCA_LONG">Marcas Longitudinais</SelectItem>
              <SelectItem value="TACHAS">Tachas</SelectItem>
              <SelectItem value="DEFENSA">Defensas</SelectItem>
              <SelectItem value="CILINDRO">Cilindros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={executarMatching}
          disabled={executando}
          className="w-full"
          size="lg"
        >
          {executando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Executar Matching
            </>
          )}
        </Button>

        {executando && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(progresso)}%</span>
            </div>
            <Progress value={progresso} />
            <p className="text-sm text-muted-foreground">
              {estatisticas.processados} de {estatisticas.total} processados
            </p>
          </div>
        )}

        {estatisticas.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total</p>
              <p className="text-2xl font-bold">{estatisticas.total}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-sm font-medium">Matches</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{estatisticas.matches}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Substituições</p>
              <p className="text-2xl font-bold text-blue-600">{estatisticas.substituicoes}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Ambíguos</p>
              <p className="text-2xl font-bold text-yellow-600">{estatisticas.ambiguos}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Sem Match</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{estatisticas.semMatch}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Erros</p>
              <p className="text-2xl font-bold text-destructive">{estatisticas.erros}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}