import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MapPin, Check, Shield } from "lucide-react";

interface DefensasIntervencoesFormProps {
  defensaSelecionada?: any;
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
}

const ESTADOS_CONSERVACAO = [
  "Excelente",
  "Bom",
  "Regular",
  "Ruim",
  "Péssimo"
];

const TIPOS_AVARIA = [
  "Deformação",
  "Corrosão",
  "Desconexão",
  "Falta de peças",
  "Outros"
];

const NIVEIS_RISCO = [
  "Baixo",
  "Médio",
  "Alto",
  "Muito Alto"
];

const MOTIVOS = [
  "Substituição",
  "Recuperação",
  "Remoção",
  "Manutenção",
  "Implantação"
];

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  km_final: z.string().min(1, "KM final é obrigatório"),
  lado: z.string().min(1, "Lado é obrigatório"),
  snv: z.string().optional(),
  extensao_metros: z.string().optional(),
  tipo_avaria: z.string().optional(),
  estado_conservacao: z.string().optional(),
  nivel_risco: z.string().optional(),
  necessita_intervencao: z.boolean().default(false),
  observacao: z.string().optional(),
  latitude_inicial: z.string().optional(),
  longitude_inicial: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
}).refine(data => {
  if (data.fora_plano_manutencao && !data.justificativa_fora_plano?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Justificativa obrigatória quando fora do plano de manutenção",
  path: ["justificativa_fora_plano"]
});

const DefensasIntervencoesForm = ({ 
  defensaSelecionada, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: DefensasIntervencoesFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      km_inicial: "",
      km_final: "",
      lado: "",
      snv: "",
      extensao_metros: "",
      tipo_avaria: "",
      estado_conservacao: "",
      nivel_risco: "",
      necessita_intervencao: false,
      observacao: "",
    latitude_inicial: "",
    longitude_inicial: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  // Preencher formulário com dados da defensa selecionada
  useEffect(() => {
    if (defensaSelecionada && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        km_inicial: (defensaSelecionada as any).km_inicial?.toString() || "",
        km_final: (defensaSelecionada as any).km_final?.toString() || "",
        lado: (defensaSelecionada as any).lado || "",
        snv: (defensaSelecionada as any).snv || "",
        extensao_metros: (defensaSelecionada as any).extensao_metros?.toString() || "",
        tipo_avaria: "",
        estado_conservacao: "",
        nivel_risco: "",
        necessita_intervencao: false,
        observacao: "",
        latitude_inicial: "",
        longitude_inicial: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });
    }
  }, [defensaSelecionada, modo, form]);

  // Propagar mudanças em tempo real no modo controlado
  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((value) => {
        onDataChange(value);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, modo, onDataChange]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (modo === 'controlado') {
      if (onDataChange) onDataChange(data);
      return;
    }

    if (!defensaSelecionada?.id) {
      toast.error("Selecione uma defensa para registrar a intervenção");
      return;
    }

    try {
      const { error } = await supabase
        .from("defensas_intervencoes")
        .insert({
          defensa_id: defensaSelecionada.id,
          data_intervencao: data.data_intervencao,
          motivo: data.motivo,
          km_inicial: data.km_inicial ? parseFloat(data.km_inicial) : null,
          km_final: data.km_final ? parseFloat(data.km_final) : null,
          lado: data.lado || null,
          snv: data.snv || null,
          extensao_metros: data.extensao_metros ? parseFloat(data.extensao_metros) : null,
          tipo_avaria: data.tipo_avaria || null,
          estado_conservacao: data.estado_conservacao || null,
          nivel_risco: data.nivel_risco || null,
          necessita_intervencao: data.necessita_intervencao,
          observacao: data.observacao || null,
        latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
        longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
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
    }
  };

  const formContent = (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      
      {/* ========== SEÇÃO 1: DADOS BÁSICOS DA INTERVENÇÃO ========== */}
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
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MOTIVOS.map((motivo) => (
                    <SelectItem key={motivo} value={motivo}>
                      {motivo}
                    </SelectItem>
                  ))}
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
                <Input type="number" step="0.001" placeholder="0.000" {...field} />
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
                <Input type="number" step="0.001" placeholder="0.000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lado *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o lado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Direito">Direito</SelectItem>
                  <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                  <SelectItem value="Central">Central</SelectItem>
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
      </div>


      {/* ========== SEÇÃO 3: CARACTERÍSTICAS DA DEFENSA (AZUL) ========== */}
      <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary text-lg">Características da Defensa</h3>
        </div>
        
        {/* Grid - Dimensões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="extensao_metros"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Extensão (metros)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="0.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Grid - Avaliação de Danos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="tipo_avaria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Avaria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_AVARIA.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
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
                <FormLabel>Estado de Conservação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ESTADOS_CONSERVACAO.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nivel_risco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível de Risco</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NIVEIS_RISCO.map((nivel) => (
                      <SelectItem key={nivel} value={nivel}>
                        {nivel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* ========== SEÇÃO 4: OBSERVAÇÕES E JUSTIFICATIVAS ========== */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações adicionais sobre a intervenção" {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="necessita_intervencao"
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
                <FormLabel>Necessita Intervenção Urgente</FormLabel>
              </div>
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
                  <Textarea placeholder="Justifique o motivo da intervenção estar fora do plano de manutenção" {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {!hideSubmitButton && (
        <Button type="submit" className="w-full" disabled={!defensaSelecionada}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar Intervenção
        </Button>
      )}
    </form>
  );

  if (modo === 'controlado') {
    return <Form {...form}>{formContent}</Form>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Defensas</CardTitle>
        <CardDescription>
          {defensaSelecionada 
            ? `Registre uma intervenção para a defensa km ${defensaSelecionada.km_inicial?.toFixed(3)} - ${defensaSelecionada.km_final?.toFixed(3)}`
            : "Selecione uma defensa no mapa ou na lista para registrar uma intervenção"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>{formContent}</Form>
      </CardContent>
    </Card>
  );
};

export default DefensasIntervencoesForm;
