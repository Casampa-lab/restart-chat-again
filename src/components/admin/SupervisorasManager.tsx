import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Building2, Upload, Copy, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Supervisora {
  id: string;
  nome_empresa: string;
  contrato: string | null;
  logo_url: string | null;
  logo_orgao_fiscalizador_url: string | null;
  usar_logo_customizado: boolean;
  usar_logo_orgao_relatorios: boolean;
  codigo_convite: string | null;
  created_at: string;
}

export const SupervisorasManager = () => {
  const [supervisoras, setSupervisoras] = useState<Supervisora[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupervisora, setEditingSupervisora] = useState<Supervisora | null>(null);
  const [formData, setFormData] = useState({
    nome_empresa: "",
    contrato: "",
    usar_logo_customizado: false,
    usar_logo_orgao_relatorios: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoOrgaoFile, setLogoOrgaoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSupervisoras();
  }, []);

  const loadSupervisoras = async () => {
    try {
      const { data, error } = await supabase
        .from("supervisoras")
        .select("*")
        .order("nome_empresa");

      if (error) throw error;
      setSupervisoras(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar supervisoras: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado!");
  };

  const handleGerarNovoCodigo = async (id: string, nome: string) => {
    if (!confirm(`Gerar novo código de convite para "${nome}"? O código anterior ficará inválido.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc("generate_codigo_convite");
      
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("supervisoras")
        .update({ codigo_convite: data })
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("Novo código gerado!");
      loadSupervisoras();
    } catch (error: any) {
      toast.error("Erro ao gerar código: " + error.message);
    }
  };

  const handleSave = async () => {
    if (!formData.nome_empresa.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    if (!formData.contrato.trim()) {
      toast.error("Número do contrato é obrigatório");
      return;
    }

    try {
      setUploading(true);
      let logoUrl = editingSupervisora?.logo_url || null;
      let logoOrgaoUrl = editingSupervisora?.logo_orgao_fiscalizador_url || null;

      // Upload de logo se houver arquivo
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from("supervisora-logos")
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("supervisora-logos")
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      // Upload logo órgão fiscalizador se fornecido
      if (logoOrgaoFile) {
        const fileExt = logoOrgaoFile.name.split(".").pop();
        const fileName = `orgao-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("supervisora-logos")
          .upload(fileName, logoOrgaoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("supervisora-logos")
          .getPublicUrl(fileName);

        logoOrgaoUrl = publicUrl;
      }

      if (editingSupervisora) {
        // Atualizar
        const { error } = await supabase
          .from("supervisoras")
        .update({
          nome_empresa: formData.nome_empresa,
          contrato: formData.contrato,
          logo_url: logoUrl,
          logo_orgao_fiscalizador_url: logoOrgaoUrl,
          usar_logo_customizado: formData.usar_logo_customizado,
          usar_logo_orgao_relatorios: formData.usar_logo_orgao_relatorios,
        })
          .eq("id", editingSupervisora.id);

        if (error) throw error;
        toast.success("Supervisora atualizada!");
      } else {
        // Criar
        const { error } = await supabase
          .from("supervisoras")
          .insert({
            nome_empresa: formData.nome_empresa,
            contrato: formData.contrato,
            logo_url: logoUrl,
            logo_orgao_fiscalizador_url: logoOrgaoUrl,
            usar_logo_customizado: formData.usar_logo_customizado,
          });

        if (error) throw error;
        toast.success("Supervisora criada!");
      }

      loadSupervisoras();
      handleCloseDialog();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    try {
      // Verificar se há lotes vinculados
      const { data: lotes, error: checkError } = await supabase
        .from("lotes")
        .select("id, numero")
        .eq("supervisora_id", id);

      if (checkError) throw checkError;

      if (lotes && lotes.length > 0) {
        const lotesNumeros = lotes.map(l => l.numero).join(", ");
        toast.error(
          `Não é possível excluir "${nome}" pois existem ${lotes.length} lote(s) vinculado(s): ${lotesNumeros}. Desvincule ou exclua os lotes primeiro.`,
          { duration: 6000 }
        );
        return;
      }

      // Verificar se há usuários vinculados
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("supervisora_id", id);

      if (profilesError) throw profilesError;

      if (profiles && profiles.length > 0) {
        toast.error(
          `Não é possível excluir "${nome}" pois existem ${profiles.length} usuário(s) vinculado(s). Desvincule os usuários primeiro na aba "Usuários".`,
          { duration: 6000 }
        );
        return;
      }

      // Confirmar exclusão
      if (!confirm(`Deseja realmente excluir "${nome}"? Esta ação não pode ser desfeita.`)) {
        return;
      }

      const { error } = await supabase
        .from("supervisoras")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Supervisora excluída com sucesso!");
      loadSupervisoras();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const handleEdit = (supervisora: Supervisora) => {
    setEditingSupervisora(supervisora);
    setFormData({
      nome_empresa: supervisora.nome_empresa,
      contrato: supervisora.contrato || "",
      usar_logo_customizado: supervisora.usar_logo_customizado,
      usar_logo_orgao_relatorios: supervisora.usar_logo_orgao_relatorios ?? true,
    });
    setLogoFile(null);
    setLogoOrgaoFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupervisora(null);
    setFormData({ 
      nome_empresa: "", 
      contrato: "",
      usar_logo_customizado: false,
      usar_logo_orgao_relatorios: true
    });
    setLogoFile(null);
    setLogoOrgaoFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Supervisoras
            </CardTitle>
            <CardDescription>
              Gerencie as empresas supervisoras do sistema (multi-tenant)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingSupervisora(null);
                setFormData({ 
                  nome_empresa: "", 
                  contrato: "",
                  usar_logo_customizado: false,
                  usar_logo_orgao_relatorios: true
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Supervisora
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {editingSupervisora ? "Editar Supervisora" : "Nova Supervisora"}
                </DialogTitle>
                <DialogDescription>
                  {editingSupervisora ? "Atualize" : "Adicione"} os dados da supervisora
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4 overflow-y-auto overflow-x-hidden flex-1 px-1 pb-20">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Empresa *</Label>
                  <Input
                    id="nome"
                    value={formData.nome_empresa}
                    onChange={(e) => setFormData({ ...formData, nome_empresa: e.target.value })}
                    placeholder="Ex: DNIT Regional SP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contrato">Número do Contrato *</Label>
                  <Input
                    id="contrato"
                    value={formData.contrato}
                    onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                    placeholder="Ex: Contrato N° 123/2024"
                  />
                </div>

            <div className="space-y-3">
              <Label htmlFor="logo">Logo da Empresa</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              {editingSupervisora?.logo_url && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">Logo atual:</p>
                  <div className="flex items-center justify-between gap-4">
                    <img 
                      src={editingSupervisora.logo_url} 
                      alt="Logo atual" 
                      className="h-16 object-contain"
                    />
                    <div className="flex items-center gap-2">
                      <Label htmlFor="usar-logo" className="text-sm font-normal cursor-pointer">
                        Usar no sistema
                      </Label>
                      <Switch
                        id="usar-logo"
                        checked={formData.usar_logo_customizado}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, usar_logo_customizado: checked })
                        }
                        disabled={!editingSupervisora?.logo_url && !logoFile}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="logo-orgao">Logo do Órgão Fiscalizador</Label>
              <Input
                id="logo-orgao"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoOrgaoFile(e.target.files?.[0] || null)}
              />
              {editingSupervisora?.logo_orgao_fiscalizador_url && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">Logo atual:</p>
                  <div className="flex items-center justify-between gap-4">
                    <img 
                      src={editingSupervisora.logo_orgao_fiscalizador_url} 
                      alt="Logo órgão fiscalizador" 
                      className="h-16 object-contain"
                    />
                    <div className="flex items-center gap-2">
                      <Label htmlFor="usar-logo-orgao" className="text-sm font-normal cursor-pointer">
                        Incluir nos relatórios
                      </Label>
                      <Switch
                        id="usar-logo-orgao"
                        checked={formData.usar_logo_orgao_relatorios}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, usar_logo_orgao_relatorios: checked })
                        }
                        disabled={!editingSupervisora?.logo_orgao_fiscalizador_url && !logoOrgaoFile}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

              </div>

              <DialogFooter className="flex-shrink-0 bg-background pt-4 border-t shadow-lg">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={uploading}>
                  {uploading ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : supervisoras.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma supervisora cadastrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
            <TableHead>Nome da Empresa</TableHead>
            <TableHead>Contrato</TableHead>
            <TableHead className="text-center">Logo</TableHead>
            <TableHead>Código Convite</TableHead>
            <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supervisoras.map((supervisora) => (
                <TableRow key={supervisora.id}>
                  <TableCell className="font-medium">
                    {supervisora.nome_empresa}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {supervisora.contrato || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {supervisora.logo_url ? (
                      <img 
                        src={supervisora.logo_url} 
                        alt={supervisora.nome_empresa}
                        className="h-10 mx-auto object-contain"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem logo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {supervisora.codigo_convite ? (
                        <>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {supervisora.codigo_convite}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCodigo(supervisora.codigo_convite!)}
                            title="Copiar código"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGerarNovoCodigo(supervisora.id, supervisora.nome_empresa)}
                            title="Gerar novo código"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGerarNovoCodigo(supervisora.id, supervisora.nome_empresa)}
                        >
                          Gerar Código
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(supervisora)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(supervisora.id, supervisora.nome_empresa)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};