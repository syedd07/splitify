import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  user: any;
  userProfile: any;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any = null;
    
    const fetchUserProfile = async (userId: string) => {
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
    };

    const setupAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Important: Set the user state ONCE after we have complete information
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(session.user);
          setUserProfile(profile);
        } else {
          setUser(null);
          setUserProfile(null);
        }
        
        // Set up listener for auth changes - this runs AFTER initial setup
        const authSubscription = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log("Auth state changed:", event);
            
            if (session?.user) {
              const profile = await fetchUserProfile(session.user.id);
              setUser(session.user);
              setUserProfile(profile);
            } else {
              setUser(null);
              setUserProfile(null);
            }
          }
        );
        
        subscription = authSubscription.data.subscription;
      } finally {
        // Always set loading to false when auth setup is complete
        setLoading(false);
      }
    };
    
    setupAuth();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);
  
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
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