import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Department = 'CSE' | 'IT' | 'ECE' | 'EEE' | 'MECH' | 'CIVIL' | 'AERO' | 'CHEMICAL' | 'AIDS' | 'CSBS' | 'MCA' | 'MBA' | 'TRAINING' | 'PLACEMENT' | 'SCIENCE & HUMANITIES' | 'HR' | 'INNOVATION' | 'AI_ML' | 'NCC' | 'NSS' | 'III' | 'IEDC' | 'PRO';
type UserRole = 'faculty' | 'hod' | 'principal' | 'pro' | 'chairman';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  mobile_number: string;
  role: UserRole;
  department?: Department;
  unique_id?: string;
  hod_id?: string;
}

interface SignUpData {
  name: string;
  mobile_number: string;
  role: UserRole;
  department?: Department;
  unique_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: SignUpData) => Promise<{ error: any }>;
  signIn: (email: string, password: string, role?: UserRole, department?: Department, uniqueId?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startTime = Date.now();
    console.log('[AUTH] Initializing auth state...');
    let isMounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        const eventTime = Date.now() - startTime;
        console.log(`[AUTH] State changed: ${event} (${eventTime}ms)`, { 
          hasSession: !!session, 
          userId: session?.user?.id 
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            console.log('[AUTH] Fetching profile for user:', session.user.id);
            const profileFetchStart = Date.now();
            
            // Add 10s timeout for profile fetch
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
            );
            
            const { data: profileData, error } = await Promise.race([
              profilePromise,
              timeoutPromise
            ]) as any;
            
            const profileFetchTime = Date.now() - profileFetchStart;
            
            if (error) {
              console.error('[AUTH] Error fetching profile:', error);
              throw error;
            }
            
            if (!isMounted) return;
            
            console.log(`[AUTH] Profile loaded (${profileFetchTime}ms):`, {
              id: profileData.id,
              role: profileData.role,
              department: profileData.department
            });
            
            // Verify required fields
            if (!profileData.role) {
              console.warn('[AUTH] Profile missing role');
            }
            
            setProfile(profileData);
          } catch (error) {
            console.error('[AUTH] Profile load error:', error);
            // Don't clear session on profile error, user can retry
          } finally {
            if (isMounted) {
              setLoading(false);
            }
          }
        } else {
          console.log('[AUTH] No user session');
          if (isMounted) {
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    // Initial session check (runs once on mount)
    const checkSession = async () => {
      try {
        console.log('[AUTH] Checking existing session...');
        const sessionCheckStart = Date.now();
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        const sessionCheckTime = Date.now() - sessionCheckStart;
        console.log(`[AUTH] Session check complete (${sessionCheckTime}ms)`, { 
          hasSession: !!session 
        });
        
        if (error) throw error;
        
        // If no session, we're done loading
        if (!session?.user) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        
        // Session exists, onAuthStateChange will handle profile fetch
        // Just set the session and user here to avoid race condition
        if (isMounted) {
          setSession(session);
          setUser(session.user);
        }
      } catch (error) {
        console.error('[AUTH] Session check failed:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      console.log('[AUTH] Cleaning up...');
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    // Validate phone number (must be exactly 10 digits and numeric)
    if (!userData.mobile_number || !/^\d{10}$/.test(userData.mobile_number)) {
      return { error: { message: 'Phone number must be exactly 10 digits and contain only numbers.' } };
    }

    // Check for duplicate email
    const { data: existingEmail, error: emailCheckError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (emailCheckError && emailCheckError.code !== 'PGRST116') {
      return { error: emailCheckError };
    }

    if (existingEmail) {
      return { error: { message: 'This email is already registered.' } };
    }

    // Check for duplicate name
    const { data: existingName, error: nameCheckError } = await supabase
      .from('profiles')
      .select('name')
      .eq('name', userData.name)
      .maybeSingle();

    if (nameCheckError && nameCheckError.code !== 'PGRST116') {
      return { error: nameCheckError };
    }

    if (existingName) {
      return { error: { message: 'This name is already taken.' } };
    }

    // Check for HOD uniqueness before proceeding with registration
    if (userData.role === 'hod' && userData.department) {
      const { data: existingHod, error: hodCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'hod')
        .eq('department', userData.department)
        .maybeSingle();

      if (hodCheckError) return { error: hodCheckError };

      if (existingHod) {
        return { error: { message: 'HOD for this department already exists.' } };
      }
    }

    // Create auth user with metadata
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          mobile_number: userData.mobile_number,
          role: userData.role,
          department: userData.department,
          unique_id: userData.unique_id,
        },
      },
    });

    if (signUpError) return { error: signUpError };

    let authedUserId = signUpData.user?.id || null;
    let authedEmail = signUpData.user?.email || email;

    // If signup did not create a session (email confirmation required), try sign-in once
    if (!signUpData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        // Treat as success but without session to avoid confusing error toast
        // The project likely has email confirmations enabled in Supabase dashboard
        return { error: null };
      }
      authedUserId = signInData.user?.id ?? authedUserId;
      authedEmail = signInData.user?.email ?? authedEmail;
    }

    // Ensure profile exists/updated after auth
    if (authedUserId) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authedUserId)
        .maybeSingle();

      const payload: Partial<Profile> & { user_id: string; email: string } = {
        user_id: authedUserId,
        email: authedEmail,
        name: userData.name,
        mobile_number: userData.mobile_number,
        role: userData.role,
        department: userData.department,
        unique_id: userData.unique_id,
      } as any;

      if (existing?.id) {
        await supabase.from('profiles').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('profiles').insert(payload as any);
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string, role?: UserRole, department?: Department, uniqueId?: string) => {
    const loginStart = Date.now();
    console.log('[AUTH] Sign in attempt for:', email);
    
    try {
      // First, try to sign in with email and password
      const authStart = Date.now();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password.trim()
      });
      const authTime = Date.now() - authStart;

      if (error) {
        console.error(`[AUTH] Authentication error (${authTime}ms):`, error.message);
        return { error };
      }

      console.log(`[AUTH] Authentication successful (${authTime}ms), checking profile...`);
      
      // Get the user's profile with timeout
      const profileStart = Date.now();
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      const { data: profileData, error: profileError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;
      
      const profileTime = Date.now() - profileStart;

      if (profileError || !profileData) {
        console.error(`[AUTH] Profile not found (${profileTime}ms):`, profileError);
        await supabase.auth.signOut();
        return { error: { message: 'User profile not found. Please contact support.' } };
      }

      console.log(`[AUTH] Profile loaded (${profileTime}ms):`, {
        role: profileData.role,
        department: profileData.department
      });

      // If role was specified, verify it matches the user's role
      if (role && profileData.role !== role) {
        console.error(`[AUTH] Role mismatch: expected ${role}, got ${profileData.role}`);
        await supabase.auth.signOut();
        return { error: { message: 'You do not have permission to access this role.' } };
      }

      // For faculty and HOD, verify department and unique ID if provided
      if ((profileData.role === 'faculty' || profileData.role === 'hod') && (department || uniqueId)) {
        if (department && profileData.department !== department) {
          console.error(`[AUTH] Department mismatch: expected ${department}, got ${profileData.department}`);
          await supabase.auth.signOut();
          return { error: { message: 'Invalid department for this user.' } };
        }
        
        if (uniqueId && profileData.unique_id !== uniqueId) {
          console.error(`[AUTH] Unique ID mismatch`);
          await supabase.auth.signOut();
          return { error: { message: 'Invalid credentials.' } };
        }
      }

      const totalTime = Date.now() - loginStart;
      console.log(`[AUTH] Sign in successful (total: ${totalTime}ms)`);
      return { error: null };
      
    } catch (error) {
      const totalTime = Date.now() - loginStart;
      console.error(`[AUTH] Unexpected error during sign in (${totalTime}ms):`, error);
      return { 
        error: { 
          message: 'An unexpected error occurred during sign in. Please try again.' 
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      console.log('[AUTH] Signing out user...');
      
      // Clear all auth state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AUTH] Supabase sign out error:', error);
        throw error;
      }
      
      // Clear any local storage items related to auth
      localStorage.removeItem('sb-auth-state');
      localStorage.removeItem('sb-auth-token');
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(';').forEach(c => {
        document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
      });
      
      console.log('[AUTH] Sign out successful, redirecting...');
      // Navigate to auth page (no reload needed - React Router will handle it)
      window.location.href = '/auth';
    } catch (error) {
      console.error('[AUTH] Error during sign out:', error);
      // Even if signOut fails, clear storage and redirect
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setSession(null);
      setProfile(null);
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};