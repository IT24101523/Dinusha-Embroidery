'use server';

import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { checkErpSessionAction } from '@/actions/auth';
import { recordAuditLog } from '@/lib/audit';

export interface BillingCustomer {
  id: string;
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
  notes: string;
  source?: 'ERP_COMPANY' | 'CUSTOM';
}

export interface BillingCatalogItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  rate: number;
  currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
  unit: string;
  source?: 'PRODUCTION_STYLE' | 'CUSTOM';
  defaultOrderQty?: number;
}

export interface BillingLineItem {
  id: string;
  styleCode: string;
  itemName: string;
  description: string; // e.g. "2 pass / Front Left Chest"
  orderQty: number; // Panels / garments received or ordered
  missingPanelsQty: number; // Missing panels / shortage at receiving
  damagedQty: number; // Embroidery / QC damages or rejects
  freeSampleQty: number; // Free sample / allowance pieces
  qty: number; // Final Billable Quantity
  unit: string;
  rate: number;
  taxPercent: number;
  amount: number;
}

export type QuoteStatusType = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'INVOICED' | 'DECLINED';
export type InvoiceStatusType = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'VOID';

export interface BillingQuote {
  id: string;
  quoteNumber: string;
  referenceNumber: string;
  customerId: string;
  customerName: string;
  companyName: string;
  billingAddress: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTaxNo?: string;
  supplierTaxNo?: string;
  isTaxInvoice?: boolean;
  quoteDate: string;
  expiryDate: string;
  salesperson: string;
  subject: string;
  status: QuoteStatusType;
  lineItems: BillingLineItem[];
  subTotal: number;
  taxTotal?: number;
  discountValue: number;
  discountType: 'PERCENT' | 'AMOUNT';
  shippingCharges: number;
  adjustmentLabel: string;
  adjustmentAmount: number;
  totalAmount: number;
  customerNotes: string;
  termsAndConditions: string;
  convertedInvoiceId: string | null;
  createdAt: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  companyName: string;
  billingAddress: string;
  shippingAddress: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTaxNo?: string;
  supplierTaxNo?: string;
  isTaxInvoice?: boolean;
  invoiceDate: string;
  paymentTerms: string;
  dueDate: string;
  salesperson: string;
  subject: string;
  status: InvoiceStatusType;
  lineItems: BillingLineItem[];
  subTotal: number;
  taxTotal?: number;
  discountValue: number;
  discountType: 'PERCENT' | 'AMOUNT';
  shippingCharges: number;
  adjustmentLabel: string;
  adjustmentAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card / Online' | string;
  paymentReference?: string;
  customerNotes: string;
  termsAndConditions: string;
  createdAt: string;
}

export interface BillingBundle {
  cloudReady: boolean;
  customers: BillingCustomer[];
  items: BillingCatalogItem[];
  quotes: BillingQuote[];
  invoices: BillingInvoice[];
}

const DEFAULT_DINUSHA_TERMS = `1. A 50% advance is required to begin processing your custom clothing / embroidery order.
2. The remaining balance is due upon completion or delivery of the order.
3. Orders will not be processed or produced until the advance payment is received.
4. Any missing panels or factory-verified garment damages are reconciled against the original cut/order quantity prior to final billing.`;

async function ensureBillingSession() {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    return { ok: false as const, error: 'Authentication required' };
  }
  if (!session.allowedModules.includes('quotations') && !session.allowedModules.includes('finance')) {
    return { ok: false as const, error: 'You do not have access to Invoices & Quotations' };
  }
  return { ok: true as const, session };
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const msg = String((err as { message?: string }).message || '');
  return code === 'PGRST205' || msg.includes('Could not find the table');
}

function parseLineItems(raw: unknown): BillingLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const row = (item || {}) as Record<string, unknown>;
    const orderQty = Number(row.orderQty) || 0;
    const missingPanelsQty = Number(row.missingPanelsQty) || 0;
    const damagedQty = Number(row.damagedQty) || 0;
    const freeSampleQty = Number(row.freeSampleQty) || 0;
    const qty = Number(row.qty) || 0;
    const rate = Number(row.rate) || 0;
    const taxPercent = Number(row.taxPercent) || 0;
    const baseAmt = qty * rate;
    const amount = Number(row.amount) || baseAmt + (baseAmt * taxPercent) / 100;
    return {
      id: String(row.id || `line-${idx}`),
      styleCode: String(row.styleCode || ''),
      itemName: String(row.itemName || ''),
      description: String(row.description || ''),
      orderQty,
      missingPanelsQty,
      damagedQty,
      freeSampleQty,
      qty,
      unit: String(row.unit || 'pcs'),
      rate,
      taxPercent,
      amount,
    };
  });
}

export async function fetchBillingBundleAction(): Promise<{
  success: boolean;
  data?: BillingBundle;
  error?: string;
}> {
  try {
    const auth = await ensureBillingSession();
    if (!auth.ok) return { success: false, error: auth.error };

    const [custRes, itemRes, quoteRes, invRes] = await Promise.all([
      supabaseAdmin.from('billing_customers').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('billing_items').select('*').order('name', { ascending: true }),
      supabaseAdmin.from('billing_quotes').select('*').order('quote_date', { ascending: false }),
      supabaseAdmin.from('billing_invoices').select('*').order('invoice_date', { ascending: false }),
    ]);

    const firstErr = custRes.error || itemRes.error || quoteRes.error || invRes.error;
    if (firstErr) {
      if (isMissingTableError(firstErr)) {
        return {
          success: true,
          data: {
            cloudReady: false,
            customers: [],
            items: [],
            quotes: [],
            invoices: [],
          },
        };
      }
      return { success: false, error: formatSupabaseError(firstErr) };
    }

    return {
      success: true,
      data: {
        cloudReady: true,
        customers: (custRes.data || []).map((c) => ({
          id: String(c.id),
          customerName: String(c.customer_name || ''),
          companyName: String(c.company_name || ''),
          email: String(c.email || ''),
          phone: String(c.phone || ''),
          billingAddress: String(c.billing_address || ''),
          shippingAddress: String(c.shipping_address || ''),
          notes: String(c.notes || ''),
          source: 'CUSTOM',
        })),
        items: (itemRes.data || []).map((i) => ({
          id: String(i.id),
          name: String(i.name || ''),
          sku: String(i.sku || ''),
          description: String(i.description || ''),
          rate: Number(i.rate) || 0,
          currency: (['LKR', 'USD', 'EUR', 'GBP'].includes(String(i.currency))
            ? String(i.currency)
            : 'LKR') as BillingCatalogItem['currency'],
          unit: String(i.unit || 'pcs'),
          source: 'CUSTOM',
        })),
        quotes: (quoteRes.data || []).map((q) => ({
          id: String(q.id),
          quoteNumber: String(q.quote_number || ''),
          referenceNumber: String(q.reference_number || ''),
          customerId: String(q.customer_id || ''),
          customerName: String(q.customer_name || ''),
          companyName: String(q.company_name || ''),
          billingAddress: String(q.billing_address || ''),
          quoteDate: String(q.quote_date || ''),
          expiryDate: String(q.expiry_date || ''),
          salesperson: String(q.salesperson || ''),
          subject: String(q.subject || ''),
          status: (q.status || 'DRAFT') as QuoteStatusType,
          lineItems: parseLineItems(q.line_items),
          subTotal: Number(q.sub_total) || 0,
          discountValue: Number(q.discount_value) || 0,
          discountType: q.discount_type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
          shippingCharges: Number(q.shipping_charges) || 0,
          adjustmentLabel: String(q.adjustment_label || 'Free T-shirt / Sample Adj.'),
          adjustmentAmount: Number(q.adjustment_amount) || 0,
          totalAmount: Number(q.total_amount) || 0,
          customerNotes: String(q.customer_notes || ''),
          termsAndConditions: String(q.terms_and_conditions || DEFAULT_DINUSHA_TERMS),
          convertedInvoiceId: q.converted_invoice_id ? String(q.converted_invoice_id) : null,
          createdAt: String(q.created_at || ''),
        })),
        invoices: (invRes.data || []).map((inv) => ({
          id: String(inv.id),
          invoiceNumber: String(inv.invoice_number || ''),
          orderNumber: String(inv.order_number || ''),
          quoteNumber: String(inv.quote_number || ''),
          customerId: String(inv.customer_id || ''),
          customerName: String(inv.customer_name || ''),
          companyName: String(inv.company_name || ''),
          billingAddress: String(inv.billing_address || ''),
          shippingAddress: String(inv.shipping_address || ''),
          invoiceDate: String(inv.invoice_date || ''),
          paymentTerms: String(inv.payment_terms || 'Due On Receipt'),
          dueDate: String(inv.due_date || ''),
          salesperson: String(inv.salesperson || ''),
          subject: String(inv.subject || ''),
          status: (inv.status || 'DRAFT') as InvoiceStatusType,
          lineItems: parseLineItems(inv.line_items),
          subTotal: Number(inv.sub_total) || 0,
          discountValue: Number(inv.discount_value) || 0,
          discountType: inv.discount_type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
          shippingCharges: Number(inv.shipping_charges) || 0,
          adjustmentLabel: String(inv.adjustment_label || 'Damage / Sample Deduction'),
          adjustmentAmount: Number(inv.adjustment_amount) || 0,
          totalAmount: Number(inv.total_amount) || 0,
          amountPaid: Number(inv.amount_paid) || 0,
          balanceDue: Number(inv.balance_due) || 0,
          customerNotes: String(inv.customer_notes || ''),
          termsAndConditions: String(inv.terms_and_conditions || DEFAULT_DINUSHA_TERMS),
          createdAt: String(inv.created_at || ''),
        })),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load billing bundle',
    };
  }
}

export async function saveBillingCustomerAction(
  input: Omit<BillingCustomer, 'id' | 'source'>
): Promise<{ success: boolean; data?: BillingCustomer; error?: string }> {
  const auth = await ensureBillingSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await supabaseAdmin
    .from('billing_customers')
    .insert({
      customer_name: input.customerName,
      company_name: input.companyName,
      email: input.email,
      phone: input.phone,
      billing_address: input.billingAddress,
      shipping_address: input.shippingAddress,
      notes: input.notes,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  return {
    success: true,
    data: {
      id: String(data.id),
      customerName: String(data.customer_name),
      companyName: String(data.company_name),
      email: String(data.email),
      phone: String(data.phone),
      billingAddress: String(data.billing_address),
      shippingAddress: String(data.shipping_address),
      notes: String(data.notes),
      source: 'CUSTOM',
    },
  };
}

export async function saveBillingCatalogItemAction(
  input: Omit<BillingCatalogItem, 'id' | 'source'>
): Promise<{ success: boolean; data?: BillingCatalogItem; error?: string }> {
  const auth = await ensureBillingSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await supabaseAdmin
    .from('billing_items')
    .insert({
      name: input.name,
      sku: input.sku,
      description: input.description,
      rate: input.rate,
      currency: input.currency,
      unit: input.unit,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  return {
    success: true,
    data: {
      id: String(data.id),
      name: String(data.name),
      sku: String(data.sku),
      description: String(data.description),
      rate: Number(data.rate),
      currency: (data.currency || 'LKR') as BillingCatalogItem['currency'],
      unit: String(data.unit || 'pcs'),
      source: 'CUSTOM',
    },
  };
}

export async function saveBillingQuoteAction(
  input: Omit<BillingQuote, 'id' | 'createdAt'> & { id?: string }
): Promise<{ success: boolean; data?: BillingQuote; error?: string }> {
  const auth = await ensureBillingSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const rowPayload = {
    quote_number: input.quoteNumber,
    reference_number: input.referenceNumber,
    customer_id: input.customerId || null,
    customer_name: input.customerName,
    company_name: input.companyName,
    billing_address: input.billingAddress,
    quote_date: input.quoteDate,
    expiry_date: input.expiryDate || null,
    salesperson: input.salesperson,
    subject: input.subject,
    status: input.status,
    line_items: input.lineItems,
    sub_total: input.subTotal,
    discount_value: input.discountValue,
    discount_type: input.discountType,
    shipping_charges: input.shippingCharges,
    adjustment_label: input.adjustmentLabel,
    adjustment_amount: input.adjustmentAmount,
    total_amount: input.totalAmount,
    customer_notes: input.customerNotes,
    terms_and_conditions: input.termsAndConditions,
    converted_invoice_id: input.convertedInvoiceId,
  };

  const query = input.id && !input.id.startsWith('local-')
    ? supabaseAdmin.from('billing_quotes').update(rowPayload).eq('id', input.id).select('*').single()
    : supabaseAdmin.from('billing_quotes').insert(rowPayload).select('*').single();

  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'quotations',
    action: 'save_quote',
    summary: `Saved quotation ${input.quoteNumber} for ${input.customerName} (LKR ${input.totalAmount.toLocaleString()})`,
    metadata: { quoteNumber: input.quoteNumber },
  });

  return {
    success: true,
    data: {
      ...input,
      id: String(data.id),
      createdAt: String(data.created_at),
    },
  };
}

export async function saveBillingInvoiceAction(
  input: Omit<BillingInvoice, 'id' | 'createdAt'> & { id?: string }
): Promise<{ success: boolean; data?: BillingInvoice; error?: string }> {
  const auth = await ensureBillingSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const rowPayload = {
    invoice_number: input.invoiceNumber,
    order_number: input.orderNumber,
    quote_number: input.quoteNumber,
    customer_id: input.customerId || null,
    customer_name: input.customerName,
    company_name: input.companyName,
    billing_address: input.billingAddress,
    shipping_address: input.shippingAddress,
    invoice_date: input.invoiceDate,
    payment_terms: input.paymentTerms,
    due_date: input.dueDate,
    salesperson: input.salesperson,
    subject: input.subject,
    status: input.status,
    line_items: input.lineItems,
    sub_total: input.subTotal,
    discount_value: input.discountValue,
    discount_type: input.discountType,
    shipping_charges: input.shippingCharges,
    adjustment_label: input.adjustmentLabel,
    adjustment_amount: input.adjustmentAmount,
    total_amount: input.totalAmount,
    amount_paid: input.amountPaid,
    balance_due: input.balanceDue,
    customer_notes: input.customerNotes,
    terms_and_conditions: input.termsAndConditions,
  };

  const query = input.id && !input.id.startsWith('local-')
    ? supabaseAdmin.from('billing_invoices').update(rowPayload).eq('id', input.id).select('*').single()
    : supabaseAdmin.from('billing_invoices').insert(rowPayload).select('*').single();

  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'quotations',
    action: 'save_invoice',
    summary: `Saved invoice ${input.invoiceNumber} for ${input.customerName} (Total: LKR ${input.totalAmount.toLocaleString()}, Balance: LKR ${input.balanceDue.toLocaleString()})`,
    metadata: { invoiceNumber: input.invoiceNumber },
  });

  return {
    success: true,
    data: {
      ...input,
      id: String(data.id),
      createdAt: String(data.created_at),
    },
  };
}

export async function deleteBillingDocumentAction(
  table: 'billing_quotes' | 'billing_invoices' | 'billing_customers' | 'billing_items',
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureBillingSession();
  if (!auth.ok) return { success: false, error: auth.error };

  if (id.startsWith('local-')) return { success: true };

  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  return { success: true };
}
