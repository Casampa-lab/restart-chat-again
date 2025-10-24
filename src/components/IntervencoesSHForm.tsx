import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MapPin, Check, PaintBucket, Lock, Info, FileText } from "lucide-react";
import { useTipoOrigem } from "@/hooks/useTipoOrigem";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { TIPOS_ORIGEM, LABELS_TIPO_ORIGEM } from "@/constants/camposEstruturais";

interface IntervencoesSHFormProps {
  marcaSelecionada?: {
    id: string;
    km_inicial: number;
    km_final: number;
    snv?: string;
  };
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
  modoOperacao?: 'manutencao' | 'execucao' | null;
}

const MATERIAIS = [
  "Tinta Acrílica",
  "Tinta Termoplástica",
  "Resina Acrílica",
  "Película Pré-fabricada",
  "Outros"
];

const CORES = ["Branca", "Amarela", "Azul", "Vermelha"];

const TIPOS_DEMARCACAO = [
  "Linha Contínua",
  "Linha Tracejada",
  "Linha Dupla Contínua",
  "Linha Dupla Tracejada",
  "Linha Mista",
  "Zebrado",
  "Faixa de Pedestres",
  "Seta Direcional",
  "Símbolo",
  "Linha de Bordo"
];

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  km_inicial: z.string().min(1, "KM inicial é obrigatório"),
  km_final: z.string().min(1, "KM final é obrigatório"),
  snv: z.string().optional(),
  tipo_demarcacao: z.string().optional(),
  cor: z.string().optional(),
  posicao: z.string().optional(),
  codigo: z.string().optional(),
  largura_cm: z.string().optional(),
  espessura_cm: z.string().optional(),
  material: z.string().optional(),
  latitude_inicial: z.string().min(1, "Latitude inicial é obrigatória"),
  longitude_inicial: z.string().min(1, "Longitude inicial é obrigatória"),
  latitude_final: z.string().min(1, "Latitude final é obrigatória"),
  longitude_final: z.string().min(1, "Longitude final é obrigatória"),
  observacao: z.string().optional(),
});

const IntervencoesSHForm = ({ 
  marcaSelecionada, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId,
  modoOperacao
}: IntervencoesSHFormProps) => {
  const [isCapturingInicial, setIsCapturingInicial] = useState(false);
  const [isCapturingFinal, setIsCapturingFinal] = useState(false);
  const { tipoOrigem, setTipoOrigem, isCampoEstruturalBloqueado, isManutencaoRotineira } = useTipoOrigem('marcas_longitudinais');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      motivo: "",
      km_inicial: "",
      km_final: "",
      snv: "",
      tipo_demarcacao: "",
      cor: "",
      posicao: "",
      codigo: "",
      largura_cm: "",
      espessura_cm: "",
      material: "",
      latitude_inicial: "",
      longitude_inicial: "",
      latitude_final: "",
      longitude_final: "",
      observacao: "",
    },
  });


  // Sincronizar modo operação com tipo origem
  useEffect(() => {
    if (modoOperacao) {
      setTipoOrigem(modoOperacao === 'manutencao' ? 'manutencao_rotineira' : 'execucao');
    }
  }, [modoOperacao, setTipoOrigem]);

  // Preencher formulário com dados da marca selecionada
  useEffect(() => {
    if (marcaSelecionada && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        km_inicial: marcaSelecionada.km_inicial?.toString() || "",
        km_final: marcaSelecionada.km_final?.toString() || "",
        snv: (marcaSelecionada as any).snv || "",
        tipo_demarcacao: (marcaSelecionada as any).tipo_demarcacao || "",
        cor: (marcaSelecionada as any).cor || "",
        posicao: (marcaSelecionada as any).posicao || "",
        codigo: (marcaSelecionada as any).codigo || "",
        largura_cm: (marcaSelecionada as any).largura_cm?.toString() || "",
        espessura_cm: (marcaSelecionada as any).espessura_cm?.toString() || "",
        material: (marcaSelecionada as any).material || "",
        latitude_inicial: "",
        longitude_inicial: "",
        observacao: "",
      });
    }
  }, [marcaSelecionada, modo, form]);

  const handleCapturarGPSInicial = async () => {
    setIsCapturingInicial(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            form.setValue('latitude_inicial', position.coords.latitude.toString());
            form.setValue('longitude_inicial', position.coords.longitude.toString());
            toast.success('📍 GPS Inicial capturado!');
            setIsCapturingInicial(false);
          },
          (error) => {
            toast.error(`Erro ao capturar GPS inicial: ${error.message}. Digite manualmente.`);
            setIsCapturingInicial(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } else {
        toast.error('GPS não disponível. Digite as coordenadas manualmente.');
        setIsCapturingInicial(false);
      }
    } catch (err) {
      console.error('Erro GPS:', err);
      toast.error('Erro ao acessar GPS. Digite manualmente.');
      setIsCapturingInicial(false);
    }
  };

  const handleCapturarGPSFinal = async () => {
    setIsCapturingFinal(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            form.setValue('latitude_final', position.coords.latitude.toString());
            form.setValue('longitude_final', position.coords.longitude.toString());
            toast.success('📍 GPS Final capturado!');
            setIsCapturingFinal(false);
          },
          (error) => {
            toast.error(`Erro ao capturar GPS final: ${error.message}. Digite manualmente.`);
            setIsCapturingFinal(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } else {
        toast.error('GPS não disponível. Digite as coordenadas manualmente.');
        setIsCapturingFinal(false);
      }
    } catch (err) {
      console.error('Erro GPS:', err);
      toast.error('Erro ao acessar GPS. Digite manualmente.');
      setIsCapturingFinal(false);
    }
  };

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
    
    // Validação: Manutenção Rotineira exige marca existente
    if (isManutencaoRotineira && !marcaSelecionada) {
      toast.error("Para Manutenção Rotineira, selecione uma marca longitudinal do inventário primeiro");
      return;
    }

    try {
      const { error } = await supabase
        .from("ficha_marcas_longitudinais_intervencoes")
        .insert({
          ficha_marcas_longitudinais_id: marcaSelecionada?.id || null,
          data_intervencao: data.data_intervencao,
          motivo: data.motivo,
          km_inicial: data.km_inicial ? parseFloat(data.km_inicial) : null,
          km_final: data.km_final ? parseFloat(data.km_final) : null,
          snv: data.snv || null,
          tipo_demarcacao: data.tipo_demarcacao || null,
          cor: data.cor || null,
          posicao: data.posicao || null,
          codigo: data.codigo || null,
          largura_cm: data.largura_cm ? parseFloat(data.largura_cm) : null,
          espessura_cm: data.espessura_cm ? parseFloat(data.espessura_cm) : null,
          material: data.material || null,
          latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
          longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
          latitude_final: data.latitude_final ? parseFloat(data.latitude_final) : null,
          longitude_final: data.longitude_final ? parseFloat(data.longitude_final) : null,
          observacao: data.observacao || null,
          tipo_origem: tipoOrigem,
        });

      if (error) throw error;

      toast.success("Intervenção em sinalização horizontal registrada com sucesso");

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
        <CardTitle>Intervenção em Marcas Longitudinais</CardTitle>
        <CardDescription>
          {marcaSelecionada 
            ? `Registrando intervenção para marca entre km ${marcaSelecionada.km_inicial} - ${marcaSelecionada.km_final}${marcaSelecionada.snv ? ` (SNV: ${marcaSelecionada.snv})` : ''}`
            : "Selecione uma marca longitudinal do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!modoOperacao ? (
          <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
            <Label className="text-base font-semibold">Tipo de Intervenção</Label>
            <RadioGroup value={tipoOrigem} onValueChange={setTipoOrigem}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manutencao_rotineira" id="pre-sh" />
                <Label htmlFor="pre-sh" className="flex items-center gap-2 cursor-pointer font-normal">
                  🟡 {LABELS_TIPO_ORIGEM.manutencao_rotineira}
                  <Badge variant="outline" className="text-xs">Campos estruturais bloqueados</Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="execucao" id="exec-sh" />
                <Label htmlFor="exec-sh" className="cursor-pointer font-normal">
                  🟢 {LABELS_TIPO_ORIGEM.execucao}
                </Label>
              </div>
            </RadioGroup>
            {isManutencaoRotineira && (
              <Alert><Info className="h-4 w-4" /><AlertDescription>Base normativa: IN 3/2025, Art. 17-19.</AlertDescription></Alert>
            )}
          </div>
        ) : (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Modo selecionado: {modoOperacao === 'manutencao' 
                ? '🟠 Manutenção Rotineira (IN-3)' 
                : '🟢 Execução de Projeto'
              }
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Dados Básicos da Intervenção */}
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
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Intervenção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Implantação">Implantação</SelectItem>
                        <SelectItem value="Pintura Nova">Pintura Nova</SelectItem>
                        <SelectItem value="Repintura">Repintura</SelectItem>
                        <SelectItem value="Reforço">Reforço</SelectItem>
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
                    <FormLabel>KM Inicial</FormLabel>
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
                    <FormLabel>KM Final</FormLabel>
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
                    <FormLabel>SNV</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 116BMG1010" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Características da Demarcação */}
            <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <PaintBucket className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary text-lg">Características da Demarcação</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_demarcacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Tipo de Demarcação
                      {isCampoEstruturalBloqueado('tipo_demarcacao') && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isCampoEstruturalBloqueado('tipo_demarcacao')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          {TIPOS_DEMARCACAO.map((tipo) => (
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

                <FormField
                  control={form.control}
                  name="posicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Posição
                        {isCampoEstruturalBloqueado('posicao') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Eixo, Bordo Direito" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('posicao')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Código
                        {isCampoEstruturalBloqueado('codigo') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: LBO, LCO" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('codigo')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="largura_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Largura (cm)
                        {isCampoEstruturalBloqueado('largura_cm') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="10" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('largura_cm')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="espessura_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Espessura (cm)
                        {isCampoEstruturalBloqueado('espessura_cm') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="0.3" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('espessura_cm')}
                        />
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
                      <FormLabel className="flex items-center gap-2">
                        Material Utilizado
                        {isCampoEstruturalBloqueado('material') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isCampoEstruturalBloqueado('material')}
                      >
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

            {/* Localização GPS */}
            <div className="space-y-6 border-l-4 border-green-500 pl-4 bg-green-50 dark:bg-green-950/20 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-700 dark:text-green-500 text-lg">
                  Coordenadas GPS (Ponto Inicial e Final)
                </h3>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  📍 Este é um elemento <strong>linear</strong>. Capture o GPS no <strong>início</strong> e no <strong>fim</strong> do trecho de intervenção.
                </AlertDescription>
              </Alert>

              {/* GPS Inicial */}
              <div className="space-y-3 p-3 border border-green-200 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-green-700">📍 Ponto Inicial</Label>
                  {modo === 'normal' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCapturarGPSInicial}
                      disabled={isCapturingInicial}
                    >
                      {isCapturingInicial ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Capturando...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-3 w-3" />
                          Capturar GPS Inicial
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="latitude_inicial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Latitude Inicial *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="-15.123456"
                            {...field}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude_inicial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Longitude Inicial *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="-47.123456"
                            {...field}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* GPS Final */}
              <div className="space-y-3 p-3 border border-green-200 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-green-700">📍 Ponto Final</Label>
                  {modo === 'normal' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCapturarGPSFinal}
                      disabled={isCapturingFinal}
                    >
                      {isCapturingFinal ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Capturando...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-3 w-3" />
                          Capturar GPS Final
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="latitude_final"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Latitude Final *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="-15.234567"
                            {...field}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude_final"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Longitude Final *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="-47.234567"
                            {...field}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Campo de Observações (Texto Livre) */}
            <div className="space-y-4 border-l-4 border-amber-500 pl-4 bg-amber-50 dark:bg-amber-950/20 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-700 dark:text-amber-500 text-lg">
                  Observações da Intervenção
                </h3>
              </div>
              
              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Observações
                      <Badge variant="outline" className="text-xs">Campo livre</Badge>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Repintura realizada no eixo central e bordo direito entre km 10+500 e 12+300. Acostamento não foi pintado devido ao tráfego intenso."
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      💡 Use este campo para registrar detalhes sobre a localização da repintura (eixo, bordos, acostamento) 
                      e outras informações relevantes que não podem ser capturadas nos campos estruturais.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!hideSubmitButton && (
              <Button 
                type="submit" 
                className="w-full" 
                disabled={
                  (isManutencaoRotineira && !marcaSelecionada) || 
                  modo === 'controlado'
                }
              >
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

export default IntervencoesSHForm;
export { IntervencoesSHForm };
