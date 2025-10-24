import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, X, MapPin, Info } from "lucide-react";
import { extractDateFromPhotos, extractGPSFromPhoto, getCurrentGPS } from "@/lib/photoMetadata";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RetrorrefletividadeModalSimples } from "./RetrorrefletividadeModalSimples";

interface FichaVerificacaoSHFormProps {
  loteId: string;
  rodoviaId: string;
  onSuccess?: () => void;
}

interface ItemSH {
  file: File;
  preview: string;
  latitude_inicial: string;
  longitude_inicial: string;
  sentido: string;
  km_inicial: string;
  largura_cm: string;
  largura_conforme: boolean;
  largura_obs: string;
  retro_bd: string;
  retro_bd_medicoes?: number[];
  retro_bd_medias: number[]; // Array com as 10 médias expurgadas
  retro_bd_conforme: boolean;
  retro_bd_obs: string;
  retro_bd_gps_lat?: number;
  retro_bd_gps_lng?: number;
  retro_e: string;
  retro_e_medicoes?: number[];
  retro_e_medias: number[]; // Array com as 10 médias expurgadas
  retro_e_conforme: boolean;
  retro_e_obs: string;
  retro_e_gps_lat?: number;
  retro_e_gps_lng?: number;
  retro_be: string;
  retro_be_medicoes?: number[];
  retro_be_medias: number[]; // Array com as 10 médias expurgadas
  retro_be_conforme: boolean;
  retro_be_obs: string;
  retro_be_gps_lat?: number;
  retro_be_gps_lng?: number;
  marcas: string;
  marcas_conforme: boolean;
  marcas_obs: string;
  material: string;
  material_conforme: boolean;
  material_obs: string;
  tachas: string;
  tachas_conforme: boolean;
  tachas_obs: string;
  data_implantacao: string;
  data_implantacao_conforme: boolean;
  data_implantacao_obs: string;
  velocidade: string;
  velocidade_conforme: boolean;
  velocidade_obs: string;
}

const createEmptyItem = (): Omit<ItemSH, 'file' | 'preview'> => ({
  latitude_inicial: "", longitude_inicial: "", sentido: "", km_inicial: "",
  largura_cm: "", largura_conforme: true, largura_obs: "",
  retro_bd: "", retro_bd_medias: [], retro_bd_conforme: true, retro_bd_obs: "",
  retro_e: "", retro_e_medias: [], retro_e_conforme: true, retro_e_obs: "",
  retro_be: "", retro_be_medias: [], retro_be_conforme: true, retro_be_obs: "",
  marcas: "", marcas_conforme: true, marcas_obs: "",
  material: "", material_conforme: true, material_obs: "",
  tachas: "", tachas_conforme: true, tachas_obs: "",
  data_implantacao: "", data_implantacao_conforme: true, data_implantacao_obs: "",
  velocidade: "", velocidade_conforme: true, velocidade_obs: "",
});

export function FichaVerificacaoSHForm({ loteId, rodoviaId, onSuccess }: FichaVerificacaoSHFormProps) {
  const [snv, setSnv] = useState("");
  const [dataVerificacao, setDataVerificacao] = useState('');
  const [itens, setItens] = useState<ItemSH[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retroModalOpen, setRetroModalOpen] = useState(false);
  const [retroModalContext, setRetroModalContext] = useState<{
    itemIndex: number;
    campo: 'retro_bd' | 'retro_e' | 'retro_be';
  } | null>(null);

  const handleAddItem = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (itens.length >= 10) {
      toast.error("Máximo de 10 pontos de verificação por ficha (conforme IN 3/2025)");
      return;
    }

    const preview = URL.createObjectURL(file);
    const novoItem = { file, preview, ...createEmptyItem() };
    
    // ✅ CAPTURA AUTOMÁTICA DE GPS (Opção 3: Híbrida)
    toast.info("📍 Capturando coordenadas GPS...");
    
    // Tentar extrair GPS da foto (EXIF)
    let gpsData = await extractGPSFromPhoto(file);
    
    // Se não tiver GPS na foto, usar geolocalização do dispositivo
    if (!gpsData) {
      console.log("GPS não encontrado na foto, tentando geolocalização do dispositivo...");
      gpsData = await getCurrentGPS();
    }
    
    if (gpsData) {
      novoItem.latitude_inicial = gpsData.latitude.toFixed(6);
      novoItem.longitude_inicial = gpsData.longitude.toFixed(6);
      toast.success(`✅ GPS capturado: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`);
    } else {
      toast.warning("⚠️ Não foi possível capturar GPS automaticamente. Preencha manualmente se necessário.");
    }
    
    setItens([...itens, novoItem]);
    
    // Se é o primeiro item com foto, extrair data e atualizar data de verificação
    if (itens.length === 0) {
      const photoDate = await extractDateFromPhotos(file);
      if (photoDate) {
        setDataVerificacao(photoDate);
        console.log(`📅 Data capturada da foto: ${photoDate}`);
      } else {
        // Fallback: usar data atual se não conseguir extrair da foto
        const hoje = new Date().toISOString().split('T')[0];
        setDataVerificacao(hoje);
        console.log(`📅 Data não encontrada na foto, usando data atual: ${hoje}`);
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItens = [...itens];
    URL.revokeObjectURL(newItens[index].preview);
    newItens.splice(index, 1);
    setItens(newItens);
    
    // Se removeu todas as fotos, limpar a data
    if (newItens.length === 0) {
      setDataVerificacao('');
    }
  };

  const handleUpdateItem = (index: number, field: keyof ItemSH, value: any) => {
    const newItens = [...itens];
    (newItens[index][field] as any) = value;
    setItens(newItens);
  };

  const handleCaptureItemLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }

    toast.loading("Capturando localização...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newItens = [...itens];
        newItens[index].latitude_inicial = position.coords.latitude.toFixed(6);
        newItens[index].longitude_inicial = position.coords.longitude.toFixed(6);
        setItens(newItens);
        toast.dismiss();
        toast.success(`Localização capturada: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        toast.dismiss();
        toast.error("Erro ao capturar localização: " + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataVerificacao) {
      toast.error("Data de verificação não foi capturada. Adicione pelo menos uma foto.");
      return;
    }

    if (itens.length === 0) {
      toast.error("Adicione pelo menos 1 ponto de verificação");
      return;
    }

    // Validação obrigatória de coordenadas GPS
    const itensSemGPS = itens.filter((item, index) => 
      !item.latitude_inicial || !item.longitude_inicial || item.latitude_inicial === "" || item.longitude_inicial === ""
    );
    
    if (itensSemGPS.length > 0) {
      const indices = itens
        .map((item, idx) => (!item.latitude_inicial || !item.longitude_inicial || item.latitude_inicial === "" || item.longitude_inicial === "") ? idx + 1 : null)
        .filter(idx => idx !== null);
      
      toast.error(
        `⚠️ Coordenadas GPS obrigatórias!\n\n` +
        `Os seguintes pontos não possuem GPS capturado: ${indices.join(', ')}\n\n` +
        `Capture as coordenadas antes de enviar.`
      );
      return;
    }

    // Validação IN 3/2025
    if (itens.length < 10) {
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO: A IN 3/2025 exige 10 pontos de medição a cada 10 km.\n\n` +
        `Você está enviando apenas ${itens.length} ponto(s).\n\n` +
        `Deseja continuar mesmo assim?`
      );
      if (!confirmar) return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Insert main record
      const { data: ficha, error: fichaError } = await supabase
        .from("ficha_verificacao")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          tipo: "Sinalização Horizontal",
          snv: snv || null,
          data_verificacao: dataVerificacao,
        })
        .select()
        .single();

      if (fichaError) throw fichaError;

      // Upload photos and items
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${user.id}/${ficha.id}/${i + 1}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('verificacao-photos')
          .upload(fileName, item.file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('verificacao-photos')
          .getPublicUrl(fileName);

        const { error: itemError } = await supabase
          .from("ficha_verificacao_itens")
          .insert({
            ficha_id: ficha.id,
            ordem: i + 1,
            foto_url: publicUrl,
            latitude_inicial: item.latitude_inicial ? parseFloat(item.latitude_inicial) : null,
            longitude_inicial: item.longitude_inicial ? parseFloat(item.longitude_inicial) : null,
            sentido: item.sentido || null,
            km_inicial: item.km_inicial ? parseFloat(item.km_inicial) : null,
            largura_cm: item.largura_cm ? parseFloat(item.largura_cm) : null,
            largura_conforme: item.largura_conforme,
            largura_obs: item.largura_obs || null,
            retro_bd: item.retro_bd ? parseFloat(item.retro_bd) : null,
            retro_bd_medicoes: item.retro_bd_medicoes || null,
            retro_bd_medias: item.retro_bd_medias.length > 0 ? item.retro_bd_medias : null,
            retro_bd_conforme: item.retro_bd_conforme,
            retro_bd_obs: item.retro_bd_obs || null,
            retro_bd_gps_lat: item.retro_bd_gps_lat || null,
            retro_bd_gps_lng: item.retro_bd_gps_lng || null,
            retro_e: item.retro_e ? parseFloat(item.retro_e) : null,
            retro_e_medicoes: item.retro_e_medicoes || null,
            retro_e_medias: item.retro_e_medias.length > 0 ? item.retro_e_medias : null,
            retro_e_conforme: item.retro_e_conforme,
            retro_e_obs: item.retro_e_obs || null,
            retro_e_gps_lat: item.retro_e_gps_lat || null,
            retro_e_gps_lng: item.retro_e_gps_lng || null,
            retro_be: item.retro_be ? parseFloat(item.retro_be) : null,
            retro_be_medicoes: item.retro_be_medicoes || null,
            retro_be_medias: item.retro_be_medias.length > 0 ? item.retro_be_medias : null,
            retro_be_conforme: item.retro_be_conforme,
            retro_be_obs: item.retro_be_obs || null,
            retro_be_gps_lat: item.retro_be_gps_lat || null,
            retro_be_gps_lng: item.retro_be_gps_lng || null,
            marcas: item.marcas || null,
            marcas_conforme: item.marcas_conforme,
            marcas_obs: item.marcas_obs || null,
            material: item.material || null,
            material_conforme: item.material_conforme,
            material_obs: item.material_obs || null,
            tachas: item.tachas || null,
            tachas_conforme: item.tachas_conforme,
            tachas_obs: item.tachas_obs || null,
            data_implantacao: item.data_implantacao || null,
            data_implantacao_conforme: item.data_implantacao_conforme,
            data_implantacao_obs: item.data_implantacao_obs || null,
            velocidade: item.velocidade || null,
            velocidade_conforme: item.velocidade_conforme,
            velocidade_obs: item.velocidade_obs || null,
          } as any);

        if (itemError) throw itemError;
      }

      toast.success("Ficha de verificação criada com sucesso!");
      
      // Limpar formulário e chamar callback de sucesso
      setSnv("");
      setDataVerificacao('');
      itens.forEach(i => URL.revokeObjectURL(i.preview));
      setItens([]);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error("Erro ao criar ficha: " + error.message);
    } finally {
      setUploading(false);
    }
  };


  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Requisitos IN 3/2025 (Item 3.1.19)</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
            <li><strong>10 pontos de medição</strong> a cada 10 km de rodovia</li>
            <li><strong>10 leituras consecutivas</strong> por ponto (descarte da maior e menor)</li>
            <li><strong>Registro fotográfico obrigatório</strong> de cada ponto</li>
            <li><strong>GPS específico</strong> para cada medição de retrorrefletância</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais - Sinalização Horizontal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>SNV</Label>
            <Input value={snv} onChange={(e) => setSnv(e.target.value)} />
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Pontos de Verificação</span>
              <Badge variant={itens.length >= 10 ? "default" : "outline"} className="text-xs">
                {itens.length}/10 pontos
              </Badge>
              {itens.length >= 10 && (
                <Badge variant="default" className="text-xs bg-green-600">
                  ✓ Conforme IN 3/2025
                </Badge>
              )}
            </div>
            {itens.length < 10 && (
              <Label htmlFor="item-upload" className="cursor-pointer">
                <Button type="button" size="sm" asChild>
                  <span>
                    <Camera className="mr-2 h-4 w-4" />
                    Adicionar Ponto
                  </span>
                </Button>
                <Input
                  id="item-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddItem}
                />
              </Label>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {itens.map((item, index) => (
              <Card key={index}>
                <CardHeader className="relative">
                  <img
                    src={item.preview}
                    alt={`Ponto ${index + 1}`}
                    className="w-full h-48 object-cover rounded"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardTitle>Ponto {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={item.latitude_inicial}
                        onChange={(e) => handleUpdateItem(index, 'latitude_inicial', e.target.value)}
                        placeholder="Lat"
                      />
                    </div>
                    <div>
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={item.longitude_inicial}
                        onChange={(e) => handleUpdateItem(index, 'longitude_inicial', e.target.value)}
                        placeholder="Long"
                      />
                    </div>
                    <div>
                      <Label>Sentido</Label>
                      <Select
                        value={item.sentido}
                        onValueChange={(value) => handleUpdateItem(index, 'sentido', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o sentido" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Crescente">Crescente</SelectItem>
                          <SelectItem value="Decrescente">Decrescente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>KM</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.km_inicial}
                        onChange={(e) => handleUpdateItem(index, 'km_inicial', e.target.value)}
                        placeholder="KM"
                      />
                    </div>
                  </div>

                  {/* Largura */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <Label>Largura (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={item.largura_cm}
                        onChange={(e) => handleUpdateItem(index, 'largura_cm', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.largura_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'largura_conforme', checked)}
                      />
                      <Label>Conforme projeto</Label>
                    </div>
                    <div>
                      <Input
                        value={item.largura_obs}
                        onChange={(e) => handleUpdateItem(index, 'largura_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Retro BD */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Retro BD (mcd/lux)</Label>
                        <Badge variant={item.retro_bd_medias.length === 10 ? "default" : "secondary"}>
                          {item.retro_bd_medias.length}/10 medições
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={item.retro_bd}
                          readOnly
                          placeholder={item.retro_bd_medias.length === 0 ? "Clique em Medir" : `Média de ${item.retro_bd_medias.length} pontos`}
                          className="cursor-not-allowed bg-muted"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (item.retro_bd_medias.length >= 10) {
                              toast.error("Já foram feitas 10 medições. Máximo atingido.");
                              return;
                            }
                            setRetroModalContext({ itemIndex: index, campo: 'retro_bd' });
                            setRetroModalOpen(true);
                          }}
                          disabled={item.retro_bd_medias.length >= 10}
                        >
                          📊 {item.retro_bd_medias.length === 0 ? "Medir" : "Adicionar"}
                        </Button>
                        {item.retro_bd_medias.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newItens = [...itens];
                              newItens[index].retro_bd_medias = [];
                              newItens[index].retro_bd = '';
                              setItens(newItens);
                              toast.info("Medições de RETRO BD limpas.");
                            }}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.retro_bd_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'retro_bd_conforme', checked)}
                      />
                      <Label>Acima do mínimo</Label>
                    </div>
                    <div>
                      <Input
                        value={item.retro_bd_obs}
                        onChange={(e) => handleUpdateItem(index, 'retro_bd_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Retro E */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Retro E (mcd/lux)</Label>
                        <Badge variant={item.retro_e_medias.length === 10 ? "default" : "secondary"}>
                          {item.retro_e_medias.length}/10 medições
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={item.retro_e}
                          readOnly
                          placeholder={item.retro_e_medias.length === 0 ? "Clique em Medir" : `Média de ${item.retro_e_medias.length} pontos`}
                          className="cursor-not-allowed bg-muted"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (item.retro_e_medias.length >= 10) {
                              toast.error("Já foram feitas 10 medições. Máximo atingido.");
                              return;
                            }
                            setRetroModalContext({ itemIndex: index, campo: 'retro_e' });
                            setRetroModalOpen(true);
                          }}
                          disabled={item.retro_e_medias.length >= 10}
                        >
                          📊 {item.retro_e_medias.length === 0 ? "Medir" : "Adicionar"}
                        </Button>
                        {item.retro_e_medias.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newItens = [...itens];
                              newItens[index].retro_e_medias = [];
                              newItens[index].retro_e = '';
                              setItens(newItens);
                              toast.info("Medições de RETRO E limpas.");
                            }}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.retro_e_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'retro_e_conforme', checked)}
                      />
                      <Label>Acima do mínimo</Label>
                    </div>
                    <div>
                      <Input
                        value={item.retro_e_obs}
                        onChange={(e) => handleUpdateItem(index, 'retro_e_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Retro BE */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Retro BE (mcd/lux)</Label>
                        <Badge variant={item.retro_be_medias.length === 10 ? "default" : "secondary"}>
                          {item.retro_be_medias.length}/10 medições
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={item.retro_be}
                          readOnly
                          placeholder={item.retro_be_medias.length === 0 ? "Clique em Medir" : `Média de ${item.retro_be_medias.length} pontos`}
                          className="cursor-not-allowed bg-muted"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (item.retro_be_medias.length >= 10) {
                              toast.error("Já foram feitas 10 medições. Máximo atingido.");
                              return;
                            }
                            setRetroModalContext({ itemIndex: index, campo: 'retro_be' });
                            setRetroModalOpen(true);
                          }}
                          disabled={item.retro_be_medias.length >= 10}
                        >
                          📊 {item.retro_be_medias.length === 0 ? "Medir" : "Adicionar"}
                        </Button>
                        {item.retro_be_medias.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newItens = [...itens];
                              newItens[index].retro_be_medias = [];
                              newItens[index].retro_be = '';
                              setItens(newItens);
                              toast.info("Medições de RETRO BE limpas.");
                            }}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.retro_be_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'retro_be_conforme', checked)}
                      />
                      <Label>Acima do mínimo</Label>
                    </div>
                    <div>
                      <Input
                        value={item.retro_be_obs}
                        onChange={(e) => handleUpdateItem(index, 'retro_be_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Outros campos de forma similar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <Label>Marcas</Label>
                      <Input
                        value={item.marcas}
                        onChange={(e) => handleUpdateItem(index, 'marcas', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.marcas_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'marcas_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.marcas_obs}
                        onChange={(e) => handleUpdateItem(index, 'marcas_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <Label>Material</Label>
                      <Input
                        value={item.material}
                        onChange={(e) => handleUpdateItem(index, 'material', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.material_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'material_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.material_obs}
                        onChange={(e) => handleUpdateItem(index, 'material_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <Label>Tachas</Label>
                      <Input
                        value={item.tachas}
                        onChange={(e) => handleUpdateItem(index, 'tachas', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.tachas_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'tachas_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.tachas_obs}
                        onChange={(e) => handleUpdateItem(index, 'tachas_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <Label>Data de Implantação</Label>
                      <Input
                        type="date"
                        value={item.data_implantacao}
                        onChange={(e) => handleUpdateItem(index, 'data_implantacao', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.data_implantacao_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'data_implantacao_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.data_implantacao_obs}
                        onChange={(e) => handleUpdateItem(index, 'data_implantacao_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div>
                      <Label>Velocidade</Label>
                      <Input
                        value={item.velocidade}
                        onChange={(e) => handleUpdateItem(index, 'velocidade', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.velocidade_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'velocidade_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.velocidade_obs}
                        onChange={(e) => handleUpdateItem(index, 'velocidade_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={uploading}>
        {uploading ? "Salvando..." : "Salvar Ficha"}
      </Button>

      {/* Modal de Retrorefletividade */}
      <Dialog open={retroModalOpen} onOpenChange={setRetroModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Medição de Retrorefletividade - Ponto {retroModalContext ? retroModalContext.itemIndex + 1 : ''} 
              {retroModalContext && ` - ${retroModalContext.campo.toUpperCase().replace('_', ' ')}`}
            </DialogTitle>
          </DialogHeader>
          {retroModalContext && (
            <RetrorrefletividadeModalSimples
              tipo="SH"
              campo={retroModalContext.campo}
              loteId={loteId}
              rodoviaId={rodoviaId}
              kmReferencia={itens[retroModalContext.itemIndex]?.km_inicial}
              dataVerificacao={dataVerificacao}
              onComplete={(resultado) => {
                const newItens = [...itens];
                const campo = retroModalContext.campo;
                const campoMedias = `${campo}_medias`;
                
                // Adiciona a nova média ao array (máximo 10)
                const mediasAtuais = ((newItens[retroModalContext.itemIndex] as any)[campoMedias] as number[]) || [];
                if (mediasAtuais.length < 10) {
                  mediasAtuais.push(resultado.media);
                } else {
                  toast.error("Já foram feitas 10 medições para este campo. Máximo atingido.");
                  return;
                }
                
                (newItens[retroModalContext.itemIndex] as any)[campoMedias] = mediasAtuais;
                
                // Recalcula a média das médias
                const mediaFinal = mediasAtuais.reduce((acc, val) => acc + val, 0) / mediasAtuais.length;
                newItens[retroModalContext.itemIndex][campo] = mediaFinal.toFixed(1);
                
                // Salva outras informações (última medição)
                (newItens[retroModalContext.itemIndex] as any)[`${campo}_medicoes`] = resultado.medicoes;
                (newItens[retroModalContext.itemIndex] as any)[`${campo}_obs`] = resultado.observacao;
                if (resultado.latitude && resultado.longitude) {
                  (newItens[retroModalContext.itemIndex] as any)[`${campo}_gps_lat`] = resultado.latitude;
                  (newItens[retroModalContext.itemIndex] as any)[`${campo}_gps_lng`] = resultado.longitude;
                }
                
                setItens(newItens);
                setRetroModalOpen(false);
                setRetroModalContext(null);
                
                toast.success(`${campo.toUpperCase().replace('_', ' ')}: Ponto ${mediasAtuais.length}/10 adicionado. Média atual: ${mediaFinal.toFixed(1)} mcd/lux`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </form>
  );
}
