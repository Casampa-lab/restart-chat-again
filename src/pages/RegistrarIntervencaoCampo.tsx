
// ======================================
// RegistrarIntervencaoCampo.tsx (página)
// ======================================
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSession } from "@/hooks/useWorkSession";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import { CameraCapture } from "@/components/CameraCapture";
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
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { ArrowLeft, MapPin, Camera, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
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
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const { position, getCurrentPosition, snvIdentificado } = useGPSTracking();

  const necessidadeProp = location.state?.necessidade as any | undefined;

  const [modoOperacao, setModoOperacao] = useState<"manutencao" | "execucao" | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("");
  const [modoVisualizacao, setModoVisualizacao] = useState<"viewer" | "formulario">("viewer");

  const [elementoSelecionado, setElementoSelecionado] = useState<any>(null); // item do inventário quando for manutenção
  const [intervencaoSelecionada, setIntervencaoSelecionada] = useState<any>(null); // item vindo do "olhinho"
  const [dadosIntervencao, setDadosIntervencao] = useState<any | null>(null); // estado controlado pelo form

  const [fotos, setFotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  const [isConforme, setIsConforme] = useState(true);
  const [justificativaNC, setJustificativaNC] = useState("");
  const [loading, setLoading] = useState(false);

  const [manualPosition, setManualPosition] = useState({
    latitude_inicial: "",
    longitude_inicial: "",
    latitude_final: "",
    longitude_final: "",
  });

  // ===== Navegação segura (voltar) =====
  const handleVoltar = () => {
    navigate("/modo-campo");
  };

  // Preencher tipo a partir da necessidade (quando veio da tela anterior)
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

  // Sincronizar GPS inicial automaticamente quando disponível
  useEffect(() => {
    if (position) {
      setManualPosition((prev) => ({
        ...prev,
        latitude_inicial: position.latitude?.toString?.() || "",
        longitude_inicial: position.longitude?.toString?.() || "",
      }));
    }
  }, [position]);

  // Tratamento do botão BACK físico durante captura de foto (evita sair para a tela anterior)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener("backButton", () => {
      if (showCamera) {
        setShowCamera(false);
      } else {
        // mantém o comportamento padrão (voltar para /modo-campo)
        handleVoltar();
      }
    });
    return () => {
      // @ts-ignore
      sub && sub.remove && sub.remove();
    };
  }, [showCamera]);

  // Helpers de normalização (ponto vs vírgula)
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

  // Recebe dados do formulário controlado
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
        setManualPosition((prev) => ({
          ...prev,
          latitude_inicial: pos.latitude.toString(),
          longitude_inicial: pos.longitude.toString(),
        }));
        toast.success("GPS Inicial capturado!");
      }
    } catch (e) {
      toast.error("Erro ao capturar GPS inicial");
    }
  };

  const capturarGPSFinal = async () => {
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        setManualPosition((prev) => ({
          ...prev,
          latitude_final: pos.latitude.toString(),
          longitude_final: pos.longitude.toString(),
        }));
        toast.success("GPS Final capturado!");
      }
    } catch (e) {
      toast.error("Erro ao capturar GPS final");
    }
  };

  // Quando o usuário clicar no "olhinho" em alguma lista, chame isto passando a intervenção
  const handleVisualizarIntervencao = (intervencao: any) => {
    setIntervencaoSelecionada(intervencao);
    setModoVisualizacao("formulario");
    // Inicia estado controlado com os dados recebidos para evitar form vazio
    setDadosIntervencao({ ...intervencao });
  };

  // Envio consolidado (salva na tabela correta)
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

      // Se não conforme, cria NC
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

      // Campos permitidos para cilindros — cobre km_final e GPS final
      const CAMPOS_PERMITIDOS = new Set([
        // chaves estruturais comuns
        "user_id", "tipo_origem", "lote_id", "rodovia_id",
        // FK do elemento
        campoFK,
        // localização
        "snv", "km_inicial", "km_final",
        "latitude_inicial", "longitude_inicial", "latitude_final", "longitude_final",
        // fotos
        "fotos_urls",
        // conteúdo específico
        "data_intervencao", "solucao", "motivo",
        "local_implantacao", "espacamento_m", "extensao_km",
        "cor_corpo", "cor_refletivo", "tipo_refletivo", "quantidade",
        // flags de fluxo
        "pendente_aprovacao_coordenador", "aplicado_ao_inventario", "observacao_coordenador",
      ]);

      // Mapeia dados do form controlado + normalizações
      const payloadBase: any = {};
      Object.keys(dadosIntervencao || {}).forEach((k) => {
        const v = (dadosIntervencao as any)[k];
        const key = k; // nomes já compatíveis no form que te enviei
        if (!CAMPOS_PERMITIDOS.has(key)) return;

        if (["km_inicial", "km_final", "espacamento_m", "extensao_km", "quantidade"].includes(key)) {
          payloadBase[key] = normalizeNumber(v);
        } else if (["latitude_inicial", "longitude_inicial", "latitude_final", "longitude_final"].includes(key)) {
          payloadBase[key] = normalizeNumber(v);
        } else if (key === "fotos_urls" && Array.isArray(v)) {
          payloadBase[key] = v;
        } else {
          payloadBase[key] = v === "" ? null : v;
        }
      });

      // Campos complementares que podem não vir do form controlado
      payloadBase.user_id = user!.id;
      payloadBase.fotos_urls = Array.isArray(payloadBase.fotos_urls) ? payloadBase.fotos_urls : fotos;
      payloadBase.tipo_origem = modoOperacao === "manutencao" ? "manutencao_pre_projeto" : "execucao";
      payloadBase.lote_id = activeSession.lote_id;
      payloadBase.rodovia_id = activeSession.rodovia_id;
      payloadBase.snv = payloadBase.snv || snvIdentificado || null;

      // Garantir GPS final para elementos lineares
      if ((ELEMENTOS_LINEARES as readonly string[]).includes(tipoSelecionado)) {
        payloadBase.latitude_final = normalizeNumber(payloadBase.latitude_final ?? manualPosition.latitude_final);
        payloadBase.longitude_final = normalizeNumber(payloadBase.longitude_final ?? manualPosition.longitude_final);
      }

      // ✅ Garantir km_final (corrige o problema visto no CSV)
      if (payloadBase.km_final === null || payloadBase.km_final === undefined) {
        payloadBase.km_final = normalizeNumber(dadosIntervencao?.km_final);
      }

      // FK do elemento (quando há item selecionado)
      if (elementoSelecionado && campoFK) {
        payloadBase[campoFK] = elementoSelecionado.id;
      }

      console.log("📦 Payload pronto para insert:", payloadBase);

      const { error } = await supabase.from(tabelaIntervencao).insert(payloadBase as any);
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

  // UI auxiliar
  const isLinear = useMemo(() => (ELEMENTOS_LINEARES as readonly string[]).includes(tipoSelecionado), [tipoSelecionado]);

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

      {/* Seletor rápido de tipo quando vindo de necessidade */}
      {necessidadeProp?.tipo_elemento && (
        <Alert>
          <AlertDescription>
            Tipo selecionado a partir da necessidade: <strong>{necessidadeProp.tipo_elemento}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Captura de fotos controlada: não muda a tela ao abrir/fechar */}
      {showCamera && (
        <CameraCapture
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCaptured={(urls) => {
            handlePhotosChange(urls);
            setShowCamera(false); // apenas fecha modal, não reseta a tela
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados de Localização</CardTitle>
          <CardDescription>Informe o trecho e capture GPS. Para elementos lineares, preencha também o ponto final.</CardDescription>
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
            <Button type="button" onClick={() => setShowCamera(true)}>
              <Camera className="mr-2 h-4 w-4" /> Tirar foto
            </Button>
            <div className="text-sm text-muted-foreground">{fotos.length} foto(s) anexada(s)</div>
          </div>
        </CardContent>
      </Card>

      {/* Form de conteúdo específico — aqui mostramos o de Cilindros, controlado pelo pai */}
      {tipoSelecionado === "cilindros" && (
        <IntervencoesCilindrosForm
          key={(intervencaoSelecionada?.id ?? "new") + "-" + (modoOperacao ?? "")}
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
        <Button type="button" variant="secondary" onClick={() => setModoVisualizacao("viewer")}>Cancelar</Button>
        <Button type="button" onClick={handleEnviar} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          <span className="ml-2">Enviar intervenção</span>
        </Button>
      </div>
    </div>
  );