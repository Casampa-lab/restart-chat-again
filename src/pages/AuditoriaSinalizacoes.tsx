import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, MapPin, CheckCircle2, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportAuditoriaSinalizacoes } from "@/lib/excelExport";

export default function AuditoriaSinalizacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sinalizacoes, setSinalizacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoAtivo, setTipoAtivo] = useState("todas");
  const [exporting, setExporting] = useState(false);
  const [isAdminOrCoordinator, setIsAdminOrCoordinator] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      console.log("🔍 [AuditoriaSinalizacoes] Verificando permissões...");
      console.log("👤 [AuditoriaSinalizacoes] User:", user);
      
      if (!user) {
        console.log("❌ [AuditoriaSinalizacoes] Sem usuário, redirecionando para /auth");
        navigate("/auth");
        return;
      }

      try {
        console.log("🔎 [AuditoriaSinalizacoes] Buscando roles para user_id:", user.id);
        
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "coordenador"])
          .maybeSingle();

        console.log("📊 [AuditoriaSinalizacoes] Resultado da query:", { data, error });

        if (error) {
          console.error("❌ [AuditoriaSinalizacoes] Erro na query:", error);
          throw error;
        }

        if (!data) {
          console.log("⛔ [AuditoriaSinalizacoes] Sem permissões, redirecionando para /admin");
          toast.error("Acesso negado. Apenas administradores e coordenadores podem acessar esta área.");
          navigate("/admin");
          return;
        }

        console.log("✅ [AuditoriaSinalizacoes] Permissões OK, liberando acesso");
        setIsAdminOrCoordinator(true);
        setCheckingPermissions(false);
      } catch (error: any) {
        console.error('❌ [AuditoriaSinalizacoes] Erro ao verificar permissões:', error);
        toast.error("Erro ao verificar permissões: " + error.message);
        navigate("/admin");
      }
    };

    checkPermissions();
  }, [user, navigate]);

  useEffect(() => {
    if (isAdminOrCoordinator && !checkingPermissions) {
      carregarSinalizacoes();
    }
  }, [isAdminOrCoordinator, checkingPermissions, tipoAtivo]);

  const carregarSinalizacoes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('auditoria_sinalizacoes')
        .select(`
          *,
          sinalizado_por_profile:profiles!auditoria_sinalizacoes_sinalizado_por_fkey(nome),
          resolvido_por_profile:profiles!auditoria_sinalizacoes_resolvido_por_fkey(nome)
        `)
        .order('sinalizado_em', { ascending: false });

      if (tipoAtivo !== 'todas') {
        query = query.eq('tipo_elemento', tipoAtivo);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSinalizacoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar sinalizações:', error);
      toast.error("Erro ao carregar sinalizações");
    } finally {
      setLoading(false);
    }
  };

  const handleResolverSinalizacao = async (id: string, status: 'resolvido' | 'ignorado') => {
    try {
      const { error } = await supabase
        .from('auditoria_sinalizacoes')
        .update({
          status,
          resolvido_por: user?.id,
          resolvido_em: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Sinalização marcada como ${status === 'resolvido' ? 'resolvida' : 'ignorada'}`);
      carregarSinalizacoes();
    } catch (error: any) {
      console.error('Erro ao resolver sinalização:', error);
      toast.error("Erro ao atualizar sinalização");
    }
  };

  const handleExportar = async () => {
    setExporting(true);
    try {
      await exportAuditoriaSinalizacoes({
        tipo_elemento: tipoAtivo !== 'todas' ? tipoAtivo : undefined
      });
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      toast.error("Erro ao exportar relatório");
    } finally {
      setExporting(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      placas: 'Placas',
      marcas_longitudinais: 'Marcas Longitudinais',
      tachas: 'Tachas',
      inscricoes: 'Inscrições',
      cilindros: 'Cilindros',
      porticos: 'Pórticos',
      defensas: 'Defensas',
    };
    return labels[tipo] || tipo;
  };

  const getTipoProblemaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      fora_rodovia: '🗺️ Fora da Rodovia',
      coordenada_errada: '📍 GPS Errado',
      duplicata: '👥 Duplicata',
      outro: '❓ Outro',
    };
    return labels[tipo] || tipo;
  };

  const estatisticas = {
    total: sinalizacoes.length,
    pendentes: sinalizacoes.filter(s => s.status === 'pendente').length,
    resolvidas: sinalizacoes.filter(s => s.status === 'resolvido').length,
    ignoradas: sinalizacoes.filter(s => s.status === 'ignorado').length,
  };

  if (checkingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdminOrCoordinator) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-primary shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Auditoria de Sinalizações GPS</h1>
              <p className="text-sm text-primary-foreground/80">Revisão de marcadores sinalizados como erros</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleExportar}
                disabled={exporting || sinalizacoes.length === 0}
                className="gap-2 bg-background"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exportando...' : 'Exportar Relatório GPS'}
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={() => navigate("/admin")}
                className="font-semibold shadow-md hover:shadow-lg transition-shadow bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{estatisticas.pendentes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resolvidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.resolvidas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ignoradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{estatisticas.ignoradas}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sinalizações por Tipo de Elemento</CardTitle>
            <CardDescription>Filtre e gerencie as sinalizações de erro</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tipoAtivo} onValueChange={setTipoAtivo}>
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="placas">Placas</TabsTrigger>
                <TabsTrigger value="marcas_longitudinais">Marcas</TabsTrigger>
                <TabsTrigger value="tachas">Tachas</TabsTrigger>
                <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
                <TabsTrigger value="cilindros">Cilindros</TabsTrigger>
                <TabsTrigger value="porticos">Pórticos</TabsTrigger>
                <TabsTrigger value="defensas">Defensas</TabsTrigger>
              </TabsList>

              <TabsContent value={tipoAtivo} className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : sinalizacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma sinalização encontrada
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo Elemento</TableHead>
                          <TableHead>Tipo Problema</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Sinalizado Por</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sinalizacoes.map((sinalizacao) => (
                          <TableRow key={sinalizacao.id}>
                            <TableCell className="text-xs">
                              {format(new Date(sinalizacao.sinalizado_em), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getTipoLabel(sinalizacao.tipo_elemento)}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {getTipoProblemaLabel(sinalizacao.tipo_problema)}
                            </TableCell>
                            <TableCell className="text-xs max-w-xs truncate">
                              {sinalizacao.descricao || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {sinalizacao.sinalizado_por_profile?.nome || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {sinalizacao.status === 'pendente' && (
                                <Badge variant="secondary">Pendente</Badge>
                              )}
                              {sinalizacao.status === 'resolvido' && (
                                <Badge variant="default" className="bg-green-600">Resolvido</Badge>
                              )}
                              {sinalizacao.status === 'ignorado' && (
                                <Badge variant="secondary">Ignorado</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {sinalizacao.status === 'pendente' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleResolverSinalizacao(sinalizacao.id, 'resolvido')}
                                      title="Marcar como resolvido"
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleResolverSinalizacao(sinalizacao.id, 'ignorado')}
                                      title="Ignorar"
                                    >
                                      <XCircle className="h-4 w-4 text-gray-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}