export type UserRole = 'super_admin' | 'center_admin' | 'member';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    first_name: string;
    last_name: string;
}

export interface Center {
    id: string;
    name: string;
    address: string;
    contact_email: string;
    contact_phone: string;
}
