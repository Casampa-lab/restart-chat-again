import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Milestone, Lock, Info } from "lucide-react";
import { useTipoOrigem } from "@/hooks/useTipoOrigem";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { TIPOS_ORIGEM, LABELS_TIPO_ORIGEM, CAMPOS_ESTRUTURAIS } from "@/constants/camposEstruturais";

const SOLUCOES_CILINDROS = [
  "Manter",
  "Remover", 
  "Implantar",
  "Substituir"
];

const MOTIVOS_REMOCAO_SUBSTITUICAO = [
  "1 - Material fora do padrão das soluções propostas/obsoleto",
  "2 - Material dentro do padrão das soluções, porém, sofreu atualização com os novos parâmetros levantados",
  "3 - Material danificado",
  "4 - Encontra-se em local impróprio/indevido"
];

const formSchema = z.object({
  data_intervencao: z.string().min(1, "Data é obrigatória"),
  snv: z.string().optional(),
  solucao: z.string().min(1, "Solução é obrigatória"),
  motivo: z.string().default("-"),
  km_inicial: z.string().min(1, "km Inicial é obrigatório"),
  km_final: z.string().min(1, "km Final é obrigatório"),
  local_implantacao: z.string().optional(),
  espacamento_m: z.string().optional(),
  extensao_km: z.string().optional(),
  cor_corpo: z.string().min(1, "Cor do corpo é obrigatória"),
  cor_refletivo: z.string().optional(),
  tipo_refletivo: z.string().optional(),
  quantidade: z.string().optional(),
  latitude_inicial: z.string().optional(),
  longitude_inicial: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IntervencoesCilindrosFormProps {
  tipoOrigem?: 'manutencao_pre_projeto' | 'execucao';
  cilindroSelecionado?: {
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
}

export function IntervencoesCilindrosForm({ 
  tipoOrigem: tipoOrigemProp,
  cilindroSelecionado, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: IntervencoesCilindrosFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tipoOrigem = tipoOrigemProp || 'execucao';
  const isManutencaoRotineira = tipoOrigem === 'manutencao_pre_projeto';
  
  const isCampoEstruturalBloqueado = (campo: string) => {
    if (!isManutencaoRotineira) return false;
    return (CAMPOS_ESTRUTURAIS['cilindros'] as readonly string[]).includes(campo);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split('T')[0],
      snv: "",
      solucao: "",
      motivo: "-",
      km_inicial: "",
      km_final: "",
      local_implantacao: "",
      espacamento_m: "",
      extensao_km: "",
      cor_corpo: "",
      cor_refletivo: "",
      tipo_refletivo: "",
      quantidade: "",
    latitude_inicial: "",
    longitude_inicial: "",
    },
  });

  const solucaoAtual = form.watch('solucao');
  const motivoAtual = form.watch('motivo');
  const mostrarMotivosNumerados = solucaoAtual === 'Remover' || solucaoAtual === 'Substituir';
  const motivoObrigatorio = mostrarMotivosNumerados && (!motivoAtual || motivoAtual === '-' || motivoAtual.trim() === '');

  // Preencher formulário com dados do cilindro selecionado
  useEffect(() => {
    if (cilindroSelecionado && modo === 'normal') {
      form.reset({
        data_intervencao: new Date().toISOString().split('T')[0],
        snv: (cilindroSelecionado as any).snv || "",
        solucao: "",
        motivo: "-",
        km_inicial: cilindroSelecionado.km_inicial?.toString() || "",
        km_final: cilindroSelecionado.km_final?.toString() || "",
        local_implantacao: (cilindroSelecionado as any).local_implantacao || "",
        espacamento_m: (cilindroSelecionado as any).espacamento_m?.toString() || "",
        extensao_km: (cilindroSelecionado as any).extensao_km?.toString() || "",
        cor_corpo: (cilindroSelecionado as any).cor_corpo || "",
        cor_refletivo: (cilindroSelecionado as any).cor_refletivo || "",
        tipo_refletivo: (cilindroSelecionado as any).tipo_refletivo || "",
        quantidade: (cilindroSelecionado as any).quantidade?.toString() || "",
        latitude_inicial: "",
        longitude_inicial: "",
      });
    }
  }, [cilindroSelecionado, modo, form]);

  // Resetar motivo quando solução mudar
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'solucao') {
        if (value.solucao === 'Manter' || value.solucao === 'Implantar') {
          form.setValue('motivo', '-');
        } else if (value.solucao === 'Remover' || value.solucao === 'Substituir') {
          form.setValue('motivo', '');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Propagar mudanças em tempo real no modo controlado
  useEffect(() => {
    if (modo === 'controlado' && onDataChange) {
      const subscription = form.watch((value) => {
        onDataChange(value);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, modo, onDataChange]);

  const onSubmit = async (data: FormData) => {
    if (modo === 'controlado') {
      if (onDataChange) onDataChange(data);
      return;
    }
    
    // Validação: Manutenção Rotineira exige cilindro existente
    if (isManutencaoRotineira && !cilindroSelecionado) {
      toast.error("Para Manutenção Rotineira, selecione um cilindro do inventário primeiro");
      return;
    }

    setIsSubmitting(true);
    
    // Log de debug
    console.log("📋 Dados do formulário:", {
      solucao: data.solucao,
      motivo: data.motivo,
      motivoLength: data.motivo?.length,
      motivoTrimmed: data.motivo?.trim()
    });

    // Validar motivo condicional
    if ((data.solucao === 'Remover' || data.solucao === 'Substituir') && 
        (!data.motivo || data.motivo === '-' || data.motivo.trim() === '')) {
      toast.error("⚠️ Selecione um motivo específico para Remoção ou Substituição");
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar autenticado para registrar uma intervenção');
        setIsSubmitting(false);
        return;
      }

      // Validar lote e rodovia obrigatórios
      if (!loteId || !rodoviaId) {
        toast.error('Lote e rodovia são obrigatórios');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("ficha_cilindros_intervencoes")
        .insert({
          ficha_cilindros_id: cilindroSelecionado?.id || null,
          data_intervencao: data.data_intervencao,
          solucao: data.solucao,
          motivo: data.motivo,
          km_inicial: data.km_inicial ? parseFloat(data.km_inicial) : null,
          km_final: data.km_final ? parseFloat(data.km_final) : null,
          snv: data.snv || null,
          local_implantacao: data.local_implantacao || null,
          espacamento_m: data.espacamento_m ? parseFloat(data.espacamento_m) : null,
          extensao_km: data.extensao_km ? parseFloat(data.extensao_km) : null,
          cor_corpo: data.cor_corpo || null,
          cor_refletivo: data.cor_refletivo || null,
          tipo_refletivo: data.tipo_refletivo || null,
          quantidade: data.quantidade ? parseInt(data.quantidade) : null,
          latitude_inicial: data.latitude_inicial ? parseFloat(data.latitude_inicial) : null,
          longitude_inicial: data.longitude_inicial ? parseFloat(data.longitude_inicial) : null,
          tipo_origem: tipoOrigem,
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId
        });

      if (error) throw error;

      toast.success("Intervenção registrada com sucesso!");
      form.reset();
      onIntervencaoRegistrada?.();
    } catch (error: any) {
      console.error("Erro ao registrar intervenção:", error);
      toast.error("Erro ao registrar intervenção: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Cilindros Delimitadores</CardTitle>
        <CardDescription>
          {cilindroSelecionado 
            ? `Registrando intervenção para cilindro entre km ${cilindroSelecionado.km_inicial} - ${cilindroSelecionado.km_final}${cilindroSelecionado.snv ? ` (SNV: ${cilindroSelecionado.snv})` : ''}`
            : "Selecione um cilindro do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                name="solucao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solução *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a solução" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOLUCOES_CILINDROS.map((sol) => (
                          <SelectItem key={sol} value={sol}>
                            {sol}
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
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={mostrarMotivosNumerados ? "text-destructive font-semibold" : ""}>
                      Motivo {mostrarMotivosNumerados && <span className="text-destructive">*</span>}
                    </FormLabel>
                    {mostrarMotivosNumerados ? (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MOTIVOS_REMOCAO_SUBSTITUICAO.map((motivo) => (
                            <SelectItem key={motivo} value={motivo}>
                              {motivo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input 
                          value="-" 
                          disabled 
                          className="bg-muted text-muted-foreground"
                        />
                      </FormControl>
                    )}
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
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="Ex: 100.500" 
                        {...field} 
                      />
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
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="Ex: 100.800" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Características dos Cilindros */}
            <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 py-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <Milestone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary text-lg">Características dos Cilindros</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cor_corpo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Cor (Corpo)
                        {isCampoEstruturalBloqueado('cor_corpo') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isCampoEstruturalBloqueado('cor_corpo')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Amarela">Amarela</SelectItem>
                          <SelectItem value="Branca">Branca</SelectItem>
                          <SelectItem value="Preta">Preta</SelectItem>
                          <SelectItem value="Laranja">Laranja</SelectItem>
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
                      <FormLabel className="flex items-center gap-2">
                        Cor (Refletivo)
                        {isCampoEstruturalBloqueado('cor_refletivo') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isCampoEstruturalBloqueado('cor_refletivo')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Amarela">Amarela</SelectItem>
                          <SelectItem value="Branca">Branca</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_refletivo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Tipo Refletivo
                        {isCampoEstruturalBloqueado('tipo_refletivo') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isCampoEstruturalBloqueado('tipo_refletivo')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="III">III</SelectItem>
                          <SelectItem value="X">X</SelectItem>
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
                      <FormLabel className="flex items-center gap-2">
                        Quantidade (und)
                        {isCampoEstruturalBloqueado('quantidade') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 100" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('quantidade')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="local_implantacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Local de Implantação
                        {isCampoEstruturalBloqueado('local_implantacao') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isCampoEstruturalBloqueado('local_implantacao')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Eixo">Eixo</SelectItem>
                          <SelectItem value="Bordo">Bordo</SelectItem>
                          <SelectItem value="Canteiro Central">Canteiro Central</SelectItem>
                          <SelectItem value="Acostamento">Acostamento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="espacamento_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Espaçamento (m)
                        {isCampoEstruturalBloqueado('espacamento_m') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Ex: 4.00" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('espacamento_m')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="extensao_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Extensão (km)
                        {isCampoEstruturalBloqueado('extensao_km') && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001" 
                          placeholder="Ex: 0.500" 
                          {...field}
                          disabled={isCampoEstruturalBloqueado('extensao_km')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {!hideSubmitButton && (
              <>
                {motivoObrigatorio && (
                  <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      ⚠️ Selecione um motivo específico antes de registrar a intervenção
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    isSubmitting || 
                    (isManutencaoRotineira && !cilindroSelecionado) || 
                    modo === 'controlado' ||
                    motivoObrigatorio
                  }
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Intervenção
                </Button>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
