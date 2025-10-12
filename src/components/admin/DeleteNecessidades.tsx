import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const TABELAS_NECESSIDADES = [
  { value: "necessidades_placas", label: "Placas de Sinalização Vertical" },
  { value: "necessidades_marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "necessidades_cilindros", label: "Cilindros Delimitadores" },
  { value: "necessidades_marcas_transversais", label: "Zebrados (Marcas Transversais)" },
  { value: "necessidades_tachas", label: "Tachas Refletivas" },
  { value: "necessidades_porticos", label: "Pórticos" },
  { value: "necessidades_defensas", label: "Defensas" },
];

export function DeleteNecessidades() {
  const [selectedLote, setSelectedLote] = useState<string>("");
  const [selectedRodovia, setSelectedRodovia] = useState<string>("");
  const [selectedTabela, setSelectedTabela] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, numero")
        .order("numero");
      if (error) throw error;
      return data;
    },
  });

  // Buscar rodovias
  const { data: rodovias } = useQuery({
    queryKey: ["rodovias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rodovias")
        .select("id, codigo, nome")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    if (!selectedLote || !selectedRodovia || !selectedTabela) {
      toast.error("Selecione o lote, rodovia e tipo de necessidade");
      return;
    }

    const loteNome = lotes?.find(l => l.id === selectedLote)?.numero;
    const rodoviaNome = rodovias?.find(r => r.id === selectedRodovia)?.codigo;
    const tabelaNome = TABELAS_NECESSIDADES.find(t => t.value === selectedTabela)?.label;

    if (!confirm(
      `Tem certeza que deseja apagar TODAS as necessidades de ${tabelaNome} da ${rodoviaNome} do Lote ${loteNome}?\n\n` +
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
        .eq('lote_id', selectedLote)
        .eq('rodovia_id', selectedRodovia);

      if (countError) throw countError;

      // Deletar os registros do banco
      toast.info(`Deletando ${totalCount || 0} registros de necessidades...`);
      const { error: deleteError, count } = await supabase
        .from(selectedTabela as any)
        .delete({ count: 'exact' })
        .eq('lote_id', selectedLote)
        .eq('rodovia_id', selectedRodovia);

      if (deleteError) {
        console.error('Erro ao deletar registros:', deleteError);
        throw deleteError;
      }

      toast.success(`${count} necessidades deletadas com sucesso!`);
      
      // Limpar seleção
      setSelectedLote("");
      setSelectedRodovia("");
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
          Deletar Necessidades por Lote e Rodovia
        </CardTitle>
        <CardDescription>
          Selecione o lote, rodovia e tipo de necessidade para deletar todos os registros correspondentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lote">Lote *</Label>
            <Select value={selectedLote} onValueChange={setSelectedLote}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes?.map((lote) => (
                  <SelectItem key={lote.id} value={lote.id}>
                    Lote {lote.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rodovia">Rodovia *</Label>
            <Select value={selectedRodovia} onValueChange={setSelectedRodovia}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a rodovia" />
              </SelectTrigger>
              <SelectContent>
                {rodovias?.map((rodovia) => (
                  <SelectItem key={rodovia.id} value={rodovia.id}>
                    {rodovia.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tabela">Tipo de Necessidade *</Label>
            <Select value={selectedTabela} onValueChange={setSelectedTabela}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
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
        </div>

        <Button
          onClick={handleDelete}
          disabled={!selectedLote || !selectedRodovia || !selectedTabela || deleting}
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
