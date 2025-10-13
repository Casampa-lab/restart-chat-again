import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import CoordenacaoFiscalizacao from "./pages/CoordenacaoFiscalizacao";
import MinhasNCs from "./pages/MinhasNCs";
import NCsCoordenador from "./pages/NCsCoordenador";
import MinhasFrentesLiberadas from "./pages/MinhasFrentesLiberadas";
import MinhasRetrorrefletividades from "./pages/MinhasRetrorrefletividades";
import MinhasDefensas from "./pages/MinhasDefensas";
import MinhasIntervencoesSH from "./pages/MinhasIntervencoesSH";
import MinhasIntervencoesInscricoes from "./pages/MinhasIntervencoesInscricoes";
import MinhasIntervencoesSV from "./pages/MinhasIntervencoesSV";
import MinhasIntervencoesTacha from "./pages/MinhasIntervencoesTacha";
import MinhasIntervencoes from "./pages/MinhasIntervencoes";
import MeusRegistrosNC from "./pages/MeusRegistrosNC";
import MinhasFichasVerificacao from "./pages/MinhasFichasVerificacao";
import MinhasFichasPlaca from "./pages/MinhasFichasPlaca";
import MinhasNecessidades from "./pages/MinhasNecessidades";
import MinhasNecessidadesRelatorios from "./pages/MinhasNecessidadesRelatorios";
import RevisaoIntervencoes from "./pages/RevisaoIntervencoes";
import DashboardNecessidades from "./pages/DashboardNecessidades";
import Modulos from "./pages/Modulos";
import ResetAdminPassword from "./pages/ResetAdminPassword";
import TestePDF from "./pages/TestePDF";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/coordenacao-fiscalizacao" element={<CoordenacaoFiscalizacao />} />
          <Route path="/minhas-ncs" element={<MinhasNCs />} />
          <Route path="/ncs-coordenador" element={<NCsCoordenador />} />
          <Route path="/minhas-frentes-liberadas" element={<MinhasFrentesLiberadas />} />
          <Route path="/minhas-retrorrefletividades" element={<MinhasRetrorrefletividades />} />
          <Route path="/minhas-defensas" element={<MinhasDefensas />} />
          <Route path="/minhas-intervencoes-sh" element={<MinhasIntervencoesSH />} />
          <Route path="/minhas-intervencoes-inscricoes" element={<MinhasIntervencoesInscricoes />} />
          <Route path="/minhas-intervencoes-sv" element={<MinhasIntervencoesSV />} />
          <Route path="/minhas-intervencoes-tacha" element={<MinhasIntervencoesTacha />} />
          <Route path="/minhas-intervencoes" element={<MinhasIntervencoes />} />
          <Route path="/meus-registros-nc" element={<MeusRegistrosNC />} />
          <Route path="/minhas-fichas-verificacao" element={<MinhasFichasVerificacao />} />
          <Route path="/minhas-fichas-placa" element={<MinhasFichasPlaca />} />
          <Route path="/minhas-necessidades" element={<MinhasNecessidades />} />
          <Route path="/minhas-necessidades-relatorios" element={<MinhasNecessidadesRelatorios />} />
          <Route path="/revisao-intervencoes" element={<RevisaoIntervencoes />} />
          <Route path="/dashboard-necessidades" element={<DashboardNecessidades />} />
          <Route path="/modulos" element={<Modulos />} />
          <Route path="/reset-admin-password" element={<ResetAdminPassword />} />
          <Route path="/teste-pdf" element={<TestePDF />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
