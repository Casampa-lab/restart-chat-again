"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NecessidadesMap: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // evita recriar em hot reload
    if (mapRef.current) {
      return;
    }

    try {
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

      // grupos de camadas
      const snvLayerGroup = L.layerGroup();
      const vgeoLayerGroup = L.layerGroup();

      // SNV começa ligado
      snvLayerGroup.addTo(map);

      // controle de layers
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

      // util: não imprimir undefined
      function safe(v: any) {
        if (v === null || v === undefined || v === "") return "—";
        return v;
      }

      // -------------------------------------------------
      // Função auxiliar 1:
      // normaliza coords como lista de LineString(s)
      // -------------------------------------------------
      function getLineSegments(geometry: any): number[][][] {
        if (!geometry) return [];

        if (geometry.type === "LineString") {
          // vira lista de 1 segmento
          return [geometry.coordinates];
        }

        if (geometry.type === "MultiLineString") {
          // já é lista de segmentos
          return geometry.coordinates;
        }

        // outros tipos descartados
        return [];
      }

      // -------------------------------------------------
      // Função auxiliar 2:
      // checa se um array de [lon,lat] parece ser "caixa"
      // (quatro cantos retos formando bounding box)
      //
      // Heurística:
      // - precisa ter pelo menos 4 pontos
      // - pega min/max lon/lat
      // - conta quantos pontos batem exatamente nesses extremos
      // - se muitos pontos estão exatamente nesses retângulos alinhados,
      //   e a forma é "retinha", tratamos como lixo.
      // -------------------------------------------------
      function isBoundingBoxLike(coords: number[][]): boolean {
        if (!coords || coords.length < 4) return false;

        // pega apenas valores únicos aproximados
        const lats = coords.map(c => c[1]);
        const lons = coords.map(c => c[0]);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        // largura / altura em graus
        const widthDeg = maxLon - minLon;
        const heightDeg = maxLat - minLat;

        // se for MUITO grande (cobre meio país), provavelmente é bbox
        // regra: largura > 1 grau OU altura > 1 grau já é bem suspeito
        if (widthDeg > 1 || heightDeg > 1) {
          // agora verifica se praticamente todos os pontos
          // estão só em linhas retas desses limites
          const alignedPoints = coords.filter(([lon, lat]) => {
            const onVertical =
              Math.abs(lon - minLon) < 1e-9 || Math.abs(lon - maxLon) < 1e-9;
            const onHorizontal =
              Math.abs(lat - minLat) < 1e-9 || Math.abs(lat - maxLat) < 1e-9;
            return onVertical || onHorizontal;
          });

          // se 90% dos pontos estão nas bordas -> é retângulo
          if (alignedPoints.length / coords.length > 0.9) {
            return true;
          }
        }

        return false;
      }

      // -------------------------------------------------
      // Função auxiliar 3:
      // valida se coordenadas estão dentro do Brasil aprox
      // e descarta segmentos curtos/deterministicamente ruins
      // -------------------------------------------------
      function segmentoEhValido(coords: number[][]): boolean {
        if (!coords || coords.length < 3) {
          // menos de 3 vértices => não é trecho rodoviário real
          return false;
        }

        // bounding box aproximada Brasil
        const dentroBrasil = coords.some(([lon, lat]) => {
          return lat >= -35 && lat <= 6 && lon >= -75 && lon <= -30;
        });
        if (!dentroBrasil) return false;

        // descarta segmentos que parecem bounding box
        if (isBoundingBoxLike(coords)) return false;

        return true;
      }

      // -------------------------------------------------
      // Função principal de limpeza do GeoJSON
      // Mantém só LineString/MultiLineString "legítimos"
      // -------------------------------------------------
      function limparGeoJSON(data: any) {
        const saidaFeatures: any[] = [];

        for (const f of data.features || []) {
          const segs = getLineSegments(f.geometry);
          if (!segs.length) continue;

          // mantém apenas os segmentos válidos
          const segsValidos = segs.filter(segmentoEhValido);

          if (!segsValidos.length) {
            continue;
          }

          // se sobrou só 1 segmento válido => LineString
          if (segsValidos.length === 1) {
            saidaFeatures.push({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: segsValidos[0],
              },
              properties: f.properties || {},
            });
          } else {
            // se sobrou mais de 1 => MultiLineString
            saidaFeatures.push({
              type: "Feature",
              geometry: {
                type: "MultiLineString",
                coordinates: segsValidos,
              },
              properties: f.properties || {},
            });
          }
        }

        return {
          type: "FeatureCollection",
          features: saidaFeatures,
        };
      }

      // -------------------------------------------------
      // Função segura pra dar fitBounds
      // - só tenta se realmente tem bounds "com área"
      // -------------------------------------------------
      function tentarFitBounds(layerGroup: L.LayerGroup) {
        try {
          const bounds = (layerGroup as any).getBounds?.();
          if (!bounds) return;

          // bounds é válido se SW != NE
          const sw = bounds.getSouthWest?.();
          const ne = bounds.getNorthEast?.();

          if (!sw || !ne) return;

          const latDiff = Math.abs(ne.lat - sw.lat);
          const lonDiff = Math.abs(ne.lng - sw.lng);

          // se é minúsculo demais, ignora (pode ser lixo)
          // se é gigante demais (mais de ~40 graus), ignora
          if (
            latDiff < 0.01 ||
            lonDiff < 0.01 ||
            latDiff > 40 ||
            lonDiff > 40
          ) {
            return;
          }

          map.fitBounds(bounds, { padding: [20, 20] });
        } catch (err) {
          console.warn("fitBounds falhou:", err);
        }
      }

      // ==========================
      // 2. Carregar camada SNV
      // ==========================
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

          const bruto = await resp.json();
          const limpo = limparGeoJSON(bruto);

          const snvGeo = L.geoJSON(limpo as any, {
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
                const ulResp = p.ul;
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
                    UL responsável: ${safe(ulResp)}<br/>
                    Jurisdição: ${safe(juriscricao)}<br/>
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

          // tenta focar nessa camada
          tentarFitBounds(snvLayerGroup);
        } catch (err) {
          console.error("Erro carregando SNV BR/MG:", err);
        }
      })();

      // ==========================
      // 3. Carregar camada VGeo
      // ==========================
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

          const bruto = await resp.json();
          const limpo = limparGeoJSON(bruto);

          const vgeoGeo = L.geoJSON(limpo as any, {
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

                const ulResp = p.ul || p.UL || "—";

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
                    UL responsável: ${safe(ulResp)}<br/>
                    Extensão aprox (km): ${safe(extensaoKm)}
                  </div>
                `;
                (layer as any).bindPopup(htmlPopup).openPopup();
              });
            },
          });

          vgeoGeo.addTo(vgeoLayerGroup);

          // se SNV não deu bounds válidos (por ex, não carregou),
          // tenta enquadrar pelo VGeo
          tentarFitBounds(vgeoLayerGroup);
        } catch (err) {
          console.error("Erro carregando VGeo MG:", err);
        }
      })();

      // desmontagem
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
