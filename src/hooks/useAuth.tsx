import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'aluno';

interface Profile {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  isRoleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    setIsRoleLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setRole(null);
    } finally {
      setIsRoleLoading(false);
    }
  };

  useEffect(() => {
    let isInitialized = false;
    let currentUserId: string | null = null;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Ignore TOKEN_REFRESHED events to prevent unnecessary reloads
        // Only process meaningful auth state changes
        if (event === 'TOKEN_REFRESHED') {
          // Token refreshed silently - do not update state to prevent re-renders
          return;
        }

        // Only update state if user actually changed
        const newUserId = newSession?.user?.id ?? null;
        if (isInitialized && newUserId === currentUserId && event !== 'SIGNED_OUT') {
          // Same user, no need to re-render
          return;
        }

        currentUserId = newUserId;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Defer Supabase calls with setTimeout to prevent deadlock
        if (newSession?.user) {
          setTimeout(() => {
            fetchUserData(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsRoleLoading(false);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      currentUserId = existingSession?.user?.id ?? null;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchUserData(existingSession.user.id);
      } else {
        setIsRoleLoading(false);
      }

      setIsLoading(false);
      isInitialized = true;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const trimmedEmail = email.toLowerCase().trim();
    const redirectUrl = `${window.location.origin}/`;

    // Create user account
    const { error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome,
          role: 'aluno', // Default role for open registration
        },
      },
    });

    if (authError) {
      return { error: authError as Error };
    }

    return { error: null };
  };

  const signOut = async () => {
    // Clear local state first
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);

    // Sign out with global scope to invalidate all sessions
    await supabase.auth.signOut({ scope: 'global' });
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    role,
    isAdmin: role === 'admin',
    isLoading,
    isRoleLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
