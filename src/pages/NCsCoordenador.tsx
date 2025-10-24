import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Send, Eye, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AprovacaoNCDialog from "@/components/AprovacaoNCDialog";
import { generateNCPDF } from "@/lib/pdfGenerator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface NaoConformidade {
  id: string;
  numero_nc: string;
  data_ocorrencia: string;
  tipo_nc: string;
  problema_identificado: string;
  situacao: string;
  empresa: string;
  km_referencia: number;
  user_id: string;
  fiscalNome?: string;
  data_notificacao: string | null;
  natureza?: string;
  grau?: string;
  tipo_obra?: string;
  status_aprovacao: string;
  observacao_coordenador: string | null;
  rodovias: {
    codigo: string;
    nome: string;
  };
  lotes: {
    numero: string;
  };
}

interface Lote {
  id: string;
  numero: string;
  empresas: {
    nome: string;
  } | null;
}

const NCsCoordenador = () => {
  const navigate = useNavigate();
  const { navigateBack } = useNavigationContext();
  const [ncs, setNcs] = useState<NaoConformidade[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLote, setSelectedLote] = useState<string>("all");
  const [aprovacaoDialogOpen, setAprovacaoDialogOpen] = useState(false);
  const [ncToApprove, setNcToApprove] = useState<string | null>(null);
  const [tipoAprovacao, setTipoAprovacao] = useState<'aprovar' | 'rejeitar'>('aprovar');

  useEffect(() => {
    checkRole();
    loadLotes();
  }, []);

  useEffect(() => {
    if (selectedLote) {
      loadNCs();
    }
  }, [selectedLote]);

  const checkRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasCoordOrAdminRole = roles?.some(r => 
        r.role === "admin" || r.role === "coordenador"
      );

      if (!hasCoordOrAdminRole) {
        toast.error("Acesso negado: apenas coordenadores e administradores");
        navigate("/");
      }
    } catch (error: any) {
      toast.error("Erro ao verificar permissões");
      navigate("/");
    }
  };

  const loadLotes = async () => {
    try {
      const { data, error } = await supabase
        .from("lotes")
        .select(`
          id,
          numero,
          empresas(nome)
        `)
        .order("numero", { ascending: true });

      if (error) throw error;
      setLotes(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar lotes: " + error.message);
    }
  };

  const loadNCs = async () => {
    try {
      setLoading(true);
      
      // Query principal: buscar NCs enviadas que ainda não foram notificadas
      const ncsQuery = (supabase as any)
        .from("nao_conformidades")
        .select("*")
        .eq("deleted", false)
        .eq("enviado_coordenador", true)
        .is("data_notificacao", null)
        .order("created_at", { ascending: false });

      const finalQuery = selectedLote !== "all" 
        ? ncsQuery.eq("lote_id", selectedLote)
        : ncsQuery;

      const { data, error } = await finalQuery;

      if (error) throw error;
      
      // Buscar dados relacionados
      if (data && data.length > 0) {
        // Buscar rodovias
        const rodoviaIds = [...new Set(data.map((nc: any) => nc.rodovia_id).filter(Boolean))] as string[];
        const { data: rodovias } = await supabase
          .from("rodovias")
          .select("id, codigo")
          .in("id", rodoviaIds);
        const rodoviasMap = new Map(rodovias?.map(r => [r.id, r]) || []);

        // Buscar lotes
        const loteIds = [...new Set(data.map((nc: any) => nc.lote_id).filter(Boolean))] as string[];
        const { data: lotes } = await supabase
          .from("lotes")
          .select("id, numero")
          .in("id", loteIds);
        const lotesMap = new Map(lotes?.map(l => [l.id, l]) || []);

        // Buscar perfis
        const userIds = [...new Set(data.map((nc: any) => nc.user_id).filter(Boolean))] as string[];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", userIds);
        const profilesMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);
        
        const ncsEnriched = data.map((nc: any) => ({
          ...nc,
          rodovias: rodoviasMap.get(nc.rodovia_id),
          lotes: lotesMap.get(nc.lote_id),
          fiscalNome: profilesMap.get(nc.user_id) || "N/A"
        }));
        
        setNcs(ncsEnriched as any);
      } else {
        setNcs([]);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar NCs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case "Atendida": return "bg-green-500";
      case "Não Atendida": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const handleNotificarExecutora = async (ncId: string) => {
    // Verificar se a NC foi aprovada
    const nc = ncs.find(n => n.id === ncId);
    if (nc?.status_aprovacao !== 'aprovado') {
      toast.error("Apenas NCs aprovadas podem ser notificadas à executora");
      return;
    }

    console.log('🚀 Iniciando notificação para NC:', ncId);
    toast.info("Gerando PDF e enviando notificação...");
    
    try {
      console.log('📊 Buscando dados da NC...');
      // Buscar todos os dados necessários para o PDF
      const { data: ncCompleta, error: ncCompletaError } = await supabase
        .from("nao_conformidades")
        .select(`
          *,
          rodovias(codigo, uf),
          lotes(
            numero,
            contrato,
            responsavel_executora,
            email_executora,
            nome_fiscal_execucao,
            email_fiscal_execucao
          )
        `)
        .eq("id", ncId)
        .single();

      console.log('✅ Dados da NC:', ncCompleta);
      console.log('❌ Erro ao buscar NC:', ncCompletaError);

      if (ncCompletaError || !ncCompleta) {
        throw new Error("Erro ao buscar dados da NC: " + ncCompletaError?.message);
      }

      // ✅ VALIDAÇÃO CRÍTICA 1: Verificar lote_id
      if (!ncCompleta.lote_id) {
        console.error('❌ NC sem lote_id:', ncCompleta);
        toast.error("Esta NC não possui um lote associado. Entre em contato com o suporte.");
        return;
      }

      // ✅ VALIDAÇÃO CRÍTICA 2: Verificar dados do lote
      if (!(ncCompleta as any).lotes) {
        console.error('❌ Dados do lote não encontrados:', ncCompleta);
        toast.error("Não foi possível carregar dados do lote. Verifique se o lote está cadastrado corretamente.");
        return;
      }

      // ✅ VALIDAÇÃO CRÍTICA 3: Verificar email da executora
      if (!(ncCompleta as any).lotes?.email_executora) {
        console.error('❌ Email da executora não configurado:', (ncCompleta as any).lotes);
        toast.error("O lote não possui email da executora configurado. Configure no cadastro de lotes.");
        return;
      }

      // Verificar se já foi notificada
      if (ncCompleta.data_notificacao) {
        console.log('⚠️ NC já notificada em:', ncCompleta.data_notificacao);
        toast.warning("Esta NC já foi notificada anteriormente");
        return;
      }

      console.log('📸 Buscando fotos...');
      // Buscar fotos
      const { data: fotos, error: fotosError } = await supabase
        .from("nao_conformidades_fotos")
        .select("*")
        .eq("nc_id", ncId)
        .order("ordem");

      console.log('✅ Fotos encontradas:', fotos?.length || 0);
      if (fotosError) {
        console.error("❌ Erro ao buscar fotos:", fotosError);
      }

      // Buscar dados da supervisora e contrato DA SUPERVISORA
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("supervisora_id")
        .eq("id", user.id)
        .single();

      console.log('🔍 Profile supervisora_id:', profile?.supervisora_id);

      let supervisoraData = { nome_empresa: "Supervisora", contrato: "N/A", logo_url: undefined as string | undefined };
      if (profile?.supervisora_id) {
        const { data: supervisora } = await supabase
          .from("supervisoras")
          .select("nome_empresa, logo_url, contrato")
          .eq("id", profile.supervisora_id)
          .single();
        
        console.log('🏢 Dados da Supervisora da tabela supervisoras:', supervisora);
        
        if (supervisora) {
          supervisoraData.nome_empresa = supervisora.nome_empresa;
          supervisoraData.contrato = supervisora.contrato || "N/A";
          supervisoraData.logo_url = supervisora.logo_url || undefined;
        }
      }

      // Buscar CONTRATO DA EXECUTORA direto da tabela lotes usando o lote_id da NC
      console.log('🔍 Buscando contrato do lote_id:', ncCompleta.lote_id);
      const { data: loteData } = await supabase
        .from("lotes")
        .select("contrato")
        .eq("id", ncCompleta.lote_id)
        .single();

      console.log('📋 Contrato do Lote (Executora) da tabela lotes:', loteData?.contrato);
      const contratoExecutora = loteData?.contrato || (ncCompleta as any).lotes?.contrato || "N/A";

      // Buscar justificativa do elemento pendente se houver
      let justificativa = "";
      const { data: elementoPendente } = await supabase
        .from("elementos_pendentes_aprovacao")
        .select("justificativa")
        .limit(1);
      
      if (elementoPendente && elementoPendente.length > 0 && elementoPendente[0]?.justificativa) {
        justificativa = elementoPendente[0].justificativa;
      }

      // Preparar dados para o PDF
      console.log('📋 ✅ CONTRATOS FINAIS PARA PDF:', {
        contratoSupervisora: supervisoraData.contrato,
        contratoExecutora: contratoExecutora,
        supervisoraNome: supervisoraData.nome_empresa,
        executoraNome: ncCompleta.empresa
      });
      
      const pdfData = {
        numero_nc: ncCompleta.numero_nc,
        data_ocorrencia: ncCompleta.data_ocorrencia,
        tipo_nc: ncCompleta.tipo_nc,
        problema_identificado: ncCompleta.problema_identificado,
        descricao_problema: ncCompleta.descricao_problema || "",
        justificativa: justificativa,
        observacao: ncCompleta.observacao || "",
        km_inicial: ncCompleta.km_inicial,
        km_final: ncCompleta.km_final,
        km_referencia: ncCompleta.km_referencia,
        snv: "N/A",
        rodovia: {
          codigo: (ncCompleta as any).rodovias?.codigo || "N/A",
          uf: (ncCompleta as any).rodovias?.uf || "N/A",
        },
        lote: {
          numero: (ncCompleta as any).lotes?.numero || "N/A",
          contrato: (ncCompleta as any).lotes?.contrato || "N/A",
          responsavel_executora: (ncCompleta as any).lotes?.responsavel_executora || "N/A",
          email_executora: (ncCompleta as any).lotes?.email_executora || "",
          nome_fiscal_execucao: (ncCompleta as any).lotes?.nome_fiscal_execucao || "N/A",
          email_fiscal_execucao: (ncCompleta as any).lotes?.email_fiscal_execucao || "",
        },
        empresa: {
          nome: ncCompleta.empresa,
          contrato_executora: contratoExecutora,
        },
        supervisora: supervisoraData,
        fotos: fotos || [],
        natureza: ncCompleta.natureza || ncCompleta.tipo_nc,
        grau: ncCompleta.grau || "Média",
        tipo_obra: ncCompleta.tipo_obra || "Manutenção",
        comentarios_supervisora: ncCompleta.comentarios_supervisora || "",
        comentarios_executora: ncCompleta.comentarios_executora || "",
      };

      console.log('📄 Gerando PDF...');
      // Gerar PDF
      const blob = await generateNCPDF(pdfData);
      console.log('✅ PDF gerado:', blob.size, 'bytes');
      
      // Converter PDF para base64
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('📧 Enviando email via edge function...');
      // Enviar email com PDF via edge function
      toast.info("Enviando email...");
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        "send-nc-notification",
        {
          body: {
            nc_id: ncId,
            pdf_base64: pdfBase64,
          },
        }
      );

      console.log('✅ Resultado do email:', emailResult);
      console.log('❌ Erro no email:', emailError);

      if (emailError) throw emailError;

      toast.success("Email enviado com sucesso para a executora!");
      loadNCs();

    } catch (error: any) {
      console.error("❌ Erro completo:", error);
      toast.error("Erro ao enviar notificação: " + error.message);
    }
  };

  const getStatusAprovacaoBadge = (statusAprovacao: string) => {
    switch (statusAprovacao) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovada</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    }
  };

  const filteredNCs = ncs;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-8">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">Validação de Não Conformidades</h1>
              <p className="text-sm text-muted-foreground">Coordenador - Aprovar, Rejeitar ou Notificar NCs</p>
            </div>
            <Button variant="outline" onClick={() => navigateBack(navigate)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="shadow-elevated border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardTitle className="text-2xl text-primary">
              Não Conformidades Enviadas
            </CardTitle>
            <CardDescription className="text-base">
              Filtre por lote e gerencie as NCs pendentes de validação
            </CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Filtrar por Lote:</label>
                <Select value={selectedLote} onValueChange={setSelectedLote}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Selecione um lote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Lotes</SelectItem>
                    {lotes.map((lote) => (
                      <SelectItem key={lote.id} value={lote.id}>
                        Lote {lote.numero} - {lote.empresas?.nome || "Sem empresa"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : filteredNCs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma NC encontrada para o filtro selecionado
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número NC</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Fiscal</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Rodovia</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>km</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Grau</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Problema</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNCs.map((nc) => (
                        <TableRow key={nc.id}>
                          <TableCell className="font-medium">{nc.numero_nc}</TableCell>
                          <TableCell>{new Date(nc.data_ocorrencia).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{nc.fiscalNome || "N/A"}</TableCell>
                          <TableCell>{nc.lotes?.numero}</TableCell>
                          <TableCell>{nc.rodovias?.codigo}</TableCell>
                          <TableCell className="text-sm">{nc.empresa}</TableCell>
                          <TableCell>{nc.km_referencia}</TableCell>
                          <TableCell>{nc.tipo_nc}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{(nc as any).grau || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusAprovacaoBadge(nc.status_aprovacao)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {(nc as any).comentarios_supervisora || nc.problema_identificado}
                          </TableCell>
                          <TableCell>
                            <Badge className={getSituacaoColor(nc.situacao)}>
                              {nc.situacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {nc.status_aprovacao === 'pendente' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setNcToApprove(nc.id);
                                      setTipoAprovacao('aprovar');
                                      setAprovacaoDialogOpen(true);
                                    }}
                                    className="gap-1 text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setNcToApprove(nc.id);
                                      setTipoAprovacao('rejeitar');
                                      setAprovacaoDialogOpen(true);
                                    }}
                                    className="gap-1 text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Rejeitar
                                  </Button>
                                </>
                              )}
                              {nc.status_aprovacao === 'aprovado' && (
                                <Button
                                  variant={nc.data_notificacao ? "ghost" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    console.log('🖱️ Botão clicado para NC:', nc.id);
                                    console.log('📋 Dados da NC:', nc);
                                    handleNotificarExecutora(nc.id);
                                  }}
                                  disabled={!!nc.data_notificacao}
                                  className="gap-2"
                                >
                                  <Send className="h-4 w-4" />
                                  {nc.data_notificacao ? "Enviada" : "Notificar"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:contato@operavia.online" className="text-primary hover:underline">contato@operavia.online</a>
            </p>
          </div>
        </div>
      </footer>

      <AprovacaoNCDialog
        ncId={ncToApprove}
        open={aprovacaoDialogOpen}
        onOpenChange={setAprovacaoDialogOpen}
        onApproved={loadNCs}
        tipo={tipoAprovacao}
      />
    </div>
  );
};

export default NCsCoordenador;
