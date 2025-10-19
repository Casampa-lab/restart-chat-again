import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, X, MapPin } from "lucide-react";
import { TODAS_PLACAS } from "@/constants/codigosPlacas";
import { extractDateFromPhotos } from "@/lib/photoMetadata";
import { RetrorrefletividadeModalSimples } from "./RetrorrefletividadeModalSimples";

interface FichaVerificacaoSVFormProps {
  loteId: string;
  rodoviaId: string;
  onSuccess?: () => void;
}

interface ItemSV {
  file: File;
  preview: string;
  latitude: string;
  longitude: string;
  sentido: string;
  km: string;
  altura_m: string;
  altura_conforme: boolean;
  altura_obs: string;
  afastamento_m: string;
  afastamento_conforme: boolean;
  afastamento_obs: string;
  dimensoes_m: string;
  dimensoes_conforme: boolean;
  dimensoes_obs: string;
  letra_mm: string;
  letra_conforme: boolean;
  letra_obs: string;
  data_imp_verso: boolean;
  data_imp_verso_conforme: boolean;
  data_imp_verso_obs: string;
  retro_sv: string;
  retro_sv_medicoes?: number[];
  retro_sv_conforme: boolean;
  retro_sv_obs: string;
  substrato: string;
  substrato_conforme: boolean;
  substrato_obs: string;
  pelicula: string;
  pelicula_conforme: boolean;
  pelicula_obs: string;
  suporte: string;
  suporte_conforme: boolean;
  suporte_obs: string;
  qtde_suporte: string;
  qtde_suporte_conforme: boolean;
  qtde_suporte_obs: string;
  tipo_placa: string;
  tipo_placa_conforme: boolean;
  tipo_placa_obs: string;
  velocidade: string;
  velocidade_conforme: boolean;
  velocidade_obs: string;
}

const createEmptyItem = (): Omit<ItemSV, 'file' | 'preview'> => ({
  latitude: "", longitude: "", sentido: "", km: "",
  altura_m: "", altura_conforme: true, altura_obs: "",
  afastamento_m: "", afastamento_conforme: true, afastamento_obs: "",
  dimensoes_m: "", dimensoes_conforme: true, dimensoes_obs: "",
  letra_mm: "", letra_conforme: true, letra_obs: "",
  data_imp_verso: false, data_imp_verso_conforme: true, data_imp_verso_obs: "",
  retro_sv: "", retro_sv_conforme: true, retro_sv_obs: "",
  substrato: "", substrato_conforme: true, substrato_obs: "",
  pelicula: "", pelicula_conforme: true, pelicula_obs: "",
  suporte: "", suporte_conforme: true, suporte_obs: "",
  qtde_suporte: "", qtde_suporte_conforme: true, qtde_suporte_obs: "",
  tipo_placa: "", tipo_placa_conforme: true, tipo_placa_obs: "",
  velocidade: "", velocidade_conforme: true, velocidade_obs: "",
});

export function FichaVerificacaoSVForm({ loteId, rodoviaId, onSuccess }: FichaVerificacaoSVFormProps) {
  const [snv, setSnv] = useState("");
  const [dataVerificacao, setDataVerificacao] = useState('');
  const [itens, setItens] = useState<ItemSV[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fichaIdCriada, setFichaIdCriada] = useState<string | null>(null);
  const [enviandoCoordenador, setEnviandoCoordenador] = useState(false);
  const [retroModalOpen, setRetroModalOpen] = useState(false);
  const [retroModalContext, setRetroModalContext] = useState<{
    itemIndex: number;
    campo: 'retro_sv';
  } | null>(null);

  const handleAddItem = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (itens.length >= 3) {
      toast.error("Máximo de 3 pontos de verificação permitidos");
      return;
    }

    const preview = URL.createObjectURL(file);
    setItens([...itens, { file, preview, ...createEmptyItem() }]);
    
    // Se é o primeiro item com foto, extrair data e atualizar data de verificação
    if (itens.length === 0) {
      const photoDate = await extractDateFromPhotos(file);
      if (photoDate) {
        setDataVerificacao(photoDate);
        toast.success(`Data de verificação atualizada: ${photoDate}`);
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

  const handleUpdateItem = (index: number, field: keyof ItemSV, value: any) => {
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
        newItens[index].latitude = position.coords.latitude.toFixed(6);
        newItens[index].longitude = position.coords.longitude.toFixed(6);
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

    if (itens.length === 0) {
      toast.error("Adicione pelo menos 1 ponto de verificação");
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: ficha, error: fichaError } = await supabase
        .from("ficha_verificacao")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          tipo: "Sinalização Vertical",
          snv: snv || null,
          data_verificacao: dataVerificacao,
        })
        .select()
        .single();

      if (fichaError) throw fichaError;

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
            latitude: item.latitude ? parseFloat(item.latitude) : null,
            longitude: item.longitude ? parseFloat(item.longitude) : null,
            sentido: item.sentido || null,
            km: item.km ? parseFloat(item.km) : null,
            altura_m: item.altura_m ? parseFloat(item.altura_m) : null,
            altura_conforme: item.altura_conforme,
            altura_obs: item.altura_obs || null,
            afastamento_m: item.afastamento_m ? parseFloat(item.afastamento_m) : null,
            afastamento_conforme: item.afastamento_conforme,
            afastamento_obs: item.afastamento_obs || null,
            dimensoes_m: item.dimensoes_m || null,
            dimensoes_conforme: item.dimensoes_conforme,
            dimensoes_obs: item.dimensoes_obs || null,
            letra_mm: item.letra_mm ? parseFloat(item.letra_mm) : null,
            letra_conforme: item.letra_conforme,
            letra_obs: item.letra_obs || null,
            data_imp_verso: item.data_imp_verso,
            data_imp_verso_conforme: item.data_imp_verso_conforme,
            data_imp_verso_obs: item.data_imp_verso_obs || null,
            retro_sv: item.retro_sv ? parseFloat(item.retro_sv) : null,
            retro_sv_medicoes: item.retro_sv_medicoes || null,
            retro_sv_conforme: item.retro_sv_conforme,
            retro_sv_obs: item.retro_sv_obs || null,
            substrato: item.substrato || null,
            substrato_conforme: item.substrato_conforme,
            substrato_obs: item.substrato_obs || null,
            pelicula: item.pelicula || null,
            pelicula_conforme: item.pelicula_conforme,
            pelicula_obs: item.pelicula_obs || null,
            suporte: item.suporte || null,
            suporte_conforme: item.suporte_conforme,
            suporte_obs: item.suporte_obs || null,
            qtde_suporte: item.qtde_suporte ? parseInt(item.qtde_suporte) : null,
            qtde_suporte_conforme: item.qtde_suporte_conforme,
            qtde_suporte_obs: item.qtde_suporte_obs || null,
            tipo_placa: item.tipo_placa || null,
            tipo_placa_conforme: item.tipo_placa_conforme,
            tipo_placa_obs: item.tipo_placa_obs || null,
            velocidade: item.velocidade || null,
            velocidade_conforme: item.velocidade_conforme,
            velocidade_obs: item.velocidade_obs || null,
          });

        if (itemError) throw itemError;
      }

      toast.success("Ficha de verificação criada com sucesso!");
      setFichaIdCriada(ficha.id);
      // NÃO limpar formulário ainda - aguardar decisão do usuário
    } catch (error: any) {
      toast.error("Erro ao criar ficha: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLimparFormulario = () => {
    setFichaIdCriada(null);
    setSnv("");
    setDataVerificacao('');
    itens.forEach(i => URL.revokeObjectURL(i.preview));
    setItens([]);
    if (onSuccess) onSuccess();
  };

  const handleEnviarCoordenador = async () => {
    if (!fichaIdCriada) return;
    
    setEnviandoCoordenador(true);
    try {
      const { error } = await supabase
        .from('ficha_verificacao')
        .update({
          status: 'pendente_aprovacao_coordenador',
          enviado_coordenador_em: new Date().toISOString()
        })
        .eq('id', fichaIdCriada);

      if (error) throw error;

      toast.success('Ficha enviada para validação do coordenador!');
      handleLimparFormulario();
    } catch (error: any) {
      toast.error('Erro ao enviar: ' + error.message);
    } finally {
      setEnviandoCoordenador(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais - Sinalização Vertical</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>SNV</Label>
              <Input value={snv} onChange={(e) => setSnv(e.target.value)} />
            </div>
            <div>
              <Label>Data da Verificação</Label>
              <Input
                type="date"
                value={dataVerificacao}
                onChange={(e) => setDataVerificacao(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de confirmação após criar ficha */}
      {fichaIdCriada && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Ficha criada com sucesso!</p>
                <p className="text-sm text-muted-foreground">
                  Deseja enviar para validação do coordenador?
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLimparFormulario}
                >
                  Continuar Editando
                </Button>
                <Button
                  type="button"
                  disabled={enviandoCoordenador}
                  onClick={handleEnviarCoordenador}
                >
                  {enviandoCoordenador ? 'Enviando...' : 'Enviar para Coordenador'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pontos de Verificação (Máx. 3)</span>
            {itens.length < 3 && (
              <Label htmlFor="item-upload-sv" className="cursor-pointer">
                <Button type="button" size="sm" asChild>
                  <span>
                    <Camera className="mr-2 h-4 w-4" />
                    Adicionar Ponto
                  </span>
                </Button>
                <Input
                  id="item-upload-sv"
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
                        value={item.latitude}
                        onChange={(e) => handleUpdateItem(index, 'latitude', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={item.longitude}
                        onChange={(e) => handleUpdateItem(index, 'longitude', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Sentido</Label>
                      <Input
                        value={item.sentido}
                        onChange={(e) => handleUpdateItem(index, 'sentido', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>km</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.km}
                        onChange={(e) => handleUpdateItem(index, 'km', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCaptureItemLocation(index)}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Capturar Localização
                  </Button>

                  {/* Altura */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Altura (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.altura_m}
                        onChange={(e) => handleUpdateItem(index, 'altura_m', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.altura_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'altura_conforme', checked)}
                      />
                      <Label>Adequada</Label>
                    </div>
                    <div>
                      <Input
                        value={item.altura_obs}
                        onChange={(e) => handleUpdateItem(index, 'altura_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Afastamento */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Afastamento (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.afastamento_m}
                        onChange={(e) => handleUpdateItem(index, 'afastamento_m', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.afastamento_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'afastamento_conforme', checked)}
                      />
                      <Label>Adequado</Label>
                    </div>
                    <div>
                      <Input
                        value={item.afastamento_obs}
                        onChange={(e) => handleUpdateItem(index, 'afastamento_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Dimensões */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Dimensões (m)</Label>
                      <Input
                        value={item.dimensoes_m}
                        onChange={(e) => handleUpdateItem(index, 'dimensoes_m', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.dimensoes_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'dimensoes_conforme', checked)}
                      />
                      <Label>Conforme projeto</Label>
                    </div>
                    <div>
                      <Input
                        value={item.dimensoes_obs}
                        onChange={(e) => handleUpdateItem(index, 'dimensoes_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Letra */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Letra (mm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={item.letra_mm}
                        onChange={(e) => handleUpdateItem(index, 'letra_mm', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.letra_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'letra_conforme', checked)}
                      />
                      <Label>Diagramação conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.letra_obs}
                        onChange={(e) => handleUpdateItem(index, 'letra_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Data Imp Verso */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.data_imp_verso}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'data_imp_verso', checked)}
                      />
                      <Label>Dados no verso</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.data_imp_verso_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'data_imp_verso_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.data_imp_verso_obs}
                        onChange={(e) => handleUpdateItem(index, 'data_imp_verso_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Retrorrefletância */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Retro (cd/lux/m²)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={item.retro_sv}
                          readOnly
                          placeholder="Clique em Medir"
                          className="cursor-not-allowed bg-muted"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRetroModalContext({ itemIndex: index, campo: 'retro_sv' });
                            setRetroModalOpen(true);
                          }}
                        >
                          📊 Medir
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.retro_sv_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'retro_sv_conforme', checked)}
                      />
                      <Label>Acima do mínimo</Label>
                    </div>
                    <div>
                      <Input
                        value={item.retro_sv_obs}
                        onChange={(e) => handleUpdateItem(index, 'retro_sv_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  {/* Substrato, Película, Suporte, Qtde Suporte, Tipo Placa, Velocidade */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Substrato</Label>
                      <Input
                        value={item.substrato}
                        onChange={(e) => handleUpdateItem(index, 'substrato', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.substrato_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'substrato_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.substrato_obs}
                        onChange={(e) => handleUpdateItem(index, 'substrato_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Película</Label>
                      <Input
                        value={item.pelicula}
                        onChange={(e) => handleUpdateItem(index, 'pelicula', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.pelicula_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'pelicula_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.pelicula_obs}
                        onChange={(e) => handleUpdateItem(index, 'pelicula_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Suporte</Label>
                      <Input
                        value={item.suporte}
                        onChange={(e) => handleUpdateItem(index, 'suporte', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.suporte_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'suporte_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.suporte_obs}
                        onChange={(e) => handleUpdateItem(index, 'suporte_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Qtde Suporte</Label>
                      <Input
                        type="number"
                        value={item.qtde_suporte}
                        onChange={(e) => handleUpdateItem(index, 'qtde_suporte', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.qtde_suporte_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'qtde_suporte_conforme', checked)}
                      />
                      <Label>Conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.qtde_suporte_obs}
                        onChange={(e) => handleUpdateItem(index, 'qtde_suporte_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Código do Dispositivo (3.1.3.1)</Label>
                      <Select
                        value={item.tipo_placa}
                        onValueChange={(value) => handleUpdateItem(index, 'tipo_placa', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o código da placa" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {TODAS_PLACAS.map((placa) => (
                            <SelectItem key={placa.codigo} value={placa.codigo}>
                              {placa.codigo} - {placa.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={item.tipo_placa_conforme}
                        onCheckedChange={(checked) => handleUpdateItem(index, 'tipo_placa_conforme', checked)}
                      />
                      <Label>Posicionamento conforme</Label>
                    </div>
                    <div>
                      <Input
                        value={item.tipo_placa_obs}
                        onChange={(e) => handleUpdateItem(index, 'tipo_placa_obs', e.target.value)}
                        placeholder="Observações"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
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
                      <Label>Capina adequada</Label>
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

      <Button type="submit" className="w-full" disabled={uploading || !!fichaIdCriada}>
        {uploading ? "Salvando..." : "Salvar Ficha"}
      </Button>

      {/* Modal de Retrorefletividade */}
      <Dialog open={retroModalOpen} onOpenChange={setRetroModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Medição de Retrorefletividade SV - Ponto {retroModalContext ? retroModalContext.itemIndex + 1 : ''}
            </DialogTitle>
          </DialogHeader>
          {retroModalContext && (
            <RetrorrefletividadeModalSimples
              tipo="SV"
              campo="retro_sv"
              loteId={loteId}
              rodoviaId={rodoviaId}
              kmReferencia={itens[retroModalContext.itemIndex]?.km}
              onComplete={(resultado) => {
                const newItens = [...itens];
                newItens[retroModalContext.itemIndex].retro_sv = resultado.media.toFixed(1);
                newItens[retroModalContext.itemIndex].retro_sv_medicoes = resultado.medicoes;
                setItens(newItens);
                setRetroModalOpen(false);
                setRetroModalContext(null);
                toast.success(`Retro SV: ${resultado.media.toFixed(1)} cd/lux/m² (média de ${resultado.medicoes.filter(m => m > 0).length} leituras)`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </form>
  );
}
