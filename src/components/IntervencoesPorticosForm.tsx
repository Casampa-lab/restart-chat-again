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
import { Loader2, Building2, Lock, Info } from "lucide-react";
import { useTipoOrigem } from "@/hooks/useTipoOrigem";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { TIPOS_ORIGEM, LABELS_TIPO_ORIGEM } from "@/constants/camposEstruturais";

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  snv: z.string().optional(),
  descricao: z.string().optional(),
  tipo: z.string().optional(),
  altura_livre_m: z.string().optional(),
  vao_horizontal_m: z.string().optional(),
  observacao: z.string().optional(),
  latitude_inicial: z.string().optional(),
  longitude_inicial: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IntervencoesPorticosFormProps {
  porticoSelecionado?: {
    id: string;
    km_inicial: number;
    snv?: string;
    tipo: string;
  };
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
  modoOperacao?: 'manutencao' | 'execucao' | null;
}

export function IntervencoesPorticosForm({ 
  porticoSelecionado, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId,
  modoOperacao
}: IntervencoesPorticosFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tipoOrigem, setTipoOrigem, isCampoEstruturalBloqueado, isManutencaoRotineira } = useTipoOrigem('porticos');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      km_inicial: "",
      tipo: "",
      altura_livre_m: "",
      vao_horizontal_m: "",
      observacao: "",
    latitude_inicial: "",
    longitude_inicial: "",
      descricao: "",
    },
  });

  // Preencher formulário com dados do pórtico selecionado
  useEffect(() => {
    if (porticoSelecionado && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        km_inicial: porticoSelecionado.km_inicial?.toString() || "",
        tipo: porticoSelecionado.tipo || "",
        altura_livre_m: (porticoSelecionado as any).altura_livre_m?.toString() || "",
        vao_horizontal_m: (porticoSelecionado as any).vao_horizontal_m?.toString() || "",
        descricao: (porticoSelecionado as any).descricao || "",
        observacao: "",
        latitude_inicial: "",
        longitude_inicial: "",
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
    
    // Validação: Manutenção Rotineira exige pórtico existente
    if (isManutencaoRotineira && !porticoSelecionado) {
      toast.error("Para Manutenção Rotineira, selecione um pórtico do inventário primeiro");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("ficha_porticos_intervencoes")
        .insert({
          ficha_porticos_id: porticoSelecionado?.id || null,
          data_intervencao: data.data_intervencao,
          motivo: data.motivo,
          km_inicial: data.km_inicial ? parseFloat(data.km_inicial) : null,
          snv: data.snv || null,
          descricao: data.descricao || null,
          tipo: data.tipo || null,
          altura_livre_m: data.altura_livre_m ? parseFloat(data.altura_livre_m) : null,
          vao_horizontal_m: data.vao_horizontal_m ? parseFloat(data.vao_horizontal_m) : null,
        latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
        longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
          observacao: data.observacao || null,
          tipo_origem: tipoOrigem,
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
            ? `Registrando intervenção para ${porticoSelecionado.tipo} no km ${porticoSelecionado.km_inicial}${porticoSelecionado.snv ? ` (SNV: ${porticoSelecionado.snv})` : ''}`
            : "Selecione um pórtico do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
          <Label className="text-base font-semibold">Tipo de Intervenção</Label>
          <RadioGroup value={tipoOrigem} onValueChange={setTipoOrigem}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manutencao_rotineira" id="pre-portico" />
              <Label htmlFor="pre-portico" className="flex items-center gap-2 cursor-pointer font-normal">
                🟡 {LABELS_TIPO_ORIGEM.manutencao_rotineira}
                <Badge variant="outline" className="text-xs">Campos estruturais bloqueados</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="execucao" id="exec-portico" />
              <Label htmlFor="exec-portico" className="cursor-pointer font-normal">
                🟢 {LABELS_TIPO_ORIGEM.execucao}
              </Label>
            </div>
          </RadioGroup>
          {isManutencaoRotineira && (
            <Alert><Info className="h-4 w-4" /><AlertDescription>Base normativa: IN 3/2025, Art. 17-19.</AlertDescription></Alert>
          )}
        </div>
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
                      <FormLabel className="flex items-center gap-2">
                        Tipo de Estrutura
                        {isCampoEstruturalBloqueado('tipo') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isCampoEstruturalBloqueado('tipo')}
                      >
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
                      <FormLabel className="flex items-center gap-2">
                        Altura Livre (m)
                        {isCampoEstruturalBloqueado('altura_livre_m') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 7.25" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('altura_livre_m')}
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
                      <FormLabel className="flex items-center gap-2">
                        Vão Horizontal (m)
                        {isCampoEstruturalBloqueado('vao_horizontal_m') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 15.90" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('vao_horizontal_m')}
                          className="border-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SEÇÃO 4: Observações */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Descrição do Pórtico
                      {isCampoEstruturalBloqueado('descricao') && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição adicional sobre o pórtico..."
                        className="min-h-[80px]"
                        {...field}
                        disabled={isCampoEstruturalBloqueado('descricao')}
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
            </div>

            {!hideSubmitButton && (
              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={
                  isSubmitting || 
                  (isManutencaoRotineira && !porticoSelecionado) || 
                  modo === 'controlado'
                }
              >
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
