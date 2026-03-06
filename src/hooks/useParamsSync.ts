import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { writeParamsCache } from '@/config/outlierParams';

/**
 * Syncs system_params from database to localStorage cache on app load.
 * This enables non-React utils (outlierParams.ts helpers) to read
 * DB-backed values synchronously via getActiveParams().
 * 
 * Should be mounted once at app root level.
 */
export function useParamsSync() {
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    async function syncFromDb() {
      try {
        const { data, error } = await supabase
          .from('system_params')
          .select('key, value')
          .order('key');

        if (error) {
          console.warn('[useParamsSync] DB fetch failed, using cache:', error.message);
          return;
        }

        if (data && data.length > 0) {
          const dbParams: Record<string, any> = {};
          for (const row of data) {
            dbParams[row.key] = row.value;
          }
          writeParamsCache(dbParams);
          console.log('[useParamsSync] Synced', data.length, 'params from DB');
        }
      } catch (err) {
        console.warn('[useParamsSync] Sync error:', err);
      }
    }

    syncFromDb();
  }, []);
}
