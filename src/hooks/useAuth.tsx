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
        setUser(session?.user || null);
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
        }
        
        // Set up listener for auth changes
        const authSubscription = supabase.auth.onAuthStateChange(
          async (event, session) => {
            setUser(session?.user || null);
            
            if (session?.user) {
              const profile = await fetchUserProfile(session.user.id);
              setUserProfile(profile);
            } else {
              setUserProfile(null);
            }
          }
        );
        
        subscription = authSubscription.data.subscription;
      } finally {
        setLoading(false);
      }
    };
    
    setupAuth();
    
    // Proper cleanup function
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);
  
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
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