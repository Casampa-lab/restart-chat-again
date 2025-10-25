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
import { CODIGOS_PLACAS } from "@/constants/codigosPlacas";
import { PlacaPreview } from "./PlacaPreview";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Lock, Loader2 } from "lucide-react";
import { useTipoOrigem } from "@/hooks/useTipoOrigem";
import { LABELS_TIPO_ORIGEM, CAMPOS_ESTRUTURAIS } from "@/constants/camposEstruturais";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/**
 * Formulário para registrar intervenções em Sinalização Vertical (Placas)
 */

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  
  // SEÇÃO 1: LOCALIZAÇÃO
  br: z.string().optional(),
  snv: z.string().optional(),
  km_inicial: z.string().optional(),
  latitude_inicial: z.string().optional(),
  longitude_inicial: z.string().optional(),
  
  // SEÇÃO 2: IDENTIFICAÇÃO DA PLACA
  tipo_placa: z.string().optional(),
  codigo_placa: z.string().optional(),
  velocidade: z.string().optional(),
  lado: z.string().optional(),
  posicao: z.string().optional(),
  detalhamento_pagina: z.coerce.number().optional(),
  
  // SEÇÃO 3: SUPORTE
  suporte: z.string().optional(),
  qtde_suporte: z.coerce.number().optional(),
  tipo_secao_suporte: z.string().optional(),
  secao_suporte_mm: z.string().optional(),
  substrato_suporte: z.string().optional(),
  
  // SEÇÃO 4: CHAPA DA PLACA
  substrato: z.string().optional(),
  si_sinal_impresso: z.string().optional(),
  largura_mm: z.coerce.number().optional(),
  altura_mm: z.coerce.number().optional(),
  area_m2: z.coerce.number().optional(),
  
  // SEÇÃO 5: PELÍCULAS
  tipo_pelicula_fundo: z.string().optional(),
  cor_pelicula_fundo: z.string().optional(),
  retro_pelicula_fundo: z.string().optional(),
  tipo_pelicula_legenda_orla: z.string().optional(),
  cor_pelicula_legenda_orla: z.string().optional(),
  retro_pelicula_legenda_orla: z.string().optional(),
  
  // CONTROLE
  fora_plano_manutencao: z.boolean().default(false),
  justificativa_fora_plano: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface IntervencoesSVFormProps {
  tipoOrigem?: 'manutencao_pre_projeto' | 'execucao';
  placaSelecionada?: any;
  loteId?: string;
  rodoviaId?: string;
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
}

export function IntervencoesSVForm({
  tipoOrigem: tipoOrigemProp,
  placaSelecionada,
  loteId,
  rodoviaId,
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false
}: IntervencoesSVFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [codigosFiltrados, setCodigosFiltrados] = useState<readonly {codigo: string, nome: string}[]>([]);
  const [codigoAtual, setCodigoAtual] = useState<string | null>(null);
  
  const tipoOrigem = tipoOrigemProp || 'execucao';
  const isManutencaoRotineira = tipoOrigem === 'manutencao_pre_projeto';
  
  const isCampoEstruturalBloqueado = (campo: string) => {
    // Só bloqueia campos estruturais se for manutenção E houver placa vinculada
    if (!isManutencaoRotineira) return false;
    if (!placaSelecionada) return false; // Nova placa → libera campos
    return (CAMPOS_ESTRUTURAIS['placas'] as readonly string[]).includes(campo);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      suporte: "",
      substrato: "",
      substrato_suporte: "",
      tipo_pelicula_fundo: "",
      tipo_pelicula_legenda_orla: "",
      retro_pelicula_fundo: "",
      retro_pelicula_legenda_orla: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((value) => {
        onDataChange(value);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, modo, onDataChange]);

  useEffect(() => {
    if (placaSelecionada) {
      form.setValue("km_inicial", placaSelecionada.km_inicial?.toString() || "");
      form.setValue("tipo_placa", placaSelecionada.tipo || "");
      form.setValue("codigo_placa", placaSelecionada.codigo || "");
      form.setValue("latitude_inicial", placaSelecionada.latitude_inicial?.toString() || "");
      form.setValue("longitude_inicial", placaSelecionada.longitude_inicial?.toString() || "");
      form.setValue("br", placaSelecionada.br || "");
      form.setValue("snv", placaSelecionada.snv || "");
      form.setValue("velocidade", placaSelecionada.velocidade || "");
      form.setValue("lado", placaSelecionada.lado || "");
      form.setValue("posicao", placaSelecionada.posicao || "");
      form.setValue("suporte", placaSelecionada.suporte || "");
      form.setValue("substrato", placaSelecionada.substrato || "");
      form.setValue("largura_mm", placaSelecionada.largura_m ? placaSelecionada.largura_m * 1000 : undefined);
      form.setValue("altura_mm", placaSelecionada.altura_m ? placaSelecionada.altura_m * 1000 : undefined);
    }
  }, [placaSelecionada, form]);

  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((values) => {
        onDataChange(values);
      });
      return () => subscription.unsubscribe();
    }
  }, [modo, onDataChange, form]);

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
    
    if (tipoPlaca && !placaSelecionada) {
      form.setValue("codigo_placa", "");
    }
  }, [form.watch("tipo_placa")]);

  useEffect(() => {
    setCodigoAtual(form.watch("codigo_placa"));
  }, [form.watch("codigo_placa")]);

  const onSubmit = async (data: FormValues) => {
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

      if (placaSelecionada) {
        const updateData: any = {};
        
        if (data.suporte) updateData.suporte = data.suporte;
        if (data.substrato) updateData.substrato = data.substrato;
        if (data.substrato_suporte) updateData.substrato_suporte = data.substrato_suporte;
        if (data.tipo_pelicula_fundo) updateData.tipo_pelicula_fundo = data.tipo_pelicula_fundo;
        if (data.tipo_pelicula_legenda_orla) updateData.tipo_pelicula_legenda_orla = data.tipo_pelicula_legenda_orla;
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("ficha_placa")
            .update(updateData)
            .eq("id", placaSelecionada.id);

          if (updateError) throw updateError;
        }
      } 
      else if (data.km_inicial && data.tipo_placa && data.codigo_placa && loteId && rodoviaId) {
        const { data: novaPlaca, error: insertError } = await supabase
          .from("ficha_placa")
          .insert({
            user_id: user.id,
            lote_id: loteId,
            rodovia_id: rodoviaId,
            km_inicial: parseFloat(data.km_inicial),
            tipo: data.tipo_placa,
            codigo: data.codigo_placa,
            latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
            longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
            suporte: data.suporte || null,
            substrato: data.substrato || null,
            substrato_suporte: data.substrato_suporte || null,
            tipo_pelicula_fundo: data.tipo_pelicula_fundo || null,
            tipo_pelicula_legenda_orla: data.tipo_pelicula_legenda_orla || null,
            data_vistoria: data.data_intervencao,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        fichaPlacaId = novaPlaca.id;
      } else {
        toast.error("Selecione uma placa do inventário ou preencha KM, Tipo e Código para criar nova");
        return;
      }

      await supabase.from("ficha_placa_intervencoes").insert({
        ficha_placa_id: fichaPlacaId,
        data_intervencao: data.data_intervencao,
        motivo: data.motivo,
        tipo_origem: tipoOrigem,
        suporte: data.suporte || null,
        substrato: data.substrato || null,
        substrato_suporte: data.substrato_suporte || null,
        tipo_pelicula_fundo_novo: data.tipo_pelicula_fundo || null,
        tipo_pelicula_legenda_orla: data.tipo_pelicula_legenda_orla || null,
        retro_fundo: data.retro_pelicula_fundo ? parseFloat(data.retro_pelicula_fundo) : null,
        retro_orla_legenda: data.retro_pelicula_legenda_orla ? parseFloat(data.retro_pelicula_legenda_orla) : null,
        fora_plano_manutencao: data.fora_plano_manutencao,
        justificativa_fora_plano: data.justificativa_fora_plano || null,
        latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
        longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
        tipo: data.tipo_placa || null,
        codigo: data.codigo_placa || null,
        lado: data.lado || null,
        largura_mm: data.largura_mm || null,
        altura_mm: data.altura_mm || null,
        // Novos campos
        br: data.br || null,
        snv: data.snv || null,
        velocidade: data.velocidade || null,
        posicao: data.posicao || null,
        detalhamento_pagina: data.detalhamento_pagina || null,
        qtde_suporte: data.qtde_suporte || null,
        tipo_secao_suporte: data.tipo_secao_suporte || null,
        secao_suporte_mm: data.secao_suporte_mm || null,
        si_sinal_impresso: data.si_sinal_impresso || null,
        cor_pelicula_fundo: data.cor_pelicula_fundo || null,
        cor_pelicula_legenda_orla: data.cor_pelicula_legenda_orla || null,
        area_m2: data.area_m2 || null,
        km_inicial: data.km_inicial ? parseFloat(data.km_inicial) : (placaSelecionada?.km_inicial || null),
      });

      toast.success("Intervenção registrada com sucesso!");
      form.reset();
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
              name="km_inicial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>KM Inicial *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" placeholder="123.456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {!placaSelecionada && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4 items-start">
              <FormField
                control={form.control}
                name="tipo_placa"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="flex items-center gap-2">
                      Tipo de Placa *
                      {isCampoEstruturalBloqueado('tipo') && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isCampoEstruturalBloqueado('tipo')}>
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
                <FormItem className="w-full">
                  <FormLabel className="flex items-center gap-2">
                    Código da Placa *
                    {isCampoEstruturalBloqueado('codigo') && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </FormLabel>
                  {form.watch("tipo_placa") === "Outros" ? (
                    <FormControl>
                      <Input placeholder="Digite o código" {...field} disabled={isCampoEstruturalBloqueado('codigo')} />
                    </FormControl>
                  ) : (
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={codigosFiltrados.length === 0 || isCampoEstruturalBloqueado('codigo')}
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
                          <SelectItem key={placa.codigo} value={placa.codigo} className="cursor-pointer py-1 h-auto min-h-0">
                            <div className="flex items-center gap-1.5">
                              <div className="w-8 h-8 flex-shrink-0">
                                <PlacaPreview codigo={placa.codigo} size="small" />
                              </div>
                              <span className="text-xs leading-tight">{placa.codigo} - {placa.nome}</span>
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
          </>
        )}

        <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
          <h3 className="font-semibold text-primary text-lg">Chapa da Placa e Películas</h3>
          
          <FormField
            control={form.control}
            name="substrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Tipo de Substrato (Chapa)
                  {isCampoEstruturalBloqueado('substrato') && <Lock className="h-3 w-3 text-muted-foreground" />}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isCampoEstruturalBloqueado('substrato')}>
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

          <FormField
            control={form.control}
            name="suporte"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Suporte
                  {isCampoEstruturalBloqueado('suporte') && <Lock className="h-3 w-3 text-muted-foreground" />}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isCampoEstruturalBloqueado('suporte')}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o suporte" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Poste Metálico">Poste Metálico</SelectItem>
                    <SelectItem value="Poste Madeira">Poste Madeira</SelectItem>
                    <SelectItem value="Poste Concreto">Poste Concreto</SelectItem>
                    <SelectItem value="Fixação em Defensa">Fixação em Defensa</SelectItem>
                    <SelectItem value="Fixação em Estrutura Existente">Fixação em Estrutura Existente</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="lado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Lado
                    {isCampoEstruturalBloqueado('lado') && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isCampoEstruturalBloqueado('lado')}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="direito">Direito</SelectItem>
                      <SelectItem value="esquerdo">Esquerdo</SelectItem>
                      <SelectItem value="canteiro_central">Canteiro Central</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="largura_mm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Largura (mm)
                    {isCampoEstruturalBloqueado('largura_mm') && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ex: 600" {...field} disabled={isCampoEstruturalBloqueado('largura_mm')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="altura_mm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Altura (mm)
                    {isCampoEstruturalBloqueado('altura_mm') && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ex: 600" {...field} disabled={isCampoEstruturalBloqueado('altura_mm')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {!hideSubmitButton && (
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Intervenção
          </Button>
        )}
      </form>
    </Form>
  );

  if (modo === 'normal') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Registrar Intervenção - Sinalização Vertical</CardTitle>
          <CardDescription>
            Preencha os dados da intervenção realizada na placa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
        </CardContent>
      </Card>
    );
  }

  return formContent;
}
