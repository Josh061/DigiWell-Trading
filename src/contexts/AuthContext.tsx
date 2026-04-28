import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, clearStaleSession, hasStoredSession } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { logAuditEventAsync } from '@/lib/auditLog';

export type UserRole = 'user' | 'refiner' | 'marketer' | 'government_agency' | 'trader' | 'admin' | 'pilot';

// Super admin emails with full platform privileges
const SUPER_ADMIN_EMAILS = [
  'asklincoln@gmail.com',
  'admin@digiwelltrading.com'
];

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  company?: string;
  company_verified?: boolean;
  company_verification_date?: string;
  company_registration_number?: string;
  company_address?: string;
  company_country?: string;
  kyc_status?: 'pending' | 'verified' | 'rejected';
  trading_limit?: number;
  total_trades?: number;
  total_volume?: number;
  is_super_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, role?: UserRole, companyData?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  updateProfile: (data: Partial<UserProfile>) => Promise<any>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  user: ['view_products', 'create_application', 'view_own_orders'],
  refiner: ['view_products', 'create_application', 'view_own_orders', 'manage_inventory', 'view_allocations'],
  marketer: ['view_products', 'create_application', 'view_own_orders', 'view_market_data', 'create_bids'],
  government_agency: ['view_products', 'view_all_applications', 'approve_applications', 'manage_allocations', 'view_reports'],
  trader: ['view_products', 'create_application', 'view_own_orders', 'view_market_data', 'create_bids', 'manage_portfolio', 'view_analytics'],
  admin: ['all'],
  pilot: ['view_deliveries', 'update_delivery_status', 'view_routes', 'update_gps_location']
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to handle network errors with retry
const withRetry = async <T,>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const isNetworkError = 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('Network request failed') ||
        error.name === 'FunctionsFetchError' ||
        error.code === 'ECONNREFUSED';
      
      if (isNetworkError && attempt < maxRetries) {
        console.log(`Network error, retrying in ${delayMs}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 1.5;
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// Helper to format error messages for users
const formatAuthError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  const message = error.message || error.error_description || String(error);
  
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for a confirmation link.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  
  return message;
};

// Check if email is a super admin
const checkSuperAdmin = (email: string | undefined): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

// Build a default profile from available data
const buildDefaultProfile = (
  userId: string,
  email: string,
  fullName: string,
  isSA: boolean,
  role?: string
): UserProfile => ({
  id: userId,
  email,
  full_name: fullName || 'User',
  role: isSA ? 'admin' : ((role as UserRole) || 'user'),
  is_super_admin: isSA
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Track in-flight profile fetches to prevent duplicates
  const fetchingProfileRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const fetchUserProfile = useCallback(async (userId: string, userEmail?: string, userMetadata?: any) => {
    // Prevent duplicate concurrent fetches for the same user
    if (fetchingProfileRef.current === userId) return;
    fetchingProfileRef.current = userId;

    const email = userEmail || '';
    const isSA = checkSuperAdmin(email);
    const fullName = userMetadata?.full_name || 'User';

    try {
      if (mountedRef.current) {
        setIsSuperAdmin(isSA);
      }

      // Query the users table with error handling
      let data: any = null;
      let queryError: any = null;

      try {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        data = result.data;
        queryError = result.error;
      } catch (fetchError: any) {
        // Network error or table doesn't exist - use default profile
        console.warn('Profile fetch network error (using defaults):', fetchError.message);
        queryError = fetchError;
      }

      if (!mountedRef.current) return;

      if (queryError || !data) {
        // Build default profile
        const defaultProfile = buildDefaultProfile(userId, email, fullName, isSA, userMetadata?.role);
        setUserProfile(defaultProfile);

        // Try to create the profile in the background (non-blocking)
        if (!queryError?.message?.includes('does not exist')) {
          supabase
            .from('users')
            .upsert({
              id: userId,
              email: defaultProfile.email,
              full_name: defaultProfile.full_name,
              role: defaultProfile.role,
              is_super_admin: isSA
            }, { onConflict: 'id' })
            .then(() => {})
            .catch(() => {});
        }
      } else {
        // Profile found - check super admin status
        if (isSA && data.role !== 'admin') {
          // Auto-upgrade super admin role (non-blocking)
          supabase
            .from('users')
            .update({ role: 'admin', is_super_admin: true })
            .eq('id', userId)
            .then(() => {})
            .catch(() => {});
          data.role = 'admin';
          data.is_super_admin = true;
        }
        
        if (mountedRef.current) {
          setUserProfile({ ...data, is_super_admin: isSA || data.is_super_admin });
        }
      }
    } catch (err: any) {
      console.warn('Profile fetch error (using defaults):', err.message);
      if (mountedRef.current) {
        setIsSuperAdmin(isSA);
        setUserProfile(buildDefaultProfile(userId, email, fullName, isSA, userMetadata?.role));
      }
    } finally {
      fetchingProfileRef.current = null;
    }
  }, []);

  const refreshProfile = async () => {
    if (user?.id) {
      fetchingProfileRef.current = null; // Reset to allow re-fetch
      await fetchUserProfile(user.id, user.email, user.user_metadata);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let refreshFailCount = 0;
    const MAX_REFRESH_FAILS = 3;
    
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;

        // If getSession returned an error or the session is null but we had a stored session,
        // it means the token refresh failed
        if (sessionError) {
          console.warn('Session retrieval error:', sessionError.message);
          const isNetworkError = sessionError.message?.includes('Failed to fetch') || 
                                  sessionError.message?.includes('NetworkError') ||
                                  sessionError.message?.includes('AbortError');
          if (isNetworkError && hasStoredSession()) {
            console.warn('Network error during session init - clearing stale session');
            clearStaleSession();
          }
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(
            session.user.id, 
            session.user.email, 
            session.user.user_metadata
          );
        }
      } catch (error: any) {
        console.warn('Error initializing auth:', error);
        // If we get a network error during init, clear stale session to prevent loops
        const isNetworkError = error?.message?.includes('Failed to fetch') || 
                                error?.message?.includes('NetworkError') ||
                                error?.message?.includes('AbortError');
        if (isNetworkError && hasStoredSession()) {
          console.warn('Network error during auth init - clearing stale session to prevent loops');
          clearStaleSession();
        }
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      // Handle token refresh failures
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh returned no session - clearing auth state');
        refreshFailCount++;
        if (refreshFailCount >= MAX_REFRESH_FAILS) {
          console.warn(`Token refresh failed ${refreshFailCount} times - clearing stale session`);
          clearStaleSession();
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setIsSuperAdmin(false);
          refreshFailCount = 0;
        }
        return;
      }

      // Handle explicit sign out
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setIsSuperAdmin(false);
        return;
      }

      // Reset fail count on successful refresh
      if (event === 'TOKEN_REFRESHED' && session) {
        refreshFailCount = 0;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to avoid race condition with initAuth
        setTimeout(() => {
          if (mountedRef.current) {
            fetchUserProfile(
              session.user.id,
              session.user.email,
              session.user.user_metadata
            );
          }
        }, 100);
      } else if (event !== 'INITIAL_SESSION') {
        // Only clear profile for non-initial events when there's no session
        setUserProfile(null);
        setIsSuperAdmin(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);


  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole = 'user',
    companyData?: {
      company?: string;
      company_registration_number?: string;
      company_address?: string;
      company_country?: string;
    }
  ) => {
    try {
      // Auto-assign admin role for super admin emails
      const isSA = checkSuperAdmin(email);
      const finalRole = isSA ? 'admin' : role;

      const { data, error } = await withRetry(() => 
        supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: fullName, role: finalRole }
          }
        })
      );
      
      if (error) {
        return { data: null, error: { ...error, message: formatAuthError(error) } };
      }
      
      if (data.user) {
        const profileData = {
          id: data.user.id,
          email,
          full_name: fullName,
          role: finalRole,
          is_super_admin: isSA,
          ...companyData
        };
        
        // Non-blocking profile creation
        supabase.from('users').upsert(profileData, { onConflict: 'id' }).then(() => {}).catch(() => {});
        
        // Non-blocking audit log
        logAuditEventAsync('signup', { email, full_name: fullName, role: finalRole, is_super_admin: isSA });
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { 
        data: null, 
        error: { message: formatAuthError(error) } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await withRetry(() => 
        supabase.auth.signInWithPassword({ email, password })
      );
      
      if (result.error) {
        return { 
          data: null, 
          error: { ...result.error, message: formatAuthError(result.error) } 
        };
      }

      // Non-blocking audit and admin update
      const isSA = checkSuperAdmin(email);
      logAuditEventAsync('login', { email, is_super_admin: isSA });
      
      if (isSA) {
        supabase
          .from('admin_privileges')
          .update({ last_login: new Date().toISOString() })
          .eq('email', email.toLowerCase().trim())
          .then(() => {})
          .catch(() => {});
      }
      
      return result;
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { 
        data: null, 
        error: { message: formatAuthError(error) } 
      };
    }
  };

  const signOut = async () => {
    // Non-blocking audit log
    logAuditEventAsync('logout', {});
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out error:', error);
    }
    
    setUserProfile(null);
    setUser(null);
    setSession(null);
    setIsSuperAdmin(false);
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await withRetry(() =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        })
      );
      
      if (error) {
        return { data: null, error: { ...error, message: formatAuthError(error) } };
      }
      
      logAuditEventAsync('password_reset_requested', { email });
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { 
        data: null, 
        error: { message: formatAuthError(error) } 
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await withRetry(() =>
        supabase.auth.updateUser({ password: newPassword })
      );
      
      if (error) {
        return { data: null, error: { ...error, message: formatAuthError(error) } };
      }
      
      logAuditEventAsync('password_updated', {});
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Update password error:', error);
      return { 
        data: null, 
        error: { message: formatAuthError(error) } 
      };
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' };
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...profileData, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
      
      if (!error && data) {
        setUserProfile(data);
        logAuditEventAsync('profile_updated', { fields: Object.keys(profileData) });
      }
      
      return { data, error };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return { data: null, error };
    }
  };

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!userProfile) return false;
    // Super admins have access to everything
    if (isSuperAdmin) return true;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(userProfile.role);
  };

  const hasPermission = (permission: string) => {
    if (!userProfile) return false;
    // Super admins have all permissions
    if (isSuperAdmin) return true;
    const permissions = ROLE_PERMISSIONS[userProfile.role] || [];
    return permissions.includes('all') || permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userProfile, 
      loading, 
      isSuperAdmin,
      signUp, 
      signIn, 
      signOut, 
      resetPassword,
      updatePassword,
      updateProfile, 
      hasRole,
      hasPermission,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
