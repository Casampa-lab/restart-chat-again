import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, CheckCircle2, Share2, PlusSquare, Home } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InstalarPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detecção robusta de iOS/iPadOS (funciona com iPad antigo e novo)
    const iOS = 
      // Método 1: User Agent tradicional (iPad antigo, iPhone, iPod)
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // Método 2: iPad moderno (iPadOS 13+) - identifica-se como Mac mas tem touch
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      // Método 3: Detecção explícita de iPadOS
      (/Mac/.test(navigator.userAgent) && 'ontouchend' in document);
    
    setIsIOS(iOS);

    // Detectar se já está instalado
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Listener para prompt de instalação (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar após instalação
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-green-900">App Já Instalado!</CardTitle>
                <CardDescription className="text-green-700">
                  Você está usando o OperaVia como aplicativo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-800">
              O OperaVia está instalado e funcionando em modo app. 
              Você pode acessá-lo a qualquer momento pela tela inicial do seu dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <img src="/apple-touch-icon.png" alt="OperaVia" className="h-20 w-20 rounded-2xl shadow-lg" />
        </div>
        <h1 className="text-3xl font-bold">Instalar OperaVia</h1>
        <p className="text-muted-foreground">
          Use o sistema como um aplicativo nativo no seu dispositivo
        </p>
      </div>

      {/* Benefícios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Por que instalar?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "📱 Acesso rápido pela tela inicial",
            "📸 Uso completo da câmera para fotos de campo",
            "📍 Acesso ao GPS para localização precisa",
            "⚡ Funciona offline após o primeiro carregamento",
            "🚀 Carregamento mais rápido",
            "🎯 Tela cheia sem barras do navegador"
          ].map((benefit, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Instruções iOS/iPadOS */}
      {isIOS && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <img src="/apple-touch-icon.png" alt="iOS" className="h-6 w-6" />
              Instruções para iPad/iPhone
            </CardTitle>
            <CardDescription className="text-blue-700">
              Siga os passos abaixo no Safari
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge className="bg-blue-600 text-white shrink-0">1</Badge>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Abra no Safari</p>
                  <p className="text-sm text-blue-800">
                    Certifique-se de estar usando o navegador Safari
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="bg-blue-600 text-white shrink-0">2</Badge>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 flex items-center gap-2">
                    Toque em <Share2 className="h-4 w-4 inline" /> Compartilhar
                  </p>
                  <p className="text-sm text-blue-800">
                    Ícone de quadrado com seta para cima (na barra inferior)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="bg-blue-600 text-white shrink-0">3</Badge>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 flex items-center gap-2">
                    Selecione <PlusSquare className="h-4 w-4 inline" /> "Adicionar à Tela de Início"
                  </p>
                  <p className="text-sm text-blue-800">
                    Role o menu até encontrar esta opção
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="bg-blue-600 text-white shrink-0">4</Badge>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Confirme a instalação</p>
                  <p className="text-sm text-blue-800">
                    Toque em "Adicionar" no canto superior direito
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="bg-green-600 text-white shrink-0">✓</Badge>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 flex items-center gap-2">
                    <Home className="h-4 w-4 inline" /> Pronto!
                  </p>
                  <p className="text-sm text-blue-800">
                    O ícone do OperaVia aparecerá na sua tela inicial
                  </p>
                </div>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-900 text-sm">
                <strong>Importante:</strong> Esta funcionalidade só está disponível no Safari. 
                Se estiver usando outro navegador (Chrome, Firefox), abra este link no Safari.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Botão instalação Android/Desktop */}
      {!isIOS && deferredPrompt && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <Button 
              onClick={handleInstallClick}
              size="lg"
              className="w-full"
            >
              <Download className="mr-2 h-5 w-5" />
              Instalar Aplicativo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instruções Android/Desktop */}
      {!isIOS && !deferredPrompt && (
        <Card>
          <CardHeader>
            <CardTitle>Instalação no Android/Desktop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No Chrome/Edge, toque no menu (⋮) e selecione "Instalar aplicativo" ou 
              "Adicionar à tela inicial"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmação de instalação */}
      {isInstalled && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Instalado com sucesso!</strong> O OperaVia agora está disponível na sua tela inicial.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}