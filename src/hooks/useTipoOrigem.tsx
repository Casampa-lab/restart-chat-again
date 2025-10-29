import { useState } from "react";
import { CAMPOS_ESTRUTURAIS, TipoElemento, TIPOS_ORIGEM } from "@/constants/camposEstruturais";

export function useTipoOrigem(tipoElemento: TipoElemento) {
  const [tipoOrigem, setTipoOrigem] = useState<string>(TIPOS_ORIGEM.EXECUCAO);

  // tira limite de esição de campos em manutenção e intervenção
  const isCampoEstruturalBloqueado = (nomeCampo: string): boolean => {
    return false; // 🔓 LIBERA TUDO
  };

  //define campos estruturais e bloqueia edição
  //  const isCampoEstruturalBloqueado = (nomeCampo: string): boolean => {
  //    if (tipoOrigem !== TIPOS_ORIGEM.MANUTENCAO_ROTINEIRA) {
  //      return false;
  //    }
  //
  //    const camposEstruturais = CAMPOS_ESTRUTURAIS[tipoElemento] || [];
  //   return (camposEstruturais as readonly string[]).includes(nomeCampo);
  // };

  return {
    tipoOrigem,
    setTipoOrigem,
    isCampoEstruturalBloqueado,
    isManutencaoRotineira: tipoOrigem === TIPOS_ORIGEM.MANUTENCAO_ROTINEIRA,
  };
}
