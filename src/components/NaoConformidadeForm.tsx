import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Save, Bell, Camera, X } from "lucide-react";
import { TIPOS_NC, PROBLEMAS_POR_TIPO, SITUACOES_NC, type TipoNC } from "@/constants/naoConformidades";
import { generateNCPDF } from "@/lib/pdfGenerator";

interface FotoData {
  arquivo: File | null;
  url: string;
  latitude: number | null;
  longitude: number | null;
  sentido: string;
  descricao: string;
  uploading: boolean;
}
interface NaoConformidadeFormProps {
  loteId: string;
  rodoviaId: string;
}
interface LoteInfo {
  empresa: {
    nome: string;
  };
}
const NaoConformidadeForm = ({
  loteId,
  rodoviaId
}: NaoConformidadeFormProps) => {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLoadingInicio, setGpsLoadingInicio] = useState(false);
  const [gpsLoadingFim, setGpsLoadingFim] = useState(false);
  
  // Localização para NC pontual (Sinalização Vertical)
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  
  // Localizações para NC de extensão (Sinalização Horizontal e Dispositivos de Segurança)
  const [locationInicio, setLocationInicio] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationFim, setLocationFim] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  
  const [empresaNome, setEmpresaNome] = useState<string>("");
  const [formData, setFormData] = useState({
    data_ocorrencia: new Date().toISOString().split("T")[0],
    numero_nc: "",
    tipo_nc: "",
    problema_identificado: "",
    descricao_problema: "",
    prazo_atendimento: "",
    situacao: "Não Atendida",
    data_atendimento: "",
    data_notificacao: "",
    observacao: "Verificar prazo de atendimento e informar à supervisora para agendamento de nova vistoria após a execução do serviço.",
    km_referencia: "",
    km_inicial: "",
    km_final: ""
  });

  // Estado para as 4 fotos
  const [fotos, setFotos] = useState<FotoData[]>([
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
  ]);

  // Buscar empresa do lote automaticamente
  useEffect(() => {
    const loadEmpresaDoLote = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from("lotes").select("empresas(nome)").eq("id", loteId).single();
        if (error) throw error;
        if (data && (data as any).empresas) {
          setEmpresaNome((data as any).empresas.nome);
        }
      } catch (error: any) {
        console.error("Erro ao buscar empresa do lote:", error);
        toast.error("Erro ao carregar informações do lote");
      }
    };
    loadEmpresaDoLote();
  }, [loteId]);
  const getCurrentLocation = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocation({
        lat,
        lng
      });
      toast.success("Localização GPS capturada!");
      setGpsLoading(false);
    }, error => {
      toast.error("Erro ao obter GPS: " + error.message);
      setGpsLoading(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  };

  const getCurrentLocationInicio = () => {
    setGpsLoadingInicio(true);
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      setGpsLoadingInicio(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocationInicio({
        lat,
        lng
      });
      toast.success("Localização inicial capturada!");
      setGpsLoadingInicio(false);
    }, error => {
      toast.error("Erro ao obter GPS inicial: " + error.message);
      setGpsLoadingInicio(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  };

  const getCurrentLocationFim = () => {
    setGpsLoadingFim(true);
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      setGpsLoadingFim(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocationFim({
        lat,
        lng
      });
      toast.success("Localização final capturada!");
      setGpsLoadingFim(false);
    }, error => {
      toast.error("Erro ao obter GPS final: " + error.message);
      setGpsLoadingFim(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  };

  // Resetar problema quando tipo_nc mudar
  useEffect(() => {
    if (formData.tipo_nc) {
      setFormData(prev => ({
        ...prev,
        problema_identificado: ""
      }));
    }
  }, [formData.tipo_nc]);

  // Função para capturar foto com GPS
  const handleFotoChange = async (index: number, file: File) => {
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      return;
    }

    // Capturar GPS
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index] = { ...newFotos[index], uploading: true };
      return newFotos;
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const url = URL.createObjectURL(file);

        setFotos(prev => {
          const newFotos = [...prev];
          newFotos[index] = {
            ...newFotos[index],
            arquivo: file,
            url,
            latitude: lat,
            longitude: lng,
            uploading: false,
          };
          return newFotos;
        });

        toast.success(`Foto ${index + 1} anexada com GPS capturado!`);
      },
      (error) => {
        toast.error("Erro ao capturar GPS: " + error.message);
        setFotos(prev => {
          const newFotos = [...prev];
          newFotos[index] = { ...newFotos[index], uploading: false };
          return newFotos;
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Atualizar sentido da foto
  const handleSentidoChange = (index: number, sentido: string) => {
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index] = { ...newFotos[index], sentido };
      return newFotos;
    });
  };

  // Atualizar descrição da foto
  const handleDescricaoChange = (index: number, descricao: string) => {
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index] = { ...newFotos[index], descricao };
      return newFotos;
    });
  };

  // Remover foto
  const handleRemoverFoto = (index: number) => {
    setFotos(prev => {
      const newFotos = [...prev];
      if (newFotos[index].url) {
        URL.revokeObjectURL(newFotos[index].url);
      }
      newFotos[index] = {
        arquivo: null,
        url: "",
        latitude: null,
        longitude: null,
        sentido: "",
        descricao: "",
        uploading: false,
      };
      return newFotos;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Este botão agora é usado para ATUALIZAR a NC quando ela for atendida
    if (!formData.numero_nc) {
      toast.error("Use o botão NOTIFICAR primeiro para criar a NC");
      return;
    }

    if (formData.situacao !== "Atendida") {
      toast.error("Altere a Situação para 'Atendida' antes de salvar");
      return;
    }

    if (!formData.data_atendimento) {
      toast.error("Preencha a Data de Atendimento");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      // Buscar a NC existente
      const { data: ncExistente, error: buscaError } = await supabase
        .from("nao_conformidades")
        .select("id")
        .eq("numero_nc", formData.numero_nc)
        .eq("user_id", user.id)
        .maybeSingle();

      if (buscaError) throw buscaError;
      
      if (!ncExistente) {
        toast.error("NC não encontrada. Use o botão NOTIFICAR primeiro para criar a NC");
        setLoading(false);
        return;
      }

      // Atualizar a NC com os dados de atendimento
      const { error: updateError } = await supabase
        .from("nao_conformidades")
        .update({
          situacao: "Atendida",
          data_atendimento: formData.data_atendimento,
          observacao: formData.observacao || null,
        })
        .eq("id", ncExistente.id);

      if (updateError) throw updateError;

      toast.success("Atendimento registrado com sucesso!");

      // Reset form
      setFormData({
        data_ocorrencia: new Date().toISOString().split("T")[0],
        numero_nc: "",
        tipo_nc: "",
        problema_identificado: "",
        descricao_problema: "",
        prazo_atendimento: "",
        situacao: "Não Atendida",
        data_atendimento: "",
        data_notificacao: "",
        observacao: "",
        km_referencia: "",
        km_inicial: "",
        km_final: ""
      });

      // Limpar localizações e fotos
      setLocation(null);
      setLocationInicio(null);
      setLocationFim(null);
      setFotos([
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
      ]);
    } catch (error: any) {
      toast.error("Erro ao registrar atendimento: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const problemasDisponiveis = formData.tipo_nc ? PROBLEMAS_POR_TIPO[formData.tipo_nc as TipoNC] || [] : [];
  
  // Determinar se é NC de extensão ou pontual
  const isExtensao = formData.tipo_nc === TIPOS_NC.SINALIZACAO_HORIZONTAL || 
                     formData.tipo_nc === TIPOS_NC.DISPOSITIVOS_SEGURANCA;
  
  const handleNotificar = async () => {
    // Validações básicas
    if (!formData.tipo_nc || !formData.problema_identificado) {
      toast.error("Selecione o Tipo de NC e o Problema");
      return;
    }

    if (!formData.data_notificacao) {
      toast.error("Preencha a Data da Notificação primeiro");
      return;
    }

    const isExtensaoNotif = formData.tipo_nc === TIPOS_NC.SINALIZACAO_HORIZONTAL || 
                            formData.tipo_nc === TIPOS_NC.DISPOSITIVOS_SEGURANCA;
    
    // Validar GPS conforme o tipo
    if (isExtensaoNotif) {
      if (!locationInicio || !locationFim) {
        toast.error("Capture as localizações GPS de início e fim antes de notificar");
        return;
      }
    } else {
      if (!location) {
        toast.error("Capture a localização GPS antes de notificar");
        return;
      }
    }

    const loadingToast = toast.loading("Salvando e gerando relatório...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // SALVAR A NC com Situação "Não Atendida" e sem Data de Atendimento
      const baseData = {
        user_id: user.id,
        lote_id: loteId,
        rodovia_id: rodoviaId,
        data_ocorrencia: formData.data_ocorrencia,
        numero_nc: formData.numero_nc,
        tipo_nc: formData.tipo_nc,
        problema_identificado: formData.problema_identificado,
        descricao_problema: formData.descricao_problema || null,
        empresa: empresaNome,
        prazo_atendimento: formData.prazo_atendimento ? parseInt(formData.prazo_atendimento) : null,
        situacao: "Não Atendida", // Forçar como Não Atendida
        data_atendimento: null, // Deixar vazio
        data_notificacao: formData.data_notificacao,
        observacao: formData.observacao || null,
      };

      // Adicionar campos conforme o tipo de NC
      const insertData = isExtensaoNotif 
        ? {
            ...baseData,
            km_inicial: formData.km_inicial ? parseFloat(formData.km_inicial) : null,
            km_final: formData.km_final ? parseFloat(formData.km_final) : null,
            latitude_inicial: locationInicio!.lat,
            longitude_inicial: locationInicio!.lng,
            latitude_final: locationFim!.lat,
            longitude_final: locationFim!.lng,
            latitude: null,
            longitude: null,
            km_referencia: null
          }
        : {
            ...baseData,
            latitude: location!.lat,
            longitude: location!.lng,
            km_referencia: formData.km_referencia ? parseFloat(formData.km_referencia) : null,
            km_inicial: null,
            km_final: null,
            latitude_inicial: null,
            longitude_inicial: null,
            latitude_final: null,
            longitude_final: null
          };

      const { data: ncData, error: insertError } = await supabase
        .from("nao_conformidades")
        .insert(insertData)
        .select()
        .single();
      
      if (insertError) throw insertError;

      // Upload das fotos
      const fotosParaSalvar = fotos.filter(f => f.arquivo !== null);
      if (fotosParaSalvar.length > 0) {
        for (let i = 0; i < fotosParaSalvar.length; i++) {
          const foto = fotosParaSalvar[i];
          const fotoIndex = fotos.indexOf(foto);
          
          try {
            const fileExt = foto.arquivo!.name.split('.').pop();
            const fileName = `${ncData.id}_foto${fotoIndex + 1}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('nc-photos')
              .upload(filePath, foto.arquivo!);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('nc-photos')
              .getPublicUrl(filePath);

            const { error: fotoError } = await supabase
              .from('nao_conformidades_fotos')
              .insert({
                nc_id: ncData.id,
                foto_url: publicUrl,
                latitude: foto.latitude,
                longitude: foto.longitude,
                sentido: foto.sentido || null,
                descricao: foto.descricao || null,
                ordem: fotoIndex + 1,
              });

            if (fotoError) throw fotoError;
          } catch (fotoErr: any) {
            console.error(`Erro ao salvar foto ${fotoIndex + 1}:`, fotoErr);
          }
        }
      }

      // Buscar NC salva com dados completos
      const { data: ncSalva, error: ncError } = await supabase
        .from("nao_conformidades")
        .select("id")
        .eq("id", ncData.id)
        .single();

      if (ncError || !ncSalva) {
        throw new Error("NC não encontrada. Salve a NC primeiro.");
      }

      // Buscar todos os dados necessários para o PDF
      const { data: ncCompleta, error: ncCompletaError } = await supabase
        .from("nao_conformidades")
        .select(`
          *,
          rodovias(codigo, uf),
          lotes(
            numero,
            contrato,
            responsavel_executora,
            email_executora,
            nome_fiscal_execucao,
            email_fiscal_execucao
          )
        `)
        .eq("id", ncSalva.id)
        .single();

      if (ncCompletaError || !ncCompleta) {
        throw new Error("Erro ao buscar dados da NC");
      }

      // Buscar fotos
      const { data: fotosBanco, error: fotosError } = await supabase
        .from("nao_conformidades_fotos")
        .select("*")
        .eq("nc_id", ncSalva.id)
        .order("ordem");

      if (fotosError) {
        console.error("Erro ao buscar fotos:", fotosError);
      }

      // Buscar dados da supervisora
      const { data: profile } = await supabase
        .from("profiles")
        .select("supervisora_id")
        .eq("id", user.id)
        .single();

      let supervisoraData = { nome_empresa: "Supervisora", contrato: "N/A" };
      if (profile?.supervisora_id) {
        const { data: supervisora } = await supabase
          .from("supervisoras")
          .select("nome_empresa")
          .eq("id", profile.supervisora_id)
          .single();
        
        if (supervisora) {
          supervisoraData.nome_empresa = supervisora.nome_empresa;
        }
      }

      // Preparar dados para o PDF
      const pdfData = {
        numero_nc: ncCompleta.numero_nc,
        data_ocorrencia: ncCompleta.data_ocorrencia,
        tipo_nc: ncCompleta.tipo_nc,
        problema_identificado: ncCompleta.problema_identificado,
        descricao_problema: ncCompleta.descricao_problema || "",
        observacao: ncCompleta.observacao || "",
        km_inicial: ncCompleta.km_inicial,
        km_final: ncCompleta.km_final,
        km_referencia: ncCompleta.km_referencia,
        rodovia: {
          codigo: (ncCompleta as any).rodovias?.codigo || "N/A",
          uf: (ncCompleta as any).rodovias?.uf || "N/A",
        },
        lote: {
          numero: (ncCompleta as any).lotes?.numero || "N/A",
          contrato: (ncCompleta as any).lotes?.contrato || "N/A",
          responsavel_executora: (ncCompleta as any).lotes?.responsavel_executora || "N/A",
          email_executora: (ncCompleta as any).lotes?.email_executora || "",
          nome_fiscal_execucao: (ncCompleta as any).lotes?.nome_fiscal_execucao || "N/A",
          email_fiscal_execucao: (ncCompleta as any).lotes?.email_fiscal_execucao || "",
        },
        empresa: {
          nome: ncCompleta.empresa,
        },
        supervisora: supervisoraData,
        fotos: fotosBanco || [],
        natureza: ncCompleta.tipo_nc, // Usando tipo_nc como natureza
        grau: "Média", // Pode ser adicionado ao formulário posteriormente
        tipo_obra: "Manutenção", // Pode ser adicionado ao formulário posteriormente
        comentarios_supervisora: "",
        comentarios_executora: "",
      };

      // Gerar PDF
      const pdfBlob = await generateNCPDF(pdfData);
      
      // Converter blob para base64
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Enviar email com PDF via edge function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        "send-nc-notification",
        {
          body: {
            nc_id: ncSalva.id,
            pdf_base64: pdfBase64,
          },
        }
      );

      if (emailError) throw emailError;

      toast.dismiss(loadingToast);
      toast.success("NC registrada e notificação enviada com sucesso!");
      
      // Reset completo do formulário após notificar
      setFormData({
        data_ocorrencia: new Date().toISOString().split("T")[0],
        numero_nc: "",
        tipo_nc: "",
        problema_identificado: "",
        descricao_problema: "",
        prazo_atendimento: "",
        situacao: "Não Atendida",
        data_atendimento: "",
        data_notificacao: "",
        observacao: "",
        km_referencia: "",
        km_inicial: "",
        km_final: ""
      });

      // Limpar localizações e fotos para o próximo registro
      setLocation(null);
      setLocationInicio(null);
      setLocationFim(null);
      setFotos([
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
      ]);

    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error("Erro ao notificar:", error);
      toast.error("Erro ao salvar e notificar: " + error.message);
    }
  };

  // Calcular diferença de dias entre Data de Atendimento e Data da Notificação
  const calcularDiferencaDias = () => {
    if (!formData.data_atendimento || !formData.data_notificacao) return null;
    
    // Parse das datas no formato YYYY-MM-DD evitando problemas de timezone
    const [anoAtend, mesAtend, diaAtend] = formData.data_atendimento.split('-').map(Number);
    const [anoNotif, mesNotif, diaNotif] = formData.data_notificacao.split('-').map(Number);
    
    const dataAtendimento = new Date(anoAtend, mesAtend - 1, diaAtend);
    const dataNotificacao = new Date(anoNotif, mesNotif - 1, diaNotif);
    
    const diferencaMs = dataAtendimento.getTime() - dataNotificacao.getTime();
    const diferencaDias = Math.round(diferencaMs / (1000 * 60 * 60 * 24));
    
    return diferencaDias;
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Registro de Não-Conformidade
        </CardTitle>
        <CardDescription>
          Planilha 2.3 - Empresa: {empresaNome || "Carregando..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Linha 1: Data e Número NC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_ocorrencia">Data da Ocorrência *</Label>
              <Input id="data_ocorrencia" type="date" value={formData.data_ocorrencia} onChange={e => setFormData({
              ...formData,
              data_ocorrencia: e.target.value
            })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_nc">Número da Não Conformidade *</Label>
              <Input id="numero_nc" type="text" placeholder="Ex: NC-001" value={formData.numero_nc} onChange={e => setFormData({
              ...formData,
              numero_nc: e.target.value
            })} required />
            </div>
          </div>

          {/* Linha 2: Tipo de NC e Problema (Cascateado) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_nc">Tipo de NC *</Label>
              <Select value={formData.tipo_nc} onValueChange={value => setFormData({
              ...formData,
              tipo_nc: value
            })} required>
                <SelectTrigger id="tipo_nc">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TIPOS_NC).map(tipo => <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="problema_identificado">Problema Identificado *</Label>
              <Select value={formData.problema_identificado} onValueChange={value => setFormData({
              ...formData,
              problema_identificado: value
            })} disabled={!formData.tipo_nc} required>
                <SelectTrigger id="problema_identificado">
                  <SelectValue placeholder={formData.tipo_nc ? "Selecione o problema" : "Primeiro selecione o tipo"} />
                </SelectTrigger>
                <SelectContent>
                  {problemasDisponiveis.map(problema => <SelectItem key={problema} value={problema}>
                      {problema}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* km - Condicional baseado no tipo */}
          {formData.tipo_nc && !isExtensao && (
            <div className="space-y-2">
              <Label htmlFor="km_referencia">km Referência (opcional)</Label>
              <Input id="km_referencia" type="number" step="0.001" value={formData.km_referencia} onChange={e => setFormData({
              ...formData,
              km_referencia: e.target.value
            })} placeholder="Ex: 123.456" />
              <p className="text-xs text-muted-foreground">
                GPS é obrigatório. km é opcional e apenas para referência.
              </p>
            </div>
          )}

          {formData.tipo_nc && isExtensao && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="km_inicial">km Inicial (opcional)</Label>
                <Input id="km_inicial" type="number" step="0.001" value={formData.km_inicial} onChange={e => setFormData({
                ...formData,
                km_inicial: e.target.value
              })} placeholder="Ex: 123.000" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="km_final">km Final (opcional)</Label>
                <Input id="km_final" type="number" step="0.001" value={formData.km_final} onChange={e => setFormData({
                ...formData,
                km_final: e.target.value
              })} placeholder="Ex: 125.500" />
              </div>
            </div>
          )}

          {/* GPS Status - Condicional baseado no tipo */}
          {!formData.tipo_nc && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Selecione o Tipo de NC primeiro para capturar as coordenadas GPS
              </p>
            </div>
          )}
          
          {formData.tipo_nc && !isExtensao && (
            <div className="space-y-2">
              <Label>Coordenadas GPS *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button type="button" variant="outline" onClick={getCurrentLocation} disabled={gpsLoading} className="w-full">
                  {gpsLoading ? <>
                      <MapPin className="mr-2 h-4 w-4 animate-pulse" />
                      Capturando...
                    </> : <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Capturar Localização
                    </>}
                </Button>
                <Input 
                  type="text" 
                  placeholder="Latitude" 
                  value={location ? location.lat.toFixed(6) : ""} 
                  disabled 
                  className="bg-muted"
                />
                <Input 
                  type="text" 
                  placeholder="Longitude" 
                  value={location ? location.lng.toFixed(6) : ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
            </div>
          )}

          {formData.tipo_nc && isExtensao && (
            <div className="space-y-4">
              {/* GPS Início */}
              <div className="space-y-2">
                <Label>Coordenadas GPS Início *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button type="button" variant="outline" onClick={getCurrentLocationInicio} disabled={gpsLoadingInicio} className="w-full">
                    {gpsLoadingInicio ? <>
                        <MapPin className="mr-2 h-4 w-4 animate-pulse" />
                        Capturando...
                      </> : <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Capturar Início
                      </>}
                  </Button>
                  <Input 
                    type="text" 
                    placeholder="Latitude Inicial" 
                    value={locationInicio ? locationInicio.lat.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                  <Input 
                    type="text" 
                    placeholder="Longitude Inicial" 
                    value={locationInicio ? locationInicio.lng.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* GPS Fim */}
              <div className="space-y-2">
                <Label>Coordenadas GPS Fim *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button type="button" variant="outline" onClick={getCurrentLocationFim} disabled={gpsLoadingFim} className="w-full">
                    {gpsLoadingFim ? <>
                        <MapPin className="mr-2 h-4 w-4 animate-pulse" />
                        Capturando...
                      </> : <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Capturar Fim
                      </>}
                  </Button>
                  <Input 
                    type="text" 
                    placeholder="Latitude Final" 
                    value={locationFim ? locationFim.lat.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                  <Input 
                    type="text" 
                    placeholder="Longitude Final" 
                    value={locationFim ? locationFim.lng.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Descrição do Problema */}
          <div className="space-y-2">
            <Label htmlFor="descricao_problema">Descrição Detalhada (opcional)</Label>
            <Textarea id="descricao_problema" placeholder="Descreva detalhes adicionais do problema..." value={formData.descricao_problema} onChange={e => setFormData({
            ...formData,
            descricao_problema: e.target.value
          })} rows={3} />
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea id="observacao" placeholder="Observações adicionais..." value={formData.observacao} onChange={e => setFormData({
            ...formData,
            observacao: e.target.value
          })} rows={3} />
          </div>

          {/* Seção de Fotos */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <Label className="text-base font-semibold">Anexar Fotos (até 4 fotos)</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Cada foto captura automaticamente as coordenadas GPS. Você pode adicionar o sentido da via e uma descrição.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fotos.map((foto, index) => (
                <Card key={index} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Foto {index + 1}</Label>
                    {foto.arquivo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverFoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {!foto.arquivo ? (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFotoChange(index, file);
                        }}
                        disabled={foto.uploading}
                        className="cursor-pointer"
                      />
                      {foto.uploading && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4 animate-pulse" />
                          Capturando GPS...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <img
                        src={foto.url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-semibold">Lat:</span>{" "}
                          {foto.latitude?.toFixed(6)}
                        </div>
                        <div>
                          <span className="font-semibold">Lng:</span>{" "}
                          {foto.longitude?.toFixed(6)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sentido-${index}`} className="text-sm">
                          Sentido
                        </Label>
                        <Select
                          value={foto.sentido}
                          onValueChange={(value) => handleSentidoChange(index, value)}
                        >
                          <SelectTrigger id={`sentido-${index}`}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Norte">Norte</SelectItem>
                            <SelectItem value="Sul">Sul</SelectItem>
                            <SelectItem value="Leste">Leste</SelectItem>
                            <SelectItem value="Oeste">Oeste</SelectItem>
                            <SelectItem value="Crescente">Crescente</SelectItem>
                            <SelectItem value="Decrescente">Decrescente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`descricao-${index}`} className="text-sm">
                          Descrição
                        </Label>
                        <Textarea
                          id={`descricao-${index}`}
                          placeholder="Descrição da foto..."
                          value={foto.descricao}
                          onChange={(e) => handleDescricaoChange(index, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Prazo de Atendimento e Data da Notificação - APÓS AS FOTOS */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-base font-semibold">Primeira Etapa - Notificação</h3>
            
            <div className="space-y-2">
              <Label htmlFor="prazo_atendimento">Prazo de Atendimento (dias)</Label>
              <Input id="prazo_atendimento" type="number" min="1" placeholder="Ex: 15" value={formData.prazo_atendimento} onChange={e => setFormData({
              ...formData,
              prazo_atendimento: e.target.value
            })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_notificacao">Data da Notificação</Label>
              <div className="flex gap-2">
                <Input id="data_notificacao" type="date" value={formData.data_notificacao} onChange={e => setFormData({
                ...formData,
                data_notificacao: e.target.value
              })} />
                <Button 
                  type="button" 
                  variant="default" 
                  onClick={handleNotificar}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md"
                >
                  <Bell className="h-4 w-4 mr-1" />
                  NOTIFICAR
                </Button>
              </div>
            </div>
          </div>

          {/* Segunda Etapa - Verificação de Atendimento */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-base font-semibold">Segunda Etapa - Verificação de Atendimento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Coluna 1 - Situação */}
              <div className="space-y-2">
                <Label htmlFor="situacao">Situação *</Label>
                <Select value={formData.situacao} onValueChange={value => setFormData({
                ...formData,
                situacao: value
              })} required>
                  <SelectTrigger id="situacao" className={formData.situacao !== "Atendida" ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : "border-green-500 bg-green-50 dark:bg-green-950/20"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SITUACOES_NC.map(situacao => <SelectItem key={situacao} value={situacao}>
                        {situacao}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Coluna 2 - Data de Atendimento (só aparece se Atendida) */}
              {formData.situacao === "Atendida" ? (
                <div className="space-y-2">
                  <Label htmlFor="data_atendimento">Data de Atendimento *</Label>
                  <Input 
                    id="data_atendimento" 
                    type="date" 
                    value={formData.data_atendimento} 
                    onChange={e => setFormData({
                      ...formData,
                      data_atendimento: e.target.value
                    })} 
                    required 
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data de Atendimento</Label>
                  <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                    Disponível após marcar como "Atendida"
                  </div>
                </div>
              )}

              {/* Coluna 3 - Prazo de Execução (só aparece se Atendida) */}
              {formData.situacao === "Atendida" ? (
                <div className="space-y-2">
                  <Label className="font-semibold">Prazo de Execução</Label>
                  {formData.data_notificacao && formData.data_atendimento ? (
                    <div className="h-10 flex items-center justify-center border-2 rounded-md bg-primary/5 border-primary">
                      <span className="text-2xl font-bold text-primary">
                        {calcularDiferencaDias()} dias
                      </span>
                    </div>
                  ) : (
                    <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                      Aguardando datas
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Prazo de Execução</Label>
                  <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                    Disponível após marcar como "Atendida"
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit" 
            className="w-full" 
            size="lg" 
            disabled={loading || formData.situacao !== "Atendida" || !formData.data_atendimento}
          >
            <Save className="mr-2 h-5 w-5" />
            {loading ? "Salvando..." : "Registrar Atendimento"}
          </Button>
        </form>
      </CardContent>
    </Card>;
};
export default NaoConformidadeForm;