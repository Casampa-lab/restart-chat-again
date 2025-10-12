import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface LeafletMapProps {
  center: LatLngExpression;
  geojsonData: any;
  necessidadesComCoordenadas: Necessidade[];
  createCustomIcon: (servico: string) => any;
}

function MapBoundsUpdater({ necessidades }: { necessidades: Necessidade[] }) {
  const map = useMap();

  useEffect(() => {
    if (necessidades.length > 0) {
      const coordinates = necessidades.map((n) => {
        const lat = n.latitude_inicial || n.latitude || 0;
        const lng = n.longitude_inicial || n.longitude || 0;
        return [lat, lng] as LatLngExpression;
      });

      const bounds = L.latLngBounds(coordinates as any);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [necessidades, map]);

  return null;
}

export function LeafletMap({
  center,
  geojsonData,
  necessidadesComCoordenadas,
  createCustomIcon,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: "100%", height: "100%" }}
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

      {necessidadesComCoordenadas.map((nec) => {
        const lat = nec.latitude_inicial || nec.latitude || 0;
        const lng = nec.longitude_inicial || nec.longitude || 0;
        const km = nec.km_inicial || nec.km || "N/A";
        const rodovia = nec.rodovia?.codigo || "N/A";
        const match = nec.distancia_match_metros
          ? `Match: ${nec.distancia_match_metros.toFixed(0)}m`
          : "";

        return (
          <Marker
            key={nec.id}
            position={[lat, lng] as LatLngExpression}
            icon={createCustomIcon(nec.servico)}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-semibold text-sm mb-2">
                  {nec.servico === "Inclusão"
                    ? "➕"
                    : nec.servico === "Substituição"
                    ? "🔄"
                    : "➖"}{" "}
                  {nec.servico}
                </h3>
                <p className="text-xs space-y-1">
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
              </div>
            </Popup>
          </Marker>
        );
      })}

      <MapBoundsUpdater necessidades={necessidadesComCoordenadas} />
    </MapContainer>
  );
}
