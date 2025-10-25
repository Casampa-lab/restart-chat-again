import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface IntervencoesViewerBaseProps {
  tipoElemento: string;
  tipoOrigem: 'execucao' | 'manutencao_pre_projeto';
  titulo: string;
  tabelaIntervencao: string;
  onEditarElemento?: (elemento: any) => void;
  badgeColor?: string;
  badgeLabel?: string;
  usarJoinExplicito?: boolean;
}

export function IntervencoesViewerBase({
  tipoElemento,
  tipoOrigem,
  titulo,
  tabelaIntervencao,
  onEditarElemento,
  badgeColor = "bg-primary",
  badgeLabel,
  usarJoinExplicito = false
}: IntervencoesViewerBaseProps) {
  const { user } = useAuth();
  const [elementos, setElementos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});

  const carregar = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const selectQuery = usarJoinExplicito
        ? `
            *,
            autor:profiles!${tabelaIntervencao}_user_id_fkey(id, nome, email)
          `
        : '*';

      const { data, error } = await supabase
        .from(tabelaIntervencao as any)
        .select(selectQuery)
        .eq('user_id', user.id)
        .eq('tipo_origem', tipoOrigem)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setElementos(data || []);

      // Carregar lotes e rodovias
      const { data: lotesData } = await supabase.from("lotes").select("id, numero");
      if (lotesData) {
        const lotesMap: Record<string, string> = {};
        lotesData.forEach((lote) => { lotesMap[lote.id] = lote.numero; });
        setLotes(lotesMap);
      }

      const { data: rodoviasData } = await supabase.from("rodovias").select("id, codigo");
      if (rodoviasData) {
        const rodoviasMap: Record<string, string> = {};
        rodoviasData.forEach((rodovia) => { rodoviasMap[rodovia.id] = rodovia.codigo; });
        setRodovias(rodoviasMap);
      }
    } catch (error) {
      console.error('Erro ao carregar elementos:', error);
      toast.error('Erro ao carregar elementos registrados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [user, tipoOrigem]);

  const renderDetalhes = (elem: any) => {
    // Renderizar detalhes específicos baseado no tipo de elemento
    const detalhes: string[] = [];
    
    if (elem.codigo) detalhes.push(`Código: ${elem.codigo}`);
    if (elem.tipo_demarcacao) detalhes.push(`Tipo: ${elem.tipo_demarcacao}`);
    if (elem.tipo) detalhes.push(`Tipo: ${elem.tipo}`);
    if (elem.cor) detalhes.push(`Cor: ${elem.cor}`);
    if (elem.cor_corpo) detalhes.push(`Cor: ${elem.cor_corpo}`);
    if (elem.tipo_tacha) detalhes.push(`Tipo: ${elem.tipo_tacha}`);
    if (elem.quantidade) detalhes.push(`Qtd: ${elem.quantidade}`);
    if (elem.motivo) detalhes.push(`Motivo: ${elem.motivo}`);
    
    return detalhes.join(' • ');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {titulo}
              {badgeLabel && (
                <Badge className={badgeColor}>{badgeLabel}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {elementos.length} registro(s) encontrado(s)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {elementos.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Nenhum elemento registrado ainda para este tipo.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {elementos.map((elem) => (
              <Button
                key={elem.id}
                variant="outline"
                className="w-full justify-start h-auto p-4 hover:bg-accent"
                onClick={() => onEditarElemento?.(elem)}
              >
                <div className="text-left w-full">
                  <div className="font-semibold text-base">
                    {renderDetalhes(elem) || 'Sem identificação'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {elem.autor?.nome && (
                      <>
                        👤 {elem.autor.nome}
                        {' • '}
                      </>
                    )}
                    📍 KM {elem.km_inicial?.toFixed(3)}{elem.km_final ? ` - ${elem.km_final.toFixed(3)}` : ''}
                    {' • '}
                    📅 {elem.data_intervencao ? format(new Date(elem.data_intervencao), 'dd/MM/yyyy') : format(new Date(elem.created_at), 'dd/MM/yyyy')}
                  </div>
                  {elem.observacao && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      💬 {elem.observacao}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {elem.pendente_aprovacao_coordenador !== undefined && (
                      <Badge variant="outline" className={elem.pendente_aprovacao_coordenador ? "bg-yellow-50" : "bg-green-50"}>
                        {elem.pendente_aprovacao_coordenador ? 'Pendente' : 'Aprovada'}
                      </Badge>
                    )}
                    {elem.fotos_urls?.length > 0 && (
                      <Badge variant="secondary">
                        📸 {elem.fotos_urls.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Botão para Adicionar Novo */}
        <Button 
          variant="default"
          className="w-full mt-4"
          onClick={() => onEditarElemento?.(null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Novo
        </Button>
      </CardContent>
    </Card>
  );
}
