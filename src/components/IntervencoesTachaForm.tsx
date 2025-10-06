import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IntervencoesTachaFormProps {
  loteId: string;
  rodoviaId: string;
}

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  km_final: z.string().min(1, "KM final é obrigatório"),
  tipo_intervencao: z.string().min(1, "Tipo de intervenção é obrigatório"),
  tipo_tacha: z.string().min(1, "Tipo de tacha é obrigatório"),
  cor: z.string().min(1, "Cor é obrigatória"),
  lado: z.string().min(1, "Lado é obrigatório"),
  quantidade: z.string().min(1, "Quantidade é obrigatória"),
  estado_conservacao: z.string().optional(),
  material: z.string().optional(),
  observacao: z.string().optional(),
});

export function IntervencoesTachaForm({ loteId, rodoviaId }: IntervencoesTachaFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      km_inicial: "",
      km_final: "",
      tipo_intervencao: "",
      tipo_tacha: "",
      cor: "",
      lado: "",
      quantidade: "1",
      estado_conservacao: "",
      material: "",
      observacao: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("intervencoes_tacha").insert({
        lote_id: loteId,
        rodovia_id: rodoviaId,
        user_id: user.id,
        data_intervencao: values.data_intervencao,
        km_inicial: parseFloat(values.km_inicial),
        km_final: parseFloat(values.km_final),
        tipo_intervencao: values.tipo_intervencao,
        tipo_tacha: values.tipo_tacha,
        cor: values.cor,
        lado: values.lado,
        quantidade: parseInt(values.quantidade),
        estado_conservacao: values.estado_conservacao || null,
        material: values.material || null,
        observacao: values.observacao || null,
      });

      if (error) throw error;

      toast.success("Intervenção em tacha registrada com sucesso!");
      form.reset();
    } catch (error: any) {
      toast.error("Erro ao registrar intervenção: " + error.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            name="tipo_intervencao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Intervenção</FormLabel>
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
                <FormLabel>KM Inicial</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" placeholder="Ex: 10.500" {...field} />
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
                <FormLabel>KM Final</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" placeholder="Ex: 10.800" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo_tacha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Tacha</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Monodirecional">Monodirecional</SelectItem>
                    <SelectItem value="Bidirecional">Bidirecional</SelectItem>
                    <SelectItem value="Refletiva">Refletiva</SelectItem>
                    <SelectItem value="Não Refletiva">Não Refletiva</SelectItem>
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
                <FormLabel>Cor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Branca">Branca</SelectItem>
                    <SelectItem value="Amarela">Amarela</SelectItem>
                    <SelectItem value="Vermelha">Vermelha</SelectItem>
                    <SelectItem value="Azul">Azul</SelectItem>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Direito">Direito</SelectItem>
                    <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                    <SelectItem value="Central">Central</SelectItem>
                    <SelectItem value="Ambos">Ambos</SelectItem>
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
            name="estado_conservacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado de Conservação</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ótimo">Ótimo</SelectItem>
                    <SelectItem value="Bom">Bom</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Ruim">Ruim</SelectItem>
                    <SelectItem value="Péssimo">Péssimo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="material"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Plástico refletivo" {...field} />
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
                <Textarea placeholder="Informações adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Registrar Intervenção</Button>
      </form>
    </Form>
  );
}
