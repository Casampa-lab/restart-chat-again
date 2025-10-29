// ==============================
// IntervencoesCilindrosForm.tsx
// ==============================
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
import { Loader2, Info } from "lucide-react";
import { TIPOS_ORIGEM, LABELS_TIPO_ORIGEM, CAMPOS_ESTRUTURAIS } from "@/constants/camposEstruturais";

const SOLUCOES_CILINDROS = ["Manter", "Remover", "Implantar", "Substituir"] as const;
const MOTIVOS_REMOCAO_SUBSTITUICAO = [
  "1 - Material fora do padrão das soluções propostas/obsoleto",
  "2 - Material dentro do padrão das soluções, porém, sofreu atualização com os novos parâmetros levantados",
  "3 - Material danificado",
  "4 - Encontra-se em local impróprio/indevido",
] as const;

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

export interface IntervencoesCilindrosFormProps {
  tipoOrigem?: "manutencao_pre_projeto" | "execucao";
  cilindroSelecionado?: {
    id: string;
    km_inicial: number;
    km_final: number;
    snv?: string;
    local_implantacao?: string;
    espacamento_m?: number;
    extensao_km?: number;
    cor_corpo?: string;
    cor_refletivo?: string;
    tipo_refletivo?: string;
    quantidade?: number;
  };
  /** Intervenção selecionada no viewer para preencher o formulário em modo de visualização/edição controlada */
  intervencaoSelecionada?: any;
  /** Quando usado como formulário controlado pelo pai, não faz insert — apenas propaga mudanças */
  modo?: "normal" | "controlado";
  onDataChange?: (data: any) => void;
  /** Esconde botão de submit quando for apenas visualização/controle externo */
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
  /** callback após insert no modo normal */
  onIntervencaoRegistrada?: () => void;
}

export function IntervencoesCilindrosForm({
  tipoOrigem: tipoOrigemProp,
  cilindroSelecionado,
  intervencaoSelecionada,
  modo = "controlado",
  onDataChange,
  hideSubmitButton = true,
  loteId,
  rodoviaId,
  onIntervencaoRegistrada,
}: IntervencoesCilindrosFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tipoOrigem = tipoOrigemProp || "execucao";
  const isManutencaoRotineira = tipoOrigem === "manutencao_pre_projeto";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_intervencao: new Date().toISOString().split("T")[0],
      snv: cilindroSelecionado?.snv || "",
      solucao: "",
      motivo: "-",
      km_inicial: cilindroSelecionado?.km_inicial?.toString() || "",
      km_final: cilindroSelecionado?.km_final?.toString() || "",
      local_implantacao: cilindroSelecionado?.local_implantacao || "",
      espacamento_m: cilindroSelecionado?.espacamento_m?.toString() || "",
      extensao_km: cilindroSelecionado?.extensao_km?.toString() || "",
      cor_corpo: cilindroSelecionado?.cor_corpo || "",
      cor_refletivo: cilindroSelecionado?.cor_refletivo || "",
      tipo_refletivo: cilindroSelecionado?.tipo_refletivo || "",
      quantidade: cilindroSelecionado?.quantidade?.toString() || "",
      latitude_inicial: "",
      longitude_inicial: "",
    },
  });

  // 🔁 Quando vem uma intervenção selecionada (olhinho), preencher o form
  useEffect(() => {
    if (!intervencaoSelecionada) return;

    const toStr = (v: any) => (v === null || v === undefined ? "" : String(v));
    const toDateInput = (v: any) => {
      try {
        const d = v ? new Date(v) : new Date();
        return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    form.reset({
      data_intervencao: toDateInput(intervencaoSelecionada.data_intervencao || intervencaoSelecionada.created_at),
      snv: toStr(intervencaoSelecionada.snv),
      solucao: toStr(intervencaoSelecionada.solucao),
      motivo: toStr(intervencaoSelecionada.motivo || "-"),
      km_inicial: toStr(intervencaoSelecionada.km_inicial),
      km_final: toStr(intervencaoSelecionada.km_final),
      local_implantacao: toStr(intervencaoSelecionada.local_implantacao),
      espacamento_m: toStr(intervencaoSelecionada.espacamento_m),
      extensao_km: toStr(intervencaoSelecionada.extensao_km),
      cor_corpo: toStr(intervencaoSelecionada.cor_corpo),
      cor_refletivo: toStr(intervencaoSelecionada.cor_refletivo),
      tipo_refletivo: toStr(intervencaoSelecionada.tipo_refletivo),
      quantidade: toStr(intervencaoSelecionada.quantidade),
      latitude_inicial: toStr(intervencaoSelecionada.latitude_inicial),
      longitude_inicial: toStr(intervencaoSelecionada.longitude_inicial),
    });
  }, [intervencaoSelecionada, form]);

  // 🔄 Propaga mudanças em tempo real quando controlado
  useEffect(() => {
    if (modo !== "controlado" || !onDataChange) return;
    const sub = form.watch((value) => {
      onDataChange(value);
    });
    return () => sub.unsubscribe();
  }, [form, modo, onDataChange]);

  // 🔧 Se usuário preencher km_inicial/km_final, calcula extensão_km automaticamente (não sobrescreve se já houver)
  useEffect(() => {
    const sub = form.watch((value, { name }) => {
      if (name === "km_inicial" || name === "km_final") {
        const ki = Number(String(value.km_inicial || "").replace(",", "."));
        const kf = Number(String(value.km_final || "").replace(",", "."));
        if (!isNaN(ki) && !isNaN(kf) && kf >= ki) {
          const ext = (kf - ki).toFixed(3);
          if (!value.extensao_km || value.extensao_km.trim() === "") {
            form.setValue("extensao_km", ext, { shouldDirty: true, shouldValidate: false });
          }
        }
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  const onSubmit = async (_data: FormData) => {
    // No modo controlado, quem salva é o pai (RegistrarIntervencaoCampo)
    if (modo === "controlado") {
      toast.info("Dados prontos para envio pelo fluxo externo.");
      return;
    }

    // Modo normal (se algum dia usar este form sozinho)
    try {
      setIsSubmitting(true);
      toast.success("Intervenção de cilindros registrada (modo normal).");
      onIntervencaoRegistrada?.();
      form.reset();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao registrar intervenção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const solucaoAtual = form.watch("solucao");
  const motivoAtual = form.watch("motivo");
  const mostrarMotivosNumerados = solucaoAtual === "Remover" || solucaoAtual === "Substituir";
  const solucaoObrigatoria = !solucaoAtual || solucaoAtual.trim() === "";
  const motivoObrigatorio = mostrarMotivosNumerados && (!motivoAtual || motivoAtual === "-" || motivoAtual.trim() === "");

  const isCampoEstruturalBloqueado = (campo: string) => {
    if (!isManutencaoRotineira) return false;
    return (CAMPOS_ESTRUTURAIS["cilindros"] as readonly string[]).includes(campo);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Cilindros Delimitadores</CardTitle>
        <CardDescription>
          {tipoOrigem ? `Origem: ${LABELS_TIPO_ORIGEM[tipoOrigem as keyof typeof TIPOS_ORIGEM] || tipoOrigem}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel className={solucaoObrigatoria ? "text-destructive font-semibold" : ""}>
                      Solução <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOLUCOES_CILINDROS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
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
                    <FormLabel className={motivoObrigatorio ? "text-destructive font-semibold" : ""}>
                      Motivo {mostrarMotivosNumerados && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <FormControl>
                      {mostrarMotivosNumerados ? (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOTIVOS_REMOCAO_SUBSTITUICAO.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="-" {...field} />
                      )}
                    </FormControl>
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
                      <Input inputMode="decimal" placeholder="Ex: 12,345" {...field} />
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
                      <Input inputMode="decimal" placeholder="Ex: 12,900" {...field} />
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
                    <FormLabel>Local de Implantação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Acostamento direito" {...field} />
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
                      <Input inputMode="decimal" placeholder="Ex: 10" {...field} />
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
                    <FormLabel>Extensão (km)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="(auto se km inicial/final)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cor_corpo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor do corpo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Amarelo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cor_refletivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor do refletivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Branco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_refletivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo do refletivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Prismático" {...field} />
                    </FormControl>
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
                      <Input inputMode="numeric" placeholder="Ex: 25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="latitude_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude Inicial</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="Ex: -19,987654" {...field} />
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
                    <FormLabel>Longitude Inicial</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="Ex: -43,987654" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!hideSubmitButton && (
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                  </>
                ) : (
                  "Registrar Intervenção"
                )}
              </Button>
            )}

            {motivoObrigatorio && (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <Info className="h-4 w-4 mt-0.5" />
                <span>Motivo é obrigatório quando a solução for Remover ou Substituir.</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


}
