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
  km: z.string().min(1, "KM é obrigatório"),
  tipo_intervencao: z.string().min(1, "Tipo de intervenção é obrigatório"),
  snv: z.string().optional(),
  sigla: z.string().optional(),
  descricao: z.string().optional(),
  cor: z.string().min(1, "Cor é obrigatória"),
  material_utilizado: z.string().optional(),
  outros_materiais: z.string().optional(),
  area_m2: z.string().min(1, "Área é obrigatória"),
  espessura_cm: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
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
      km: "",
      tipo_intervencao: "",
      snv: "",
      sigla: "",
      descricao: "",
      cor: "",
      area_m2: "",
      material_utilizado: "",
      outros_materiais: "",
      espessura_cm: "",
      latitude: "",
      longitude: "",
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
          km: parseFloat(data.km),
          tipo_intervencao: data.tipo_intervencao,
          snv: data.snv || null,
          sigla: data.sigla || null,
          descricao: data.descricao || null,
          cor: data.cor,
          area_m2: parseFloat(data.area_m2),
          material_utilizado: data.material_utilizado || null,
          outros_materiais: data.outros_materiais || null,
          espessura_cm: data.espessura_cm ? parseFloat(data.espessura_cm) : null,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          observacao: data.observacao || null,
        });

      if (error) throw error;

      toast.success("Intervenção de Marcas Transversais registrada com sucesso!");
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        km: "",
        tipo_intervencao: "",
        snv: "",
        sigla: "",
        descricao: "",
        cor: "",
        area_m2: "",
        material_utilizado: "",
        outros_materiais: "",
        espessura_cm: "",
        latitude: "",
        longitude: "",
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
          Registre intervenções realizadas em marcas transversais (FTP, LRE, símbolos, etc.)
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
                name="km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" placeholder="Ex: 123.456" {...field} />
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
                name="sigla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sigla</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: FTP, LRE, ZPA, MOF, etc." {...field} />
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
                      <Input placeholder="Ex: Faixa de Travessia de Pedestres" {...field} />
                    </FormControl>
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
                        <SelectItem value="Branca">Branca</SelectItem>
                        <SelectItem value="Amarela">Amarela</SelectItem>
                        <SelectItem value="Vermelha">Vermelha</SelectItem>
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
                        <SelectItem value="Acrílico">Acrílico</SelectItem>
                        <SelectItem value="Termoplástico">Termoplástico</SelectItem>
                        <SelectItem value="Tinta Base Solvente">Tinta Base Solvente</SelectItem>
                        <SelectItem value="Tinta Base Água">Tinta Base Água</SelectItem>
                        <SelectItem value="Massa Asfáltica">Massa Asfáltica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outros_materiais"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outros Materiais</FormLabel>
                    <FormControl>
                      <Input placeholder="Outros materiais utilizados" {...field} />
                    </FormControl>
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
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="Ex: -23.550520" {...field} />
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
