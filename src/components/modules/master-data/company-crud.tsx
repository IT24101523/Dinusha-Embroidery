"use client";

import React, { useState } from "react";
import { Building2, Edit2, Trash2 } from "lucide-react";
import { dialog } from "@/components/ui/dialog";

interface CompanyItem {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface CompanyCrudProps {
  companies: CompanyItem[];
  onRefresh: () => void;
}

export function CompanyCrud({ companies, onRefresh }: CompanyCrudProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
  };

  const handleEditClick = (c: CompanyItem) => {
    setEditingId(c.id);
    setName(c.name);
    setContactPerson(c.contact_person);
    setEmail(c.email);
    setPhone(c.phone);
  };

  const handleDeleteClick = async (c: CompanyItem) => {
    const confirmed = await dialog.confirm({
      title: "Delete Client Company",
      message: `Are you sure you want to delete company '${c.name}'?`,
      confirmText: "Delete Company",
      variant: "danger",
    });

    if (confirmed) {
      try {
        const res = await fetch(`/api/master-data/companies/${c.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete company");
        dialog.toast("Company deleted successfully", "info", "Deleted");
        onRefresh();
      } catch {
        dialog.toast("Failed to delete company", "danger", "Error");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/master-data/companies/${editingId}` : "/api/master-data/companies";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactPerson, email, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        dialog.toast(data.error || "Failed to save company", "danger", "Error");
        return;
      }

      dialog.toast(
        editingId ? "Company details updated" : "Client company registered successfully",
        "success",
        "Saved"
      );
      resetForm();
      onRefresh();
    } catch {
      dialog.toast("Error communicating with server", "danger", "Network Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 h-fit">
        <h3 className="font-extrabold mb-5 text-sm uppercase text-slate-500 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-persian-600" />
          {editingId ? "EDIT CLIENT COMPANY" : "ADD CLIENT COMPANY"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nike Apparel"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person *</label>
            <input
              type="text"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Representative Name"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@company.com"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-persian-900 text-white font-bold p-3 rounded-lg text-sm hover:bg-persian-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingId ? "Update Company" : "Register Company"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-lg text-sm hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Right Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
        <h3 className="font-extrabold mb-5 text-sm uppercase text-slate-500">
          REGISTERED CLIENT DIRECTORY ({companies.length} Companies)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">COMPANY NAME</th>
                <th className="p-4">CONTACT PERSON</th>
                <th className="p-4">EMAIL</th>
                <th className="p-4">PHONE</th>
                <th className="p-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{c.name}</td>
                  <td className="p-4 font-medium text-slate-700">{c.contact_person}</td>
                  <td className="p-4 text-slate-600 font-mono text-xs">{c.email}</td>
                  <td className="p-4 text-slate-600 font-medium">{c.phone}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(c)}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition-colors"
                        title="Edit company"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(c)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
                        title="Delete company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
