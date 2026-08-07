import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  passport_no: z.string().optional(),
});

export const baseFinancialsSchema = z.object({
  amount: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  supplier_cost: z.coerce.number().min(0).default(0),
  refund: z.coerce.number().min(0).default(0),
  payment_method: z.string().default('Bank Transfer'),
});

export const baseServiceSchema = z.object({
  customerId: z.string().optional(),
  isNewCustomer: z.boolean(),
  newCustomer: customerSchema.optional(),
  status: z.string(),
});

export const uaeVisaSchema = baseServiceSchema.extend({
  category: z.string(),
  details: z.object({
    visa_issued_date: z.string().optional(),
    travel_date: z.string().optional(),
    visa_expiry_date: z.string().optional(),
    visa_supplier: z.string().optional(),
    visa_duration: z.string().optional(),
    payment_method: z.string().optional(),
    referred_by: z.string().optional(),
    comments: z.string().optional(),
    remark: z.string().optional(),
  }),
  financials: baseFinancialsSchema,
});

export const airTicketSchema = baseServiceSchema.extend({
  category: z.string(),
  details: z.object({
    travel_date: z.string().optional(),
    return_date: z.string().optional(),
    airline: z.string().optional(),
    pnr: z.string().optional(),
    ticket_no: z.string().optional(),
    sector: z.string().optional(),
    referred_by: z.string().optional(),
    comments: z.string().optional(),
    remark: z.string().optional(),
  }),
  financials: baseFinancialsSchema,
});

export const otherVisaSchema = baseServiceSchema.extend({
  category: z.string(), // country
  details: z.object({
    travel_date: z.string().optional(),
    visa_type: z.string().optional(),
    appointment_date: z.string().optional(),
    referred_by: z.string().optional(),
    comments: z.string().optional(),
    remark: z.string().optional(),
  }),
  financials: baseFinancialsSchema,
});

export const tourPackageSchema = baseServiceSchema.extend({
  category: z.string(),
  details: z.object({
    travel_date: z.string().optional(),
    supplier_name: z.string().optional(),
    tour_plans: z.string().optional(),
    referred_by: z.string().optional(),
    comments: z.string().optional(),
    remark: z.string().optional(),
  }),
  financials: baseFinancialsSchema,
});

export type UAEVisaFormValues = z.infer<typeof uaeVisaSchema>;
export type AirTicketFormValues = z.infer<typeof airTicketSchema>;
export type OtherVisaFormValues = z.infer<typeof otherVisaSchema>;

export type TourPackageFormValues = z.infer<typeof tourPackageSchema>;
