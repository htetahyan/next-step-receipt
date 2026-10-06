import AirTicketForm from '../new/air-ticket-form';
import { getServiceEditPageData } from '@/lib/service-data';
import { redirect } from 'next/navigation';
import { moduleEditPath } from '@/lib/service-constants';

export default async function EditAirTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { service, currentUser, customers, suppliers } = await getServiceEditPageData(id);
  const correctPath = moduleEditPath(service);
  if (!correctPath.startsWith('/dashboard/air-tickets/')) {
    redirect(correctPath);
  }

  return (
    <>
      <AirTicketForm 
        customers={customers} 
        suppliers={suppliers} 
        initialData={service} 
        currentUser={currentUser} 
      />
    </>
  );
}
