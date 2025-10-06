import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Empresa {
  id: string;
  nome: string;
}

interface Rodovia {
  id: string;
  codigo: string;
  nome: string;
}

interface Lote {
  id: string;
  numero: string;
  contrato: string;
  empresas: { nome: string };
}

const LotesManager = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
  const [selectedRodovias, setSelectedRodovias] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero: "",
    empresa_id: "",
    contrato: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lotesRes, empresasRes, rodoviasRes] = await Promise.all([
        supabase.from("lotes").select("*, empresas(nome)").order("numero"),
        supabase.from("empresas").select("id, nome").order("nome"),
        supabase.from("rodovias").select("id, codigo, nome").order("codigo"),
      ]);

      if (lotesRes.error) throw lotesRes.error;
      if (empresasRes.error) throw empresasRes.error;
      if (rodoviasRes.error) throw rodoviasRes.error;

      setLotes(lotesRes.data || []);
      setEmpresas(empresasRes.data || []);
      setRodovias(rodoviasRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRodovias.length === 0) {
      toast.error("Selecione pelo menos uma rodovia");
      return;
    }

    setLoading(true);

    try {
      // Inserir lote
      const { data: lote, error: loteError } = await supabase
        .from("lotes")
        .insert({
          numero: formData.numero,
          empresa_id: formData.empresa_id,
          contrato: formData.contrato || null,
        })
        .select()
        .single();

      if (loteError) throw loteError;

      // Vincular rodovias ao lote
      const lotesRodovias = selectedRodovias.map((rodoviaId) => ({
        lote_id: lote.id,
        rodovia_id: rodoviaId,
      }));

      const { error: vinculoError } = await supabase
        .from("lotes_rodovias")
        .insert(lotesRodovias);

      if (vinculoError) throw vinculoError;

      toast.success("Lote cadastrado com sucesso!");
      setFormData({ numero: "", empresa_id: "", contrato: "" });
      setSelectedRodovias([]);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao cadastrar lote: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lote?")) return;

    try {
      const { error } = await supabase.from("lotes").delete().eq("id", id);
      if (error) throw error;

      toast.success("Lote excluído!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const toggleRodovia = (rodoviaId: string) => {
    setSelectedRodovias((prev) =>
      prev.includes(rodoviaId)
        ? prev.filter((id) => id !== rodoviaId)
        : [...prev, rodoviaId]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Novo Lote</CardTitle>
          <CardDescription>
            Adicione lotes e vincule às rodovias que ele atende
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número do Lote</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Ex: 01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select
                  value={formData.empresa_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, empresa_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contrato">Número do Contrato (opcional)</Label>
                <Input
                  id="contrato"
                  value={formData.contrato}
                  onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                  placeholder="Ex: 123/2024"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rodovias Atendidas</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {rodovias.map((rodovia) => (
                  <div key={rodovia.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={rodovia.id}
                      checked={selectedRodovias.includes(rodovia.id)}
                      onCheckedChange={() => toggleRodovia(rodovia.id)}
                    />
                    <label
                      htmlFor={rodovia.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {rodovia.codigo} - {rodovia.nome}
                    </label>
                  </div>
                ))}
                {rodovias.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cadastre rodovias primeiro
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Lote
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-medium">{lote.numero}</TableCell>
                  <TableCell>{lote.empresas.nome}</TableCell>
                  <TableCell>{lote.contrato || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(lote.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum lote cadastrado
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

export default LotesManager;
