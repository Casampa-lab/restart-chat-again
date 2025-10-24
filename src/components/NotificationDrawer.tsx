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
}

export function NotificationDrawer({ open, onOpenChange }: NotificationDrawerProps) {
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
    } else if (notif.tipo === 'retrorrefletividade_pendente') {
      navigate("/validacao-retrorrefletividades");
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
