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
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  km_final: z.string().min(1, "KM final é obrigatório"),
  tipo_intervencao: z.string().min(1, "Tipo de intervenção é obrigatório"),
  snv: z.string().optional(),
  descricao: z.string().optional(),
  corpo: z.string().optional(),
  refletivo: z.string().optional(),
  cor_refletivo: z.string().optional(),
  local_implantacao: z.string().optional(),
  quantidade: z.string().min(1, "Quantidade é obrigatória"),
  espacamento_m: z.string().optional(),
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
      snv: "",
      descricao: "",
      corpo: "",
      refletivo: "",
      cor_refletivo: "",
      local_implantacao: "",
      quantidade: "1",
      espacamento_m: "",
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
        snv: values.snv || null,
        descricao: values.descricao || null,
        corpo: values.corpo || null,
        refletivo: values.refletivo || null,
        cor_refletivo: values.cor_refletivo || null,
        local_implantacao: values.local_implantacao || null,
        quantidade: parseInt(values.quantidade),
        espacamento_m: values.espacamento_m ? parseFloat(values.espacamento_m) : null,
        observacao: values.observacao || null,
        latitude_inicial: coordenadas.latitude_inicial ? parseFloat(coordenadas.latitude_inicial) : null,
        longitude_inicial: coordenadas.longitude_inicial ? parseFloat(coordenadas.longitude_inicial) : null,
        latitude_final: coordenadas.latitude_final ? parseFloat(coordenadas.latitude_final) : null,
        longitude_final: coordenadas.longitude_final ? parseFloat(coordenadas.longitude_final) : null,
      });

      if (error) throw error;

      toast.success("Intervenção em tacha salva com sucesso!");
      form.reset();
      setCoordenadas({
        latitude_inicial: "",
        longitude_inicial: "",
        latitude_final: "",
        longitude_final: "",
      });
    } catch (error: any) {
      toast.error("Erro ao salvar intervenção: " + error.message);
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
            name="descricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Tacha monodirecional">Tacha monodirecional</SelectItem>
                    <SelectItem value="Tacha bidirecional">Tacha bidirecional</SelectItem>
                    <SelectItem value="Tachão">Tachão</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="corpo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Corpo</FormLabel>
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
            name="refletivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refletivo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="I">I</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cor_refletivo"
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
            name="local_implantacao"
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

          <FormField
            control={form.control}
            name="espacamento_m"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Espaçamento (m)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="Ex: 16" {...field} />
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

        <Button type="submit" className="w-full">Salvar Intervenção</Button>
      </form>
    </Form>
  );
}