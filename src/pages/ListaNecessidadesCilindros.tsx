import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";

interface NecessidadeCilindro {
  id: string;
  rodovia_id: string;
  lote_id: string;
  lado: string | null;
  km_inicial: number;
  km_final: number;
  descricao: string | null;
  servico: string;
  match_decision: string | null;
  match_score: number | null;
  cadastro_match_id: string | null;
  reconciliado: boolean;
  [key: string]: any; // Para outros campos da tabela
}

const DECISION_COLORS: Record<string, string> = {
  MATCH_DIRECT: "#22c55e",
  SUBSTITUICAO: "#eab308",
  IMPLANTACAO: "#3b82f6",
  MANUTENCAO: "#8b5cf6",
  NAO_ENCONTRADO: "#ef4444",
  MULTIPLOS_CANDIDATOS: "#f97316",
};

const DECISION_LABELS: Record<string, string> = {
  MATCH_DIRECT: "✓ Match Direto",
  SUBSTITUICAO: "↔ Substituição",
  IMPLANTACAO: "+ Implantação",
  MANUTENCAO: "🔧 Manutenção",
  NAO_ENCONTRADO: "✗ Não Encontrado",
  MULTIPLOS_CANDIDATOS: "⚠ Múltiplos",
};

export default function ListaNecessidadesCilindros() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get("lote");
  const rodoviaId = searchParams.get("rodovia");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNecessidade, setSelectedNecessidade] = useState<string | null>(null);
  const [filterDecision, setFilterDecision] = useState<string>("all");

  // Buscar necessidades
  const { data: necessidades = [], isLoading } = useQuery({
    queryKey: ["necessidades-cilindros", loteId, rodoviaId],
    queryFn: async () => {
      let query = supabase
        .from("necessidades_cilindros")
        .select("*")
        .order("km_inicial", { ascending: true });

      if (loteId) {
        query = query.eq("lote_id", loteId);
      }
      if (rodoviaId) {
        query = query.eq("rodovia_id", rodoviaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as NecessidadeCilindro[];
    },
    enabled: !!(loteId || rodoviaId),
  });

  // Buscar rodovia
  const { data: rodovia } = useQuery({
    queryKey: ["rodovia", rodoviaId],
    queryFn: async () => {
      if (!rodoviaId) return null;
      const { data, error } = await supabase
        .from("rodovias")
        .select("codigo")
        .eq("id", rodoviaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!rodoviaId,
  });

  // Filtrar necessidades
  const necessidadesFiltradas = necessidades.filter((n) => {
    const matchesSearch = 
      n.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.lado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.km_inicial.toString().includes(searchTerm);

    const matchesDecision = filterDecision === "all" || n.match_decision === filterDecision;

    return matchesSearch && matchesDecision;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Necessidades de Cilindros</h1>
            {rodovia && (
              <p className="text-muted-foreground mt-1">
                Rodovia: {rodovia.codigo}
              </p>
            )}
          </div>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Card com lista de necessidades */}
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Necessidades ({necessidadesFiltradas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Controles de busca e filtro */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por KM, lado ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterDecision} onValueChange={setFilterDecision}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por decisão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="MATCH_DIRECT">Match Direto</SelectItem>
                  <SelectItem value="SUBSTITUICAO">Substituição</SelectItem>
                  <SelectItem value="IMPLANTACAO">Implantação</SelectItem>
                  <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                  <SelectItem value="NAO_ENCONTRADO">Não Encontrado</SelectItem>
                  <SelectItem value="MULTIPLOS_CANDIDATOS">Múltiplos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lista scrollável de necessidades */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {necessidadesFiltradas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma necessidade encontrada
                </div>
              ) : (
                necessidadesFiltradas.map((necessidade) => (
                  <div
                    key={necessidade.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedNecessidade(necessidade.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Badge de decisão */}
                          {necessidade.match_decision && (
                            <Badge
                              style={{
                                backgroundColor: DECISION_COLORS[necessidade.match_decision] || "#6b7280",
                                color: "white",
                              }}
                            >
                              {DECISION_LABELS[necessidade.match_decision] || necessidade.match_decision}
                            </Badge>
                          )}

                          {/* Badge de vinculação */}
                          {necessidade.cadastro_match_id && (
                            <Badge variant="outline">
                              📎 Vinculado
                            </Badge>
                          )}

                          {/* Badge de reconciliação */}
                          {necessidade.reconciliado && (
                            <Badge variant="secondary">
                              ✓ Reconciliado
                            </Badge>
                          )}

                          {/* Badge de serviço */}
                          <Badge variant="outline">
                            {necessidade.servico}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">KM:</span> {necessidade.km_inicial.toFixed(3)} - {necessidade.km_final.toFixed(3)}
                          </div>
                          <div>
                            <span className="font-medium">Lado:</span> {necessidade.lado}
                          </div>
                          {necessidade.descricao && (
                            <div className="col-span-2">
                              <span className="font-medium">Descrição:</span> {necessidade.descricao}
                            </div>
                          )}
                        </div>

                        {/* Match Score */}
                        {necessidade.match_score !== null && (
                          <div className="text-sm text-muted-foreground">
                            Score: {(necessidade.match_score * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de legenda */}
        <Card>
          <CardHeader>
            <CardTitle>Legenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(DECISION_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: DECISION_COLORS[key] }}
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              As necessidades são vinculadas ao inventário através de matching linear,
              considerando a sobreposição de segmentos e similaridade de atributos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
