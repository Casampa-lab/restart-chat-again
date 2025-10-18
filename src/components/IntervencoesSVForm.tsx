import { useState, useEffect } from "react";
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
import { Loader2, MapPin } from "lucide-react";
import { CODIGOS_PLACAS } from "@/constants/codigosPlacas";
import { PlacaPreview } from "@/components/PlacaPreview";

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  suporte: z.string().optional(),
  substrato: z.string().optional(),
  tipo_pelicula_fundo: z.string().optional(),
  retro_pelicula_fundo: z.string().optional(),
  retro_pelicula_legenda_orla: z.string().optional(),
  placa_recuperada: z.boolean().default(false),
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
  // Campos para criar nova placa caso não exista no inventário
  km_referencia: z.string().optional(),
  tipo_placa: z.string().optional(),
  codigo_placa: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface IntervencoesSVFormProps {
  placaSelecionada?: any;
  loteId?: string;
  rodoviaId?: string;
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
}

export function IntervencoesSVForm({ 
  placaSelecionada, 
  loteId, 
  rodoviaId, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false 
}: IntervencoesSVFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [coordenadas, setCoordenadas] = useState({ latitude: "", longitude: "" });
  const [codigosFiltrados, setCodigosFiltrados] = useState<readonly {codigo: string, nome: string}[]>([]);
  const [codigoAtual, setCodigoAtual] = useState<string | null>(null);

  const capturarCoordenadas = () => {
    setIsCapturing(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordenadas({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
          form.setValue("latitude", position.coords.latitude.toString());
          form.setValue("longitude", position.coords.longitude.toString());
          toast.success(`Coordenadas: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
          setIsCapturing(false);
        },
        (error) => {
          toast.error("Erro ao capturar localização");
          setIsCapturing(false);
        }
      );
    } else {
      toast.error("Geolocalização não suportada");
      setIsCapturing(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
    suporte: "",
    substrato: "",
    tipo_pelicula_fundo: "",
    retro_pelicula_fundo: "",
    retro_pelicula_legenda_orla: "",
      placa_recuperada: false,
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
      km_referencia: "",
      tipo_placa: "",
      codigo_placa: "",
      latitude: "",
      longitude: "",
    },
  });

  // Preenche campos quando placa é selecionada
  useEffect(() => {
    if (placaSelecionada) {
      form.setValue("km_referencia", placaSelecionada.km?.toString() || "");
      form.setValue("tipo_placa", placaSelecionada.tipo || "");
      form.setValue("codigo_placa", placaSelecionada.codigo || "");
      form.setValue("latitude", placaSelecionada.latitude_inicial?.toString() || "");
      form.setValue("longitude", placaSelecionada.longitude_inicial?.toString() || "");
      
      if (placaSelecionada.latitude_inicial) {
        setCoordenadas({
          latitude: placaSelecionada.latitude_inicial.toString(),
          longitude: placaSelecionada.longitude_inicial?.toString() || "",
        });
      }
    }
  }, [placaSelecionada, form]);

  // Modo controlado: envia dados para componente pai
  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((values) => {
        onDataChange(values);
      });
      return () => subscription.unsubscribe();
    }
  }, [modo, onDataChange, form]);

  // Filtra códigos de placa baseado no tipo selecionado
  useEffect(() => {
    const tipoPlaca = form.watch("tipo_placa");
    
    if (tipoPlaca === "Regulamentação") {
      setCodigosFiltrados(CODIGOS_PLACAS.REGULAMENTACAO);
    } else if (tipoPlaca === "Advertência") {
      setCodigosFiltrados(CODIGOS_PLACAS.ADVERTENCIA);
    } else if (tipoPlaca === "Indicação") {
      setCodigosFiltrados(CODIGOS_PLACAS.INDICACAO);
    } else {
      setCodigosFiltrados([]);
    }
    
    // Limpa o código quando o tipo muda (exceto quando é preenchimento inicial)
    if (tipoPlaca && !placaSelecionada) {
      form.setValue("codigo_placa", "");
    }
  }, [form.watch("tipo_placa")]);

  // Atualiza o código atual para o preview
  useEffect(() => {
    setCodigoAtual(form.watch("codigo_placa"));
  }, [form.watch("codigo_placa")]);

  const onSubmit = async (data: FormValues) => {
    // Em modo controlado, não faz submit direto
    if (modo === 'controlado') {
      return;
    }
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      let fichaPlacaId = placaSelecionada?.id;

      // Caso 1: Placa já existe no inventário - apenas atualiza se necessário
      if (placaSelecionada) {
        const updateData: any = {};
        
        if (data.suporte) updateData.suporte = data.suporte;
        if (data.substrato) updateData.substrato = data.substrato;
        if (data.tipo_pelicula_fundo) updateData.tipo_pelicula_fundo = data.tipo_pelicula_fundo;
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("ficha_placa")
            .update(updateData)
            .eq("id", placaSelecionada.id);

          if (updateError) {
            console.error("Erro ao atualizar ficha_placa:", updateError);
            throw updateError;
          }
        }
      } 
      // Caso 2: Placa NÃO existe - cria nova no inventário
      else if (data.km_referencia && data.tipo_placa && data.codigo_placa && loteId && rodoviaId) {
        const { data: novaPlaca, error: insertError } = await supabase
          .from("ficha_placa")
          .insert({
            user_id: user.id,
            lote_id: loteId,
            rodovia_id: rodoviaId,
            km: parseFloat(data.km_referencia),
            tipo: data.tipo_placa,
            codigo: data.codigo_placa,
            latitude_inicial: data.latitude ? parseFloat(data.latitude) : null,
            longitude_inicial: data.longitude ? parseFloat(data.longitude) : null,
            suporte: data.suporte || null,
            substrato: data.substrato || null,
            tipo_pelicula_fundo: data.tipo_pelicula_fundo || null,
            data_vistoria: data.data_intervencao,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Erro ao criar ficha_placa:", insertError);
          throw insertError;
        }

        fichaPlacaId = novaPlaca.id;
      } else {
        toast.error("Selecione uma placa do inventário ou preencha KM, Tipo e Código para criar nova");
        return;
      }

      // Insere a intervenção na tabela correta
      const { error: intervencaoError } = await supabase
        .from("ficha_placa_intervencoes")
        .insert({
          ficha_placa_id: fichaPlacaId,
          data_intervencao: data.data_intervencao,
          motivo: data.motivo,
          suporte: data.suporte || null,
          substrato: data.substrato || null,
          tipo_pelicula_fundo_novo: data.tipo_pelicula_fundo || null,
          retro_fundo: data.retro_pelicula_fundo ? parseFloat(data.retro_pelicula_fundo) : null,
          retro_orla_legenda: data.retro_pelicula_legenda_orla ? parseFloat(data.retro_pelicula_legenda_orla) : null,
          placa_recuperada: data.placa_recuperada,
          fora_plano_manutencao: data.fora_plano_manutencao,
          justificativa_fora_plano: data.justificativa_fora_plano || null,
        });

      if (intervencaoError) {
        console.error("Erro ao inserir intervenção:", intervencaoError);
        throw intervencaoError;
      }

      toast.success("Intervenção registrada com sucesso!");
      form.reset();
      setCoordenadas({ latitude: "", longitude: "" });
      onIntervencaoRegistrada?.();
    } catch (error: any) {
      console.error("Erro ao salvar intervenção:", error);
      toast.error("Erro ao salvar intervenção: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Primeira linha: 3 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <SelectItem value="Substituição">Substituição</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Remoção">Remoção</SelectItem>
                        <SelectItem value="Recuperação">Recuperação</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!placaSelecionada && (
                <FormField
                  control={form.control}
                  name="km_referencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KM de Referência *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" placeholder="123.456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Tipo de Placa + Imagem */}
            {!placaSelecionada && (
              <>
                <div className="grid md:grid-cols-[1fr_140px] gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="tipo_placa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Placa *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Regulamentação">Regulamentação</SelectItem>
                            <SelectItem value="Advertência">Advertência</SelectItem>
                            <SelectItem value="Indicação">Indicação</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:pt-8 flex justify-end">
                    <PlacaPreview codigo={codigoAtual} size="large" showLabel />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="codigo_placa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código da Placa *</FormLabel>
                      {form.watch("tipo_placa") === "Outros" ? (
                        <FormControl>
                          <Input placeholder="Digite o código" {...field} />
                        </FormControl>
                      ) : (
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={codigosFiltrados.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={
                                form.watch("tipo_placa") 
                                  ? "Selecione o código" 
                                  : "Selecione primeiro o tipo"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]" align="start">
                            {codigosFiltrados.map((placa) => (
                              <SelectItem key={placa.codigo} value={placa.codigo} className="cursor-pointer">
                                <div className="flex items-center gap-2 py-1">
                                  <PlacaPreview codigo={placa.codigo} size="small" />
                                  <span className="text-sm leading-tight">{placa.codigo} - {placa.nome}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  <div className="md:col-span-2 space-y-2">
                    <FormLabel>Coordenadas GPS</FormLabel>
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
                        Capturar Coordenadas
                      </Button>
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormControl>
                            <Input placeholder="Latitude" {...field} className="flex-1" />
                          </FormControl>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormControl>
                            <Input placeholder="Longitude" {...field} className="flex-1" />
                          </FormControl>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

            {/* Tipo de Suporte e Substrato */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="suporte"
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
                name="substrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Substrato</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Aço">Aço</SelectItem>
                        <SelectItem value="Alumínio">Alumínio</SelectItem>
                        <SelectItem value="ACM">ACM</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Película Fundo e Retrorrefletividade */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_pelicula_fundo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Película Fundo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Grau Técnico I">Grau Técnico I</SelectItem>
                        <SelectItem value="Grau Técnico II">Grau Técnico II</SelectItem>
                        <SelectItem value="Alta Intensidade">Alta Intensidade</SelectItem>
                        <SelectItem value="Diamond Grade">Diamond Grade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="retro_pelicula_fundo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retrorefletividade Película Fundo (cd/lx/m²)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="retro_pelicula_legenda_orla"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retrorefletividade Película Legenda/Orla (cd/lx/m²)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="0.0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="placa_recuperada"
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
                    <FormLabel>Placa Recuperada</FormLabel>
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
                      <Textarea placeholder="Explique o motivo da intervenção fora do plano..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!hideSubmitButton && (
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Intervenção
              </Button>
            )}
          </form>
        </Form>
  );

  // Modo controlado: retorna apenas o conteúdo do formulário sem Card
  if (modo === 'controlado') {
    return formContent;
  }

  // Modo normal: retorna com Card
  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Sinalização Vertical</CardTitle>
        <CardDescription>
          {placaSelecionada 
            ? `Registrando intervenção para placa ${placaSelecionada.tipo} ${placaSelecionada.codigo} no KM ${placaSelecionada.km}`
            : "Selecione uma placa do inventário ou preencha os dados para criar nova"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}