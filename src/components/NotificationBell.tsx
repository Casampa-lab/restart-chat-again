import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { useState } from "react";
import { NotificationDrawer } from "./NotificationDrawer";

export function NotificationBell() {
  const { naoLidas } = useNotificacoes();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  return (
    <>
      <Button 
        variant="secondary" 
        size="lg" 
        className="relative font-semibold shadow-md hover:shadow-lg transition-shadow"
        onClick={() => setDrawerOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <Badge className="absolute -top-2 -right-2 h-6 min-w-[1.5rem] px-1.5 rounded-full flex items-center justify-center bg-red-500 text-white font-bold text-xs">
            {naoLidas}
          </Badge>
        )}
      </Button>

      <NotificationDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
