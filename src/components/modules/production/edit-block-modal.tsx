"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { PenSquare, Trash2, Save } from "lucide-react";
import { dialog } from "@/components/ui/dialog";

export interface ActiveBlockData {
  id: string;
  machineId: string;
  machineName: string;
  company: string;
  style: string;
  plan: number;
  actual: number;
}

interface EditBlockModalProps {
  block: ActiveBlockData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, style: string, plan: number, actual: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditBlockModal({
  block,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: EditBlockModalProps) {
  const [styleName, setStyleName] = useState("");
  const [planQty, setPlanQty] = useState(0);
  const [actualQty, setActualQty] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (block) {
      setStyleName(block.style);
      setPlanQty(block.plan);
      setActualQty(block.actual);
    }
  }, [block]);

  if (!block) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planQty <= 0) {
      dialog.toast("Plan target quantity must be greater than 0", "warning", "Validation Error");
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdate(block.id, styleName, planQty, actualQty);
      dialog.toast("Production block updated successfully", "success", "Saved");
      onClose();
    } catch {
      dialog.toast("Failed to update production block", "danger", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({
      title: "Delete Production Block",
      message: `Are you sure you want to remove the scheduled block for ${block.style} on ${block.machineName}?`,
      confirmText: "Delete Block",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (confirmed) {
      setIsSubmitting(true);
      try {
        await onDelete(block.id);
        dialog.toast("Production block removed", "info", "Deleted");
        onClose();
      } catch {
        dialog.toast("Failed to delete production block", "danger", "Error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Production Block"
      subtitle={`${block.machineName} — ${block.company}`}
      icon={<PenSquare className="w-5 h-5 text-amber-500" />}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Block</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-persian-800 hover:bg-persian-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update & Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Style Name / Code *
          </label>
          <input
            type="text"
            required
            value={styleName}
            onChange={(e) => setStyleName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-persian-500 focus:bg-white transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Plan Target Qty *
            </label>
            <input
              type="number"
              min="1"
              required
              value={planQty}
              onChange={(e) => setPlanQty(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-persian-800 outline-none focus:border-persian-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-800 mb-1">
              Actual Done Qty (Floor Log)
            </label>
            <input
              type="number"
              min="0"
              value={actualQty}
              onChange={(e) => setActualQty(parseInt(e.target.value) || 0)}
              className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs font-extrabold text-emerald-900 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
