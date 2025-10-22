import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ChatAssistant } from "@/components/ChatAssistant";
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
import ElementosPendentes from "./pages/ElementosPendentes";
import MeusElementosPendentes from "./pages/MeusElementosPendentes";
import RelatorioMedicao from "./pages/RelatorioMedicao";
import ReconciliacaoPendente from "./pages/ReconciliacaoPendente";
import ModoCampo from "./pages/ModoCampo";
import InventarioDinamicoComAlerta from "./pages/InventarioDinamicoComAlerta";
import RegistrarIntervencaoCampo from "./pages/RegistrarIntervencaoCampo";
import AuditoriaSinalizacoes from "./pages/AuditoriaSinalizacoes";
import DocumentacaoVABLE from "./pages/DocumentacaoVABLE";
import AuditoriaInventario from "./pages/AuditoriaInventario";
import InventarioDinamico from "./pages/InventarioDinamico";
import ValidacaoFichasVerificacao from "./pages/ValidacaoFichasVerificacao";
import RegistrarNC from "./pages/RegistrarNC";
import MapaNecessidadesPlacas from "./pages/MapaNecessidadesPlacas";

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
        <Route path="/modulos" element={<Modulos />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/modo-campo" element={<ModoCampo />} />
        <Route path="/minhas-ncs" element={<MinhasNCs />} />
        <Route path="/meus-registros-nc" element={<MeusRegistrosNC />} />
        <Route path="/minhas-fichas-verificacao" element={<MinhasFichasVerificacao />} />
        <Route path="/minhas-fichas-placa" element={<MinhasFichasPlaca />} />
        <Route path="/minhas-retrorrefletividades" element={<MinhasRetrorrefletividades />} />
        <Route path="/minhas-necessidades" element={<MinhasNecessidades />} />
        <Route path="/minhas-intervencoes" element={<MinhasIntervencoes />} />
        <Route path="/minhas-defensas" element={<MinhasDefensas />} />
        <Route path="/minhas-frentes-liberadas" element={<MinhasFrentesLiberadas />} />
        <Route path="/revisao-intervencoes" element={<RevisaoIntervencoes />} />
        <Route path="/elementos-pendentes" element={<ElementosPendentes />} />
        <Route path="/meus-elementos-pendentes" element={<MeusElementosPendentes />} />
        <Route path="/minhas-intervencoes-inscricoes" element={<MinhasIntervencoesInscricoes />} />
        <Route path="/minhas-intervencoes-sv" element={<MinhasIntervencoesSV />} />
        <Route path="/minhas-intervencoes-sh" element={<MinhasIntervencoesSH />} />
        <Route path="/minhas-intervencoes-tacha" element={<MinhasIntervencoesTacha />} />
        <Route path="/minhas-necessidades-relatorios" element={<MinhasNecessidadesRelatorios />} />
        <Route path="/reconciliacao-pendente" element={<ReconciliacaoPendente />} />
        <Route path="/modo-campo/registrar-intervencao" element={<RegistrarIntervencaoCampo />} />
        <Route path="/modo-campo/registrar-nc" element={<RegistrarNC />} />
        <Route path="/dashboard-necessidades" element={<DashboardNecessidades />} />
        <Route path="/auditoria-sinalizacoes" element={<AuditoriaSinalizacoes />} />
        <Route path="/auditoria-inventario" element={<AuditoriaInventario />} />
        <Route path="/documentacao-vable" element={<DocumentacaoVABLE />} />
        <Route path="/modo-campo/inventario-dinamico" element={<InventarioDinamicoComAlerta />} />
        <Route path="/baseline-evolucao" element={<InventarioDinamico />} />
        <Route path="/coordenacao-fiscalizacao" element={<CoordenacaoFiscalizacao />} />
        <Route path="/validacao-fichas-verificacao" element={<ValidacaoFichasVerificacao />} />
        <Route path="/ncs-coordenador" element={<NCsCoordenador />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-admin-password" element={<ResetAdminPassword />} />
        <Route path="/relatorio-medicao" element={<RelatorioMedicao />} />
        <Route path="/teste-pdf" element={<TestePDF />} />
        <Route path="/mapa-necessidades-placas" element={<MapaNecessidadesPlacas />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatAssistant />
    </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
