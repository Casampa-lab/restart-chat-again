import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Building2, Save, Image as ImageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const SupervisoraManager = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [contrato, setContrato] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [usarLogoCustomizado, setUsarLogoCustomizado] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: supervisora, isLoading } = useQuery({
    queryKey: ["supervisora"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supervisora")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
      // Se existe, preencher os campos
      if (data) {
        setNomeEmpresa(data.nome_empresa);
        setContrato(data.contrato);
        setLogoPreview(data.logo_url || "");
        setUsarLogoCustomizado(data.usar_logo_customizado || false);
      }
      
      return data;
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let logoUrl = supervisora?.logo_url || null;

      // Upload do logo se houver arquivo novo
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-supervisora.${fileExt}`;

        // Remove arquivo antigo se existir
        if (supervisora?.logo_url) {
          const oldFileName = supervisora.logo_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('supervisora-logos')
              .remove([oldFileName]);
          }
        }

        // Upload novo arquivo
        const { error: uploadError } = await supabase.storage
          .from('supervisora-logos')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('supervisora-logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      const payload = {
        nome_empresa: nomeEmpresa,
        contrato: contrato,
        logo_url: logoUrl,
        usar_logo_customizado: usarLogoCustomizado,
      };

      // Inserir ou atualizar registro
      if (supervisora) {
        // Atualizar
        const { error } = await supabase
          .from("supervisora")
          .update(payload)
          .eq("id", supervisora.id);

        if (error) throw error;
      } else {
        // Inserir novo
        const { error } = await supabase
          .from("supervisora")
          .insert(payload);

        if (error) throw error;
      }

      return payload;
    },
    onSuccess: (data) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["supervisora"] });
      
      // Forçar atualização do estado local
      setNomeEmpresa(data.nome_empresa);
      setContrato(data.contrato);
      setUsarLogoCustomizado(data.usar_logo_customizado);
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
      
      setLogoFile(null);
      toast.success("Informações da supervisora salvas com sucesso!");
      
      // Recarregar a página após 500ms para garantir que o logo seja atualizado
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar informações");
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim() || !contrato.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações da Supervisora
          </CardTitle>
          <CardDescription>
            Cadastre os dados da empresa supervisora que aparecerão nos cabeçalhos dos relatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeEmpresa">Nome da Empresa Supervisora *</Label>
                <Input
                  id="nomeEmpresa"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  placeholder="Ex: BR-LEGAL 2"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contrato">Contrato Supervisionado *</Label>
                <Input
                  id="contrato"
                  value={contrato}
                  onChange={(e) => setContrato(e.target.value)}
                  placeholder="Ex: Contrato N° 123/2024"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logomarca da Supervisora</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full md:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {logoFile || supervisora?.logo_url ? "Alterar Logo" : "Upload Logo"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {logoPreview && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      Logo carregado
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: JPG, PNG, WEBP. Tamanho máximo: 2MB
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label htmlFor="usar-logo" className="text-base font-medium">
                    Substituir Logo Padrão
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, o logo da supervisora substitui o logo "RodoviaSUPERV" nos cabeçalhos do sistema
                  </p>
                </div>
                <Switch
                  id="usar-logo"
                  checked={usarLogoCustomizado}
                  onCheckedChange={setUsarLogoCustomizado}
                  disabled={!logoPreview}
                />
              </div>
            </div>

            {logoPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pré-visualização do Logo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded border flex items-center justify-center">
                    <img
                      src={logoPreview}
                      alt="Logo da Supervisora"
                      className="max-h-32 object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit" 
              disabled={uploading}
              className="w-full md:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {uploading ? "Salvando..." : "Salvar Informações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};