'use client';

import { useState, Dispatch, SetStateAction } from 'react';
import { loadModuleServiceList } from '@/app/actions/services';
import { ListFilter } from '@/lib/service-list-query';

export function useRecordScope(
  setServices: Dispatch<SetStateAction<any[]>>,
  filter: Omit<ListFilter, 'allTime'>
) {
  const [allTime, setAllTime] = useState(false);
  const [loading, setLoading] = useState(false);

  const change = async (next: boolean) => {
    setAllTime(next);
    setLoading(true);
    try {
      const res = await loadModuleServiceList({ ...filter, allTime: next });
      if (res.data) setServices(res.data);
    } finally {
      setLoading(false);
    }
  };

  return { allTime, loading, change };
}
