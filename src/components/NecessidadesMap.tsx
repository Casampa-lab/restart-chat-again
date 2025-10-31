"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

// Filtra apenas LineString / MultiLineString válidas.
// Remove Polygon, MultiPolygon, Point etc. para evitar caixas gigantes.
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

// Evita "undefined", "null" etc no HTML do popup
function safe(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

// Estilos centralizados para manter consistência visual
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
  // refs Leaflet (não disparam render React)
  const mapRef = useRef<L.Map | null>(null);
  const snvGroupRef = useRef<L.LayerGroup | null>(null);
  const vgeoGroupRef = useRef<L.LayerGroup | null>(null);

  // Status visível na tela (barrinhas SNV / VGeo canto superior esquerdo do mapa)
  const [snvStatus, setSnvStatus] = useState<{
    type: "ok" | "warn" | "error";
    msg: string;
  } | null>(null);

  const [vgeoStatus, setVgeoStatus] = useState<{
    type: "ok" | "warn" | "error";
    msg: string;
  } | null>(null);

  // Define qual rodovia consultar. Se nada vier por props, fallback BR-040.
  const targetRodovia =
    rodovia?.codigo?.trim() || rodoviaId?.trim() || "BR-040";

  useEffect(() => {
    // Segurança contra SSR
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // Criar o mapa apenas uma vez
    if (!mapRef.current) {
      const map = L.map("necessidades-map", {
        center: [-18.5, -44.0], // centro aproximado MG
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

      // LayerGroups vazios
      const snvLayerGroup = L.layerGroup();
      const vgeoLayerGroup = L.layerGroup();

      snvGroupRef.current = snvLayerGroup;
      vgeoGroupRef.current = vgeoLayerGroup;

      // SNV começa ligado
      snvLayerGroup.addTo(map);

      // Controle de camadas (checkbox)
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

    // A partir daqui o mapa e os grupos já existem
    const map = mapRef.current!;
    const snvLayerGroup = snvGroupRef.current!;
    const vgeoLayerGroup = vgeoGroupRef.current!;

    // Ajusta o enquadramento com base nas camadas visíveis
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

    // Antes de recarregar a BR alvo, limpamos camadas antigas
    snvLayerGroup.clearLayers();
    vgeoLayerGroup.clearLayers();

    // Limpa status antigo
    setSnvStatus(null);
    setVgeoStatus(null);

    // ===============================
    // 1) Carregar SNV
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
          // Não faz return aqui: deixa continuar o VGeo normalmente
        } else {
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
        }

        // fit depois de tentar SNV também (caso VGeo não venha)
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
    // 2) Carregar VGeo
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

              // Mapeamento com base no dump real que você me mandou:
              // codigo_rod: "267"
              // unidade_fe: "MG"
              // jurisdicao: "Estadual"
              // extensao: 17.3
              // local_inic: "ENTR BR383(B)"
              // local_fim: "ACESSO CONCEI"
              // tipo_trecho: "Eixo Principal"
              const rodovia = p.codigo_rod
                ? `BR-${p.codigo_rod}/${p.unidade_fe || ""}`.trim()
                : "—";

              const jurisdicao = p.jurisdicao || "—";
              const extensaoKm = p.extensao || "—";
              const localIni = p.local_inic || "—";
              const localFim = p.local_fim || "—";
              const tipoTrecho = p.tipo_trecho || "—";

              const htmlPopup = `
                <div style="font-size:13px; line-height:1.4;">
                  <b>VGeo / Malha Federal MG</b><br/>
                  Rodovia: ${safe(rodovia)}<br/>
                  Jurisdição: ${safe(jurisdicao)}<br/>
                  Tipo de Trecho: ${safe(tipoTrecho)}<br/>
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

        // Ajuste final de enquadramento considerando agora também o VGeo
        fitToVisibleLayers();
      } catch (err) {
        console.error("💥 Erro inesperado carregando VGeo:", err);
        setVgeoStatus({
          type: "error",
          msg: `Falha ao carregar VGeo para ${targetRodovia}.`,
        });
      }
    })();

    // limpar no unmount total do componente
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [targetRodovia]); // recarrega se mudar BR

  // Overlay de status (SNV / VGeo) no canto do mapa
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
      if (type === "ok") return "#e8f5e9"; // verde leve
      if (type === "warn") return "#fffde7"; // amarelo leve
      return "#ffebee"; // vermelho leve
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
          pointerEvents: "none", // não rouba o clique do mapa
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
