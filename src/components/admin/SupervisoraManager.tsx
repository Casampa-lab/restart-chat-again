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
  const orgaoFileInputRef = useRef<HTMLInputElement>(null);
  
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [contrato, setContrato] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoOrgaoFile, setLogoOrgaoFile] = useState<File | null>(null);
  const [logoOrgaoPreview, setLogoOrgaoPreview] = useState<string>("");
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
        setLogoOrgaoPreview((data as any).logo_orgao_fiscalizador_url || "");
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

  const handleOrgaoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setLogoOrgaoFile(file);
    setLogoOrgaoPreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let logoUrl = supervisora?.logo_url || null;
      let logoOrgaoUrl = (supervisora as any)?.logo_orgao_fiscalizador_url || null;

      console.log('Estado do switch antes de salvar:', usarLogoCustomizado);

      // Upload do logo da supervisora se houver arquivo novo
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

      // Upload do logo do órgão fiscalizador se houver arquivo novo
      if (logoOrgaoFile) {
        const fileExt = logoOrgaoFile.name.split('.').pop();
        const fileName = `logo-orgao-fiscalizador.${fileExt}`;

        // Remove arquivo antigo se existir
        if ((supervisora as any)?.logo_orgao_fiscalizador_url) {
          const oldFileName = (supervisora as any).logo_orgao_fiscalizador_url.split('/').pop();
          if (oldFileName && oldFileName !== 'logo-orgao-fiscalizador.png') {
            await supabase.storage
              .from('supervisora-logos')
              .remove([oldFileName]);
          }
        }

        // Upload novo arquivo
        const { error: uploadError } = await supabase.storage
          .from('supervisora-logos')
          .upload(fileName, logoOrgaoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('supervisora-logos')
          .getPublicUrl(fileName);

        logoOrgaoUrl = publicUrl;
      }

      const payload = {
        nome_empresa: nomeEmpresa,
        contrato: contrato,
        logo_url: logoUrl,
        logo_orgao_fiscalizador_url: logoOrgaoUrl,
        usar_logo_customizado: usarLogoCustomizado,
      };

      console.log('Payload que será enviado:', payload);

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
      setLogoFile(null);
      setLogoOrgaoFile(null);
      toast.success("Informações da supervisora salvas com sucesso!");
      
      // Invalidar queries para forçar atualização
      queryClient.invalidateQueries({ queryKey: ["supervisora"] });
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
    
    console.log('Estado atual do switch no momento do submit:', usarLogoCustomizado);
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

              <div className="space-y-2">
                <Label htmlFor="logoOrgao">Logo do Órgão Fiscalizador (DNIT, DER, etc.)</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => orgaoFileInputRef.current?.click()}
                    className="w-full md:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {logoOrgaoFile || (supervisora as any)?.logo_orgao_fiscalizador_url ? "Alterar Logo Órgão" : "Upload Logo Órgão"}
                  </Button>
                  <input
                    ref={orgaoFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleOrgaoFileChange}
                  />
                  {logoOrgaoPreview && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      Logo do órgão carregado
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Usado nos relatórios. Pode ser DNIT, DER estadual ou outro órgão.
                </p>
              </div>

              <div className="flex items-center justify-between p-6 border-2 rounded-lg bg-primary/5 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="usar-logo" className="text-lg font-semibold cursor-pointer">
                    ⚙️ Substituir Logo Padrão
                  </Label>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Quando ativado, o logo da supervisora substitui o logo "RodoviaSUPERV" nos cabeçalhos do sistema
                  </p>
                  <p className="text-xs font-medium text-primary">
                    {usarLogoCustomizado ? "✓ Ativo - Logo customizado será usado" : "Desativado - Logo padrão será usado"}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Switch
                    id="usar-logo"
                    checked={usarLogoCustomizado}
                    onCheckedChange={(checked) => {
                      console.log('Switch alterado para:', checked);
                      setUsarLogoCustomizado(checked);
                    }}
                    disabled={!logoPreview}
                    className="scale-125 data-[state=checked]:bg-primary"
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {usarLogoCustomizado ? "Ligado" : "Desligado"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logoPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Logo Supervisora</CardTitle>
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
              
              {logoOrgaoPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Logo Órgão Fiscalizador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-4 rounded border flex items-center justify-center">
                      <img
                        src={logoOrgaoPreview}
                        alt="Logo do Órgão Fiscalizador"
                        className="max-h-32 object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

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