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
  
  // SEÇÃO 1: LOCALIZAÇÃO (BR e coordenadas vêm da sessão/GPS)
  snv: z.string().optional(),
  km_inicial: z.string().optional(),
  velocidade: z.string().optional(),
  
  // SEÇÃO 2: IDENTIFICAÇÃO DA PLACA
  tipo_placa: z.string().optional(),
  codigo_placa: z.string().optional(),
  posicao: z.string().optional(), // Mapeado para 'lado' no banco
  detalhamento_pagina: z.coerce.number().optional(),
  si_sinal_impresso: z.string().optional(),
  
  // SEÇÃO 3: SUPORTE
  suporte: z.string().optional(),
  qtde_suporte: z.coerce.number().optional(),
  tipo_secao_suporte: z.string().optional(),
  secao_suporte_mm: z.string().optional(),
  substrato_suporte: z.string().optional(),
  
  // SEÇÃO 4: DIMENSÕES (só nova placa)
  largura_mm: z.coerce.number().optional(),
  altura_mm: z.coerce.number().optional(),
  area_m2: z.coerce.number().optional(),
  
  // SEÇÃO 5: CHAPA DA PLACA
  substrato: z.string().optional(),
  
  // SEÇÃO 6: PELÍCULAS
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
      // Localização
      snv: "",
      km_inicial: "",
      velocidade: "",
      // Identificação
      tipo_placa: "",
      codigo_placa: "",
      posicao: "",
      detalhamento_pagina: undefined,
      si_sinal_impresso: "",
      // Suporte
      suporte: "",
      qtde_suporte: undefined,
      tipo_secao_suporte: "",
      secao_suporte_mm: "",
      substrato_suporte: "",
      // Dimensões
      largura_mm: undefined,
      altura_mm: undefined,
      area_m2: undefined,
      // Chapa
      substrato: "",
      // Películas
      tipo_pelicula_fundo: "",
      cor_pelicula_fundo: "",
      retro_pelicula_fundo: "",
      tipo_pelicula_legenda_orla: "",
      cor_pelicula_legenda_orla: "",
      retro_pelicula_legenda_orla: "",
      // Controle
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
      form.setValue("snv", placaSelecionada.snv || "");
      form.setValue("velocidade", placaSelecionada.velocidade || "");
      form.setValue("posicao", placaSelecionada.posicao || "");
      form.setValue("suporte", placaSelecionada.suporte || "");
      form.setValue("substrato", placaSelecionada.substrato || "");
      form.setValue("substrato_suporte", placaSelecionada.substrato_suporte || "");
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
            posicao: data.posicao || null,
            snv: data.snv || null,
            velocidade: data.velocidade || null,
            suporte: data.suporte || null,
            substrato: data.substrato || null,
            substrato_suporte: data.substrato_suporte || null,
            dimensoes_mm: data.largura_mm && data.altura_mm ? `${data.largura_mm}x${data.altura_mm}` : null,
            largura_m: data.largura_mm ? data.largura_mm / 1000 : null,
            altura_m: data.altura_mm ? data.altura_mm / 1000 : null,
            area_m2: data.area_m2 || null,
            tipo_pelicula_fundo: data.tipo_pelicula_fundo || null,
            cor_pelicula_fundo: data.cor_pelicula_fundo || null,
            tipo_pelicula_legenda_orla: data.tipo_pelicula_legenda_orla || null,
            cor_pelicula_legenda_orla: data.cor_pelicula_legenda_orla || null,
            si_sinal_impresso: data.si_sinal_impresso || null,
            detalhamento_pagina: data.detalhamento_pagina || null,
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
        cor_pelicula_fundo: data.cor_pelicula_fundo || null,
        tipo_pelicula_legenda_orla: data.tipo_pelicula_legenda_orla || null,
        cor_pelicula_legenda_orla: data.cor_pelicula_legenda_orla || null,
        retro_fundo: data.retro_pelicula_fundo ? parseFloat(data.retro_pelicula_fundo) : null,
        retro_orla_legenda: data.retro_pelicula_legenda_orla ? parseFloat(data.retro_pelicula_legenda_orla) : null,
        fora_plano_manutencao: data.fora_plano_manutencao,
        justificativa_fora_plano: data.justificativa_fora_plano || null,
        tipo: data.tipo_placa || null,
        codigo: data.codigo_placa || null,
        posicao: data.posicao || null,
        qtde_suporte: data.qtde_suporte || null,
        tipo_secao_suporte: data.tipo_secao_suporte || null,
        secao_suporte_mm: data.secao_suporte_mm || null,
        si_sinal_impresso: data.si_sinal_impresso || null,
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

          {/* SEÇÃO: LOCALIZAÇÃO */}
          {!placaSelecionada && (
            <div className="space-y-4 border-l-4 border-blue-500 pl-4 bg-blue-50 dark:bg-blue-950/20 py-4 rounded-r-lg">
              <h3 className="font-semibold text-blue-700 dark:text-blue-400 text-lg">📍 Localização</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="snv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SNV</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SNV-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="velocidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Velocidade (km/h)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="40">40</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="80">80</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="110">110</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* SEÇÃO: CARACTERÍSTICAS DA PLACA */}
          {!placaSelecionada && (
            <div className="space-y-4 border-l-4 border-green-500 pl-4 bg-green-50 dark:bg-green-950/20 py-4 rounded-r-lg">
              <h3 className="font-semibold text-green-700 dark:text-green-400 text-lg">🚦 Características da Placa</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="posicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posição</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Lateral Direita">Lateral Direita</SelectItem>
                          <SelectItem value="Lateral Esquerda">Lateral Esquerda</SelectItem>
                          <SelectItem value="Sobre a Pista">Sobre a Pista</SelectItem>
                          <SelectItem value="Canteiro Central">Canteiro Central</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="detalhamento_pagina"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Página de Detalhamento</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="si_sinal_impresso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SI - Sinal Impresso</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* SEÇÃO: SUPORTE */}
          {!placaSelecionada && (
            <div className="space-y-4 border-l-4 border-purple-500 pl-4 bg-purple-50 dark:bg-purple-950/20 py-4 rounded-r-lg">
              <h3 className="font-semibold text-purple-700 dark:text-purple-400 text-lg">🔧 Suporte</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qtde_suporte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade de Suportes</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_secao_suporte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Seção</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Circular">Circular</SelectItem>
                          <SelectItem value="Retangular">Retangular</SelectItem>
                          <SelectItem value="Quadrada">Quadrada</SelectItem>
                          <SelectItem value="Perfil U">Perfil U</SelectItem>
                          <SelectItem value="Perfil I">Perfil I</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="secao_suporte_mm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seção do Suporte (mm)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 76.2 ou 50x50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="substrato_suporte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Substrato do Suporte</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Aço Galvanizado">Aço Galvanizado</SelectItem>
                          <SelectItem value="Alumínio">Alumínio</SelectItem>
                          <SelectItem value="Madeira">Madeira</SelectItem>
                          <SelectItem value="Concreto">Concreto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* SEÇÃO: DIMENSÕES E ÁREA */}
          {!placaSelecionada && (
            <div className="space-y-4 border-l-4 border-orange-500 pl-4 bg-orange-50 dark:bg-orange-950/20 py-4 rounded-r-lg">
              <h3 className="font-semibold text-orange-700 dark:text-orange-400 text-lg">📐 Dimensões e Área</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="largura_mm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Largura (mm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="600" {...field} />
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
                      <FormLabel>Altura (mm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="800" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area_m2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área (m²)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.48" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

        <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
          <h3 className="font-semibold text-primary text-lg">🎨 Chapa da Placa e Películas</h3>
          
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo_pelicula_fundo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Película Fundo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Grau Técnico I">Grau Técnico I</SelectItem>
                      <SelectItem value="Grau Técnico II">Grau Técnico II</SelectItem>
                      <SelectItem value="Grau Técnico III">Grau Técnico III</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cor_pelicula_fundo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor Película Fundo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Branco">Branco</SelectItem>
                      <SelectItem value="Amarelo">Amarelo</SelectItem>
                      <SelectItem value="Verde">Verde</SelectItem>
                      <SelectItem value="Azul">Azul</SelectItem>
                      <SelectItem value="Vermelho">Vermelho</SelectItem>
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
                  <FormLabel>Retrorrefletância Fundo</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ex: 250" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_pelicula_legenda_orla"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Película Legenda/Orla</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Grau Técnico I">Grau Técnico I</SelectItem>
                      <SelectItem value="Grau Técnico II">Grau Técnico II</SelectItem>
                      <SelectItem value="Grau Técnico III">Grau Técnico III</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cor_pelicula_legenda_orla"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor Película Legenda/Orla</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Preto">Preto</SelectItem>
                      <SelectItem value="Branco">Branco</SelectItem>
                      <SelectItem value="Amarelo">Amarelo</SelectItem>
                      <SelectItem value="Vermelho">Vermelho</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="retro_pelicula_legenda_orla"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retrorrefletância Legenda/Orla</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ex: 250" {...field} />
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
