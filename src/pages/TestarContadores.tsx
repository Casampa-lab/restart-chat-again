import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSession } from '@/hooks/useWorkSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Contadores {
  cadastro_inicial_ativo: number;
  criados_necessidade_ativo: number;
  total_ativo: number;
  cadastro_inicial_inativo: number;
  total_geral: number;
}

export default function TestarContadores() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const [loading, setLoading] = useState(false);
  const [contadores, setContadores] = useState<Record<string, Contadores>>({});
  const [marcoZeroExiste, setMarcoZeroExiste] = useState(false);

  useEffect(() => {
    if (activeSession) {
      carregarContadores();
      verificarMarcoZero();
    }
  }, [activeSession]);

  const verificarMarcoZero = async () => {
    if (!activeSession) return;

    const { data } = await supabase
      .from("marcos_inventario")
      .select("*")
      .eq("lote_id", activeSession.lote_id)
      .eq("rodovia_id", activeSession.rodovia_id)
      .eq("tipo", "marco_zero")
      .maybeSingle();

    setMarcoZeroExiste(!!data);
  };

  const carregarContadores = async () => {
    if (!activeSession) return;

    setLoading(true);
    try {
      const tabelas = [
        { tipo: 'placas', tabela: 'ficha_placa' },
        { tipo: 'marcas_longitudinais', tabela: 'ficha_marcas_longitudinais' },
        { tipo: 'tachas', tabela: 'ficha_tachas' },
        { tipo: 'defensas', tabela: 'defensas' },
        { tipo: 'cilindros', tabela: 'ficha_cilindros' },
        { tipo: 'porticos', tabela: 'ficha_porticos' },
        { tipo: 'inscricoes', tabela: 'ficha_inscricoes' },
      ];

      const novosContadores: Record<string, Contadores> = {};

      for (const { tipo, tabela } of tabelas) {
        // Cadastro inicial ATIVO (AZUL)
        const { count: cadastroAtivo } = await supabase
          .from(tabela as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id)
          .eq('origem', 'cadastro_inicial')
          .eq('ativo', true);

        // Criados por necessidade ATIVOS (ROXO)
        const { count: necessidadeAtivo } = await supabase
          .from(tabela as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id)
          .eq('origem', 'necessidade')
          .eq('ativo', true);

        // Total ATIVO (CYAN - pós-Marco Zero)
        const { count: totalAtivo } = await supabase
          .from(tabela as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id)
          .eq('ativo', true);

        // Cadastro inicial INATIVO (substituídos)
        const { count: cadastroInativo } = await supabase
          .from(tabela as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id)
          .eq('origem', 'cadastro_inicial')
          .eq('ativo', false);

        // Total geral (incluindo inativos)
        const { count: totalGeral } = await supabase
          .from(tabela as any)
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', activeSession.lote_id)
          .eq('rodovia_id', activeSession.rodovia_id);

        novosContadores[tipo] = {
          cadastro_inicial_ativo: cadastroAtivo || 0,
          criados_necessidade_ativo: necessidadeAtivo || 0,
          total_ativo: totalAtivo || 0,
          cadastro_inicial_inativo: cadastroInativo || 0,
          total_geral: totalGeral || 0,
        };
      }

      setContadores(novosContadores);
      toast.success('Contadores atualizados!');
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
      toast.error('Erro ao carregar contadores');
    } finally {
      setLoading(false);
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

  const validarContagem = (cont: Contadores): boolean => {
    // Validação: Total ativo deve ser soma de cadastro_inicial_ativo + criados_necessidade_ativo
    const somaEsperada = cont.cadastro_inicial_ativo + cont.criados_necessidade_ativo;
    return cont.total_ativo === somaEsperada;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">🧪 Testar Contadores</h1>
              {activeSession && (
                <p className="text-sm text-muted-foreground">
                  Lote {activeSession.lote?.numero || '-'} | {activeSession.rodovia?.codigo || '-'}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={carregarContadores}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Status Marco Zero */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {marcoZeroExiste ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Marco Zero Existe
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Marco Zero NÃO Existe
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              {marcoZeroExiste ? (
                <>
                  <p className="text-green-700">
                    ✓ Sistema está em modo <strong>PÓS-MARCO ZERO</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Deve exibir apenas 1 bola: <Badge>CYAN - Total Ativo</Badge>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-yellow-700">
                    ⚠ Sistema está em modo <strong>PRÉ-MARCO ZERO</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Deve exibir 3 bolas: <Badge className="bg-blue-500">AZUL</Badge> <Badge className="bg-purple-500">ROXO</Badge> <Badge className="bg-green-500">VERDE</Badge>
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legenda dos Contadores */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Legenda dos Contadores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <strong>AZUL - Cadastro Inicial Ativo</strong>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  origem='cadastro_inicial' + ativo=true
                </p>
                <p className="text-xs text-muted-foreground pl-6">
                  Diminui quando elemento é substituído por reconciliação
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  <strong>ROXO - Criados por Match</strong>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  origem='necessidade' + ativo=true
                </p>
                <p className="text-xs text-muted-foreground pl-6">
                  Aumenta quando coordenador aprova reconciliação
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
                  <strong>CYAN - Total Ativo (Pós-Marco Zero)</strong>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  ativo=true (qualquer origem)
                </p>
                <p className="text-xs text-muted-foreground pl-6">
                  Soma de AZUL + ROXO + outros ativos
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                  <strong>CINZA - Cadastro Inicial Inativo</strong>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  origem='cadastro_inicial' + ativo=false
                </p>
                <p className="text-xs text-muted-foreground pl-6">
                  Elementos substituídos (não aparecem nos contadores principais)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Contadores */}
        <div className="grid gap-4">
          {Object.entries(contadores).map(([tipo, cont]) => {
            const valido = validarContagem(cont);
            return (
              <Card key={tipo} className={!valido ? 'border-red-500' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{getTipoLabel(tipo)}</span>
                    {!valido && (
                      <Badge variant="destructive">❌ Inconsistente</Badge>
                    )}
                    {valido && (
                      <Badge variant="default" className="bg-green-500">✓ OK</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {cont.cadastro_inicial_ativo}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        🔵 Cadastro<br/>Inicial Ativo
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {cont.criados_necessidade_ativo}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        🟣 Criados<br/>por Match
                      </div>
                    </div>
                    <div className="border-l pl-4">
                      <div className="text-2xl font-bold text-cyan-600">
                        {cont.total_ativo}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        🔷 Total<br/>Ativo
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        (deve ser {cont.cadastro_inicial_ativo + cont.criados_necessidade_ativo})
                      </div>
                    </div>
                    <div className="border-l pl-4">
                      <div className="text-2xl font-bold text-gray-500">
                        {cont.cadastro_inicial_inativo}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ⚫ Substituídos<br/>(inativos)
                      </div>
                    </div>
                    <div className="border-l pl-4">
                      <div className="text-2xl font-bold">
                        {cont.total_geral}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        📊 Total<br/>Geral
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Validação Geral */}
        <Card>
          <CardHeader>
            <CardTitle>✅ Validação Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(contadores).every(([_, cont]) => validarContagem(cont)) ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <strong>Todos os contadores estão consistentes!</strong>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <strong>Há inconsistências nos contadores!</strong>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Validação: Total Ativo = Cadastro Inicial Ativo + Criados por Match Ativo
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
