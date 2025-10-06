import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
}

const EmpresasManager = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ nome: "", cnpj: "" });

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("nome");

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar empresas: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("empresas").insert({
        nome: formData.nome,
        cnpj: formData.cnpj,
      });

      if (error) throw error;

      toast.success("Empresa cadastrada com sucesso!");
      setFormData({ nome: "", cnpj: "" });
      loadEmpresas();
    } catch (error: any) {
      toast.error("Erro ao cadastrar empresa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;

    try {
      const { error } = await supabase.from("empresas").delete().eq("id", id);

      if (error) throw error;

      toast.success("Empresa excluída!");
      loadEmpresas();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Nova Empresa</CardTitle>
          <CardDescription>Adicione empresas que possuem lotes no programa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Empresa</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Construtora ABC"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Empresa
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((empresa) => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.nome}</TableCell>
                  <TableCell>{empresa.cnpj}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(empresa.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {empresas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma empresa cadastrada
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

export default EmpresasManager;
