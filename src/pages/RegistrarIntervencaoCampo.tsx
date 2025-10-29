// ======================================
// RegistrarIntervencaoCampo.tsx (routerless-safe, CameraCapture v2)
// ======================================
import { useState, useEffect, useMemo } from "react";
// Routerless: sem react-router-dom; navegação simples
const navigate = (path: string) => {
  if (typeof window !== "undefined") window.location.assign(path);
};
const locationState: any = (typeof window !== "undefined" && (window.history?.state as any)?.usr) || undefined;

import { useAuth } from "@/hooks/useAuth";
import { useWorkSession } from "@/hooks/useWorkSession";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import { CameraCapture } from "@/components/CameraCapture"; // v2: photos/onPhotosChange
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
// Capacitor opcional (não quebra no web)
let Capacitor: any = { isNativePlatform: () => false };
let CapApp: any = { addListener: () => ({ remove: () => {} }) };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Capacitor = require("@capacitor/core").Capacitor;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CapApp = require("@capacitor/app").App;
} catch {}
import { ArrowLeft, MapPin, CheckCircle2, RefreshCw } from "lucide-react";
import { IntervencoesCilindrosForm } from "@/components/IntervencoesCilindrosForm";

const ELEMENTOS_LINEARES = ["marcas_longitudinais", "defensas", "cilindros", "tachas"] as const;

const TABELAS_INTERVENCAO: Record<string, string> = {
  marcas_longitudinais: "ficha_marcas_longitudinais_intervencoes",
  inscricoes: "ficha_inscricoes_intervencoes",
  tachas: "ficha_tachas_intervencoes",
  cilindros: "ficha_cilindros_intervencoes",
  porticos: "ficha_porticos_intervencoes",
  defensas: "defensas_intervencoes",
  placas: "ficha_placa_intervencoes",
};

const CAMPOS_FK: Record<string, string> = {
  marcas_longitudinais: "ficha_marcas_longitudinais_id",
  inscricoes: "ficha_inscricoes_id",
  tachas: "ficha_tachas_id",
  cilindros: "ficha_cilindros_id",
  porticos: "ficha_porticos_id",
  defensas: "defensa_id",
  placas: "ficha_placa_id",
};

export default function RegistrarIntervencaoCampo() {
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const { position, getCurrentPosition, snvIdentificado } = useGPSTracking();

  const necessidadeProp = locationState?.necessidade as any | undefined;

  const [modoOperacao, setModoOperacao] = useState<"manutencao" | "execucao" | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("");
  const [modoVisualizacao, setModoVisualizacao] = useState<"viewer" | "formulario">("viewer");

  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null);
  const [intervencaoSelecionada, setIntervencaoSelecionada] = useState<any>(null);
  const [dadosIntervencao, setDadosIntervencao] = useState<any | null>(null);

  const [fotos, setFotos] = useState<string[]>([]); // v2: gerenciado via CameraCapture

  const [isConforme, setIsConforme] = useState(true);
  const [justificativaNC, setJustificativaNC] = useState("");
  const [loading, setLoading] = useState(false);

  const [manualPosition, setManualPosition] = useState({
    latitude_inicial: "",
    longitude_inicial: "",
    latitude_final: "",
    longitude_final: "",
  });

  const handleVoltar = () => {
    navigate("/modo-campo");
  };

  // Preencher tipo a partir da necessidade
  useEffect(() => {
    if (necessidadeProp?.tipo_elemento) {
      setTipoSelecionado(necessidadeProp.tipo_elemento);
    }
  }, [necessidadeProp]);

  // Reset de visualização ao trocar tipo/modo
  useEffect(() => {
    setModoVisualizacao("viewer");
    setElementoSelecionado(null);
    setIntervencaoSelecionada(null);
    setDadosIntervencao(null);
  }, [tipoSelecionado, modoOperacao]);

  // Sincronizar GPS inicial quando o hook achar posição
  useEffect(() => {
    if (position) {
      setManualPosition((prev) => ({
        ...prev,
        latitude_inicial: position.latitude?.toString?.() || "",
        longitude_inicial: position.longitude?.toString?.() || "",
      }));
    }
  }, [position]);

  const normalizeNumber = (v: any) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const t = v.replace(".", "").replace(",", ".");
      const n = Number(t);
      return isNaN(n) ? null : n;
    }
    return null;
  };

  const onFormDataChange = (value: any) => {
    setDadosIntervencao(value);
  };
  const handlePhotosChange = (urls: string[]) => {
    setFotos(urls);
  };

  const capturarGPSInicial = async () => {
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        setManualPosition((p) => ({
          ...p,
          latitude_inicial: pos.latitude.toString(),
          longitude_inicial: pos.longitude.toString(),
        }));
        toast.success("GPS Inicial capturado!");
      }
    } catch {
      toast.error("Erro ao capturar GPS inicial");
    }
  };
  const capturarGPSFinal = async () => {
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        setManualPosition((p) => ({
          ...p,
          latitude_final: pos.latitude.toString(),
          longitude_final: pos.longitude.toString(),
        }));
        toast.success("GPS Final capturado!");
      }
    } catch {
      toast.error("Erro ao capturar GPS final");
    }
  };

  const handleVisualizarIntervencao = (intervencao: any) => {
    setIntervencaoSelecionada(intervencao);
    setModoVisualizacao("formulario");
    setDadosIntervencao({ ...intervencao });
  };

  const handleEnviar = async () => {
    if (!activeSession || !dadosIntervencao || !tipoSelecionado || !modoOperacao) {
      toast.error("Dados incompletos");
      return;
    }
    if (!isConforme && !String(justificativaNC || "").trim()) {
      toast.error("Justificativa obrigatória para não conformidades");
      return;
    }

    try {
      setLoading(true);

      if (!isConforme) {
        const { error: ncError } = await supabase.from("nao_conformidades").insert({
          user_id: user!.id,
          lote_id: activeSession.lote_id,
          rodovia_id: activeSession.rodovia_id,
          data_ocorrencia: new Date().toISOString().split("T")[0],
          tipo_nc: "Não Conformidade de Intervenção",
          descricao_problema: justificativaNC,
          empresa: activeSession.lote?.empresa?.nome || "Não especificada",
          latitude: normalizeNumber(manualPosition.latitude_inicial),
          longitude: normalizeNumber(manualPosition.longitude_inicial),
          status_aprovacao: "pendente",
          deleted: false,
        } as any);
        if (ncError) throw ncError;
      }

      const tabelaIntervencao = TABELAS_INTERVENCAO[tipoSelecionado];
      const campoFK = CAMPOS_FK[tipoSelecionado];
      if (!tabelaIntervencao) throw new Error(`Tipo de elemento não mapeado: ${tipoSelecionado}`);

      const CAMPOS_PERMITIDOS = new Set([
        "user_id",
        "tipo_origem",
        "lote_id",
        "rodovia_id",
        campoFK,
        "snv",
        "km_inicial",
        "km_final",
        "latitude_inicial",
        "longitude_inicial",
        "latitude_final",
        "longitude_final",
        "fotos_urls",
        "data_intervencao",
        "solucao",
        "motivo",
        "local_implantacao",
        "espacamento_m",
        "extensao_km",
        "cor_corpo",
        "cor_refletivo",
        "tipo_refletivo",
        "quantidade",
        "pendente_aprovacao_coordenador",
        "aplicado_ao_inventario",
        "observacao_coordenador",
      ]);

      const payloadBase: any = {};
      Object.keys(dadosIntervencao || {}).forEach((k) => {
        const v = (dadosIntervencao as any)[k];
        if (!CAMPOS_PERMITIDOS.has(k)) return;
        if (["km_inicial", "km_final", "espacamento_m", "extensao_km", "quantidade"].includes(k))
          payloadBase[k] = normalizeNumber(v);
        else if (["latitude_inicial", "longitude_inicial", "latitude_final", "longitude_final"].includes(k))
          payloadBase[k] = normalizeNumber(v);
        else if (k === "fotos_urls" && Array.isArray(v)) payloadBase[k] = v;
        else payloadBase[k] = v === "" ? null : v;
      });

      payloadBase.user_id = user!.id;
      payloadBase.fotos_urls = Array.isArray(payloadBase.fotos_urls) ? payloadBase.fotos_urls : fotos;
      payloadBase.tipo_origem = modoOperacao === "manutencao" ? "manutencao_pre_projeto" : "execucao";
      payloadBase.lote_id = activeSession.lote_id;
      payloadBase.rodovia_id = activeSession.rodovia_id;
      payloadBase.snv = payloadBase.snv || snvIdentificado || null;

      if ((ELEMENTOS_LINEARES as readonly string[]).includes(tipoSelecionado)) {
        payloadBase.latitude_final = normalizeNumber(payloadBase.latitude_final ?? manualPosition.latitude_final);
        payloadBase.longitude_final = normalizeNumber(payloadBase.longitude_final ?? manualPosition.longitude_final);
      }

      if (payloadBase.km_final === null || payloadBase.km_final === undefined) {
        payloadBase.km_final = normalizeNumber(dadosIntervencao?.km_final);
      }

      if (elementoSelecionado && campoFK) payloadBase[campoFK] = elementoSelecionado.id;

      const { error } = await supabase.from(tabelaIntervencao as any).insert(payloadBase as any);
      if (error) throw error;

      toast.success("Intervenção registrada com sucesso!");
      setFotos([]);
      setDadosIntervencao(null);
      setIntervencaoSelecionada(null);
      setModoVisualizacao("viewer");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao salvar intervenção");
    } finally {
      setLoading(false);
    }
  };

  const isLinear = useMemo(
    () => (ELEMENTOS_LINEARES as readonly string[]).includes(tipoSelecionado),
    [tipoSelecionado],
  );

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleVoltar}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Registrar Intervenção em Campo</h1>
        {modoOperacao && (
          <Badge variant={modoOperacao === "execucao" ? "default" : "secondary"} className="ml-2">
            {modoOperacao.toUpperCase()}
          </Badge>
        )}
      </div>

      {necessidadeProp?.tipo_elemento && (
        <Alert>
          <AlertDescription>
            Tipo selecionado a partir da necessidade: <strong>{necessidadeProp.tipo_elemento}</strong>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados de Localização</CardTitle>
          <CardDescription>
            Informe o trecho e capture GPS. Para elementos lineares, preencha também o ponto final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>km inicial</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex: 12,345"
                value={dadosIntervencao?.km_inicial ?? ""}
                onChange={(e) => setDadosIntervencao((p: any) => ({ ...(p || {}), km_inicial: e.target.value }))}
              />
            </div>
            <div>
              <Label>km final</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex: 12,900"
                value={dadosIntervencao?.km_final ?? ""}
                onChange={(e) => setDadosIntervencao((p: any) => ({ ...(p || {}), km_final: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitude inicial</Label>
              <Input
                inputMode="decimal"
                placeholder="-19,987654"
                value={manualPosition.latitude_inicial}
                onChange={(e) => setManualPosition((pr) => ({ ...pr, latitude_inicial: e.target.value }))}
              />
            </div>
            <div>
              <Label>Longitude inicial</Label>
              <Input
                inputMode="decimal"
                placeholder="-43,987654"
                value={manualPosition.longitude_inicial}
                onChange={(e) => setManualPosition((pr) => ({ ...pr, longitude_inicial: e.target.value }))}
              />
            </div>
          </div>
          {isLinear && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude final</Label>
                <Input
                  inputMode="decimal"
                  placeholder="-19,999000"
                  value={manualPosition.latitude_final}
                  onChange={(e) => setManualPosition((pr) => ({ ...pr, latitude_final: e.target.value }))}
                />
              </div>
              <div>
                <Label>Longitude final</Label>
                <Input
                  inputMode="decimal"
                  placeholder="-43,999000"
                  value={manualPosition.longitude_final}
                  onChange={(e) => setManualPosition((pr) => ({ ...pr, longitude_final: e.target.value }))}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={capturarGPSInicial}>
              <MapPin className="mr-2 h-4 w-4" /> Capturar GPS inicial
            </Button>
            {isLinear && (
              <Button type="button" variant="secondary" onClick={capturarGPSFinal}>
                <MapPin className="mr-2 h-4 w-4" /> Capturar GPS final
              </Button>
            )}
            <div className="text-sm text-muted-foreground">{fotos.length} foto(s) anexada(s)</div>
          </div>

          {/* CameraCapture v2 — sempre montado */}
          <div className="mt-2">
            <CameraCapture
              photos={fotos}
              onPhotosChange={(urls) => handlePhotosChange(urls)}
              maxPhotos={10}
              bucketName="intervencoes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Registry para aplicar o padrão de limpeza/remount em todos os tipos */}
      {tipoSelecionado === "cilindros" && (
        <IntervencoesCilindrosForm
          key={`cil-${intervencaoSelecionada?.id ?? elementoSelecionado?.id ?? "new"}-${modoOperacao ?? ""}-${modoVisualizacao}`}
          tipoOrigem={modoOperacao === "manutencao" ? "manutencao_pre_projeto" : "execucao"}
          cilindroSelecionado={modoOperacao === "manutencao" ? elementoSelecionado || undefined : undefined}
          intervencaoSelecionada={intervencaoSelecionada || undefined}
          modo="controlado"
          onDataChange={onFormDataChange}
          hideSubmitButton
          loteId={activeSession?.lote_id}
          rodoviaId={activeSession?.rodovia_id}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Qualidade e aprovação</CardTitle>
          <CardDescription>Marque Não Conforme se a intervenção requer NC e preencha a justificativa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={isConforme} onCheckedChange={(v) => setIsConforme(Boolean(v))} id="conforme" />
            <Label htmlFor="conforme">Conforme</Label>
          </div>
          {!isConforme && (
            <div>
              <Label>Justificativa da Não Conformidade</Label>
              <Textarea value={justificativaNC} onChange={(e) => setJustificativaNC(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => setModoVisualizacao("viewer")}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleEnviar} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          <span className="ml-2">Enviar intervenção</span>
        </Button>
      </div>
    </div>
  );
}
