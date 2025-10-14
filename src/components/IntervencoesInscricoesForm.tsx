import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

interface IntervencoesInscricoesFormProps {
  inscricaoSelecionada?: {
    id: string;
    km_inicial: number;
    km_final: number;
    tipo_inscricao: string;
  };
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
}

const MATERIAIS = [
  "Tinta Acrílica",
  "Tinta Termoplástica",
  "Resina Acrílica",
  "Película Pré-fabricada",
  "Outros"
];

const CORES = ["Branca", "Amarela", "Azul", "Vermelha", "Verde"];

const TIPOS_INSCRICAO = [
  "Passagem de Pedestre",
  "Faixa Zebrada",
  "Área de Conflito",
  "Parada de Ônibus",
  "Área de Estacionamento",
  "Ciclofaixa",
  "Ciclovia",
  "Área de Canalização",
  "Outros"
];

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  tipo_inscricao: z.string().optional(),
  cor: z.string().optional(),
  dimensoes: z.string().optional(),
  area_m2: z.string().optional(),
  material_utilizado: z.string().optional(),
  estado_conservacao: z.string().optional(),
  observacao: z.string().optional(),
  foto_url: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
});

const IntervencoesInscricoesForm = ({ 
  inscricaoSelecionada, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: IntervencoesInscricoesFormProps) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      tipo_inscricao: "",
      cor: "",
      dimensoes: "",
      area_m2: "",
      material_utilizado: "",
      estado_conservacao: "",
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

  // Preencher formulário com dados da inscrição selecionada
  useEffect(() => {
    if (inscricaoSelecionada && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        tipo_inscricao: (inscricaoSelecionada as any).tipo_inscricao || "",
        cor: (inscricaoSelecionada as any).cor || "",
        dimensoes: (inscricaoSelecionada as any).dimensoes || "",
        area_m2: (inscricaoSelecionada as any).area_m2?.toString() || "",
        material_utilizado: (inscricaoSelecionada as any).material_utilizado || "",
        estado_conservacao: "",
        observacao: "",
        foto_url: "",
        latitude: "",
        longitude: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });
    }
  }, [inscricaoSelecionada, modo, form]);

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
    
    if (!inscricaoSelecionada) {
      toast.error("Selecione uma inscrição do inventário primeiro");
      return;
    }

    try {
      const { error } = await supabase
        .from("ficha_inscricoes_intervencoes")
        .insert({
          ficha_inscricoes_id: inscricaoSelecionada.id,
          data_intervencao: data.data_intervencao,
          motivo: data.motivo,
          tipo_inscricao: data.tipo_inscricao || null,
          cor: data.cor || null,
          dimensoes: data.dimensoes || null,
          area_m2: data.area_m2 ? parseFloat(data.area_m2) : null,
          material_utilizado: data.material_utilizado || null,
          estado_conservacao: data.estado_conservacao || null,
          observacao: data.observacao || null,
          foto_url: data.foto_url || null,
          fora_plano_manutencao: data.fora_plano_manutencao,
          justificativa_fora_plano: data.justificativa_fora_plano || null,
        });

      if (error) throw error;

      toast.success("Intervenção em inscrições registrada com sucesso");

      form.reset();
      onIntervencaoRegistrada?.();
    } catch (error) {
      console.error("Erro ao salvar intervenção:", error);
      toast.error("Erro ao salvar intervenção. Tente novamente.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Zebrados, Setas, Símbolos e Legendas</CardTitle>
        <CardDescription>
          {inscricaoSelecionada 
            ? `Registrando intervenção para ${inscricaoSelecionada.tipo_inscricao} entre km ${inscricaoSelecionada.km_inicial} - ${inscricaoSelecionada.km_final}`
            : "Selecione uma inscrição do inventário para registrar intervenção"
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
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Implantação">Implantação</SelectItem>
                        <SelectItem value="Pintura Nova">Pintura Nova</SelectItem>
                        <SelectItem value="Repintura">Repintura</SelectItem>
                        <SelectItem value="Recuperação">Recuperação</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_inscricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Inscrição</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS_INSCRICAO.map((tipo) => (
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
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a cor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CORES.map((cor) => (
                          <SelectItem key={cor} value={cor}>
                            {cor}
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
                name="area_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área Executada (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
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
                      <Input placeholder="Ex: 3x2m, 10x1,5m" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="material_utilizado"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Material Utilizado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MATERIAIS.map((material) => (
                          <SelectItem key={material} value={material}>
                            {material}
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
                name="observacao"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações sobre a intervenção..." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="foto_url"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>URL da Foto</FormLabel>
                    <FormControl>
                      <Input placeholder="Caminho da foto no storage..." {...field} />
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
                      <Textarea placeholder="Explique o motivo da intervenção fora do plano..." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!hideSubmitButton && (
              <Button type="submit" className="w-full" disabled={!inscricaoSelecionada && modo !== 'controlado'}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Intervenção
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default IntervencoesInscricoesForm;
export { IntervencoesInscricoesForm };
