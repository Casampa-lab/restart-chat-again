import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, Plus, Eye } from "lucide-react";
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar intervenções:', {
          tabela: tabelaIntervencao,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      setElementos(data || []);
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

  const renderTipoIdentificacao = (elem: any) => {
    // Renderizar identificação principal do elemento
    if (elem.motivo) return elem.motivo;
    if (elem.codigo) return elem.codigo;
    if (elem.tipo_demarcacao) return elem.tipo_demarcacao;
    if (elem.tipo) return elem.tipo;
    if (elem.tipo_tacha) return elem.tipo_tacha;
    return 'Sem identificação';
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
      <CardContent>
        {elementos.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Nenhum elemento registrado ainda para este tipo.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elementos.map((elem) => (
                  <TableRow key={elem.id}>
                    <TableCell>
                      <Badge variant={tipoOrigem === 'execucao' ? 'default' : 'secondary'}>
                        {renderTipoIdentificacao(elem)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">📍</span>
                        <span>{elem.km_inicial?.toFixed(3) || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {elem.data_intervencao 
                        ? format(new Date(elem.data_intervencao), 'dd/MM/yyyy') 
                        : format(new Date(elem.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={elem.pendente_aprovacao_coordenador ? 'secondary' : 'default'}
                      >
                        {elem.pendente_aprovacao_coordenador ? 'Pendente' : 'Aprovada'}
                      </Badge>
                      {elem.fotos_urls?.length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          📸 {elem.fotos_urls.length}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditarElemento?.(elem)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
