'use client';

import React, { useState, useRef, useMemo, useId } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import {
  EmployeeFormData,
  employeeFormSchema,
  calculateAgeFromDob,
  extractBirthYearFromNic,
} from '@/modules/payroll/domain/validation';
import { saveEmployeeAction } from '@/actions/employees';
import { DeleteEmployeeModal } from './delete-employee-modal';
import {
  UserPlus,
  Pencil,
  Trash2,
  FileCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Camera,
  Search,
  Calculator,
  Sparkles,
  UserCheck,
  ShieldAlert,
  Users,
  ArrowLeft,
} from 'lucide-react';

interface EmployeeCrudProps {
  initialEmployees: EmployeeEntity[];
  onEmployeesChange?: (updated: EmployeeEntity[]) => void;
  onOpenCalculator?: (employeeId: string) => void;
}

const DEFAULT_FORM: EmployeeFormData = {
  epfNo: 0,
  initials: '',
  surname: '',
  fullName: '',
  dob: '',
  gender: 'Male',
  nic: '',
  address: '',
  phone: '',
  emergencyPhone: '',
  role: 'Embroidery Machine Operator',
  department: 'නිෂ්පාදන අංශය',
  grade: 'Grade A',
  bankName: 'BOC',
  accountNo: '',
  basicSalary: 30000,
  joinedDate: '',
  hasNicCopy: false,
  hasBirthCertificate: false,
  hasGramasewakaCert: false,
  hasPoliceReport: false,
  hasMedicalReport: false,
  hasAppointmentLetter: false,
  isActive: true,
  photoUrl: '',
};

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function compressEmployeePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      reject(new Error('Only JPG, PNG, or WebP images are allowed.'));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      reject(new Error('Photo size must be 5 MB or less.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const size = 240;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not initialize image canvas.');
        }

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length > 350000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to process photo.'));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid or corrupted image file.'));
    };

    img.src = objectUrl;
  });
}

const JOB_ROLES = [
  'Production Supervisor',
  'Embroidery Machine Operator',
  'Machine Helper',
  'Final quality Checker',
  'Checker',
  'Trimmer',
  'Maintenance Technician',
  'Packing Staff',
  'HR Assistant',
];

export function EmployeeCrud({
  initialEmployees,
  onEmployeesChange,
  onOpenCalculator,
}: EmployeeCrudProps) {
  const [employees, setEmployees] = useState<EmployeeEntity[]>(initialEmployees);
  const [subTab, setSubTab] = useState<'directory' | 'form'>('directory');
  const subTabIdPrefix = useId();
  const [formData, setFormData] = useState<EmployeeFormData>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Directory filters
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [docFilter, setDocFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL');

  const [maxDobDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const currentAge = formData.dob ? calculateAgeFromDob(formData.dob) : null;
  const nicBirthYear = formData.nic ? extractBirthYearFromNic(formData.nic) : null;

  const formDocCount = [
    formData.hasNicCopy,
    formData.hasBirthCertificate,
    formData.hasGramasewakaCert,
    formData.hasPoliceReport,
    formData.hasMedicalReport,
    formData.hasAppointmentLetter,
  ].filter(Boolean).length;

  const filteredEmployees = useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    return [...employees]
      .sort((a, b) => a.epfNo - b.epfNo)
      .filter((emp) => {
        if (roleFilter !== 'ALL' && emp.role !== roleFilter) return false;
        const docCount = [
          emp.hasNicCopy,
          emp.hasBirthCertificate,
          emp.hasGramasewakaCert,
          emp.hasPoliceReport,
          emp.hasMedicalReport,
          emp.hasAppointmentLetter,
        ].filter(Boolean).length;
        if (docFilter === 'COMPLETE' && docCount !== 6) return false;
        if (docFilter === 'INCOMPLETE' && docCount === 6) return false;

        if (!q) return true;
        return (
          emp.fullName.toLowerCase().includes(q) ||
          String(emp.epfNo).includes(q) ||
          emp.nic.toLowerCase().includes(q) ||
          (emp.phone || '').toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q)
        );
      });
  }, [employees, directorySearch, roleFilter, docFilter]);

  const updateField = <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      if (next[key as string]) {
        delete next[key as string];
        changed = true;
      }
      if (key === 'dob' || key === 'nic' || key === 'joinedDate') {
        for (const k of ['dob', 'nic', 'joinedDate']) {
          if (next[k]) {
            delete next[k];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoProcessing(true);
    try {
      const compressed = await compressEmployeePhoto(file);
      updateField('photoUrl', compressed);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setPhotoProcessing(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoError(null);
    updateField('photoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingId(null);
    setFieldErrors({});
    setPhotoError(null);
    setStatusMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (emp: EmployeeEntity) => {
    setEditingId(emp.id);
    setFieldErrors({});
    setPhotoError(null);
    setStatusMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFormData({
      epfNo: emp.epfNo,
      initials: emp.initials || '',
      surname: emp.surname || '',
      fullName: emp.fullName,
      dob: emp.dob || '',
      gender: emp.gender === 'Female' || emp.gender === 'Other' ? emp.gender : 'Male',
      nic: emp.nic,
      address: emp.address || '',
      phone: emp.phone || '',
      emergencyPhone: emp.emergencyPhone || '',
      role: emp.role,
      department: emp.department || 'නිෂ්පාදන අංශය',
      grade: emp.grade || 'Grade A',
      bankName: emp.bankName || 'BOC',
      accountNo: emp.accountNo || '',
      basicSalary: emp.basicSalary,
      joinedDate: emp.joinedDate || '',
      hasNicCopy: emp.hasNicCopy,
      hasBirthCertificate: emp.hasBirthCertificate,
      hasGramasewakaCert: emp.hasGramasewakaCert,
      hasPoliceReport: emp.hasPoliceReport,
      hasMedicalReport: emp.hasMedicalReport,
      hasAppointmentLetter: emp.hasAppointmentLetter,
      isActive: emp.isActive,
      photoUrl: emp.photoUrl || '',
    });
    setSubTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSuccess = () => {
    if (!employeeToDelete) return;
    const removedName = employeeToDelete.fullName;
    const next = employees.filter((e) => e.id !== employeeToDelete.id);
    setEmployees(next);
    setStatusMsg({
      type: 'success',
      text: `Employee "${removedName}" has been removed with documented reason.`,
    });
    if (editingId === employeeToDelete.id) resetForm();
    if (onEmployeesChange) onEmployeesChange(next);
    setEmployeeToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setFieldErrors({});

    const parsed = employeeFormSchema.safeParse(formData);
    const errors: Record<string, string> = {};

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || 'form');
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
    }

    const normalizedNic = (formData.nic || '').trim().toUpperCase();
    const dupEpf = employees.find((emp) => emp.epfNo === formData.epfNo && emp.id !== editingId);
    if (dupEpf && !errors.epfNo) {
      errors.epfNo = `EPF No ${formData.epfNo} is already assigned to ${dupEpf.fullName}.`;
    }

    const dupNic = employees.find(
      (emp) =>
        emp.nic.trim().toUpperCase() === normalizedNic &&
        normalizedNic !== '' &&
        emp.id !== editingId
    );
    if (dupNic && !errors.nic) {
      errors.nic = `NIC ${normalizedNic} is already registered to ${dupNic.fullName}.`;
    }

    if (Object.keys(errors).length > 0 || !parsed.success) {
      setFieldErrors(errors);
      const firstError =
        Object.values(errors)[0] || 'Please fix the highlighted validation errors.';
      setStatusMsg({ type: 'error', text: firstError });
      return;
    }

    setLoading(true);
    const res = await saveEmployeeAction(parsed.data, editingId || undefined);
    setLoading(false);

    if (res.success && res.employee) {
      const saved = res.employee;
      const next = editingId
        ? employees.map((emp) => (emp.id === editingId ? saved : emp))
        : [...employees, saved].sort((a, b) => a.epfNo - b.epfNo);
      setEmployees(next);
      resetForm();
      setSubTab('directory');
      setStatusMsg({
        type: 'success',
        text: `Employee ${saved.fullName} ${editingId ? 'updated' : 'registered'} successfully.`,
      });
      if (onEmployeesChange) onEmployeesChange(next);
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to save employee.' });
    }
  };

  const docCheckboxes: { key: keyof EmployeeFormData; label: string }[] = [
    { key: 'hasNicCopy', label: 'NIC / ID Copy' },
    { key: 'hasBirthCertificate', label: 'Birth Certificate' },
    { key: 'hasGramasewakaCert', label: 'Grama Niladhari Cert' },
    { key: 'hasPoliceReport', label: 'Police Report' },
    { key: 'hasMedicalReport', label: 'Medical Certificate' },
    { key: 'hasAppointmentLetter', label: 'Appointment Letter' },
  ];

  return (
    <div className="space-y-5">
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-3 shadow-xs border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50/95 text-emerald-900 border-emerald-200'
              : 'bg-rose-50/95 text-rose-900 border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Dedicated 2-Tab Navigation Bar: Directory vs Register / Edit */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Employee workspace views"
          className="tablist-scroller flex items-center gap-1.5"
        >
          <button
            type="button"
            role="tab"
            id={`${subTabIdPrefix}-directory`}
            aria-selected={subTab === 'directory'}
            onClick={() => setSubTab('directory')}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              subTab === 'directory'
                ? 'bg-slate-900 text-white shadow-sm after:content-[""] after:absolute after:inset-x-4 after:bottom-1 after:border-b-2 after:border-indigo-400'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Employee Directory</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                subTab === 'directory'
                  ? 'bg-white/15 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {employees.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            id={`${subTabIdPrefix}-form`}
            aria-selected={subTab === 'form'}
            onClick={() => setSubTab('form')}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              subTab === 'form'
                ? 'bg-slate-900 text-white shadow-sm after:content-[""] after:absolute after:inset-x-4 after:bottom-1 after:border-b-2 after:border-indigo-400'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{editingId ? 'Edit Employee Record' : 'Register / Edit Employee'}</span>
            {editingId && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-100 border border-indigo-400/40">
                EPF #{formData.epfNo}
              </span>
            )}
          </button>
        </div>

        {subTab === 'directory' ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setSubTab('form');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register New Employee
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSubTab('directory')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Directory
          </button>
        )}
      </div>

      {/* Tab 2: Onboarding / Edit Form Studio */}
      {subTab === 'form' && (
        <div
          role="tabpanel"
          aria-labelledby={`${subTabIdPrefix}-form`}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
        >
          {/* Dark Gradient Studio Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
                  {editingId ? 'Edit Employee Record' : 'Register New Employee'}
                  {editingId && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/30 border border-indigo-400/40 text-indigo-100">
                      EPF #{formData.epfNo}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300">
                  Validated 16+ age verification, Sri Lankan NIC cross-check &amp; photo capture
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  New Entry
                </button>
              )}
              <button
                type="button"
                onClick={() => setSubTab('directory')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                View Directory
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
            {/* Employee Photo Upload Studio */}
            <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Employee Photo
                </label>
                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  240x240px Auto-Crop
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-18 h-18 rounded-full border-2 border-indigo-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm ring-4 ring-white">
                  {formData.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.photoUrl}
                      alt={formData.fullName || 'Employee preview'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      id="employee-photo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="employee-photo-upload"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition shadow-xs"
                    >
                      {photoProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    JPG, PNG or WebP (max 5 MB, square avatar)
                  </p>
                  {(photoError || fieldErrors.photoUrl) && (
                    <p className="text-[11px] font-semibold text-rose-600">
                      {photoError || fieldErrors.photoUrl}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 01: Personal Identity */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 font-mono">
                  01
                </span>
                <span>Personal Identity</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initials *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. G.A.S.N."
                    value={formData.initials || ''}
                    onChange={(e) => {
                      const initials = e.target.value;
                      const surname = formData.surname || '';
                      const fullName = surname ? `${initials} ${surname}`.trim() : initials;
                      setFormData((prev) => ({ ...prev, initials, fullName }));
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.initials;
                        delete next.fullName;
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                      fieldErrors.initials
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.initials && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.initials}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Surname *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kumara"
                    value={formData.surname || ''}
                    onChange={(e) => {
                      const surname = e.target.value;
                      const initials = formData.initials || '';
                      const fullName = initials ? `${initials} ${surname}`.trim() : surname;
                      setFormData((prev) => ({ ...prev, surname, fullName }));
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.surname;
                        delete next.fullName;
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                      fieldErrors.surname
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.surname && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.surname}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. G.A.S.N. Kumara"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                    fieldErrors.fullName
                      ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Date of Birth *
                    </label>
                    {currentAge !== null ? (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          currentAge < 16
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {currentAge} yrs {currentAge < 16 ? '(16+ req)' : '✓'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">16+ required</span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    max={maxDobDate}
                    value={formData.dob || ''}
                    onChange={(e) => updateField('dob', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                      fieldErrors.dob || (currentAge !== null && currentAge < 16)
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.dob ? (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.dob}</p>
                  ) : (
                    currentAge !== null &&
                    currentAge < 16 && (
                      <p className="text-[11px] font-medium text-rose-600 mt-1">
                        Employee must be at least 16 years old.
                      </p>
                    )
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender || 'Male'}
                    onChange={(e) =>
                      updateField('gender', e.target.value as 'Male' | 'Female' | 'Other')
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIC Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="921450123V / 1992..."
                    value={formData.nic}
                    onChange={(e) => updateField('nic', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 text-sm font-mono border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                      fieldErrors.nic
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.nic ? (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.nic}</p>
                  ) : (
                    nicBirthYear && (
                      <p className="text-[10px] font-mono text-indigo-600 mt-1">
                        NIC Birth Year: {nicBirthYear}
                      </p>
                    )
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    EPF No *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={999999}
                    step={1}
                    placeholder="e.g. 17"
                    value={formData.epfNo || ''}
                    onChange={(e) => {
                      const val =
                        e.target.value === ''
                          ? 0
                          : Math.max(0, Math.floor(Number(e.target.value)));
                      updateField('epfNo', Number.isFinite(val) ? val : 0);
                    }}
                    className={`w-full px-3 py-2 text-sm font-mono font-bold border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                      fieldErrors.epfNo
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.epfNo && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.epfNo}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 02: Contact & Residence */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 font-mono">
                  02
                </span>
                <span>Contact & Residence</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weliweriya, Gampaha"
                  value={formData.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                    fieldErrors.address
                      ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                />
                {fieldErrors.address && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={12}
                    placeholder="0760958645"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={`w-full px-3 py-2 text-sm font-mono border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                      fieldErrors.phone
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Contact *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={12}
                    placeholder="0332258961"
                    value={formData.emergencyPhone || ''}
                    onChange={(e) => updateField('emergencyPhone', e.target.value)}
                    className={`w-full px-3 py-2 text-sm font-mono border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                      fieldErrors.emergencyPhone
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.emergencyPhone && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.emergencyPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 03: Compensation & Banking */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 font-mono">
                  03
                </span>
                <span>Role, Compensation & Banking</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => updateField('role', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 bg-white ${
                    fieldErrors.role
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                >
                  {JOB_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {fieldErrors.role && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.role}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Basic Salary (LKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[11px] font-bold text-slate-400">
                      LKR
                    </span>
                    <input
                      type="number"
                      required
                      min={5000}
                      max={500000}
                      step={500}
                      placeholder="37000"
                      value={formData.basicSalary || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateField('basicSalary', Number.isFinite(val) && val >= 0 ? val : 0);
                      }}
                      className={`w-full pl-11 pr-3 py-2 text-sm font-mono font-bold text-slate-900 border rounded-xl focus:outline-hidden focus:ring-2 bg-white transition ${
                        fieldErrors.basicSalary
                          ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.basicSalary && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.basicSalary}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={formData.joinedDate || ''}
                    onChange={(e) => updateField('joinedDate', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 transition ${
                      fieldErrors.joinedDate
                        ? 'border-rose-500 bg-rose-50/30 focus:ring-rose-500'
                        : 'border-indigo-200 bg-indigo-50/30 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.joinedDate && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.joinedDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BOC / Peoples / Commercial"
                    value={formData.bankName || ''}
                    onChange={(e) => updateField('bankName', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-hidden focus:ring-2 bg-white ${
                      fieldErrors.bankName
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.bankName && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.bankName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. 8452109823"
                    value={formData.accountNo || ''}
                    onChange={(e) => updateField('accountNo', e.target.value)}
                    className={`w-full px-3 py-2 text-sm font-mono border rounded-xl focus:outline-hidden focus:ring-2 bg-white ${
                      fieldErrors.accountNo
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.accountNo && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      {fieldErrors.accountNo}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 04: Personal File Compliance Checklist */}
            <div className="p-4 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 to-orange-50/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                  <FileCheck className="w-4 h-4 text-amber-700" />
                  Personal File Checklist
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white border border-amber-300 text-amber-900">
                  {formDocCount}/6 Verified
                </span>
              </div>

              <div className="h-1.5 w-full rounded-full bg-amber-200/70 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.round((formDocCount / 6) * 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {docCheckboxes.map((doc) => {
                  const checked = Boolean(formData[doc.key]);
                  return (
                    <label
                      key={doc.key}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                        checked
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : 'bg-white border-amber-200/80 text-slate-700 hover:bg-amber-50/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => updateField(doc.key, e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-[11px] leading-tight">{doc.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-700 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? 'Update Employee' : 'Save Employee'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setSubTab('directory');
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 1: Interactive Workforce Directory */}
      {subTab === 'directory' && (
        <div
          role="tabpanel"
          aria-labelledby={`${subTabIdPrefix}-directory`}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Registered Employee Directory
                </h2>
                <p className="text-xs text-slate-500">
                  Quick search, compliance audit &amp; direct jump to monthly payroll calculation
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Showing {filteredEmployees.length} of {employees.length}
                </span>
              </div>
            </div>

            {/* Interactive Search & Filters Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search by Name, EPF No, NIC, or Phone..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/70 focus:bg-white transition"
                />
                {directorySearch && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setDirectorySearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
              >
                <option value="ALL">All Roles</option>
                {JOB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDocFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    docFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setDocFilter('COMPLETE')}
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    docFilter === 'COMPLETE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  6/6 Done
                </button>
                <button
                  type="button"
                  onClick={() => setDocFilter('INCOMPLETE')}
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    docFilter === 'INCOMPLETE'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  Pending Docs
                </button>
              </div>
            </div>
          </div>

          {/* Sticky-Header Accessible Table Wrapper */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="directory-table-caption"
            className="table-region scrollbar-thin"
          >
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <caption id="directory-table-caption" className="sr-only">
                Registered employee directory sorted by EPF number with document verification and
                payroll actions
              </caption>
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr className="text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3.5 border-b border-slate-800">EPF</th>
                  <th className="py-3 px-3.5 border-b border-slate-800 min-w-[220px]">
                    EMPLOYEE &amp; NIC
                  </th>
                  <th className="py-3 px-3 border-b border-slate-800">ROLE</th>
                  <th className="py-3 px-3 border-b border-slate-800">PHONE</th>
                  <th className="py-3 px-3 border-b border-slate-800">DOCS</th>
                  <th className="py-3 px-3.5 border-b border-slate-800 text-right">
                    BASIC SALARY
                  </th>
                  <th className="py-3 px-3.5 border-b border-slate-800 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                      No employees match your current search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const docFlags = [
                      emp.hasNicCopy,
                      emp.hasBirthCertificate,
                      emp.hasGramasewakaCert,
                      emp.hasPoliceReport,
                      emp.hasMedicalReport,
                      emp.hasAppointmentLetter,
                    ];
                    const docCount = docFlags.filter(Boolean).length;

                    return (
                      <tr key={emp.id} className="hover:bg-indigo-50/35 transition group">
                        <td className="py-3.5 px-3.5 border-b border-slate-100">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-mono font-extrabold text-[11px] bg-slate-100 text-slate-900 border border-slate-200">
                            #{emp.epfNo}
                          </span>
                        </td>

                        <th
                          scope="row"
                          className="py-3.5 px-3.5 border-b border-slate-100 text-left font-normal md:sticky md:left-0 bg-white group-hover:bg-indigo-50/35 z-[5]"
                        >
                          <div className="flex items-center gap-3">
                            {emp.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={emp.photoUrl}
                                alt={emp.fullName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white ring-1 ring-slate-200 shrink-0 shadow-xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xs font-extrabold shrink-0">
                                {(emp.initials || emp.fullName || '?').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {emp.fullName}
                              </div>
                              {(emp.surname || emp.initials) && (
                                <div className="text-[10px] text-slate-500 truncate">
                                  {emp.surname && (
                                    <span className="font-semibold text-slate-700">
                                      {emp.surname}
                                    </span>
                                  )}
                                  {emp.surname && emp.initials && <span> • </span>}
                                  {emp.initials && (
                                    <span className="tracking-wide text-slate-500">
                                      {emp.initials}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-sm">
                                  {emp.nic}
                                </span>
                                {emp.joinedDate && (
                                  <span className="text-[10px] font-mono text-indigo-600">
                                    Joined {emp.joinedDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </th>

                        <td className="py-3.5 px-3 border-b border-slate-100">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50/90 text-indigo-800 border border-indigo-100">
                            {emp.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 border-b border-slate-100 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {emp.phone || '-'}
                        </td>

                        <td className="py-3.5 px-3 border-b border-slate-100">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                docCount === 6
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : docCount >= 3
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                              title={`${docCount}/6 Personal file documents verified`}
                            >
                              <FileCheck className="w-3 h-3" />
                              {docCount}/6
                            </span>
                            <div className="flex items-center gap-0.5" aria-hidden="true">
                              {docFlags.map((ok, i) => (
                                <span
                                  key={i}
                                  className={`h-1 w-2.5 rounded-full ${
                                    ok ? 'bg-emerald-500' : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 border-b border-slate-100 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          LKR {emp.basicSalary.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-3.5 border-b border-slate-100 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onOpenCalculator && (
                              <button
                                type="button"
                                onClick={() => onOpenCalculator(emp.id)}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition cursor-pointer"
                                title="Calculate Monthly Salary"
                                aria-label={`Calculate salary for ${emp.fullName}`}
                              >
                                <Calculator className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEdit(emp)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                              title="Edit Employee"
                              aria-label={`Edit ${emp.fullName}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmployeeToDelete(emp)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Employee (Reason Required)"
                              aria-label={`Delete ${emp.fullName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dedicated Native Dialog Removal Confirmation Modal */}
      {employeeToDelete && (
        <DeleteEmployeeModal
          employee={employeeToDelete}
          isOpen={!!employeeToDelete}
          onClose={() => setEmployeeToDelete(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
