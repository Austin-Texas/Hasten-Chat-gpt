import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import HastenLayout from '@/components/HastenLayout';
import MobileLayout from '@/components/driver/MobileLayout';
import ThemeProvider from '@/components/ThemeProvider';

// Auth pages
import Login from '@/pages/Login';

// Admin / Dispatcher pages
import Dashboard from '@/pages/Dashboard';
import Loads from '@/pages/Loads';
import LoadDetail from '@/pages/LoadDetail';
import TripReplay from '@/pages/TripReplay';
import LoadForm from '@/pages/LoadForm';
import Drivers from '@/pages/Drivers';
import DriverDetail from '@/pages/DriverDetail';
import DriverForm from '@/pages/DriverForm';
import Fleet from '@/pages/Fleet';
import TruckDetail from '@/pages/TruckDetail';
import Dispatch from '@/pages/Dispatch';
import Tracking from '@/pages/Tracking';
import Finance from '@/pages/Finance';
import CRM from '@/pages/CRM';
import LoadTemplates from '@/pages/LoadTemplates';
import SafetyDashboard from '@/pages/SafetyDashboard';
import IFTAReport from '@/pages/IFTAReport';
import DocumentPortal from '@/pages/DocumentPortal';
import DispatcherInboxPage from '@/pages/DispatcherInboxPage';
import ExpenseApprovals from '@/pages/ExpenseApprovals';
import Maintenance from '@/pages/Maintenance';
import DriverScorecards from '@/pages/DriverScorecards';
import LoadTemplateLibrary from '@/pages/LoadTemplateLibrary';
import Compliance from '@/pages/Compliance';
import Payroll from '@/pages/Payroll';
import IFTAQuarterly from '@/pages/IFTAQuarterly';
import BrokerDetail from '@/pages/BrokerDetail';
import ExecutiveProfitability from '@/pages/ExecutiveProfitability';
import DispatcherAnalytics from '@/pages/DispatcherAnalytics';
import DispatcherPerformance from '@/pages/DispatcherPerformance';
import FleetUtilizationReport from '@/pages/FleetUtilizationReport';
import WeeklySettlementReport from '@/pages/WeeklySettlementReport';
import ClientForm from '@/pages/ClientForm';
import BrokerForm from '@/pages/BrokerForm';
import Quotes from '@/pages/Quotes';
import QuoteRequest from '@/pages/QuoteRequest';
import Shipments from '@/pages/Shipments';
import Timeline from '@/pages/Timeline';
import ClientPortal from '@/pages/client/ClientPortal';
import HelpCenter from '@/pages/HelpCenter';
import SupportTickets from '@/pages/SupportTickets';
import FeedbackReview from '@/pages/FeedbackReview';
import NotificationCenter from '@/pages/NotificationCenter';
import PaymentSuccess from '@/pages/client/PaymentSuccess';
import SecurityDashboard from '@/pages/SecurityDashboard';
import FleetManager from '@/pages/FleetManager';
import TruckForm from '@/pages/TruckForm';
import Settings from '@/pages/Settings';
import DetentionApprovals from '@/pages/DetentionApprovals';
import DetentionDashboard from '@/pages/DetentionDashboard';
import DocumentLifecycle from '@/pages/DocumentLifecycle';
import DocumentsPending from '@/pages/DocumentsPending';
import ContractorDocuments from '@/pages/ContractorDocuments';
import OwnerOperatorSettlement from '@/pages/OwnerOperatorSettlement';
import ContractorManagement from '@/pages/ContractorManagement';
import PaymentProfiles from '@/pages/PaymentProfiles';
import Factoring from '@/pages/Factoring';
import LoadMarketplace from '@/pages/LoadMarketplace';
import DispatchBidReview from '@/pages/DispatchBidReview';
import SuperAdminIntegrations from '@/pages/SuperAdminIntegrations';
import TaxCenter from '@/pages/TaxCenter';
import AgentConversation from '@/pages/AgentConversation';
import SystemDiagnostics from '@/pages/SystemDiagnostics';
import ApprovalsQueue from '@/pages/ApprovalsQueue';
import ReportsCenter from '@/pages/ReportsCenter';
import IncidentCenter from '@/pages/IncidentCenter';
import ThemeShowcase from '@/pages/ThemeShowcase';
import AppBlueprint from '@/pages/AppBlueprint';
import UserAccess from '@/pages/UserAccess';
import DriverEmergencyCenter from '@/pages/driver/DriverEmergencyCenter';

// Driver pages
import DriverDashboard from '@/pages/driver/DriverDashboard';
import DriverSettlementPreview from '@/pages/driver/DriverSettlementPreview';
import DriverScan from '@/pages/driver/DriverScan';
import DriverLoads from '@/pages/driver/DriverLoads';
import DriverMap from '@/pages/driver/DriverMap';
import DriverDocuments from '@/pages/driver/DriverDocuments';
import DriverMessages from '@/pages/driver/DriverMessages';
import DriverEarnings from '@/pages/driver/DriverEarnings';
import DriverLoadDetail from '@/pages/driver/DriverLoadDetail';
import DriverProfile from '@/pages/driver/DriverProfile';
import DriverProfileEdit from '@/pages/driver/DriverProfileEdit';
import DriverComplianceDocuments from '@/pages/driver/DriverComplianceDocuments';
import DriverHOSMonitor from '@/pages/driver/DriverHOSMonitor';
import DriverSettings from '@/pages/driver/DriverSettings';
import DriverAboutMe from '@/pages/driver/DriverAboutMe';
import DriverAboutVehicle from '@/pages/driver/DriverAboutVehicle';
import DriverCompanies from '@/pages/driver/DriverCompanies';
import DriverFeedback from '@/pages/driver/DriverFeedback';
import DriverSupport from '@/pages/driver/DriverSupport';
import DriverPayrollView from '@/components/driver/DriverPayrollView';
import DriverDocumentsSigningFlow from '@/components/driver/DriverDocumentsSigningFlow';

function AppLayout({ children, user }) {
  return (
    <HastenLayout user={user}>
      {children}
    </HastenLayout>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, currentUser } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center animate-pulse-glow">
            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.33-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H8.22zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
            </svg>
          </div>
          <div className="text-white font-heading font-bold text-xl">HASTEN</div>
          <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  const user = currentUser;
  const businessRole = user?.businessRole || user?.role || "admin";
  const isDriver = businessRole === "driver";
  const isCustomer = businessRole === "customer";

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<Login />} />
      <Route path="/request-quote" element={<QuoteRequest />} />

      {/* Protected */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<Navigate to={isDriver ? "/driver/dashboard" : isCustomer ? "/client" : "/dashboard"} replace />} />

        {/* Admin / Dispatcher */}
        <Route path="/dashboard" element={<AppLayout user={user}><Dashboard user={user} /></AppLayout>} />
        <Route path="/approvals" element={<AppLayout user={user}><ApprovalsQueue user={user} /></AppLayout>} />
        <Route path="/reports" element={<AppLayout user={user}><ReportsCenter user={user} /></AppLayout>} />
        <Route path="/incidents" element={<AppLayout user={user}><IncidentCenter user={user} /></AppLayout>} />
        <Route path="/activity" element={<Navigate to="/timeline" replace />} />
        <Route path="/dispatch" element={<AppLayout user={user}><Dispatch /></AppLayout>} />
        <Route path="/dispatch/load-marketplace" element={<AppLayout user={user}><LoadMarketplace /></AppLayout>} />
        <Route path="/dispatch/bid-review" element={<AppLayout user={user}><DispatchBidReview /></AppLayout>} />
        <Route path="/dispatch/marketplace" element={<Navigate to="/dispatch/load-marketplace" replace />} />
        <Route path="/super-admin/settings/integrations/load-board-apis" element={<AppLayout user={user}><SuperAdminIntegrations /></AppLayout>} />
        <Route path="/super-admin/integrations/load-board-api" element={<Navigate to="/super-admin/settings/integrations/load-board-apis" replace />} />
        <Route path="/super-admin/settings/system-diagnostics" element={<AppLayout user={user}><SystemDiagnostics /></AppLayout>} />
        <Route path="/dispatch/analytics" element={<AppLayout user={user}><DispatcherAnalytics /></AppLayout>} />
        <Route path="/dispatch/performance" element={<AppLayout user={user}><DispatcherPerformance /></AppLayout>} />
        <Route path="/loads" element={<AppLayout user={user}><Loads /></AppLayout>} />
        <Route path="/loads/new" element={<AppLayout user={user}><LoadForm /></AppLayout>} />
        <Route path="/loads/:id/edit" element={<AppLayout user={user}><LoadForm /></AppLayout>} />
        <Route path="/loads/:id" element={<AppLayout user={user}><LoadDetail /></AppLayout>} />
        <Route path="/loads/:id/replay" element={<AppLayout user={user}><TripReplay /></AppLayout>} />
        <Route path="/drivers" element={<AppLayout user={user}><Drivers /></AppLayout>} />
        <Route path="/drivers/new" element={<AppLayout user={user}><DriverForm /></AppLayout>} />
        <Route path="/drivers/:id" element={<AppLayout user={user}><DriverDetail /></AppLayout>} />
        <Route path="/drivers/:id/edit" element={<AppLayout user={user}><DriverForm /></AppLayout>} />
        <Route path="/fleet-manager" element={<AppLayout user={user}><FleetManager /></AppLayout>} />
        <Route path="/fleet/utilization" element={<AppLayout user={user}><FleetUtilizationReport /></AppLayout>} />
        <Route path="/fleet" element={<AppLayout user={user}><Fleet /></AppLayout>} />
        <Route path="/fleet/new" element={<AppLayout user={user}><TruckForm /></AppLayout>} />
        <Route path="/fleet/:id/edit" element={<AppLayout user={user}><TruckForm /></AppLayout>} />
        <Route path="/fleet/:id" element={<AppLayout user={user}><TruckDetail /></AppLayout>} />
        <Route path="/tracking" element={<AppLayout user={user}><Tracking /></AppLayout>} />
        <Route path="/finance" element={<AppLayout user={user}><Finance /></AppLayout>} />
        <Route path="/finance/factoring" element={<AppLayout user={user}><Factoring /></AppLayout>} />
        <Route path="/profitability" element={<AppLayout user={user}><ExecutiveProfitability /></AppLayout>} />
        <Route path="/maintenance" element={<AppLayout user={user}><Maintenance /></AppLayout>} />
        <Route path="/driver-scorecards" element={<AppLayout user={user}><DriverScorecards /></AppLayout>} />
        <Route path="/load-templates" element={<AppLayout user={user}><LoadTemplateLibrary /></AppLayout>} />
        <Route path="/compliance" element={<AppLayout user={user}><Compliance /></AppLayout>} />
        <Route path="/payroll" element={<AppLayout user={user}><Payroll /></AppLayout>} />
        <Route path="/crm/new/client" element={<AppLayout user={user}><ClientForm /></AppLayout>} />
        <Route path="/crm/new/broker" element={<AppLayout user={user}><BrokerForm /></AppLayout>} />
        <Route path="/crm/:id/edit" element={<AppLayout user={user}><ClientForm /></AppLayout>} />
        <Route path="/crm/:id" element={<AppLayout user={user}><BrokerDetail /></AppLayout>} />
        <Route path="/crm" element={<AppLayout user={user}><CRM /></AppLayout>} />
        <Route path="/quotes" element={<AppLayout user={user}><Quotes /></AppLayout>} />
        <Route path="/shipments" element={<AppLayout user={user}><Shipments /></AppLayout>} />
        <Route path="/safety" element={<AppLayout user={user}><SafetyDashboard /></AppLayout>} />
        <Route path="/ifta" element={<AppLayout user={user}><IFTAReport /></AppLayout>} />
        <Route path="/ifta-quarterly" element={<AppLayout user={user}><IFTAQuarterly /></AppLayout>} />
        <Route path="/documents" element={<AppLayout user={user}><DocumentPortal /></AppLayout>} />
        <Route path="/documents/lifecycle" element={<AppLayout user={user}><DocumentLifecycle /></AppLayout>} />
        <Route path="/documents/pending" element={<AppLayout user={user}><DocumentsPending /></AppLayout>} />
        <Route path="/documents/contractor" element={<AppLayout user={user}><ContractorDocuments /></AppLayout>} />
        <Route path="/messages" element={<AppLayout user={user}><DispatcherInboxPage /></AppLayout>} />
        <Route path="/driver/messages" element={<MobileLayout user={user}><DriverMessages user={user} /></MobileLayout>} />
        <Route path="/expense-approvals" element={<AppLayout user={user}><ExpenseApprovals user={user} /></AppLayout>} />
        <Route path="/help" element={<AppLayout user={user}><HelpCenter /></AppLayout>} />
        <Route path="/support-tickets" element={<AppLayout user={user}><SupportTickets user={user} /></AppLayout>} />
        <Route path="/feedback" element={<AppLayout user={user}><FeedbackReview user={user} /></AppLayout>} />
        <Route path="/notifications" element={<AppLayout user={user}><NotificationCenter user={user} /></AppLayout>} />
        <Route path="/timeline" element={<AppLayout user={user}><Timeline /></AppLayout>} />
        <Route path="/security-dashboard" element={<AppLayout user={user}><SecurityDashboard /></AppLayout>} />
        <Route path="/settings" element={<AppLayout user={user}><Settings /></AppLayout>} />
        <Route path="/admin/users-access" element={<AppLayout user={user}><UserAccess /></AppLayout>} />
        <Route path="/theme-showcase" element={<AppLayout user={user}><ThemeShowcase /></AppLayout>} />
        <Route path="/app-blueprint" element={<AppLayout user={user}><AppBlueprint /></AppLayout>} />
        <Route path="/detention-approvals" element={<AppLayout user={user}><DetentionApprovals /></AppLayout>} />
        <Route path="/detention-dashboard" element={<AppLayout user={user}><DetentionDashboard /></AppLayout>} />
        <Route path="/finance/settlements" element={<AppLayout user={user}><OwnerOperatorSettlement /></AppLayout>} />
        <Route path="/finance/weekly-settlements" element={<AppLayout user={user}><WeeklySettlementReport /></AppLayout>} />
        <Route path="/finance/tax-center" element={<AppLayout user={user}><TaxCenter /></AppLayout>} />
        <Route path="/finance/payment-profiles" element={<AppLayout user={user}><PaymentProfiles /></AppLayout>} />
        <Route path="/contractors" element={<AppLayout user={user}><ContractorManagement /></AppLayout>} />
        <Route path="/admin/testing" element={<Navigate to="/super-admin/settings/system-diagnostics" replace />} />
        <Route path="/admin/verify-users" element={<Navigate to="/super-admin/settings/system-diagnostics" replace />} />
        <Route path="/phase1-verification" element={<Navigate to="/super-admin/settings/system-diagnostics" replace />} />
        <Route path="/phase2-rbac-test" element={<Navigate to="/super-admin/settings/system-diagnostics" replace />} />
        <Route path="/phase2-audit" element={<Navigate to="/super-admin/settings/system-diagnostics" replace />} />

        {/* Driver Mobile App — native mobile layout with bottom tab nav */}
        <Route path="/driver/dashboard" element={<MobileLayout user={user}><DriverDashboard user={user} /></MobileLayout>} />
        <Route path="/driver/loads" element={<MobileLayout user={user}><DriverLoads user={user} /></MobileLayout>} />
        <Route path="/driver/map" element={<MobileLayout user={user}><DriverMap user={user} /></MobileLayout>} />
        <Route path="/driver/documents" element={<MobileLayout user={user}><DriverDocuments user={user} /></MobileLayout>} />
        <Route path="/driver/earnings" element={<MobileLayout user={user}><DriverEarnings user={user} /></MobileLayout>} />
        <Route path="/driver/loads/:id" element={<MobileLayout user={user}><DriverLoadDetail user={user} /></MobileLayout>} />
        <Route path="/driver/profile" element={<MobileLayout user={user}><DriverProfile user={user} /></MobileLayout>} />
        <Route path="/driver/profile/edit" element={<MobileLayout user={user}><DriverProfileEdit user={user} /></MobileLayout>} />
        <Route path="/driver/profile/documents" element={<MobileLayout user={user}><DriverComplianceDocuments user={user} /></MobileLayout>} />
        <Route path="/driver/profile/about-me" element={<MobileLayout user={user}><DriverAboutMe user={user} /></MobileLayout>} />
        <Route path="/driver/profile/about-vehicle" element={<MobileLayout user={user}><DriverAboutVehicle user={user} /></MobileLayout>} />
        <Route path="/driver/profile/companies" element={<MobileLayout user={user}><DriverCompanies user={user} /></MobileLayout>} />
        <Route path="/driver/documents/sign" element={<MobileLayout user={user}><DriverDocumentsSigningFlow user={user} /></MobileLayout>} />
        <Route path="/driver/feedback" element={<MobileLayout user={user}><DriverFeedback user={user} /></MobileLayout>} />
        <Route path="/driver/support" element={<MobileLayout user={user}><DriverSupport user={user} /></MobileLayout>} />
        <Route path="/driver/settings" element={<MobileLayout user={user}><DriverSettings user={user} /></MobileLayout>} />
        <Route path="/driver/hos" element={<MobileLayout user={user}><DriverHOSMonitor user={user} /></MobileLayout>} />
        <Route path="/driver/payroll" element={<MobileLayout user={user}><DriverPayrollView user={user} /></MobileLayout>} />
        <Route path="/driver/settlement-preview" element={<MobileLayout user={user}><DriverSettlementPreview user={user} /></MobileLayout>} />
        <Route path="/driver/scan" element={<MobileLayout user={user}><DriverScan user={user} /></MobileLayout>} />
        <Route path="/driver/emergency" element={<MobileLayout user={user}><DriverEmergencyCenter user={user} /></MobileLayout>} />

        {/* AI Agent Conversations */}
        <Route path="/agent/:agentName" element={<AppLayout user={user}><AgentConversation /></AppLayout>} />

        {/* Client Portal */}
        <Route path="/client/*" element={<ClientPortal />} />
        <Route path="/customer/*" element={<ClientPortal />} />
        <Route path="/broker/*" element={<Navigate to="/customer" replace />} />
        <Route path="/client/payment-success" element={<PaymentSuccess />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
