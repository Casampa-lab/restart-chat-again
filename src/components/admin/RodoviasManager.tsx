import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
                  Tolerância Match GPS (m)
                  <span className="text-xs text-muted-foreground ml-2">
                    (Fallback se lote não especificar)
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
            KMs específicos são configurados ao vincular rodovia ao lote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Tolerância GPS (m)</TableHead>
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