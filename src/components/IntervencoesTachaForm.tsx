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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface IntervencoesTachaFormProps {
  tachaSelecionada?: {
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

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  tipo_tacha: z.string().optional(),
  lado: z.string().optional(),
  cor: z.string().optional(),
  material: z.string().optional(),
  quantidade: z.string().optional(),
  observacao: z.string().optional(),
  foto_url: z.string().optional(),
  descricao: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
});

export function IntervencoesTachaForm({ 
  tachaSelecionada, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: IntervencoesTachaFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      tipo_tacha: "",
      lado: "",
      cor: "",
      material: "",
      quantidade: "",
      observacao: "",
      foto_url: "",
      descricao: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (modo === 'controlado') {
      if (onDataChange) onDataChange(values);
      return;
    }
    
    if (!tachaSelecionada) {
      toast.error("Selecione uma tacha do inventário primeiro");
      return;
    }

    try {
      const { error } = await supabase.from("ficha_tachas_intervencoes").insert({
        ficha_tachas_id: tachaSelecionada.id,
        data_intervencao: values.data_intervencao,
        motivo: values.motivo,
        tipo_tacha: values.tipo_tacha || null,
        lado: values.lado || null,
        cor: values.cor || null,
        material: values.material || null,
        quantidade: values.quantidade ? parseInt(values.quantidade) : null,
        observacao: values.observacao || null,
        foto_url: values.foto_url || null,
        descricao: values.descricao || null,
        fora_plano_manutencao: values.fora_plano_manutencao,
        justificativa_fora_plano: values.justificativa_fora_plano || null,
      });

      if (error) throw error;

      toast.success("Intervenção em tacha registrada com sucesso!");
      form.reset();
      onIntervencaoRegistrada?.();
    } catch (error: any) {
      toast.error("Erro ao salvar intervenção: " + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Tachas Refletivas</CardTitle>
        <CardDescription>
          {tachaSelecionada 
            ? `Registrando intervenção para tachas entre KM ${tachaSelecionada.km_inicial} - ${tachaSelecionada.km_final}${tachaSelecionada.snv ? ` (SNV: ${tachaSelecionada.snv})` : ''}`
            : "Selecione uma tacha do inventário para registrar intervenção"
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
            name="motivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo da Intervenção *</FormLabel>
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
            name="tipo_tacha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Tacha</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Tacha monodirecional">Tacha monodirecional</SelectItem>
                    <SelectItem value="Tacha bidirecional">Tacha bidirecional</SelectItem>
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
                <FormLabel>Material (Corpo)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Plástico">Plástico</SelectItem>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Cerâmico">Cerâmico</SelectItem>
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
                <FormLabel>Cor Refletivo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Branca">Branca</SelectItem>
                    <SelectItem value="Amarela">Amarela</SelectItem>
                    <SelectItem value="Branca/Vermelha">Branca/Vermelha</SelectItem>
                    <SelectItem value="Vermelha">Vermelha</SelectItem>
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
                <FormLabel>Local de Implantação</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BD">BD - Bordo Direito</SelectItem>
                    <SelectItem value="BE">BE - Bordo Esquerdo</SelectItem>
                    <SelectItem value="E">E - Eixo</SelectItem>
                    <SelectItem value="E1">E1 - Eixo 1</SelectItem>
                    <SelectItem value="CD">CD - Centro Direita</SelectItem>
                    <SelectItem value="CE">CE - Centro Esquerda</SelectItem>
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
        </div>

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descrição da intervenção..." {...field} />
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
                <Textarea placeholder="Observações adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          <Button type="submit" className="w-full" disabled={!tachaSelecionada && modo !== 'controlado'}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Intervenção
          </Button>
        )}
      </form>
    </Form>
      </CardContent>
    </Card>
  );
}