import { useEffect } from "react";
import { TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";

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

interface MapContentProps {
  geojsonData: any;
  necessidadesComCoordenadas: Necessidade[];
  coordinates: LatLngExpression[];
  createCustomIcon: (servico: string) => any;
}

export function MapContent({
  geojsonData,
  necessidadesComCoordenadas,
  coordinates,
  createCustomIcon,
}: MapContentProps) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      const L = require("leaflet");
      const bounds = L.latLngBounds(coordinates as any);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);

  return (
    <>
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
    </>
  );
}
