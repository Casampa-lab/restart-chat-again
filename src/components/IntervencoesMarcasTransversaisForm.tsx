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
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  km_final: z.string().min(1, "KM final é obrigatório"),
  tipo_intervencao: z.string().min(1, "Tipo de intervenção é obrigatório"),
  tipo_demarcacao: z.string().min(1, "Tipo de demarcação é obrigatório"),
  cor: z.string().min(1, "Cor é obrigatória"),
  area_m2: z.string().min(1, "Área é obrigatória"),
  material_utilizado: z.string().optional(),
  espessura_cm: z.string().optional(),
  latitude_inicial: z.string().optional(),
  longitude_inicial: z.string().optional(),
  latitude_final: z.string().optional(),
  longitude_final: z.string().optional(),
  observacao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IntervencoesMarcasTransversaisFormProps {
  loteId: string;
  rodoviaId: string;
}

export function IntervencoesMarcasTransversaisForm({ loteId, rodoviaId }: IntervencoesMarcasTransversaisFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      km_inicial: "",
      km_final: "",
      tipo_intervencao: "",
      tipo_demarcacao: "",
      cor: "",
      area_m2: "",
      material_utilizado: "",
      espessura_cm: "",
      latitude_inicial: "",
      longitude_inicial: "",
      latitude_final: "",
      longitude_final: "",
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
        .from("intervencoes_marcas_transversais")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_intervencao: data.data_intervencao,
          km_inicial: parseFloat(data.km_inicial),
          km_final: parseFloat(data.km_final),
          tipo_intervencao: data.tipo_intervencao,
          tipo_demarcacao: data.tipo_demarcacao,
          cor: data.cor,
          area_m2: parseFloat(data.area_m2),
          material_utilizado: data.material_utilizado || null,
          espessura_cm: data.espessura_cm ? parseFloat(data.espessura_cm) : null,
          latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
          longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
          latitude_final: data.latitude_final ? parseFloat(data.latitude_final) : null,
          longitude_final: data.longitude_final ? parseFloat(data.longitude_final) : null,
          observacao: data.observacao || null,
        });

      if (error) throw error;

      toast.success("Intervenção de Marcas Transversais registrada com sucesso!");
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        km_inicial: "",
        km_final: "",
        tipo_intervencao: "",
        tipo_demarcacao: "",
        cor: "",
        area_m2: "",
        material_utilizado: "",
        espessura_cm: "",
        latitude_inicial: "",
        longitude_inicial: "",
        latitude_final: "",
        longitude_final: "",
        observacao: "",
      });
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
        <CardTitle>Intervenções - Marcas Transversais</CardTitle>
        <CardDescription>
          Registre intervenções realizadas em marcas transversais
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
                name="tipo_intervencao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Intervenção *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="implantacao">Implantação</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="reforco">Reforço</SelectItem>
                        <SelectItem value="remocao">Remoção</SelectItem>
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
                name="km_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Final *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="Ex: 123.789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_demarcacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Demarcação *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="faixa_pedestre">Faixa de Pedestre</SelectItem>
                        <SelectItem value="linha_retencao">Linha de Retenção</SelectItem>
                        <SelectItem value="linha_espera">Linha de Espera</SelectItem>
                        <SelectItem value="simbolo_pare">Símbolo PARE</SelectItem>
                        <SelectItem value="outras">Outras Marcas Transversais</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="branca">Branca</SelectItem>
                        <SelectItem value="amarela">Amarela</SelectItem>
                        <SelectItem value="vermelha">Vermelha</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área (m²) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 10.50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="material_utilizado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Utilizado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tinta_base_solvente">Tinta Base Solvente</SelectItem>
                        <SelectItem value="tinta_base_agua">Tinta Base Água</SelectItem>
                        <SelectItem value="termoplastico">Termoplástico</SelectItem>
                        <SelectItem value="massa_asfaltica">Massa Asfáltica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="espessura_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Espessura (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="Ex: 0.3" {...field} />
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
              Registrar Intervenção
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
