import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContadoresBadgesProps {
  cadastroInicialAtivo: number;
  criadosNecessidadeAtivo: number;
  totalAtivo: number;
  totalInativo: number;
  marcoZeroExiste: boolean;
  loading?: boolean;
  onRefresh?: () => void;
}

export function ContadoresBadges({
  cadastroInicialAtivo,
  criadosNecessidadeAtivo,
  totalAtivo,
  totalInativo,
  marcoZeroExiste,
  loading = false,
  onRefresh,
}: ContadoresBadgesProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Modo pré-Marco Zero: 3 badges */}
      {!marcoZeroExiste && (
        <>
          <Badge className="bg-blue-500 text-white px-3 py-1 hover:bg-blue-600">
            🔵 Cadastro Inicial: {cadastroInicialAtivo}
          </Badge>
          <Badge className="bg-purple-500 text-white px-3 py-1 hover:bg-purple-600">
            🟣 Criados: {criadosNecessidadeAtivo}
          </Badge>
          <Badge className="bg-green-500 text-white px-3 py-1 hover:bg-green-600">
            ✅ Total Ativo: {totalAtivo}
          </Badge>
        </>
      )}

      {/* Modo pós-Marco Zero: 1 badge */}
      {marcoZeroExiste && (
        <Badge className="bg-cyan-500 text-white px-3 py-1 text-base font-bold hover:bg-cyan-600">
          🔷 Total Ativo: {totalAtivo}
        </Badge>
      )}

      {/* Badge de inativos (sempre visível quando há inativos) */}
      {totalInativo > 0 && (
        <Badge className="bg-gray-400 text-white px-3 py-1 hover:bg-gray-500">
          ⚫ Inativos: {totalInativo}
        </Badge>
      )}

      {/* Botão de refresh */}
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}
