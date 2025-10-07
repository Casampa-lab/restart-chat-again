import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  };
}

const NCsCoordenador = () => {
  const navigate = useNavigate();
  const [ncs, setNcs] = useState<NaoConformidade[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLote, setSelectedLote] = useState<string>("all");

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

      const hasCoordOrFiscalRole = roles?.some(r => 
        r.role === "admin"
      );

      if (!hasCoordOrFiscalRole) {
        toast.error("Acesso negado: apenas coordenadores e fiscais");
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
      
      let query = supabase
        .from("nao_conformidades")
        .select(`
          id,
          numero_nc,
          data_ocorrencia,
          tipo_nc,
          problema_identificado,
          situacao,
          empresa,
          km_referencia,
          user_id,
          rodovias(codigo, nome),
          lotes(numero)
        `)
        .eq("deleted", false)
        .eq("enviado_coordenador", true)
        .order("created_at", { ascending: false });

      if (selectedLote !== "all") {
        query = query.eq("lote_id", selectedLote);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Buscar nomes dos fiscais
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(nc => nc.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", userIds);
        
        const profilesMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);
        
        const ncsWithProfiles = data.map(nc => ({
          ...nc,
          fiscalNome: profilesMap.get(nc.user_id) || "N/A"
        }));
        
        setNcs(ncsWithProfiles as any);
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

  const filteredNCs = ncs;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Sistema de Registro de Não Conformidades</h1>
              <p className="text-sm text-muted-foreground">Coordenador/Fiscal - Visualização por Lote</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="navigation" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Não Conformidades por Lote</CardTitle>
              <CardDescription>
                Visualize as NCs enviadas filtradas por lote
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
                        Lote {lote.numero} - {lote.empresas.nome}
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
                        <TableHead>Rodovia</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>KM</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Problema</TableHead>
                        <TableHead>Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNCs.map((nc) => (
                        <TableRow key={nc.id}>
                          <TableCell className="font-medium">{nc.numero_nc}</TableCell>
                          <TableCell>{new Date(nc.data_ocorrencia).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{nc.fiscalNome || "N/A"}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{nc.rodovias?.codigo}</div>
                              <div className="text-xs text-muted-foreground">{nc.rodovias?.nome}</div>
                            </div>
                          </TableCell>
                          <TableCell>{nc.lotes?.numero}</TableCell>
                          <TableCell className="text-sm">{nc.empresa}</TableCell>
                          <TableCell>{nc.km_referencia}</TableCell>
                          <TableCell>{nc.tipo_nc}</TableCell>
                          <TableCell className="max-w-xs truncate">{nc.problema_identificado}</TableCell>
                          <TableCell>
                            <Badge className={getSituacaoColor(nc.situacao)}>
                              {nc.situacao}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-background border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Críticas e sugestões: <a href="mailto:contato@rodoviasuperv.com.br" className="text-primary hover:underline">contato@rodoviasuperv.com.br</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NCsCoordenador;
