import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSession } from '@/hooks/useWorkSession';
import { Card, CardContent } from '@/components/ui/card';
import NaoConformidadeSimples from '@/components/NaoConformidadeSimples';

export default function RegistrarNC() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Button variant="navigation" onClick={() => navigate('/modo-campo')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Você precisa ter uma sessão ativa para registrar NCs.
              </p>
              <Button onClick={() => navigate('/modo-campo')}>
                Voltar ao Modo Campo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/minhas-ncs')}
            className="h-12 w-12"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Registrar NC</h1>
            <p className="text-sm text-muted-foreground">
              Não Conformidade - {activeSession.lote?.numero} • {activeSession.rodovia?.codigo}
            </p>
          </div>
        </div>

        {/* Formulário */}
        <NaoConformidadeSimples 
          loteId={activeSession.lote_id}
          rodoviaId={activeSession.rodovia_id}
        />
      </div>
    </div>
  );
}
