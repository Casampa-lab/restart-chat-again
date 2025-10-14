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
import { Loader2, MapPin } from "lucide-react";

interface DefensasIntervencoesFormProps {
  defensaSelecionada?: any;
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
}

const TIPOS_DEFENSA = [
  "Defensa Metálica Simples",
  "Defensa Metálica Dupla",
  "Defensa New Jersey",
  "Defensa Tipo F",
  "Outros"
];

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

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  tipo_defensa: z.string().optional(),
  extensao_metros: z.string().optional(),
  tipo_avaria: z.string().optional(),
  estado_conservacao: z.string().optional(),
  nivel_risco: z.string().optional(),
  necessita_intervencao: z.boolean().default(false),
  observacao: z.string().optional(),
  foto_url: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
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
  const [isCapturing, setIsCapturing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      tipo_defensa: "",
      extensao_metros: "",
      tipo_avaria: "",
      estado_conservacao: "",
      nivel_risco: "",
      necessita_intervencao: false,
      observacao: "",
      foto_url: "",
      latitude: "",
      longitude: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  const capturarCoordenadas = () => {
    setIsCapturing(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toString();
          const lng = position.coords.longitude.toString();
          form.setValue("latitude", lat);
          form.setValue("longitude", lng);
          toast.success(`Coordenadas capturadas: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
          setIsCapturing(false);
        },
        (error) => {
          toast.error("Erro ao capturar localização");
          setIsCapturing(false);
        }
      );
    }
  };

  // Preencher formulário com dados da defensa selecionada
  useEffect(() => {
    if (defensaSelecionada && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        tipo_defensa: (defensaSelecionada as any).tipo_defensa || "",
        extensao_metros: (defensaSelecionada as any).extensao_metros?.toString() || "",
        tipo_avaria: "",
        estado_conservacao: "",
        nivel_risco: "",
        necessita_intervencao: false,
        observacao: "",
        foto_url: "",
        latitude: "",
        longitude: "",
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
          tipo_defensa: data.tipo_defensa || null,
          extensao_metros: data.extensao_metros ? parseFloat(data.extensao_metros) : null,
          tipo_avaria: data.tipo_avaria || null,
          estado_conservacao: data.estado_conservacao || null,
          nivel_risco: data.nivel_risco || null,
          necessita_intervencao: data.necessita_intervencao,
          observacao: data.observacao || null,
          foto_url: data.foto_url || null,
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
              <FormControl>
                <Input placeholder="Descreva o motivo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo_defensa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Defensa</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIPOS_DEFENSA.map((tipo) => (
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
          name="extensao_metros"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extensão (metros)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo_avaria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Avaria</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de avaria" />
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
                    <SelectValue placeholder="Selecione o nível de risco" />
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

        <FormField
          control={form.control}
          name="foto_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL da Foto</FormLabel>
              <FormControl>
                <Input placeholder="URL da foto da intervenção" {...field} />
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
              <Textarea placeholder="Observações adicionais sobre a intervenção" {...field} rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="col-span-2">
        <Button
          type="button"
          variant="outline"
          onClick={capturarCoordenadas}
          disabled={isCapturing}
          className="w-full"
        >
          {isCapturing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Capturando...</>
          ) : (
            <><MapPin className="mr-2 h-4 w-4" />Capturar Coordenadas GPS</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Latitude</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="-15.123456" {...field} />
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
                <Input type="number" step="any" placeholder="-47.123456" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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

      {!hideSubmitButton && (
        <Button type="submit" disabled={!defensaSelecionada}>
          {form.formState.isSubmitting ? "Salvando..." : "Registrar Intervenção"}
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
