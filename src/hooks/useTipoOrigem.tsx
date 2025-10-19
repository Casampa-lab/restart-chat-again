import { useState } from 'react';
import { CAMPOS_ESTRUTURAIS, TipoElemento, TIPOS_ORIGEM } from '@/constants/camposEstruturais';

export function useTipoOrigem(tipoElemento: TipoElemento) {
  const [tipoOrigem, setTipoOrigem] = useState<string>(TIPOS_ORIGEM.EXECUCAO);

  const isCampoEstruturalBloqueado = (nomeCampo: string): boolean => {
    if (tipoOrigem !== TIPOS_ORIGEM.MANUTENCAO_PRE_PROJETO) {
      return false;
    }

    const camposEstruturais = CAMPOS_ESTRUTURAIS[tipoElemento] || [];
    return (camposEstruturais as readonly string[]).includes(nomeCampo);
  };

  return {
    tipoOrigem,
    setTipoOrigem,
    isCampoEstruturalBloqueado,
    isManutencaoPreProjeto: tipoOrigem === TIPOS_ORIGEM.MANUTENCAO_PRE_PROJETO,
  };
}
