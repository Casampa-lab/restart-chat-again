import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TipoOrigemBadge } from "@/components/TipoOrigemBadge";
import { Search, FileText, Calendar, User, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface AuditoriaRow {
  tipo_elemento: string;
  elemento_id: string;
  identificador: string;
  localizacao_km: number;
  tipo_origem_cadastro: string;
  modificado_por_intervencao: boolean;
  ultima_intervencao_id: string | null;
  data_ultima_modificacao: string | null;
  data_cadastro: string;
  tipo_ultima_intervencao: string | null;
  motivo_intervencao: string | null;
  data_intervencao: string | null;
  aprovado_por: string | null;
  data_aprovacao_coordenador: string | null;
  aprovado_por_nome: string | null;
  rodovia_id: string;
  lote_id: string;
  cadastrado_por: string;
}

const TIPOS_ELEMENTO_LABELS: Record<string, string> = {
  placas: "Placas",
  marcas_longitudinais: "Marcas Longitudinais",
  inscricoes: "Inscrições",
  tachas: "Tachas",
  cilindros: "Cilindros",
  porticos: "Pórticos",
  defensas: "Defensas",
};

export default function AuditoriaInventario() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [origemFiltro, setOrigemFiltro] = useState<string>("todos");

  const { data: auditoria, isLoading } = useQuery({
    queryKey: ["auditoria-inventario", tipoFiltro, origemFiltro],
    queryFn: async () => {
      let query = supabase
        .from("v_auditoria_inventario")
        .select("*")
        .order("data_ultima_modificacao", { ascending: false, nullsFirst: false });

      if (tipoFiltro !== "todos") {
        query = query.eq("tipo_elemento", tipoFiltro);
      }

      if (origemFiltro === "modificados") {
        query = query.eq("modificado_por_intervencao", true);
      } else if (origemFiltro === "originais") {
        query = query.eq("modificado_por_intervencao", false);
      } else if (origemFiltro === "manutencao") {
        query = query.eq("tipo_ultima_intervencao", "manutencao_pre_projeto");
      } else if (origemFiltro === "execucao") {
        query = query.eq("tipo_ultima_intervencao", "execucao");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditoriaRow[];
    },
  });

  const dadosFiltrados = auditoria?.filter((item) => {
    if (!busca) return true;
    const searchLower = busca.toLowerCase();
    return (
      item.identificador?.toLowerCase().includes(searchLower) ||
      item.localizacao_km?.toString().includes(searchLower) ||
      item.aprovado_por_nome?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Início
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Auditoria de Inventário</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Auditoria do Inventário Dinâmico</h1>
        <p className="text-muted-foreground">
          Rastreabilidade completa de todas as alterações no inventário VABLE
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Identificador, KM, Responsável..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Elemento</label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="placas">Placas</SelectItem>
                  <SelectItem value="marcas_longitudinais">Marcas Longitudinais</SelectItem>
                  <SelectItem value="inscricoes">Inscrições</SelectItem>
                  <SelectItem value="tachas">Tachas</SelectItem>
                  <SelectItem value="cilindros">Cilindros</SelectItem>
                  <SelectItem value="porticos">Pórticos</SelectItem>
                  <SelectItem value="defensas">Defensas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Origem da Alteração</label>
              <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Origens</SelectItem>
                  <SelectItem value="originais">⚪ Cadastro Inicial</SelectItem>
                  <SelectItem value="manutencao">🟡 Manutenção Pré-Projeto</SelectItem>
                  <SelectItem value="execucao">🟢 Execução de Projeto</SelectItem>
                  <SelectItem value="modificados">Todos Modificados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
      <span className="text-sm font-medium">Legenda:</span>
      <TipoOrigemBadge origem="execucao" />
      <TipoOrigemBadge origem="manutencao_pre_projeto" />
      <TipoOrigemBadge origem="cadastro_inicial" />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Auditoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registros de Auditoria
          </CardTitle>
          <CardDescription>
            {dadosFiltrados?.length || 0} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dados de auditoria...
            </div>
          ) : dadosFiltrados && dadosFiltrados.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead>Última Modificação</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Aprovado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.map((item) => (
                    <TableRow key={`${item.tipo_elemento}-${item.elemento_id}`}>
                      <TableCell>
                        <TipoOrigemBadge
                          origem={item.tipo_ultima_intervencao}
                          modificadoPorIntervencao={item.modificado_por_intervencao}
                          showLabel={false}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TIPOS_ELEMENTO_LABELS[item.tipo_elemento] || item.tipo_elemento}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.identificador || "—"}
                      </TableCell>
                      <TableCell>KM {item.localizacao_km?.toFixed(3) || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.data_cadastro), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.data_ultima_modificacao ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.data_ultima_modificacao), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{item.motivo_intervencao || "—"}</TableCell>
                      <TableCell>
                        {item.aprovado_por_nome ? (
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            {item.aprovado_por_nome}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado com os filtros selecionados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {dadosFiltrados && dadosFiltrados.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Registros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dadosFiltrados.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cadastro Inicial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dadosFiltrados.filter((r) => !r.modificado_por_intervencao).length}
              </div>
              <p className="text-xs text-muted-foreground">⚪ Originais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Manutenção Pré-Projeto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  dadosFiltrados.filter((r) => r.tipo_ultima_intervencao === "manutencao_pre_projeto")
                    .length
                }
              </div>
              <p className="text-xs text-muted-foreground">🟡 IN 3/2025</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Execução de Projeto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dadosFiltrados.filter((r) => r.tipo_ultima_intervencao === "execucao").length}
              </div>
              <p className="text-xs text-muted-foreground">🟢 Aprovadas</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
