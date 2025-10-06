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
  nome: string;
  uf: string;
  km_inicial: number;
  km_final: number;
}

const RodoviasManager = () => {
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    uf: "",
    km_inicial: "",
    km_final: "",
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
        nome: formData.nome,
        uf: formData.uf || null,
        km_inicial: formData.km_inicial ? parseFloat(formData.km_inicial) : null,
        km_final: formData.km_final ? parseFloat(formData.km_final) : null,
      });

      if (error) throw error;

      toast.success("Rodovia cadastrada com sucesso!");
      setFormData({ codigo: "", nome: "", uf: "", km_inicial: "", km_final: "" });
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
          <CardDescription>Adicione rodovias do programa BR-LEGAL</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ex: BR-040"
                  required
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Rodovia Washington Luís"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="km_inicial">KM Inicial</Label>
                <Input
                  id="km_inicial"
                  type="number"
                  step="0.001"
                  value={formData.km_inicial}
                  onChange={(e) => setFormData({ ...formData, km_inicial: e.target.value })}
                  placeholder="Ex: 0.000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="km_final">KM Final</Label>
                <Input
                  id="km_final"
                  type="number"
                  step="0.001"
                  value={formData.km_final}
                  onChange={(e) => setFormData({ ...formData, km_final: e.target.value })}
                  placeholder="Ex: 150.000"
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>KM Inicial</TableHead>
                <TableHead>KM Final</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rodovias.map((rodovia) => (
                <TableRow key={rodovia.id}>
                  <TableCell className="font-medium">{rodovia.codigo}</TableCell>
                  <TableCell>{rodovia.nome}</TableCell>
                  <TableCell>{rodovia.uf || "-"}</TableCell>
                  <TableCell>{rodovia.km_inicial?.toFixed(3) || "-"}</TableCell>
                  <TableCell>{rodovia.km_final?.toFixed(3) || "-"}</TableCell>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
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
