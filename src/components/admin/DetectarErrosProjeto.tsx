import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { detectarErrosProjeto, ResultadoDeteccao } from '@/lib/detectarErrosProjeto';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function DetectarErrosProjeto() {
  const [tipoElemento, setTipoElemento] = useState<string>('cilindros');
  const [rodoviaId, setRodoviaId] = useState<string>('');
  const [loteId, setLoteId] = useState<string>('');
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeteccao | null>(null);

  // Buscar rodovias
  const { data: rodovias } = useQuery({
    queryKey: ['rodovias-deteccao'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rodovias')
        .select('id, codigo')
        .order('codigo');
      return (data || []) as any;
    }
  });

  const handleDetectar = async () => {
    setProcessando(true);
    setResultado(null);

    try {
      toast.info('Detectando erros de projeto...', {
        description: 'Analisando necessidades e cadastro'
      });

      const resultado = await detectarErrosProjeto(
        tipoElemento as any,
        rodoviaId || undefined,
        loteId || undefined
      );

      setResultado(resultado);

      if (resultado.erros_detectados > 0) {
        toast.warning(`${resultado.erros_detectados} erros detectados`, {
          description: `Taxa de erro: ${resultado.taxa_erro}`
        });
      } else {
        toast.success('Nenhum erro detectado', {
          description: 'Todas as necessidades "Implantar" estão OK'
        });
      }
    } catch (error: any) {
      toast.error('Erro ao detectar erros de projeto', {
        description: error.message
      });
      console.error('Erro:', error);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Detectar Erros de Projeto
        </CardTitle>
        <CardDescription>
          Identifica automaticamente necessidades marcadas como "Implantar" que encontram 
          elementos similares já cadastrados (possíveis erros de projeto)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Elemento</label>
            <Select value={tipoElemento} onValueChange={setTipoElemento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cilindros">Cilindros</SelectItem>
                <SelectItem value="placas">Placas</SelectItem>
                <SelectItem value="porticos">Pórticos</SelectItem>
                <SelectItem value="inscricoes">Inscrições</SelectItem>
                <SelectItem value="tachas">Tachas</SelectItem>
                <SelectItem value="marcas_longitudinais">Marcas Longitudinais</SelectItem>
                <SelectItem value="defensas">Defensas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rodovia (opcional)</label>
            <Select value={rodoviaId} onValueChange={setRodoviaId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as rodovias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {rodovias?.map((rodovia: any) => (
                  <SelectItem key={rodovia.id} value={rodovia.id}>
                    {rodovia.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lote (opcional)</label>
            <input
              type="text"
              value={loteId}
              onChange={(e) => setLoteId(e.target.value)}
              placeholder="ID do lote (opcional)"
              className="w-full px-3 py-2 border rounded-md"
              disabled={!rodoviaId}
            />
          </div>
        </div>

        <Button 
          onClick={handleDetectar} 
          disabled={processando}
          className="w-full"
        >
          {processando ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Detectar Erros de Projeto
            </>
          )}
        </Button>

        {resultado && (
          <Alert className={resultado.erros_detectados > 0 ? 'border-orange-500 bg-orange-50' : 'border-green-500 bg-green-50'}>
            {resultado.erros_detectados > 0 ? (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-bold text-lg">
                  {resultado.erros_detectados > 0 ? '⚠️ Erros Detectados' : '✅ Tudo OK'}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Analisadas</div>
                    <div className="text-2xl font-bold">{resultado.necessidades_analisadas}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Erros</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {resultado.erros_detectados}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Taxa</div>
                    <div className="text-2xl font-bold">
                      <Badge variant={resultado.erros_detectados > 0 ? 'destructive' : 'default'}>
                        {resultado.taxa_erro}
                      </Badge>
                    </div>
                  </div>
                </div>
                {resultado.erros_detectados > 0 && (
                  <div className="mt-3 text-xs text-orange-700 bg-orange-100 p-2 rounded">
                    💡 Os erros detectados estão marcados como "PENDENTE_REVISAO" no inventário dinâmico.
                    Usuários verão alertas para decidir se devem "Corrigir para Substituir" ou "Manter como Implantar".
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Como funciona:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Busca necessidades "Implantar" sem decisão do usuário</li>
              <li>Para cada necessidade, verifica se há elementos cadastrados próximos (até 1km para cilindros)</li>
              <li>Compara atributos para determinar se é provável erro de projeto</li>
              <li>Marca como erro se: distância {'<'} 50m OU (distância {'<'} 200m E atributos similares)</li>
              <li>Usuários revisam e decidem: "Corrigir para Substituir" ou "Manter como Implantar"</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
