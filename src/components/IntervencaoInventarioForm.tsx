import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const intervencaoSchema = z.object({
  data_intervencao: z.string().min(1, "Data obrigatória"),
  motivo: z.string().min(1, "Motivo obrigatório"),
  placa_recuperada: z.boolean().default(false),
  suporte: z.string().optional(),
  substrato: z.string().optional(),
  tipo_pelicula_fundo_novo: z.string().optional(),
  retro_fundo: z.string().optional(),
  retro_orla_legenda: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine(data => {
  if (data.fora_plano_manutencao && !data.justificativa_fora_plano?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Justificativa obrigatória quando fora do plano de manutenção",
  path: ["justificativa_fora_plano"]
});

interface IntervencaoInventarioFormProps {
  fichaPlacaId: string;
  placaInfo: {
    codigo: string | null;
    snv: string | null;
    km: number | null;
    lado: string | null;
    rodoviaId: string;
    loteId: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function IntervencaoInventarioForm({
  fichaPlacaId,
  placaInfo,
  onSuccess,
  onCancel,
}: IntervencaoInventarioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof intervencaoSchema>>({
    resolver: zodResolver(intervencaoSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split("T")[0],
      motivo: "",
      placa_recuperada: false,
      suporte: "",
      substrato: "",
      tipo_pelicula_fundo_novo: "",
      retro_fundo: "",
      retro_orla_legenda: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof intervencaoSchema>) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Salvar na tabela intervencoes_sv (registro geral)
      const intervencaoSV = {
        user_id: user.id,
        lote_id: placaInfo.loteId,
        rodovia_id: placaInfo.rodoviaId,
        data_intervencao: values.data_intervencao,
        km_referencia: placaInfo.km || 0,
        lado: placaInfo.lado || "Direito",
        tipo_intervencao: "Manutenção",
        tipo_placa: "Regulamentação",
        codigo_placa: placaInfo.codigo,
        estado_conservacao: values.placa_recuperada ? "Bom" : "Regular",
        quantidade: 1,
        dimensoes: "",
        material: values.substrato || "",
        tipo_suporte: values.suporte || "",
        observacao: values.motivo,
      };

      const { error: errorSV } = await supabase
        .from("intervencoes_sv")
        .insert(intervencaoSV);

      if (errorSV) throw errorSV;

      // 2. Salvar na tabela ficha_placa_intervencoes (vinculado ao inventário)
      const intervencaoInventario = {
        ficha_placa_id: fichaPlacaId,
        data_intervencao: values.data_intervencao,
        motivo: values.motivo,
        placa_recuperada: values.placa_recuperada,
        suporte: values.suporte || null,
        substrato: values.substrato || null,
        tipo_pelicula_fundo_novo: values.tipo_pelicula_fundo_novo || null,
        retro_fundo: values.retro_fundo ? parseFloat(values.retro_fundo) : null,
        retro_orla_legenda: values.retro_orla_legenda ? parseFloat(values.retro_orla_legenda) : null,
      };

      const { error: errorInventario } = await supabase
        .from("ficha_placa_intervencoes")
        .insert(intervencaoInventario);

      if (errorInventario) throw errorInventario;

      toast({
        title: "Intervenção registrada!",
        description: "A intervenção foi salva em suas intervenções e vinculada ao inventário.",
      });

      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar intervenção:", error);
      toast({
        title: "Erro ao registrar intervenção",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h3 className="font-semibold">Dados da Placa</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">SNV:</span>{" "}
              <span className="font-medium">{placaInfo.snv || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Código:</span>{" "}
              <span className="font-medium">{placaInfo.codigo || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">km:</span>{" "}
              <span className="font-medium">{placaInfo.km?.toFixed(2) || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lado:</span>{" "}
              <span className="font-medium">{placaInfo.lado || "-"}</span>
            </div>
          </div>
        </div>

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
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Substituição de suporte">Substituição de suporte</SelectItem>
                    <SelectItem value="Troca de película">Troca de película</SelectItem>
                    <SelectItem value="Substituição completa">Substituição completa</SelectItem>
                    <SelectItem value="Limpeza">Limpeza</SelectItem>
                    <SelectItem value="Reparação">Reparação</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="placa_recuperada"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Placa recuperada</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="suporte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suporte</FormLabel>
                <FormControl>
                  <Input placeholder="Tipo de suporte" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Substrato</FormLabel>
                <FormControl>
                  <Input placeholder="Tipo de substrato" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tipo_pelicula_fundo_novo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Película de Fundo (novo)</FormLabel>
              <FormControl>
                <Input placeholder="Tipo de película de fundo instalada" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="retro_fundo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retrorrefletividade Fundo</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="cd.lux/m²" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="retro_orla_legenda"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retrorrefletividade Orla/Legenda</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="cd.lux/m²" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Intervenção
          </Button>
        </div>
      </form>
    </Form>
  );
}
