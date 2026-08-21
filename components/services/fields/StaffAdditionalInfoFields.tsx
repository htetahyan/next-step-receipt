'use client';

import React from 'react';
import { FormField } from '@/components/ui/form/FormField';

export function StaffAdditionalInfoFields() {
  return (
    <div className="card-anthropic p-6">
      <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
        Staff & Additional Info
      </h3>
      <div className="space-y-4">
        <FormField
          name="details.handled_by"
          label="Handled By / Served By (Staff)"
          placeholder="e.g. Staff Name"
        />
        <FormField
          name="details.referred_by"
          label="Referred By (B2B/Agent)"
          placeholder="e.g. Agent Name"
        />
        <FormField
          name="details.comments"
          label="Comments"
          component="textarea"
          placeholder="General notes or customer instructions"
        />
        <FormField
          name="details.remark"
          label="Admin Remark (Private)"
          component="textarea"
          placeholder="Internal notes visible only to admins"
        />
      </div>
    </div>
  );
}
