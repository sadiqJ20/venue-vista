import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Department = 'CSE' | 'IT' | 'ECE' | 'EEE' | 'MECH' | 'CIVIL' | 'AERO' | 'CHEMICAL' | 'AIDS' | 'CSBS' | 'MCA' | 'MBA' | 'TRAINING' | 'PLACEMENT' | 'SCIENCE & HUMANITIES' | 'IIIE CELL' | 'HR' | 'INNOVATION' | 'AI_ML';
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile after auth state change
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          setProfile(profileData);
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
    // For faculty and HOD, we need to verify additional credentials
    if ((role === 'faculty' || role === 'hod') && (!department || !uniqueId)) {
      return { error: { message: 'Department and Unique ID are required for faculty and HOD login' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return { error };

    // Additional verification for faculty/HOD
    if (role === 'faculty' || role === 'hod') {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('role', role)
        .eq('department', department)
        .eq('unique_id', uniqueId)
        .single();

      if (profileError || !profileData) {
        await supabase.auth.signOut();
        return { error: { message: 'Invalid credentials for the specified role and department' } };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      await supabase.auth.signOut();
      
      // Clear any local storage items related to auth
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload to clear all state and redirect to auth
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signOut fails, clear storage and redirect
      localStorage.clear();
      sessionStorage.clear();
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