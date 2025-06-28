import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  user: any;
  userProfile: any;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  }, [user?.id, fetchUserProfile]);

  useEffect(() => {
    let subscription: any = null;
    let isMounted = true;
    
    const setupAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(session.user);
          setUserProfile(profile);
        } else if (isMounted) {
          setUser(null);
          setUserProfile(null);
        }
        
        // Set up listener for auth changes
        const authSubscription = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log("Auth state changed:", event);
            
            if (session?.user && isMounted) {
              const profile = await fetchUserProfile(session.user.id);
              setUser(session.user);
              setUserProfile(profile);
            } else if (isMounted) {
              setUser(null);
              setUserProfile(null);
            }
          }
        );
        
        subscription = authSubscription.data.subscription;
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    setupAuth();
    
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchUserProfile]);
  
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      
      // Clear localStorage
      localStorage.removeItem('selectedCard');
      localStorage.removeItem('currentStep');
      localStorage.removeItem('hasExistingTransactions');
    } catch (error) {
      console.error("Error signing out:", error);
      throw error; // Re-throw so components can handle it
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};