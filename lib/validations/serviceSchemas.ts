import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().optional().nullable().or(z.literal('')),
  passport_no: z.string().optional().nullable().or(z.literal('')),
});

export const baseFinancialsSchema = z.object({
  amount: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  supplier_cost: z.coerce.number().min(0).default(0),
  refund: z.coerce.number().min(0).default(0),
  payment_method: z.string().default('Bank Transfer'),
});

export const baseServiceSchema = z.object({
  customerId: z.string().optional().nullable().or(z.literal('')),
  isNewCustomer: z.boolean().default(false),
  newCustomer: customerSchema.optional().nullable(),
  status: z.string().default('Open'),
}).superRefine((data, ctx) => {
  if (!data.isNewCustomer && (!data.customerId || data.customerId.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select an existing customer or create a new one',
      path: ['customerId'],
    });
  }
  if (data.isNewCustomer && (!data.newCustomer?.name || data.newCustomer.name.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Customer name is required for new customers',
      path: ['newCustomer', 'name'],
    });
  }
});

export const uaeVisaSchema = baseServiceSchema.extend({
  category: z.string().default('Visit Visa (30 Days)'),
  details: z.object({
    visa_issued_date: z.string().optional().nullable().or(z.literal('')),
    travel_date: z.string().optional().nullable().or(z.literal('')),
    visa_expiry_date: z.string().optional().nullable().or(z.literal('')),
    visa_supplier: z.string().optional().nullable().or(z.literal('')),
    visa_duration: z.string().optional().nullable().or(z.literal('')),
    payment_method: z.string().optional().nullable().or(z.literal('')),
    handled_by: z.string().optional().nullable().or(z.literal('')),
    referred_by: z.string().optional().nullable().or(z.literal('')),
    comments: z.string().optional().nullable().or(z.literal('')),
    remark: z.string().optional().nullable().or(z.literal('')),
  }).passthrough(),
  financials: baseFinancialsSchema,
});

export const airTicketSchema = baseServiceSchema.extend({
  category: z.string().default('One Way'),
  details: z.object({
    travel_date: z.string().optional().nullable().or(z.literal('')),
    return_date: z.string().optional().nullable().or(z.literal('')),
    airline: z.string().optional().nullable().or(z.literal('')),
    supplier_name: z.string().optional().nullable().or(z.literal('')),
    pnr: z.string().optional().nullable().or(z.literal('')),
    ticket_no: z.string().optional().nullable().or(z.literal('')),
    sector: z.string().optional().nullable().or(z.literal('')),
    destination: z.string().optional().nullable().or(z.literal('')),
    departure_time: z.string().optional().nullable().or(z.literal('')),
    booking_date: z.string().optional().nullable().or(z.literal('')),
    handled_by: z.string().optional().nullable().or(z.literal('')),
    referred_by: z.string().optional().nullable().or(z.literal('')),
    comments: z.string().optional().nullable().or(z.literal('')),
    remark: z.string().optional().nullable().or(z.literal('')),
  }).passthrough(),
  financials: baseFinancialsSchema,
});

export const otherVisaSchema = baseServiceSchema.extend({
  category: z.string().default('Other Visa'),
  details: z.object({
    visa_supplier: z.string().optional().nullable().or(z.literal('')),
    supplier_name: z.string().optional().nullable().or(z.literal('')),
    travel_date: z.string().optional().nullable().or(z.literal('')),
    visa_type: z.string().optional().nullable().or(z.literal('')),
    appointment_date: z.string().optional().nullable().or(z.literal('')),
    handled_by: z.string().optional().nullable().or(z.literal('')),
    referred_by: z.string().optional().nullable().or(z.literal('')),
    comments: z.string().optional().nullable().or(z.literal('')),
    remark: z.string().optional().nullable().or(z.literal('')),
  }).passthrough(),
  financials: baseFinancialsSchema,
});

export const tourPackageSchema = baseServiceSchema.extend({
  category: z.string().default('Tour Package'),
  details: z.object({
    travel_date: z.string().optional().nullable().or(z.literal('')),
    supplier_name: z.string().optional().nullable().or(z.literal('')),
    tour_plans: z.string().optional().nullable().or(z.literal('')),
    destination: z.string().optional().nullable().or(z.literal('')),
    handled_by: z.string().optional().nullable().or(z.literal('')),
    referred_by: z.string().optional().nullable().or(z.literal('')),
    comments: z.string().optional().nullable().or(z.literal('')),
    remark: z.string().optional().nullable().or(z.literal('')),
  }).passthrough(),
  financials: baseFinancialsSchema,
});

export const customServiceSchema = baseServiceSchema.extend({
  category: z.string().min(1, 'Service name is required'),
  details: z.object({
    description: z.string().optional().nullable().or(z.literal('')),
    supplier_name: z.string().optional().nullable().or(z.literal('')),
    start_date: z.string().optional().nullable().or(z.literal('')),
    end_date: z.string().optional().nullable().or(z.literal('')),
    reference_number: z.string().optional().nullable().or(z.literal('')),
    travel_date: z.string().optional().nullable().or(z.literal('')),
    handled_by: z.string().optional().nullable().or(z.literal('')),
    referred_by: z.string().optional().nullable().or(z.literal('')),
    comments: z.string().optional().nullable().or(z.literal('')),
    remark: z.string().optional().nullable().or(z.literal('')),
  }).passthrough(),
  financials: baseFinancialsSchema,
});

export type UAEVisaFormValues = z.infer<typeof uaeVisaSchema>;
export type AirTicketFormValues = z.infer<typeof airTicketSchema>;
export type OtherVisaFormValues = z.infer<typeof otherVisaSchema>;
export type TourPackageFormValues = z.infer<typeof tourPackageSchema>;
export type CustomServiceFormValues = z.infer<typeof customServiceSchema>;
