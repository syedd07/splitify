import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/transactions/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/dashboard/Onboarding";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/notifications";
import { AuthProvider, useAuth } from './hooks/useAuth';
import Footer from "./components/Footer";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Root redirect component
const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Check if user has completed onboarding
  const selectedCard = localStorage.getItem('selectedCard');
  if (!selectedCard) {
    return <Navigate to="/onboarding" replace />;
  }
  
  // Go to transactions page with transactions step pre-selected
  localStorage.setItem('currentStep', 'transactions');
  return <Navigate to="/transactions" replace />;
};

// Layout with footer for non-transaction pages
const LayoutWithFooter = ({ children }) => {
  const location = useLocation();
  const isTransactionsPage = location.pathname === '/transactions';
  
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow pb-8 sm:pb-12 md:pb-16">
        {children}
      </main>
      {!isTransactionsPage && <Footer />}
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