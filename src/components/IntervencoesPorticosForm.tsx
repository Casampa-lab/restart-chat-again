import { useState } from "react";
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
  tipo: z.string().optional(),
  altura_livre_m: z.string().optional(),
  vao_horizontal_m: z.string().optional(),
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
}

export function IntervencoesPorticosForm({ porticoSelecionado, onIntervencaoRegistrada }: IntervencoesPorticosFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      tipo: "",
      altura_livre_m: "",
      vao_horizontal_m: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  const onSubmit = async (data: FormData) => {
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
          tipo: data.tipo || null,
          altura_livre_m: data.altura_livre_m ? parseFloat(data.altura_livre_m) : null,
          vao_horizontal_m: data.vao_horizontal_m ? parseFloat(data.vao_horizontal_m) : null,
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
            ? `Registrando intervenção para ${porticoSelecionado.tipo} no KM ${porticoSelecionado.km}${porticoSelecionado.snv ? ` (SNV: ${porticoSelecionado.snv})` : ''}`
            : "Selecione um pórtico do inventário para registrar intervenção"
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
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Estrutura</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                      <Input type="number" step="0.01" placeholder="Ex: 7.25" {...field} />
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
                      <Input type="number" step="0.01" placeholder="Ex: 15.90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <Button type="submit" className="w-full" disabled={isSubmitting || !porticoSelecionado}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Intervenção
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}