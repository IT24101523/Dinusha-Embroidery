'use client';

import React, { useState, useMemo } from 'react';
import {
  ProductionQuotationEntity,
  QuotationStatus,
  updateQuotationStatusAction,
  deleteQuotationAction,
  fetchQuotationsAction,
} from '@/actions/quotations';
import {
  FileText,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Trash2,
  CheckCircle2,
  Clock,
  Save,
  AlertCircle,
} from 'lucide-react';

interface QuotationsManagementProps {
  initialQuotations: ProductionQuotationEntity[];
}

const STATUS_BADGE: Record<QuotationStatus, string> = {
  New: 'bg-sky-50 text-sky-700 border-sky-200',
  Reviewed: 'bg-amber-50 text-amber-700 border-amber-200',
  Quoted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Archived: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function QuotationsManagement({ initialQuotations }: QuotationsManagementProps) {
  const [quotations, setQuotations] = useState<ProductionQuotationEntity[]>(initialQuotations);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QuotationStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(initialQuotations[0]?.id || null);
  const [editStatus, setEditStatus] = useState<QuotationStatus>(
    initialQuotations[0]?.status || 'New'
  );
  const [editNotes, setEditNotes] = useState<string>(initialQuotations[0]?.adminNotes || '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const selected = useMemo(
    () => quotations.find((q) => q.id === selectedId) || null,
    [quotations, selectedId]
  );

  const handleSelect = (q: ProductionQuotationEntity) => {
    setSelectedId(q.id);
    setEditStatus(q.status);
    setEditNotes(q.adminNotes || '');
    setFeedback(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await fetchQuotationsAction();
    setRefreshing(false);
    if (res.success && res.data) {
      setQuotations(res.data);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    const res = await updateQuotationStatusAction({
      id: selected.id,
      status: editStatus,
      adminNotes: editNotes,
    });
    setSaving(false);

    if (!res.success || !res.quotation) {
      setFeedback({ type: 'err', msg: res.error || 'Failed to update quotation.' });
      return;
    }

    const updated = res.quotation;
    setQuotations((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    setFeedback({ type: 'ok', msg: 'Quotation status and notes saved.' });
  };

  const handleDelete = async (q: ProductionQuotationEntity) => {
    const res = await deleteQuotationAction(q.id);
    if (!res.success) {
      setFeedback({ type: 'err', msg: res.error || 'Failed to delete quotation.' });
      return;
    }
    const remaining = quotations.filter((item) => item.id !== q.id);
    setQuotations(remaining);
    if (selectedId === q.id) {
      const next = remaining[0] || null;
      setSelectedId(next?.id || null);
      setEditStatus(next?.status || 'New');
      setEditNotes(next?.adminNotes || '');
    }
    setFeedback({ type: 'ok', msg: `Deleted quotation from ${q.customerName}.` });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.serviceType.toLowerCase().includes(q) ||
        item.requirements.toLowerCase().includes(q)
      );
    });
  }, [quotations, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: quotations.length,
      newCount: quotations.filter((q) => q.status === 'New').length,
      quoted: quotations.filter((q) => q.status === 'Quoted').length,
      converted: quotations.filter((q) => q.status === 'Converted').length,
    };
  }, [quotations]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-persian-900 via-persian-800 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              Production Quotation Requests
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Customer inquiries submitted from the Dinusha Embroidery public website
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase text-slate-400">Total Inquiries</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{counts.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase text-sky-600">New / Pending</p>
          <p className="text-2xl font-extrabold text-sky-700 mt-1">{counts.newCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase text-indigo-600">Quoted</p>
          <p className="text-2xl font-extrabold text-indigo-700 mt-1">{counts.quoted}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase text-emerald-600">Converted Orders</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{counts.converted}</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, company, service..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-persian-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | QuotationStatus)}
              aria-label="Filter quotations by status"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Quoted">Quoted</option>
              <option value="Converted">Converted</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No quotation requests found.
              </div>
            ) : (
              filtered.map((q) => {
                const isSelected = q.id === selectedId;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleSelect(q)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-persian-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-900">
                          {q.customerName}
                        </span>
                        {q.companyName && (
                          <span className="text-xs font-semibold text-slate-500">
                            • {q.companyName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-persian-700">
                        {q.serviceType}
                        {q.estimatedQty ? ` (${q.estimatedQty.toLocaleString()} Pcs)` : ''}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-1">{q.requirements}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          STATUS_BADGE[q.status]
                        }`}
                      >
                        {q.status}
                      </span>
                      <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(q.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Follow-up Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 h-fit">
          {!selected ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Select a quotation request from the left to view full details and update status.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${
                      STATUS_BADGE[selected.status]
                    }`}
                  >
                    {selected.status}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selected.customerName}
                  </h3>
                  {selected.companyName && (
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {selected.companyName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(selected)}
                  aria-label="Delete quotation"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-persian-300 text-slate-700 font-semibold truncate"
                >
                  <Mail className="w-4 h-4 text-persian-600 shrink-0" />
                  <span className="truncate">{selected.email}</span>
                </a>
                <a
                  href={`tel:${selected.phone}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-persian-300 text-slate-700 font-semibold"
                >
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{selected.phone}</span>
                </a>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Service Line</span>
                  <span className="font-extrabold text-slate-900">{selected.serviceType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Estimated Qty</span>
                  <span className="font-extrabold text-slate-900">
                    {selected.estimatedQty
                      ? `${selected.estimatedQty.toLocaleString()} Pcs`
                      : 'Not specified'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="font-bold text-slate-500 mb-1">Order Specifications</p>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selected.requirements}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quotation Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as QuotationStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none focus:border-persian-500 cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Converted">Converted</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Follow-up Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Price quoted, sample status, target delivery..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-persian-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {selected.handledBy && (
                    <span className="text-[11px] text-slate-400">
                      Last updated by {selected.handledBy}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-persian-900 hover:bg-persian-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Update'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
