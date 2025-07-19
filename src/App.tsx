import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/transactions/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/dashboard/Onboarding";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/notifications";
import { AuthProvider, useAuth } from './hooks/useAuth';
import Footer from "./components/Footer";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import AuthCallback from "./pages/auth/Callback";
import ResetPassword from "./pages/ResetPassword";
import StatementsPage from "./pages/statements/page";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

// Protected route component with consistent loading indicator
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Root redirect component with consistent localStorage handling
const RootRedirect = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    // Log for debugging
    console.log("RootRedirect:", { 
      user: user?.id, 
      loading, 
      path: location.pathname,
      selectedCard: localStorage.getItem('selectedCard')
    });
  }, [user, loading, location]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Check if user has completed onboarding
  const selectedCardData = localStorage.getItem('selectedCard');
  let selectedCard = null;
  
  // Try to parse the selectedCard - it could be JSON object or just an ID string
  if (selectedCardData) {
    try {
      // First try to parse as JSON
      selectedCard = JSON.parse(selectedCardData);
      
      // If it parsed but is just a string ID, treat it as the ID
      if (typeof selectedCard === 'string') {
        console.log("selectedCard is a string ID:", selectedCard);
      } else {
        console.log("selectedCard is a JSON object with ID:", selectedCard.id);
      }
    } catch (e) {
      // If it's not valid JSON, treat it as a plain string
      console.log("selectedCard is not JSON, using as string:", selectedCardData);
      selectedCard = selectedCardData;
    }
  }
  
  if (!selectedCard) {
    console.log("No selected card, redirecting to onboarding");
    return <Navigate to="/onboarding" replace />;
  }
  
  // Go to transactions page with transactions step pre-selected
  console.log("Redirecting to transactions with step=transactions");
  localStorage.setItem('currentStep', 'transactions');
  return <Navigate to="/transactions" replace />;
};

// Layout with footer for non-transaction pages
const LayoutWithFooter = ({ children }) => {
  const location = useLocation();
  const isTransactionsPage = location.pathname === '/transactions';
  const showPwaPrompt = location.pathname === '/' || location.pathname === '/onboarding';
  
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow pb-8 sm:pb-12 md:pb-16">
        {children}
      </main>
      {!isTransactionsPage && <Footer />}
      {showPwaPrompt && <PwaInstallPrompt />}
    </div>
  );
};

const App = () => {
  useEffect(() => {
    requestNotificationPermission().then((token) => {
      if (token) {
        console.log("User FCM token:", token);
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LayoutWithFooter>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route 
                  path="/onboarding" 
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/transactions" 
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/statements" 
                  element={
                    <ProtectedRoute>
                      <StatementsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </LayoutWithFooter>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;