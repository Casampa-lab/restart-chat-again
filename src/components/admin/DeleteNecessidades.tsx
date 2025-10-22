import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const TABELAS_NECESSIDADES = [
  { value: "necessidades_cilindros", label: "Cilindros Delimitadores" },
  { value: "necessidades_defensas", label: "Defensas" },
  { value: "necessidades_marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "necessidades_porticos", label: "Pórticos" },
  { value: "necessidades_placas", label: "Placas de Sinalização Vertical" },
  { value: "necessidades_tachas", label: "Tachas Refletivas" },
  { value: "necessidades_marcas_transversais", label: "Inscrições" },
];

interface DeleteNecessidadesProps {
  loteId?: string;
  rodoviaId?: string;
}

export function DeleteNecessidades({ loteId, rodoviaId }: DeleteNecessidadesProps = {}) {
  const [selectedTabela, setSelectedTabela] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!loteId || !rodoviaId) {
      toast.error("Selecione o lote e rodovia no topo da página primeiro");
      return;
    }
    
    if (!selectedTabela) {
      toast.error("Selecione o tipo de necessidade");
      return;
    }

    const { data: lote } = await supabase
      .from("lotes")
      .select("numero")
      .eq("id", loteId)
      .single();

    const { data: rodovia } = await supabase
      .from("rodovias")
      .select("codigo")
      .eq("id", rodoviaId)
      .single();

    const tabelaNome = TABELAS_NECESSIDADES.find(t => t.value === selectedTabela)?.label;

    if (!confirm(
      `Tem certeza que deseja apagar TODAS as necessidades de ${tabelaNome} da ${rodovia?.codigo} do Lote ${lote?.numero}?\n\n` +
      `Esta ação não pode ser desfeita!`
    )) {
      return;
    }

    setDeleting(true);

    try {
      // Buscar quantos registros serão deletados
      toast.info("Contando registros...");
      
      const { count: totalCount, error: countError } = await supabase
        .from(selectedTabela as any)
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId);

      if (countError) throw countError;

      // Deletar reconciliações associadas primeiro
      toast.info("Limpando reconciliações associadas...");
      const { data: necessidadesParaDeletar } = await supabase
        .from(selectedTabela as any)
        .select('id')
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId);

      if (necessidadesParaDeletar && necessidadesParaDeletar.length > 0) {
        const necessidadeIds = necessidadesParaDeletar.map((n: any) => n.id);
        
        await supabase
          .from('reconciliacoes')
          .delete()
          .in('necessidade_id', necessidadeIds);
      }

      // Deletar os registros do banco
      toast.info(`Deletando ${totalCount || 0} registros de necessidades...`);
      const { error: deleteError, count } = await supabase
        .from(selectedTabela as any)
        .delete({ count: 'exact' })
        .eq('lote_id', loteId)
        .eq('rodovia_id', rodoviaId);

      if (deleteError) {
        console.error('Erro ao deletar registros:', deleteError);
        throw deleteError;
      }

      toast.success(`${count} necessidades deletadas com sucesso!`);
      
      // Limpar seleção
      setSelectedTabela("");
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao deletar: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Deletar Dados do Projeto por Lote e Rodovia
        </CardTitle>
        <CardDescription>
          Selecione o lote, rodovia e tipo de serviço do projeto para deletar todos os registros correspondentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tabela">Tipo de Elemento *</Label>
          <Select value={selectedTabela} onValueChange={setSelectedTabela}>
            <SelectTrigger id="tabela">
              <SelectValue placeholder="Selecione o tipo de elemento" />
            </SelectTrigger>
            <SelectContent>
              {TABELAS_NECESSIDADES.map((tabela) => (
                <SelectItem key={tabela.value} value={tabela.value}>
                  {tabela.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleDelete}
          disabled={!loteId || !rodoviaId || !selectedTabela || deleting}
          variant="destructive"
          size="lg"
          className="w-full"
        >
          {deleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deletando...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Deletar Necessidades Selecionadas
            </>
          )}
        </Button>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>⚠️ Atenção:</strong> Esta ação deletará permanentemente todas as necessidades do tipo selecionado
            para o lote e rodovia escolhidos. Use com cuidado!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
