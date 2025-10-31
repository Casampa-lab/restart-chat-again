"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

const NecessidadesMap: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (mapRef.current) {
      return;
    }

    try {
      // === 1. Cria o mapa base ===
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

      // === 2. Prepara os grupos de camada ===
      const snvLayerGroup = L.layerGroup();
      const vgeoLayerGroup = L.layerGroup();

      // SNV começa ligado
      snvLayerGroup.addTo(map);

      // Controle de camadas
      const overlays: Record<string, L.Layer> = {
        "SNV DNIT 202501A (BRs federais/MG)": snvLayerGroup,
        "Malha Federal (VGeo MG)": vgeoLayerGroup,
      };

      L.control
        .layers({ "Mapa Base": baseTiles }, overlays, { collapsed: false })
        .addTo(map);

      // ========== 3. Helper seguro p/ popup ==========
      function safe(v: any) {
        if (v === null || v === undefined || v === "") return "—";
        return v;
      }

      // ========== 4. Função para filtrar SOMENTE linhas ==========
      function onlyLineFeatures(fc: any) {
        if (!fc || !fc.features || !Array.isArray(fc.features)) return fc;
        return {
          type: "FeatureCollection",
          features: fc.features.filter((feat: any) => {
            if (!feat || !feat.geometry) return false;
            const t = feat.geometry.type;
            if (t !== "LineString" && t !== "MultiLineString") {
              // joga fora Polygon, MultiPolygon, bbox etc
              return false;
            }
            // coord tem que existir e ter conteúdo
            const coords = feat.geometry.coordinates;
            if (!coords) return false;
            if (t === "LineString" && coords.length < 2) return false;
            if (t === "MultiLineString" && coords.length === 0) return false;
            return true;
          }),
        };
      }

      // ========== 5. Carregar SNV ==========
      (async () => {
        try {
        const { data, error } = await supabase.functions.invoke('download-vgeo-layer', {
  body: {
    codigo_rodovia: 'MG',
    layer_type: 'vgeo'
  }
});

if (error || !data) {
  console.warn("VGeo não disponível via edge function (ok se ainda não configurado).");
  return;
}

const vgeoData = onlyLineFeatures(data);


          if (!resp.ok) {
            console.error(
              "Falha ao carregar snv_br_mg_202501A.geojson:",
              resp.status,
              resp.statusText
            );
            return;
          }

          const rawData = await resp.json();
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

          // IMPORTANTE: NÃO vamos dar fitBounds automático,
          // porque se o bounds estiver vindo "zoado", ele desenha o retângulo.
          // // try {
          // //   map.fitBounds(snvGeo.getBounds(), { padding: [20, 20] });
          // // } catch (fitErr) {
          // //   console.warn("Não consegui dar fitBounds no SNV:", fitErr);
          // // }
        } catch (err) {
          console.error("Erro carregando SNV BR/MG:", err);
        }
      })();

      // ========== 6. Carregar VGeo ==========
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

          const rawData = await resp.json();
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
        } catch (err) {
          console.error("Erro carregando VGeo MG:", err);
        }
      })();

      // ========== 7. Mata retângulos que alguém tente adicionar ==========
      // Se em algum lugar alguém estiver criando L.rectangle(bounds),
      // vamos interceptar depois que qualquer layer entrar no mapa.
      // Ideia: ouvir 'layeradd' e, se for um Rectangle, remover.
      map.on("layeradd", (e: any) => {
        // e.layer pode ser qualquer coisa: TileLayer, Polyline, Rectangle, etc.
        // Rectangle em Leaflet é uma subclasse de Polygon com opção 'bounding box'.
        // A gente detecta por getBounds + getLatLngs formato retângulo.
        if (e.layer instanceof L.Rectangle) {
          console.warn("[DEBUG] Removendo Rectangle fantasma (bbox).");
          map.removeLayer(e.layer);
        } else if (e.layer instanceof L.Polygon && !(e.layer instanceof L.Polyline)) {
          // Isso pega polígonos não-lineares.
          // Se for aquele quadrado azul/vermelho, cai aqui.
          const latlngs = (e.layer as any).getLatLngs?.();
          if (latlngs) {
            // heurística: se tiver 1 anel fechado com 4/5 pontos = bbox típico
            const ring =
              Array.isArray(latlngs) && latlngs.length === 1 && Array.isArray(latlngs[0])
                ? latlngs[0]
                : null;

            if (ring && ring.length <= 6) {
              console.warn("[DEBUG] Removendo Polygon suspeito (provável bbox).");
              map.removeLayer(e.layer);
            }
          }
        }
      });

      // ========== 8. Cleanup no unmount ==========
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
