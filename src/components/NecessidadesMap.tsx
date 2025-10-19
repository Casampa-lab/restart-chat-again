import { useState, useEffect } from "react";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertCircle, Upload, AlertTriangle, X, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { removeGeographicOutliers, calcularKmNoSegmento } from "@/lib/gpsUtils";

interface Necessidade {
  id: string;
  servico: "Implantar" | "Substituir" | "Remover" | "Manter";
  km_inicial?: number;
  km_final?: number;
  km?: number;
  latitude_inicial?: number;
  longitude_inicial?: number;
  latitude?: number;
  longitude?: number;
  rodovia?: { codigo: string };
  observacao?: string;
  distancia_match_metros?: number;
  codigo?: string;
  tipo?: string;
  descricao?: string;
  [key: string]: any;
}

interface NecessidadesMapProps {
  necessidades: Necessidade[];
  tipo: string;
  rodoviaId?: string;
  loteId?: string;
  rodovia?: { codigo: string };
  lote?: { numero: string };
}

function MapBoundsUpdater({ 
  necessidades, 
  setMaxMarkers, 
  setZoom 
}: { 
  necessidades: Necessidade[];
  setMaxMarkers: (n: number) => void;
  setZoom: (n: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    // Mostrar todos os pontos sempre
    setMaxMarkers(necessidades.length);

    // Debounce do zoom handler apenas para atualizar o estado do zoom
    let zoomTimeout: NodeJS.Timeout;
    const handleZoom = () => {
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        const zoom = map.getZoom();
        setZoom(zoom);
      }, 300);
    };
    
    map.on('zoomend', handleZoom);
    handleZoom();
    
    return () => { 
      map.off('zoomend', handleZoom);
      clearTimeout(zoomTimeout);
    };
  }, [necessidades, map, setMaxMarkers, setZoom]);

  return null;
}

const createCustomIcon = (servico: string, isSinalizado: boolean) => {
  const color = servico === "Implantar" ? "#22c55e" : servico === "Substituir" ? "#eab308" : servico === "Remover" ? "#ef4444" : "#3b82f6";
  const emoji = servico === "Implantar" ? "➕" : servico === "Substituir" ? "🔄" : servico === "Remover" ? "➖" : "✓";
  
  const borderStyle = isSinalizado ? `4px solid #dc2626` : `3px solid white`;
  const pulseAnimation = isSinalizado ? `animation: pulse 2s infinite;` : ``;
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <style>
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
        }
      </style>
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: ${borderStyle};
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        ${pulseAnimation}
      ">${emoji}${isSinalizado ? '⚠️' : ''}</div>
    `,
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 16] as [number, number],
    popupAnchor: [0, -16] as [number, number],
  });
};

export const NecessidadesMap = ({ necessidades, tipo, rodoviaId, loteId, rodovia, lote }: NecessidadesMapProps) => {
  const [geojsonSnvData, setGeojsonSnvData] = useState<any>(null);
  const [uploadingSnv, setUploadingSnv] = useState(false);
  const [sinalizacoes, setSinalizacoes] = useState<Map<string, any>>(new Map());
  const [loadingSinalizacoes, setLoadingSinalizacoes] = useState(false);
  const [maxMarkersToShow, setMaxMarkersToShow] = useState(500);
  const [currentZoom, setCurrentZoom] = useState(13);

  // Filtrar necessidades por rodovia e lote
  const necessidadesFiltradas = necessidades.filter(n => {
    if (rodoviaId && n.rodovia_id !== rodoviaId) return false;
    if (loteId && n.lote_id !== loteId) return false;
    return true;
  });

  const necessidadesComCoordenadas = necessidadesFiltradas.filter(n => {
    const lat = n.latitude_inicial || n.latitude;
    const lng = n.longitude_inicial || n.longitude;
    return lat && lng && lat !== 0 && lng !== 0;
  });

  const necessidadesSemCoordenadas = necessidadesFiltradas.filter(n => {
    const lat = n.latitude_inicial || n.latitude;
    const lng = n.longitude_inicial || n.longitude;
    return !lat || !lng || lat === 0 || lng === 0;
  });

  // Função para verificar se cache é recente (menos de 7 dias)
  const isRecentCache = (updatedAt: string) => {
    const cacheDate = new Date(updatedAt);
    const now = new Date();
    const diffDays = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 7;
  };


  // Função para carregar SNV completo do Brasil (fallback) e filtrar pela rodovia ativa
  const carregarSNVCompleto = async (codigoRodovia?: string) => {
    try {
      // Verificar cache primeiro
      const cacheKey = 'snv_brasil_completo';
      const { data: cached } = await supabase
        .from("configuracoes")
        .select("valor, updated_at")
        .eq("chave", cacheKey)
        .maybeSingle();

      let geojsonCompleto: any;

      // Se cache válido (< 7 dias), usar
      if (cached?.valor && cached.updated_at && isRecentCache(cached.updated_at)) {
        geojsonCompleto = JSON.parse(cached.valor);
        console.log(`✓ SNV Brasil completo (cache): ${geojsonCompleto.features?.length || 0} features`);
      } else {
        // Se não, buscar do arquivo público
        toast.loading("Carregando SNV Brasil completo...", { id: 'snv-completo' });
        const response = await fetch('/geojson/snv-brasil-completo.geojson');
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        geojsonCompleto = await response.json();
        
        // Salvar em cache
        await supabase
          .from("configuracoes")
          .upsert({
            chave: cacheKey,
            valor: JSON.stringify(geojsonCompleto),
            updated_at: new Date().toISOString()
          });

        console.log(`✓ SNV Brasil completo carregado: ${geojsonCompleto.features?.length || 0} features`);
      }

      // FILTRAR pela rodovia se código foi fornecido
      if (codigoRodovia && geojsonCompleto.features) {
        const codigoLimpo = codigoRodovia.replace(/^BR-?/i, ''); // Remove "BR-" ou "BR"
        
        console.log(`🔍 Filtrando SNV: brLimpo="${codigoLimpo}", codigoRodovia="${codigoRodovia}"`);
        console.log(`📦 Features antes filtro: ${geojsonCompleto.features?.length}`);
        
        const featuresRodovia = geojsonCompleto.features.filter((f: any) => {
          const props = f.properties || {};
          // Tentar diferentes campos de rodovia
          const brValue = props.vl_br || props.CD_RODOVIA || props.DS_RODOVIA || props.br || '';
          const brLimpo = String(brValue).replace(/^BR-?/i, '');
          
          return brLimpo === codigoLimpo;
        });

        console.log(`📦 Features após filtro: ${featuresRodovia.length}`);

        if (featuresRodovia.length > 0) {
          console.log(`✅ Rodovia ${codigoRodovia} encontrada no SNV completo`);
          const geojsonFiltrado = {
            type: "FeatureCollection",
            features: featuresRodovia
          };
          
          setGeojsonSnvData(geojsonFiltrado);
          toast.success(`SNV ${codigoRodovia} carregado (${featuresRodovia.length} trechos)`, { id: 'snv-completo' });
          console.log(`✓ SNV filtrado para ${codigoRodovia}: ${featuresRodovia.length} features`);
          return;
        } else {
          console.warn(`Nenhum trecho encontrado para ${codigoRodovia} no SNV completo`);
          toast.info(`SNV: não encontrado trecho específico da ${codigoRodovia}`, { id: 'snv-completo' });
        }
      }

      // Se não filtrou ou não encontrou, mostrar tudo
      setGeojsonSnvData(geojsonCompleto);
      const featureCount = geojsonCompleto.features?.length || 0;
      toast.success(`SNV Brasil completo carregado (${featureCount} trechos)`, { id: 'snv-completo' });
      
    } catch (error) {
      console.error("Erro ao carregar SNV completo:", error);
      toast.error("Falha ao carregar SNV completo", { id: 'snv-completo' });
    }
  };

  // Tutorial toast na primeira visita (tipo VGeo)
  useEffect(() => {
    if (geojsonSnvData?.features?.length > 0) {
      const tutorialVisto = localStorage.getItem('snv_tutorial_km_vgeo');
      
      if (!tutorialVisto) {
        setTimeout(() => {
          toast.info(
            '💡 Dica: Clique em qualquer ponto da rodovia (linha amarela) para ver o KM exato!',
            { 
              duration: 8000,
              position: 'bottom-center'
            }
          );
          localStorage.setItem('snv_tutorial_km_vgeo', 'true');
        }, 2000); // Aguarda 2s após carregar
      }
    }
  }, [geojsonSnvData]);

  // Função para baixar camada SNV automaticamente (com fallback para SNV completo)
  const downloadSNVAutomatico = async (codigoRodovia: string) => {
    if (!codigoRodovia) return;

    try {
      const cacheKey = `snv_${codigoRodovia}`;
      const { data: cached } = await supabase
        .from("configuracoes")
        .select("valor, updated_at")
        .eq("chave", cacheKey)
        .maybeSingle();

      // Se cache válido (< 7 dias) E não vazio, usar
      if (cached?.valor && cached.updated_at && isRecentCache(cached.updated_at)) {
        const parsedCache = JSON.parse(cached.valor);
        if (parsedCache.features && parsedCache.features.length > 0) {
          console.log(`✓ SNV cache: ${parsedCache.features.length} features`);
          setGeojsonSnvData(parsedCache);
          toast.success(`Camada SNV ${codigoRodovia} carregada (${parsedCache.features.length} trechos, cache)`);
          return;
        } else {
          console.warn("Cache SNV vazio, baixando novamente...");
        }
      }

      toast.loading(`Baixando camada SNV para ${codigoRodovia}...`, { id: 'snv-download' });
      
      const { data, error } = await supabase.functions.invoke('download-vgeo-layer', {
        body: { codigo_rodovia: codigoRodovia, layer_type: 'snv' }
      });

      if (error) throw error;

      if (!data?.success || !data?.geojson) {
        throw new Error('Resposta inválida do servidor');
      }

      // Validar que tem dados antes de salvar
      if (!data.geojson.features || data.geojson.features.length === 0) {
        console.warn("Nenhum dado SNV encontrado para", codigoRodovia);
        toast.dismiss('snv-download');
        // Fallback para SNV completo FILTRADO pela rodovia
        console.log(`Tentando carregar SNV Brasil completo filtrado para ${codigoRodovia}...`);
        await carregarSNVCompleto(codigoRodovia);
        return;
      }

      // Log de debug com informações das features
      console.log(`✓ SNV baixado: ${data.features_count} features`);
      if (data.layer_info) {
        console.log(`Layer usado: ${data.layer_info.layerId}, Campo: ${data.layer_info.field}`);
      }

      // Salvar em cache apenas se tiver dados
      await supabase
        .from("configuracoes")
        .upsert({
          chave: cacheKey,
          valor: JSON.stringify(data.geojson),
          updated_at: new Date().toISOString()
        });

      setGeojsonSnvData(data.geojson);
      toast.success(`Camada SNV ${codigoRodovia} carregada (${data.features_count} trechos)`, { id: 'snv-download' });
      
    } catch (error) {
      console.error("Erro ao baixar SNV:", error);
      toast.dismiss('snv-download');
      // Fallback para SNV completo FILTRADO pela rodovia
      console.log(`Erro no download SNV específico, tentando SNV completo filtrado para ${codigoRodovia}...`);
      await carregarSNVCompleto(codigoRodovia);
    }
  };

  useEffect(() => {
    const loadGeojson = async () => {
      // Carregar SNV do novo sistema de Storage
      try {
        console.log('🗺️ Carregando SNV do sistema...');
        
        // Carregar metadados da camada ativa
        const { data: configData } = await supabase
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'snv_geojson_metadata')
          .maybeSingle();

        if (configData?.valor) {
          const metadata = JSON.parse(configData.valor);
          if (metadata.versao && metadata.storage_path) {
            console.log(`📥 Carregando SNV versão ${metadata.versao} do Storage...`);
            
            const { data: publicUrlData } = supabase.storage
              .from('snv-layers')
              .getPublicUrl(metadata.storage_path);

            if (publicUrlData?.publicUrl) {
              const response = await fetch(publicUrlData.publicUrl);
              const geojson = await response.json();
              setGeojsonSnvData(geojson);
              toast.success(`Camada SNV ${metadata.versao} carregada (${metadata.features_count} features)`);
              console.log(`✅ SNV ${metadata.versao} carregado`);
              return;
            }
          }
        }

        // Fallback: tentar cache antigo (mapa_geojson_snv)
        console.log('⚠️ Tentando carregar cache antigo...');
        const { data: dataSnv } = await supabase
          .from("configuracoes")
          .select("valor")
          .eq("chave", "mapa_geojson_snv")
          .maybeSingle();
        
        if (dataSnv?.valor) {
          setGeojsonSnvData(JSON.parse(dataSnv.valor));
          toast.success("Camada SNV carregada (cache antigo)");
        }
      } catch (error) {
        console.error("Erro ao carregar GeoJSON SNV:", error);
      }
    };
    loadGeojson();
  }, []);

  // Baixar camada SNV automaticamente quando rodovia mudar
  useEffect(() => {
    const rodoviaAtiva = necessidades.length > 0 ? necessidades[0].rodovia : null;
    const codigoAtual = rodoviaAtiva?.codigo || '';
    
    // Limpar estado anterior ANTES de carregar novo
    if (codigoAtual && geojsonSnvData) {
      const codigoCarregado = geojsonSnvData.features?.[0]?.properties?.vl_br || 
                              geojsonSnvData.features?.[0]?.properties?.CD_RODOVIA || '';
      const codigoCarregadoLimpo = String(codigoCarregado).replace(/^BR-?/i, '');
      const codigoAtualLimpo = codigoAtual.replace(/^BR-?/i, '');
      
      if (codigoCarregadoLimpo && codigoCarregadoLimpo !== codigoAtualLimpo) {
        console.log(`🔄 Mudança de rodovia detectada: BR-${codigoCarregadoLimpo} → BR-${codigoAtualLimpo}`);
        setGeojsonSnvData(null); // Limpar dados antigos
      }
    }
    
    if (codigoAtual) {
      downloadSNVAutomatico(codigoAtual);
    }
  }, [necessidades]);

  useEffect(() => {
    const carregarSinalizacoes = async () => {
      setLoadingSinalizacoes(true);
      try {
        const { data, error } = await supabase
          .from('auditoria_sinalizacoes')
          .select('*')
          .eq('tipo_elemento', tipo)
          .eq('status', 'pendente');

        if (error) throw error;

        const map = new Map();
        data?.forEach((s: any) => {
          map.set(s.elemento_id, s);
        });
        setSinalizacoes(map);
      } catch (error) {
        console.error('Erro ao carregar sinalizações:', error);
      } finally {
        setLoadingSinalizacoes(false);
      }
    };

    carregarSinalizacoes();
  }, [tipo, necessidades]);


  const handleSnvFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".geojson") && !file.name.endsWith(".json")) {
      toast.error("Por favor, selecione um arquivo GeoJSON (.geojson ou .json)");
      return;
    }

    setUploadingSnv(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.type || (data.type !== "FeatureCollection" && data.type !== "Feature")) {
        throw new Error("Arquivo não é um GeoJSON válido");
      }

      const { error } = await supabase
        .from("configuracoes")
        .upsert({
          chave: "mapa_geojson_snv",
          valor: text,
        });

      if (error) throw error;

      setGeojsonSnvData(data);
      toast.success("Camada SNV importada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao importar GeoJSON SNV:", error);
      toast.error("Erro ao importar arquivo: " + error.message);
    } finally {
      setUploadingSnv(false);
    }
  };


  const handleRemoveSnvGeojson = async () => {
    try {
      const { error } = await supabase
        .from("configuracoes")
        .delete()
        .eq("chave", "mapa_geojson_snv");

      if (error) throw error;

      setGeojsonSnvData(null);
      toast.success("Camada SNV removida!");
    } catch (error: any) {
      console.error("Erro ao remover GeoJSON SNV:", error);
      toast.error("Erro ao remover camada: " + error.message);
    }
  };

  const handleSinalizarErro = async (necessidade: Necessidade, tipoproblema: string, descricao?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { error } = await supabase
        .from('auditoria_sinalizacoes')
        .insert({
          tipo_elemento: tipo,
          elemento_id: necessidade.id,
          origem: 'necessidade',
          tipo_problema: tipoproblema,
          descricao: descricao,
          sinalizado_por: userData.user.id,
        });

      if (error) throw error;

      const { data: novaSinalizacao } = await supabase
        .from('auditoria_sinalizacoes')
        .select('*')
        .eq('elemento_id', necessidade.id)
        .single();

      if (novaSinalizacao) {
        setSinalizacoes(prev => new Map(prev).set(necessidade.id, novaSinalizacao));
      }

      toast.success("Marcador sinalizado como possível erro!");
    } catch (error: any) {
      console.error('Erro ao sinalizar:', error);
      toast.error("Erro ao sinalizar: " + error.message);
    }
  };

  const handleRemoverSinalizacao = async (necessidadeId: string) => {
    try {
      const { error } = await supabase
        .from('auditoria_sinalizacoes')
        .delete()
        .eq('elemento_id', necessidadeId)
        .eq('tipo_elemento', tipo);

      if (error) throw error;

      setSinalizacoes(prev => {
        const newMap = new Map(prev);
        newMap.delete(necessidadeId);
        return newMap;
      });

      toast.success("Sinalização removida!");
    } catch (error: any) {
      console.error('Erro ao remover sinalização:', error);
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const defaultCenter: LatLngExpression = [-15.7801, -47.9292];
  const mapCenter = necessidadesComCoordenadas.length > 0 
    ? [
        necessidadesComCoordenadas[0].latitude_inicial || necessidadesComCoordenadas[0].latitude || -15.7801,
        necessidadesComCoordenadas[0].longitude_inicial || necessidadesComCoordenadas[0].longitude || -47.9292
      ] as LatLngExpression
    : defaultCenter;

  return (
    <div className="space-y-4">
      {/* Badge de Filtros Ativos */}
      {(rodovia || lote) && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {rodovia && `🛣️ ${rodovia.codigo}`}
            {rodovia && lote && " | "}
            {lote && `📦 Lote ${lote.numero}`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <span className="font-semibold">
            {necessidadesComCoordenadas.length} necessidades no mapa
          </span>
          {sinalizacoes.size > 0 && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {sinalizacoes.size} sinalizado{sinalizacoes.size > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2 text-sm">
            <span className="flex items-center gap-1">
              ➕ <strong>{necessidades.filter(n => n.servico === "Implantar").length}</strong> Implantar
            </span>
            <span className="flex items-center gap-1">
              🔄 <strong>{necessidades.filter(n => n.servico === "Substituir").length}</strong> Substituir
            </span>
            <span className="flex items-center gap-1">
              ➖ <strong>{necessidades.filter(n => n.servico === "Remover").length}</strong> Remover
            </span>
            <span className="flex items-center gap-1">
              ✓ <strong>{necessidades.filter(n => n.servico === "Manter").length}</strong> Manter
            </span>
          </div>


          {/* Botões SNV */}
          <div className="flex gap-2 items-center">
            {necessidades.length > 0 && necessidades[0].rodovia?.codigo && !geojsonSnvData && (
              <Button
                size="sm"
                variant="default"
                onClick={() => downloadSNVAutomatico(necessidades[0].rodovia.codigo)}
                className="bg-green-600 hover:bg-green-700"
                disabled={uploadingSnv}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar SNV {necessidades[0].rodovia.codigo}
              </Button>
            )}
            
            {geojsonSnvData && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveSnvGeojson}
                className="border-red-500 text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Remover SNV
              </Button>
            )}
          </div>

          {/* Botão Limpar TODOS os Caches SNV */}
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                // Buscar TODOS os caches SNV (snv_*, não apenas vazios)
                const { data: cachesSNV } = await supabase
                  .from("configuracoes")
                  .select("chave")
                  .like("chave", "snv_%");

                if (!cachesSNV || cachesSNV.length === 0) {
                  toast.info("Nenhum cache SNV encontrado");
                  return;
                }

                const { error } = await supabase
                  .from("configuracoes")
                  .delete()
                  .in("chave", cachesSNV.map(c => c.chave));

                if (error) throw error;

                // Limpar estado local
                setGeojsonSnvData(null);
                toast.success(`${cachesSNV.length} cache(s) SNV removido(s). Recarregue a página.`);
              } catch (error: any) {
                console.error("Erro ao limpar cache SNV:", error);
                toast.error("Erro: " + error.message);
              }
            }}
            className="border-red-500 text-red-700 hover:bg-red-50"
          >
            🗑️ Limpar TODOS os Caches SNV
          </Button>
        </div>
      </div>

      {geojsonSnvData && (
        <div className="space-y-2">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2 flex-wrap">
              Camada SNV carregada ✓
              {geojsonSnvData?.features?.length > 0 && (
                <>
                  <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                    🛣️ {geojsonSnvData.features.length.toLocaleString()} trechos
                  </Badge>
                  {rodovia?.codigo && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      BR-{rodovia.codigo}
                    </Badge>
                  )}
                </>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Legenda de cores */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground px-2">
            <div className="flex items-center gap-1">
              <div className="w-8 h-1 bg-amber-400" />
              <span>SNV (clique para ver KM)</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de necessidades sem GPS */}
      {necessidadesSemCoordenadas.length > 0 && (
        <Alert variant="destructive" className="border-amber-400 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>{necessidadesSemCoordenadas.length}</strong> de <strong>{necessidadesFiltradas.length}</strong> {tipo} não possuem coordenadas GPS válidas e não podem ser exibidas no mapa.
            {necessidadesSemCoordenadas.length > 10 && (
              <span className="block mt-1 text-xs">
                Verifique se a importação incluiu as colunas de latitude/longitude.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {necessidadesComCoordenadas.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma necessidade com coordenadas GPS para exibir no mapa.
          </AlertDescription>
        </Alert>
      )}

      {necessidadesComCoordenadas.length > 0 && (
        <div className="w-full h-[600px] rounded-lg border shadow-lg overflow-hidden relative z-0">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geojsonSnvData && (
              <GeoJSON
                key={JSON.stringify(geojsonSnvData)}
                data={geojsonSnvData}
                pathOptions={{
                  color: "#fbbf24", // Amarelo para melhor contraste (tipo VGeo)
                  weight: 5, // Linha mais grossa
                  opacity: 0.9, // Bem visível
                }}
                pane="overlayPane"
                interactive={true}
                eventHandlers={{
                  mouseover: (e: any) => {
                    // Highlight ao passar mouse
                    e.target.setStyle({ 
                      weight: 7, 
                      color: "#f59e0b" // Laranja mais escuro
                    });
                  },
                  mouseout: (e: any) => {
                    // Volta ao normal
                    e.target.setStyle({ 
                      weight: 5, 
                      color: "#fbbf24" 
                    });
                  }
                }}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {};
                  const rodovia = props.CD_RODOVIA || props.DS_RODOVIA || props.vl_br || 'Rodovia';
                  const uf = props.SG_UF || props.uf || '';
                  const kmInicial = parseFloat(props.KM_INICIAL || props.km_inicial || '0');
                  const kmFinal = parseFloat(props.KM_FINAL || props.km_final || '0');
                  
                  // Verificar se os valores de KM existem (aceita 0 como válido)
                  const hasKmInicial = props.KM_INICIAL !== undefined || props.km_inicial !== undefined;
                  const hasKmFinal = props.KM_FINAL !== undefined || props.km_final !== undefined;
                  const temKM = hasKmInicial || hasKmFinal;
                  
                  // 🛣️ DEBUG: Log dos atributos da feature
                  console.log('🛣️ Feature SNV carregada:', {
                    rodovia,
                    uf,
                    kmInicial,
                    kmFinal,
                    temKM,
                    todosAtributos: props
                  });
                  
                  // === TOOLTIP HOVER (rápido) ===
                  layer.bindTooltip(
                    `<div class="font-semibold text-base">${rodovia}${uf ? ` (${uf})` : ''}</div>
                     ${temKM ? `<div class="text-sm text-gray-600">
                       Trecho: KM ${kmInicial.toFixed(1)} → ${kmFinal.toFixed(1)}
                     </div>` : ''}`,
                    { 
                      sticky: true, // Segue o mouse
                      className: 'custom-snv-tooltip',
                      direction: 'top'
                    }
                  );
                  
                  // === CLICK (detalhado tipo VGeo) ===
                  layer.on('click', (e: any) => {
                    const coords = (feature.geometry as any).coordinates;
                    
                    // Se tiver KM_INICIAL e KM_FINAL, calcular KM exato
                    if (temKM) {
                      const kmCalculado = calcularKmNoSegmento(
                        e.latlng.lat,
                        e.latlng.lng,
                        coords,
                        kmInicial,
                        kmFinal
                      );
                      
                      // Toast igual ao VGeo
                      toast.info(
                        `📍 ${rodovia}${uf ? ` (${uf})` : ''} - KM ${kmCalculado.toFixed(1)}`,
                        { 
                          duration: 5000,
                          position: 'top-center'
                        }
                      );
                      
                      // Log detalhado para debug
                      console.log('📍 Click SNV:', {
                        rodovia,
                        uf,
                        trecho: `KM ${kmInicial.toFixed(1)} → ${kmFinal.toFixed(1)}`,
                        kmClicado: kmCalculado.toFixed(1),
                        coordenadas: {
                          lat: e.latlng.lat.toFixed(6),
                          lng: e.latlng.lng.toFixed(6)
                        },
                        atributos_completos: props
                      });
                    } else {
                      // Se não tiver KM, mostrar mensagem informativa
                      toast.warning(
                        `⚠️ ${rodovia}${uf ? ` (${uf})` : ''}\nEste trecho não possui dados de KM.\nCoordenadas: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`,
                        { 
                          duration: 6000,
                          position: 'top-center'
                        }
                      );
                      
                      console.log('📍 Click SNV (sem KM):', {
                        rodovia,
                        uf,
                        coordenadas: e.latlng,
                        atributos_completos: props
                      });
                    }
                  });
                }}
              />
            )}

            {/* Marcadores com clustering */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={80}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {necessidadesComCoordenadas.map((nec, index) => {
              const lat = nec.latitude_inicial || nec.latitude || 0;
              const lng = nec.longitude_inicial || nec.longitude || 0;
              const km = nec.km_inicial || nec.km || "N/A";
              const rodovia = nec.rodovia?.codigo || "N/A";
              const match = nec.distancia_match_metros
                ? `Match: ${nec.distancia_match_metros.toFixed(0)}m`
                : "";

              // Usar index como fallback para key única (previne conflitos com IDs duplicados)
              const uniqueKey = `${nec.id}-${index}`;
              
              return (
                <Marker
                  key={uniqueKey}
                  position={[lat, lng] as LatLngExpression}
                  icon={createCustomIcon(nec.servico, sinalizacoes.has(nec.id))}
                >
                  <Popup>
                    <div className="font-sans w-64">
                      <h3 className="font-semibold text-sm mb-2">
                        {nec.servico === "Implantar"
                          ? "➕"
                          : nec.servico === "Substituir"
                          ? "🔄"
                          : nec.servico === "Remover"
                          ? "➖"
                          : "✓"}{" "}
                        {nec.servico}
                      </h3>
                      <p className="text-xs space-y-1 mb-3">
                        {nec.codigo && (
                          <>
                            <strong>Placa:</strong> {nec.codigo}
                            {nec.tipo && ` (${nec.tipo})`}
                            <br />
                          </>
                        )}
                        {nec.descricao && (
                          <>
                            <strong>Descrição:</strong> {nec.descricao}
                            <br />
                          </>
                        )}
                        <strong>Rodovia:</strong> {rodovia}
                        <br />
                        <strong>KM:</strong> {km}
                        <br />
                        {match && (
                          <>
                            <strong>{match}</strong>
                            <br />
                          </>
                        )}
                        {nec.observacao && (
                          <span className="text-muted-foreground italic">
                            {nec.observacao}
                          </span>
                        )}
                      </p>

                      <div className="border-t pt-2 mt-2">
                        {sinalizacoes.has(nec.id) ? (
                          <div className="space-y-2">
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="flex items-start gap-1">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="text-xs">
                                  <p className="font-semibold text-red-700">
                                    Sinalizado como erro
                                  </p>
                                  <p className="text-red-600 mt-1">
                                    {sinalizacoes.get(nec.id)?.tipo_problema?.replace('_', ' ')}
                                  </p>
                                  {sinalizacoes.get(nec.id)?.descricao && (
                                    <p className="text-muted-foreground mt-1">
                                      {sinalizacoes.get(nec.id).descricao}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => handleRemoverSinalizacao(nec.id)}
                            >
                              Remover sinalização
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold mb-1">Sinalizar como erro:</p>
                            <div className="grid grid-cols-2 gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() => handleSinalizarErro(nec, 'fora_rodovia', 'Marcador aparenta estar fora da rodovia')}
                              >
                                🗺️ Fora rodovia
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() => handleSinalizarErro(nec, 'coordenada_errada', 'Coordenada GPS aparenta estar incorreta')}
                              >
                                📍 GPS errado
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() => handleSinalizarErro(nec, 'duplicata', 'Possível duplicata de registro')}
                              >
                                👥 Duplicata
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() => {
                                  const descricao = prompt("Descreva o problema:");
                                  if (descricao) {
                                    handleSinalizarErro(nec, 'outro', descricao);
                                  }
                                }}
                              >
                                ❓ Outro
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            </MarkerClusterGroup>

            <MapBoundsUpdater
              necessidades={necessidadesComCoordenadas}
              setMaxMarkers={setMaxMarkersToShow}
              setZoom={setCurrentZoom}
            />
          </MapContainer>
        </div>
      )}

    </div>
  );
};
