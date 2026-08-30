import AirTicketForm from '../new/air-ticket-form';
import { getServiceEditPageData } from '@/lib/service-data';

export default async function EditAirTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { service, currentUser, customers, suppliers } = await getServiceEditPageData(id);

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
