import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { TODAS_PLACAS } from "@/constants/codigosPlacas";

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  km_referencia: z.string().min(1, "km de referência é obrigatório"),
  tipo_intervencao: z.string().min(1, "Tipo de intervenção é obrigatório"),
  tipo_placa: z.string().min(1, "Tipo de placa é obrigatório"),
  codigo_placa: z.string().optional(),
  lado: z.string().min(1, "Lado é obrigatório"),
  dimensoes: z.string().optional(),
  material: z.string().optional(),
  tipo_suporte: z.string().optional(),
  estado_conservacao: z.string().min(1, "Estado de conservação é obrigatório"),
  quantidade: z.string().min(1, "Quantidade é obrigatória"),
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface IntervencoesSVFormProps {
  loteId: string;
  rodoviaId: string;
}

const IntervencoesSVForm = ({ loteId, rodoviaId }: IntervencoesSVFormProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [coordenadas, setCoordenadas] = useState({ latitude: "", longitude: "" });

  const capturarCoordenadas = () => {
    setIsCapturing(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordenadas({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
          toast.success(`Coordenadas capturadas: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
          setIsCapturing(false);
        },
        (error) => {
          toast.error("Erro ao capturar localização. Verifique as permissões.");
          setIsCapturing(false);
        }
      );
    } else {
      toast.error("Geolocalização não suportada pelo navegador");
      setIsCapturing(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      km_referencia: "",
      tipo_intervencao: "",
      tipo_placa: "",
      codigo_placa: "",
      lado: "",
      dimensoes: "",
      material: "",
      tipo_suporte: "",
      estado_conservacao: "",
      quantidade: "1",
      observacao: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("intervencoes_sv").insert({
        user_id: user.id,
        lote_id: loteId,
        rodovia_id: rodoviaId,
        data_intervencao: values.data_intervencao,
        km_referencia: parseFloat(values.km_referencia),
        tipo_intervencao: values.tipo_intervencao,
        tipo_placa: values.tipo_placa,
        codigo_placa: values.codigo_placa || null,
        lado: values.lado,
        dimensoes: values.dimensoes || null,
        material: values.material || null,
        tipo_suporte: values.tipo_suporte || null,
        estado_conservacao: values.estado_conservacao,
        quantidade: parseInt(values.quantidade),
        observacao: values.observacao || null,
        latitude: coordenadas.latitude ? parseFloat(coordenadas.latitude) : null,
        longitude: coordenadas.longitude ? parseFloat(coordenadas.longitude) : null,
      });

      if (error) throw error;

      toast.success("Intervenção em SV salva com sucesso!");
      form.reset();
    } catch (error: any) {
      toast.error("Erro ao salvar intervenção: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="km_referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>km de Referência *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 md:col-span-2">
              <div className="space-y-2">
                <Label>Coordenadas GPS</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={capturarCoordenadas}
                    disabled={isCapturing}
                  >
                    {isCapturing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    Capturar Localização
                  </Button>
                  <Input
                    placeholder="Latitude"
                    value={coordenadas.latitude}
                    onChange={(e) => setCoordenadas({ ...coordenadas, latitude: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Longitude"
                    value={coordenadas.longitude}
                    onChange={(e) => setCoordenadas({ ...coordenadas, longitude: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">

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
                        <SelectItem value="Instalação">Instalação</SelectItem>
                        <SelectItem value="Substituição">Substituição</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Remoção">Remoção</SelectItem>
                        <SelectItem value="Limpeza">Limpeza</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Placa *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Regulamentação">Regulamentação</SelectItem>
                        <SelectItem value="Advertência">Advertência</SelectItem>
                        <SelectItem value="Indicação">Indicação</SelectItem>
                        <SelectItem value="Orientação">Orientação</SelectItem>
                        <SelectItem value="Serviços Auxiliares">Serviços Auxiliares</SelectItem>
                        <SelectItem value="Educativa">Educativa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código da Placa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o código da placa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {TODAS_PLACAS.map((placa) => (
                          <SelectItem key={placa.codigo} value={placa.codigo}>
                            {placa.codigo} - {placa.nome}
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
                name="lado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Direito">Direito</SelectItem>
                        <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                        <SelectItem value="Ambos">Ambos</SelectItem>
                        <SelectItem value="Central">Central</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dimensoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensões</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 100x150cm" {...field} />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Aço">Aço</SelectItem>
                        <SelectItem value="Alumínio">Alumínio</SelectItem>
                        <SelectItem value="Plástico">Plástico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_suporte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Suporte</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Poste Simples">Poste Simples</SelectItem>
                        <SelectItem value="Poste Duplo">Poste Duplo</SelectItem>
                        <SelectItem value="Pórtico">Pórtico</SelectItem>
                        <SelectItem value="Semi-pórtico">Semi-pórtico</SelectItem>
                        <SelectItem value="Fixação em estrutura existente">Fixação em estrutura existente</SelectItem>
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
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                      />
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
                    <Textarea
                      placeholder="Observações adicionais sobre a intervenção"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Intervenção"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default IntervencoesSVForm;
