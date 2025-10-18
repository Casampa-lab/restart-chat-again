import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MapPin, Check, Wrench } from "lucide-react";

interface IntervencoesTachaFormProps {
  tachaSelecionada?: {
    id: string;
    km_inicial: number;
    km_final: number;
    snv?: string;
  };
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
}

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  km_final: z.string().min(1, "KM final é obrigatório"),
  snv: z.string().optional(),
  descricao: z.string().optional(),
  corpo: z.string().optional(),
  refletivo: z.string().optional(),
  cor_refletivo: z.string().optional(),
  local_implantacao: z.string().optional(),
  quantidade: z.string().optional(),
  espacamento_m: z.string().optional(),
  observacao: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
});

export function IntervencoesTachaForm({ 
  tachaSelecionada, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: IntervencoesTachaFormProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const capturarCoordenadas = () => {
    setIsCapturing(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toString();
          const lng = position.coords.longitude.toString();
          form.setValue("latitude", lat);
          form.setValue("longitude", lng);
          toast.success(`Coordenadas capturadas: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
          setIsCapturing(false);
        },
        (error) => {
          toast.error("Erro ao capturar localização");
          setIsCapturing(false);
        }
      );
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      km_inicial: "",
      km_final: "",
      snv: "",
      descricao: "",
      corpo: "",
      refletivo: "",
      cor_refletivo: "",
      local_implantacao: "",
      quantidade: "",
      espacamento_m: "",
      observacao: "",
      latitude: "",
      longitude: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  // Preencher formulário com dados da tacha selecionada
  useEffect(() => {
    if (tachaSelecionada && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        km_inicial: tachaSelecionada.km_inicial?.toString() || "",
        km_final: tachaSelecionada.km_final?.toString() || "",
        snv: (tachaSelecionada as any).snv || "",
        descricao: (tachaSelecionada as any).descricao || "",
        corpo: (tachaSelecionada as any).corpo || "",
        refletivo: (tachaSelecionada as any).refletivo || "",
        cor_refletivo: (tachaSelecionada as any).cor_refletivo || "",
        local_implantacao: (tachaSelecionada as any).local_implantacao || "",
        quantidade: (tachaSelecionada as any).quantidade?.toString() || "",
        espacamento_m: (tachaSelecionada as any).espacamento_m?.toString() || "",
        observacao: "",
        latitude: "",
        longitude: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });
    }
  }, [tachaSelecionada, modo, form]);

  // Propagar mudanças em tempo real no modo controlado
  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((value) => {
        onDataChange(value);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, modo, onDataChange]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (modo === 'controlado') {
      if (onDataChange) onDataChange(values);
      return;
    }
    
    if (!tachaSelecionada) {
      toast.error("Selecione uma tacha do inventário primeiro");
      return;
    }

    try {
      const { error } = await supabase.from("ficha_tachas_intervencoes").insert({
        ficha_tachas_id: tachaSelecionada.id,
        data_intervencao: values.data_intervencao,
        motivo: values.motivo,
        km_inicial: values.km_inicial ? parseFloat(values.km_inicial) : null,
        km_final: values.km_final ? parseFloat(values.km_final) : null,
        snv: values.snv || null,
        descricao: values.descricao || null,
        corpo: values.corpo || null,
        refletivo: values.refletivo || null,
        cor_refletivo: values.cor_refletivo || null,
        local_implantacao: values.local_implantacao || null,
        quantidade: values.quantidade ? parseInt(values.quantidade) : null,
        espacamento_m: values.espacamento_m ? parseFloat(values.espacamento_m) : null,
        latitude: values.latitude ? parseFloat(values.latitude) : null,
        longitude: values.longitude ? parseFloat(values.longitude) : null,
        observacao: values.observacao || null,
        fora_plano_manutencao: values.fora_plano_manutencao,
        justificativa_fora_plano: values.justificativa_fora_plano || null,
      });

      if (error) throw error;

      toast.success("Intervenção em tacha registrada com sucesso!");
      form.reset();
      onIntervencaoRegistrada?.();
    } catch (error: any) {
      toast.error("Erro ao salvar intervenção: " + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Tachas Refletivas</CardTitle>
        <CardDescription>
          {tachaSelecionada 
            ? `Registrando intervenção para tachas entre KM ${tachaSelecionada.km_inicial} - ${tachaSelecionada.km_final}${tachaSelecionada.snv ? ` (SNV: ${tachaSelecionada.snv})` : ''}`
            : "Selecione uma tacha do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* ========== SEÇÃO 1: DADOS BÁSICOS DA INTERVENÇÃO ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_intervencao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Intervenção *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Intervenção *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Instalação">Instalação</SelectItem>
                        <SelectItem value="Substituição">Substituição</SelectItem>
                        <SelectItem value="Remoção">Remoção</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="km_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Inicial *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="km_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Final *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="0.000" {...field} />
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
                      <Input placeholder="Ex: 116BMG1010" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ========== SEÇÃO 2: LOCALIZAÇÃO GPS (VERDE) ========== */}
            <div className="space-y-4 border-l-4 border-green-500 pl-4 bg-green-50/50 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-700 text-lg">Localização GPS</h3>
              </div>
              
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={capturarCoordenadas}
                  disabled={isCapturing}
                  className="w-full"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Capturando coordenadas...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Capturar Coordenadas Automáticas
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder="-15.123456" {...field} />
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
                          <Input type="number" step="any" placeholder="-47.123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(form.watch("latitude") && form.watch("longitude")) && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-2 rounded">
                    <Check className="h-4 w-4" />
                    <span>Coordenadas capturadas com sucesso</span>
                  </div>
                )}
              </div>
            </div>

            {/* ========== SEÇÃO 3: CARACTERÍSTICAS DAS TACHAS (AZUL) ========== */}
            <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary text-lg">Características das Tachas</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="corpo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corpo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Plástico">Plástico</SelectItem>
                          <SelectItem value="Metal">Metal</SelectItem>
                          <SelectItem value="Cerâmico">Cerâmico</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="refletivo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refletivo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="Bidirecional">Bidirecional</SelectItem>
                          <SelectItem value="Monodirecional">Monodirecional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cor_refletivo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Refletivo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Branca">Branca</SelectItem>
                          <SelectItem value="Amarela">Amarela</SelectItem>
                          <SelectItem value="Branca/Vermelha">Branca/Vermelha</SelectItem>
                          <SelectItem value="Vermelha">Vermelha</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="local_implantacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de Implantação</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BD">BD - Bordo Direito</SelectItem>
                          <SelectItem value="BE">BE - Bordo Esquerdo</SelectItem>
                          <SelectItem value="E">E - Eixo</SelectItem>
                          <SelectItem value="E1">E1 - Eixo 1</SelectItem>
                          <SelectItem value="CD">CD - Centro Direita</SelectItem>
                          <SelectItem value="CE">CE - Centro Esquerda</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="espacamento_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Espaçamento (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 8.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ========== SEÇÃO 4: DESCRIÇÃO E OBSERVAÇÕES ========== */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Dispositivo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Tacha monodirecional">Tacha monodirecional</SelectItem>
                        <SelectItem value="Tacha bidirecional">Tacha bidirecional</SelectItem>
                        <SelectItem value="Tachão">Tachão</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fora_plano_manutencao"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Fora do Plano de Manutenção</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("fora_plano_manutencao") && (
                <FormField
                  control={form.control}
                  name="justificativa_fora_plano"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justificativa *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Explique o motivo da intervenção fora do plano..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {!hideSubmitButton && (
              <Button type="submit" className="w-full" disabled={!tachaSelecionada && modo !== 'controlado'}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Intervenção
              </Button>
            )}
          </form>
    </Form>
      </CardContent>
    </Card>
  );
}