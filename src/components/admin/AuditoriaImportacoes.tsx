import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSearch, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSession } from "@/hooks/useWorkSession";

interface HistoricoImportacao {
  tipo_elemento: string;
  rodovia_codigo: string;
  lote_numero: string;
  created_at: string;
  total_registros: number;
  is_orfao: boolean; // Se é de lote/rodovia diferente da sessão ativa
}

const TABELAS_NECESSIDADES = [
  { value: "necessidades_placas", label: "Placas" },
  { value: "necessidades_porticos", label: "Pórticos" },
  { value: "necessidades_marcas_transversais", label: "Inscrições" },
  { value: "necessidades_marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "necessidades_tachas", label: "Tachas" },
  { value: "necessidades_defensas", label: "Defensas" },
  { value: "necessidades_cilindros", label: "Cilindros" },
];

export function AuditoriaImportacoes() {
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>("necessidades_placas");

  const { data: historico, isLoading, refetch } = useQuery({
    queryKey: ["auditoria-importacoes", tabelaSelecionada, activeSession?.lote_id, activeSession?.rodovia_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabelaSelecionada as any)
        .select(`
          id,
          rodovia_id,
          lote_id,
          created_at,
          rodovia:rodovias!inner(codigo),
          lote:lotes!inner(numero)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Agrupar por timestamp + rodovia + lote
      const grupos = data.reduce((acc: any, item: any) => {
        const timestamp = new Date(item.created_at).toISOString().split('.')[0]; // Remover milissegundos
        const key = `${timestamp}_${item.rodovia_id}_${item.lote_id}`;
        
        if (!acc[key]) {
          acc[key] = {
            tipo_elemento: tabelaSelecionada.replace("necessidades_", ""),
            rodovia_codigo: item.rodovia?.codigo || "?",
            lote_numero: item.lote?.numero || "?",
            created_at: item.created_at,
            total_registros: 0,
            is_orfao: activeSession 
              ? (item.rodovia_id !== activeSession.rodovia_id || item.lote_id !== activeSession.lote_id)
              : false,
          };
        }
        acc[key].total_registros += 1;
        return acc;
      }, {});

      return Object.values(grupos) as HistoricoImportacao[];
    },
    enabled: !!tabelaSelecionada,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          Auditoria de Importações
        </CardTitle>
        <CardDescription>
          Histórico de importações com detecção de registros "órfãos" (fora do lote/rodovia ativo)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Tipo de Elemento</label>
            <Select value={tabelaSelecionada} onValueChange={setTabelaSelecionada}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABELAS_NECESSIDADES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {activeSession && (
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <strong>Sessão Ativa:</strong> {activeSession.rodovia?.codigo} - Lote {activeSession.lote?.numero}
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Carregando histórico...</p>
        ) : !historico || historico.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhuma importação encontrada</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {historico.map((item, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-3 ${item.is_orfao ? "bg-destructive/10 border-destructive" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.rodovia_codigo}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium">Lote {item.lote_numero}</span>
                      {item.is_orfao && (
                        <Badge variant="destructive" className="text-xs">
                          ÓRFÃO
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.total_registros}</div>
                    <div className="text-xs text-muted-foreground">registros</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
