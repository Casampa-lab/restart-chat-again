import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fichaPlacaSchema = z.object({
  data_implantacao: z.string().optional(),
  data_vistoria: z.string().min(1, "Data de vistoria obrigatória"),
  codigo: z.string().optional(),
  modelo: z.string().optional(),
  tipo: z.string().optional(),
  velocidade: z.string().optional(),
  descricao: z.string().optional(),
  uf: z.string().optional(),
  br: z.string().optional(),
  snv: z.string().optional(),
  km: z.string().optional(),
  lado: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  suporte: z.string().optional(),
  qtde_suporte: z.string().optional(),
  substrato: z.string().optional(),
  pelicula: z.string().optional(),
  altura_m: z.string().optional(),
  distancia_m: z.string().optional(),
  dimensoes_mm: z.string().optional(),
  area_m2: z.string().optional(),
  retrorrefletividade: z.string().optional(),
});

const danoSchema = z.object({
  problema: z.string().min(1, "Problema obrigatório"),
  data_ocorrencia: z.string().min(1, "Data obrigatória"),
  vandalismo: z.boolean(),
  solucao: z.string().optional(),
  observacao: z.string().optional(),
});

const intervencaoSchema = z.object({
  motivo: z.string().min(1, "Motivo obrigatório"),
  data_intervencao: z.string().min(1, "Data obrigatória"),
  placa_recuperada: z.boolean(),
  suporte: z.string().optional(),
  substrato: z.string().optional(),
  pelicula: z.string().optional(),
  retro_fundo: z.string().optional(),
  retro_orla_legenda: z.string().optional(),
});

interface FichaPlacaFormProps {
  loteId: string;
  rodoviaId: string;
  onSuccess?: () => void;
}

type DanoFormValues = z.infer<typeof danoSchema>;
type IntervencaoFormValues = z.infer<typeof intervencaoSchema>;

export function FichaPlacaForm({ loteId, rodoviaId, onSuccess }: FichaPlacaFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<{
    identificacao?: File;
    frontal?: File;
    lateral?: File;
    posterior?: File;
    base?: File;
  }>({});
  const [danos, setDanos] = useState<DanoFormValues[]>([]);
  const [intervencoes, setIntervencoes] = useState<IntervencaoFormValues[]>([]);
  const [showDanoForm, setShowDanoForm] = useState(false);
  const [showIntervencaoForm, setShowIntervencaoForm] = useState(false);

  const form = useForm<z.infer<typeof fichaPlacaSchema>>({
    resolver: zodResolver(fichaPlacaSchema),
    defaultValues: {},
  });

  const danoForm = useForm<DanoFormValues>({
    resolver: zodResolver(danoSchema),
    defaultValues: { vandalismo: false },
  });

  const intervencaoForm = useForm<IntervencaoFormValues>({
    resolver: zodResolver(intervencaoSchema),
    defaultValues: { placa_recuperada: false },
  });

  const handlePhotoChange = (type: keyof typeof photos, file: File | undefined) => {
    setPhotos(prev => ({ ...prev, [type]: file }));
  };

  const uploadPhoto = async (file: File, type: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('placa-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('placa-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const addDano = (data: DanoFormValues) => {
    setDanos([...danos, data]);
    danoForm.reset({ vandalismo: false });
    setShowDanoForm(false);
    toast({ title: "Dano adicionado com sucesso" });
  };

  const removeDano = (index: number) => {
    setDanos(danos.filter((_, i) => i !== index));
  };

  const addIntervencao = (data: IntervencaoFormValues) => {
    setIntervencoes([...intervencoes, data]);
    intervencaoForm.reset({ placa_recuperada: false });
    setShowIntervencaoForm(false);
    toast({ title: "Intervenção adicionada com sucesso" });
  };

  const removeIntervencao = (index: number) => {
    setIntervencoes(intervencoes.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof fichaPlacaSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload photos
      const photoUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(photos)) {
        if (file) {
          photoUrls[key] = await uploadPhoto(file, key);
        }
      }

      // Insert main ficha
      const { data: ficha, error: fichaError } = await supabase
        .from('ficha_placa')
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_implantacao: values.data_implantacao || null,
          data_vistoria: values.data_vistoria,
          foto_identificacao_url: photoUrls.identificacao || null,
          codigo: values.codigo || null,
          modelo: values.modelo || null,
          tipo: values.tipo || null,
          velocidade: values.velocidade || null,
          descricao: values.descricao || null,
          uf: values.uf || null,
          br: values.br || null,
          snv: values.snv || null,
          km: values.km ? parseFloat(values.km) : null,
          lado: values.lado || null,
          latitude: values.latitude ? parseFloat(values.latitude) : null,
          longitude: values.longitude ? parseFloat(values.longitude) : null,
          suporte: values.suporte || null,
          qtde_suporte: values.qtde_suporte ? parseInt(values.qtde_suporte) : null,
          substrato: values.substrato || null,
          pelicula: values.pelicula || null,
          altura_m: values.altura_m ? parseFloat(values.altura_m) : null,
          distancia_m: values.distancia_m ? parseFloat(values.distancia_m) : null,
          dimensoes_mm: values.dimensoes_mm || null,
          area_m2: values.area_m2 ? parseFloat(values.area_m2) : null,
          retrorrefletividade: values.retrorrefletividade ? parseFloat(values.retrorrefletividade) : null,
          foto_frontal_url: photoUrls.frontal || null,
          foto_lateral_url: photoUrls.lateral || null,
          foto_posterior_url: photoUrls.posterior || null,
          foto_base_url: photoUrls.base || null,
        })
        .select()
        .single();

      if (fichaError) throw fichaError;

      // Insert danos
      if (danos.length > 0) {
        const { error: danosError } = await supabase
          .from('ficha_placa_danos')
          .insert(danos.map(dano => ({
            ficha_placa_id: ficha.id,
            problema: dano.problema,
            data_ocorrencia: dano.data_ocorrencia,
            vandalismo: dano.vandalismo,
            solucao: dano.solucao || null,
            observacao: dano.observacao || null,
          })));

        if (danosError) throw danosError;
      }

      // Insert intervencoes
      if (intervencoes.length > 0) {
        const { error: intervencoesError } = await supabase
          .from('ficha_placa_intervencoes')
          .insert(intervencoes.map(intervencao => ({
            ficha_placa_id: ficha.id,
            motivo: intervencao.motivo,
            data_intervencao: intervencao.data_intervencao,
            placa_recuperada: intervencao.placa_recuperada,
            suporte: intervencao.suporte || null,
            substrato: intervencao.substrato || null,
            pelicula: intervencao.pelicula || null,
            retro_fundo: intervencao.retro_fundo ? parseFloat(intervencao.retro_fundo) : null,
            retro_orla_legenda: intervencao.retro_orla_legenda ? parseFloat(intervencao.retro_orla_legenda) : null,
          })));

        if (intervencoesError) throw intervencoesError;
      }

      toast({
        title: "Ficha de placa registrada com sucesso!",
      });

      form.reset();
      setPhotos({});
      setDanos([]);
      setIntervencoes([]);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar ficha de placa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="localizacao">Localização</TabsTrigger>
              <TabsTrigger value="dados">Dados da Placa</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Identificação</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="data_implantacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Implantação</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="data_vistoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vistoria *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Foto Identificação</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoChange('identificacao', e.target.files?.[0])}
                    />
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="velocidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Velocidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="localizacao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="br"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BR</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="snv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SNV</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="km"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KM</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Direito">Direito</SelectItem>
                            <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                            <SelectItem value="Centro">Centro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.000001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.000001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dados" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Características da Placa</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="suporte"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suporte</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="qtde_suporte"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qtde Suporte</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="substrato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Substrato</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pelicula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Película</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altura_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altura (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="distancia_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distância (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dimensoes_mm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensões (mm)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ex: 800x600" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="area_m2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área (m²)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="retrorrefletividade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retrorrefletividade (mcd/m².lx)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documentação Fotográfica</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormItem>
                    <FormLabel>Foto Frontal</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoChange('frontal', e.target.files?.[0])}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>Foto Lateral</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoChange('lateral', e.target.files?.[0])}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>Foto Posterior</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoChange('posterior', e.target.files?.[0])}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>Foto Base</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoChange('base', e.target.files?.[0])}
                    />
                  </FormItem>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Registro de Danos</span>
                    <Button type="button" size="sm" onClick={() => setShowDanoForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Dano
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showDanoForm && (
                    <Card>
                      <CardContent className="pt-6">
                        <Form {...danoForm}>
                          <form onSubmit={danoForm.handleSubmit(addDano)} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={danoForm.control}
                                name="problema"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Problema *</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={danoForm.control}
                                name="data_ocorrencia"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Data Ocorrência *</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={danoForm.control}
                                name="vandalismo"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel>Vandalismo</FormLabel>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={danoForm.control}
                                name="solucao"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Solução</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={danoForm.control}
                                name="observacao"
                                render={({ field }) => (
                                  <FormItem className="md:col-span-2">
                                    <FormLabel>Observação</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit">Adicionar</Button>
                              <Button type="button" variant="outline" onClick={() => setShowDanoForm(false)}>
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  )}

                  {danos.map((dano, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{dano.problema}</p>
                            <p className="text-sm text-muted-foreground">
                              Data: {new Date(dano.data_ocorrencia).toLocaleDateString('pt-BR')}
                            </p>
                            {dano.vandalismo && <p className="text-sm text-destructive">Vandalismo</p>}
                            {dano.solucao && <p className="text-sm">Solução: {dano.solucao}</p>}
                            {dano.observacao && <p className="text-sm">Obs: {dano.observacao}</p>}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDano(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Registro de Intervenções</span>
                    <Button type="button" size="sm" onClick={() => setShowIntervencaoForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Intervenção
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showIntervencaoForm && (
                    <Card>
                      <CardContent className="pt-6">
                        <Form {...intervencaoForm}>
                          <form onSubmit={intervencaoForm.handleSubmit(addIntervencao)} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={intervencaoForm.control}
                                name="motivo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Motivo *</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={intervencaoForm.control}
                                name="data_intervencao"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Data Intervenção *</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={intervencaoForm.control}
                                name="placa_recuperada"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel>Placa Recuperada</FormLabel>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={intervencaoForm.control}
                                name="suporte"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Suporte</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={intervencaoForm.control}
                                name="substrato"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Substrato</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={intervencaoForm.control}
                                name="pelicula"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Película</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={intervencaoForm.control}
                                name="retro_fundo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Retrorrefletância Fundo</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={intervencaoForm.control}
                                name="retro_orla_legenda"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Retrorrefletância Orla/Legenda</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit">Adicionar</Button>
                              <Button type="button" variant="outline" onClick={() => setShowIntervencaoForm(false)}>
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  )}

                  {intervencoes.map((intervencao, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{intervencao.motivo}</p>
                            <p className="text-sm text-muted-foreground">
                              Data: {new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}
                            </p>
                            {intervencao.placa_recuperada && <p className="text-sm text-green-600">Placa Recuperada</p>}
                            {intervencao.suporte && <p className="text-sm">Suporte: {intervencao.suporte}</p>}
                            {intervencao.substrato && <p className="text-sm">Substrato: {intervencao.substrato}</p>}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIntervencao(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Ficha de Placa
          </Button>
        </form>
      </Form>
    </div>
  );
}