import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Rodovia {
  id: string;
  codigo: string;
  uf: string;
  tolerancia_match_metros: number | null;
}

const RodoviasManager = () => {
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    uf: "",
    tolerancia_match_metros: "50",
  });

  useEffect(() => {
    loadRodovias();
  }, []);

  const loadRodovias = async () => {
    try {
      const { data, error } = await supabase
        .from("rodovias")
        .select("*")
        .order("codigo");

      if (error) throw error;
      setRodovias(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar rodovias: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("rodovias").insert({
        codigo: formData.codigo,
        uf: formData.uf || null,
        tolerancia_match_metros: formData.tolerancia_match_metros ? parseInt(formData.tolerancia_match_metros) : 50,
      });

      if (error) throw error;

      toast.success("Rodovia cadastrada com sucesso!");
      setFormData({ codigo: "", uf: "", tolerancia_match_metros: "50" });
      loadRodovias();
    } catch (error: any) {
      toast.error("Erro ao cadastrar rodovia: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta rodovia?")) return;

    try {
      // Verifica se há lotes vinculados
      const { data: lotes, error: checkError } = await supabase
        .from("lotes_rodovias")
        .select("id")
        .eq("rodovia_id", id)
        .limit(1);

      if (checkError) throw checkError;

      if (lotes && lotes.length > 0) {
        toast.error("Não é possível excluir: existem lotes vinculados a esta rodovia");
        return;
      }

      const { error } = await supabase.from("rodovias").delete().eq("id", id);

      if (error) throw error;

      toast.success("Rodovia excluída!");
      loadRodovias();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Nova Rodovia</CardTitle>
          <CardDescription>
            Adicione rodovias do programa BR-LEGAL (KMs serão definidos por lote)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>⚠️ Importante: Quando a Tolerância GPS é Aplicada</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>
                <strong>A tolerância de match GPS é aplicada APENAS durante a importação de necessidades.</strong>
              </p>
              <p>
                Alterar este valor aqui NÃO afetará necessidades já importadas. Para reimportar com nova tolerância, 
                você precisará excluir as necessidades antigas e importá-las novamente.
              </p>
            </AlertDescription>
          </Alert>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ex: BR-040"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  value={formData.uf}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                  placeholder="Ex: MG"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tolerancia_match_rodovia">
                  Tolerância Match GPS (m) - Novas Importações
                  <span className="text-xs text-muted-foreground ml-2">
                    (Usado ao importar necessidades. Fallback se lote não especificar)
                  </span>
                </Label>
                <Input
                  id="tolerancia_match_rodovia"
                  type="number"
                  min="10"
                  max="500"
                  step="5"
                  value={formData.tolerancia_match_metros}
                  onChange={(e) => setFormData({ ...formData, tolerancia_match_metros: e.target.value })}
                  placeholder="50"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Rodovia
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rodovias Cadastradas</CardTitle>
          <CardDescription>
            KMs específicos são configurados ao vincular rodovia ao lote. 
            Tolerância GPS é aplicada apenas em novas importações de necessidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Tolerância GPS (m)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Valor usado durante a importação de necessidades. 
                            Alterar não afeta dados já importados.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rodovias.map((rodovia) => (
                <TableRow key={rodovia.id}>
                  <TableCell className="font-medium">{rodovia.codigo}</TableCell>
                  <TableCell>{rodovia.uf || "-"}</TableCell>
                  <TableCell>{rodovia.tolerancia_match_metros || 50}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rodovia.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rodovias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma rodovia cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RodoviasManager;