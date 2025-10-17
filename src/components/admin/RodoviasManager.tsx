import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Info, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Rodovia {
  id: string;
  codigo: string;
  uf: string;
  tolerancia_match_metros: number | null;
  tolerancia_placas_metros: number | null;
  tolerancia_porticos_metros: number | null;
  tolerancia_defensas_metros: number | null;
  tolerancia_marcas_metros: number | null;
  tolerancia_cilindros_metros: number | null;
  tolerancia_tachas_metros: number | null;
  tolerancia_inscricoes_metros: number | null;
}

const TOLERANCIA_CONFIG = [
  { key: 'tolerancia_placas_metros', icon: '🚏', label: 'Placas', default: 50 },
  { key: 'tolerancia_porticos_metros', icon: '🌉', label: 'Pórticos', default: 200 },
  { key: 'tolerancia_defensas_metros', icon: '🛣️', label: 'Defensas', default: 20 },
  { key: 'tolerancia_marcas_metros', icon: '➖', label: 'Marcas Long.', default: 20 },
  { key: 'tolerancia_cilindros_metros', icon: '🔴', label: 'Cilindros', default: 25 },
  { key: 'tolerancia_tachas_metros', icon: '💎', label: 'Tachas', default: 25 },
  { key: 'tolerancia_inscricoes_metros', icon: '➡️', label: 'Inscrições', default: 30 },
];

const RodoviasManager = () => {
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    uf: "",
    tolerancia_match_metros: "50",
    tolerancia_placas_metros: "50",
    tolerancia_porticos_metros: "200",
    tolerancia_defensas_metros: "20",
    tolerancia_marcas_metros: "20",
    tolerancia_cilindros_metros: "25",
    tolerancia_tachas_metros: "25",
    tolerancia_inscricoes_metros: "30",
  });
  const [bulkTolerance, setBulkTolerance] = useState("25");
  const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);

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
        tolerancia_match_metros: parseInt(formData.tolerancia_match_metros) || 50,
        tolerancia_placas_metros: parseInt(formData.tolerancia_placas_metros) || 50,
        tolerancia_porticos_metros: parseInt(formData.tolerancia_porticos_metros) || 200,
        tolerancia_defensas_metros: parseInt(formData.tolerancia_defensas_metros) || 20,
        tolerancia_marcas_metros: parseInt(formData.tolerancia_marcas_metros) || 20,
        tolerancia_cilindros_metros: parseInt(formData.tolerancia_cilindros_metros) || 25,
        tolerancia_tachas_metros: parseInt(formData.tolerancia_tachas_metros) || 25,
        tolerancia_inscricoes_metros: parseInt(formData.tolerancia_inscricoes_metros) || 30,
      });

      if (error) throw error;

      toast.success("Rodovia cadastrada com sucesso!");
      setFormData({ 
        codigo: "", 
        uf: "", 
        tolerancia_match_metros: "50",
        tolerancia_placas_metros: "50",
        tolerancia_porticos_metros: "200",
        tolerancia_defensas_metros: "20",
        tolerancia_marcas_metros: "20",
        tolerancia_cilindros_metros: "25",
        tolerancia_tachas_metros: "25",
        tolerancia_inscricoes_metros: "30",
      });
      loadRodovias();
    } catch (error: any) {
      toast.error("Erro ao cadastrar rodovia: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  const handleBulkUpdate = async () => {
    if (!bulkTolerance) return;

    const confirmMsg = `Tem certeza que deseja alterar a tolerância GPS de TODAS as ${rodovias.length} rodovias para ${bulkTolerance}m?\n\nIsso só afetará novas importações de necessidades.`;

    if (!confirm(confirmMsg)) return;

    setBulkUpdateLoading(true);
    try {
      const { error } = await supabase
        .from("rodovias")
        .update({ tolerancia_match_metros: parseInt(bulkTolerance) })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      toast.success(`✅ Tolerância atualizada para ${bulkTolerance}m em ${rodovias.length} rodovias!`);
      loadRodovias();
    } catch (error: any) {
      toast.error("Erro na atualização em massa: " + error.message);
    } finally {
      setBulkUpdateLoading(false);
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
            <AlertTitle>⚠️ Importante: Quando as Tolerâncias GPS São Aplicadas</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>
                <strong>As tolerâncias GPS são aplicadas APENAS durante a importação de necessidades.</strong>
              </p>
              <p>
                Alterar os valores aqui NÃO afetará necessidades já importadas. Para reimportar com novas tolerâncias, 
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
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <h3 className="font-medium">Tolerâncias GPS por Tipo de Elemento</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure tolerâncias GPS específicas para cada tipo de elemento da rodovia.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="tol_placas" className="flex items-center gap-1">
                          🚏 Placas (m)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">Elementos pequenos, maior variação GPS esperada</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="tol_placas"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.tolerancia_placas_metros}
                    onChange={(e) => setFormData({ ...formData, tolerancia_placas_metros: e.target.value })}
                    placeholder="50"
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="tol_porticos" className="flex items-center gap-1">
                          🌉 Pórticos (m)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">Estruturas grandes e visíveis, tolera maior imprecisão GPS</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="tol_porticos"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.tolerancia_porticos_metros}
                    onChange={(e) => setFormData({ ...formData, tolerancia_porticos_metros: e.target.value })}
                    placeholder="200"
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="tol_defensas" className="flex items-center gap-1">
                          🛣️ Defensas (m)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">Matching baseado em sobreposição de trechos, GPS é só auxiliar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="tol_defensas"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.tolerancia_defensas_metros}
                    onChange={(e) => setFormData({ ...formData, tolerancia_defensas_metros: e.target.value })}
                    placeholder="20"
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="tol_marcas" className="flex items-center gap-1">
                          ➖ Marcas Long. (m)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">Elementos extensos, fácil localização precisa</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="tol_marcas"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.tolerancia_marcas_metros}
                    onChange={(e) => setFormData({ ...formData, tolerancia_marcas_metros: e.target.value })}
                    placeholder="20"
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="tol_inscricoes" className="flex items-center gap-1">
                          ➡️ Inscrições (m)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">Setas e zebrados, áreas pintadas visíveis</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="tol_inscricoes"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.tolerancia_inscricoes_metros}
                    onChange={(e) => setFormData({ ...formData, tolerancia_inscricoes_metros: e.target.value })}
                    placeholder="30"
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="tol_cilindros" className="flex items-center gap-1">
                          🔴 Cilindros (m)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">Sequências de cilindros, localização por conjunto</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="tol_cilindros"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.tolerancia_cilindros_metros}
                    onChange={(e) => setFormData({ ...formData, tolerancia_cilindros_metros: e.target.value })}
                    placeholder="25"
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="tol_tachas" className="flex items-center gap-1">
                          💎 Tachas (m)
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">Faixas de tachas, localização por trecho</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="tol_tachas"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.tolerancia_tachas_metros}
                    onChange={(e) => setFormData({ ...formData, tolerancia_tachas_metros: e.target.value })}
                    placeholder="25"
                  />
                </div>
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
            kms específicos são configurados ao vincular rodovia ao lote. 
            Novas distâncias de tolerâncias GPS são aplicadas apenas em novas importações de projeto na aba Projetos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rodovia</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rodovias.map((rodovia) => (
                <TableRow key={rodovia.id}>
                  <TableCell>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-medium whitespace-nowrap">
                        {rodovia.codigo}/{rodovia.uf || "N/A"}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex flex-wrap gap-2">
                        {TOLERANCIA_CONFIG.map((config) => {
                          const valor = rodovia[config.key as keyof Rodovia] || config.default;
                          return (
                            <div 
                              key={config.key} 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                            >
                              <span>{config.icon}</span>
                              <span>{valor}m</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(rodovia.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rodovias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
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