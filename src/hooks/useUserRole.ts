// Hook to get the current user's role from user_roles table

import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

export function useUserRole() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['user-role', user?.id],
        enabled: !!user?.id,
        queryFn: async (): Promise<UserRole> => {
            if (!isSupabaseConfigured || !user) return 'admin' // demo mode = admin
            const { data, error } = await supabase!
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .single()
            if (error || !data) return 'receptionist' // default role
            return data.role as UserRole
        },
        staleTime: 5 * 60 * 1000, // cache for 5 minutes
    })
}

export function useIsAdmin() {
    const { data: role } = useUserRole()
    return role === 'admin'
}

export function useIsPractitioner() {
    const { data: role } = useUserRole()
    return role === 'practitioner' || role === 'admin'
}
