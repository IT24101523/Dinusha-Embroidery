'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ProductionQuotationEntity,
  QuotationStatus,
  updateQuotationStatusAction,
} from '@/actions/quotations';
import {
  deleteBillingDocumentAction,
  fetchBillingBundleAction,
  saveBillingCatalogItemAction,
  saveBillingCustomerAction,
  saveBillingInvoiceAction,
  saveBillingQuoteAction,
  type BillingCatalogItem,
  type BillingCustomer,
  type BillingInvoice,
  type BillingLineItem,
  type BillingQuote,
  type InvoiceStatusType,
  type QuoteStatusType,
} from '@/actions/billing';
import { saveCompanyAction, type ProductionBundle } from '@/actions/production';
import type { QualityBundle } from '@/actions/quality';
import {
  submitApprovalRequestAction,
  fetchApprovalRequestsAction,
  type ErpApprovalRequestEntity,
} from '@/actions/admin-users';
import { LOCAL_APPROVAL_REQUESTS_KEY } from '@/components/admin/admin-user-management';
import { DocumentPreviewModal } from './invoice-pdf-preview';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cloud,
  Eye,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Layers,
  Lock,
  Mail,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

export type BillingWorkspaceTab = 'invoices' | 'quotes' | 'customers' | 'items' | 'webInquiries';

interface QuotationsManagementProps {
  initialQuotations: ProductionQuotationEntity[];
  productionBundle?: ProductionBundle;
  qualityBundle?: QualityBundle;
  externalSubTab?: BillingWorkspaceTab;
  userRole?: string | null;
  onOpenCustomerRegistration?: () => void;
}

const DEFAULT_DINUSHA_TERMS = `1. A 50% advance is required to begin processing your custom clothing / embroidery order.
2. The remaining balance is due upon completion or delivery of the order.
3. Orders will not be processed or produced until the advance payment is received.`;

const STORAGE_KEYS = {
  customers: 'dinusha_billing_customers_v3',
  items: 'dinusha_billing_items_v3',
  quotes: 'dinusha_billing_quotes_v3',
  invoices: 'dinusha_billing_invoices_v3',
};

const WEB_STATUS_BADGE: Record<QuotationStatus, string> = {
  New: 'bg-sky-50 text-sky-700 border-sky-200',
  Reviewed: 'bg-amber-50 text-amber-700 border-amber-200',
  Quoted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Archived: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatLKR(amount: number): string {
  return `LKR ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function safeReadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function createEmptyLineItem(defaultTax = 0): BillingLineItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    styleCode: '',
    itemName: '',
    description: '',
    orderQty: 1,
    missingPanelsQty: 0,
    damagedQty: 0,
    freeSampleQty: 0,
    qty: 1,
    unit: 'pcs',
    rate: 0,
    taxPercent: defaultTax,
    amount: 0,
  };
}

function computeOverdueDays(dueDate: string, balanceDue: number): number {
  if (!dueDate || balanceDue <= 0) return 0;
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (today <= due) return 0;
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

export function QuotationsManagement({
  initialQuotations,
  productionBundle,
  qualityBundle,
  externalSubTab,
  onOpenCustomerRegistration,
}: QuotationsManagementProps) {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [activeTab, setActiveTab] = useState<BillingWorkspaceTab>(externalSubTab || 'invoices');
  const [cloudReady, setCloudReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    if (externalSubTab) setActiveTab(externalSubTab);
  }, [externalSubTab]);

  // Core billing collections
  const [customCustomers, setCustomCustomers] = useState<BillingCustomer[]>([]);
  const [customItems, setCustomItems] = useState<BillingCatalogItem[]>([]);
  const [quotes, setQuotes] = useState<BillingQuote[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  // Search & filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [quoteSearch, setQuoteSearch] = useState('');

  // Editor modal state ('INVOICE' | 'QUOTE' | null)
  const [editorKind, setEditorKind] = useState<'INVOICE' | 'QUOTE' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  const [isTaxInvoice, setIsTaxInvoice] = useState<boolean>(false);
  const [customerTaxNo, setCustomerTaxNo] = useState<string>('');
  const [supplierTaxNo, setSupplierTaxNo] = useState<string>('');

  const [docNumber, setDocNumber] = useState('');
  const [refOrOrderNumber, setRefOrOrderNumber] = useState('');
  const [linkedQuoteNumber, setLinkedQuoteNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [docDate, setDocDate] = useState(todayIso);
  const [paymentTerms, setPaymentTerms] = useState('Due On Receipt');
  const [dueOrExpiryDate, setDueOrExpiryDate] = useState(todayIso);
  const [salesperson, setSalesperson] = useState('');
  const [subject, setSubject] = useState('');
  const [docStatus, setDocStatus] = useState<string>('DRAFT');
  const [lineItems, setLineItems] = useState<BillingLineItem[]>([createEmptyLineItem()]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [shippingCharges, setShippingCharges] = useState<number>(0);
  const [adjustmentLabel, setAdjustmentLabel] = useState('Free T-shirt / Sample Adj.');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_DINUSHA_TERMS);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<
    | { kind: 'INVOICE'; data: BillingInvoice }
    | { kind: 'QUOTE'; data: BillingQuote }
    | null
  >(null);

  // Quick-add Customer & Item form states
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemRate, setNewItemRate] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');

  // Web Inquiries state
  const [webQuotations, setWebQuotations] = useState<ProductionQuotationEntity[]>(initialQuotations);
  const [webSearch, setWebSearch] = useState('');
  const [webStatusFilter, setWebStatusFilter] = useState<'ALL' | QuotationStatus>('ALL');
  const [selectedWebId, setSelectedWebId] = useState<string | null>(
    initialQuotations[0]?.id || null
  );
  const [editWebStatus, setEditWebStatus] = useState<QuotationStatus>(
    initialQuotations[0]?.status || 'New'
  );
  const [editWebNotes, setEditWebNotes] = useState<string>(
    initialQuotations[0]?.adminNotes || ''
  );
  const [savingWeb, setSavingWeb] = useState(false);

  const editorDialogRef = useRef<HTMLDialogElement>(null);
  const paidReqDialogRef = useRef<HTMLDialogElement>(null);

  // Admin Approval Requests state for Paid Invoices
  const [approvalRequests, setApprovalRequests] = useState<ErpApprovalRequestEntity[]>([]);
  const [paidInvoiceRequestTarget, setPaidInvoiceRequestTarget] = useState<{
    inv: BillingInvoice;
    actionType: 'INVOICE_EDIT' | 'INVOICE_DELETE';
  } | null>(null);
  const [paidInvoiceRequestReason, setPaidInvoiceRequestReason] = useState('');
  const [paidInvoiceReqError, setPaidInvoiceReqError] = useState<string | null>(null);
  const [submittingApprovalReq, setSubmittingApprovalReq] = useState(false);

  const isInvoicePaid = (inv: BillingInvoice): boolean => {
    return (
      inv.status === 'PAID' ||
      (Number(inv.totalAmount) > 0 && Number(inv.balanceDue) <= 0)
    );
  };

  const hasApprovedInvoiceEdit = (inv: BillingInvoice): boolean => {
    return approvalRequests.some(
      (r) =>
        r.requestKind === 'INVOICE_EDIT' &&
        r.status === 'APPROVED' &&
        (r.invoiceId === inv.id || r.invoiceNumber === inv.invoiceNumber)
    );
  };

  const getPendingInvoiceRequest = (
    inv: BillingInvoice
  ): ErpApprovalRequestEntity | undefined => {
    return approvalRequests.find(
      (r) =>
        (r.requestKind === 'INVOICE_EDIT' || r.requestKind === 'INVOICE_DELETE') &&
        r.status === 'PENDING' &&
        (r.invoiceId === inv.id || r.invoiceNumber === inv.invoiceNumber)
    );
  };

  useEffect(() => {
    const dlg = paidReqDialogRef.current;
    if (!dlg) return;
    dlg.setAttribute('closedby', 'any');
    if (paidInvoiceRequestTarget && !dlg.open) {
      dlg.showModal();
    } else if (!paidInvoiceRequestTarget && dlg.open) {
      dlg.close();
    }
  }, [paidInvoiceRequestTarget]);

  const notify = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Load initial billing bundle + approval requests
  useEffect(() => {
    let active = true;
    async function load() {
      const [res, reqRes] = await Promise.all([
        fetchBillingBundleAction(),
        fetchApprovalRequestsAction().catch(() => ({ success: false, requests: [] })),
      ]);
      if (!active) return;

      const localReqs = safeReadLocal<ErpApprovalRequestEntity[]>(
        LOCAL_APPROVAL_REQUESTS_KEY,
        []
      );
      const reqMap = new Map<string, ErpApprovalRequestEntity>();
      (reqRes.requests || []).forEach((r) => reqMap.set(r.id, r));
      localReqs.forEach((r) => {
        if (!reqMap.has(r.id)) reqMap.set(r.id, r);
      });
      const mergedReqs = Array.from(reqMap.values());
      setApprovalRequests(mergedReqs);

      const approvedDeleteIds = new Set(
        mergedReqs
          .filter((r) => r.requestKind === 'INVOICE_DELETE' && r.status === 'APPROVED')
          .flatMap((r) => [r.invoiceId || '', r.invoiceNumber || ''])
          .filter(Boolean)
      );

      if (res.success && res.data && res.data.cloudReady) {
        setCloudReady(true);
        setCustomCustomers(res.data.customers);
        setCustomItems(res.data.items);
        setQuotes(res.data.quotes);
        setInvoices(
          res.data.invoices.filter(
            (inv) =>
              !approvedDeleteIds.has(inv.id) && !approvedDeleteIds.has(inv.invoiceNumber)
          )
        );
      } else {
        setCloudReady(false);
        setCustomCustomers(safeReadLocal(STORAGE_KEYS.customers, []));
        setCustomItems(safeReadLocal(STORAGE_KEYS.items, []));
        setQuotes(safeReadLocal(STORAGE_KEYS.quotes, []));
        const storedInvs = safeReadLocal<BillingInvoice[]>(STORAGE_KEYS.invoices, []);
        setInvoices(
          storedInvs.filter(
            (inv) =>
              !approvedDeleteIds.has(inv.id) && !approvedDeleteIds.has(inv.invoiceNumber)
          )
        );
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Save to localStorage as backup/local store
  useEffect(() => {
    if (loading) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customCustomers));
      window.localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(customItems));
      window.localStorage.setItem(STORAGE_KEYS.quotes, JSON.stringify(quotes));
      window.localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
    } catch {
      // ignore quota
    }
  }, [customCustomers, customItems, quotes, invoices, loading]);

  // Sync editor modal with native <dialog>
  useEffect(() => {
    const dlg = editorDialogRef.current;
    if (!dlg) return;
    if (editorKind && !dlg.open) dlg.showModal();
    else if (!editorKind && dlg.open) dlg.close();
  }, [editorKind]);

  // Live Production & Quality telemetry per Style Code
  const styleTelemetryMap = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        name: string;
        company: string;
        orderQty: number;
        unitPriceLkr: number;
        currency: string;
        rawPrice: number;
        producedQty: number;
        qcCheckedQty: number;
        qcDefectQty: number;
      }
    >();

    const styles = productionBundle?.styles || [];
    const plans = productionBundle?.plans || [];
    const qcBlocks = qualityBundle?.blocks || [];

    styles.forEach((st) => {
      const fx =
        st.currency === 'USD'
          ? 300
          : st.currency === 'EUR'
          ? 330
          : st.currency === 'GBP'
          ? 385
          : 1;
      map.set(st.code, {
        code: st.code,
        name: st.name,
        company: st.company,
        orderQty: Number(st.qty) || Number(st.target) || 0,
        unitPriceLkr: Math.round((Number(st.price) || 0) * fx * 100) / 100,
        currency: st.currency || 'LKR',
        rawPrice: Number(st.price) || 0,
        producedQty: 0,
        qcCheckedQty: 0,
        qcDefectQty: 0,
      });
    });

    plans.forEach((p) => {
      const entry = map.get(p.styleCode);
      if (entry) {
        entry.producedQty += Number(p.actualQty) || 0;
      }
    });

    qcBlocks.forEach((b) => {
      const entry = map.get(b.styleCode);
      if (entry) {
        entry.qcCheckedQty += Number(b.actualQty) || 0;
        entry.qcDefectQty += Number(b.defectQty) || 0;
      }
    });

    return map;
  }, [productionBundle, qualityBundle]);

  // Merged Customers (ERP Partner Companies + Custom Customers)
  const allCustomers: BillingCustomer[] = useMemo(() => {
    const map = new Map<string, BillingCustomer>();
    (productionBundle?.companies || []).forEach((c) => {
      const key = c.name.trim().toLowerCase();
      if (!key) return;
      const addrLines = [
        c.address ? c.address.trim() : '',
        c.contactPerson ? `Attn: ${c.contactPerson.trim()}` : '',
      ].filter(Boolean);
      map.set(key, {
        id: `erp-comp-${c.id}`,
        customerName: c.name,
        companyName: c.name,
        email: c.email || '',
        phone: c.phone || '',
        billingAddress: addrLines.join('\n'),
        shippingAddress: '',
        notes: 'Synced from Production Partner Companies',
        source: 'ERP_COMPANY',
      });
    });

    customCustomers.forEach((c) => {
      const key = (c.companyName || c.customerName).trim().toLowerCase();
      if (!key) return;
      map.set(key, c);
    });

    return Array.from(map.values());
  }, [productionBundle?.companies, customCustomers]);

  // Merged Items & Styles (Production Styles + Custom Catalog Items)
  const allCatalogItems: BillingCatalogItem[] = useMemo(() => {
    const list: BillingCatalogItem[] = [];
    styleTelemetryMap.forEach((st) => {
      list.push({
        id: `style-${st.code}`,
        name: `${st.code} — ${st.name}`,
        sku: st.code,
        description: `Company: ${st.company} • Order: ${st.orderQty} pcs • Prod: ${st.producedQty} pcs`,
        rate: st.unitPriceLkr,
        currency: 'LKR',
        unit: 'pcs',
        source: 'PRODUCTION_STYLE',
        defaultOrderQty: st.orderQty,
      });
    });

    customItems.forEach((item) => {
      list.push(item);
    });

    return list;
  }, [styleTelemetryMap, customItems]);

  // Receivables per customer
  const customerReceivables = useMemo(() => {
    const recMap = new Map<string, number>();
    invoices.forEach((inv) => {
      if (inv.status === 'VOID') return;
      const key = (inv.companyName || inv.customerName).trim().toLowerCase();
      recMap.set(key, (recMap.get(key) || 0) + (Number(inv.balanceDue) || 0));
    });
    return recMap;
  }, [invoices]);

  // Payment Summary KPI metrics
  const invoiceSummary = useMemo(() => {
    let totalOutstanding = 0;
    let dueToday = 0;
    let dueWithin30Days = 0;
    let overdueTotal = 0;
    let collectedTotal = 0;

    const now = new Date();
    const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const in30DaysMs = todayMs + 30 * 24 * 60 * 60 * 1000;

    invoices.forEach((inv) => {
      if (inv.status === 'VOID') return;
      const bal = Math.max(0, Number(inv.balanceDue) || 0);
      collectedTotal += Number(inv.amountPaid) || 0;
      totalOutstanding += bal;

      if (bal > 0 && inv.dueDate) {
        const dueMs = new Date(`${inv.dueDate}T00:00:00`).getTime();
        if (dueMs === todayMs) dueToday += bal;
        else if (dueMs < todayMs) overdueTotal += bal;
        else if (dueMs > todayMs && dueMs <= in30DaysMs) dueWithin30Days += bal;
      }
    });

    return { totalOutstanding, dueToday, dueWithin30Days, overdueTotal, collectedTotal };
  }, [invoices]);

  // Editor computed totals (with Tax Breakdown!)
  const editorTotals = useMemo(() => {
    let baseSubTotal = 0;
    let taxTotal = 0;
    lineItems.forEach((l) => {
      const base = (Number(l.qty) || 0) * (Number(l.rate) || 0);
      const tax = (base * (Number(l.taxPercent) || 0)) / 100;
      baseSubTotal += base;
      taxTotal += tax;
    });
    const discAmt =
      discountType === 'PERCENT'
        ? (baseSubTotal * (Number(discountValue) || 0)) / 100
        : Number(discountValue) || 0;
    const totalAmount = Math.max(
      0,
      baseSubTotal +
        taxTotal -
        discAmt +
        (Number(shippingCharges) || 0) +
        (Number(adjustmentAmount) || 0)
    );
    const balanceDue = Math.max(0, totalAmount - (Number(amountPaid) || 0));
    return {
      subTotal: Math.round(baseSubTotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discAmt: Math.round(discAmt * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100,
    };
  }, [lineItems, discountValue, discountType, shippingCharges, adjustmentAmount, amountPaid]);

  // Next sequence number starting from 0000001!
  const getNextInvoiceNumber = () => {
    const maxNum = invoices.reduce((max, inv) => {
      const m = inv.invoiceNumber.match(/(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `INV-${String(maxNum + 1).padStart(7, '0')}`;
  };

  const getNextQuoteNumber = () => {
    const maxNum = quotes.reduce((max, q) => {
      const m = q.quoteNumber.match(/(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `QT-${String(maxNum + 1).padStart(7, '0')}`;
  };

  const forwardToCustomerRegistration = () => {
    setEditorKind(null);
    if (onOpenCustomerRegistration) {
      onOpenCustomerRegistration();
    } else {
      setActiveTab('customers');
    }
  };

  // Open New Invoice / New Quote Editor
  const openNewInvoice = (prefillQuote?: BillingQuote) => {
    setEditorError(null);
    setEditorKind('INVOICE');
    setEditingId(null);
    setIsTaxInvoice(Boolean(prefillQuote?.isTaxInvoice));
    setCustomerTaxNo(prefillQuote?.customerTaxNo || '');
    setSupplierTaxNo(prefillQuote?.supplierTaxNo || '');
    setDocNumber(getNextInvoiceNumber());
    setRefOrOrderNumber(prefillQuote?.referenceNumber || '');
    setLinkedQuoteNumber(prefillQuote?.quoteNumber || '');
    const defaultCust = allCustomers[0];
    setCustomerId(prefillQuote?.customerId || defaultCust?.id || '');
    setCustomerName(prefillQuote?.customerName || defaultCust?.customerName || '');
    setCompanyName(prefillQuote?.companyName || defaultCust?.companyName || '');
    setBillingAddress(prefillQuote?.billingAddress || defaultCust?.billingAddress || '');
    setCustomerPhone(prefillQuote?.customerPhone || defaultCust?.phone || '');
    setCustomerEmail(prefillQuote?.customerEmail || defaultCust?.email || '');
    setShippingAddress('');
    setPaymentMethod('Cash');
    setPaymentReference('');
    setDocDate(todayIso);
    setPaymentTerms('Due On Receipt');
    setDueOrExpiryDate(todayIso);
    setSalesperson(prefillQuote?.salesperson || '');
    setSubject(prefillQuote?.subject || '');
    setDocStatus('DRAFT');
    setLineItems(
      prefillQuote && prefillQuote.lineItems.length > 0
        ? prefillQuote.lineItems.map((l) => ({ ...l }))
        : [createEmptyLineItem()]
    );
    setDiscountValue(prefillQuote?.discountValue || 0);
    setDiscountType(prefillQuote?.discountType || 'PERCENT');
    setShippingCharges(prefillQuote?.shippingCharges || 0);
    setAdjustmentLabel(prefillQuote?.adjustmentLabel || 'Free T-shirt / Sample Adj.');
    setAdjustmentAmount(prefillQuote?.adjustmentAmount || 0);
    setAmountPaid(0);
    setCustomerNotes(prefillQuote?.customerNotes || '');
    setTermsAndConditions(prefillQuote?.termsAndConditions || DEFAULT_DINUSHA_TERMS);
  };

  const openNewQuote = (prefillWebInquiry?: ProductionQuotationEntity) => {
    setEditorError(null);
    setEditorKind('QUOTE');
    setEditingId(null);
    setIsTaxInvoice(false);
    setCustomerTaxNo('');
    setSupplierTaxNo('');
    setDocNumber(getNextQuoteNumber());
    setRefOrOrderNumber(prefillWebInquiry ? `WEB-${prefillWebInquiry.id.slice(0, 6)}` : '');
    setLinkedQuoteNumber('');
    const defaultCust = allCustomers[0];
    setCustomerId(defaultCust?.id || '');
    setCustomerName(prefillWebInquiry?.customerName || defaultCust?.customerName || '');
    setCompanyName(prefillWebInquiry?.companyName || defaultCust?.companyName || '');
    setBillingAddress(defaultCust?.billingAddress || '');
    setCustomerPhone(prefillWebInquiry?.phone || defaultCust?.phone || '');
    setCustomerEmail(prefillWebInquiry?.email || defaultCust?.email || '');
    setShippingAddress('');
    setDocDate(todayIso);
    setDueOrExpiryDate('');
    setSalesperson('');
    setSubject(prefillWebInquiry ? `${prefillWebInquiry.serviceType} Order Quote` : '');
    setDocStatus('DRAFT');
    setLineItems(
      prefillWebInquiry
        ? [
            {
              id: `line-${Date.now()}`,
              styleCode: '',
              itemName: prefillWebInquiry.serviceType || 'Custom Embroidery Order',
              description: prefillWebInquiry.requirements || '',
              orderQty: prefillWebInquiry.estimatedQty || 100,
              missingPanelsQty: 0,
              damagedQty: 0,
              freeSampleQty: 0,
              qty: prefillWebInquiry.estimatedQty || 100,
              unit: 'pcs',
              rate: 0,
              taxPercent: 0,
              amount: 0,
            },
          ]
        : [createEmptyLineItem()]
    );
    setDiscountValue(0);
    setDiscountType('PERCENT');
    setShippingCharges(0);
    setAdjustmentLabel('Free T-shirt / Sample Adj.');
    setAdjustmentAmount(0);
    setAmountPaid(0);
    setCustomerNotes('');
    setTermsAndConditions(DEFAULT_DINUSHA_TERMS);
  };

  const openEditInvoice = (inv: BillingInvoice) => {
    if (isInvoicePaid(inv) && !hasApprovedInvoiceEdit(inv)) {
      setPreviewDoc(null);
      setPaidInvoiceReqError(null);
      setPaidInvoiceRequestReason('');
      setPaidInvoiceRequestTarget({ inv, actionType: 'INVOICE_EDIT' });
      return;
    }
    setPreviewDoc(null);
    setEditorError(null);
    setEditorKind('INVOICE');
    setEditingId(inv.id);
    setIsTaxInvoice(Boolean(inv.isTaxInvoice));
    setCustomerTaxNo(inv.customerTaxNo || '');
    setSupplierTaxNo(inv.supplierTaxNo || '');
    setDocNumber(inv.invoiceNumber);
    setRefOrOrderNumber(inv.orderNumber);
    setLinkedQuoteNumber(inv.quoteNumber);
    setCustomerId(inv.customerId);
    setCustomerName(inv.customerName);
    setCompanyName(inv.companyName);
    setBillingAddress(inv.billingAddress);
    setShippingAddress(inv.shippingAddress);
    setCustomerPhone(inv.customerPhone || '');
    setCustomerEmail(inv.customerEmail || '');
    setPaymentMethod(inv.paymentMethod || 'Cash');
    setPaymentReference(inv.paymentReference || '');
    setDocDate(inv.invoiceDate);
    setPaymentTerms(inv.paymentTerms);
    setDueOrExpiryDate(inv.dueDate);
    setSalesperson(inv.salesperson);
    setSubject(inv.subject);
    setDocStatus(inv.status);
    setLineItems(inv.lineItems.map((l) => ({ ...l })));
    setDiscountValue(inv.discountValue);
    setDiscountType(inv.discountType);
    setShippingCharges(inv.shippingCharges);
    setAdjustmentLabel(inv.adjustmentLabel);
    setAdjustmentAmount(inv.adjustmentAmount);
    setAmountPaid(inv.amountPaid);
    setCustomerNotes(inv.customerNotes);
    setTermsAndConditions(inv.termsAndConditions);
  };

  const openEditQuote = (qt: BillingQuote) => {
    setPreviewDoc(null);
    setEditorError(null);
    setEditorKind('QUOTE');
    setEditingId(qt.id);
    setIsTaxInvoice(Boolean(qt.isTaxInvoice));
    setCustomerTaxNo(qt.customerTaxNo || '');
    setSupplierTaxNo(qt.supplierTaxNo || '');
    setDocNumber(qt.quoteNumber);
    setRefOrOrderNumber(qt.referenceNumber);
    setLinkedQuoteNumber('');
    setCustomerId(qt.customerId);
    setCustomerName(qt.customerName);
    setCompanyName(qt.companyName);
    setBillingAddress(qt.billingAddress);
    setCustomerPhone(qt.customerPhone || '');
    setCustomerEmail(qt.customerEmail || '');
    setShippingAddress('');
    setDocDate(qt.quoteDate);
    setDueOrExpiryDate(qt.expiryDate);
    setSalesperson(qt.salesperson);
    setSubject(qt.subject);
    setDocStatus(qt.status);
    setLineItems(qt.lineItems.map((l) => ({ ...l })));
    setDiscountValue(qt.discountValue);
    setDiscountType(qt.discountType);
    setShippingCharges(qt.shippingCharges);
    setAdjustmentLabel(qt.adjustmentLabel);
    setAdjustmentAmount(qt.adjustmentAmount);
    setAmountPaid(0);
    setCustomerNotes(qt.customerNotes);
    setTermsAndConditions(qt.termsAndConditions);
  };

  const updateLineItem = (idx: number, patch: Partial<BillingLineItem>) => {
    setEditorError(null);
    setLineItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        next.orderQty = Number(next.qty) || 0;
        const base = (Number(next.qty) || 0) * (Number(next.rate) || 0);
        const tax = (base * (Number(next.taxPercent) || 0)) / 100;
        next.amount = Math.round((base + tax) * 100) / 100;
        return next;
      })
    );
  };

  const handleSelectCatalogOrStyleOnRow = (idx: number, skuOrId: string) => {
    const style = styleTelemetryMap.get(skuOrId);
    if (style) {
      const qty = style.orderQty > 0 ? style.orderQty : 100;
      updateLineItem(idx, {
        styleCode: style.code,
        itemName: `${style.code} — ${style.name}`,
        description: `Company: ${style.company} | Prod Output: ${style.producedQty} pcs`,
        qty,
        unit: 'pcs',
        rate: style.unitPriceLkr,
      });
      if (!customerName && style.company) {
        setCustomerName(style.company);
        setCompanyName(style.company);
      }
      if (!refOrOrderNumber) {
        setRefOrOrderNumber(style.code);
      }
      return;
    }

    const item = allCatalogItems.find((it) => it.id === skuOrId || it.name === skuOrId);
    if (item) {
      const defaultQty = item.defaultOrderQty || 1;
      updateLineItem(idx, {
        styleCode: item.sku || '',
        itemName: item.name,
        description: item.description || '',
        qty: defaultQty,
        unit: item.unit || 'pcs',
        rate: item.rate,
      });
    }
  };

  const handleToggleTaxInvoiceMode = (checked: boolean) => {
    setIsTaxInvoice(checked);
    setLineItems((prev) =>
      prev.map((row) => {
        const nextTax = checked && row.taxPercent === 0 ? 18 : !checked ? 0 : row.taxPercent;
        const base = (Number(row.qty) || 0) * (Number(row.rate) || 0);
        const tax = (base * nextTax) / 100;
        return {
          ...row,
          taxPercent: nextTax,
          amount: Math.round((base + tax) * 100) / 100,
        };
      })
    );
  };

  const handleSaveDocument = async (targetStatus?: string) => {
    setEditorError(null);

    if (!customerName.trim()) {
      setEditorError(
        'Please select a Customer from the dropdown list (or click "+ New Customer" to register one).'
      );
      return;
    }

    const normalizedLines = lineItems.map((l, i) => ({
      ...l,
      itemName:
        l.itemName.trim() ||
        l.styleCode.trim() ||
        l.description.trim() ||
        `Item #${i + 1}`,
    }));

    if (normalizedLines.length === 0) {
      setEditorError('Please add at least one line item.');
      return;
    }

    setIsSavingDoc(true);

    try {
      if (editorKind === 'INVOICE') {
        const computedStatus: InvoiceStatusType =
          editorTotals.balanceDue <= 0 && editorTotals.totalAmount > 0
            ? 'PAID'
            : amountPaid > 0
            ? 'PARTIAL'
            : ((targetStatus || docStatus || 'DRAFT') as InvoiceStatusType);

        const payload: Omit<BillingInvoice, 'id' | 'createdAt'> & { id?: string } = {
          id: editingId || undefined,
          invoiceNumber: docNumber.trim() || getNextInvoiceNumber(),
          orderNumber: refOrOrderNumber.trim(),
          quoteNumber: linkedQuoteNumber.trim(),
          customerId,
          customerName: customerName.trim(),
          companyName: companyName.trim() || customerName.trim(),
          billingAddress: billingAddress.trim(),
          shippingAddress: shippingAddress.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          customerTaxNo: customerTaxNo.trim(),
          supplierTaxNo: supplierTaxNo.trim(),
          isTaxInvoice,
          invoiceDate: docDate || todayIso,
          paymentTerms,
          dueDate: dueOrExpiryDate || docDate || todayIso,
          salesperson: salesperson.trim(),
          subject: subject.trim(),
          status: computedStatus,
          lineItems: normalizedLines,
          subTotal: editorTotals.subTotal,
          taxTotal: editorTotals.taxTotal,
          discountValue: Number(discountValue) || 0,
          discountType,
          shippingCharges: Number(shippingCharges) || 0,
          adjustmentLabel,
          adjustmentAmount: Number(adjustmentAmount) || 0,
          totalAmount: editorTotals.totalAmount,
          amountPaid: Number(amountPaid) || 0,
          balanceDue: editorTotals.balanceDue,
          paymentMethod,
          paymentReference: paymentReference.trim(),
          customerNotes,
          termsAndConditions,
        };

        let saved: BillingInvoice | undefined;
        try {
          const res = await saveBillingInvoiceAction(payload);
          if (res.success && res.data) saved = res.data;
        } catch {
          // Fallback to local save below
        }

        const finalInvoice: BillingInvoice = saved || {
          ...payload,
          id: editingId || `local-inv-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        setInvoices((prev) => {
          const exists = prev.some((i) => i.id === finalInvoice.id);
          return exists
            ? prev.map((i) => (i.id === finalInvoice.id ? finalInvoice : i))
            : [finalInvoice, ...prev];
        });

        if (linkedQuoteNumber) {
          setQuotes((prev) =>
            prev.map((q) =>
              q.quoteNumber === linkedQuoteNumber
                ? { ...q, status: 'INVOICED', convertedInvoiceId: finalInvoice.id }
                : q
            )
          );
        }

        setEditorKind(null);
        setPreviewDoc({ kind: 'INVOICE', data: finalInvoice });
        notify(`Invoice ${finalInvoice.invoiceNumber} saved successfully!`);
      } else if (editorKind === 'QUOTE') {
        const computedStatus = (targetStatus || docStatus || 'DRAFT') as QuoteStatusType;
        const payload: Omit<BillingQuote, 'id' | 'createdAt'> & { id?: string } = {
          id: editingId || undefined,
          quoteNumber: docNumber.trim() || getNextQuoteNumber(),
          referenceNumber: refOrOrderNumber.trim(),
          customerId,
          customerName: customerName.trim(),
          companyName: companyName.trim() || customerName.trim(),
          billingAddress: billingAddress.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          customerTaxNo: customerTaxNo.trim(),
          supplierTaxNo: supplierTaxNo.trim(),
          isTaxInvoice,
          quoteDate: docDate || todayIso,
          expiryDate: dueOrExpiryDate,
          salesperson: salesperson.trim(),
          subject: subject.trim(),
          status: computedStatus,
          lineItems: normalizedLines,
          subTotal: editorTotals.subTotal,
          taxTotal: editorTotals.taxTotal,
          discountValue: Number(discountValue) || 0,
          discountType,
          shippingCharges: Number(shippingCharges) || 0,
          adjustmentLabel,
          adjustmentAmount: Number(adjustmentAmount) || 0,
          totalAmount: editorTotals.totalAmount,
          customerNotes,
          termsAndConditions,
          convertedInvoiceId: null,
        };

        let saved: BillingQuote | undefined;
        try {
          const res = await saveBillingQuoteAction(payload);
          if (res.success && res.data) saved = res.data;
        } catch {
          // Fallback to local save below
        }

        const finalQuote: BillingQuote = saved || {
          ...payload,
          id: editingId || `local-qt-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        setQuotes((prev) => {
          const exists = prev.some((q) => q.id === finalQuote.id);
          return exists
            ? prev.map((q) => (q.id === finalQuote.id ? finalQuote : q))
            : [finalQuote, ...prev];
        });

        setEditorKind(null);
        setPreviewDoc({ kind: 'QUOTE', data: finalQuote });
        notify(`Quotation ${finalQuote.quoteNumber} saved successfully!`);
      }
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleRecordInvoicePayment = async (
    inv: BillingInvoice,
    newAmountPaid: number,
    method = 'Cash',
    ref = ''
  ) => {
    const balanceDue = Math.max(0, Math.round((inv.totalAmount - newAmountPaid) * 100) / 100);
    const nextStatus: InvoiceStatusType =
      balanceDue <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : inv.status;
    const updated: BillingInvoice = {
      ...inv,
      amountPaid: newAmountPaid,
      balanceDue,
      paymentMethod: method || inv.paymentMethod || 'Cash',
      paymentReference: ref || inv.paymentReference || '',
      status: nextStatus,
    };
    try {
      await saveBillingInvoiceAction(updated);
    } catch {
      // local fallback
    }
    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
    setPreviewDoc({ kind: 'INVOICE', data: updated });
    notify(`Payment recorded for ${inv.invoiceNumber}`);
  };

  const handleDeleteInvoice = async (inv: BillingInvoice) => {
    if (isInvoicePaid(inv)) {
      setPreviewDoc(null);
      setPaidInvoiceReqError(null);
      setPaidInvoiceRequestReason('');
      setPaidInvoiceRequestTarget({ inv, actionType: 'INVOICE_DELETE' });
      return;
    }
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    await deleteBillingDocumentAction('billing_invoices', inv.id);
    notify(`Deleted invoice ${inv.invoiceNumber}`);
  };

  const handleSubmitPaidInvoiceApprovalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidInvoiceRequestTarget) return;
    const { inv, actionType } = paidInvoiceRequestTarget;
    const reasonTrim = paidInvoiceRequestReason.trim();
    if (reasonTrim.length < 3) {
      setPaidInvoiceReqError('Please enter a reason (at least 3 characters) for Admin review.');
      return;
    }

    setPaidInvoiceReqError(null);
    setSubmittingApprovalReq(true);

    const targetLabel = `${inv.invoiceNumber} — ${inv.customerName}`;
    const amountLabel = formatLKR(inv.totalAmount);

    const res = await submitApprovalRequestAction({
      requestKind: actionType,
      targetId: inv.id,
      targetLabel,
      amountLabel,
      reason: reasonTrim,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
    });

    setSubmittingApprovalReq(false);

    const createdReq: ErpApprovalRequestEntity = res.request || {
      id: `local-req-${Date.now()}`,
      requestKind: actionType,
      status: 'PENDING',
      targetId: inv.id,
      targetLabel,
      amountLabel,
      reason: reasonTrim,
      requestedByName: 'Billing User',
      requestedByEmail: '',
      requestedByRole: '',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedByName: null,
      adminNote: null,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
    };

    setApprovalRequests((prev) => {
      const next = [createdReq, ...prev.filter((r) => r.id !== createdReq.id)];
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LOCAL_APPROVAL_REQUESTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });

    setPaidInvoiceRequestTarget(null);
    setPaidInvoiceRequestReason('');
    notify(
      `Request to ${
        actionType === 'INVOICE_DELETE' ? 'delete' : 'update'
      } Paid Invoice ${inv.invoiceNumber} sent to Admin Approval Requests tab!`
    );
  };

  const handleDeleteQuote = async (qt: BillingQuote) => {
    setQuotes((prev) => prev.filter((q) => q.id !== qt.id));
    await deleteBillingDocumentAction('billing_quotes', qt.id);
    notify(`Deleted quote ${qt.quoteNumber}`);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const payload = {
      customerName: newCustName.trim(),
      companyName: newCustCompany.trim() || newCustName.trim(),
      email: newCustEmail.trim(),
      phone: newCustPhone.trim(),
      billingAddress: newCustAddress.trim(),
      shippingAddress: '',
      notes: '',
    };

    // Also save to ERP Partner Companies (client_companies) in Supabase!
    try {
      await saveCompanyAction({
        name: payload.companyName,
        contactPerson: payload.customerName,
        email: payload.email,
        phone: payload.phone,
        address: payload.billingAddress,
        colorScheme: 'indigo',
      });
    } catch {
      // ignore if duplicate
    }

    const res = await saveBillingCustomerAction(payload);
    const created: BillingCustomer = res.data || {
      id: `local-cust-${Date.now()}`,
      ...payload,
      source: 'CUSTOM',
    };
    setCustomCustomers((prev) => [created, ...prev]);
    setNewCustName('');
    setNewCustCompany('');
    setNewCustEmail('');
    setNewCustPhone('');
    setNewCustAddress('');
    notify(`Customer "${created.customerName}" registered`);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const payload = {
      name: newItemName.trim(),
      sku: newItemSku.trim(),
      description: newItemDesc.trim(),
      rate: parseFloat(newItemRate) || 0,
      currency: 'LKR' as const,
      unit: newItemUnit || 'pcs',
    };
    const res = await saveBillingCatalogItemAction(payload);
    const created: BillingCatalogItem = res.data || {
      id: `local-item-${Date.now()}`,
      ...payload,
      source: 'CUSTOM',
    };
    setCustomItems((prev) => [created, ...prev]);
    setNewItemName('');
    setNewItemSku('');
    setNewItemDesc('');
    setNewItemRate('');
    notify(`Item "${created.name}" added to catalog`);
  };

  // Filtered lists
  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      const overdueDays = computeOverdueDays(inv.dueDate, inv.balanceDue);
      if (invoiceStatusFilter === 'OVERDUE' && overdueDays <= 0) return false;
      if (
        invoiceStatusFilter !== 'ALL' &&
        invoiceStatusFilter !== 'OVERDUE' &&
        inv.status !== invoiceStatusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.orderNumber.toLowerCase().includes(q) ||
        inv.subject.toLowerCase().includes(q)
      );
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  const filteredQuotes = useMemo(() => {
    const q = quoteSearch.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter(
      (qt) =>
        qt.quoteNumber.toLowerCase().includes(q) ||
        qt.customerName.toLowerCase().includes(q) ||
        qt.referenceNumber.toLowerCase().includes(q)
    );
  }, [quotes, quoteSearch]);

  // Web Inquiry helpers
  const selectedWeb = useMemo(
    () => webQuotations.find((q) => q.id === selectedWebId) || null,
    [webQuotations, selectedWebId]
  );

  const filteredWeb = useMemo(() => {
    const q = webSearch.trim().toLowerCase();
    return webQuotations.filter((item) => {
      if (webStatusFilter !== 'ALL' && item.status !== webStatusFilter) return false;
      if (!q) return true;
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.serviceType.toLowerCase().includes(q)
      );
    });
  }, [webQuotations, webSearch, webStatusFilter]);

  const handleSaveWebInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeb) return;
    setSavingWeb(true);
    const res = await updateQuotationStatusAction({
      id: selectedWeb.id,
      status: editWebStatus,
      adminNotes: editWebNotes,
    });
    setSavingWeb(false);
    if (res.success && res.quotation) {
      const updated = res.quotation;
      setWebQuotations((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      notify('Web inquiry updated.');
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP ZOHO-STYLE BILLING HEADER */}
      <div className="rounded-3xl bg-gradient-to-br from-[#001a3d] via-[#002d62] to-[#132ea0] p-5 sm:p-6 text-white shadow-lg border border-blue-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-blue-200 border border-white/15">
                <FileSpreadsheet className="w-3 h-3 text-emerald-300" />
                Dinusha Commercial &amp; Tax Billing
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  cloudReady
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                }`}
              >
                {cloudReady ? (
                  <>
                    <Cloud className="w-3 h-3" /> Cloud Synced
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3" /> Browser Storage Mode
                  </>
                )}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Invoices, Tax Invoices &amp; Quotations
            </h2>
            <p className="text-xs text-blue-200/80">
              Create Commercial or Tax Invoices (`INV-0000001`+) &amp; Quotations (`QT-0000001`+) linked with Production Styles &amp; Customers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => openNewQuote()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Quote (QT)
            </button>
            <button
              type="button"
              onClick={() => openNewInvoice()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              + New Invoice (INV)
            </button>
          </div>
        </div>

        {/* NAVIGATION PILLS */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/15">
          {[
            { id: 'invoices', label: `All Invoices (${invoices.length})`, icon: FileCheck2 },
            { id: 'quotes', label: `All Quotes (${quotes.length})`, icon: FileText },
            { id: 'customers', label: `Customers (${allCustomers.length})`, icon: Users },
            { id: 'items', label: `Items & Styles (${allCatalogItems.length})`, icon: Package },
            {
              id: 'webInquiries',
              label: `Website Quote Requests (${webQuotations.length})`,
              icon: Mail,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as BillingWorkspaceTab)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#001a3d] shadow-md'
                    : 'bg-white/10 text-blue-100 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          TAB 1: ALL INVOICES
      ========================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-5">
          {/* ZOHO PAYMENT SUMMARY BANNER */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Payment Summary
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="pr-4">
                <p className="text-xs font-semibold text-slate-500">Total Outstanding Receivables</p>
                <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                  {formatLKR(invoiceSummary.totalOutstanding)}
                </p>
              </div>
              <div className="pt-3 sm:pt-0 sm:px-4">
                <p className="text-xs font-semibold text-slate-500">Due Today</p>
                <p className="text-lg font-extrabold text-amber-600 mt-1 tabular-nums">
                  {formatLKR(invoiceSummary.dueToday)}
                </p>
              </div>
              <div className="pt-3 sm:pt-0 sm:px-4">
                <p className="text-xs font-semibold text-slate-500">Due Within 30 Days</p>
                <p className="text-lg font-extrabold text-slate-800 mt-1 tabular-nums">
                  {formatLKR(invoiceSummary.dueWithin30Days)}
                </p>
              </div>
              <div className="pt-3 sm:pt-0 sm:px-4">
                <p className="text-xs font-semibold text-slate-500">Overdue Invoices</p>
                <p className="text-lg font-extrabold text-rose-600 mt-1 tabular-nums">
                  {formatLKR(invoiceSummary.overdueTotal)}
                </p>
              </div>
              <div className="pt-3 sm:pt-0 sm:pl-4">
                <p className="text-xs font-semibold text-slate-500">Total Collected (Paid)</p>
                <p className="text-lg font-extrabold text-emerald-700 mt-1 tabular-nums">
                  {formatLKR(invoiceSummary.collectedTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Search Invoice#, Customer, Style..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
              {(['ALL', 'DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInvoiceStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    invoiceStatusFilter === st
                      ? 'bg-[#002d62] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openNewInvoice()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#132ea0] hover:bg-[#002d62] text-white text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Invoice
            </button>
          </div>

          {/* INVOICES TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div tabIndex={0} role="region" aria-label="All Invoices Table" className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Invoice#</th>
                    <th className="p-3.5">Order / Style</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-right">Balance Due</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => {
                      const overdueDays = computeOverdueDays(inv.dueDate, inv.balanceDue);
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => setPreviewDoc({ kind: 'INVOICE', data: inv })}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          <td className="p-3.5 text-slate-600 font-medium">{inv.invoiceDate}</td>
                          <td className="p-3.5 font-extrabold text-[#1c39bb] hover:underline">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3.5 text-slate-600 font-semibold">
                            {inv.orderNumber || inv.lineItems[0]?.styleCode || '—'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{inv.customerName}</td>
                          <td className="p-3.5">
                            {inv.isTaxInvoice ? (
                              <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-extrabold text-[10px]">
                                TAX INVOICE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                                COMMERCIAL
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {isInvoicePaid(inv) ? (
                              <div className="inline-flex flex-wrap items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] inline-flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> PAID &amp; LOCKED
                                </span>
                                {hasApprovedInvoiceEdit(inv) && (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-[10px] inline-flex items-center gap-1">
                                    <Unlock className="w-2.5 h-2.5" /> Edit Approved
                                  </span>
                                )}
                                {getPendingInvoiceRequest(inv) && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px] inline-flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> Pending Admin
                                  </span>
                                )}
                              </div>
                            ) : overdueDays > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-extrabold text-[10px]">
                                OVERDUE BY {overdueDays} DAYS
                              </span>
                            ) : inv.amountPaid > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                                PARTIALLY PAID
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold text-[10px]">
                                {inv.status}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600">{inv.dueDate}</td>
                          <td className="p-3.5 text-right font-bold text-slate-900 tabular-nums">
                            {formatLKR(inv.totalAmount)}
                          </td>
                          <td className="p-3.5 text-right font-black text-slate-900 tabular-nums">
                            {formatLKR(inv.balanceDue)}
                          </td>
                          <td
                            className="p-3.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                title="View & Download PDF"
                                onClick={() => setPreviewDoc({ kind: 'INVOICE', data: inv })}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" /> View / PDF
                              </button>
                              <button
                                type="button"
                                title={
                                  isInvoicePaid(inv) && !hasApprovedInvoiceEdit(inv)
                                    ? 'Request Admin Approval to Edit Paid Invoice'
                                    : 'Edit Invoice'
                                }
                                onClick={() => openEditInvoice(inv)}
                                className={`px-2 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                                  isInvoicePaid(inv) && !hasApprovedInvoiceEdit(inv)
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800'
                                }`}
                              >
                                {isInvoicePaid(inv) && !hasApprovedInvoiceEdit(inv) ? (
                                  <>
                                    <Lock className="w-3 h-3" /> Request Edit
                                  </>
                                ) : (
                                  <>
                                    <Pencil className="w-3 h-3" /> Edit
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label={
                                  isInvoicePaid(inv)
                                    ? 'Request Admin Approval to Delete Paid Invoice'
                                    : 'Delete invoice'
                                }
                                title={
                                  isInvoicePaid(inv)
                                    ? 'Request Admin Approval to Delete Paid Invoice'
                                    : 'Delete Invoice'
                                }
                                onClick={() => handleDeleteInvoice(inv)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No invoices found. Click <strong>+ New Invoice</strong> to create `INV-0000001`.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: ALL QUOTES
      ========================================================= */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quoteSearch}
                onChange={(e) => setQuoteSearch(e.target.value)}
                placeholder="Search Quote#, Customer, Reference..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
            <button
              type="button"
              onClick={() => openNewQuote()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#132ea0] hover:bg-[#002d62] text-white text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Quote
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div tabIndex={0} role="region" aria-label="All Quotes Table" className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Quote Number</th>
                    <th className="p-3.5">Reference Number</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.length > 0 ? (
                    filteredQuotes.map((qt) => (
                      <tr
                        key={qt.id}
                        onClick={() => setPreviewDoc({ kind: 'QUOTE', data: qt })}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="p-3.5 text-slate-600 font-medium">{qt.quoteDate}</td>
                        <td className="p-3.5 font-extrabold text-[#1c39bb] hover:underline">
                          {qt.quoteNumber}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {qt.referenceNumber || qt.lineItems[0]?.styleCode || '—'}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{qt.customerName}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              qt.status === 'INVOICED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : qt.status === 'SENT'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {qt.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 tabular-nums">
                          {formatLKR(qt.totalAmount)}
                        </td>
                        <td
                          className="p-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ kind: 'QUOTE', data: qt })}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> View / PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => openNewInvoice(qt)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              Convert to Invoice <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete quote"
                              onClick={() => handleDeleteQuote(qt)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No quotes created yet. Click <strong>New Quote</strong> to prepare `QT-0000001`.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: ALL CUSTOMERS
      ========================================================= */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1c39bb]" /> Register Customer
              </h3>
              {onOpenCustomerRegistration && (
                <button
                  type="button"
                  onClick={onOpenCustomerRegistration}
                  className="text-[11px] font-bold text-[#1c39bb] hover:underline cursor-pointer"
                >
                  Open Partner Companies →
                </button>
              )}
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Customer / Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Healthy way / Lyceum Wattala"
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  placeholder="e.g. Quick Tea (Pvt) Limited"
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Phone</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#132ea0] hover:bg-[#002d62] text-white text-xs font-bold transition cursor-pointer"
              >
                Save Customer
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs lg:col-span-2">
            <h3 className="font-extrabold text-xs uppercase text-slate-600 mb-4">
              All Customers (Synced with Production Partner Companies)
            </h3>
            <div tabIndex={0} role="region" aria-label="All Customers" className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Work Phone</th>
                    <th className="p-3 text-right">Receivables (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allCustomers.length > 0 ? (
                    allCustomers.map((c) => {
                      const key = (c.companyName || c.customerName).trim().toLowerCase();
                      const rec = customerReceivables.get(key) || 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-[#1c39bb]">{c.customerName}</td>
                          <td className="p-3 text-slate-700 font-semibold">{c.companyName}</td>
                          <td className="p-3 text-slate-500">{c.email || '—'}</td>
                          <td className="p-3 text-slate-500">{c.phone || '—'}</td>
                          <td className="p-3 text-right font-black text-slate-900 tabular-nums">
                            {formatLKR(rec)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No customers yet. Add a customer on the left or in Production Management.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: ALL ITEMS & PRODUCTION STYLES
      ========================================================= */}
      {activeTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs h-fit">
            <h3 className="font-extrabold text-xs uppercase text-slate-600 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#1c39bb]" /> Add Billing Item / Service
            </h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Cap with Front Embroidery / BABY PIQUE"
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    SKU / Style Code
                  </label>
                  <input
                    type="text"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="e.g. CAP-01"
                    className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Usage Unit</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="pcs / pass / lot"
                    className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Selling Rate (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(e.target.value)}
                  placeholder="e.g. 550.00"
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="e.g. 2 pass / 220 GSM material"
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 text-xs outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#132ea0] hover:bg-[#002d62] text-white text-xs font-bold transition cursor-pointer"
              >
                Save Item to Catalog
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs lg:col-span-2">
            <h3 className="font-extrabold text-xs uppercase text-slate-600 mb-4">
              All Items &amp; Live Production Styles
            </h3>
            <div tabIndex={0} role="region" aria-label="All Items" className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">SKU / Style</th>
                    <th className="p-3">Description / Production Telemetry</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-center">Usage Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allCatalogItems.length > 0 ? (
                    allCatalogItems.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{it.name}</td>
                        <td className="p-3">
                          {it.sku ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold text-[10px]">
                              {it.sku}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{it.description || '—'}</td>
                        <td className="p-3 text-right font-black text-slate-900 tabular-nums">
                          {formatLKR(it.rate)}
                        </td>
                        <td className="p-3 text-center text-slate-600">{it.unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No items yet. Add items on the left or add styles in Production Management.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: WEBSITE QUOTATION INQUIRIES
      ========================================================= */}
      {activeTab === 'webInquiries' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={webSearch}
                  onChange={(e) => setWebSearch(e.target.value)}
                  placeholder="Search website quote requests..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:bg-white"
                />
              </div>
              <select
                value={webStatusFilter}
                onChange={(e) => setWebStatusFilter(e.target.value as 'ALL' | QuotationStatus)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="New">New</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Quoted">Quoted</option>
                <option value="Converted">Converted</option>
              </select>
            </div>
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredWeb.length > 0 ? (
                filteredWeb.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => {
                      setSelectedWebId(q.id);
                      setEditWebStatus(q.status);
                      setEditWebNotes(q.adminNotes || '');
                    }}
                    className={`p-4 cursor-pointer hover:bg-slate-50 flex items-start justify-between gap-3 ${
                      selectedWebId === q.id ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">
                          {q.customerName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${WEB_STATUS_BADGE[q.status]}`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {q.serviceType} {q.estimatedQty ? `• Est. ${q.estimatedQty} pcs` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNewQuote(q);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#132ea0] hover:bg-[#002d62] text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      + Create Official Quote
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No website quotation requests found.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            {selectedWeb ? (
              <form onSubmit={handleSaveWebInquiry} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {selectedWeb.customerName}
                    </h4>
                    <p className="text-xs text-slate-500">{selectedWeb.companyName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewQuote(selectedWeb)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Prepare QT Quote →
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                  <p>
                    <strong>Email:</strong> {selectedWeb.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedWeb.phone}
                  </p>
                  <p>
                    <strong>Service:</strong> {selectedWeb.serviceType}
                  </p>
                  <p>
                    <strong>Requirements:</strong> {selectedWeb.requirements || '—'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editWebStatus}
                    onChange={(e) => setEditWebStatus(e.target.value as QuotationStatus)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="New">New</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Converted">Converted</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Notes</label>
                  <textarea
                    rows={3}
                    value={editWebNotes}
                    onChange={(e) => setEditWebNotes(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingWeb}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  {savingWeb ? 'Saving...' : 'Save Inquiry Status'}
                </button>
              </form>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Select a website inquiry to view details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          ZOHO-STYLE NEW / EDIT INVOICE & QUOTE MODAL
      ========================================================= */}
      <dialog
        ref={editorDialogRef}
        aria-labelledby="billing-editor-title"
        onClose={() => setEditorKind(null)}
        className="m-auto w-full max-w-5xl rounded-3xl bg-white p-0 shadow-2xl border border-slate-300 backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
      >
        {editorKind && (
          <div className="flex flex-col max-h-[92vh]">
            {/* MODAL HEADER */}
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 id="billing-editor-title" className="text-base font-black tracking-tight">
                  {editingId
                    ? `Edit ${editorKind === 'INVOICE' ? 'Invoice' : 'Quote'} (${docNumber})`
                    : `New ${editorKind === 'INVOICE' ? 'Invoice' : 'Quote'}`}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {/* TAX INVOICE TOGGLE */}
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxInvoice}
                    onChange={(e) => handleToggleTaxInvoiceMode(e.target.checked)}
                    className="rounded text-emerald-500"
                  />
                  Tax Invoice (VAT / TIN)
                </label>

                <button
                  type="button"
                  aria-label="Close editor"
                  onClick={() => setEditorKind(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {editorError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-center gap-2.5 text-xs font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editorError}</span>
                </div>
              )}

              {/* CUSTOMER DROPDOWN & DOCUMENT NUMBER FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="md:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-extrabold text-rose-600 uppercase">
                      Customer Name *
                    </label>
                    <button
                      type="button"
                      onClick={forwardToCustomerRegistration}
                      className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#1c39bb] hover:underline cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" /> + New Customer
                    </button>
                  </div>
                  <select
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__REGISTER_NEW_CUSTOMER__') {
                        forwardToCustomerRegistration();
                        return;
                      }
                      setEditorError(null);
                      setCustomerName(val);
                      const found = allCustomers.find(
                        (c) =>
                          c.customerName === val ||
                          c.companyName === val
                      );
                      if (found) {
                        setCustomerId(found.id);
                        setCompanyName(found.companyName);
                        setBillingAddress(found.billingAddress || '');
                        setCustomerPhone(found.phone || '');
                        setCustomerEmail(found.email || '');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="">— Select Customer —</option>
                    {allCustomers.map((c) => {
                      const label = c.companyName || c.customerName;
                      return (
                        <option key={c.id} value={label}>
                          {label}
                        </option>
                      );
                    })}
                    <option value="__REGISTER_NEW_CUSTOMER__">
                      + Register New Customer (Go to Customer Registration)...
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-rose-600 uppercase mb-1">
                    {editorKind === 'INVOICE' ? 'Invoice# *' : 'Quote# *'}
                  </label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-[#002d62] outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {editorKind === 'INVOICE' ? 'Order / Style Number' : 'Reference #'}
                  </label>
                  <input
                    type="text"
                    value={refOrOrderNumber}
                    onChange={(e) => setRefOrOrderNumber(e.target.value)}
                    placeholder="e.g. PO-2026 / Style Code"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-rose-600 uppercase mb-1">
                    {editorKind === 'INVOICE' ? 'Invoice Date *' : 'Quote Date *'}
                  </label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-blue-600"
                  />
                </div>

                {editorKind === 'INVOICE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-blue-600"
                    >
                      <option value="Due On Receipt">Due On Receipt</option>
                      <option value="50% Advance Required">50% Advance Required</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {editorKind === 'INVOICE' ? 'Due Date' : 'Expiry Date'}
                  </label>
                  <input
                    type="date"
                    value={dueOrExpiryDate}
                    onChange={(e) => setDueOrExpiryDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-blue-600"
                  />
                </div>

                {isTaxInvoice && (
                  <>
                    <div>
                      <label className="block text-[11px] font-extrabold text-violet-700 uppercase mb-1">
                        Customer TIN / VAT Reg. No.
                      </label>
                      <input
                        type="text"
                        value={customerTaxNo}
                        onChange={(e) => setCustomerTaxNo(e.target.value)}
                        placeholder="e.g. 114000000-7000"
                        className="w-full p-2.5 rounded-xl border border-violet-300 bg-white text-xs font-bold outline-none focus:border-violet-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-violet-700 uppercase mb-1">
                        Dinusha TIN / VAT Reg. No.
                      </label>
                      <input
                        type="text"
                        value={supplierTaxNo}
                        onChange={(e) => setSupplierTaxNo(e.target.value)}
                        placeholder="Your VAT / TIN number..."
                        className="w-full p-2.5 rounded-xl border border-violet-300 bg-white text-xs font-bold outline-none focus:border-violet-600"
                      />
                    </div>
                  </>
                )}

                <div className={isTaxInvoice ? 'md:col-span-1' : 'md:col-span-2'}>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={`Let your customer know what this ${
                      editorKind === 'INVOICE' ? 'Invoice' : 'Quote'
                    } is for`}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Customer address..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* CLEAN ZOHO-STYLE ITEM TABLE (WITHOUT THE 4 EXTRA COLUMNS) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-extrabold text-xs uppercase text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1c39bb]" />
                    Item Table
                  </h4>
                </div>

                <div className="rounded-2xl border border-slate-300 overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-300">
                      <tr>
                        <th className="p-3 min-w-[280px]">Item Details</th>
                        <th className="p-3 text-center w-32">Quantity</th>
                        <th className="p-3 text-right w-36">Rate (LKR)</th>
                        <th className="p-3 text-center w-36">Tax</th>
                        <th className="p-3 text-right w-36">Amount (LKR)</th>
                        <th className="p-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {lineItems.map((row, idx) => (
                        <tr key={row.id} className="align-top bg-white">
                          <td className="p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <select
                                aria-label="Select Production Style or Catalog Item"
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSelectCatalogOrStyleOnRow(idx, e.target.value);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-300 bg-slate-50 text-[11px] font-bold text-[#1c39bb] outline-none max-w-[165px] cursor-pointer"
                              >
                                <option value="">+ Pick Style / Item</option>
                                <optgroup label="Production Styles (Live)">
                                  {Array.from(styleTelemetryMap.values()).map((st) => (
                                    <option key={st.code} value={st.code}>
                                      {st.code} — {st.name} (LKR {st.unitPriceLkr})
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Catalog Items">
                                  {customItems.map((ci) => (
                                    <option key={ci.id} value={ci.id}>
                                      {ci.name} (LKR {ci.rate})
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                              <input
                                type="text"
                                value={row.itemName}
                                onChange={(e) =>
                                  updateLineItem(idx, { itemName: e.target.value })
                                }
                                placeholder="Type or select an item..."
                                className="flex-1 p-1.5 rounded-lg border border-slate-300 text-xs font-bold outline-none focus:border-blue-600"
                              />
                            </div>
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) =>
                                updateLineItem(idx, { description: e.target.value })
                              }
                              placeholder="Add description (e.g. 2 pass / Front Left Chest)..."
                              className="w-full p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600 outline-none focus:bg-white"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.qty}
                              onChange={(e) =>
                                updateLineItem(idx, { qty: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-center font-mono text-xs font-black text-slate-900"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={row.rate}
                              onChange={(e) =>
                                updateLineItem(idx, { rate: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full p-2 rounded-lg border border-slate-300 text-right font-mono text-xs font-bold"
                            />
                          </td>

                          <td className="p-3">
                            <select
                              value={row.taxPercent}
                              onChange={(e) => {
                                const pct = parseFloat(e.target.value) || 0;
                                if (pct > 0) setIsTaxInvoice(true);
                                updateLineItem(idx, { taxPercent: pct });
                              }}
                              className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              <option value={0}>No Tax (0%)</option>
                              <option value={18}>VAT (18%)</option>
                              <option value={2.5}>SSCL (2.5%)</option>
                              <option value={15}>VAT (15%)</option>
                            </select>
                          </td>

                          <td className="p-3 text-right font-black text-slate-900 tabular-nums pt-4">
                            {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          <td className="p-3 text-center pt-3.5">
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                aria-label="Remove row"
                                onClick={() =>
                                  setLineItems((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setLineItems((prev) => [...prev, createEmptyLineItem(isTaxInvoice ? 18 : 0)])
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" /> Add New Row
                </button>
              </div>

              {/* NOTES, TERMS & ZOHO SUMMARY TOTALS BOX */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer Notes
                    </label>
                    <textarea
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Will be displayed on the invoice/quote..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Terms &amp; Conditions
                    </label>
                    <textarea
                      rows={4}
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Sub Total</span>
                    <span className="font-black text-slate-900 tabular-nums">
                      {formatLKR(editorTotals.subTotal)}
                    </span>
                  </div>

                  {(isTaxInvoice || editorTotals.taxTotal > 0) && (
                    <div className="flex items-center justify-between text-violet-800">
                      <span className="font-bold">Total Tax (VAT / SSCL)</span>
                      <span className="font-black tabular-nums">
                        + {formatLKR(editorTotals.taxTotal)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-600">Discount</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        className="w-24 p-1.5 rounded-lg border border-slate-300 bg-white text-right font-bold"
                      />
                      <select
                        value={discountType}
                        onChange={(e) =>
                          setDiscountType(e.target.value as 'PERCENT' | 'AMOUNT')
                        }
                        className="p-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                      >
                        <option value="PERCENT">%</option>
                        <option value="AMOUNT">LKR</option>
                      </select>
                      <span className="w-28 text-right font-bold text-rose-600 tabular-nums">
                        - {formatLKR(editorTotals.discAmt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-600">Shipping Charges</span>
                    <input
                      type="number"
                      step="0.01"
                      value={shippingCharges}
                      onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
                      className="w-32 p-1.5 rounded-lg border border-slate-300 bg-white text-right font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={adjustmentLabel}
                      onChange={(e) => setAdjustmentLabel(e.target.value)}
                      className="p-1.5 rounded-lg border border-dashed border-slate-400 bg-white text-xs font-semibold w-48"
                      placeholder="Free T-shirt"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                      className="w-32 p-1.5 rounded-lg border border-slate-300 bg-white text-right font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-300 text-sm">
                    <span className="font-black text-slate-900">Total ( LKR )</span>
                    <span className="font-black text-[#001a3d] text-base tabular-nums">
                      {formatLKR(editorTotals.totalAmount)}
                    </span>
                  </div>

                  {editorKind === 'INVOICE' && (
                    <>
                      <div className="pt-2 border-t border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-800">
                              Advance / Amount Received
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setAmountPaid(
                                  Math.round(editorTotals.totalAmount * 0.5 * 100) / 100
                                )
                              }
                              className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-extrabold cursor-pointer"
                            >
                              Set 50% Advance
                            </button>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                            className="w-32 p-1.5 rounded-lg border border-emerald-400 bg-white text-right font-bold text-emerald-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Payment Method
                            </label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Card / Online">Card / Online</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Cheque # / Transfer Ref
                            </label>
                            <input
                              type="text"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder="e.g. Cheque #458920 / BOC"
                              className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-sm">
                        <span className="font-black text-slate-900">Balance Due ( LKR )</span>
                        <span className="font-black text-rose-700 tabular-nums">
                          {formatLKR(editorTotals.balanceDue)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingDoc}
                  onClick={() => handleSaveDocument('DRAFT')}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingDoc ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  disabled={isSavingDoc}
                  onClick={() => handleSaveDocument('SENT')}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingDoc ? 'Saving...' : 'Save and Send / Preview PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorKind(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="text-xs font-bold text-slate-700">
                Total Amount: <span className="font-black text-slate-950">{formatLKR(editorTotals.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* DOCUMENT VIEWER & PDF DOWNLOAD MODAL */}
      <DocumentPreviewModal
        doc={previewDoc}
        isPaidLocked={
          previewDoc?.kind === 'INVOICE' ? isInvoicePaid(previewDoc.data) : false
        }
        isEditApproved={
          previewDoc?.kind === 'INVOICE' ? hasApprovedInvoiceEdit(previewDoc.data) : false
        }
        onClose={() => setPreviewDoc(null)}
        onEdit={() => {
          if (!previewDoc) return;
          if (previewDoc.kind === 'INVOICE') openEditInvoice(previewDoc.data);
          else openEditQuote(previewDoc.data);
        }}
        onConvertToInvoice={(qt) => {
          setPreviewDoc(null);
          openNewInvoice(qt);
        }}
        onRecordPayment={handleRecordInvoicePayment}
      />

      {/* PAID INVOICE ADMIN APPROVAL REQUEST MODAL */}
      <dialog
        ref={paidReqDialogRef}
        aria-labelledby="paid-inv-req-title"
        onClose={() => setPaidInvoiceRequestTarget(null)}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-amber-200/90 bg-white p-0 shadow-2xl text-slate-900 backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
      >
        {paidInvoiceRequestTarget && (
          <form
            onSubmit={handleSubmitPaidInvoiceApprovalRequest}
            className="flex flex-col overflow-hidden rounded-2xl"
          >
            <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 text-amber-300 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="paid-inv-req-title" className="text-base font-bold text-white">
                    Paid Invoice Locked — Admin Approval Required
                  </h3>
                  <p className="text-xs text-amber-200/90 mt-0.5">
                    Paid invoices cannot be modified or deleted without Admin approval
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaidInvoiceRequestTarget(null)}
                aria-label="Close approval request dialog"
                className="p-1.5 rounded-lg text-slate-300 hover:bg-white/15 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                    PAID INVOICE
                  </span>
                  <span className="font-mono text-slate-500">
                    {paidInvoiceRequestTarget.inv.invoiceDate}
                  </span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  {paidInvoiceRequestTarget.inv.invoiceNumber} —{' '}
                  {paidInvoiceRequestTarget.inv.customerName}
                </div>
                <div className="font-mono font-bold text-emerald-700">
                  Paid Amount: {formatLKR(paidInvoiceRequestTarget.inv.totalAmount)}
                </div>
              </div>

              {getPendingInvoiceRequest(paidInvoiceRequestTarget.inv) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                  ⏳ A request for this invoice is already <strong>PENDING</strong> in the Admin&apos;s{' '}
                  <strong>Approval Requests</strong> tab.
                </div>
              )}

              <div>
                <span className="block font-bold text-slate-700 mb-1.5">
                  Requested Action *
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPaidInvoiceRequestTarget((prev) =>
                        prev ? { ...prev, actionType: 'INVOICE_EDIT' } : null
                      )
                    }
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                      paidInvoiceRequestTarget.actionType === 'INVOICE_EDIT'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Unlock to Update / Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPaidInvoiceRequestTarget((prev) =>
                        prev ? { ...prev, actionType: 'INVOICE_DELETE' } : null
                      )
                    }
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                      paidInvoiceRequestTarget.actionType === 'INVOICE_DELETE'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Delete Paid Invoice
                  </button>
                </div>
              </div>

              {paidInvoiceReqError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{paidInvoiceReqError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="paid-inv-req-reason"
                  className="block font-bold text-slate-700 mb-1"
                >
                  Reason for Admin Approval Request *
                </label>
                <textarea
                  id="paid-inv-req-reason"
                  rows={3}
                  required
                  value={paidInvoiceRequestReason}
                  onChange={(e) => {
                    setPaidInvoiceRequestReason(e.target.value);
                    setPaidInvoiceReqError(null);
                  }}
                  placeholder="Explain why this PAID invoice needs to be updated or deleted..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                autoFocus
                onClick={() => setPaidInvoiceRequestTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingApprovalReq}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {submittingApprovalReq
                  ? 'Sending Request...'
                  : 'Send Request to Admin Approval Tab'}
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg border-l-4 text-xs font-bold ${
            toastMsg.tone === 'ok'
              ? 'bg-slate-900 text-white border-emerald-400'
              : 'bg-rose-800 text-white border-rose-300'
          }`}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
