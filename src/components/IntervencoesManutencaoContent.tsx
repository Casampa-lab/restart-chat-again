import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wrench } from "lucide-react";

export default function IntervencoesManutencaoContent() {
  const { user } = useAuth();

  const { data: manutencoes, isLoading } = useQuery({
    queryKey: ["minhas-manutencoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes_pre_projeto" as any)
        .select(`
          *,
          rodovia:rodovias(codigo),
          lote:lotes(numero)
        `)
        .eq("user_id", user!.id)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-600" />
          Minhas Manutenções IN-3
        </h2>
        <Badge variant="outline" className="border-orange-500 text-orange-700">
          {manutencoes?.length || 0} registros
        </Badge>
      </div>

      {manutencoes?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma manutenção registrada ainda
          </CardContent>
        </Card>
      ) : (
        manutencoes?.map((m) => (
          <Card key={m.id} className="border-orange-200 hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <span>🟠 {m.tipo_elemento}</span>
                    <Badge variant={
                      m.status === 'AUDITADA' ? 'default' :
                      m.status === 'INVALIDADA' ? 'destructive' : 'secondary'
                    }>
                      {m.status}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {m.rodovia?.codigo} • KM {m.km_inicial}
                    {m.km_final && ` - ${m.km_final}`}
                    {m.lado && ` • ${m.lado}`}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatDistanceToNow(new Date(m.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Tipo:</strong> {m.tipo}</p>
                {m.descricao && (
                  <p className="text-muted-foreground">
                    <strong>Obs:</strong> {m.descricao}
                  </p>
                )}
                {m.fotos_depois && m.fotos_depois.length > 0 && (
                  <p className="text-muted-foreground">
                    📸 {m.fotos_depois.length} foto(s)
                  </p>
                )}
                {m.latitude && m.longitude && (
                  <p className="text-xs text-muted-foreground">
                    📍 GPS: {m.latitude.toFixed(6)}°, {m.longitude.toFixed(6)}°
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
