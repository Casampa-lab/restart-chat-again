import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Check, Milestone } from "lucide-react";

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  snv: z.string().optional(),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  km_inicial: z.string().min(1, "km Inicial é obrigatório"),
  km_final: z.string().min(1, "km Final é obrigatório"),
  local_implantacao: z.string().optional(),
  espacamento_m: z.string().optional(),
  extensao_km: z.string().optional(),
  cor_corpo: z.string().min(1, "Cor do corpo é obrigatória"),
  cor_refletivo: z.string().optional(),
  tipo_refletivo: z.string().optional(),
  quantidade: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IntervencoesCilindrosFormProps {
  cilindroSelecionado?: {
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

export function IntervencoesCilindrosForm({ 
  cilindroSelecionado, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: IntervencoesCilindrosFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      snv: "",
      motivo: "",
      km_inicial: "",
      km_final: "",
      local_implantacao: "",
      espacamento_m: "",
      extensao_km: "",
      cor_corpo: "",
      cor_refletivo: "",
      tipo_refletivo: "",
      quantidade: "",
      latitude: "",
      longitude: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  // Preencher formulário com dados do cilindro selecionado
  useEffect(() => {
    if (cilindroSelecionado && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        snv: (cilindroSelecionado as any).snv || "",
        motivo: "",
        km_inicial: cilindroSelecionado.km_inicial?.toString() || "",
        km_final: cilindroSelecionado.km_final?.toString() || "",
        local_implantacao: (cilindroSelecionado as any).local_implantacao || "",
        espacamento_m: (cilindroSelecionado as any).espacamento_m?.toString() || "",
        extensao_km: (cilindroSelecionado as any).extensao_km?.toString() || "",
        cor_corpo: (cilindroSelecionado as any).cor_corpo || "",
        cor_refletivo: (cilindroSelecionado as any).cor_refletivo || "",
        tipo_refletivo: (cilindroSelecionado as any).tipo_refletivo || "",
        quantidade: (cilindroSelecionado as any).quantidade?.toString() || "",
        latitude: "",
        longitude: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });
    }
  }, [cilindroSelecionado, modo, form]);

  // Propagar mudanças em tempo real no modo controlado
  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((value) => {
        onDataChange(value);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, modo, onDataChange]);

  const onSubmit = async (data: FormData) => {
    if (modo === 'controlado') {
      if (onDataChange) onDataChange(data);
      return;
    }
    
    if (!cilindroSelecionado) {
      toast.error("Selecione um cilindro do inventário primeiro");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("ficha_cilindros_intervencoes")
        .insert({
          ficha_cilindros_id: cilindroSelecionado.id,
          data_intervencao: data.data_intervencao,
          motivo: data.motivo,
          km_inicial: data.km_inicial ? parseFloat(data.km_inicial) : null,
          km_final: data.km_final ? parseFloat(data.km_final) : null,
          snv: data.snv || null,
          local_implantacao: data.local_implantacao || null,
          espacamento_m: data.espacamento_m ? parseFloat(data.espacamento_m) : null,
          extensao_km: data.extensao_km ? parseFloat(data.extensao_km) : null,
          cor_corpo: data.cor_corpo || null,
          cor_refletivo: data.cor_refletivo || null,
          tipo_refletivo: data.tipo_refletivo || null,
          quantidade: data.quantidade ? parseInt(data.quantidade) : null,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          fora_plano_manutencao: data.fora_plano_manutencao,
          justificativa_fora_plano: data.justificativa_fora_plano || null,
        });

      if (error) throw error;

      toast.success("Intervenção registrada com sucesso!");
      form.reset();
      onIntervencaoRegistrada?.();
    } catch (error: any) {
      console.error("Erro ao registrar intervenção:", error);
      toast.error("Erro ao registrar intervenção: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Cilindros Delimitadores</CardTitle>
        <CardDescription>
          {cilindroSelecionado 
            ? `Registrando intervenção para cilindro entre km ${cilindroSelecionado.km_inicial} - ${cilindroSelecionado.km_final}${cilindroSelecionado.snv ? ` (SNV: ${cilindroSelecionado.snv})` : ''}`
            : "Selecione um cilindro do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Dados Básicos da Intervenção */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_intervencao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Intervenção</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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

              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Intervenção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Implantação">Implantação</SelectItem>
                        <SelectItem value="Substituição">Substituição</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Remoção">Remoção</SelectItem>
                        <SelectItem value="Inclusão por Necessidade de Campo">Inclusão por Necessidade de Campo</SelectItem>
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
                    <FormLabel>km Inicial</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="Ex: 100.500" 
                        {...field} 
                      />
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
                    <FormLabel>km Final</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="Ex: 100.800" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Localização GPS - Apenas em modo normal */}
            {modo === 'normal' && (
              <div className="md:col-span-2 space-y-4 border-l-4 border-green-500 pl-4 bg-green-50/50 py-4 rounded-r-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-700 text-lg">Localização GPS</h3>
                </div>
                
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={capturarCoordenadas}
                    disabled={isCapturing}
                    variant="outline"
                    className="w-full border-green-500 text-green-700 hover:bg-green-50"
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

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="-15.123456"
                              className="border-green-300 focus:border-green-500"
                              {...field}
                            />
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
                            <Input
                              type="number"
                              step="any"
                              placeholder="-47.123456"
                              className="border-green-300 focus:border-green-500"
                              {...field}
                            />
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
            )}

            {/* Características dos Cilindros */}
            <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <Milestone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary text-lg">Características dos Cilindros</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cor_corpo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor (Corpo)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Amarela">Amarela</SelectItem>
                          <SelectItem value="Branca">Branca</SelectItem>
                          <SelectItem value="Preta">Preta</SelectItem>
                          <SelectItem value="Laranja">Laranja</SelectItem>
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
                      <FormLabel>Cor (Refletivo)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Amarela">Amarela</SelectItem>
                          <SelectItem value="Branca">Branca</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_refletivo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Refletivo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="III">III</SelectItem>
                          <SelectItem value="X">X</SelectItem>
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
                      <FormLabel>Quantidade (und)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 100" 
                          {...field} 
                        />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Eixo">Eixo</SelectItem>
                          <SelectItem value="Bordo">Bordo</SelectItem>
                          <SelectItem value="Canteiro Central">Canteiro Central</SelectItem>
                          <SelectItem value="Acostamento">Acostamento</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 4.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="extensao_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extensão (km)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001" 
                          placeholder="Ex: 0.500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Observações e Justificativas */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="fora_plano_manutencao"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Fora do Plano de Manutenção
                      </FormLabel>
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
                      <FormLabel>Justificativa</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explique o motivo da intervenção estar fora do plano de manutenção"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {!hideSubmitButton && (
              <Button type="submit" className="w-full" disabled={isSubmitting || (!cilindroSelecionado && modo !== 'controlado')}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Intervenção
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}