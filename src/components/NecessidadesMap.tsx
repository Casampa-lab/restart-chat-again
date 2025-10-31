"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Filtro de features para evitar desenhar retângulos/bbox/etc
 * Aceita só LineString e MultiLineString com coordenadas válidas.
 * Assim a gente mata o retângulo fantasma sem precisar editar o .geojson.
 */
function onlyLineFeatures(fc: any) {
  if (!fc || !fc.features || !Array.isArray(fc.features)) return fc;

  const filtered = {
    type: "FeatureCollection",
    features: fc.features.filter((feat: any) => {
      if (!feat || !feat.geometry) return false;
      const g = feat.geometry;
      const t = g.type;

      // remove polígonos, multipolígonos e coleções genéricas
      if (
        t === "Polygon" ||
        t === "MultiPolygon" ||
        t === "GeometryCollection"
      ) {
        return false;
      }

      // só aceitamos linhas
      if (t !== "LineString" && t !== "MultiLineString") {
        return false;
      }

      // coordenadas mínimas
      if (!g.coordinates) return false;
      if (
        (t === "LineString" && g.coordinates.length < 2) ||
        (t === "MultiLineString" && g.coordinates.length === 0)
      ) {
        return false;
      }

      return true;
    }),
  };

  return filtered;
}

// helper p/ popup
function safe(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

const NecessidadesMap: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);
  // vamos guardar os layerGroups pra poder dar fitBounds com o conjunto visível
  const snvGroupRef = useRef<L.LayerGroup | null>(null);
  const vgeoGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // bloqueia execução no SSR / build
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // evita recriar se já existe
    if (mapRef.current) {
      return;
    }

    // ======================
    // 1. Inicializa mapa base
    // ======================
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

    // ======================
    // 2. LayerGroups vazios
    // ======================
    const snvLayerGroup = L.layerGroup();   // SNV DNIT BR/MG
    const vgeoLayerGroup = L.layerGroup();  // Malha Federal (VGeo MG)

    snvGroupRef.current = snvLayerGroup;
    vgeoGroupRef.current = vgeoLayerGroup;

    // SNV começa ligado
    snvLayerGroup.addTo(map);

    // controle de camadas
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

    // =========================================
    // função auxiliar para dar fitBounds geral
    // =========================================
    function fitToVisibleLayers() {
      const bounds = L.latLngBounds([]);

      if (map.hasLayer(snvLayerGroup)) {
        try {
          const snvBounds = (snvLayerGroup as any).getBounds?.();
          if (snvBounds && snvBounds.isValid()) bounds.extend(snvBounds);
        } catch (e) {
          /* ignore */
        }
      }

      if (map.hasLayer(vgeoLayerGroup)) {
        try {
          const vgeoBounds = (vgeoLayerGroup as any).getBounds?.();
          if (vgeoBounds && vgeoBounds.isValid()) bounds.extend(vgeoBounds);
        } catch (e) {
          /* ignore */
        }
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }

    // =========================================
    // 3. Carregar SNV (snv_br_mg_202501A.geojson)
    // Propriedades esperadas:
    // vl_br, sg_uf, vl_codigo, vl_km_inic, vl_km_fina,
    // ul, ds_jurisdi, ds_legenda, sg_legenda,
    // latitude_inicial, longitude_inicial, latitude_final, longitude_final
    // =========================================
    (async () => {
      try {
        const resp = await fetch("/geojson/snv_br_mg_202501A.geojson", {
          cache: "no-store",
        });

        if (!resp.ok) {
          console.error(
            "Falha ao carregar snv_br_mg_202501A.geojson:",
            resp.status,
            resp.statusText
          );
          return;
        }

        let snvData = await resp.json();
        snvData = onlyLineFeatures(snvData); // remove polígonos/bbox

        const snvGeo = L.geoJSON(snvData as any, {
          style: {
            color: "#d32f2f", // vermelho
            weight: 2,
          },
          onEachFeature: (feature: any, layer: L.Layer) => {
            layer.on("click", () => {
              const p = feature?.properties || {};

              const brNumero = p.vl_br ? `BR-${p.vl_br}` : "BR-—";
              const uf = p.sg_uf ?? "MG";

              const codigoSNV = p.vl_codigo;
              const kmInicial = p.vl_km_inic;
              const kmFinal = p.vl_km_fina;
              const ul = p.ul;
              const jurisdicao = p.ds_jurisdi; // << correto, com D
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

        // após carregar SNV, tenta ajustar o mapa
        fitToVisibleLayers();
      } catch (err) {
        console.error("Erro carregando SNV BR/MG:", err);
      }
    })();

    // =========================================
    // 4. Carregar VGeo (vgeo_mg_federal_2025.geojson)
    // Propriedades comuns: vl_br, ds_jurisdi, ul, vl_extensa etc
    // =========================================
    (async () => {
      try {
        const resp = await fetch("/geojson/vgeo_mg_federal_2025.geojson", {
          cache: "no-store",
        });

        if (!resp.ok) {
          console.warn(
            "vgeo_mg_federal_2025.geojson não encontrado (tudo bem se ainda não gerou)."
          );
          return;
        }

        let vgeoData = await resp.json();
        vgeoData = onlyLineFeatures(vgeoData); // remove bbox/retângulo

        const vgeoGeo = L.geoJSON(vgeoData as any, {
          style: {
            color: "#0066cc", // azul tracejado
            weight: 2,
            dashArray: "4 2",
          },
          onEachFeature: (feature: any, layer: L.Layer) => {
            layer.on("click", () => {
              const p = feature?.properties || {};

              const rodovia = p.vl_br
                ? `BR-${p.vl_br}`
                : p.RODOVIA || p.rodovia || p.SIGLA || "—";

              const jurisdicao =
                p.ds_jurisdi ||
                p.JURISDICAO ||
                p.ADMIN ||
                "—";

              const ul = p.ul || p.UL || "—";

              const extensaoKm =
                p.vl_extensa ||
                p.EXTENSAO ||
                p.EXT_KM ||
                "—";

              const htmlPopup = `
                <div style="font-size:13px; line-height:1.4;">
                  <b>VGeo / Malha Federal MG</b><br/>
                  Rodovia: ${safe(rodovia)}<br/>
                  Jurisdição: ${safe(jurisdicao)}<br/>
                  UL responsável: ${safe(ul)}<br/>
                  Extensão aprox (km): ${safe(extensaoKm)}
                </div>
              `;
              (layer as any).bindPopup(htmlPopup).openPopup();
            });
          },
        });

        vgeoGeo.addTo(vgeoLayerGroup);

        // tenta ajustar de novo incluindo VGeo
        fitToVisibleLayers();
      } catch (err) {
        console.error("Erro carregando VGeo MG:", err);
      }
    })();

    // cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
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
