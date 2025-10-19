import { useNotificacoes } from "@/hooks/useNotificacoes";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCheck, X } from "lucide-react";

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordenadorData?: {
    totalPendencias: number;
    notificacoesNaoLidas: number;
    elementosPendentes: number;
    divergenciasPendentes: number;
    intervencoesPendentes: number;
  };
}

export function NotificationDrawer({ open, onOpenChange, coordenadorData }: NotificationDrawerProps) {
  const { notificacoes, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();
  const navigate = useNavigate();

  const handleNotificacaoClick = (notif: any) => {
    marcarComoLida(notif.id);
    onOpenChange(false);
    
    // Navegar para a página apropriada
    if (notif.nc_id) {
      navigate("/minhas-ncs");
    } else if (notif.elemento_pendente_id) {
      navigate("/meus-elementos-pendentes");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Notificações</DrawerTitle>
              <DrawerDescription>
                {notificacoes.length === 0 
                  ? "Nenhuma notificação" 
                  : `${notificacoes.filter(n => !n.lida).length} não lidas`}
              </DrawerDescription>
            </div>
            {notificacoes.some(n => !n.lida) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => marcarTodasComoLidas()}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </DrawerHeader>

        {coordenadorData && (
          <div className="mx-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-lg mb-3 text-blue-900 dark:text-blue-100">📊 Tarefas Pendentes</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <span className="text-sm">📢 Notificações não lidas</span>
                <Badge variant="secondary">{coordenadorData.notificacoesNaoLidas}</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <span className="text-sm">📋 Elementos não cadastrados</span>
                <Badge variant="secondary">{coordenadorData.elementosPendentes}</Badge>
              </div>
              <div 
                className="flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors cursor-pointer"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/reconciliacao-pendente');
                }}
              >
                <span className="text-sm font-semibold">🔄 Divergências a reconciliar</span>
                <Badge variant="destructive" className="text-base font-bold">
                  {coordenadorData.divergenciasPendentes}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <span className="text-sm">✅ Intervenções para aprovar</span>
                <Badge variant="secondary">{coordenadorData.intervencoesPendentes}</Badge>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[60vh] px-4">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma notificação no momento</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {notificacoes.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    notif.lida 
                      ? "bg-background hover:bg-accent/10" 
                      : "bg-accent/20 hover:bg-accent/30 border-accent"
                  }`}
                  onClick={() => handleNotificacaoClick(notif)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{notif.titulo}</h4>
                        {!notif.lida && (
                          <Badge variant="destructive" className="h-5 px-2 text-xs">
                            Nova
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notif.mensagem}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarComoLida(notif.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
