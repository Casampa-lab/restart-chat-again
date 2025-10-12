import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

export const NecessidadesMap = ({ necessidades, tipo }: NecessidadesMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [tokenSalvo, setTokenSalvo] = useState(false);

  // Filtrar necessidades com coordenadas válidas
  const necessidadesComCoordenadas = necessidades.filter(n => {
    const lat = n.latitude_inicial || n.latitude;
    const lng = n.longitude_inicial || n.longitude;
    return lat && lng && lat !== 0 && lng !== 0;
  });

  const getMarkerColor = (servico: string) => {
    switch (servico) {
      case "Inclusão":
        return "#22c55e"; // green-500
      case "Substituição":
        return "#eab308"; // yellow-500
      case "Remoção":
        return "#ef4444"; // red-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  const getMarkerIcon = (servico: string) => {
    switch (servico) {
      case "Inclusão":
        return "🟢";
      case "Substituição":
        return "🟡";
      case "Remoção":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      // Centro do Brasil como ponto inicial
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-47.9292, -15.7801], // Brasília
        zoom: 4,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

      // Adicionar marcadores
      addMarkers();

      toast.success("Mapa carregado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao inicializar mapa:", error);
      toast.error("Erro ao carregar mapa: " + error.message);
    }
  };

  const addMarkers = () => {
    if (!map.current) return;

    // Limpar marcadores anteriores
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    if (necessidadesComCoordenadas.length === 0) {
      toast.info("Nenhuma necessidade com coordenadas para exibir");
      return;
    }

    // Adicionar novo marcador para cada necessidade
    necessidadesComCoordenadas.forEach(nec => {
      const lat = nec.latitude_inicial || nec.latitude || 0;
      const lng = nec.longitude_inicial || nec.longitude || 0;

      // Criar elemento customizado do marcador
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.backgroundColor = getMarkerColor(nec.servico);
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.borderRadius = "50%";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "14px";
      el.textContent = getMarkerIcon(nec.servico).substring(0, 2);

      // Criar popup
      const km = nec.km_inicial || nec.km || "N/A";
      const rodovia = nec.rodovia?.codigo || "N/A";
      const match = nec.distancia_match_metros 
        ? `<br><strong>Match:</strong> ${nec.distancia_match_metros.toFixed(0)}m`
        : "";
      
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
            ${getMarkerIcon(nec.servico)} ${nec.servico}
          </h3>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Rodovia:</strong> ${rodovia}<br>
            <strong>KM:</strong> ${km}${match}
          </p>
          ${nec.observacao ? `<p style="margin: 4px 0; font-size: 11px; color: #666;"><em>${nec.observacao}</em></p>` : ""}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Ajustar zoom para mostrar todos os marcadores
    if (necessidadesComCoordenadas.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      necessidadesComCoordenadas.forEach(nec => {
        const lat = nec.latitude_inicial || nec.latitude || 0;
        const lng = nec.longitude_inicial || nec.longitude || 0;
        bounds.extend([lng, lat]);
      });
      map.current?.fitBounds(bounds, { padding: 50 });
    }
  };

  useEffect(() => {
    // Verificar se há token salvo no localStorage
    const savedToken = localStorage.getItem("mapbox_token");
    if (savedToken) {
      setMapboxToken(savedToken);
      setTokenSalvo(true);
    }
  }, []);

  useEffect(() => {
    if (tokenSalvo && mapboxToken) {
      initializeMap();
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [tokenSalvo, mapboxToken]);

  useEffect(() => {
    if (map.current) {
      addMarkers();
    }
  }, [necessidades]);

  const handleSaveToken = () => {
    if (!mapboxToken.trim()) {
      toast.error("Digite um token válido");
      return;
    }
    localStorage.setItem("mapbox_token", mapboxToken);
    setTokenSalvo(true);
    toast.success("Token salvo! Inicializando mapa...");
  };

  if (!tokenSalvo) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5" />
            Configuração do Mapa
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Para usar o mapa, você precisa de um token Mapbox gratuito.
              <br />
              <a 
                href="https://account.mapbox.com/access-tokens/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Clique aqui para obter seu token gratuito
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Token Mapbox</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbG..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O token será salvo localmente no seu navegador
            </p>
          </div>

          <Button onClick={handleSaveToken} className="w-full">
            Salvar e Inicializar Mapa
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <span className="font-semibold">
            {necessidadesComCoordenadas.length} necessidades no mapa
          </span>
        </div>
        
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1">
            🟢 <strong>{necessidades.filter(n => n.servico === "Inclusão").length}</strong> Inclusões
          </span>
          <span className="flex items-center gap-1">
            🟡 <strong>{necessidades.filter(n => n.servico === "Substituição").length}</strong> Substituições
          </span>
          <span className="flex items-center gap-1">
            🔴 <strong>{necessidades.filter(n => n.servico === "Remoção").length}</strong> Remoções
          </span>
        </div>
      </div>

      {necessidadesComCoordenadas.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma necessidade com coordenadas GPS para exibir no mapa.
          </AlertDescription>
        </Alert>
      )}

      <div 
        ref={mapContainer} 
        className="w-full h-[600px] rounded-lg border shadow-lg"
        style={{ minHeight: "600px" }}
      />
    </div>
  );
};
