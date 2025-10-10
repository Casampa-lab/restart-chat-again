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
  tipo: z.string().min(1, "Tipo de estrutura é obrigatório"),
  lado: z.string().optional(),
  altura_livre_m: z.string().optional(),
  vao_horizontal_m: z.string().optional(),
  snv: z.string().optional(),
  estado_conservacao: z.string().min(1, "Estado de conservação é obrigatório"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  observacao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IntervencoesPorticosFormProps {
  loteId: string;
  rodoviaId: string;
}

export function IntervencoesPorticosForm({ loteId, rodoviaId }: IntervencoesPorticosFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      km: "",
      tipo_intervencao: "",
      tipo: "",
      lado: "",
      altura_livre_m: "",
      vao_horizontal_m: "",
      snv: "",
      estado_conservacao: "",
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
        .from("intervencoes_porticos")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_intervencao: data.data_intervencao,
          km: parseFloat(data.km),
          tipo_intervencao: data.tipo_intervencao,
          tipo: data.tipo,
          lado: data.lado || null,
          altura_livre_m: data.altura_livre_m ? parseFloat(data.altura_livre_m) : null,
          vao_horizontal_m: data.vao_horizontal_m ? parseFloat(data.vao_horizontal_m) : null,
          snv: data.snv || null,
          estado_conservacao: data.estado_conservacao,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          observacao: data.observacao || null,
        });

      if (error) throw error;

      toast.success("Intervenção de Pórtico/Semipórtico/Braço registrada com sucesso!");
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        km: "",
        tipo_intervencao: "",
        tipo: "",
        lado: "",
        altura_livre_m: "",
        vao_horizontal_m: "",
        snv: "",
        estado_conservacao: "",
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
        <CardTitle>Intervenções - Pórticos, Semipórticos e Braços Projetados</CardTitle>
        <CardDescription>
          Registre intervenções realizadas em pórticos, semipórticos e braços projetados
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
                        <SelectItem value="substituicao">Substituição</SelectItem>
                        <SelectItem value="remocao">Remoção</SelectItem>
                        <SelectItem value="recuperacao">Recuperação</SelectItem>
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
                    <FormLabel>Tipo de Estrutura *</FormLabel>
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
                name="lado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="-">- (Pórtico)</SelectItem>
                        <SelectItem value="Direito">Direito</SelectItem>
                        <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado_conservacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de Conservação *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bom">Bom</SelectItem>
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="Ruim">Ruim</SelectItem>
                      </SelectContent>
                    </Select>
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
