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
import { Loader2, MapPin, Check, PaintBucket } from "lucide-react";

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

const SIGLAS_INSCRICAO = ["ZPA", "MOF", "PEM", "LEGENDA", "Outros"];

const TIPOS_INSCRICAO = [
  "Zebrado de preenchimento da área de pavimento não utilizável",
  "Seta indicativa de mudança obrigatória de faixa",
  "Setas indicativas de posicionamento na pista para a execução de movimentos",
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
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  km_final: z.string().min(1, "KM final é obrigatório"),
  snv: z.string().optional(),
  sigla: z.string().optional(),
  tipo_inscricao: z.string().optional(),
  cor: z.string().optional(),
  dimensoes: z.string().optional(),
  area_m2: z.string().optional(),
  espessura_mm: z.string().optional(),
  material_utilizado: z.string().optional(),
  estado_conservacao: z.string().optional(),
  observacao: z.string().optional(),
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
  const { tipoOrigem, setTipoOrigem, isCampoEstruturalBloqueado, isManutencaoPreProjeto } = useTipoOrigem('inscricoes');
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      km_inicial: "",
      km_final: "",
      sigla: "",
      tipo_inscricao: "",
      cor: "",
      dimensoes: "",
      area_m2: "",
      espessura_mm: "3.00",
      material_utilizado: "Termoplástico",
      estado_conservacao: "",
      observacao: "",
      latitude: "",
      longitude: "",
      fora_plano_manutencao: false,
      justificativa_fora_plano: "",
    },
  });

  // Preencher formulário com dados da inscrição selecionada
  useEffect(() => {
    if (inscricaoSelecionada && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        sigla: (inscricaoSelecionada as any).sigla || "",
        tipo_inscricao: (inscricaoSelecionada as any).tipo_inscricao || "",
        cor: (inscricaoSelecionada as any).cor || "",
        dimensoes: (inscricaoSelecionada as any).dimensoes || "",
        area_m2: (inscricaoSelecionada as any).area_m2?.toString() || "",
        espessura_mm: (inscricaoSelecionada as any).espessura_mm?.toString() || "3.00",
        material_utilizado: (inscricaoSelecionada as any).material_utilizado || "Termoplástico",
        estado_conservacao: "",
        observacao: "",
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
          km_inicial: data.km_inicial ? parseFloat(data.km_inicial) : null,
          km_final: data.km_final ? parseFloat(data.km_final) : null,
          snv: data.snv || null,
          sigla: data.sigla || null,
          tipo_inscricao: data.tipo_inscricao || null,
          cor: data.cor || null,
          dimensoes: data.dimensoes || null,
          area_m2: data.area_m2 ? parseFloat(data.area_m2) : null,
          espessura_mm: data.espessura_mm ? parseFloat(data.espessura_mm) : null,
          material_utilizado: data.material_utilizado || null,
          estado_conservacao: data.estado_conservacao || null,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          observacao: data.observacao || null,
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
        <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
          <Label className="text-base font-semibold">Tipo de Intervenção</Label>
          <RadioGroup value={tipoOrigem} onValueChange={setTipoOrigem}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manutencao_pre_projeto" id="pre-insc" />
              <Label htmlFor="pre-insc" className="flex items-center gap-2 cursor-pointer font-normal">
                🟡 {LABELS_TIPO_ORIGEM.manutencao_pre_projeto}
                <Badge variant="outline" className="text-xs">Campos estruturais bloqueados</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="execucao" id="exec-insc" />
              <Label htmlFor="exec-insc" className="cursor-pointer font-normal">
                🟢 {LABELS_TIPO_ORIGEM.execucao}
              </Label>
            </div>
          </RadioGroup>
          {isManutencaoPreProjeto && (
            <Alert><Info className="h-4 w-4" /><AlertDescription>Base normativa: IN 3/2025, Art. 17-19.</AlertDescription></Alert>
          )}
        </div>
        <Form {...form}>
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
                name="snv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SNV (Segmento Nacional de Vias)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: BR-040-200-350" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            {/* ========== SEÇÃO 3: CARACTERÍSTICAS DA INSCRIÇÃO (AZUL) ========== */}
            <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <PaintBucket className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary text-lg">Características da Inscrição</h3>
              </div>
              
              {/* Grid principal - 3 campos em linha */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sigla"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sigla</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a sigla" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SIGLAS_INSCRICAO.map((sigla) => (
                            <SelectItem key={sigla} value={sigla}>
                              {sigla}
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
                name="tipo_inscricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Tipo de Inscrição
                      {isCampoEstruturalBloqueado('tipo_inscricao') && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isCampoEstruturalBloqueado('tipo_inscricao')}
                    >
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
                    <FormLabel className="flex items-center gap-2">
                      Cor
                      {isCampoEstruturalBloqueado('cor') && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isCampoEstruturalBloqueado('cor')}
                    >
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
              </div>
              
              {/* Grid secundário - dimensões e medidas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  name="espessura_mm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Espessura (mm)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="3.00" {...field} />
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
              </div>
              
              {/* Material - full width */}
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="material_utilizado"
                  render={({ field }) => (
                    <FormItem>
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
              </div>
            </div>

            {/* ========== SEÇÃO 4: OBSERVAÇÕES E ESTADO ========== */}
            <div className="space-y-4">
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
                  <FormItem>
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
                name="fora_plano_manutencao"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Fora do Plano de Manutenção</FormLabel>
                  </FormItem>
                )}
              />

              {form.watch("fora_plano_manutencao") && (
                <FormField
                  control={form.control}
                  name="justificativa_fora_plano"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justificativa</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Justifique por que está fora do plano..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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
