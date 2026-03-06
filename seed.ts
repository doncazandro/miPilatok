import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log('Starting seed process...');

    // 1. Sign up admin user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'admin@pilates.com',
        password: 'password123',
        options: {
            data: {
                first_name: 'Admin',
                role: 'super_admin'
            }
        }
    });

    if (authError) {
        console.error('Error signing up admin:', authError.message);
        return;
    }

    console.log('Admin user signed up:', authData.user?.id);
}

seed();
