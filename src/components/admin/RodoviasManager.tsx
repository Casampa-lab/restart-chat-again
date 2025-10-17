import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Info, Pencil, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [editingRodovia, setEditingRodovia] = useState<Rodovia | null>(null);
  const [editFormData, setEditFormData] = useState({
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

  const handleUpdate = async () => {
    if (!editingRodovia) return;

    try {
      const { error } = await supabase
        .from("rodovias")
        .update({
          codigo: editFormData.codigo,
          uf: editFormData.uf || null,
          tolerancia_match_metros: parseInt(editFormData.tolerancia_match_metros) || 50,
          tolerancia_placas_metros: parseInt(editFormData.tolerancia_placas_metros) || 50,
          tolerancia_porticos_metros: parseInt(editFormData.tolerancia_porticos_metros) || 200,
          tolerancia_defensas_metros: parseInt(editFormData.tolerancia_defensas_metros) || 20,
          tolerancia_marcas_metros: parseInt(editFormData.tolerancia_marcas_metros) || 20,
          tolerancia_cilindros_metros: parseInt(editFormData.tolerancia_cilindros_metros) || 25,
          tolerancia_tachas_metros: parseInt(editFormData.tolerancia_tachas_metros) || 25,
          tolerancia_inscricoes_metros: parseInt(editFormData.tolerancia_inscricoes_metros) || 30,
        })
        .eq("id", editingRodovia.id);

      if (error) throw error;

      toast.success("Rodovia atualizada com sucesso!");
      setEditingRodovia(null);
      loadRodovias();
    } catch (error: any) {
      toast.error("Erro ao atualizar rodovia: " + error.message);
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
                  Tolerância Genérica GPS (m)
                  <span className="text-xs text-muted-foreground ml-2">
                    (Fallback quando tipo específico não configurado)
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

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <h3 className="font-medium">Tolerâncias Específicas por Tipo de Elemento</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure tolerâncias GPS individuais para cada tipo. Se não especificado, usa a tolerância genérica acima.
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
            KMs específicos são configurados ao vincular rodovia ao lote. 
            Tolerância GPS é aplicada apenas em novas importações de necessidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <Settings className="h-4 w-4" />
            <AlertTitle>⚡ Atualização Rápida em Massa</AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                Altere a tolerância GPS de <strong>todas as rodovias</strong> de uma vez 
                (útil para corrigir matches excessivos).
              </p>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="bulk-tolerance">Nova Tolerância (metros)</Label>
                  <Input
                    id="bulk-tolerance"
                    type="number"
                    min="10"
                    max="500"
                    step="5"
                    value={bulkTolerance}
                    onChange={(e) => setBulkTolerance(e.target.value)}
                    className="max-w-xs"
                    placeholder="25"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleBulkUpdate}
                  disabled={!bulkTolerance || bulkUpdateLoading}
                  className="border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Aplicar em Todas ({rodovias.length} rodovias)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Lembre-se: isso só afeta <strong>novas importações</strong>. Necessidades 
                já importadas mantêm a tolerância original.
              </p>
            </AlertDescription>
          </Alert>
          
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRodovia(rodovia);
                          setEditFormData({
                            codigo: rodovia.codigo,
                            uf: rodovia.uf || "",
                            tolerancia_match_metros: String(rodovia.tolerancia_match_metros || 50),
                            tolerancia_placas_metros: String(rodovia.tolerancia_placas_metros || 50),
                            tolerancia_porticos_metros: String(rodovia.tolerancia_porticos_metros || 200),
                            tolerancia_defensas_metros: String(rodovia.tolerancia_defensas_metros || 20),
                            tolerancia_marcas_metros: String(rodovia.tolerancia_marcas_metros || 20),
                            tolerancia_cilindros_metros: String(rodovia.tolerancia_cilindros_metros || 25),
                            tolerancia_tachas_metros: String(rodovia.tolerancia_tachas_metros || 25),
                            tolerancia_inscricoes_metros: String(rodovia.tolerancia_inscricoes_metros || 30),
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rodovia.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

      <Dialog open={!!editingRodovia} onOpenChange={(open) => !open && setEditingRodovia(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Rodovia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-codigo">Código da Rodovia *</Label>
                <Input
                  id="edit-codigo"
                  placeholder="BR-101"
                  value={editFormData.codigo}
                  onChange={(e) => setEditFormData({ ...editFormData, codigo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-uf">UF (opcional)</Label>
                <Input
                  id="edit-uf"
                  placeholder="SC"
                  maxLength={2}
                  value={editFormData.uf}
                  onChange={(e) => setEditFormData({ ...editFormData, uf: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-tolerancia">Tolerância Genérica GPS (metros)</Label>
              <Input
                id="edit-tolerancia"
                type="number"
                min="10"
                max="500"
                value={editFormData.tolerancia_match_metros}
                onChange={(e) => setEditFormData({ ...editFormData, tolerancia_match_metros: e.target.value })}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Tolerâncias Específicas por Tipo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-placas">🚏 Placas (m)</Label>
                  <Input
                    id="edit-placas"
                    type="number"
                    min="10"
                    max="300"
                    value={editFormData.tolerancia_placas_metros}
                    onChange={(e) => setEditFormData({ ...editFormData, tolerancia_placas_metros: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-porticos">🌉 Pórticos (m)</Label>
                  <Input
                    id="edit-porticos"
                    type="number"
                    min="10"
                    max="300"
                    value={editFormData.tolerancia_porticos_metros}
                    onChange={(e) => setEditFormData({ ...editFormData, tolerancia_porticos_metros: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-defensas">🛣️ Defensas (m)</Label>
                  <Input
                    id="edit-defensas"
                    type="number"
                    min="10"
                    max="300"
                    value={editFormData.tolerancia_defensas_metros}
                    onChange={(e) => setEditFormData({ ...editFormData, tolerancia_defensas_metros: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-marcas">➖ Marcas Long. (m)</Label>
                  <Input
                    id="edit-marcas"
                    type="number"
                    min="10"
                    max="300"
                    value={editFormData.tolerancia_marcas_metros}
                    onChange={(e) => setEditFormData({ ...editFormData, tolerancia_marcas_metros: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-inscricoes">➡️ Inscrições (m)</Label>
                  <Input
                    id="edit-inscricoes"
                    type="number"
                    min="10"
                    max="300"
                    value={editFormData.tolerancia_inscricoes_metros}
                    onChange={(e) => setEditFormData({ ...editFormData, tolerancia_inscricoes_metros: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-cilindros">🔴 Cilindros (m)</Label>
                  <Input
                    id="edit-cilindros"
                    type="number"
                    min="10"
                    max="300"
                    value={editFormData.tolerancia_cilindros_metros}
                    onChange={(e) => setEditFormData({ ...editFormData, tolerancia_cilindros_metros: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tachas">💎 Tachas (m)</Label>
                  <Input
                    id="edit-tachas"
                    type="number"
                    min="10"
                    max="300"
                    value={editFormData.tolerancia_tachas_metros}
                    onChange={(e) => setEditFormData({ ...editFormData, tolerancia_tachas_metros: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRodovia(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={!editFormData.codigo}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RodoviasManager;