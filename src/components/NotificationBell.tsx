import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { useNotificacoesCoordenador } from "@/hooks/useNotificacoesCoordenador";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { NotificationDrawer } from "./NotificationDrawer";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell() {
  const { user } = useAuth();
  const { naoLidas } = useNotificacoes();
  const coordenadorData = useNotificacoesCoordenador();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'coordenador'])
        .maybeSingle();
      
      setIsCoordinator(!!data);
    };
    
    checkRole();
  }, [user]);

  const badgeCount = isCoordinator 
    ? coordenadorData.totalPendencias 
    : naoLidas;
  
  return (
    <>
      <Button 
        variant="secondary" 
        size="lg" 
        className="relative font-semibold shadow-md hover:shadow-lg transition-shadow"
        onClick={() => setDrawerOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {badgeCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-6 min-w-[1.5rem] px-1.5 rounded-full flex items-center justify-center bg-red-500 text-white font-bold text-xs">
            {badgeCount}
          </Badge>
        )}
      </Button>

      <NotificationDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen}
        coordenadorData={isCoordinator ? coordenadorData : undefined}
      />
    </>
  );
}
