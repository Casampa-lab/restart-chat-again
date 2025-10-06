import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, MapPin } from "lucide-react";

interface Empresa {
  id: string;
  nome: string;
}

interface Rodovia {
  id: string;
  codigo: string;
}

interface RodoviaComKm {
  rodovia_id: string;
  codigo: string;
  km_inicial: string;
  km_final: string;
}

interface Lote {
  id: string;
  numero: string;
  contrato: string;
  empresas: { nome: string };
}

interface LoteComRodovias extends Lote {
  lotes_rodovias: Array<{
    rodovias: { codigo: string };
    km_inicial: number | null;
    km_final: number | null;
  }>;
}

const LotesManager = () => {
  const [lotes, setLotes] = useState<LoteComRodovias[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
  const [rodoviasVinculadas, setRodoviasVinculadas] = useState<RodoviaComKm[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero: "",
    empresa_id: "",
    contrato: "",
  });
  const [novaRodovia, setNovaRodovia] = useState({
    rodovia_id: "",
    km_inicial: "",
    km_final: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lotesRes, empresasRes, rodoviasRes] = await Promise.all([
        supabase
          .from("lotes")
          .select(`
            *,
            empresas(nome),
            lotes_rodovias(
              rodovias(codigo),
              km_inicial,
              km_final
            )
          `)
          .order("numero"),
        supabase.from("empresas").select("id, nome").order("nome"),
        supabase.from("rodovias").select("id, codigo").order("codigo"),
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

  const adicionarRodovia = () => {
    if (!novaRodovia.rodovia_id) {
      toast.error("Selecione uma rodovia");
      return;
    }

    const rodoviaExistente = rodoviasVinculadas.find(
      (r) => r.rodovia_id === novaRodovia.rodovia_id
    );
    if (rodoviaExistente) {
      toast.error("Esta rodovia já foi adicionada");
      return;
    }

    const rodovia = rodovias.find((r) => r.id === novaRodovia.rodovia_id);
    if (!rodovia) return;

    setRodoviasVinculadas([
      ...rodoviasVinculadas,
      {
        rodovia_id: novaRodovia.rodovia_id,
        codigo: rodovia.codigo,
        km_inicial: novaRodovia.km_inicial,
        km_final: novaRodovia.km_final,
      },
    ]);

    setNovaRodovia({ rodovia_id: "", km_inicial: "", km_final: "" });
  };

  const removerRodovia = (rodoviaId: string) => {
    setRodoviasVinculadas(rodoviasVinculadas.filter((r) => r.rodovia_id !== rodoviaId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rodoviasVinculadas.length === 0) {
      toast.error("Adicione pelo menos uma rodovia ao lote");
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

      // Vincular rodovias com KMs
      const lotesRodovias = rodoviasVinculadas.map((rodovia) => ({
        lote_id: lote.id,
        rodovia_id: rodovia.rodovia_id,
        km_inicial: rodovia.km_inicial ? parseFloat(rodovia.km_inicial) : null,
        km_final: rodovia.km_final ? parseFloat(rodovia.km_final) : null,
      }));

      const { error: vinculoError } = await supabase
        .from("lotes_rodovias")
        .insert(lotesRodovias);

      if (vinculoError) throw vinculoError;

      toast.success("Lote cadastrado com sucesso!");
      setFormData({ numero: "", empresa_id: "", contrato: "" });
      setRodoviasVinculadas([]);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Novo Lote</CardTitle>
          <CardDescription>
            Configure o lote com empresa e rodovias com seus KMs específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados básicos do lote */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número do Lote *</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Ex: 01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa *</Label>
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
                <Label htmlFor="contrato">Número do Contrato</Label>
                <Input
                  id="contrato"
                  value={formData.contrato}
                  onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                  placeholder="Ex: 123/2024"
                />
              </div>
            </div>

            {/* Adicionar rodovias */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Rodovias do Lote
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rodovia">Rodovia</Label>
                  <Select
                    value={novaRodovia.rodovia_id}
                    onValueChange={(value) =>
                      setNovaRodovia({ ...novaRodovia, rodovia_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {rodovias
                        .filter(
                          (r) => !rodoviasVinculadas.find((rv) => rv.rodovia_id === r.id)
                        )
                        .map((rodovia) => (
                          <SelectItem key={rodovia.id} value={rodovia.id}>
                            {rodovia.codigo}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="km_inicial">KM Inicial</Label>
                  <Input
                    id="km_inicial"
                    type="number"
                    step="0.001"
                    placeholder="Ex: 100.000"
                    value={novaRodovia.km_inicial}
                    onChange={(e) =>
                      setNovaRodovia({ ...novaRodovia, km_inicial: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="km_final">KM Final</Label>
                  <Input
                    id="km_final"
                    type="number"
                    step="0.001"
                    placeholder="Ex: 200.000"
                    value={novaRodovia.km_final}
                    onChange={(e) =>
                      setNovaRodovia({ ...novaRodovia, km_final: e.target.value })
                    }
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={adicionarRodovia}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Lista de rodovias adicionadas */}
              {rodoviasVinculadas.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Rodovias Adicionadas:</Label>
                  <div className="space-y-2">
                    {rodoviasVinculadas.map((rodovia) => (
                      <div
                        key={rodovia.rodovia_id}
                        className="flex items-center justify-between p-3 bg-background rounded border"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{rodovia.codigo}</Badge>
                          <span className="text-sm text-muted-foreground">
                            KM {rodovia.km_inicial || "?"} - {rodovia.km_final || "?"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerRodovia(rodovia.rodovia_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Cadastrar Lote
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de lotes cadastrados */}
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
                <TableHead>Rodovias</TableHead>
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
                    <div className="flex flex-wrap gap-1">
                      {lote.lotes_rodovias.map((lr, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {lr.rodovias.codigo}
                          {(lr.km_inicial || lr.km_final) && (
                            <span className="ml-1 opacity-70">
                              ({lr.km_inicial?.toFixed(0)}-{lr.km_final?.toFixed(0)})
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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