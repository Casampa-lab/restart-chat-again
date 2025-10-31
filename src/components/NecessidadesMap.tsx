"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

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

function safe(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

const LAYER_STYLES = {
  snv: {
    color: "#d32f2f",
    weight: 2,
  },
  vgeo: {
    color: "#0066cc",
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
  const mapRef = useRef<L.Map | null>(null);
  const snvGroupRef = useRef<L.LayerGroup | null>(null);
  const vgeoGroupRef = useRef<L.LayerGroup | null>(null);

  const [snvStatus, setSnvStatus] = useState<{
    type: "ok" | "warn" | "error";
    msg: string;
  } | null>(null);

  const [vgeoStatus, setVgeoStatus] = useState<{
    type: "ok" | "warn" | "error";
    msg: string;
  } | null>(null);

  const targetRodovia =
    rodovia?.codigo?.trim() || rodoviaId?.trim() || "BR-040";

  // flag pra logar só uma vez as props da VGeo
  const vgeoLoggedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (!mapRef.current) {
      const map = L.map("necessidades-map", {
        center: [-18.5, -44.0],
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

      const snvLayerGroup = L.layerGroup();
      const vgeoLayerGroup = L.layerGroup();

      snvGroupRef.current = snvLayerGroup;
      vgeoGroupRef.current = vgeoLayerGroup;

      snvLayerGroup.addTo(map);

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

    const map = mapRef.current!;
    const snvLayerGroup = snvGroupRef.current!;
    const vgeoLayerGroup = vgeoGroupRef.current!;

    function fitToVisibleLayers() {
      const bounds = L.latLngBounds([]);

      if (map.hasLayer(snvLayerGroup)) {
        try {
          const snvBounds = (snvLayerGroup as any).getBounds?.();
          if (snvBounds && snvBounds.isValid()) bounds.extend(snvBounds);
        } catch {
          /* ignore */
        }
      }

      if (map.hasLayer(vgeoLayerGroup)) {
        try {
          const vgeoBounds = (vgeoLayerGroup as any).getBounds?.();
          if (vgeoBounds && vgeoBounds.isValid()) bounds.extend(vgeoBounds);
        } catch {
          /* ignore */
        }
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }

    // limpa as camadas anteriores antes de recarregar
    snvLayerGroup.clearLayers();
    vgeoLayerGroup.clearLayers();

    setSnvStatus(null);
    setVgeoStatus(null);
    vgeoLoggedRef.current = false;

    // ===============================
    // SNV
    // ===============================
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
          return;
        }

        const snvData = onlyLineFeatures(geojsonData);

        const snvGeo = L.geoJSON(snvData as any, {
          style: LAYER_STYLES.snv as any,
          onEachFeature: (feature: any, layer: L.Layer) => {
            layer.on("click", () => {
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

              const htmlPopup = `
                <div style="font-size:13px; line-height:1.4;">
                  <b>SNV / DNIT 202501A</b><br/>
                  Rodovia: ${safe(brNumero)} / ${safe(uf)}<br/>
                  Código SNV: ${safe(codigoSNV)}<br/>
                  km inicial: ${safe(kmInicial)}<br/>
                  km final: ${safe(kmFinal)}<br/>
                  UL responsável: ${safe(ul)}<br/>
                  Jurisdição: ${safe(jurisdicao)}<br/>
                  Situação: ${safe(legenda)}<br/>
                  <hr style="border:none;border-top:1px solid #ccc;margin:6px 0;" />
                  <div style="font-size:11px; line-height:1.4; color:#555;">
                    Início: ${safe(latIni)}, ${safe(lonIni)}<br/>
                    Fim: ${safe(latFim)}, ${safe(lonFim)}
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

        fitToVisibleLayers();
      } catch (err) {
        console.error("💥 Erro inesperado carregando SNV:", err);
        setSnvStatus({
          type: "error",
          msg: `Falha ao carregar SNV para ${targetRodovia}.`,
        });
      }
    })();

    // ===============================
    // VGEO
    // ===============================
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

              // log de inspeção só na primeira vez
              if (!vgeoLoggedRef.current) {
                console.log("🔎 Propriedades VGeo recebidas:", p);
                vgeoLoggedRef.current = true;
              }

              // Tentativa de mapear campos comuns
              const rodoviaGuess =
                (p.vl_br ? `BR-${p.vl_br}` : null) ||
                p.RODOVIA ||
                p.rodovia ||
                p.SIGLA ||
                p.sigla ||
                p.br ||
                "—";

              const jurisdicaoGuess =
                p.ds_jurisdi ||
                p.JURISDICAO ||
                p.jurisdicao ||
                p.ADMIN ||
                p.admin ||
                "—";

              const ulGuess = p.ul || p.UL || p.ul_responsavel || "—";

              const extensaoGuess =
                p.vl_extensa ||
                p.EXTENSAO ||
                p.EXT_KM ||
                p.ext_km ||
                p.extensao ||
                "—";

              // Se tudo der "—", vamos montar uma listinha debug pro fiscal inspecionar
              const tudoVazio =
                safe(rodoviaGuess) === "—" &&
                safe(jurisdicaoGuess) === "—" &&
                safe(ulGuess) === "—" &&
                safe(extensaoGuess) === "—";

              let extraDebug = "";
              if (tudoVazio) {
                // mostra algumas chaves e valores crus pra ajudar você a identificar
                const previewPairs = Object.entries(p || {})
                  .slice(0, 6)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("<br/>");

                extraDebug = `
                  <hr style="border:none;border-top:1px solid #ccc;margin:6px 0;" />
                  <div style="font-size:11px; line-height:1.4; color:#555;">
                    <b>Debug (primeiros campos brutos):</b><br/>
                    ${previewPairs || "sem propriedades"}
                  </div>
                `;
              }

              const htmlPopup = `
                <div style="font-size:13px; line-height:1.4;">
                  <b>VGeo / Malha Federal MG</b><br/>
                  Rodovia: ${safe(rodoviaGuess)}<br/>
                  Jurisdição: ${safe(jurisdicaoGuess)}<br/>
                  UL responsável: ${safe(ulGuess)}<br/>
                  Extensão aprox (km): ${safe(extensaoGuess)}
                  ${extraDebug}
                </div>
              `;

              (layer as any).bindPopup(htmlPopup).openPopup();
            });
          },
        });

        vgeoGeo.addTo(vgeoLayerGroup);

        setVgeoStatus({
          type: "ok",
          msg: `VGeo carregado (${vgeoData.features.length} trechos).`,
        });

        fitToVisibleLayers();
      } catch (err) {
        console.error("💥 Erro inesperado carregando VGeo:", err);
        setVgeoStatus({
          type: "error",
          msg: `Falha ao carregar VGeo para ${targetRodovia}.`,
        });
      }
    })();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [targetRodovia]);

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
      if (type === "ok") return "#e8f5e9";
      if (type === "warn") return "#fffde7";
      return "#ffebee";
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
          pointerEvents: "none",
        }}
      >
        {snvStatus && (
          <div
            style={{
              ...baseBoxStyle,
              background: bgFor(snvStatus.type),
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
