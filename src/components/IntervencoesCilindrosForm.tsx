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
  snv: z.string().optional(),
  cor_corpo: z.string().min(1, "Cor do corpo é obrigatória"),
  cor_refletivo: z.string().optional(),
  tipo_refletivo: z.string().optional(),
  km_inicial: z.string().min(1, "KM Inicial é obrigatório"),
  latitude_inicial: z.string().optional(),
  longitude_inicial: z.string().optional(),
  km_final: z.string().min(1, "KM Final é obrigatório"),
  latitude_final: z.string().optional(),
  longitude_final: z.string().optional(),
  extensao_km: z.string().optional(),
  local_implantacao: z.string().optional(),
  espacamento_m: z.string().optional(),
  quantidade: z.string().optional(),
  observacao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IntervencoesCilindrosFormProps {
  loteId: string;
  rodoviaId: string;
}

export function IntervencoesCilindrosForm({ loteId, rodoviaId }: IntervencoesCilindrosFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      snv: "",
      cor_corpo: "",
      cor_refletivo: "",
      tipo_refletivo: "",
      km_inicial: "",
      latitude_inicial: "",
      longitude_inicial: "",
      km_final: "",
      latitude_final: "",
      longitude_final: "",
      extensao_km: "",
      local_implantacao: "",
      espacamento_m: "",
      quantidade: "",
      observacao: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { error } = await supabase
        .from("intervencoes_cilindros")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_intervencao: data.data_intervencao,
          snv: data.snv || null,
          cor_corpo: data.cor_corpo,
          cor_refletivo: data.cor_refletivo || null,
          tipo_refletivo: data.tipo_refletivo || null,
          km_inicial: parseFloat(data.km_inicial),
          latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
          longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
          km_final: parseFloat(data.km_final),
          latitude_final: data.latitude_final ? parseFloat(data.latitude_final) : null,
          longitude_final: data.longitude_final ? parseFloat(data.longitude_final) : null,
          extensao_km: data.extensao_km ? parseFloat(data.extensao_km) : null,
          local_implantacao: data.local_implantacao || null,
          espacamento_m: data.espacamento_m ? parseFloat(data.espacamento_m) : null,
          quantidade: data.quantidade ? parseInt(data.quantidade) : null,
          observacao: data.observacao || null,
        });

      if (error) throw error;

      toast.success("Cilindro delimitador registrado com sucesso!");
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        snv: "",
        cor_corpo: "",
        cor_refletivo: "",
        tipo_refletivo: "",
        km_inicial: "",
        latitude_inicial: "",
        longitude_inicial: "",
        km_final: "",
        latitude_final: "",
        longitude_final: "",
        extensao_km: "",
        local_implantacao: "",
        espacamento_m: "",
        quantidade: "",
        observacao: "",
      });
    } catch (error: any) {
      console.error("Erro ao registrar cilindro:", error);
      toast.error("Erro ao registrar cilindro: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro de Cilindros Delimitadores</CardTitle>
        <CardDescription>
          Registre os cilindros delimitadores implantados na rodovia
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
                name="km_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Inicial *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="Ex: 123.456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="latitude_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude Inicial</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="Ex: -23.550520" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude Inicial</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="Ex: -46.633308" {...field} />
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
                      <Input type="number" step="0.001" placeholder="Ex: 123.456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="latitude_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude Final</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="Ex: -23.550520" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude Final</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="Ex: -46.633308" {...field} />
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
                      <Input type="number" step="0.001" placeholder="Ex: 1.500" {...field} />
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
                    <FormControl>
                      <Input placeholder="Ex: Pista simples, Canteiro central" {...field} />
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
                      <Input type="number" step="0.01" placeholder="Ex: 1.20" {...field} />
                    </FormControl>
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Cilindro Delimitador
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}