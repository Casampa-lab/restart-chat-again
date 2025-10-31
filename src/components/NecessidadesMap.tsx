"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

/**
 * Calcula distância "plana" aproximada entre dois pontos (lat/lng),
 * bom o bastante pra interpolar fração ao longo da linha.
 */
function dist2D(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const dx = a.lat - b.lat;
  const dy = a.lng - b.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Dado um conjunto de vértices da polyline e o ponto clicado,
 * retorna qual fração [0..1] do comprimento total da linha
 * corresponde ao ponto de clique projetado no segmento mais próximo.
 */
function fractionAlongLine(latlngs: L.LatLng[], clickLatLng: L.LatLng) {
  if (latlngs.length < 2) return 0;

  let bestSegIndex = 0;
  let bestDist = Infinity;
  let bestT = 0; // posição dentro do segmento [0..1]

  for (let i = 0; i < latlngs.length - 1; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[i + 1];

    const vx = p2.lat - p1.lat;
    const vy = p2.lng - p1.lng;

    const wx = clickLatLng.lat - p1.lat;
    const wy = clickLatLng.lng - p1.lng;

    const segLen2 = vx * vx + vy * vy || 1e-12;
    let t = (vx * wx + vy * wy) / segLen2;
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    const projLat = p1.lat + t * vx;
    const projLng = p1.lng + t * vy;

    const dClickProj = Math.sqrt(
      (clickLatLng.lat - projLat) * (clickLatLng.lat - projLat) +
        (clickLatLng.lng - projLng) * (clickLatLng.lng - projLng)
    );

    if (dClickProj < bestDist) {
      bestDist = dClickProj;
      bestSegIndex = i;
      bestT = t;
    }
  }

  // comprimento total da linha
  let totalLen = 0;
  for (let i = 0; i < latlngs.length - 1; i++) {
    totalLen += dist2D(latlngs[i], latlngs[i + 1]);
  }
  if (totalLen === 0) return 0;

  // comprimento até o início do segmento "vencedor"
  let lenBefore = 0;
  for (let i = 0; i < bestSegIndex; i++) {
    lenBefore += dist2D(latlngs[i], latlngs[i + 1]);
  }

  // comprimento parcial dentro do segmento vencedor
  const segStart = latlngs[bestSegIndex];
  const segEnd = latlngs[bestSegIndex + 1];
  const segLen = dist2D(segStart, segEnd);
  const lenInSeg = segLen * bestT;

  const totalAtClick = lenBefore + lenInSeg;
  const frac = totalAtClick / totalLen;

  if (frac < 0) return 0;
  if (frac > 1) return 1;
  return frac;
}

/**
 * Filtra apenas geometrias lineares (LineString / MultiLineString)
 * e descarta Polygon, Point, etc. pra não sujar o mapa.
 */
function onlyLineFeatures(fc: any) {
  if (!fc || !fc.features || !Array.isArray(fc.features)) return fc;

  const filtered = {
    type: "FeatureCollection",
    features: fc.features.filter((feat: any) => {
      if (!feat || !feat.geometry) return false;

      const g = feat.geometry;
      const t = g.type;

      if (
        t === "Polygon" ||
        t === "MultiPolygon" ||
        t === "GeometryCollection" ||
        t === "Point" ||
        t === "MultiPoint" ||
        t === null
      ) {
        return false;
      }

      if (t === "LineString" || t === "MultiLineString") {
        if (!g.coordinates || g.coordinates.length === 0) return false;
        return true;
      }

      return false;
    }),
  };

  return filtered;
}

/** Evita null/undefined/vazio em popup */
function safe(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

/** Estilos das camadas */
const LAYER_STYLES = {
  snv: {
    color: "#d32f2f", // vermelho contínuo (SNV oficial DNIT)
    weight: 2,
  },
  vgeo: {
    color: "#0066cc", // azul tracejado (VGeo / referência)
    weight: 2,
    dashArray: "4 2",
  },
};

interface NecessidadesMapProps {
  necessidades?: any[];
  tipo?: string;
  rodoviaId?: string;
  loteId?: string;
  rodovia?: { codigo: string };
  lote?: { numero: string; empresa?: { nome: string } };
}

const NecessidadesMap: React.FC<NecessidadesMapProps> = ({
  rodovia,
  rodoviaId,
}) => {
  // refs do Leaflet
  const mapRef = useRef<L.Map | null>(null);
  const snvGroupRef = useRef<L.LayerGroup | null>(null);
  const vgeoGroupRef = useRef<L.LayerGroup | null>(null);

  // mensagens de status (SNV / VGeo) mostradas sobre o mapa
  const [snvStatus, setSnvStatus] = useState<{
    type: "ok" | "warn" | "error";
    msg: string;
  } | null>(null);

  const [vgeoStatus, setVgeoStatus] = useState<{
    type: "ok" | "warn" | "error";
    msg: string;
  } | null>(null);

  // rodovia alvo (fallback BR-040)
  const targetRodovia =
    rodovia?.codigo?.trim() || rodoviaId?.trim() || "BR-040";

  useEffect(() => {
    // evitar SSR
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // cria o mapa só uma vez
    if (!mapRef.current) {
      const map = L.map("necessidades-map", {
        center: [-18.5, -44.0], // MG aproximado
        zoom: 6,
        minZoom: 5,
        maxZoom: 18,
      });

      mapRef.current = map;

      const baseTiles = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
            'contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      // grupos de camadas
      const snvLayerGroup = L.layerGroup();
      const vgeoLayerGroup = L.layerGroup();

      snvGroupRef.current = snvLayerGroup;
      vgeoGroupRef.current = vgeoLayerGroup;

      // SNV começa ligado
      snvLayerGroup.addTo(map);

      // controle de visibilidade
      const overlays: Record<string, L.Layer> = {
        "SNV DNIT 202501A (BRs federais/MG)": snvLayerGroup,
        "Malha Federal (VGeo MG)": vgeoLayerGroup,
      };

      L.control
        .layers(
          {
            "Mapa Base": baseTiles,
          },
          overlays,
          { collapsed: false }
        )
        .addTo(map);
    }

    // agora que o mapa já existe:
    const map = mapRef.current!;
    const snvLayerGroup = snvGroupRef.current!;
    const vgeoLayerGroup = vgeoGroupRef.current!;

    // função pra enquadrar o que estiver visível
    function fitToVisibleLayers() {
      const bounds = L.latLngBounds([]);

      if (map.hasLayer(snvLayerGroup)) {
        try {
          const snvBounds = (snvLayerGroup as any).getBounds?.();
          if (snvBounds && snvBounds.isValid()) bounds.extend(snvBounds);
        } catch {
          // ignore
        }
      }

      if (map.hasLayer(vgeoLayerGroup)) {
        try {
          const vgeoBounds = (vgeoLayerGroup as any).getBounds?.();
          if (vgeoBounds && vgeoBounds.isValid()) bounds.extend(vgeoBounds);
        } catch {
          // ignore
        }
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }

    // limpa camadas antigas quando troca rodovia
    snvLayerGroup.clearLayers();
    vgeoLayerGroup.clearLayers();

    // reseta status
    setSnvStatus(null);
    setVgeoStatus(null);

    // ======================================================
    // 1) SNV
    // ======================================================
    (async () => {
      try {
        setSnvStatus({
          type: "warn",
          msg: `Carregando SNV (${targetRodovia})...`,
        });

        const { data, error } = await supabase.functions.invoke(
          "download-vgeo-layer",
          {
            body: {
              codigo_rodovia: targetRodovia,
              layer_type: "snv",
            },
          }
        );

        if (error) {
          console.error("❌ Erro ao carregar SNV:", error);
          setSnvStatus({
            type: "error",
            msg: `SNV indisponível para ${targetRodovia}.`,
          });
          return;
        }

        const geojsonData = data?.geojson || data;

        if (!geojsonData?.features || geojsonData.features.length === 0) {
          console.warn("⚠️ SNV não retornou features");
          setSnvStatus({
            type: "error",
            msg: `Sem dados SNV para ${targetRodovia}.`,
          });
          // continua pro VGeo
        } else {
          const snvData = onlyLineFeatures(geojsonData);

          const snvGeo = L.geoJSON(snvData as any, {
            style: LAYER_STYLES.snv as any,
            onEachFeature: (feature: any, layer: L.Layer) => {
              layer.on("click", (e: L.LeafletMouseEvent) => {
                const p = feature?.properties || {};

                const brNumero = p.vl_br ? `BR-${p.vl_br}` : "BR-—";
                const uf = p.sg_uf ?? "MG";
                const codigoSNV = p.vl_codigo;
                const kmInicial = p.vl_km_inic;
                const kmFinal = p.vl_km_fina;
                const ul = p.ul;
                const jurisdicao = p.ds_jurisdi;
                const legenda = p.ds_legenda || p.sg_legenda;
                const latIni = p.latitude_inicial;
                const lonIni = p.longitude_inicial;
                const latFim = p.latitude_final;
                const lonFim = p.longitude_final;

                // 1. pegar vértices da linha
                let latlngs: L.LatLng[] = [];
                if (layer instanceof L.Polyline) {
                  const raw = layer.getLatLngs() as any;
                  if (Array.isArray(raw) && raw.length > 0) {
                    if (Array.isArray(raw[0])) {
                      // MultiLineString -> usa primeiro subtrecho
                      latlngs = raw[0] as L.LatLng[];
                    } else {
                      // LineString
                      latlngs = raw as L.LatLng[];
                    }
                  }
                }

                // 2. fração ao longo da linha perto do clique
                const frac = fractionAlongLine(latlngs, e.latlng);

                // 3. interpolar km exato
                let kmExato: string | number = "—";
                if (
                  typeof kmInicial === "number" &&
                  typeof kmFinal === "number" &&
                  !isNaN(kmInicial) &&
                  !isNaN(kmFinal)
                ) {
                  const kmCalc =
                    kmInicial + frac * (kmFinal - kmInicial);
                  kmExato = kmCalc.toFixed(1); // uma casa decimal
                }

                const htmlPopup = `
                  <div style="font-size:13px; line-height:1.4;">
                    <b>SNV / DNIT 202501A</b><br/>
                    Rodovia: ${safe(brNumero)} / ${safe(uf)}<br/>
                    Código SNV: ${safe(codigoSNV)}<br/>
                    km inicial: ${safe(kmInicial)}<br/>
                    km final: ${safe(kmFinal)}<br/>
                    <b>Km (ponto clicado): ${safe(kmExato)}</b><br/>
                    UL responsável: ${safe(ul)}<br/>
                    Jurisdição: ${safe(jurisdicao)}<br/>
                    Situação: ${safe(legenda)}<br/>
                    <hr style="border:none;border-top:1px solid #ccc;margin:6px 0;" />
                    <div style="font-size:11px; line-height:1.4; color:#555;">
                      Início geom.: ${safe(latIni)}, ${safe(lonIni)}<br/>
                      Fim geom.: ${safe(latFim)}, ${safe(lonFim)}
                    </div>
                  </div>
                `;
                (layer as any).bindPopup(htmlPopup).openPopup();
              });
            },
          });

          snvGeo.addTo(snvLayerGroup);

          setSnvStatus({
            type: "ok",
            msg: `SNV carregado (${snvData.features.length} trechos).`,
          });
        }

        // faz um fit mesmo se só SNV carregou
        fitToVisibleLayers();
      } catch (err) {
        console.error("💥 Erro inesperado carregando SNV:", err);
        setSnvStatus({
          type: "error",
          msg: `Falha ao carregar SNV para ${targetRodovia}.`,
        });
      }
    })();

    // ======================================================
    // 2) VGeo
    // ======================================================
    (async () => {
      try {
        setVgeoStatus({
          type: "warn",
          msg: `Carregando VGeo (${targetRodovia})...`,
        });

        const { data, error } = await supabase.functions.invoke(
          "download-vgeo-layer",
          {
            body: {
              codigo_rodovia: targetRodovia,
              layer_type: "vgeo",
            },
          }
        );

        if (error) {
          console.warn("⚠️ VGeo não disponível:", error);
          setVgeoStatus({
            type: "error",
            msg: `VGeo indisponível para ${targetRodovia}.`,
          });
          return;
        }

        const geojsonData = data?.geojson || data;

        if (!geojsonData?.features || geojsonData.features.length === 0) {
          console.warn("⚠️ VGeo não retornou features");
          setVgeoStatus({
            type: "error",
            msg: `Sem dados VGeo para ${targetRodovia}.`,
          });
          return;
        }

        const vgeoData = onlyLineFeatures(geojsonData);

        const vgeoGeo = L.geoJSON(vgeoData as any, {
          style: LAYER_STYLES.vgeo as any,
          onEachFeature: (feature: any, layer: L.Layer) => {
            layer.on("click", () => {
              const p = feature?.properties || {};

              // campos reais da tua base VGeo
              const rodovia = p.codigo_rod
                ? `BR-${p.codigo_rod}/${p.unidade_fe || ""}`.trim()
                : "—";

              const jurisdicao = p.jurisdicao || "—";
              const extensaoKm = p.extensao || "—";
              const localIni = p.local_inic || "—";
              const localFim = p.local_fim || "—";

              const htmlPopup = `
                <div style="font-size:13px; line-height:1.4;">
                  <b>VGeo / Malha Federal MG</b><br/>
                  Rodovia: ${safe(rodovia)}<br/>
                  Jurisdição: ${safe(jurisdicao)}<br/>
                  Extensão aprox (km): ${safe(extensaoKm)}<br/>
                  <hr style="border:none;border-top:1px solid #ccc;margin:6px 0;" />
                  <div style="font-size:11px; line-height:1.4; color:#555;">
                    Início: ${safe(localIni)}<br/>
                    Fim: ${safe(localFim)}
                  </div>
                </div>
              `;

              (layer as any).bindPopup(htmlPopup).openPopup();
            });
          },
        });

        vgeoGeo.addTo(vgeoGroupRef.current!);

        setVgeoStatus({
          type: "ok",
          msg: `VGeo carregado (${vgeoData.features.length} trechos).`,
        });

        // fit final incluindo VGeo
        fitToVisibleLayers();
      } catch (err) {
        console.error("💥 Erro inesperado carregando VGeo:", err);
        setVgeoStatus({
          type: "error",
          msg: `Falha ao carregar VGeo para ${targetRodovia}.`,
        });
      }
    })();

    // limpeza geral se componente desmontar
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [targetRodovia]);

  // Caixinhas SNV / VGeo no canto do mapa
  function renderStatusOverlay() {
    if (!snvStatus && !vgeoStatus) return null;

    const baseBoxStyle: React.CSSProperties = {
      fontSize: "12px",
      lineHeight: 1.4,
      borderRadius: "6px",
      padding: "6px 8px",
      marginBottom: "4px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      border: "1px solid #999",
      background: "#fff",
      minWidth: "200px",
      maxWidth: "260px",
    };

    function bgFor(type: "ok" | "warn" | "error") {
      if (type === "ok") return "#e8f5e9"; // verde claro
      if (type === "warn") return "#fffde7"; // amarelo claro
      return "#ffebee"; // vermelho claro
    }

    return (
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          pointerEvents: "none", // não intercepta clique no mapa
        }}
      >
        {snvStatus && (
          <div
            style={{
              ...baseBoxStyle,
              background: bgFor(snvStatus.type),
              borderColor: "#b71c1c",
            }}
          >
            <b>SNV:</b> {snvStatus.msg}
          </div>
        )}
        {vgeoStatus && (
          <div
            style={{
              ...baseBoxStyle,
              background: bgFor(vgeoStatus.type),
              borderColor: "#1a237e",
            }}
          >
            <b>VGeo:</b> {vgeoStatus.msg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {renderStatusOverlay()}

      <div
        id="necessidades-map"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      />
    </div>
  );
};

export default NecessidadesMap;
