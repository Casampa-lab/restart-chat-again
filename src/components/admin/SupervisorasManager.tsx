import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Building2, Upload, Users, Copy, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Supervisora {
  id: string;
  nome_empresa: string;
  contrato: string | null;
  email_prefixo: string | null;
  email_envio: string | null;
  logo_url: string | null;
  usar_logo_customizado: boolean;
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
    email_prefixo: "",
    email_envio: "",
    usar_logo_customizado: false,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
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

      if (editingSupervisora) {
        // Atualizar
        const { error } = await supabase
          .from("supervisoras")
          .update({
            nome_empresa: formData.nome_empresa,
            contrato: formData.contrato,
            email_prefixo: formData.email_prefixo || null,
            email_envio: formData.email_envio || null,
            logo_url: logoUrl,
            usar_logo_customizado: formData.usar_logo_customizado,
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
            email_prefixo: formData.email_prefixo || null,
            email_envio: formData.email_envio || null,
            logo_url: logoUrl,
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
      email_prefixo: supervisora.email_prefixo || "",
      email_envio: supervisora.email_envio || "",
      usar_logo_customizado: supervisora.usar_logo_customizado,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupervisora(null);
    setFormData({ 
      nome_empresa: "", 
      contrato: "", 
      email_prefixo: "", 
      email_envio: "",
      usar_logo_customizado: false 
    });
    setLogoFile(null);
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
                  email_prefixo: "", 
                  email_envio: "",
                  usar_logo_customizado: false 
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Supervisora
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {editingSupervisora ? "Editar Supervisora" : "Nova Supervisora"}
                </DialogTitle>
                <DialogDescription>
                  {editingSupervisora ? "Atualize" : "Adicione"} os dados da supervisora
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4 overflow-y-auto flex-1 px-1">
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

                <div className="space-y-2">
                  <Label htmlFor="email_prefixo">Prefixo de Email</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email_prefixo"
                      value={formData.email_prefixo}
                      onChange={(e) => {
                        // Remove caracteres especiais e converte para minúsculas
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                        setFormData({ ...formData, email_prefixo: value });
                      }}
                      placeholder="Ex: supervisora"
                      maxLength={20}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      @operavia.online
                    </span>
                  </div>
                  {formData.email_prefixo && (
                    <p className="text-sm text-muted-foreground">
                      Email de usuários: <strong>{formData.email_prefixo}@operavia.online</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_envio">Email de Envio (Remetente das Notificações)</Label>
                  <Input
                    id="email_envio"
                    type="email"
                    value={formData.email_envio}
                    onChange={(e) => setFormData({ ...formData, email_envio: e.target.value })}
                    placeholder="Ex: noreply@supervisora.com.br"
                  />
                  <p className="text-sm text-muted-foreground">
                    Este email será usado como remetente nas notificações de NC
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo da Empresa</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  {editingSupervisora?.logo_url && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Logo atual:</p>
                      <img 
                        src={editingSupervisora.logo_url} 
                        alt="Logo atual" 
                        className="h-16 mt-1 object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="usar-logo">Usar logo customizado</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir logo da supervisora no sistema
                    </p>
                  </div>
                  <Switch
                    id="usar-logo"
                    checked={formData.usar_logo_customizado}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, usar_logo_customizado: checked })
                    }
                    disabled={!editingSupervisora?.logo_url && !logoFile}
                    className="scale-125 data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <DialogFooter className="flex-shrink-0 sticky bottom-0 bg-background pt-4 border-t">
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
                <TableHead>Nome</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Email de Envio</TableHead>
                <TableHead className="text-center">Logo</TableHead>
                <TableHead className="text-center">Logo Ativo</TableHead>
                <TableHead>Código Convite</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
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
                  <TableCell className="text-sm">
                    {supervisora.email_prefixo ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {supervisora.email_prefixo}@operavia.online
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
                  <TableCell className="text-center">
                    {supervisora.usar_logo_customizado ? "✓" : "—"}
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
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // TODO: Implementar gerenciamento de usuários
                        toast.info("Gerenciamento de usuários em breve");
                      }}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
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