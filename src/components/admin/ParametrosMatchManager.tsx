// Component para gerenciar parâmetros de matching
// Tarefa 6: API/UI - Parâmetros

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ParamToleranciasMatch, getAllParams } from '@/lib/matchingParams';
import { Save } from 'lucide-react';

export function ParametrosMatchManager() {
  const queryClient = useQueryClient();
  
  const { data: parametros, isLoading } = useQuery({
    queryKey: ['param_tolerancias_match'],
    queryFn: getAllParams
  });
  
  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; valores: Partial<ParamToleranciasMatch> }) => {
      const { error } = await supabase
        .from('param_tolerancias_match' as any)
        .update(params.valores)
        .eq('id', params.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['param_tolerancias_match'] });
      toast.success('Parâmetros atualizados com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar parâmetros:', error);
      toast.error('Erro ao atualizar parâmetros');
    }
  });
  
  const handleUpdate = (id: string, field: string, value: any) => {
    updateMutation.mutate({
      id,
      valores: { [field]: value }
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Parâmetros de Matching</CardTitle>
          <CardDescription>
            Ajuste tolerâncias e atributos por tipo de elemento. Mudanças afetam novas execuções de matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {parametros?.map((param) => (
              <div key={param.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{param.tipo}</h3>
                    <p className="text-sm text-muted-foreground">{param.descricao}</p>
                  </div>
                  <Badge variant={param.classe === 'PONTUAL' ? 'default' : 'secondary'}>
                    {param.classe}
                  </Badge>
                </div>
                
                {param.classe === 'PONTUAL' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`tol_dist_${param.id}`}>
                        Tolerância Match (m)
                      </Label>
                      <Input
                        id={`tol_dist_${param.id}`}
                        type="number"
                        defaultValue={param.tol_dist_m || 0}
                        onBlur={(e) => handleUpdate(param.id, 'tol_dist_m', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Distância máxima para match direto
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`tol_dist_sub_${param.id}`}>
                        Tolerância Substituição (m)
                      </Label>
                      <Input
                        id={`tol_dist_sub_${param.id}`}
                        type="number"
                        defaultValue={param.tol_dist_substituicao_m || 0}
                        onBlur={(e) => handleUpdate(param.id, 'tol_dist_substituicao_m', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Distância máxima para considerar substituição
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`tol_overlap_${param.id}`}>
                        Overlap Match (0-1)
                      </Label>
                      <Input
                        id={`tol_overlap_${param.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        defaultValue={param.tol_overlap_match || 0}
                        onBlur={(e) => handleUpdate(param.id, 'tol_overlap_match', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Sobreposição mínima para match
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`tol_amb_low_${param.id}`}>
                        Ambíguo Min (0-1)
                      </Label>
                      <Input
                        id={`tol_amb_low_${param.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        defaultValue={param.tol_overlap_amb_low || 0}
                        onBlur={(e) => handleUpdate(param.id, 'tol_overlap_amb_low', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Início da faixa duvidosa
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`tol_amb_high_${param.id}`}>
                        Ambíguo Max (0-1)
                      </Label>
                      <Input
                        id={`tol_amb_high_${param.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        defaultValue={param.tol_overlap_amb_high || 0}
                        onBlur={(e) => handleUpdate(param.id, 'tol_overlap_amb_high', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Fim da faixa duvidosa
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Atributos para Match</Label>
                  <div className="flex flex-wrap gap-2">
                    {param.atributos_match.map((attr) => (
                      <Badge key={attr} variant="outline">
                        {attr}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atributos comparados durante o matching
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {updateMutation.isPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Salvando alterações...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
