import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

export async function getPlatformAdminState(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin')
  return !error && data === true
}

export function usePlatformAdmin() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['platform-admin', user?.id],
    queryFn: getPlatformAdminState,
    enabled: Boolean(user),
    staleTime: 30_000,
  })
}
