import { Suspense } from 'react';
import NewServiceForm from '@/components/NewServiceForm';

export default function NewServicePage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-black mb-6 text-slate-900 dark:text-white tracking-tight">Add New Service</h1>
      <Suspense fallback={<div className="p-12 text-center text-slate-500 animate-pulse">Loading form...</div>}>
        <NewServiceForm />
      </Suspense>
    </div>
  );
}
