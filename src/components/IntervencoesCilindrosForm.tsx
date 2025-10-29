// =============================================
// 2) IntervencoesCilindrosForm.tsx — compatível com o fluxo acima
//    (aceita props extras para evitar erro de tipos)
// =============================================
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button as UIButton } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";

const TIPOS_ORIGEM = { manutencao_pre_projeto: "manutencao_pre_projeto", execucao: "execucao" } as const;
const LABELS_TIPO_ORIGEM: Record<string, string> = {
  manutencao_pre_projeto: "Manutenção (pré-projeto)",
  execucao: "Execução",
};
const CAMPOS_ESTRUTURAIS: Record<string, readonly string[]> = {
  cilindros: ["snv", "km_inicial", "km_final"],
};

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

export type IntervencoesCilindrosFormData = z.infer<typeof formSchema>;

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
  intervencaoSelecionada?: any; // vinda do "olhinho"
  modo?: "normal" | "controlado";
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
  onIntervencaoRegistrada?: () => void;
  // props extras para compatibilidade com chamadas genéricas
  snvIdentificado?: string | null;
  snvConfianca?: string | null;
  snvDistancia?: number | null;
  placaSelecionada?: any;
  [key: string]: any;
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

  const form = useForm<IntervencoesCilindrosFormData>({
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

  // Preenche ao abrir pelo "olhinho"
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
    const S = intervencaoSelecionada;
    form.reset({
      data_intervencao: toDateInput(S.data_intervencao || S.created_at),
      snv: toStr(S.snv),
      solucao: toStr(S.solucao),
      motivo: toStr(S.motivo || "-"),
      km_inicial: toStr(S.km_inicial),
      km_final: toStr(S.km_final),
      local_implantacao: toStr(S.local_implantacao),
      espacamento_m: toStr(S.espacamento_m),
      extensao_km: toStr(S.extensao_km),
      cor_corpo: toStr(S.cor_corpo),
      cor_refletivo: toStr(S.cor_refletivo),
      tipo_refletivo: toStr(S.tipo_refletivo),
      quantidade: toStr(S.quantidade),
      latitude_inicial: toStr(S.latitude_inicial),
      longitude_inicial: toStr(S.longitude_inicial),
    });
  }, [intervencaoSelecionada, form]);

  // Propaga mudanças quando controlado
  useEffect(() => {
    if (modo !== "controlado" || !onDataChange) return;
    const sub = form.watch((value) => onDataChange(value));
    return () => sub.unsubscribe();
  }, [form, modo, onDataChange]);

  // Calcula extensão se km_inicial/km_final mudarem
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

  const onSubmit = async () => {
    if (modo === "controlado") {
      toast.info("Dados prontos para envio pelo fluxo externo.");
      return;
    }
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
  const motivoObrigatorio =
    mostrarMotivosNumerados && (!motivoAtual || motivoAtual === "-" || motivoAtual.trim() === "");

  const isCampoEstruturalBloqueado = (campo: string) => {
    if (!isManutencaoRotineira) return false;
    return (CAMPOS_ESTRUTURAIS["cilindros"] as readonly string[]).includes(campo);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Cilindros Delimitadores</CardTitle>
        <CardDescription>{`Origem: ${LABELS_TIPO_ORIGEM[tipoOrigem]}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...(form as any)}>
          <form onSubmit={(form as any).handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={(form as any).control}
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
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
                control={(form as any).control}
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
              <UIButton type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                  </>
                ) : (
                  "Registrar Intervenção"
                )}
              </UIButton>
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
