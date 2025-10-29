// ==============================
// IntervencoesCilindrosForm.tsx (routerless-safe)
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

// Fallbacks locais (remova se tiver estes constantes em outro arquivo)
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
  intervencaoSelecionada?: any; // vinda do "olhinho"
  modo?: "normal" | "controlado";
}
