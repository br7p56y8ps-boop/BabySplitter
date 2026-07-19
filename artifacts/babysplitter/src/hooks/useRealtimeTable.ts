import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeTable<T extends { id: string }>(
  tableName: string,
  orderBy = 'created_at',
  ascending = false
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const { data: result, error: err } = await supabase
          .from(tableName)
          .select('*')
          .order(orderBy, { ascending });

        if (err) throw err;
        if (isMounted) {
          setData(result as T[]);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchData();

    const channel = supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setData((prev) => {
            if (prev.find((item) => item.id === payload.new.id)) return prev;
            return ascending ? [...prev, payload.new as T] : [payload.new as T, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          setData((prev) =>
            prev.map((item) => (item.id === payload.new.id ? (payload.new as T) : item))
          );
        } else if (payload.eventType === 'DELETE') {
          setData((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [tableName, orderBy, ascending]);

  return { data, loading, error };
}
