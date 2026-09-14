'use client';

import { useEffect, Dispatch, SetStateAction } from 'react';
import { searchServices } from '@/app/actions/services';

export function useRemoteServiceSearch(
  search: string,
  setServices: Dispatch<SetStateAction<any[]>>,
  filter: { inCategories?: string[]; notInCategories?: string[] }
) {
  const inKey = (filter.inCategories || []).join('|');
  const outKey = (filter.notInCategories || []).join('|');

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) return;

    const timer = setTimeout(async () => {
      const res = await searchServices(q, {
        inCategories: filter.inCategories,
        notInCategories: filter.notInCategories,
      });
      if (!res.data?.length) return;
      setServices((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        res.data!.forEach((s: any) => map.set(s.id, s));
        return Array.from(map.values());
      });
    }, 280);

    return () => clearTimeout(timer);
    // filter arrays are represented by inKey/outKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, inKey, outKey, setServices]);
}
