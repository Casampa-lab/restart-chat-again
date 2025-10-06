import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

interface IntervencoesTachaFormProps {
  loteId: string;
  rodoviaId: string;
}

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  km_inicial: z.string().min(1, "km inicial é obrigatório"),
  km_final: z.string().min(1, "km final é obrigatório"),
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
  const [isCapturingInicial, setIsCapturingInicial] = useState(false);
  const [isCapturingFinal, setIsCapturingFinal] = useState(false);
  const [coordenadas, setCoordenadas] = useState({
    latitude_inicial: "",
    longitude_inicial: "",
    latitude_final: "",
    longitude_final: "",
  });

  const capturarCoordenadas = (tipo: 'inicial' | 'final') => {
    if (tipo === 'inicial') setIsCapturingInicial(true);
    else setIsCapturingFinal(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (tipo === 'inicial') {
            setCoordenadas({
              ...coordenadas,
              latitude_inicial: position.coords.latitude.toString(),
              longitude_inicial: position.coords.longitude.toString(),
            });
            toast.success(`Ponto inicial: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
            setIsCapturingInicial(false);
          } else {
            setCoordenadas({
              ...coordenadas,
              latitude_final: position.coords.latitude.toString(),
              longitude_final: position.coords.longitude.toString(),
            });
            toast.success(`Ponto final: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
            setIsCapturingFinal(false);
          }
        },
        (error) => {
          toast.error("Erro ao capturar localização. Verifique as permissões.");
          if (tipo === 'inicial') setIsCapturingInicial(false);
          else setIsCapturingFinal(false);
        }
      );
    } else {
      toast.error("Geolocalização não suportada pelo navegador");
      if (tipo === 'inicial') setIsCapturingInicial(false);
      else setIsCapturingFinal(false);
    }
  };

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
                <FormLabel>km Inicial</FormLabel>
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
                <FormLabel>km Final</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" placeholder="Ex: 10.800" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2 space-y-2">
            <Label>Coordenadas GPS do Ponto Inicial</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => capturarCoordenadas('inicial')}
                disabled={isCapturingInicial}
              >
                {isCapturingInicial ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                Capturar Ponto Inicial
              </Button>
              <Input
                placeholder="Latitude"
                value={coordenadas.latitude_inicial}
                onChange={(e) => setCoordenadas({ ...coordenadas, latitude_inicial: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Longitude"
                value={coordenadas.longitude_inicial}
                onChange={(e) => setCoordenadas({ ...coordenadas, longitude_inicial: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Coordenadas GPS do Ponto Final</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => capturarCoordenadas('final')}
                disabled={isCapturingFinal}
              >
                {isCapturingFinal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                Capturar Ponto Final
              </Button>
              <Input
                placeholder="Latitude"
                value={coordenadas.latitude_final}
                onChange={(e) => setCoordenadas({ ...coordenadas, latitude_final: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Longitude"
                value={coordenadas.longitude_final}
                onChange={(e) => setCoordenadas({ ...coordenadas, longitude_final: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

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
