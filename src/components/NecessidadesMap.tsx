import { useEffect, useState } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NecessidadesMapLayers } from "./NecessidadesMapLayers";

interface Necessidade {
  id: string;
  servico: "Inclusão" | "Substituição" | "Remoção";
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
  [key: string]: any;
}

interface NecessidadesMapProps {
  necessidades: Necessidade[];
  tipo: string;
}

const MapBounds = ({ coordinates }: { coordinates: LatLngExpression[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates as any);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  
  return null;
};

const createCustomIcon = (servico: string) => {
  const color = servico === "Inclusão" ? "#22c55e" : servico === "Substituição" ? "#eab308" : "#ef4444";
  const emoji = servico === "Inclusão" ? "➕" : servico === "Substituição" ? "🔄" : "➖";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">${emoji}</div>
    `,
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 16] as [number, number],
    popupAnchor: [0, -16] as [number, number],
  });
};

export const NecessidadesMap = ({ necessidades, tipo }: NecessidadesMapProps) => {
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const necessidadesComCoordenadas = necessidades.filter(n => {
    const lat = n.latitude_inicial || n.latitude;
    const lng = n.longitude_inicial || n.longitude;
    return lat && lng && lat !== 0 && lng !== 0;
  });

  useEffect(() => {
    const loadGeojson = async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "mapa_geojson_rodovias")
        .maybeSingle();
      
      if (data?.valor) {
        try {
          setGeojsonData(JSON.parse(data.valor));
          toast.success("Camada base da rodovia carregada");
        } catch (error) {
          console.error("Erro ao carregar GeoJSON:", error);
        }
      }
    };
    loadGeojson();
  }, []);

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
      toast.success("Camada base importada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao importar GeoJSON:", error);
      toast.error("Erro ao importar arquivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const coordinates: LatLngExpression[] = necessidadesComCoordenadas.map(n => {
    const lat = n.latitude_inicial || n.latitude || 0;
    const lng = n.longitude_inicial || n.longitude || 0;
    return [lat, lng] as LatLngExpression;
  });

  const defaultCenter: LatLngExpression = [-15.7801, -47.9292];
  const mapCenter = coordinates.length > 0 ? coordinates[0] : defaultCenter;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <span className="font-semibold">
            {necessidadesComCoordenadas.length} necessidades no mapa
          </span>
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2 text-sm">
            <span className="flex items-center gap-1">
              ➕ <strong>{necessidades.filter(n => n.servico === "Inclusão").length}</strong> Inclusões
            </span>
            <span className="flex items-center gap-1">
              🔄 <strong>{necessidades.filter(n => n.servico === "Substituição").length}</strong> Substituições
            </span>
            <span className="flex items-center gap-1">
              ➖ <strong>{necessidades.filter(n => n.servico === "Remoção").length}</strong> Remoções
            </span>
          </div>

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
        </div>
      </div>

      {geojsonData && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Camada base da rodovia carregada do VGeo DNIT ✓
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

      <div className="w-full h-[600px] rounded-lg border shadow-lg overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={true}
        >
          <NecessidadesMapLayers
            geojsonData={geojsonData}
            necessidadesComCoordenadas={necessidadesComCoordenadas}
            createCustomIcon={createCustomIcon}
          />
          {coordinates.length > 0 && <MapBounds coordinates={coordinates} />}
        </MapContainer>
      </div>
    </div>
  );
};
