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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  cor_corpo: z.string().min(1, "Cor do corpo é obrigatória"),
  cor_refletivo: z.string().optional(),
  tipo_refletivo: z.string().optional(),
  quantidade: z.string().optional(),
  foto_url: z.string().optional(),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      cor_corpo: "",
      cor_refletivo: "",
      tipo_refletivo: "",
      quantidade: "",
      foto_url: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  // Preencher formulário com dados do cilindro selecionado
  useEffect(() => {
    if (cilindroSelecionado && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        cor_corpo: (cilindroSelecionado as any).cor_corpo || "",
        cor_refletivo: (cilindroSelecionado as any).cor_refletivo || "",
        tipo_refletivo: (cilindroSelecionado as any).tipo_refletivo || "",
        quantidade: (cilindroSelecionado as any).quantidade?.toString() || "",
        foto_url: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });
    }
  }, [cilindroSelecionado, modo, form]);

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
          cor_corpo: data.cor_corpo || null,
          cor_refletivo: data.cor_refletivo || null,
          tipo_refletivo: data.tipo_refletivo || null,
          quantidade: data.quantidade ? parseInt(data.quantidade) : null,
          foto_url: data.foto_url || null,
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
            ? `Registrando intervenção para cilindro entre KM ${cilindroSelecionado.km_inicial} - ${cilindroSelecionado.km_final}${cilindroSelecionado.snv ? ` (SNV: ${cilindroSelecionado.snv})` : ''}`
            : "Selecione um cilindro do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="cor_corpo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor (Corpo) *</FormLabel>
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
                      <Input type="number" placeholder="Ex: 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="foto_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Foto</FormLabel>
                  <FormControl>
                    <Input placeholder="Caminho da foto no storage..." {...field} />
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