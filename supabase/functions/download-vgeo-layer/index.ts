import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizarRodovia(raw: string): string {
  if (!raw) return raw;

  let v = raw.trim();

  // Ex.: "BR-267" -> "267"
  if (v.toUpperCase().startsWith("BR-")) {
    v = v.substring(3);
  }

  // Ex.: "267/MG" -> "267"
  if (v.includes("/")) {
    v = v.split("/")[0];
  }

  // Ex.: "BR-040/MG" -> "040" -> remove zeros à esquerda se quiser
  v = v.replace(/[^0-9]/g, ""); // deixa só dígitos

  return v;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo_rodovia, layer_type = "vgeo" } = await req.json();

    if (!codigo_rodovia) {
      throw new Error("codigo_rodovia é obrigatório");
    }

    // Normaliza a rodovia para consulta (ex.: "BR-267/MG" -> "267")
    const rodoviaNorm = normalizarRodovia(codigo_rodovia);

    // Configurações por tipo de layer
    // OBS: adicionamos 'codigo_rod' também no SNV, porque alguns serviços usam o mesmo campo
    const layerConfigs: Record<
      string,
      Array<{ layerId: number; field: string }>
    > = {
      vgeo: [
        // VGeo já estava usando layer 16, campo codigo_rod
        { layerId: 16, field: "codigo_rod" },
      ],
      snv: [
        // vamos tentar várias combinações possíveis
        { layerId: 14, field: "vl_br" },
        { layerId: 14, field: "codigo_snv" },
        { layerId: 15, field: "vl_br" },
        { layerId: 13, field: "vl_br" },
        { layerId: 16, field: "vl_br" },
        { layerId: 16, field: "codigo_rod" }, // <-- NOVO fallback
      ],
    };

    const configs =
      layerConfigs[layer_type as keyof typeof layerConfigs] ||
      layerConfigs.vgeo;

    console.log(
      `[download-vgeo-layer] Tipo=${layer_type} pedido=${codigo_rodovia} normalizado=${rodoviaNorm}`,
    );

    for (const config of configs) {
      console.log(
        `[download-vgeo-layer] Tentando layer=${config.layerId} campo=${config.field}`,
      );

      const baseUrl =
        `https://geo.ambientare.com.br/server/rest/services/0_DADOS_REFERENCIAIS/DADOS_REFERENCIAIS_INFRAESTRUTURA/MapServer/${config.layerId}/query`;

      // WHERE:
      // Se vier "UF_MG" algum dia, mantemos tua lógica original
      const whereClause = codigo_rodovia.startsWith("UF_")
        ? `uf='${codigo_rodovia.replace("UF_", "")}'`
        : `${config.field}='${rodoviaNorm}'`;

      const params = new URLSearchParams({
        where: whereClause,
        outFields: "*",
        f: "geojson",
        returnGeometry: "true",
      });

      const url = `${baseUrl}?${params.toString()}`;

      console.log(
        `[download-vgeo-layer] URL: ${url.substring(0, 200)} ...`,
      );

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Lovable-VGeo-Downloader/1.1",
        },
      });

      if (!response.ok) {
        console.warn(
          `[download-vgeo-layer] Layer ${config.layerId} HTTP ${response.status}, tentando próximo...`,
        );
        continue;
      }

      const geojson = await response.json();

      if (
        geojson.features &&
        Array.isArray(geojson.features) &&
        geojson.features.length > 0
      ) {
        console.log(
          `[download-vgeo-layer] ✅ Sucesso no layer ${config.layerId} com campo ${config.field}: ${geojson.features.length} features`,
        );

        return new Response(
          JSON.stringify({
            success: true,
            geojson,
            features_count: geojson.features.length,
            layer_info: {
              layerId: config.layerId,
              field: config.field,
              whereClause,
            },
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
            status: 200,
          },
        );
      } else {
        console.warn(
          `[download-vgeo-layer] Layer ${config.layerId} retornou 0 features (where ${whereClause}). Próximo...`,
        );
      }
    }

    // Nenhuma configuração retornou nada
    console.error(
      `[download-vgeo-layer] ❌ Nenhum dado encontrado para rodovia=${codigo_rodovia} (normalizada=${rodoviaNorm}) tipo=${layer_type}`,
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: `Nenhum dado encontrado para ${codigo_rodovia} (${rodoviaNorm}) no tipo ${layer_type}`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 404,
      },
    );
  } catch (err) {
    console.error("[download-vgeo-layer] Erro geral:", err);

    const msg =
      err instanceof Error ? err.message : "Erro desconhecido na função";

    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});
