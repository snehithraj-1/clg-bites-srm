import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('cb_admin_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'super_admin' || parsed.role === 'admin' || parsed.role === 'restaurant_admin')) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [unauthorizedError, setUnauthorizedError] = useState('');

  // Persist admin session
  useEffect(() => {
    try {
      if (profile && (profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'restaurant_admin')) {
        localStorage.setItem('cb_admin_profile', JSON.stringify(profile));
      } else {
        localStorage.removeItem('cb_admin_profile');
      }
    } catch (e) {
      console.error(e);
    }
  }, [profile]);

  // Initial Supabase Session Check
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await verifyAndSetAdmin(session.user);
        }
      } catch (err) {
        console.warn('Admin session check error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await verifyAndSetAdmin(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const verifyAndSetAdmin = async (authUser) => {
    if (!supabase) return false;

    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !userProfile) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setUnauthorizedError('Unauthorized access. Only authorized administrators can access this portal.');
        return false;
      }

      const validRoles = ['admin', 'super_admin', 'restaurant_admin'];
      if (!validRoles.includes(userProfile.role)) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setUnauthorizedError('Unauthorized access. Access restricted to authorized administrative staff.');
        return false;
      }

      setUser(authUser);
      setProfile(userProfile);
      setUnauthorizedError('');
      return true;
    } catch (err) {
      setUnauthorizedError('Failed to verify administrator credentials.');
      return false;
    }
  };

  // Multi-Role Admin Login: Supports Super Admin, Local Home Kitchen, CLG Bites
  const loginAdmin = async (identifier, password) => {
    setUnauthorizedError('');

    const cleanInput = identifier ? identifier.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    if (!cleanInput || !cleanPassword) {
      return { success: false, error: 'Please enter username/email and password.' };
    }

    // 1. Authenticate via Backend API
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanInput, email: cleanInput, password: cleanPassword })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfile(data.user);
        setUser({ id: data.user.id, email: data.user.email, role: data.user.role });
        setUnauthorizedError('');
        try {
          localStorage.setItem('cb_admin_profile', JSON.stringify(data.user));
        } catch {}
        return { success: true, user: data.user };
      } else {
        return {
          success: false,
          error: data.error || 'Invalid administrator credentials. Access restricted to authorized staff.'
        };
      }
    } catch (apiErr) {
      // Direct credential fallback check
      const lowerInput = cleanInput.toLowerCase();
      if ((lowerInput === 'collagebites1@gmail.com' || lowerInput === 'collagebites@gmail.com' || lowerInput === 'rajsrmap2@gmail.com' || lowerInput === 'superadmin' || lowerInput === 'admin@collegebites.com' || lowerInput === 'admin@campusbites.com') && (cleanPassword === 'Clgbites123' || cleanPassword === 'Snehith@007' || cleanPassword === 'admin123')) {
        const superProfile = {
          id: 'admin-super',
          username: 'collagebites1@gmail.com',
          name: 'Srm : College Bites (Super Admin)',
          email: 'collagebites1@gmail.com',
          role: 'super_admin',
          restaurant_id: null,
          created_at: new Date().toISOString()
        };
        setProfile(superProfile);
        setUser({ id: superProfile.id, email: superProfile.email });
        try { localStorage.setItem('cb_admin_profile', JSON.stringify(superProfile)); } catch {}
        return { success: true, user: superProfile };
      }

      if ((lowerInput === 'lhk_admin' || lowerInput === 'lhk@collegebites.com' || lowerInput === 'lhk@campusbites.com') && cleanPassword === 'LHK@Campus2026') {
        const lhkProfile = {
          id: 'admin-lhk',
          username: 'lhk_admin',
          name: 'Local Home Kitchen Staff',
          email: 'lhk@collegebites.com',
          role: 'restaurant_admin',
          restaurant_id: 'local-home-kitchen',
          created_at: new Date().toISOString()
        };
        setProfile(lhkProfile);
        setUser({ id: lhkProfile.id, email: lhkProfile.email });
        try { localStorage.setItem('cb_admin_profile', JSON.stringify(lhkProfile)); } catch {}
        return { success: true, user: lhkProfile };
      }

      if ((lowerInput === 'clgbites_admin' || lowerInput === 'clg@collegebites.com' || lowerInput === 'clg@campusbites.com') && cleanPassword === 'CLG@Campus2026') {
        const clgProfile = {
          id: 'admin-clg',
          username: 'clgbites_admin',
          name: 'CLG Bites Staff',
          email: 'clg@collegebites.com',
          role: 'restaurant_admin',
          restaurant_id: 'clg-bites-biryani-nation',
          created_at: new Date().toISOString()
        };
        setProfile(clgProfile);
        setUser({ id: clgProfile.id, email: clgProfile.email });
        try { localStorage.setItem('cb_admin_profile', JSON.stringify(clgProfile)); } catch {}
        return { success: true, user: clgProfile };
      }

      return {
        success: false,
        error: 'Invalid administrator credentials. Access restricted to authorized campus staff.'
      };
    }
  };

  // Logout
  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {}
    }
    setUser(null);
    setProfile(null);
    setUnauthorizedError('');
    try {
      localStorage.removeItem('cb_admin_profile');
    } catch {}
  };

  const isSuperAdmin = profile?.role === 'super_admin' || (profile?.role === 'admin' && !profile?.restaurant_id);
  const isRestaurantAdmin = profile?.role === 'restaurant_admin' || Boolean(profile?.restaurant_id);
  const assignedRestaurantId = profile?.restaurant_id || null;

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: Boolean(profile && (profile.role === 'super_admin' || profile.role === 'restaurant_admin' || profile.role === 'admin')),
        isSuperAdmin,
        isRestaurantAdmin,
        assignedRestaurantId,
        unauthorizedError,
        setUnauthorizedError,
        loginAdmin,
        logout,
        isConfigured: isSupabaseConfigured()
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
