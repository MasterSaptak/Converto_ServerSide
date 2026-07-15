'use client';

import { createClient } from '@/lib/supabase/client';
import { useSharedNotifications } from '@/lib/notifications/useNotifications';
import type { UseNotificationsReturn } from '@/lib/notifications/types';
import { useMemo } from 'react';

export function useNotifications(): UseNotificationsReturn {
  const supabase = useMemo(() => createClient(), []);
  return useSharedNotifications(supabase, {
    mode: 'staff',
    limit: 100
  });
}
