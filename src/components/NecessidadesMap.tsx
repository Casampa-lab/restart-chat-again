"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NecessidadesMap: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // não roda no SSR
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // evita recriar mapa se já existe
    if (mapRef.current) {
      return;
    }

    try {
      // === 1. Inicializa mapa base ===
      const map = L.map("necessidades-map", {
        center: [-18.5, -44.0], // MG aproximado
        zoom: 6,
        minZoom: 5,
        maxZoom: 18,
      });
      mapRef.current = map;

      // fundo claro
      const baseTiles = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
            'contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      // grupos de camada
      const snvLayerGroup = L.layerGroup();   // SNV DNIT BRs/MG
      const vgeoLayerGroup = L.layerGroup();  // Malha Federal (VGeo MG)

      // SNV começa visível
      snvLayerGroup.addTo(map);

      // controle para ligar/desligar
      const overlays: Record<string, L.Layer> = {
        "SNV DNIT 202501A (BRs federais/MG)": snvLayerGroup,
        "Malha Federal (VGeo MG)": vgeoLayerGroup,
      };

      L.control
        .layers(
          { "Mapa Base": baseTiles },
          overlays,
          { collapsed: false }
        )
        .addTo(map);

      // helper pra evitar "undefined" no popup
      function safe(v: any) {
        if (v === null || v === undefined || v === "") return "—";
        return v;
      }

      // 🔎 helper que filtra só geometria de linha
      function onlyLineFeatures(fc: any) {
        if (!fc || !fc.features || !Array.isArray(fc.features)) return fc;
        const filtered = {
          type: "FeatureCollection",
          features: fc.features.filter((feat: any) => {
            if (!feat || !feat.geometry) return false;

            const g = feat.geometry;
            const t = g.type;

            // a gente quer só linha (rodovia)
            if (t !== "LineString" && t !== "MultiLineString") {
              return false;
            }

            // coordinates precisam existir
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

      // ==========================================================
      // 3. Carregar SNV (snv_br_mg_202501A.geojson)
      // Campos esperados em feature.properties:
      // vl_br, sg_uf, vl_codigo, vl_km_inic, vl_km_fina,
      // ul, ds_jurisdi, ds_legenda, sg_legenda,
      // latitude_inicial, longitude_inicial, latitude_final, longitude_final
      // ==========================================================
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

          // lê json bruto
          const rawData = await resp.json();
          // remove polígonos/retângulos/bbox e lixo
          const snvData = onlyLineFeatures(rawData);

          const snvGeo = L.geoJSON(snvData as any, {
            style: {
              color: "#d32f2f",
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

          // tenta enquadrar no conteúdo limpinho (sem bbox fake)
          try {
            map.fitBounds(snvGeo.getBounds(), { padding: [20, 20] });
          } catch (fitErr) {
            console.warn("Não consegui dar fitBounds no SNV:", fitErr);
          }
        } catch (err) {
          console.error("Erro carregando SNV BR/MG:", err);
        }
      })();

      // ==========================================================
      // 4. Carregar VGeo (vgeo_mg_federal_2025.geojson)
      // Campos esperados em properties (o que existir):
      // vl_br, ds_jurisdi, ul, vl_extensa, ...
      // ==========================================================
      (async () => {
        try {
          const resp = await fetch("/geojson/vgeo_mg_federal_2025.geojson", {
            cache: "no-store",
          });

          if (!resp.ok) {
            console.warn(
              "vgeo_mg_federal_2025.geojson não encontrado (ok se ainda não gerou)."
            );
            return;
          }

          // lê json bruto
          const rawData = await resp.json();
          // remove polígonos/bbox
          const vgeoData = onlyLineFeatures(rawData);

          const vgeoGeo = L.geoJSON(vgeoData as any, {
            style: {
              color: "#0066cc",
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
                    Jurisdição: ${safe(juriscricao)}<br/>
                    UL responsável: ${safe(ul)}<br/>
                    Extensão aprox (km): ${safe(extensaoKm)}
                  </div>
                `;
                (layer as any).bindPopup(htmlPopup).openPopup();
              });
            },
          });

          vgeoGeo.addTo(vgeoLayerGroup);
        } catch (err) {
          console.error("Erro carregando VGeo MG:", err);
        }
      })();

      // cleanup ao desmontar
      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (outerErr) {
      console.error("Falha inicializando o mapa Leaflet:", outerErr);
    }
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
