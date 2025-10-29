// ==============================
// IntervencoesCilindrosForm.tsx
// ==============================
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const intervencaoSchema = z.object({
  data_intervencao: z.string().nonempty("Data obrigatória"),
  km_inicial: z.string().nonempty("KM inicial obrigatório"),
  km_final: z.string().optional(),
  snv: z.string().optional(),
  solucao: z.string().optional(),
  motivo: z.string().optional(),
});

export type IntervencaoForm = z.infer<typeof intervencaoSchema>;

export interface IntervencoesCilindrosFormProps {
  tipoOrigem?: string;
  cilindroSelecionado?: any;
  intervencaoSelecionada?: any;
  modo?: "normal" | "controlado";
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string | number | null;
  rodoviaId?: string | number | null;
}

export function IntervencoesCilindrosForm({
  tipoOrigem,
  cilindroSelecionado,
  intervencaoSelecionada,
  modo = "normal",
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId,
}: IntervencoesCilindrosFormProps) {
  const form = useForm<IntervencaoForm>({
    resolver: zodResolver(intervencaoSchema),
    defaultValues: {
      data_intervencao: "",
      km_inicial: "",
      km_final: "",
      snv: "",
      solucao: "",
      motivo: "",
    },
  });

  const onSubmit = (values: IntervencaoForm) => {
    if (onDataChange) onDataChange(values);
    toast.success("Dados atualizados");
  };

  useEffect(() => {
    if (intervencaoSelecionada) {
      form.reset({
        data_intervencao: intervencaoSelecionada.data_intervencao || "",
        km_inicial: intervencaoSelecionada.km_inicial || "",
        km_final: intervencaoSelecionada.km_final || "",
        snv: intervencaoSelecionada.snv || "",
        solucao: intervencaoSelecionada.solucao || "",
        motivo: intervencaoSelecionada.motivo || "",
      });
    }
  }, [intervencaoSelecionada]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label>Data da Intervenção</Label>
        <Input type="date" {...form.register("data_intervencao")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>KM Inicial</Label>
          <Input placeholder="Ex: 12,345" {...form.register("km_inicial")} />
        </div>
        <div>
          <Label>KM Final</Label>
          <Input placeholder="Ex: 12,900" {...form.register("km_final")} />
        </div>
      </div>

      <div>
        <Label>SNV</Label>
        <Input placeholder="SNV identificado" {...form.register("snv")} />
      </div>

      <div>
        <Label>Solução</Label>
        <Textarea placeholder="Descreva a solução aplicada" {...form.register("solucao")} />
      </div>

      <div>
        <Label>Motivo</Label>
        <Textarea placeholder="Justifique o motivo da intervenção" {...form.register("motivo")} />
      </div>

      {!hideSubmitButton && (
        <Button type="submit" className="mt-2">
          Salvar Intervenção
        </Button>
      )}
    </form>
  );
}

export default IntervencoesCilindrosForm;
