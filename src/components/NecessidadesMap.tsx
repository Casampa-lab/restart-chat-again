import { useState, useEffect } from "react";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertCircle, Upload, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import { removeGeographicOutliers } from "@/lib/gpsUtils";

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
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [geojsonSnvData, setGeojsonSnvData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    const loadGeojson = async () => {
      // Carregar GeoJSON VGeo (rodovia)
      const { data: dataVgeo } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "mapa_geojson_rodovias")
        .maybeSingle();
      
      if (dataVgeo?.valor) {
        try {
          setGeojsonData(JSON.parse(dataVgeo.valor));
        } catch (error) {
          console.error("Erro ao carregar GeoJSON VGeo:", error);
        }
      }

      // Carregar GeoJSON SNV
      const { data: dataSnv } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "mapa_geojson_snv")
        .maybeSingle();
      
      if (dataSnv?.valor) {
        try {
          setGeojsonSnvData(JSON.parse(dataSnv.valor));
          toast.success("Camadas VGeo e SNV carregadas");
        } catch (error) {
          console.error("Erro ao carregar GeoJSON SNV:", error);
        }
      } else if (dataVgeo?.valor) {
        toast.success("Camada VGeo carregada");
      }
    };
    loadGeojson();
  }, []);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".geojson") && !file.name.endsWith(".json")) {
      toast.error("Por favor, selecione um arquivo GeoJSON (.geojson ou .json)");
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.type || (data.type !== "FeatureCollection" && data.type !== "Feature")) {
        throw new Error("Arquivo não é um GeoJSON válido");
      }

      const { error } = await supabase
        .from("configuracoes")
        .upsert({
          chave: "mapa_geojson_rodovias",
          valor: text,
        });

      if (error) throw error;

      setGeojsonData(data);
      toast.success("Camada VGeo importada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao importar GeoJSON:", error);
      toast.error("Erro ao importar arquivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

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

  const handleRemoveGeojson = async () => {
    try {
      const { error } = await supabase
        .from("configuracoes")
        .delete()
        .eq("chave", "mapa_geojson_rodovias");

      if (error) throw error;

      setGeojsonData(null);
      toast.success("Camada VGeo removida!");
    } catch (error: any) {
      console.error("Erro ao remover GeoJSON:", error);
      toast.error("Erro ao remover camada: " + error.message);
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

          {/* Botões VGeo */}
          <div className="flex gap-2 items-center">
            <div className="relative">
              <input
                type="file"
                id="geojson-upload"
                accept=".geojson,.json"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => document.getElementById("geojson-upload")?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {geojsonData ? "Trocar" : "Importar"} GeoJSON VGeo
              </Button>
            </div>
            
            {geojsonData && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveGeojson}
                className="border-red-500 text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Remover VGeo
              </Button>
            )}
          </div>

          {/* Botões SNV */}
          <div className="flex gap-2 items-center">
            <div className="relative">
              <input
                type="file"
                id="geojson-snv-upload"
                accept=".geojson,.json"
                onChange={handleSnvFileUpload}
                className="hidden"
                disabled={uploadingSnv}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => document.getElementById("geojson-snv-upload")?.click()}
                disabled={uploadingSnv}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {geojsonSnvData ? "Trocar" : "Importar"} GeoJSON SNV
              </Button>
            </div>
            
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
        </div>
      </div>

      {(geojsonData || geojsonSnvData) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {geojsonData && geojsonSnvData ? (
              <>Camadas VGeo (azul) e SNV (verde) carregadas ✓</>
            ) : geojsonData ? (
              <>Camada VGeo carregada ✓</>
            ) : (
              <>Camada SNV carregada ✓</>
            )}
          </AlertDescription>
        </Alert>
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

            {geojsonData && (
              <GeoJSON
                key={JSON.stringify(geojsonData)}
                data={geojsonData}
                pathOptions={{
                  color: "#1e40af",
                  weight: 4,
                  opacity: 0.7,
                }}
              />
            )}

            {geojsonSnvData && (
              <GeoJSON
                key={JSON.stringify(geojsonSnvData)}
                data={geojsonSnvData}
                pathOptions={{
                  color: "#16a34a",
                  weight: 3,
                  opacity: 0.6,
                }}
              />
            )}

            {/* Marcadores limitados para performance */}
            {necessidadesComCoordenadas.slice(0, maxMarkersToShow).map((nec, index) => {
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

            <MapBoundsUpdater
              necessidades={necessidadesComCoordenadas.slice(0, maxMarkersToShow)}
              setMaxMarkers={setMaxMarkersToShow}
              setZoom={setCurrentZoom}
            />
          </MapContainer>
        </div>
      )}

      {/* Alerta de markers limitados */}
      {necessidadesComCoordenadas.length > maxMarkersToShow && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Mostrando {maxMarkersToShow} de {necessidadesComCoordenadas.length} pontos. 
            Dê zoom para carregar mais detalhes (até {currentZoom > 15 ? '2000' : currentZoom > 13 ? '1000' : '500'} no zoom atual).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
