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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Check, Building2 } from "lucide-react";

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  km: z.string().min(1, "KM é obrigatório"),
  snv: z.string().optional(),
  descricao: z.string().optional(),
  tipo: z.string().optional(),
  altura_livre_m: z.string().optional(),
  vao_horizontal_m: z.string().optional(),
  observacao: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IntervencoesPorticosFormProps {
  porticoSelecionado?: {
    id: string;
    km: number;
    snv?: string;
    tipo: string;
  };
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
}

export function IntervencoesPorticosForm({ 
  porticoSelecionado, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: IntervencoesPorticosFormProps) {
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
      motivo: "",
      km: "",
      tipo: "",
      altura_livre_m: "",
      vao_horizontal_m: "",
      observacao: "",
      latitude: "",
      longitude: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  // Preencher formulário com dados do pórtico selecionado
  useEffect(() => {
    if (porticoSelecionado && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        tipo: porticoSelecionado.tipo || "",
        altura_livre_m: (porticoSelecionado as any).altura_livre_m?.toString() || "",
        vao_horizontal_m: (porticoSelecionado as any).vao_horizontal_m?.toString() || "",
        observacao: "",
        latitude: "",
        longitude: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });
    }
  }, [porticoSelecionado, modo, form]);

  // Em modo controlado, repassar dados em tempo real
  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((values) => {
        // Só repassar se campos obrigatórios estiverem preenchidos
        if (values.data_intervencao && values.motivo) {
          onDataChange(values);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [modo, onDataChange, form]);

  const onSubmit = async (data: FormData) => {
    if (modo === 'controlado') {
      if (onDataChange) onDataChange(data);
      return;
    }
    
    if (!porticoSelecionado) {
      toast.error("Selecione um pórtico do inventário primeiro");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("ficha_porticos_intervencoes")
        .insert({
          ficha_porticos_id: porticoSelecionado.id,
          data_intervencao: data.data_intervencao,
          motivo: data.motivo,
          km: data.km ? parseFloat(data.km) : null,
          snv: data.snv || null,
          descricao: data.descricao || null,
          tipo: data.tipo || null,
          altura_livre_m: data.altura_livre_m ? parseFloat(data.altura_livre_m) : null,
          vao_horizontal_m: data.vao_horizontal_m ? parseFloat(data.vao_horizontal_m) : null,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          observacao: data.observacao || null,
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
        <CardTitle>Intervenção em Pórticos, Semipórticos e Braços</CardTitle>
        <CardDescription>
          {porticoSelecionado 
            ? `Registrando intervenção para ${porticoSelecionado.tipo} no km ${porticoSelecionado.km}${porticoSelecionado.snv ? ` (SNV: ${porticoSelecionado.snv})` : ''}`
            : "Selecione um pórtico do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* SEÇÃO 1: Dados Básicos da Intervenção */}
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Implantação">Implantação</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Substituição">Substituição</SelectItem>
                        <SelectItem value="Remoção">Remoção</SelectItem>
                        <SelectItem value="Recuperação">Recuperação</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM *</FormLabel>
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
                    <FormLabel>SNV (Segmento Nacional de Vias)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: BR-040-200-350" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SEÇÃO 2: Localização GPS */}
            <div className="md:col-span-2 space-y-4 border-l-4 border-green-500 pl-4 bg-green-50/50 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-700 text-lg">Localização GPS</h3>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={capturarCoordenadas}
                disabled={isCapturing}
                className="w-full hover:bg-green-50 hover:border-green-500 transition-colors"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Capturando localização...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Capturar Coordenadas Automáticas
                  </>
                )}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {...field}
                          className="border-green-200 focus:border-green-500"
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
                          {...field}
                          className="border-green-200 focus:border-green-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("latitude") && form.watch("longitude") && (
                <div className="flex items-center gap-2 text-green-700 text-sm bg-green-100/50 p-2 rounded-md">
                  <Check className="h-4 w-4" />
                  <span>Coordenadas capturadas com sucesso</span>
                </div>
              )}
            </div>

            {/* SEÇÃO 3: Características da Estrutura */}
            <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary text-lg">Características da Estrutura</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Estrutura</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-primary/20">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pórtico">Pórtico</SelectItem>
                          <SelectItem value="Semipórtico (BS)">Semipórtico (BS)</SelectItem>
                          <SelectItem value="Semipórtico (BD)">Semipórtico (BD)</SelectItem>
                          <SelectItem value="Braço Projetado">Braço Projetado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="altura_livre_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura Livre (m)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 7.25" 
                          {...field}
                          className="border-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vao_horizontal_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vão Horizontal (m)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 15.90" 
                          {...field}
                          className="border-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SEÇÃO 4: Observações e Justificativas */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Pórtico</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição adicional sobre o pórtico..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
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
                      <Textarea 
                        placeholder="Observações sobre a intervenção..." 
                        {...field}
                        className="min-h-[100px]"
                      />
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
                        <Textarea 
                          placeholder="Explique o motivo da intervenção fora do plano..." 
                          {...field}
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {!hideSubmitButton && (
              <Button type="submit" className="w-full mt-6" disabled={isSubmitting || (!porticoSelecionado && modo !== 'controlado')}>
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