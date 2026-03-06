/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('AUTH_DEBUG: Provider mounted');
        let mounted = true;

        const initializeAuth = async () => {
            // Add a safety timeout — if Supabase hangs (e.g. multi-tab lock conflict), 
            // we still stop the loading spinner after 5 seconds.
            const timeout = setTimeout(() => {
                if (mounted) {
                    console.log('AUTH_DEBUG: Safety timeout reached');
                    setLoading(false);
                }
            }, 5000);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log('AUTH_DEBUG: Got session:', !!session);
                if (!mounted) return;

                if (session?.user) {
                    console.log('AUTH_DEBUG: Loading profile for:', session.user.id);
                    await loadUserProfile(session.user);
                } else {
                    console.log('AUTH_DEBUG: No session, stopping loading');
                    setLoading(false);
                }
            } catch (err) {
                console.warn('AUTH_DEBUG: Init error:', err);
                if (mounted) setLoading(false);
            } finally {
                clearTimeout(timeout);
                console.log('AUTH_DEBUG: Init finished');
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;
                console.log('AUTH_DEBUG: Auth state change:', event);
                if (event === 'SIGNED_IN' && session?.user) {
                    await loadUserProfile(session?.user);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const loadUserProfile = async (authUser: AuthUser) => {
        console.log('AUTH_DEBUG: Starting profile load');

        // Helper to wrap supabase queries with a timeout
        const queryWithTimeout = async <T,>(query: Promise<T>, timeoutMs = 3000): Promise<T> => {
            return Promise.race([
                query,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
                )
            ]);
        };

        try {
            // First check if it's an admin via the admins table
            console.log('AUTH_DEBUG: Checking admins table...');
            const adminResult = await queryWithTimeout(
                supabase.from('admins').select('*').eq('id', authUser.id).single()
            );
            const adminData = (adminResult as any).data;

            if (adminData) {
                console.log('AUTH_DEBUG: Admin profile found');
                setUser({
                    id: adminData.id,
                    email: adminData.email,
                    role: adminData.role,
                    first_name: adminData.name.split(' ')[0] || '',
                    last_name: adminData.name.split(' ')[1] || '',
                });
                return;
            }

            // If not in admins table, check members table
            console.log('AUTH_DEBUG: Checking members table...');
            const memberResult = await queryWithTimeout(
                supabase.from('members').select('*').eq('id', authUser.id).single()
            );
            const memberData = (memberResult as any).data;

            if (memberData) {
                console.log('AUTH_DEBUG: Member profile found');
                setUser({
                    id: memberData.id,
                    email: memberData.email,
                    role: 'member',
                    first_name: memberData.first_name,
                    last_name: memberData.last_name,
                });
                return;
            }

            // Fallback: use JWT user_metadata
            console.log('AUTH_DEBUG: Using metadata fallback');
            const meta = authUser.user_metadata;
            if (meta?.role) {
                setUser({
                    id: authUser.id,
                    email: authUser.email || '',
                    role: meta.role as User['role'],
                    first_name: meta.first_name || authUser.email?.split('@')[0] || 'Usuario',
                    last_name: meta.last_name || '',
                });
            }
        } catch (error) {
            console.error('AUTH_DEBUG: Profile load error or timeout:', error);
            // Even on timeout, try to use metadata if available so user isn't stuck
            const meta = authUser.user_metadata;
            if (meta?.role) {
                setUser({
                    id: authUser.id,
                    email: authUser.email || '',
                    role: meta.role as User['role'],
                    first_name: meta.first_name || authUser.email?.split('@')[0] || 'Usuario',
                    last_name: meta.last_name || '',
                });
            }
        } finally {
            console.log('AUTH_DEBUG: Setting loading to false');
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
