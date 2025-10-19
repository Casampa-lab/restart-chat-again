import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function RemoverDuplicatasNecessidades() {
  const [removendo, setRemovendo] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  const removerDuplicatas = async () => {
    if (!confirm("⚠️ ATENÇÃO! Isso vai remover TODAS as duplicatas de necessidades, mantendo apenas o registro mais antigo de cada grupo. Continuar?")) {
      return;
    }

    setRemovendo(true);
    const statsLocal: Record<string, number> = {};

    try {
      const tabelas = [
        { nome: 'necessidades_marcas_longitudinais', label: 'Marcas Longitudinais' },
        { nome: 'necessidades_marcas_transversais', label: 'Marcas Transversais' },
        { nome: 'necessidades_tachas', label: 'Tachas' },
        { nome: 'necessidades_cilindros', label: 'Cilindros' },
        { nome: 'necessidades_placas', label: 'Placas' },
        { nome: 'necessidades_porticos', label: 'Pórticos' },
        { nome: 'necessidades_defensas', label: 'Defensas' },
      ];

      for (const { nome, label } of tabelas) {
        console.log(`🔍 Processando ${label}...`);
        
        const result = await supabase.rpc('remover_duplicatas_necessidades' as any, {
          p_tabela: nome
        });
        const { data, error } = result as { data: number | null; error: any };

        if (error) {
          console.error(`❌ Erro em ${label}:`, error);
          toast.error(`Erro ao processar ${label}: ${error.message}`);
        } else {
          const removidas = data ?? 0;
          statsLocal[label] = removidas;
          
          if (removidas > 0) {
            console.log(`✅ ${label}: ${removidas} duplicatas removidas`);
            toast.success(`${label}: ${removidas} duplicatas removidas`);
          } else {
            console.log(`✅ ${label}: Sem duplicatas`);
          }
        }
      }

      setStats(statsLocal);
      
      const totalRemovidas = Object.values(statsLocal).reduce((a, b) => a + b, 0);
      if (totalRemovidas > 0) {
        toast.success(`✅ Limpeza concluída! ${totalRemovidas} duplicatas removidas no total.`);
      } else {
        toast.info("✅ Nenhuma duplicata encontrada!");
      }
    } catch (error: any) {
      console.error("Erro na limpeza:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧹 Remover Duplicatas de Necessidades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Esta ferramenta remove registros duplicados de todas as tabelas de necessidades.</p>
          <p className="mt-2">
            <strong>Critério:</strong> Mantém o registro mais antigo (menor created_at/id) de cada grupo de duplicatas.
          </p>
        </div>

        <Button
          onClick={removerDuplicatas}
          disabled={removendo}
          variant="destructive"
          className="w-full"
        >
          {removendo ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Removendo duplicatas...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Todas as Duplicatas
            </>
          )}
        </Button>

        {Object.keys(stats).length > 0 && (
          <div className="mt-4 space-y-2 text-sm border-t pt-4">
            <strong>📊 Resultados da Limpeza:</strong>
            {Object.entries(stats).map(([tabela, count]) => (
              <div key={tabela} className="flex justify-between">
                <span>{tabela}:</span>
                <strong className={count > 0 ? "text-destructive" : "text-muted-foreground"}>
                  {count} removidas
                </strong>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-destructive">
                {Object.values(stats).reduce((a, b) => a + b, 0)} removidas
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
