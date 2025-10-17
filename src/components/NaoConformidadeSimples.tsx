import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Save, Camera, X } from "lucide-react";
import { TIPOS_NC, PROBLEMAS_POR_TIPO, TIPO_NC_TO_NATUREZA, GRAUS_NC, TIPOS_OBRA, type TipoNC } from "@/constants/naoConformidades";

interface FotoData {
  arquivo: File | null;
  url: string;
  latitude: number | null;
  longitude: number | null;
  descricao: string;
  uploading: boolean;
}

interface NaoConformidadeSimplesProps {
  loteId: string;
  rodoviaId: string;
}

const NaoConformidadeSimples = ({ loteId, rodoviaId }: NaoConformidadeSimplesProps) => {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    data_ocorrencia: new Date().toISOString().split("T")[0],
    tipo_nc: "",
    problema_identificado: "",
    descricao_problema: "",
    natureza: "",
    grau: "",
    tipo_obra: "",
    snv: ""
  });

  const [fotos, setFotos] = useState<FotoData[]>([
    { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
  ]);

  const getCurrentLocation = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success(`Localização capturada: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
          setGpsLoading(false);
        },
        (error) => {
          toast.error("Erro ao capturar localização. Verifique se o GPS está ativado.");
          setGpsLoading(false);
        }
      );
    } else {
      toast.error("Geolocalização não suportada neste dispositivo.");
      setGpsLoading(false);
    }
  };

  const handleFotoChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);

      // Capturar GPS automaticamente
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const novasFotos = [...fotos];
            novasFotos[index] = {
              arquivo: file,
              url,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              descricao: "",
              uploading: false
            };
            setFotos(novasFotos);
            toast.success(`Foto ${index + 1} adicionada com GPS`);
          },
          () => {
            const novasFotos = [...fotos];
            novasFotos[index] = {
              arquivo: file,
              url,
              latitude: null,
              longitude: null,
              descricao: "",
              uploading: false
            };
            setFotos(novasFotos);
            toast.info(`Foto ${index + 1} adicionada (sem GPS)`);
          }
        );
      } else {
        const novasFotos = [...fotos];
        novasFotos[index] = {
          arquivo: file,
          url,
          latitude: null,
          longitude: null,
          descricao: "",
          uploading: false
        };
        setFotos(novasFotos);
      }
    }
  };

  const handleDescricaoChange = (index: number, descricao: string) => {
    const novasFotos = [...fotos];
    novasFotos[index].descricao = descricao;
    setFotos(novasFotos);
  };

  const handleRemoverFoto = (index: number) => {
    const novasFotos = [...fotos];
    if (novasFotos[index].url) {
      URL.revokeObjectURL(novasFotos[index].url);
    }
    novasFotos[index] = {
      arquivo: null,
      url: "",
      latitude: null,
      longitude: null,
      descricao: "",
      uploading: false
    };
    setFotos(novasFotos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipo_nc || !formData.problema_identificado) {
      toast.error("Por favor, preencha o tipo e o problema identificado");
      return;
    }

    if (!formData.natureza || !formData.grau || !formData.tipo_obra || !formData.snv) {
      toast.error("Por favor, preencha todos os campos obrigatórios do modelo 2018");
      return;
    }

    if (!location) {
      toast.error("Por favor, capture a localização GPS");
      return;
    }

    setLoading(true);

    try {
      // Obter informações do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload de fotos (se houver)
      const fotosUrls: string[] = [];
      for (let i = 0; i < fotos.length; i++) {
        if (fotos[i].arquivo) {
          const fotoFile = fotos[i].arquivo!;
          const fileExt = fotoFile.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_foto${i + 1}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('nc-photos')
            .upload(fileName, fotoFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('nc-photos')
            .getPublicUrl(fileName);

          fotosUrls.push(publicUrl);
        }
      }

      // Inserir NC no banco
      const { error: insertError } = await supabase
        .from("nao_conformidades")
        .insert([{
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_ocorrencia: formData.data_ocorrencia,
          tipo_nc: formData.tipo_nc,
          problema_identificado: formData.problema_identificado,
          descricao_problema: formData.descricao_problema,
          situacao: "Rascunho",
          latitude: location.lat,
          longitude: location.lng,
          natureza: formData.natureza,
          grau: formData.grau,
          tipo_obra: formData.tipo_obra,
          snv: formData.snv
        } as any]);

      if (insertError) throw insertError;

      toast.success("Não conformidade registrada com sucesso!");

      // Resetar formulário
      setFormData({
        data_ocorrencia: new Date().toISOString().split("T")[0],
        tipo_nc: "",
        problema_identificado: "",
        descricao_problema: "",
        natureza: "",
        grau: "",
        tipo_obra: "",
        snv: ""
      });
      setLocation(null);
      setFotos([
        { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, descricao: "", uploading: false },
      ]);

    } catch (error: any) {
      console.error("Erro ao salvar NC:", error);
      toast.error("Erro ao salvar não conformidade: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTipoChange = (value: string) => {
    setFormData((prev) => ({ 
      ...prev, 
      tipo_nc: value,
      problema_identificado: "",
      natureza: TIPO_NC_TO_NATUREZA[value as TipoNC] || ""
    }));
  };

  const problemasDisponiveis = formData.tipo_nc ? PROBLEMAS_POR_TIPO[formData.tipo_nc as TipoNC] || [] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Não Conformidade (Simplificado)</CardTitle>
        <CardDescription>
          Registre rapidamente problemas identificados durante as inspeções
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_ocorrencia">Data da Ocorrência *</Label>
              <Input
                id="data_ocorrencia"
                type="date"
                value={formData.data_ocorrencia}
                onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="tipo_nc">Tipo de NC *</Label>
              <Select value={formData.tipo_nc} onValueChange={handleTipoChange} required>
                <SelectTrigger id="tipo_nc">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TIPOS_NC).map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="problema_identificado">Problema Identificado *</Label>
              <Select 
                value={formData.problema_identificado} 
                onValueChange={(value) => setFormData({ ...formData, problema_identificado: value })}
                disabled={!formData.tipo_nc}
                required
              >
                <SelectTrigger id="problema_identificado">
                  <SelectValue placeholder="Selecione o problema" />
                </SelectTrigger>
                <SelectContent>
                  {problemasDisponiveis.map((problema) => (
                    <SelectItem key={problema} value={problema}>
                      {problema}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grau">Grau *</Label>
              <Select 
                value={formData.grau} 
                onValueChange={(value) => setFormData({ ...formData, grau: value })}
                required
              >
                <SelectTrigger id="grau">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {GRAUS_NC.map((grau) => (
                    <SelectItem key={grau} value={grau}>
                      {grau}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo_obra">Tipo de Obra *</Label>
              <Select 
                value={formData.tipo_obra} 
                onValueChange={(value) => setFormData({ ...formData, tipo_obra: value })}
                required
              >
                <SelectTrigger id="tipo_obra">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_OBRA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="snv">SNV *</Label>
              <Input
                id="snv"
                value={formData.snv}
                onChange={(e) => setFormData({ ...formData, snv: e.target.value })}
                placeholder="Ex: SNV-123"
                required
              />
            </div>

            <div>
              <Label htmlFor="natureza">Natureza *</Label>
              <Input
                id="natureza"
                value={formData.natureza}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="descricao_problema">Descrição/Justificativa *</Label>
            <Textarea
              id="descricao_problema"
              value={formData.descricao_problema}
              onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })}
              rows={3}
              placeholder="Descreva o problema identificado..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Localização GPS *</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={getCurrentLocation}
              disabled={gpsLoading}
            >
              <MapPin className="mr-2 h-4 w-4" />
              {gpsLoading ? "Capturando..." : location ? "Localização Capturada ✓" : "Capturar Localização"}
            </Button>
            {location && (
              <p className="text-sm text-muted-foreground">
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Fotos (até 4)</Label>
            <div className="grid grid-cols-2 gap-4">
              {fotos.map((foto, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
                    {foto.url ? (
                      <>
                        <img src={foto.url} alt={`Foto ${index + 1}`} className="w-full h-32 object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoverFoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-32 cursor-pointer">
                        <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Foto {index + 1}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFotoChange(index, e)}
                        />
                      </label>
                    )}
                  </div>
                  {foto.url && (
                    <Input
                      placeholder="Descrição da foto (opcional)"
                      value={foto.descricao}
                      onChange={(e) => handleDescricaoChange(index, e.target.value)}
                    />
                  )}
                  {foto.latitude && foto.longitude && (
                    <p className="text-xs text-muted-foreground">
                      GPS: {foto.latitude.toFixed(6)}, {foto.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Salvar NC"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NaoConformidadeSimples;
