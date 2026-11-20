'use client';

import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import {
  ClientCompanyEntity,
  EmbroideryTypeOption,
  MachineEntity,
  MachineOperationalStatus,
  ProductionBlockEntity,
  ProductionBundle,
  StyleMasterEntity,
  StylePartItem,
  StyleSizeItem,
  saveCompanyAction,
  deleteCompanyAction,
  saveMachineAction,
  assignMachineCrewAction,
  deleteMachineAction,
  saveStyleAction,
  toggleStyleCompletedAction,
  deleteStyleAction,
  saveProductionBlockAction,
  deleteProductionBlockAction,
  fetchProductionBundleAction,
} from '@/actions/production';
import { NeedleTypeItem } from '@/components/needle/needle-management';
import {
  CalendarClock,
  Monitor,
  Shirt,
  FileSpreadsheet,
  Building2,
  Cpu,
  Plus,
  Trash2,
  Pencil,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  Eye,
  Users,
  UserCheck,
  Sparkles,
  Layers,
  X,
  Share2,
  ArrowRight,
  Search,
  Filter,
  RotateCcw,
  Copy,
  Check,
  GripVertical,
  Move,
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Maximize2,
  Minimize2,
} from 'lucide-react';

const STORAGE_COMPANIES_KEY = 'dinusha_companies_master';
const STORAGE_MACHINES_KEY = 'dinusha_machines_v2';
const STORAGE_STYLES_KEY = 'dinusha_styles_v3';
const STORAGE_PLANS_KEY = 'dinusha_production_plans_v1';
const STORAGE_NEEDLE_TYPES_KEY = 'dinusha_needle_types_v2';

const THREAD_BRANDS = [
  'Madeira',
  'Gunold',
  'Isacord',
  'Coats',
  'Marathon',
  'Simthread',
  'Generic',
];

const BACKING_OPTIONS = [
  'Tearaway (Standard)',
  'Tearaway (Heavy)',
  'Cutaway (Standard)',
  'Cutaway (Heavy)',
  'Washaway',
  'Peel and Stick',
];

const CONE_SIZES = [2500, 3000, 5000, 10000];

const FABRIC_COLORS = [
  'White',
  'Black',
  'Navy Blue',
  'Royal Blue',
  'Red',
  'Pink',
  'Grey',
  'Charcoal',
  'Green',
  'Yellow',
  'Other',
];

const CURRENCY_OPTIONS = ['LKR', 'USD', 'EUR', 'GBP'];

const GARMENT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

const SHIFT_HOURS = [
  { col: 1, value: '08:00', endValue: '09:00', label: '08:00 AM', endLabel: '09:00 AM', short: 'H1' },
  { col: 2, value: '09:00', endValue: '10:00', label: '09:00 AM', endLabel: '10:00 AM', short: 'H2' },
  { col: 3, value: '10:00', endValue: '11:00', label: '10:00 AM', endLabel: '11:00 AM', short: 'H3' },
  { col: 4, value: '11:00', endValue: '12:00', label: '11:00 AM', endLabel: '12:00 PM', short: 'H4' },
  { col: 5, value: '12:00', endValue: '13:00', label: '12:00 PM', endLabel: '01:00 PM', short: 'H5' },
  { col: 6, value: '13:00', endValue: '14:00', label: '01:00 PM', endLabel: '02:00 PM', short: 'H6' },
  { col: 7, value: '14:00', endValue: '15:00', label: '02:00 PM', endLabel: '03:00 PM', short: 'H7' },
  { col: 8, value: '15:00', endValue: '16:00', label: '03:00 PM', endLabel: '04:00 PM', short: 'H8' },
  { col: 9, value: '16:00', endValue: '17:00', label: '04:00 PM', endLabel: '05:00 PM', short: 'H9' },
  { col: 10, value: '17:00', endValue: '18:00', label: '05:00 PM', endLabel: '06:00 PM', short: 'H10' },
  { col: 11, value: '18:00', endValue: '19:00', label: '06:00 PM', endLabel: '07:00 PM', short: 'H11' },
];

const CLIENT_COLOR_THEMES: Record<
  string,
  { bg: string; text: string; border: string; tag: string }
> = {
  indigo: {
    bg: 'bg-indigo-50/95',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
    tag: 'bg-indigo-700',
  },
  amber: {
    bg: 'bg-amber-50/95',
    text: 'text-amber-950',
    border: 'border-amber-300',
    tag: 'bg-amber-600',
  },
  emerald: {
    bg: 'bg-emerald-50/95',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    tag: 'bg-emerald-700',
  },
  purple: {
    bg: 'bg-purple-50/95',
    text: 'text-purple-950',
    border: 'border-purple-300',
    tag: 'bg-purple-700',
  },
  rose: {
    bg: 'bg-rose-50/95',
    text: 'text-rose-950',
    border: 'border-rose-300',
    tag: 'bg-rose-700',
  },
  cyan: {
    bg: 'bg-cyan-50/95',
    text: 'text-cyan-950',
    border: 'border-cyan-300',
    tag: 'bg-cyan-700',
  },
  blue: {
    bg: 'bg-blue-50/95',
    text: 'text-blue-950',
    border: 'border-blue-300',
    tag: 'bg-blue-700',
  },
};

export type ProductionSubTab =
  | 'planEditor'
  | 'floorDisplay'
  | 'styleCrud'
  | 'doneStyles'
  | 'strikeOff'
  | 'companyCrud'
  | 'machineCrud';

interface ProductionManagementProps {
  employees: EmployeeEntity[];
  initialBundle: ProductionBundle;
  onBundleChange?: (bundle: ProductionBundle) => void;
  externalSubTab?: ProductionSubTab;
}

function createEmptyPart(defaultNeedle = ''): StylePartItem {
  return {
    name: '',
    qty: 1,
    backing: 'Tearaway (Standard)',
    needle: defaultNeedle,
    threads: [{ color: '', shade: '', brand: 'Madeira', mLen: 0, cLen: 5000 }],
  };
}

export function ProductionManagement({
  employees,
  initialBundle,
  onBundleChange,
  externalSubTab,
}: ProductionManagementProps) {
  const uid = useId();
  const todayStr = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
      }).format(new Date()),
    []
  );
  const [subTab, setSubTab] = useState<ProductionSubTab>(externalSubTab || 'planEditor');

  useEffect(() => {
    if (externalSubTab) setSubTab(externalSubTab);
  }, [externalSubTab]);

  // Master Data & Production Plan State
  const [companies, setCompanies] = useState<ClientCompanyEntity[]>(initialBundle.companies);
  const [machines, setMachines] = useState<MachineEntity[]>(initialBundle.machines);
  const [styles, setStyles] = useState<StyleMasterEntity[]>(initialBundle.styles);
  const [plans, setPlans] = useState<ProductionBlockEntity[]>(initialBundle.plans);

  // Needle specs synced from Needle Management Stock Directory
  const [stockNeedles, setStockNeedles] = useState<string[]>([]);

  // Live clock for editor & floor display headers
  const [liveTime, setLiveTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Sync props if initialBundle updates
  useEffect(() => {
    setCompanies(initialBundle.companies);
    setMachines(initialBundle.machines);
    setStyles(initialBundle.styles);
    setPlans(initialBundle.plans);
  }, [initialBundle]);

  // Ensure fresh bundle data (including latest style size breakdowns) is loaded from DB
  useEffect(() => {
    let active = true;
    fetchProductionBundleAction().then((res) => {
      if (!active || !res.success || !res.data) return;
      setCompanies(res.data.companies);
      setMachines(res.data.machines);
      setStyles(res.data.styles);
      setPlans(res.data.plans);
    });
    return () => {
      active = false;
    };
  }, []);

  // Notify parent when bundle state changes & persist to localStorage
  useEffect(() => {
    const bundle: ProductionBundle = { companies, machines, styles, plans };
    onBundleChange?.(bundle);
    try {
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(companies));
      localStorage.setItem(STORAGE_MACHINES_KEY, JSON.stringify(machines));
      localStorage.setItem(STORAGE_STYLES_KEY, JSON.stringify(styles));
      localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(plans));
    } catch {
      // Ignore storage errors
    }
  }, [companies, machines, styles, plans, onBundleChange]);

  // Load Needle specs from Needle Management localStorage & DB so Style CRUD Needle dropdown shows only actual registered needles
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_NEEDLE_TYPES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as NeedleTypeItem[];
        if (Array.isArray(parsed)) {
          const specs = Array.from(
            new Set(
              parsed
                .filter((n) => n.system && n.size)
                .map((n) => `${n.system} / ${n.size}`)
            )
          );
          setStockNeedles(specs);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [subTab]);

  // Live clock interval
  useEffect(() => {
    const updateClock = () => setLiveTime(new Date().toLocaleTimeString());
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const needleSpecOptions = useMemo(() => {
    const merged = new Set<string>([...stockNeedles, ...(initialBundle.needles || [])]);
    return Array.from(merged);
  }, [stockNeedles, initialBundle.needles]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive !== false),
    [employees]
  );

  const machineOperatorEmployees = useMemo(
    () =>
      activeEmployees.filter((e) =>
        /operator|ඔපරේටර්/i.test(String(e.role || ''))
      ),
    [activeEmployees]
  );

  // Validate and resolve an operator/helper label against real active employees from Employee Registry
  const resolveRealEmployeeLabel = (rawName: string | undefined | null): string => {
    if (!rawName) return '';
    const trimmed = rawName.trim();
    if (!trimmed || trimmed.toLowerCase() === 'unassigned' || trimmed.toLowerCase() === 'none') {
      return '';
    }
    const lower = trimmed.toLowerCase();
    for (const emp of activeEmployees) {
      const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
      if (
        label.toLowerCase() === lower ||
        emp.fullName.trim().toLowerCase() === lower
      ) {
        return label;
      }
    }
    return '';
  };

  const getMachineAssignedOperator = (mac: MachineEntity | undefined | null): string => {
    if (!mac) return '';
    const resolved = resolveRealEmployeeLabel(mac.operatorName);
    if (!resolved) return '';
    const targetLower = resolved.toLowerCase();
    // Ensure an operator is never duplicated across an earlier machine
    for (const m of machines) {
      if (m.id === mac.id || m.name === mac.name) break;
      const earlierOp = resolveRealEmployeeLabel(m.operatorName);
      const earlierHelp = resolveRealEmployeeLabel(m.helperName);
      if (
        (earlierOp && earlierOp.toLowerCase() === targetLower) ||
        (earlierHelp && earlierHelp.toLowerCase() === targetLower)
      ) {
        return '';
      }
    }
    return resolved;
  };

  const getMachineAssignedHelper = (mac: MachineEntity | undefined | null): string => {
    if (!mac) return 'None';
    const resolved = resolveRealEmployeeLabel(mac.helperName);
    if (!resolved) return 'None';
    const targetLower = resolved.toLowerCase();
    const ownOp = getMachineAssignedOperator(mac);
    if (ownOp && ownOp.toLowerCase() === targetLower) return 'None';
    for (const m of machines) {
      if (m.id === mac.id || m.name === mac.name) break;
      const earlierOp = resolveRealEmployeeLabel(m.operatorName);
      const earlierHelp = resolveRealEmployeeLabel(m.helperName);
      if (
        (earlierOp && earlierOp.toLowerCase() === targetLower) ||
        (earlierHelp && earlierHelp.toLowerCase() === targetLower)
      ) {
        return 'None';
      }
    }
    return resolved;
  };

  // Find if an employee is already assigned (as Operator or Helper) to any OTHER machine
  const findMachineWithEmployee = (
    empLabelRaw: string | undefined | null,
    excludeMachineId?: string | null,
    excludeMachineName?: string | null
  ): MachineEntity | null => {
    const resolved = resolveRealEmployeeLabel(empLabelRaw);
    if (!resolved) return null;
    const targetLower = resolved.toLowerCase();
    for (const m of machines) {
      if (excludeMachineId && m.id === excludeMachineId) continue;
      if (
        excludeMachineName &&
        m.name.trim().toLowerCase() === excludeMachineName.trim().toLowerCase()
      ) {
        continue;
      }
      const mOp = getMachineAssignedOperator(m);
      const mHelp = getMachineAssignedHelper(m);
      if (
        (mOp && mOp.toLowerCase() === targetLower) ||
        (mHelp !== 'None' && mHelp.toLowerCase() === targetLower)
      ) {
        return m;
      }
    }
    return null;
  };

  const getCompanyColor = (companyName: string) => {
    const found = companies.find((c) => c.name === companyName);
    const scheme = found?.colorScheme || 'indigo';
    return CLIENT_COLOR_THEMES[scheme] || CLIENT_COLOR_THEMES.indigo;
  };

  const showSuccess = (text: string) => setStatusMsg({ type: 'success', text });
  const showError = (text: string) => setStatusMsg({ type: 'error', text });

  // ============================================================================
  // 1. COMPANY CRUD STATE & HANDLERS
  // ============================================================================
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [compName, setCompName] = useState('');
  const [compContact, setCompContact] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compColor, setCompColor] = useState('indigo');

  const resetCompanyForm = () => {
    setEditingCompanyId(null);
    setCompName('');
    setCompContact('');
    setCompEmail('');
    setCompPhone('');
    setCompAddress('');
    setCompColor('indigo');
  };

  const handleEditCompany = (c: ClientCompanyEntity) => {
    setEditingCompanyId(c.id);
    setCompName(c.name);
    setCompContact(c.contactPerson);
    setCompEmail(c.email);
    setCompPhone(c.phone);
    setCompAddress(c.address || '');
    setCompColor(c.colorScheme || 'indigo');
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrim = compName.trim();
    const contactTrim = compContact.trim();
    const emailTrim = compEmail.trim();
    const phoneTrim = compPhone.trim();

    if (nameTrim.length < 2 || nameTrim.length > 120) {
      showError('Company Name must be between 2 and 120 characters.');
      return;
    }
    if (contactTrim.length < 2 || contactTrim.length > 100) {
      showError('Contact Person must be between 2 and 100 characters.');
      return;
    }
    if (
      companies.some(
        (c) => c.name.toLowerCase() === nameTrim.toLowerCase() && c.id !== editingCompanyId
      )
    ) {
      showError(`Company "${nameTrim}" is already registered.`);
      return;
    }

    setIsSubmitting(true);
    const res = await saveCompanyAction(
      {
        name: nameTrim,
        contactPerson: contactTrim,
        email: emailTrim,
        phone: phoneTrim,
        address: compAddress.trim(),
        colorScheme: compColor,
      },
      editingCompanyId || undefined
    );
    setIsSubmitting(false);

    if (!res.success || !res.company) {
      showError(res.error || 'Failed to save company.');
      return;
    }

    const saved = res.company;
    setCompanies((prev) =>
      editingCompanyId
        ? prev.map((item) => (item.id === editingCompanyId ? saved : item))
        : [...prev, saved]
    );
    showSuccess(
      editingCompanyId
        ? `Company "${saved.name}" updated.`
        : `Company "${saved.name}" registered.`
    );
    resetCompanyForm();
  };

  const handleDeleteCompany = async (c: ClientCompanyEntity) => {
    setIsSubmitting(true);
    const res = await deleteCompanyAction(c.id);
    setIsSubmitting(false);
    if (!res.success) {
      showError(res.error || 'Failed to delete company.');
      return;
    }
    setCompanies((prev) => prev.filter((item) => item.id !== c.id));
    if (editingCompanyId === c.id) resetCompanyForm();
    showSuccess(`Company "${c.name}" deleted.`);
  };

  // ============================================================================
  // 2. MACHINE CRUD STATE & HANDLERS
  // ============================================================================
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [machName, setMachName] = useState('');
  const [machHeads, setMachHeads] = useState<number>(15);
  const [machSpeed, setMachSpeed] = useState<number>(1000);
  const [machBrand, setMachBrand] = useState('Tajima');
  const [machTypes, setMachTypes] = useState<EmbroideryTypeOption[]>(['Normal']);
  const [machStatus, setMachStatus] = useState<MachineOperationalStatus>('Active');

  const resetMachineForm = () => {
    setEditingMachineId(null);
    setMachName('');
    setMachHeads(15);
    setMachSpeed(1000);
    setMachBrand('Tajima');
    setMachTypes(['Normal']);
    setMachStatus('Active');
  };

  const handleEditMachine = (m: MachineEntity) => {
    setEditingMachineId(m.id);
    setMachName(m.name);
    setMachHeads(m.heads);
    setMachSpeed(m.speed);
    setMachBrand(m.brand);
    setMachTypes(m.embroideryTypes.length > 0 ? m.embroideryTypes : ['Normal']);
    setMachStatus(m.status);
  };

  const toggleMachineType = (type: EmbroideryTypeOption) => {
    setMachTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleQuickAssignMachineCrew = async (
    mac: MachineEntity,
    nextOperatorRaw: string,
    nextHelperRaw: string
  ) => {
    const validOp = resolveRealEmployeeLabel(nextOperatorRaw);
    const validHelp = resolveRealEmployeeLabel(nextHelperRaw) || 'None';

    if (validOp && validHelp !== 'None' && validOp === validHelp) {
      showError('Operator and Helper cannot be the same employee on the same machine.');
      return;
    }

    if (validOp) {
      const conflictOpMac = findMachineWithEmployee(validOp, mac.id, mac.name);
      if (conflictOpMac) {
        showError(
          `${validOp} danatamath ${conflictOpMac.name} ekata assign karala thiyenne! Machine operatorsla duplicate wenna ba.`
        );
        return;
      }
    }

    if (validHelp !== 'None') {
      const conflictHelpMac = findMachineWithEmployee(validHelp, mac.id, mac.name);
      if (conflictHelpMac) {
        showError(
          `${validHelp} danatamath ${conflictHelpMac.name} ekata assign karala thiyenne! Machine crew duplicate wenna ba.`
        );
        return;
      }
    }

    const prevOp = mac.operatorName;
    const prevHelp = mac.helperName;

    // Optimistic update on machine inventory
    setMachines((prev) =>
      prev.map((m) =>
        m.id === mac.id ? { ...m, operatorName: validOp, helperName: validHelp } : m
      )
    );

    if (planMachineName === mac.name) {
      setPlanOperator(validOp);
      setPlanHelper(validHelp);
    }

    const res = await assignMachineCrewAction(mac.id, validOp, validHelp);
    if (!res.success || !res.machine) {
      setMachines((prev) =>
        prev.map((m) =>
          m.id === mac.id ? { ...m, operatorName: prevOp, helperName: prevHelp } : m
        )
      );
      showError(res.error || `Failed to assign operator to ${mac.name}.`);
      return;
    }

    setMachines((prev) =>
      prev.map((m) => (m.id === mac.id ? res.machine! : m))
    );
    if (validOp) {
      setPlans((prev) =>
        prev.map((p) =>
          (p.machineId === mac.id || p.machineName === mac.name) && p.date >= todayStr
            ? { ...p, operatorName: validOp, helperName: validHelp }
            : p
        )
      );
    }
    showSuccess(
      validOp
        ? `Assigned ${validOp} to ${mac.name}${validHelp !== 'None' ? ` (Helper: ${validHelp})` : ''}.`
        : `Cleared operator assignment for ${mac.name}. Assign an operator before running production.`
    );
  };

  const handleMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrim = machName.trim();
    const brandTrim = machBrand.trim();

    if (nameTrim.length < 2 || nameTrim.length > 60) {
      showError('Machine Identifier / Name must be between 2 and 60 characters.');
      return;
    }
    if (
      machines.some(
        (m) => m.name.toLowerCase() === nameTrim.toLowerCase() && m.id !== editingMachineId
      )
    ) {
      showError(`Machine "${nameTrim}" is already registered.`);
      return;
    }
    if (machTypes.length === 0) {
      showError('Please select at least one supported embroidery type (Normal, Chenille, or Sequence).');
      return;
    }
    if (machHeads < 1 || machHeads > 60) {
      showError('Head Count must be between 1 and 60.');
      return;
    }
    if (machSpeed < 100 || machSpeed > 3000) {
      showError('Speed (SPM) must be between 100 and 3,000.');
      return;
    }
    const existingMachine = editingMachineId
      ? machines.find((m) => m.id === editingMachineId)
      : undefined;
    const preservedOp = existingMachine ? getMachineAssignedOperator(existingMachine) : '';
    const preservedHelp = existingMachine ? getMachineAssignedHelper(existingMachine) : 'None';

    setIsSubmitting(true);
    const res = await saveMachineAction(
      {
        name: nameTrim,
        brand: brandTrim,
        heads: machHeads,
        speed: machSpeed,
        embroideryTypes: machTypes,
        status: machStatus,
        operatorName: preservedOp,
        helperName: preservedHelp,
      },
      editingMachineId || undefined
    );
    setIsSubmitting(false);

    if (!res.success || !res.machine) {
      showError(res.error || 'Failed to save machine.');
      return;
    }

    const saved = res.machine;
    setMachines((prev) =>
      editingMachineId
        ? prev.map((item) => (item.id === editingMachineId ? saved : item))
        : [...prev, saved]
    );
    showSuccess(
      editingMachineId ? `Machine "${saved.name}" updated.` : `Machine "${saved.name}" registered.`
    );
    resetMachineForm();
  };

  const handleDeleteMachine = async (m: MachineEntity) => {
    setIsSubmitting(true);
    const res = await deleteMachineAction(m.id);
    setIsSubmitting(false);
    if (!res.success) {
      showError(res.error || 'Failed to delete machine.');
      return;
    }
    setMachines((prev) => prev.filter((item) => item.id !== m.id));
    setPlans((prev) => prev.filter((p) => p.machineId !== m.id && p.machineName !== m.name));
    if (editingMachineId === m.id) resetMachineForm();
    showSuccess(`Machine "${m.name}" deleted.`);
  };

  // ============================================================================
  // 3. STYLE & PARTS MASTER CRUD + STRIKE-OFF SHEET STATE & HANDLERS
  // ============================================================================
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleCode, setStyleCode] = useState('');
  const [styleCompany, setStyleCompany] = useState('');
  const [styleName, setStyleName] = useState('');
  const [styleFabric, setStyleFabric] = useState('White');
  const [styleCurrency, setStyleCurrency] = useState('LKR');
  const [stylePrice, setStylePrice] = useState<number>(150);
  const [styleQty, setStyleQty] = useState<number>(1000);
  const [draftSizes, setDraftSizes] = useState<StyleSizeItem[]>([
    { size: '', qty: 1000 },
  ]);
  const [sizeLimitWarning, setSizeLimitWarning] = useState<string | null>(null);
  const [draftParts, setDraftParts] = useState<StylePartItem[]>(() => [
    createEmptyPart(needleSpecOptions[0] || ''),
  ]);

  // Done Styles Tab Filter States
  const [doneSearchQuery, setDoneSearchQuery] = useState('');
  const [doneCompanyFilter, setDoneCompanyFilter] = useState('ALL');
  const [doneFabricFilter, setDoneFabricFilter] = useState('ALL');
  const [doneSizeFilter, setDoneSizeFilter] = useState('ALL');
  const [doneDateFrom, setDoneDateFrom] = useState('');
  const [doneDateTo, setDoneDateTo] = useState('');

  const sizeBreakdownTotal = useMemo(
    () => draftSizes.reduce((sum, item) => sum + (Math.max(0, Number(item.qty)) || 0), 0),
    [draftSizes]
  );

  // Ensure draft parts use an actual registered needle when stockNeedles loads
  useEffect(() => {
    if (needleSpecOptions.length > 0) {
      setDraftParts((prev) =>
        prev.map((p) =>
          !p.needle || !needleSpecOptions.includes(p.needle)
            ? { ...p, needle: needleSpecOptions[0] }
            : p
        )
      );
    }
  }, [needleSpecOptions]);

  // Strike-Off Sheet View state
  const [selectedStrikeOffStyleId, setSelectedStrikeOffStyleId] = useState<string>('');
  const [strikeSentTo, setStrikeSentTo] = useState('');
  const [strikeSentBy, setStrikeSentBy] = useState('');
  const [strikeSubmissionNo, setStrikeSubmissionNo] = useState('01');
  const [strikeRemarks, setStrikeRemarks] = useState('');
  const [strikeNeedleSupplier, setStrikeNeedleSupplier] = useState('Groz-Beckert');

  useEffect(() => {
    if (!styleCompany && companies.length > 0) {
      setStyleCompany(companies[0].name);
    }
  }, [companies, styleCompany]);

  useEffect(() => {
    if (!selectedStrikeOffStyleId && styles.length > 0) {
      setSelectedStrikeOffStyleId(styles[0].id);
    }
  }, [styles, selectedStrikeOffStyleId]);

  const resetStyleForm = () => {
    setEditingStyleId(null);
    setStyleCode('');
    setStyleCompany(companies[0]?.name || '');
    setStyleName('');
    setStyleFabric('White');
    setStyleCurrency('LKR');
    setStylePrice(150);
    setStyleQty(1000);
    setDraftSizes([{ size: '', qty: 1000 }]);
    setSizeLimitWarning(null);
    setDraftParts([createEmptyPart(needleSpecOptions[0] || '')]);
  };

  const handleEditStyle = (s: StyleMasterEntity) => {
    setEditingStyleId(s.id);
    setStyleCode(s.code);
    setStyleCompany(s.company);
    setStyleName(s.name);
    setStyleFabric(s.fabric || 'White');
    setStyleCurrency(s.currency || 'LKR');
    setStylePrice(s.price || 0);
    const totalOrderQty = s.qty || 1000;
    setStyleQty(totalOrderQty);
    setSizeLimitWarning(null);
    setDraftSizes(
      s.sizeBreakdown && s.sizeBreakdown.length > 0
        ? JSON.parse(JSON.stringify(s.sizeBreakdown))
        : [{ size: '', qty: totalOrderQty }]
    );
    setDraftParts(
      s.parts.length > 0
        ? JSON.parse(JSON.stringify(s.parts))
        : [createEmptyPart(needleSpecOptions[0] || '')]
    );
  };

  const allAvailableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const s of styles) {
      if (s.sizeBreakdown) {
        for (const sz of s.sizeBreakdown) {
          if (sz.size && sz.size.trim()) set.add(sz.size.trim());
        }
      }
    }
    for (const p of plans) {
      if (p.size && p.size.trim()) set.add(p.size.trim());
    }
    return Array.from(set);
  }, [styles, plans]);

  const handleAddSizeRow = () => {
    const remainingToAllocate = (styleQty || 0) - sizeBreakdownTotal;
    if (remainingToAllocate <= 0) {
      setSizeLimitWarning(
        `Total Order Qty (${styleQty.toLocaleString()} Pcs) sampurnayenma fill wela thiyenne. Wadiyen add karanna ba! Aluth size ekak danna nam kalin size ekaka Qty eka adu karanna.`
      );
      return;
    }
    setSizeLimitWarning(null);
    setDraftSizes((prev) => [...prev, { size: '', qty: remainingToAllocate }]);
  };

  const handleRemoveSizeRow = (sIdx: number) => {
    if (draftSizes.length <= 1) {
      showError('At least one Garment Size & Quantity is required.');
      return;
    }
    setSizeLimitWarning(null);
    setDraftSizes((prev) => prev.filter((_, idx) => idx !== sIdx));
  };

  const handleUpdateSizeField = (
    sIdx: number,
    field: 'size' | 'qty',
    value: string | number
  ) => {
    if (field === 'size') {
      setDraftSizes((prev) =>
        prev.map((item, idx) => (idx === sIdx ? { ...item, size: String(value) } : item))
      );
      return;
    }

    const otherRowsSum = draftSizes.reduce(
      (sum, item, idx) =>
        idx === sIdx ? sum : sum + (Math.max(0, Number(item.qty)) || 0),
      0
    );
    const maxForThisRow = Math.max(0, (styleQty || 0) - otherRowsSum);
    const rawNum = Math.max(0, Number(value) || 0);

    if (rawNum > maxForThisRow) {
      setSizeLimitWarning(
        `Total Order Qty (${styleQty.toLocaleString()} Pcs) walata wada wadiyen fill karanna ba! Me size ekata danna puluwan uparima gaana ${maxForThisRow.toLocaleString()} Pcs.`
      );
      setDraftSizes((prev) =>
        prev.map((item, idx) => (idx === sIdx ? { ...item, qty: maxForThisRow } : item))
      );
    } else {
      setSizeLimitWarning(null);
      setDraftSizes((prev) =>
        prev.map((item, idx) => (idx === sIdx ? { ...item, qty: rawNum } : item))
      );
    }
  };

  const handleAutoBalanceSizes = () => {
    setSizeLimitWarning(null);
    if (draftSizes.length === 0) {
      setDraftSizes([{ size: '', qty: Math.max(1, styleQty || 1) }]);
      return;
    }
    let running = 0;
    const clamped = draftSizes.map((item, idx) => {
      const remaining = Math.max(0, styleQty - running);
      if (idx === draftSizes.length - 1) {
        return { ...item, qty: remaining };
      }
      const nextQty = Math.min(Math.max(0, Number(item.qty) || 0), remaining);
      running += nextQty;
      return { ...item, qty: nextQty };
    });
    setDraftSizes(clamped);
  };

  const handleAddPart = () => {
    setDraftParts((prev) => [...prev, createEmptyPart(needleSpecOptions[0] || '')]);
  };

  const handleRemovePart = (pIdx: number) => {
    if (draftParts.length <= 1) {
      showError('A style must contain at least one Garment Part.');
      return;
    }
    setDraftParts((prev) => prev.filter((_, idx) => idx !== pIdx));
  };

  const handleUpdatePartField = <K extends keyof StylePartItem>(
    pIdx: number,
    field: K,
    value: StylePartItem[K]
  ) => {
    setDraftParts((prev) =>
      prev.map((part, idx) => (idx === pIdx ? { ...part, [field]: value } : part))
    );
  };

  const handleAddThread = (pIdx: number) => {
    setDraftParts((prev) =>
      prev.map((part, idx) =>
        idx === pIdx
          ? {
              ...part,
              threads: [
                ...part.threads,
                { color: '', shade: '', brand: 'Madeira', mLen: 0, cLen: 5000 },
              ],
            }
          : part
      )
    );
  };

  const handleRemoveThread = (pIdx: number, tIdx: number) => {
    setDraftParts((prev) =>
      prev.map((part, idx) => {
        if (idx !== pIdx) return part;
        if (part.threads.length <= 1) return part;
        return {
          ...part,
          threads: part.threads.filter((_, i) => i !== tIdx),
        };
      })
    );
  };

  const handleUpdateThreadField = (
    pIdx: number,
    tIdx: number,
    field: 'color' | 'shade' | 'brand' | 'mLen' | 'cLen',
    value: string | number
  ) => {
    setDraftParts((prev) =>
      prev.map((part, idx) => {
        if (idx !== pIdx) return part;
        return {
          ...part,
          threads: part.threads.map((th, i) =>
            i === tIdx ? { ...th, [field]: value } : th
          ),
        };
      })
    );
  };

  const handleStyleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeTrim = styleCode.trim();
    const nameTrim = styleName.trim();
    const compTrim = styleCompany.trim();

    if (!compTrim) {
      showError('Please register and select a Client / Company first.');
      return;
    }
    if (!codeTrim || codeTrim.length > 60) {
      showError('Style Code is required (max 60 characters).');
      return;
    }
    if (
      styles.some(
        (s) => s.code.toLowerCase() === codeTrim.toLowerCase() && s.id !== editingStyleId
      )
    ) {
      showError(`Style Code "${codeTrim}" is already registered.`);
      return;
    }
    if (!nameTrim || nameTrim.length > 120) {
      showError('Style Name is required (max 120 characters).');
      return;
    }

    const cleanedSizes = draftSizes
      .map((sz) => ({
        size: sz.size.trim(),
        qty: Math.max(0, Math.round(Number(sz.qty) || 0)),
      }))
      .filter((sz) => sz.size && sz.qty > 0);

    if (cleanedSizes.length === 0) {
      showError('Please enter at least one Garment Size and Quantity.');
      return;
    }

    const uniqueSizeCheck = new Set(cleanedSizes.map((sz) => sz.size.toUpperCase()));
    if (uniqueSizeCheck.size !== cleanedSizes.length) {
      showError('Duplicate sizes found in Size Breakdown. Each size must be listed once.');
      return;
    }

    const sumSizes = cleanedSizes.reduce((sum, sz) => sum + sz.qty, 0);
    if (sumSizes > styleQty) {
      showError(
        `Size Breakdown total (${sumSizes.toLocaleString()} Pcs) cannot exceed Total Order Qty (${styleQty.toLocaleString()} Pcs).`
      );
      return;
    }

    if (draftParts.length === 0 || draftParts.some((p) => !p.name.trim())) {
      showError('Every Garment Part must have a Part Location name (e.g., Front Logo).');
      return;
    }

    const matchedComp = companies.find((c) => c.name === compTrim);

    setIsSubmitting(true);
    const res = await saveStyleAction(
      {
        clientId: matchedComp?.id || null,
        code: codeTrim,
        company: compTrim,
        name: nameTrim,
        fabric: styleFabric,
        currency: styleCurrency,
        price: stylePrice,
        qty: styleQty,
        sizeBreakdown: cleanedSizes,
        parts: draftParts.map((p) => ({
          ...p,
          name: p.name.trim(),
          qty: Math.max(1, Number(p.qty) || 1),
        })),
      },
      editingStyleId || undefined
    );
    setIsSubmitting(false);

    if (!res.success || !res.style) {
      showError(res.error || 'Failed to save style.');
      return;
    }

    const saved = res.style;
    setStyles((prev) =>
      editingStyleId
        ? prev.map((item) => (item.id === editingStyleId ? saved : item))
        : [saved, ...prev]
    );
    if (saved.sizeBreakdown && saved.sizeBreakdown.length > 0) {
      const validSizesSet = new Set(saved.sizeBreakdown.map((sz) => sz.size));
      const fallbackSize = saved.sizeBreakdown[0].size;
      setPlans((prev) =>
        prev.map((p) => {
          const isThisStyle =
            (p.styleId && p.styleId === saved.id) ||
            (p.styleCode && p.styleCode.toLowerCase() === saved.code.toLowerCase()) ||
            p.styleName.toLowerCase() === saved.name.toLowerCase();
          if (isThisStyle && !validSizesSet.has(p.size)) {
            return { ...p, size: fallbackSize };
          }
          return p;
        })
      );
    }
    setSelectedStrikeOffStyleId(saved.id);
    showSuccess(
      editingStyleId
        ? `Style "${saved.code ? `${saved.code} - ` : ''}${saved.name}" updated.`
        : `Style "${saved.code ? `${saved.code} - ` : ''}${saved.name}" saved.`
    );
    resetStyleForm();
  };

  const handleToggleStyleCompleted = async (
    s: StyleMasterEntity,
    nextDone: boolean
  ) => {
    setIsSubmitting(true);
    const res = await toggleStyleCompletedAction(s.id, nextDone);
    setIsSubmitting(false);
    if (!res.success || !res.style) {
      showError(res.error || 'Failed to update style status.');
      return;
    }
    const updated = res.style;
    setStyles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    showSuccess(
      nextDone
        ? `Style "${updated.code ? `${updated.code} - ` : ''}${updated.name}" marked as Done and moved to Done Styles.`
        : `Style "${updated.code ? `${updated.code} - ` : ''}${updated.name}" reopened as an Active Style.`
    );
  };

  const handleDeleteStyle = async (s: StyleMasterEntity) => {
    setIsSubmitting(true);
    const res = await deleteStyleAction(s.id);
    setIsSubmitting(false);
    if (!res.success) {
      showError(res.error || 'Failed to delete style.');
      return;
    }
    setStyles((prev) => prev.filter((item) => item.id !== s.id));
    setPlans((prev) => prev.filter((p) => p.styleId !== s.id && p.styleCode !== s.code));
    if (editingStyleId === s.id) resetStyleForm();
    showSuccess(`Style "${s.code} - ${s.name}" deleted.`);
  };

  const handleOpenStrikeOff = (styleId: string) => {
    setSelectedStrikeOffStyleId(styleId);
    setSubTab('strikeOff');
  };

  // ============================================================================
  // 4. DAILY PRODUCTION PLAN EDITOR & GANTT MATRIX STATE & HANDLERS
  // ============================================================================
  const [planDate, setPlanDate] = useState(todayStr);
  const [scheduleDate, setScheduleDate] = useState(todayStr);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => todayStr.slice(0, 7));
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);
  const [planShift, setPlanShift] = useState<'day' | 'night'>('day');
  const [planMachineName, setPlanMachineName] = useState('');
  const [planCompany, setPlanCompany] = useState('');
  const [planStyleId, setPlanStyleId] = useState('');
  const [planPartName, setPlanPartName] = useState('');
  const [planSize, setPlanSize] = useState('L');
  const [planStartTime, setPlanStartTime] = useState('08:00');
  const [planEndTime, setPlanEndTime] = useState('18:00');
  const [planQty, setPlanQty] = useState<number>(220);
  const [planOperator, setPlanOperator] = useState('');
  const [planHelper, setPlanHelper] = useState('None');

  // Manage Block Modal state (native <dialog>)
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingBlock, setEditingBlock] = useState<ProductionBlockEntity | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'duplicate'>('edit');
  const [modalMachineName, setModalMachineName] = useState<string>('');
  const [modalPlanQtyInput, setModalPlanQtyInput] = useState<string>('0');
  const [modalActualQtyInput, setModalActualQtyInput] = useState<string>('0');
  const [modalSize, setModalSize] = useState('L');
  const [modalPartName, setModalPartName] = useState('');
  const [modalOperator, setModalOperator] = useState('');
  const [modalHelper, setModalHelper] = useState('None');
  const [modalStartCol, setModalStartCol] = useState<number>(1);
  const [modalEndCol, setModalEndCol] = useState<number>(11);

  // Inline Click-to-Type Quantity state on Gantt Matrix blocks
  const [inlineEditBlockId, setInlineEditBlockId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<'plan' | 'actual' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  // Drag & Drop ("Adala Danna" — Move Only) state on Gantt Matrix blocks
  const [draggingBlock, setDraggingBlock] = useState<ProductionBlockEntity | null>(null);
  const [dragGrabOffsetHours, setDragGrabOffsetHours] = useState<number>(0);
  const [dragOverMachineName, setDragOverMachineName] = useState<string | null>(null);
  const [dragOverStartCol, setDragOverStartCol] = useState<number | null>(null);

  // Bar Edge Resize ("Konen Allala Length Control + Time Auto Adjust") state
  const [resizingBlock, setResizingBlock] = useState<{
    block: ProductionBlockEntity;
    edge: 'start' | 'end';
    trackLeft: number;
    trackWidth: number;
    previewStartHour: number;
    previewSpanHours: number;
  } | null>(null);
  const resizingBlockRef = useRef<{
    block: ProductionBlockEntity;
    edge: 'start' | 'end';
    trackLeft: number;
    trackWidth: number;
    previewStartHour: number;
    previewSpanHours: number;
  } | null>(null);
  const suppressNextBlockClickRef = useRef<boolean>(false);

  // Sync default dropdown values when master CRUD records change
  useEffect(() => {
    if (!planMachineName && machines.length > 0) {
      setPlanMachineName(machines[0].name);
    } else if (planMachineName && !machines.some((m) => m.name === planMachineName)) {
      setPlanMachineName(machines[0]?.name || '');
    }
  }, [machines, planMachineName]);

  useEffect(() => {
    if (!planCompany && companies.length > 0) {
      setPlanCompany(companies[0].name);
    } else if (planCompany && !companies.some((c) => c.name === planCompany)) {
      setPlanCompany(companies[0]?.name || '');
    }
  }, [companies, planCompany]);

  // Aggregate Per-Style Order & Production Breakdown across ALL plans
  const styleMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        style: StyleMasterEntity;
        orderQty: number;
        plannedQty: number;
        doneQty: number;
        remaining: number;
        lastPlanDate: string;
        isDone: boolean;
      }
    >();

    for (const s of styles) {
      map.set(s.id, {
        style: s,
        orderQty: s.qty,
        plannedQty: 0,
        doneQty: 0,
        remaining: s.qty,
        lastPlanDate: s.completedAt ? s.completedAt.split('T')[0] : '',
        isDone: s.isCompleted === true,
      });
    }

    for (const p of plans) {
      const matched =
        (p.styleId && map.get(p.styleId)) ||
        Array.from(map.values()).find(
          (item) =>
            (p.styleCode && item.style.code === p.styleCode) ||
            item.style.name === p.styleName
        );
      if (matched) {
        matched.plannedQty += p.planQty;
        matched.doneQty += p.actualQty;
        matched.remaining = Math.max(0, matched.orderQty - matched.doneQty);
        if (!matched.lastPlanDate || p.date > matched.lastPlanDate) {
          matched.lastPlanDate = p.date;
        }
      }
    }

    for (const item of map.values()) {
      if (item.style.isCompleted || (item.orderQty > 0 && item.doneQty >= item.orderQty)) {
        item.isDone = true;
      }
    }

    return Array.from(map.values());
  }, [styles, plans]);

  const activeStylesMetrics = useMemo(
    () => styleMetricsMap.filter((item) => !item.isDone),
    [styleMetricsMap]
  );

  const doneStylesMetrics = useMemo(
    () => styleMetricsMap.filter((item) => item.isDone),
    [styleMetricsMap]
  );

  const filteredDoneStylesMetrics = useMemo(() => {
    return doneStylesMetrics.filter((item) => {
      const { style, lastPlanDate } = item;
      if (doneCompanyFilter !== 'ALL') {
        if (style.company.trim().toLowerCase() !== doneCompanyFilter.trim().toLowerCase()) {
          return false;
        }
      }
      if (doneFabricFilter !== 'ALL' && style.fabric !== doneFabricFilter) {
        return false;
      }
      if (doneSizeFilter !== 'ALL') {
        const hasSize =
          style.sizeBreakdown.length > 0
            ? style.sizeBreakdown.some((sz) => sz.size === doneSizeFilter)
            : plans.some(
                (p) =>
                  (p.styleId === style.id || p.styleName === style.name) &&
                  p.size === doneSizeFilter
              );
        if (!hasSize) return false;
      }
      if (doneSearchQuery.trim()) {
        const q = doneSearchQuery.trim().toLowerCase();
        const matchesCode = style.code.toLowerCase().includes(q);
        const matchesName = style.name.toLowerCase().includes(q);
        const matchesCompany = style.company.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesCompany) {
          return false;
        }
      }
      const effectiveDate =
        (style.completedAt ? style.completedAt.split('T')[0] : '') || lastPlanDate;
      if (doneDateFrom && effectiveDate && effectiveDate < doneDateFrom) {
        return false;
      }
      if (doneDateTo && effectiveDate && effectiveDate > doneDateTo) {
        return false;
      }
      return true;
    });
  }, [
    doneStylesMetrics,
    doneCompanyFilter,
    doneFabricFilter,
    doneSizeFilter,
    doneSearchQuery,
    doneDateFrom,
    doneDateTo,
    plans,
  ]);

  const activeStyleIdsSet = useMemo(
    () => new Set(activeStylesMetrics.map((m) => m.style.id)),
    [activeStylesMetrics]
  );

  const companyFilteredStyles = useMemo(() => {
    if (!planCompany) return [];
    const targetCompany = planCompany.trim().toLowerCase();
    const selectedClient = companies.find(
      (c) => c.name.trim().toLowerCase() === targetCompany
    );
    return styles.filter((s) => {
      if (!activeStyleIdsSet.has(s.id)) return false;
      if (selectedClient && s.clientId && s.clientId === selectedClient.id) {
        return true;
      }
      return s.company.trim().toLowerCase() === targetCompany;
    });
  }, [styles, companies, planCompany, activeStyleIdsSet]);

  useEffect(() => {
    if (companyFilteredStyles.length > 0) {
      if (!planStyleId || !companyFilteredStyles.some((s) => s.id === planStyleId)) {
        setPlanStyleId(companyFilteredStyles[0].id);
      }
    } else {
      setPlanStyleId('');
    }
  }, [companyFilteredStyles, planStyleId]);

  const selectedPlanStyle = useMemo(
    () => companyFilteredStyles.find((s) => s.id === planStyleId) || null,
    [companyFilteredStyles, planStyleId]
  );

  const selectedPlanStyleSizes = useMemo<StyleSizeItem[]>(() => {
    if (!selectedPlanStyle) return [];
    if (selectedPlanStyle.sizeBreakdown && selectedPlanStyle.sizeBreakdown.length > 0) {
      return selectedPlanStyle.sizeBreakdown;
    }
    if (editingStyleId && editingStyleId === selectedPlanStyle.id) {
      return draftSizes
        .map((sz) => ({ size: sz.size.trim(), qty: Math.max(0, Number(sz.qty) || 0) }))
        .filter((sz) => sz.size && sz.qty > 0);
    }
    return [];
  }, [selectedPlanStyle, editingStyleId, draftSizes]);

  useEffect(() => {
    if (selectedPlanStyle) {
      const firstPart = selectedPlanStyle.parts[0]?.name || '';
      setPlanPartName((prev) =>
        selectedPlanStyle.parts.some((p) => p.name === prev) ? prev : firstPart
      );
      if (selectedPlanStyleSizes.length > 0) {
        setPlanSize((prev) =>
          selectedPlanStyleSizes.some((sz) => sz.size === prev)
            ? prev
            : selectedPlanStyleSizes[0].size
        );
      } else {
        setPlanSize('');
      }
    } else {
      setPlanPartName('');
      setPlanSize('');
    }
  }, [selectedPlanStyle, selectedPlanStyleSizes]);

  // Sync Operator & Helper in Schedule form to the selected Machine's assigned real operator
  useEffect(() => {
    const selectedMac = machines.find((m) => m.name === planMachineName);
    const macOp = getMachineAssignedOperator(selectedMac);
    const macHelp = getMachineAssignedHelper(selectedMac);
    setPlanOperator(macOp);
    setPlanHelper(macHelp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planMachineName, machines, activeEmployees]);

  // Filtered plans for currently selected Date & Shift
  const activeDateShiftPlans = useMemo(
    () => plans.filter((p) => p.date === planDate && p.shift === planShift),
    [plans, planDate, planShift]
  );

  // Close custom calendar popover when clicking outside
  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        calendarPopoverRef.current &&
        !calendarPopoverRef.current.contains(e.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isCalendarOpen]);

  // Per-date status summary across all shifts so Calendar highlights past dates needing Actual Qty in RED
  const dateStatusMap = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        totalBlocks: number;
        pendingActualBlocks: number;
        filledActualBlocks: number;
        totalPlan: number;
        totalActual: number;
      }
    >();

    for (const p of plans) {
      const existing = map.get(p.date) || {
        date: p.date,
        totalBlocks: 0,
        pendingActualBlocks: 0,
        filledActualBlocks: 0,
        totalPlan: 0,
        totalActual: 0,
      };
      existing.totalBlocks += 1;
      existing.totalPlan += p.planQty;
      existing.totalActual += p.actualQty;
      if (p.actualQty <= 0) {
        existing.pendingActualBlocks += 1;
      } else {
        existing.filledActualBlocks += 1;
      }
      map.set(p.date, existing);
    }

    return map;
  }, [plans]);

  // Past dates (< todayStr) that have at least 1 scheduled block with actualQty <= 0
  const pendingActualDates = useMemo(() => {
    return Array.from(dateStatusMap.values())
      .filter((d) => d.date < todayStr && d.pendingActualBlocks > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dateStatusMap, todayStr]);

  const calendarGridData = useMemo(() => {
    const [yrStr, moStr] = calendarMonth.split('-');
    const year = parseInt(yrStr, 10) || new Date().getFullYear();
    const month = parseInt(moStr, 10) || new Date().getMonth() + 1;

    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const cells: Array<{
      key: string;
      dateStr: string | null;
      dayNum: number | null;
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ key: `pad-${i}`, dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ key: dateStr, dateStr, dayNum: d });
    }

    return { year, month, monthLabel, cells };
  }, [calendarMonth]);

  const shiftCalendarMonth = (delta: number) => {
    const [yrStr, moStr] = calendarMonth.split('-');
    const year = parseInt(yrStr, 10) || new Date().getFullYear();
    const month = parseInt(moStr, 10) || new Date().getMonth() + 1;
    const nextDate = new Date(year, month - 1 + delta, 1);
    const nextYm = `${String(nextDate.getFullYear()).padStart(4, '0')}-${String(
      nextDate.getMonth() + 1
    ).padStart(2, '0')}`;
    setCalendarMonth(nextYm);
  };

  const selectViewingDate = (nextDate: string) => {
    if (!nextDate) return;
    setPlanDate(nextDate);
    setCalendarMonth(nextDate.slice(0, 7));
    if (nextDate >= todayStr) {
      setScheduleDate(nextDate);
    }
    setIsCalendarOpen(false);
  };

  const handleSchedulePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (scheduleDate < todayStr) {
      showError('You can only schedule new production plans for Today or Future dates.');
      return;
    }
    if (!planMachineName) {
      showError('Please register and select a Machine in Machine CRUD first.');
      return;
    }
    const matchedMachine = machines.find((m) => m.name === planMachineName);
    const validSelectedOp =
      resolveRealEmployeeLabel(planOperator) || getMachineAssignedOperator(matchedMachine);
    const validSelectedHelp =
      resolveRealEmployeeLabel(planHelper) || getMachineAssignedHelper(matchedMachine);

    if (!validSelectedOp) {
      showError(
        `${planMachineName} ekata aththa Operator kenek assign karala na! Palamuvenma ${planMachineName} ekata Operator kenek assign karanna (Operator nathuwa mahanna denna ba).`
      );
      return;
    }
    const conflictOpMac = findMachineWithEmployee(
      validSelectedOp,
      matchedMachine?.id,
      planMachineName
    );
    if (conflictOpMac) {
      showError(
        `${validSelectedOp} danatamath ${conflictOpMac.name} ekata assign karala thiyenne! Machine operatorsla duplicate wenna ba.`
      );
      return;
    }
    if (validSelectedHelp !== 'None') {
      const conflictHelpMac = findMachineWithEmployee(
        validSelectedHelp,
        matchedMachine?.id,
        planMachineName
      );
      if (conflictHelpMac) {
        showError(
          `${validSelectedHelp} danatamath ${conflictHelpMac.name} ekata assign karala thiyenne! Machine crew duplicate wenna ba.`
        );
        return;
      }
    }
    if (!selectedPlanStyle) {
      showError('Please register and select a Style in Style & Parts CRUD first.');
      return;
    }
    if (!planSize) {
      showError('Please register sizes for this Style in Style & Parts CRUD first.');
      return;
    }
    if (validSelectedHelp !== 'None' && validSelectedHelp === validSelectedOp) {
      showError('Operator and Helper cannot be the same employee on the same machine slot.');
      return;
    }

    const startObj = SHIFT_HOURS.find((h) => h.value === planStartTime);
    const endObj = SHIFT_HOURS.find((h) => h.value === planEndTime);
    if (!startObj || !endObj || startObj.col > endObj.col) {
      showError('Start Time cannot be later than End Time.');
      return;
    }

    const startCol = startObj.col;
    const spanHours = endObj.col - startObj.col + 1;
    const endCol = startCol + spanHours - 1;

    // Check overlapping hours on the same machine, scheduleDate, and shift
    const machinePlans = plans.filter(
      (p) =>
        p.date === scheduleDate &&
        p.shift === planShift &&
        p.machineName === planMachineName
    );
    const overlap = machinePlans.find((existing) => {
      const exStart = existing.startHour;
      const exEnd = existing.startHour + existing.spanHours - 1;
      return startCol <= exEnd && endCol >= exStart;
    });

    if (overlap) {
      showError(
        `${planMachineName} already has "${overlap.styleCode || overlap.styleName}" scheduled on ${scheduleDate} during H${overlap.startHour}–H${overlap.startHour + overlap.spanHours - 1}. Click that block to edit or choose free hours.`
      );
      return;
    }

    if (!Number.isFinite(planQty) || planQty < 1 || planQty > 500000) {
      showError('Plan Qty must be between 1 and 500,000 Pcs.');
      return;
    }

    setIsSubmitting(true);
    const res = await saveProductionBlockAction({
      machineId: matchedMachine?.id || null,
      machineName: planMachineName,
      styleId: selectedPlanStyle.id,
      styleCode: selectedPlanStyle.code,
      styleName: selectedPlanStyle.name,
      partName: planPartName,
      clientName: selectedPlanStyle.company,
      date: scheduleDate,
      shift: planShift,
      size: planSize,
      startHour: startCol,
      spanHours,
      planQty,
      actualQty: 0,
      operatorName: validSelectedOp,
      helperName: validSelectedHelp,
    });
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      showError(res.error || 'Failed to schedule production plan.');
      return;
    }

    const createdBlock = res.block;
    setPlans((prev) => [...prev, createdBlock]);
    setPlanDate(scheduleDate);
    setCalendarMonth(scheduleDate.slice(0, 7));
    setMachines((prev) =>
      prev.map((m) =>
        m.name === planMachineName
          ? { ...m, operatorName: validSelectedOp, helperName: validSelectedHelp }
          : m
      )
    );
    showSuccess(
      `Scheduled ${
        selectedPlanStyle.code
          ? `${selectedPlanStyle.code} (${selectedPlanStyle.name})`
          : selectedPlanStyle.name
      } on ${planMachineName} (${scheduleDate}) [H${startCol}–H${endCol}].`
    );
  };

  const syncCompletedStyleIfNeeded = (
    updatedBlock: ProductionBlockEntity,
    nextPlans: ProductionBlockEntity[]
  ): boolean => {
    const matchedStyle = styles.find(
      (s) =>
        (updatedBlock.styleId && s.id === updatedBlock.styleId) ||
        (updatedBlock.styleCode && s.code === updatedBlock.styleCode) ||
        s.name === updatedBlock.styleName
    );
    if (!matchedStyle) return false;

    const totalDoneForStyle = nextPlans
      .filter(
        (p) =>
          (p.styleId && p.styleId === matchedStyle.id) ||
          (p.styleCode && p.styleCode === matchedStyle.code) ||
          p.styleName === matchedStyle.name
      )
      .reduce((sum, p) => sum + p.actualQty, 0);

    if (
      matchedStyle.qty > 0 &&
      totalDoneForStyle >= matchedStyle.qty &&
      !matchedStyle.isCompleted
    ) {
      const nowIso = new Date().toISOString();
      setStyles((prev) =>
        prev.map((s) =>
          s.id === matchedStyle.id
            ? { ...s, isCompleted: true, completedAt: s.completedAt || nowIso }
            : s
        )
      );
      showSuccess(
        `Style "${matchedStyle.code ? `${matchedStyle.code} — ` : ''}${matchedStyle.name}" reached 100% (${totalDoneForStyle.toLocaleString()} / ${matchedStyle.qty.toLocaleString()} Pcs) and moved to Done Styles!`
      );
      return true;
    }
    return false;
  };

  const startInlineBlockQtyEdit = (
    block: ProductionBlockEntity,
    field: 'plan' | 'actual',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (field === 'actual' && block.date >= todayStr) {
      showError(
        `Actual Qty eka e dawasa (${block.date}) iwara wenakan fill karanna ba! Pahuwada (${block.date} dawasa iwara unata passe) Actual Qty eka fill karanna.`
      );
      return;
    }
    setInlineEditBlockId(block.id);
    setInlineEditField(field);
    setInlineEditValue(String(field === 'plan' ? block.planQty : block.actualQty));
  };

  const cancelInlineBlockQtyEdit = () => {
    setInlineEditBlockId(null);
    setInlineEditField(null);
    setInlineEditValue('');
  };

  const commitInlineBlockQtyEdit = async (block: ProductionBlockEntity) => {
    if (inlineEditBlockId !== block.id || !inlineEditField) return;
    const field = inlineEditField;
    const parsed = parseInt(inlineEditValue.trim(), 10);
    cancelInlineBlockQtyEdit();

    if (!Number.isFinite(parsed)) return;

    if (field === 'actual' && block.date >= todayStr) {
      showError(
        `Actual Qty eka e dawasa (${block.date}) iwara wenakan fill karanna ba! Pahuwada (${block.date} dawasa iwara unata passe) Actual Qty eka fill karanna.`
      );
      return;
    }

    const nextPlanQty = field === 'plan' ? Math.max(1, parsed) : block.planQty;
    const nextActualQty = field === 'actual' ? Math.max(0, parsed) : block.actualQty;

    if (nextPlanQty === block.planQty && nextActualQty === block.actualQty) {
      return;
    }

    setIsSubmitting(true);
    const res = await saveProductionBlockAction(
      {
        machineId: block.machineId,
        machineName: block.machineName,
        styleId: block.styleId,
        styleCode: block.styleCode,
        styleName: block.styleName,
        partName: block.partName,
        clientName: block.clientName,
        date: block.date,
        shift: block.shift,
        size: block.size,
        startHour: block.startHour,
        spanHours: block.spanHours,
        planQty: nextPlanQty,
        actualQty: nextActualQty,
        operatorName: block.operatorName,
        helperName: block.helperName,
      },
      block.id
    );
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      showError(res.error || 'Failed to update quantity.');
      return;
    }

    const updated = res.block;
    const nextPlans = plans.map((b) => (b.id === updated.id ? updated : b));
    setPlans(nextPlans);

    if (!syncCompletedStyleIfNeeded(updated, nextPlans)) {
      showSuccess(
        `Updated ${updated.machineName}: Plan ${updated.planQty} / Actual ${updated.actualQty} Pcs.`
      );
    }
  };

  const formatBlockTimeRange = (startHour: number, spanHours: number) => {
    const startCol = Math.max(1, Math.min(11, startHour));
    const endCol = Math.max(startCol, Math.min(11, startCol + spanHours - 1));
    const startObj = SHIFT_HOURS.find((h) => h.col === startCol) || SHIFT_HOURS[0];
    const endObj = SHIFT_HOURS.find((h) => h.col === endCol) || SHIFT_HOURS[endCol - 1];
    const endFinishCol = endCol + 1;
    const endFinishLabel =
      endFinishCol <= 11
        ? SHIFT_HOURS.find((h) => h.col === endFinishCol)?.label || endObj.label
        : '07:00 PM';
    return {
      startCol,
      endCol,
      hoursCount: endCol - startCol + 1,
      startLabel: startObj.label,
      endSlotLabel: endObj.label,
      endFinishLabel,
      shortText: `${startObj.value}–${endFinishCol <= 11 ? SHIFT_HOURS.find((h) => h.col === endFinishCol)?.value || '19:00' : '19:00'} (H${startCol}–H${endCol} • ${endCol - startCol + 1}h)`,
    };
  };

  const handleStartBlockResize = (
    block: ProductionBlockEntity,
    edge: 'start' | 'end',
    e: React.MouseEvent<HTMLElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    cancelInlineBlockQtyEdit();

    const trackEl = e.currentTarget.closest('[data-gantt-track="true"]') as HTMLElement | null;
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    if (rect.width <= 0) return;

    const initial = {
      block,
      edge,
      trackLeft: rect.left,
      trackWidth: rect.width,
      previewStartHour: block.startHour,
      previewSpanHours: block.spanHours,
    };
    resizingBlockRef.current = initial;
    setResizingBlock(initial);
  };

  useEffect(() => {
    if (!resizingBlock) return;

    const handleMouseMove = (e: MouseEvent) => {
      const cur = resizingBlockRef.current;
      if (!cur) return;

      const relX = Math.max(0, Math.min(cur.trackWidth - 1, e.clientX - cur.trackLeft));
      const hoveredCol = Math.max(
        1,
        Math.min(11, Math.floor((relX / cur.trackWidth) * 11) + 1)
      );

      const origStart = cur.block.startHour;
      const origEnd = Math.min(11, cur.block.startHour + cur.block.spanHours - 1);

      const otherBlocks = plans.filter(
        (p) =>
          p.id !== cur.block.id &&
          p.machineName === cur.block.machineName &&
          p.date === cur.block.date &&
          p.shift === cur.block.shift
      );

      let nextStart = origStart;
      let nextEnd = origEnd;

      if (cur.edge === 'end') {
        let maxEnd = 11;
        for (const ob of otherBlocks) {
          if (ob.startHour > origStart) {
            maxEnd = Math.min(maxEnd, ob.startHour - 1);
          }
        }
        nextEnd = Math.max(origStart, Math.min(maxEnd, hoveredCol));
      } else {
        let minStart = 1;
        for (const ob of otherBlocks) {
          const obEnd = ob.startHour + ob.spanHours - 1;
          if (obEnd < origEnd) {
            minStart = Math.max(minStart, obEnd + 1);
          }
        }
        nextStart = Math.min(origEnd, Math.max(minStart, hoveredCol));
      }

      const nextSpan = Math.max(1, nextEnd - nextStart + 1);
      if (
        nextStart !== cur.previewStartHour ||
        nextSpan !== cur.previewSpanHours
      ) {
        const updated = {
          ...cur,
          previewStartHour: nextStart,
          previewSpanHours: nextSpan,
        };
        resizingBlockRef.current = updated;
        setResizingBlock(updated);
      }
    };

    const handleMouseUp = async () => {
      const fin = resizingBlockRef.current;
      resizingBlockRef.current = null;
      setResizingBlock(null);
      suppressNextBlockClickRef.current = true;
      setTimeout(() => {
        suppressNextBlockClickRef.current = false;
      }, 150);

      if (!fin) return;
      if (
        fin.previewStartHour === fin.block.startHour &&
        fin.previewSpanHours === fin.block.spanHours
      ) {
        return;
      }

      const source = fin.block;
      const newStart = fin.previewStartHour;
      const newSpan = fin.previewSpanHours;
      const newEnd = newStart + newSpan - 1;

      const optimistic: ProductionBlockEntity = {
        ...source,
        startHour: newStart,
        spanHours: newSpan,
      };
      setPlans((prev) => prev.map((b) => (b.id === source.id ? optimistic : b)));

      setIsSubmitting(true);
      const res = await saveProductionBlockAction(
        {
          machineId: source.machineId,
          machineName: source.machineName,
          styleId: source.styleId,
          styleCode: source.styleCode,
          styleName: source.styleName,
          partName: source.partName,
          clientName: source.clientName,
          date: source.date,
          shift: source.shift,
          size: source.size,
          startHour: newStart,
          spanHours: newSpan,
          planQty: source.planQty,
          actualQty: source.actualQty,
          operatorName: source.operatorName,
          helperName: source.helperName,
        },
        source.id
      );
      setIsSubmitting(false);

      if (!res.success || !res.block) {
        setPlans((prev) => prev.map((b) => (b.id === source.id ? source : b)));
        showError(res.error || 'Failed to resize production block time.');
        return;
      }

      const saved = res.block;
      setPlans((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      const tInfo = formatBlockTimeRange(newStart, newSpan);
      showSuccess(
        `Time auto-adjusted on ${saved.machineName}: ${tInfo.startLabel} – ${tInfo.endFinishLabel} [H${newStart}–H${newEnd} • ${newSpan}h].`
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizingBlock, plans]);

  const findSmartDuplicateTarget = (block: ProductionBlockEntity) => {
    const blockEnd = Math.min(11, block.startHour + block.spanHours - 1);

    // Only consider machines that have a real Operator assigned
    const currentMacIdx = machines.findIndex((m) => m.name === block.machineName);
    const orderedMachines = (
      currentMacIdx >= 0
        ? [
            ...machines.slice(currentMacIdx + 1),
            ...machines.slice(0, currentMacIdx),
          ]
        : machines.filter((m) => m.name !== block.machineName)
    ).filter((m) => Boolean(getMachineAssignedOperator(m)));

    for (const m of orderedMachines) {
      const macBlocks = plans.filter(
        (p) => p.machineName === m.name && p.date === block.date && p.shift === block.shift
      );
      const hasConflict = macBlocks.some((p) => {
        const exStart = p.startHour;
        const exEnd = p.startHour + p.spanHours - 1;
        return block.startHour <= exEnd && blockEnd >= exStart;
      });
      if (!hasConflict) {
        return {
          machineName: m.name,
          startCol: block.startHour,
          endCol: blockEnd,
          conflictFree: true,
        };
      }
    }

    // 2. Otherwise check if next contiguous hour slot on the same machine is free
    const currentMachine = machines.find((m) => m.name === block.machineName);
    if (getMachineAssignedOperator(currentMachine)) {
      const sameMachineBlocks = plans.filter(
        (p) =>
          p.machineName === block.machineName &&
          p.date === block.date &&
          p.shift === block.shift
      );
      const nextStart = blockEnd + 1;
      if (nextStart <= 11) {
        const desiredEnd = Math.min(11, nextStart + block.spanHours - 1);
        const conflictOnSame = sameMachineBlocks.some((p) => {
          const exStart = p.startHour;
          const exEnd = p.startHour + p.spanHours - 1;
          return nextStart <= exEnd && desiredEnd >= exStart;
        });
        if (!conflictOnSame) {
          return {
            machineName: block.machineName,
            startCol: nextStart,
            endCol: desiredEnd,
            conflictFree: true,
          };
        }
      }
    }

    // 3. Otherwise check any free hour window on any machine that has an assigned operator
    for (const m of [
      ...orderedMachines,
      ...(currentMachine && getMachineAssignedOperator(currentMachine) ? [currentMachine] : []),
    ]) {
      const macBlocks = plans.filter(
        (p) => p.machineName === m.name && p.date === block.date && p.shift === block.shift
      );
      for (let h = 1; h <= 11; h++) {
        const hourTaken = macBlocks.some(
          (p) => h >= p.startHour && h <= p.startHour + p.spanHours - 1
        );
        if (!hourTaken) {
          let maxEnd = h;
          while (
            maxEnd < Math.min(11, h + block.spanHours - 1) &&
            !macBlocks.some(
              (p) => maxEnd + 1 >= p.startHour && maxEnd + 1 <= p.startHour + p.spanHours - 1
            )
          ) {
            maxEnd++;
          }
          return {
            machineName: m.name,
            startCol: h,
            endCol: maxEnd,
            conflictFree: true,
          };
        }
      }
    }

    return {
      machineName: block.machineName,
      startCol: block.startHour,
      endCol: blockEnd,
      conflictFree: false,
    };
  };

  const handleQuickDuplicateBlock = async (
    block: ProductionBlockEntity,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    cancelInlineBlockQtyEdit();

    const target = findSmartDuplicateTarget(block);
    if (!target.conflictFree) {
      openManageBlockModal(block, 'duplicate');
      return;
    }

    const matchedMachine = machines.find((m) => m.name === target.machineName);
    const validOp = getMachineAssignedOperator(matchedMachine);
    const validHelp = getMachineAssignedHelper(matchedMachine);
    if (!validOp) {
      openManageBlockModal(block, 'duplicate');
      return;
    }

    const spanHours = target.endCol - target.startCol + 1;

    setIsSubmitting(true);
    const res = await saveProductionBlockAction({
      machineId: matchedMachine?.id ?? block.machineId,
      machineName: target.machineName,
      styleId: block.styleId,
      styleCode: block.styleCode,
      styleName: block.styleName,
      partName: block.partName,
      clientName: block.clientName,
      date: block.date,
      shift: block.shift,
      size: block.size,
      startHour: target.startCol,
      spanHours,
      planQty: block.planQty,
      actualQty: 0,
      operatorName: validOp,
      helperName: validHelp,
    });
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      showError(res.error || 'Failed to duplicate production block.');
      return;
    }

    const created = res.block;
    setPlans((prev) => [...prev, created]);
    showSuccess(
      `Duplicated "${created.styleCode || created.styleName}" onto ${created.machineName} [H${created.startHour}–H${created.startHour + created.spanHours - 1}].`
    );
  };

  const resolveDropSlotOnMachine = (
    block: ProductionBlockEntity,
    targetMachineName: string,
    preferredStartCol: number
  ): { startHour: number; spanHours: number; hasConflict: boolean } => {
    const clampedStart = Math.max(1, Math.min(11 - block.spanHours + 1, preferredStartCol));
    const clampedEnd = clampedStart + block.spanHours - 1;

    const otherBlocks = plans.filter(
      (p) =>
        p.id !== block.id &&
        p.machineName === targetMachineName &&
        p.date === block.date &&
        p.shift === block.shift
    );

    const directConflict = otherBlocks.some((p) => {
      const exStart = p.startHour;
      const exEnd = p.startHour + p.spanHours - 1;
      return clampedStart <= exEnd && clampedEnd >= exStart;
    });

    if (!directConflict) {
      return { startHour: clampedStart, spanHours: block.spanHours, hasConflict: false };
    }

    // Check if the exact hovered column is free and fit within contiguous free hours
    const hoveredFree = !otherBlocks.some(
      (p) =>
        preferredStartCol >= p.startHour &&
        preferredStartCol <= p.startHour + p.spanHours - 1
    );
    if (hoveredFree) {
      let maxEnd = preferredStartCol;
      while (
        maxEnd < Math.min(11, preferredStartCol + block.spanHours - 1) &&
        !otherBlocks.some(
          (p) => maxEnd + 1 >= p.startHour && maxEnd + 1 <= p.startHour + p.spanHours - 1
        )
      ) {
        maxEnd++;
      }
      return {
        startHour: preferredStartCol,
        spanHours: maxEnd - preferredStartCol + 1,
        hasConflict: false,
      };
    }

    return { startHour: clampedStart, spanHours: block.spanHours, hasConflict: true };
  };

  const handleBlockDragStart = (
    block: ProductionBlockEntity,
    e: React.DragEvent<HTMLElement>
  ) => {
    if (resizingBlockRef.current) {
      e.preventDefault();
      return;
    }
    cancelInlineBlockQtyEdit();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    let offsetHours = 0;
    if (rect.width > 0 && block.spanHours > 1) {
      const relX = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      offsetHours = Math.floor((relX / rect.width) * block.spanHours);
    }

    setDraggingBlock(block);
    setDragGrabOffsetHours(offsetHours);
    setDragOverMachineName(block.machineName);
    setDragOverStartCol(block.startHour);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
  };

  const handleBlockDragEnd = () => {
    setDraggingBlock(null);
    setDragGrabOffsetHours(0);
    setDragOverMachineName(null);
    setDragOverStartCol(null);
  };

  const executeDropOnMachine = async (
    targetMachine: MachineEntity,
    rawTargetStartCol: number
  ) => {
    if (!draggingBlock) return;
    const sourceBlock = draggingBlock;
    handleBlockDragEnd();

    const targetMachineOp = getMachineAssignedOperator(targetMachine);
    const targetMachineHelp = getMachineAssignedHelper(targetMachine);
    if (!targetMachineOp) {
      showError(
        `${targetMachine.name} ekata aththa Operator kenek assign karala na! Palamuvenma ${targetMachine.name} ekata Operator kenek assign karanna (Operator nathuwa mahanna denna ba).`
      );
      return;
    }

    const slot = resolveDropSlotOnMachine(
      sourceBlock,
      targetMachine.name,
      rawTargetStartCol
    );

    if (slot.hasConflict) {
      showError(
        `${targetMachine.name} already has a block scheduled during H${slot.startHour}–H${slot.startHour + slot.spanHours - 1}. Drop on free hours or another machine.`
      );
      return;
    }

    // If moving onto the exact same machine and same start/span hours, nothing changed
    if (
      sourceBlock.machineName === targetMachine.name &&
      sourceBlock.startHour === slot.startHour &&
      sourceBlock.spanHours === slot.spanHours
    ) {
      return;
    }

    const nextOperator = targetMachineOp;
    const nextHelper = targetMachineHelp;

    // Optimistically move block in UI immediately (Move Only — Never Duplicate on Drag)
    const optimisticUpdated: ProductionBlockEntity = {
      ...sourceBlock,
      machineId: targetMachine.id,
      machineName: targetMachine.name,
      startHour: slot.startHour,
      spanHours: slot.spanHours,
      operatorName: nextOperator,
      helperName: nextHelper,
    };
    setPlans((prev) =>
      prev.map((b) => (b.id === sourceBlock.id ? optimisticUpdated : b))
    );

    setIsSubmitting(true);
    const res = await saveProductionBlockAction(
      {
        machineId: targetMachine.id,
        machineName: targetMachine.name,
        styleId: sourceBlock.styleId,
        styleCode: sourceBlock.styleCode,
        styleName: sourceBlock.styleName,
        partName: sourceBlock.partName,
        clientName: sourceBlock.clientName,
        date: sourceBlock.date,
        shift: sourceBlock.shift,
        size: sourceBlock.size,
        startHour: slot.startHour,
        spanHours: slot.spanHours,
        planQty: sourceBlock.planQty,
        actualQty: sourceBlock.actualQty,
        operatorName: nextOperator,
        helperName: nextHelper,
      },
      sourceBlock.id
    );
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      setPlans((prev) =>
        prev.map((b) => (b.id === sourceBlock.id ? sourceBlock : b))
      );
      showError(res.error || 'Failed to move block to machine.');
      return;
    }

    const saved = res.block;
    setPlans((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
    const tInfo = formatBlockTimeRange(saved.startHour, saved.spanHours);
    showSuccess(
      `Moved "${saved.styleCode || saved.styleName}" to ${saved.machineName} (${tInfo.startLabel} – ${tInfo.endFinishLabel} [H${saved.startHour}–H${saved.startHour + saved.spanHours - 1}]).`
    );
  };

  const findStyleForBlock = (block: ProductionBlockEntity | null): StyleMasterEntity | null => {
    if (!block) return null;
    return (
      styles.find(
        (s) =>
          (block.styleId && s.id === block.styleId) ||
          (block.styleCode &&
            s.code.trim().toLowerCase() === block.styleCode.trim().toLowerCase()) ||
          s.name.trim().toLowerCase() === block.styleName.trim().toLowerCase()
      ) || null
    );
  };

  const editingBlockStyle = useMemo(
    () => findStyleForBlock(editingBlock),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingBlock, styles]
  );

  const editingBlockStyleSizes = useMemo<StyleSizeItem[]>(() => {
    if (!editingBlockStyle) return [];
    if (editingBlockStyle.sizeBreakdown && editingBlockStyle.sizeBreakdown.length > 0) {
      return editingBlockStyle.sizeBreakdown;
    }
    if (editingStyleId && editingStyleId === editingBlockStyle.id) {
      return draftSizes
        .map((sz) => ({ size: sz.size.trim(), qty: Math.max(0, Number(sz.qty) || 0) }))
        .filter((sz) => sz.size && sz.qty > 0);
    }
    return [];
  }, [editingBlockStyle, editingStyleId, draftSizes]);

  const openManageBlockModal = (
    block: ProductionBlockEntity,
    mode: 'edit' | 'duplicate' = 'edit'
  ) => {
    if (suppressNextBlockClickRef.current) return;
    cancelInlineBlockQtyEdit();
    setEditingBlock(block);
    setModalMode(mode);
    setModalPlanQtyInput(String(block.planQty));
    setModalActualQtyInput(
      mode === 'duplicate' || block.date >= todayStr ? '0' : String(block.actualQty)
    );

    const matchedStyle = findStyleForBlock(block);
    const validSizes =
      matchedStyle?.sizeBreakdown && matchedStyle.sizeBreakdown.length > 0
        ? matchedStyle.sizeBreakdown
        : [];
    if (validSizes.length > 0) {
      const hasBlockSize = validSizes.some((sz) => sz.size === block.size);
      setModalSize(hasBlockSize ? block.size : validSizes[0].size);
    } else {
      setModalSize(block.size || '');
    }

    if (matchedStyle && matchedStyle.parts && matchedStyle.parts.length > 0) {
      const hasPart = matchedStyle.parts.some((p) => p.name === block.partName);
      setModalPartName(hasPart ? block.partName : matchedStyle.parts[0].name);
    } else {
      setModalPartName(block.partName || '');
    }

    if (mode === 'duplicate') {
      const target = findSmartDuplicateTarget(block);
      const targetMac = machines.find((m) => m.name === target.machineName);
      setModalMachineName(target.machineName);
      setModalStartCol(target.startCol);
      setModalEndCol(target.endCol);
      setModalOperator(getMachineAssignedOperator(targetMac));
      setModalHelper(getMachineAssignedHelper(targetMac));
    } else {
      const curMac = machines.find((m) => m.name === block.machineName);
      setModalMachineName(block.machineName);
      setModalStartCol(block.startHour);
      setModalEndCol(Math.min(11, block.startHour + block.spanHours - 1));
      setModalOperator(getMachineAssignedOperator(curMac));
      setModalHelper(getMachineAssignedHelper(curMac));
    }

    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  };

  const closeManageBlockModal = () => {
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
    setEditingBlock(null);
    setModalMode('edit');
  };

  const saveModalBlock = async (asDuplicate: boolean) => {
    if (!editingBlock) return;

    const isActualLockedForDate = asDuplicate || editingBlock.date >= todayStr;
    const parsedPlanQty = parseInt(modalPlanQtyInput.trim(), 10);
    const parsedActualQty = isActualLockedForDate
      ? 0
      : parseInt(modalActualQtyInput.trim() || '0', 10);
    const targetMachineName = modalMachineName || editingBlock.machineName;
    const matchedMachine = machines.find((m) => m.name === targetMachineName);
    const validModalOp =
      resolveRealEmployeeLabel(modalOperator) ||
      getMachineAssignedOperator(matchedMachine);
    const validModalHelp =
      resolveRealEmployeeLabel(modalHelper) ||
      getMachineAssignedHelper(matchedMachine);

    if (!validModalOp) {
      showError(
        `${targetMachineName} ekata aththa Operator kenek assign karala na! Palamuvenma Operator kenek select karanna.`
      );
      return;
    }
    if (validModalHelp !== 'None' && validModalHelp === validModalOp) {
      showError('Operator and Helper cannot be the same employee.');
      return;
    }
    const conflictModalOpMac = findMachineWithEmployee(
      validModalOp,
      matchedMachine?.id,
      targetMachineName
    );
    if (conflictModalOpMac) {
      showError(
        `${validModalOp} danatamath ${conflictModalOpMac.name} ekata assign karala thiyenne! Machine operatorsla duplicate wenna ba.`
      );
      return;
    }
    if (validModalHelp !== 'None') {
      const conflictModalHelpMac = findMachineWithEmployee(
        validModalHelp,
        matchedMachine?.id,
        targetMachineName
      );
      if (conflictModalHelpMac) {
        showError(
          `${validModalHelp} danatamath ${conflictModalHelpMac.name} ekata assign karala thiyenne! Machine crew duplicate wenna ba.`
        );
        return;
      }
    }

    if (modalStartCol > modalEndCol) {
      showError('Start Hour cannot be after End Hour.');
      return;
    }
    if (!Number.isFinite(parsedPlanQty) || parsedPlanQty < 1 || parsedPlanQty > 500000) {
      showError('Plan Target Qty must be between 1 and 500,000.');
      return;
    }
    if (!Number.isFinite(parsedActualQty) || parsedActualQty < 0 || parsedActualQty > 500000) {
      showError('Actual Done Qty must be between 0 and 500,000.');
      return;
    }

    const spanHours = modalEndCol - modalStartCol + 1;

    // Check overlap with other blocks on the target machine/date/shift
    const overlap = plans.find((p) => {
      if (!asDuplicate && p.id === editingBlock.id) return false;
      if (
        p.machineName !== targetMachineName ||
        p.date !== editingBlock.date ||
        p.shift !== editingBlock.shift
      ) {
        return false;
      }
      const exStart = p.startHour;
      const exEnd = p.startHour + p.spanHours - 1;
      return modalStartCol <= exEnd && modalEndCol >= exStart;
    });

    if (overlap) {
      showError(
        `Time conflict on ${targetMachineName} with "${overlap.styleCode || overlap.styleName}" on H${overlap.startHour}–H${overlap.startHour + overlap.spanHours - 1}. Choose another Machine or Start/End Hour.`
      );
      return;
    }

    setIsSubmitting(true);
    const res = await saveProductionBlockAction(
      {
        machineId: matchedMachine?.id ?? editingBlock.machineId,
        machineName: targetMachineName,
        styleId: editingBlock.styleId,
        styleCode: editingBlock.styleCode,
        styleName: editingBlock.styleName,
        partName: modalPartName,
        clientName: editingBlock.clientName,
        date: editingBlock.date,
        shift: editingBlock.shift,
        size: modalSize.trim() || 'L',
        startHour: modalStartCol,
        spanHours,
        planQty: parsedPlanQty,
        actualQty: parsedActualQty,
        operatorName: validModalOp,
        helperName: validModalHelp,
      },
      asDuplicate ? undefined : editingBlock.id
    );
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      showError(
        res.error ||
          (asDuplicate
            ? 'Failed to duplicate production block.'
            : 'Failed to update production block.')
      );
      return;
    }

    const savedBlock = res.block;
    const nextPlans = asDuplicate
      ? [...plans, savedBlock]
      : plans.map((b) => (b.id === savedBlock.id ? savedBlock : b));
    setPlans(nextPlans);
    setMachines((prev) =>
      prev.map((m) =>
        m.name === savedBlock.machineName
          ? { ...m, operatorName: savedBlock.operatorName, helperName: savedBlock.helperName }
          : m
      )
    );

    if (syncCompletedStyleIfNeeded(savedBlock, nextPlans)) {
      closeManageBlockModal();
      return;
    }

    closeManageBlockModal();
    showSuccess(
      asDuplicate
        ? `Duplicated block onto ${savedBlock.machineName} [H${savedBlock.startHour}–H${savedBlock.startHour + savedBlock.spanHours - 1}] (Plan: ${savedBlock.planQty} Pcs).`
        : `Updated ${savedBlock.machineName}: Actual ${savedBlock.actualQty} / Plan ${savedBlock.planQty} Pcs.`
    );
  };

  const handleUpdateBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveModalBlock(modalMode === 'duplicate');
  };

  const handleDeleteBlock = async () => {
    if (!editingBlock) return;
    const target = editingBlock;
    setIsSubmitting(true);
    const res = await deleteProductionBlockAction(target.id);
    setIsSubmitting(false);
    if (!res.success) {
      showError(res.error || 'Failed to delete production block.');
      return;
    }
    setPlans((prev) => prev.filter((b) => b.id !== target.id));
    closeManageBlockModal();
    showSuccess(`Removed production block from ${target.machineName}.`);
  };

  // Floor Display Aggregate Metrics for Selected Date & Shift
  const floorStats = useMemo(() => {
    let shiftPlanTotal = 0;
    let shiftActualTotal = 0;
    const styleAggMap = new Map<
      string,
      {
        key: string;
        client: string;
        styleCode: string;
        styleName: string;
        plan: number;
        actual: number;
        orderQty: number;
      }
    >();

    for (const block of activeDateShiftPlans) {
      shiftPlanTotal += block.planQty;
      shiftActualTotal += block.actualQty;

      const key = `${block.clientName}__${block.styleCode || block.styleName}`;
      const matchedMaster = styles.find(
        (s) => s.id === block.styleId || s.code === block.styleCode || s.name === block.styleName
      );
      const existing = styleAggMap.get(key);
      if (existing) {
        existing.plan += block.planQty;
        existing.actual += block.actualQty;
      } else {
        styleAggMap.set(key, {
          key,
          client: block.clientName,
          styleCode: block.styleCode,
          styleName: block.styleName,
          plan: block.planQty,
          actual: block.actualQty,
          orderQty: matchedMaster?.qty || 0,
        });
      }
    }

    const overallPct = shiftPlanTotal > 0 ? Math.round((shiftActualTotal / shiftPlanTotal) * 100) : 0;
    const runningMachinesCount = machines.filter((m) => m.status === 'Active').length;

    return {
      shiftPlanTotal,
      shiftActualTotal,
      overallPct,
      runningMachinesCount,
      styleAggregates: Array.from(styleAggMap.values()),
    };
  }, [activeDateShiftPlans, styles, machines]);

  const strikeOffStyle = useMemo(
    () => styles.find((s) => s.id === selectedStrikeOffStyleId) || styles[0] || null,
    [styles, selectedStrikeOffStyleId]
  );

  // Fullscreen state for Live Floor Display (shows all 13 machines on 1 screen with only the header bar)
  const [isFloorFullscreen, setIsFloorFullscreen] = useState(true);
  const floorDisplayContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleBrowserFloorFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFloorFullscreen(false);
      } else {
        setIsFloorFullscreen(true);
        if (floorDisplayContainerRef.current?.requestFullscreen) {
          await floorDisplayContainerRef.current.requestFullscreen();
        }
      }
    } catch {
      setIsFloorFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    if (subTab !== 'floorDisplay' || !isFloorFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setIsFloorFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subTab, isFloorFullscreen]);

  return (
    <div className="space-y-5">
      {/* Top Persian Blue Banner (Hidden in Live Floor Display so only the Floor Header is shown) */}
      {subTab !== 'floorDisplay' && (
        <div className="bg-persian-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-persian-800 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
              D
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-wide uppercase">
                  PRODUCTION &amp; MASTER DATA STUDIO
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Live CRUD Connected
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Weliweriya Factory — Style &amp; Thread Matrix, Strike-Off Sheets, Client/Machine CRUD &amp; 11-Hour Gantt Schedule ({machines.length} Machines)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-persian-800/90 border border-persian-600/50 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-blue-100 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{liveTime || '--:--:--'}</span>
            </div>

            {subTab === 'strikeOff' && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Strike-Off Sheets (A4)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sub-Navigation Pills */}
      <div
        role="tablist"
        aria-label="Production Management views"
        className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-wrap items-center gap-1.5 print:hidden"
      >
        {(
          [
            {
              id: 'planEditor',
              label: 'Daily Plan Editor',
              badge: String(activeDateShiftPlans.length),
              icon: CalendarClock,
            },
            {
              id: 'floorDisplay',
              label: 'Live Floor Display',
              badge: 'Full Screen',
              icon: Monitor,
            },
            {
              id: 'styleCrud',
              label: 'Style & Parts CRUD',
              badge: String(activeStylesMetrics.length),
              icon: Shirt,
            },
            {
              id: 'doneStyles',
              label: 'Done Styles',
              badge: String(doneStylesMetrics.length),
              icon: CheckCircle2,
            },
            {
              id: 'strikeOff',
              label: 'Strike-Off Sheet',
              badge: 'A4 Print',
              icon: FileSpreadsheet,
            },
            {
              id: 'companyCrud',
              label: 'Company CRUD',
              badge: String(companies.length),
              icon: Building2,
            },
            {
              id: 'machineCrud',
              label: 'Machine CRUD',
              badge: String(machines.length),
              icon: Cpu,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setStatusMsg(null);
                setSubTab(tab.id);
                if (tab.id === 'floorDisplay') {
                  setIsFloorFullscreen(true);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                active
                  ? 'bg-persian-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl px-4 py-3 border text-xs font-bold flex items-center justify-between gap-3 print:hidden ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: DAILY PRODUCTION PLAN EDITOR (Daily production editor.html)
          ===================================================================== */}
      {subTab === 'planEditor' && (
        <div className="space-y-5 print:hidden">
          {/* Per-Style Summary Cards Section */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-persian-500" />
                Active Style-Wise Order &amp; Production Breakdown Cards ({activeStylesMetrics.length})
              </h3>
              <div className="flex items-center gap-2">
                {doneStylesMetrics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSubTab('doneStyles')}
                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    View Done Styles ({doneStylesMetrics.length})
                  </button>
                )}
                <span className="text-[11px] text-slate-500 font-medium">
                  Real-time sync with Style Master &amp; Machine Schedules
                </span>
              </div>
            </div>

            {activeStylesMetrics.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-extrabold text-slate-800">
                    {doneStylesMetrics.length > 0
                      ? 'All Registered Styles Are Completed!'
                      : 'No Active Master Styles Registered Yet'}
                  </div>
                  <p className="text-xs text-slate-500">
                    {doneStylesMetrics.length > 0
                      ? 'Completed styles have been moved to the Done Styles tab. Register a new style or view completed orders.'
                      : 'Add your Client Companies, Machines, and Master Styles first so their Order Qty, Planned Qty, Done Qty, and Remaining balances appear here automatically.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {doneStylesMetrics.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSubTab('doneStyles')}
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
                    >
                      Done Styles ({doneStylesMetrics.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSubTab('companyCrud')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    1. Company CRUD ({companies.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('machineCrud')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    2. Machine CRUD ({machines.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('styleCrud')}
                    className="px-3.5 py-2 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    3. Style &amp; Parts CRUD <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {activeStylesMetrics.map(({ style, orderQty, plannedQty, doneQty, remaining }) => (
                  <div
                    key={style.id}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-soft flex flex-col justify-between space-y-2.5"
                  >
                    <div className="border-b border-slate-100 pb-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {style.company}
                        </span>
                        <span className="text-[10px] font-mono font-extrabold text-persian-600">
                          {style.code}
                        </span>
                      </div>
                      <h4
                        className="font-extrabold text-slate-800 text-xs truncate mt-0.5"
                        title={style.code ? `${style.code} - ${style.name}` : style.name}
                      >
                        {style.name}
                      </h4>
                      {style.sizeBreakdown && style.sizeBreakdown.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {style.sizeBreakdown.map((sz) => (
                            <span
                              key={sz.size}
                              className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {sz.size}: {sz.qty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">
                          Order Qty
                        </span>
                        <span className="font-black text-persian-800 text-sm font-mono">
                          {orderQty.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                        <span className="text-[9px] font-bold text-amber-700/85 block uppercase">
                          Planned Qty
                        </span>
                        <span className="font-black text-amber-600 text-sm font-mono">
                          {plannedQty.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                        <span className="text-[9px] font-bold text-emerald-700/85 block uppercase">
                          Done Qty
                        </span>
                        <span className="font-black text-emerald-600 text-sm font-mono">
                          {doneQty.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                        <span className="text-[9px] font-bold text-indigo-700/85 block uppercase">
                          Remaining
                        </span>
                        <span className="font-black text-indigo-600 text-sm font-mono">
                          {remaining.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Production Plan Form Editor Panel (Split into 2 Horizontal Lines) */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-100 pb-2">
              <h3
                id={`${uid}-schedule-form-title`}
                className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-persian-500" />
                Schedule New Production Plan (Today or Future Dates)
              </h3>
              <span className="text-[11px] text-rose-600 font-semibold">
                * Connected to Machine CRUD, Company CRUD, Style Master &amp; Employee Registry
              </span>
            </div>

            <form
              aria-labelledby={`${uid}-schedule-form-title`}
              onSubmit={handleSchedulePlanSubmit}
              className="space-y-3"
            >
              {/* LINE 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-plan-date`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Date *
                  </label>
                  <input
                    id={`${uid}-plan-date`}
                    name="planDate"
                    type="date"
                    min={todayStr}
                    value={scheduleDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setScheduleDate(next);
                      if (next) {
                        setPlanDate(next);
                        setCalendarMonth(next.slice(0, 7));
                      }
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-shift`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Shift *
                  </label>
                  <select
                    id={`${uid}-plan-shift`}
                    name="planShift"
                    value={planShift}
                    onChange={(e) => setPlanShift(e.target.value as 'day' | 'night')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    <option value="day">Day Shift (08:00 - 19:00)</option>
                    <option value="night">Night Shift (19:00 - 06:00)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-machine`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Machine (From Machine CRUD) *
                  </label>
                  <select
                    id={`${uid}-plan-machine`}
                    name="planMachine"
                    value={planMachineName}
                    onChange={(e) => setPlanMachineName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {machines.length === 0 ? (
                      <option value="">-- Add Machine in Machine CRUD --</option>
                    ) : (
                      machines.map((m) => {
                        const macOp = getMachineAssignedOperator(m);
                        return (
                          <option key={m.id} value={m.name}>
                            {m.name} — {m.brand} ({m.heads}H) •{' '}
                            {macOp ? `Op: ${macOp}` : '⚠️ Assign Operator!'}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-company`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Company (From Company CRUD) *
                  </label>
                  <select
                    id={`${uid}-plan-company`}
                    name="planCompany"
                    value={planCompany}
                    onChange={(e) => {
                      const nextCompany = e.target.value;
                      setPlanCompany(nextCompany);
                      const target = nextCompany.trim().toLowerCase();
                      const matchedClient = companies.find(
                        (c) => c.name.trim().toLowerCase() === target
                      );
                      const matchingStyles = styles.filter(
                        (s) =>
                          (matchedClient && s.clientId && s.clientId === matchedClient.id) ||
                          s.company.trim().toLowerCase() === target
                      );
                      setPlanStyleId(matchingStyles[0]?.id || '');
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {companies.length === 0 ? (
                      <option value="">-- Add Company in Company CRUD --</option>
                    ) : (
                      companies.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-style`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Style Name &amp; Total Qty *
                  </label>
                  <select
                    id={`${uid}-plan-style`}
                    name="planStyle"
                    value={planStyleId}
                    onChange={(e) => setPlanStyleId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {companyFilteredStyles.length === 0 ? (
                      <option value="">
                        {planCompany
                          ? `-- No Styles for ${planCompany} (Add in Style CRUD) --`
                          : '-- Add Style in Style CRUD --'}
                      </option>
                    ) : (
                      companyFilteredStyles.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code ? `${s.code} — ${s.name}` : s.name} ({s.qty.toLocaleString()} Pcs)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* LINE 2 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 items-end pt-1">
                <div>
                  <label
                    htmlFor={`${uid}-plan-part`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Part / Operation
                  </label>
                  <select
                    id={`${uid}-plan-part`}
                    name="planPart"
                    value={planPartName}
                    onChange={(e) => setPlanPartName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {!selectedPlanStyle || selectedPlanStyle.parts.length === 0 ? (
                      <option value="">Main Embroidery</option>
                    ) : (
                      selectedPlanStyle.parts.map((p, idx) => (
                        <option key={`${p.name}-${idx}`} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-size`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Size *
                  </label>
                  <select
                    id={`${uid}-plan-size`}
                    name="planSize"
                    value={planSize}
                    onChange={(e) => setPlanSize(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {selectedPlanStyleSizes.length === 0 ? (
                      <option value="">-- Add Sizes in Style CRUD --</option>
                    ) : (
                      selectedPlanStyleSizes.map((sz) => (
                        <option key={sz.size} value={sz.size}>
                          {sz.size} ({sz.qty.toLocaleString()} Pcs)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-start`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Start Time *
                  </label>
                  <select
                    id={`${uid}-plan-start`}
                    name="planStartTime"
                    value={planStartTime}
                    onChange={(e) => setPlanStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {SHIFT_HOURS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label} ({h.short})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-end`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    End Time *
                  </label>
                  <select
                    id={`${uid}-plan-end`}
                    name="planEndTime"
                    value={planEndTime}
                    onChange={(e) => setPlanEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {SHIFT_HOURS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.endLabel} (End of {h.short})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-qty`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Plan Qty (Pcs) *
                  </label>
                  <input
                    id={`${uid}-plan-qty`}
                    name="planQty"
                    type="number"
                    min={1}
                    max={500000}
                    value={planQty}
                    onChange={(e) => setPlanQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-persian-800 outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-operator`}
                    className={`block text-[10px] font-bold mb-1 ${
                      !planOperator ? 'text-rose-700' : 'text-slate-600'
                    }`}
                  >
                    {!planOperator ? '⚠️ Assign Operator *' : 'Machine Operator *'}
                  </label>
                  <select
                    id={`${uid}-plan-operator`}
                    name="planOperator"
                    value={planOperator}
                    onChange={(e) => {
                      const nextOp = e.target.value;
                      setPlanOperator(nextOp);
                      const targetMac = machines.find((m) => m.name === planMachineName);
                      if (targetMac) {
                        handleQuickAssignMachineCrew(targetMac, nextOp, planHelper);
                      }
                    }}
                    required
                    className={`w-full rounded-lg p-2 text-xs font-semibold outline-none ${
                      !planOperator
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-1 ring-rose-200'
                        : 'bg-slate-50 border border-slate-300 text-slate-800 focus:border-persian-500'
                    }`}
                  >
                    <option value="">
                      {machineOperatorEmployees.length === 0
                        ? '-- No Machine Operators Registered --'
                        : `⚠️ -- Assign Operator to ${planMachineName || 'Machine'} --`}
                    </option>
                    {machineOperatorEmployees.map((emp) => {
                      const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                      const selectedMac = machines.find((m) => m.name === planMachineName);
                      const otherMac = findMachineWithEmployee(
                        label,
                        selectedMac?.id,
                        planMachineName
                      );
                      const isSameAsHelper = planHelper !== 'None' && planHelper === label;
                      return (
                        <option
                          key={emp.id}
                          value={label}
                          disabled={Boolean(otherMac) || isSameAsHelper}
                        >
                          {otherMac ? `${label} (In ${otherMac.name})` : label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-plan-helper`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Helper (From Staff)
                  </label>
                  <select
                    id={`${uid}-plan-helper`}
                    name="planHelper"
                    value={planHelper}
                    onChange={(e) => {
                      const nextHelp = e.target.value;
                      setPlanHelper(nextHelp);
                      const targetMac = machines.find((m) => m.name === planMachineName);
                      if (targetMac && planOperator) {
                        handleQuickAssignMachineCrew(targetMac, planOperator, nextHelp);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    <option value="None">None</option>
                    {activeEmployees.map((emp) => {
                      const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                      const selectedMac = machines.find((m) => m.name === planMachineName);
                      const otherMac = findMachineWithEmployee(
                        label,
                        selectedMac?.id,
                        planMachineName
                      );
                      const isSameAsOp = Boolean(planOperator) && planOperator === label;
                      return (
                        <option
                          key={emp.id}
                          value={label}
                          disabled={Boolean(otherMac) || isSameAsOp}
                        >
                          {otherMac ? `${label} (In ${otherMac.name})` : label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-persian-800 hover:bg-persian-600 disabled:opacity-50 text-white font-bold text-xs p-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Push into Dashboard</span>
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Main Compact 11-Hour Gantt Matrix */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-soft">
            {/* Matrix Top Bar: Viewing Date, Interactive Calendar with Red Pending Highlights & Drag Mode */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Cpu className="w-4 h-4 text-persian-600" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-persian-800">
                  Interactive 11-Hour Machine Gantt Matrix ({planDate})
                </span>
                {planDate >= todayStr ? (
                  <span className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 font-bold inline-flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    Actual Qty Locked Until {planDate} Ends (Fill Tomorrow / Pahuwada)
                  </span>
                ) : (dateStatusMap.get(planDate)?.pendingActualBlocks ?? 0) > 0 ? (
                  <span className="text-[11px] bg-rose-600 text-white px-2.5 py-0.5 rounded-md font-extrabold inline-flex items-center gap-1 shadow-2xs animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    {dateStatusMap.get(planDate)?.pendingActualBlocks} Block(s) Need Actual Qty Filled!
                  </span>
                ) : (
                  <span className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Past Date Actuals Completed
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Unassigned Machine Operator Warning Badge */}
                {machines.some((m) => !getMachineAssignedOperator(m)) && (
                  <span className="text-[11px] bg-rose-50 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-300 font-extrabold inline-flex items-center gap-1 shadow-2xs">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>
                      {machines.filter((m) => !getMachineAssignedOperator(m)).length} Machine(s) Need Operator Assigned
                    </span>
                  </span>
                )}

                {/* Drag = Move & Edge Resize Guide Badge */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs text-[11px] font-bold text-slate-700">
                  <Move className="w-3 h-3 text-persian-700 shrink-0" />
                  <span>Drag Bar = Move</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-persian-800">
                    Drag Bar Edge (Konen Allala) = Resize Length &amp; Auto Time
                  </span>
                </div>

                {/* Viewing Date + Interactive Red-Highlight Calendar Popover */}
                <div ref={calendarPopoverRef} className="relative flex items-center gap-2">
                  <label htmlFor={`${uid}-matrix-view-date`} className="font-bold text-slate-600">
                    Viewing Date:
                  </label>
                  <input
                    id={`${uid}-matrix-view-date`}
                    type="date"
                    value={planDate}
                    onChange={(e) => selectViewingDate(e.target.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold outline-none transition ${
                      planDate < todayStr &&
                      (dateStatusMap.get(planDate)?.pendingActualBlocks ?? 0) > 0
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                        : 'bg-white border border-slate-300 text-persian-800'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMonth(planDate.slice(0, 7));
                      setIsCalendarOpen((prev) => !prev);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border transition cursor-pointer shadow-2xs ${
                      pendingActualDates.length > 0
                        ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 ring-2 ring-rose-300'
                        : 'bg-white hover:bg-slate-100 text-persian-800 border-slate-300'
                    }`}
                    title="Open Production Calendar (Red dates = Past days needing Actual Qty)"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendar</span>
                    {pendingActualDates.length > 0 && (
                      <span className="bg-white text-rose-700 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                        {pendingActualDates.length} Red
                      </span>
                    )}
                  </button>

                  {planDate !== todayStr && (
                    <button
                      type="button"
                      onClick={() => selectViewingDate(todayStr)}
                      className="px-2 py-1 rounded-lg bg-persian-50 hover:bg-persian-100 border border-persian-200 text-persian-800 text-[11px] font-bold cursor-pointer"
                    >
                      Today
                    </button>
                  )}

                  {/* Custom Monthly Calendar Popover with Red Highlighted Pending Actual Dates */}
                  {isCalendarOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 space-y-3 text-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <button
                          type="button"
                          onClick={() => shiftCalendarMonth(-1)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                          aria-label="Previous Month"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-xs font-extrabold text-persian-900 uppercase tracking-wider">
                          {calendarGridData.monthLabel}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => selectViewingDate(todayStr)}
                            className="px-2 py-0.5 rounded bg-persian-50 hover:bg-persian-100 text-persian-800 text-[10px] font-bold cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => shiftCalendarMonth(1)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                            aria-label="Next Month"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Weekday Headers */}
                      <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-400 uppercase">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarGridData.cells.map((cell) => {
                          if (!cell.dateStr || cell.dayNum === null) {
                            return <div key={cell.key} className="h-9" />;
                          }
                          const dStat = dateStatusMap.get(cell.dateStr);
                          const isPastPending =
                            cell.dateStr < todayStr && (dStat?.pendingActualBlocks ?? 0) > 0;
                          const isPastDone =
                            cell.dateStr < todayStr &&
                            (dStat?.totalBlocks ?? 0) > 0 &&
                            (dStat?.pendingActualBlocks ?? 0) === 0;
                          const isToday = cell.dateStr === todayStr;
                          const isSelected = cell.dateStr === planDate;
                          const hasScheduled =
                            cell.dateStr >= todayStr && (dStat?.totalBlocks ?? 0) > 0;

                          return (
                            <button
                              key={cell.key}
                              type="button"
                              onClick={() => selectViewingDate(cell.dateStr!)}
                              title={
                                isPastPending
                                  ? `${cell.dateStr}: ${dStat?.pendingActualBlocks} block(s) need Actual Qty filled! Click to open.`
                                  : isPastDone
                                  ? `${cell.dateStr}: All ${dStat?.totalBlocks} block(s) Actuals completed.`
                                  : hasScheduled
                                  ? `${cell.dateStr}: ${dStat?.totalBlocks} scheduled block(s) (Actuals unlock next day)`
                                  : cell.dateStr
                              }
                              className={`h-9 rounded-lg flex flex-col items-center justify-center text-[11px] transition relative cursor-pointer ${
                                isPastPending
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white font-black ring-2 ring-rose-300 shadow-xs'
                                  : isPastDone
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold'
                                  : isToday
                                  ? 'bg-persian-100 hover:bg-persian-200 text-persian-900 border-2 border-persian-600 font-black'
                                  : hasScheduled
                                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold'
                                  : 'hover:bg-slate-100 text-slate-700 font-semibold'
                              } ${isSelected ? 'ring-2 ring-offset-1 ring-slate-900' : ''}`}
                            >
                              <span>{cell.dayNum}</span>
                              {isPastPending && (
                                <span className="text-[8px] leading-none font-black text-rose-100">
                                  {dStat?.pendingActualBlocks} Act!
                                </span>
                              )}
                              {isPastDone && (
                                <span className="text-[8px] leading-none font-bold text-emerald-700">
                                  ✓ Done
                                </span>
                              )}
                              {hasScheduled && (
                                <span className="text-[8px] leading-none font-bold text-persian-700">
                                  {dStat?.totalBlocks} Plan
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Calendar Legend */}
                      <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px]">
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                          <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block shrink-0" />
                          <span>Red = Past Day Ended — Fill Actual Qty Now</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block shrink-0" />
                          <span>Green = Past Day Actuals Completed</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-persian-800 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-xs bg-persian-600 inline-block shrink-0" />
                          <span>Blue = Today / Future Plan (Actuals Locked)</span>
                        </div>
                      </div>

                      {pendingActualDates.length > 0 && (
                        <div className="pt-2 border-t border-rose-100 space-y-1">
                          <div className="text-[10px] font-extrabold text-rose-700 uppercase">
                            Pending Actual Dates (Click to Fill):
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                            {pendingActualDates.map((d) => (
                              <button
                                key={d.date}
                                type="button"
                                onClick={() => selectViewingDate(d.date)}
                                className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold cursor-pointer"
                              >
                                {d.date} ({d.pendingActualBlocks} Pending)
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Red Alert Bar when any Past Date (< todayStr) has unfilled Actual Qty */}
            {pendingActualDates.length > 0 && (
              <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    Past Days Needed Actual Qty (Dawasa iwara una ewage Actual Qty fill karanna):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {pendingActualDates.map((d) => {
                      const active = planDate === d.date;
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => selectViewingDate(d.date)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                            active
                              ? 'bg-rose-700 text-white ring-2 ring-rose-400'
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>
                            {d.date} • {d.pendingActualBlocks} Block
                            {d.pendingActualBlocks > 1 ? 's' : ''} Pending Actual
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {planDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => selectViewingDate(todayStr)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-rose-300 text-rose-800 text-[11px] font-bold cursor-pointer"
                  >
                    Back to Today ({todayStr})
                  </button>
                )}
              </div>
            )}

            {machines.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-extrabold text-slate-800">
                  No Machines Registered in Machine CRUD
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Register your embroidery machines in the Machine CRUD tab to display their 11-hour timeline tracks here.
                </p>
                <button
                  type="button"
                  onClick={() => setSubTab('machineCrud')}
                  className="px-4 py-2 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-bold cursor-pointer"
                >
                  Open Machine CRUD
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  {/* Timeline Header Hours */}
                  <div className="flex border-b border-slate-200 bg-slate-50 font-semibold text-[11px] text-slate-600">
                    <div className="w-72 sm:w-80 p-2.5 flex items-center justify-between bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider shrink-0">
                      <span>Machine &amp; Crew</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-300 font-semibold text-slate-500">
                        {machines.length} Units
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-200 border-r-2 border-r-rose-500 relative">
                      {SHIFT_HOURS.map((h) => (
                        <div
                          key={h.col}
                          className="py-1.5 px-1 flex flex-col items-center justify-center bg-slate-50 relative"
                        >
                          <span className="font-bold text-slate-800 text-[10px]">
                            {h.label} – {h.endLabel}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {h.value}–{h.endValue} ({h.short})
                          </span>
                          {h.col === 11 && (
                            <span className="mt-0.5 px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-tight">
                              End 07:00 PM
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Machine Rows */}
                  <div className="divide-y divide-slate-200">
                    {machines.map((mac) => {
                      const macBlocks = activeDateShiftPlans.filter(
                        (b) => b.machineId === mac.id || b.machineName === mac.name
                      );
                      const macPlan = macBlocks.reduce((sum, b) => sum + b.planQty, 0);
                      const macActual = macBlocks.reduce((sum, b) => sum + b.actualQty, 0);
                      const compPct = macPlan > 0 ? Math.round((macActual / macPlan) * 100) : 0;

                      const assignedOp = getMachineAssignedOperator(mac);
                      const assignedHelp = getMachineAssignedHelper(mac);
                      const hasValidOp = Boolean(assignedOp);

                      const isRowDragOver =
                        Boolean(draggingBlock) && dragOverMachineName === mac.name;
                      const previewSlot =
                        isRowDragOver && draggingBlock
                          ? resolveDropSlotOnMachine(
                              draggingBlock,
                              mac.name,
                              dragOverStartCol ?? draggingBlock.startHour
                            )
                          : null;

                      return (
                        <div
                          key={mac.id}
                          className={`flex items-stretch transition-colors ${
                            isRowDragOver
                              ? !hasValidOp
                                ? 'bg-rose-50/70 ring-1 ring-inset ring-rose-400'
                                : 'bg-persian-50/70 ring-1 ring-inset ring-persian-400'
                              : !hasValidOp
                              ? 'bg-rose-50/20 hover:bg-rose-50/40'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Left Machine & Crew Column (Inline Operator & Helper Assign + Drop Target) */}
                          <div
                            onDragOver={(e) => {
                              if (!draggingBlock) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (
                                dragOverMachineName !== mac.name ||
                                dragOverStartCol !== draggingBlock.startHour
                              ) {
                                setDragOverMachineName(mac.name);
                                setDragOverStartCol(draggingBlock.startHour);
                              }
                            }}
                            onDrop={(e) => {
                              if (!draggingBlock) return;
                              e.preventDefault();
                              executeDropOnMachine(mac, draggingBlock.startHour);
                            }}
                            className="w-72 sm:w-80 p-2.5 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-800 text-xs">
                                  {mac.name}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  ({mac.brand} • {mac.heads}H)
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  !hasValidOp
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                    : mac.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : mac.status === 'Setup'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                {!hasValidOp
                                  ? '⚠️ Assign Operator'
                                  : mac.status === 'Active'
                                  ? 'Running'
                                  : mac.status}
                              </span>
                            </div>

                            {/* Inline Real Operator & Helper Assignment Selectors */}
                            <div className="grid grid-cols-2 gap-1 mb-1.5">
                              <div>
                                <select
                                  aria-label={`Assign Operator for ${mac.name}`}
                                  value={assignedOp}
                                  onChange={(e) =>
                                    handleQuickAssignMachineCrew(
                                      mac,
                                      e.target.value,
                                      assignedHelp
                                    )
                                  }
                                  title={
                                    hasValidOp
                                      ? `Assigned Operator: ${assignedOp}`
                                      : `Assign a real operator to ${mac.name} before scheduling or moving orders`
                                  }
                                  className={`w-full rounded px-1.5 py-1 text-[10px] font-bold outline-none cursor-pointer truncate transition ${
                                    !hasValidOp
                                      ? 'bg-rose-50 border-2 border-rose-400 text-rose-800 ring-1 ring-rose-200'
                                      : 'bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <option value="">⚠️ Assign Operator</option>
                                  {machineOperatorEmployees.map((emp) => {
                                    const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                                    const otherMac = findMachineWithEmployee(
                                      label,
                                      mac.id,
                                      mac.name
                                    );
                                    const isSameAsHelper =
                                      assignedHelp !== 'None' && assignedHelp === label;
                                    return (
                                      <option
                                        key={emp.id}
                                        value={label}
                                        disabled={Boolean(otherMac) || isSameAsHelper}
                                      >
                                        {otherMac
                                          ? `Op: ${label} (In ${otherMac.name})`
                                          : `Op: ${label}`}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              <div>
                                <select
                                  aria-label={`Assign Helper for ${mac.name}`}
                                  value={assignedHelp}
                                  onChange={(e) =>
                                    handleQuickAssignMachineCrew(
                                      mac,
                                      assignedOp,
                                      e.target.value
                                    )
                                  }
                                  title={`Assigned Helper: ${assignedHelp}`}
                                  className="w-full rounded px-1.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 outline-none cursor-pointer truncate"
                                >
                                  <option value="None">Help: None</option>
                                  {activeEmployees.map((emp) => {
                                    const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                                    const otherMac = findMachineWithEmployee(
                                      label,
                                      mac.id,
                                      mac.name
                                    );
                                    const isSameAsOp =
                                      Boolean(assignedOp) && assignedOp === label;
                                    return (
                                      <option
                                        key={emp.id}
                                        value={label}
                                        disabled={Boolean(otherMac) || isSameAsOp}
                                      >
                                        {otherMac
                                          ? `Help: ${label} (In ${otherMac.name})`
                                          : `Help: ${label}`}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                              <span>
                                Out: <strong className="text-slate-800">{macActual}</strong>/{macPlan}
                              </span>
                              <span
                                className={
                                  compPct >= 100
                                    ? 'text-emerald-600 font-bold'
                                    : 'text-slate-600 font-bold'
                                }
                              >
                                {compPct}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-persian-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(compPct, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Right 11-Hour Timeline Track (Droppable across all 11 hour columns) */}
                          <div
                            data-gantt-track="true"
                            onDragOver={(e) => {
                              if (!draggingBlock) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              const rect = e.currentTarget.getBoundingClientRect();
                              const relX = Math.max(
                                0,
                                Math.min(rect.width - 1, e.clientX - rect.left)
                              );
                              const hoveredCol = Math.max(
                                1,
                                Math.min(11, Math.floor((relX / rect.width) * 11) + 1)
                              );
                              const preferredStart = Math.max(
                                1,
                                Math.min(
                                  11 - draggingBlock.spanHours + 1,
                                  hoveredCol - dragGrabOffsetHours
                                )
                              );
                              if (
                                dragOverMachineName !== mac.name ||
                                dragOverStartCol !== preferredStart
                              ) {
                                setDragOverMachineName(mac.name);
                                setDragOverStartCol(preferredStart);
                              }
                            }}
                            onDrop={(e) => {
                              if (!draggingBlock) return;
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const relX = Math.max(
                                0,
                                Math.min(rect.width - 1, e.clientX - rect.left)
                              );
                              const hoveredCol = Math.max(
                                1,
                                Math.min(11, Math.floor((relX / rect.width) * 11) + 1)
                              );
                              const preferredStart = Math.max(
                                1,
                                Math.min(
                                  11 - draggingBlock.spanHours + 1,
                                  hoveredCol - dragGrabOffsetHours
                                )
                              );
                              executeDropOnMachine(mac, preferredStart);
                            }}
                            className="flex-1 grid grid-cols-11 relative matrix-grid p-1.5 gap-1.5 items-center min-h-[76px]"
                          >
                            {/* Unassigned Operator Empty Track Notice */}
                            {!hasValidOp && macBlocks.length === 0 && !previewSlot && (
                              <div
                                style={{ gridColumn: '1 / span 11', gridRow: 1 }}
                                className="pointer-events-none rounded-lg border border-dashed border-rose-300 bg-rose-50/50 px-3 py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-rose-700"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  Assign a real Operator to {mac.name} on the left before scheduling or moving orders here
                                </span>
                              </div>
                            )}

                            {/* Visual Drop Target Preview (Move Only) */}
                            {previewSlot && draggingBlock && (
                              <div
                                style={{
                                  gridColumn: `${previewSlot.startHour} / span ${previewSlot.spanHours}`,
                                  gridRow: 1,
                                }}
                                className={`pointer-events-none z-20 rounded-lg border-2 border-dashed p-2 flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider min-h-[60px] ${
                                  !hasValidOp || previewSlot.hasConflict
                                    ? 'bg-rose-100/85 border-rose-500 text-rose-900'
                                    : 'bg-persian-100/80 border-persian-500 text-persian-900'
                                }`}
                              >
                                {!hasValidOp
                                  ? `⚠️ Assign Operator to ${mac.name} First (Cannot Move Here)`
                                  : previewSlot.hasConflict
                                  ? `Slot Occupied on ${mac.name}`
                                  : `Drop to Move → ${mac.name} (${formatBlockTimeRange(previewSlot.startHour, previewSlot.spanHours).shortText})`}
                              </div>
                            )}

                            {macBlocks.map((st) => {
                              const cStyle = getCompanyColor(st.clientName);
                              const isInlinePlan =
                                inlineEditBlockId === st.id && inlineEditField === 'plan';
                              const isInlineActual =
                                inlineEditBlockId === st.id && inlineEditField === 'actual';
                              const isDraggingThis = draggingBlock?.id === st.id;
                              const isResizingThis = resizingBlock?.block.id === st.id;
                              const effStartHour = isResizingThis
                                ? resizingBlock.previewStartHour
                                : st.startHour;
                              const effSpanHours = isResizingThis
                                ? resizingBlock.previewSpanHours
                                : st.spanHours;
                              const timeInfo = formatBlockTimeRange(effStartHour, effSpanHours);
                              const isActualLockedForDay = st.date >= todayStr;
                              const isPastNeedsActual =
                                st.date < todayStr && st.actualQty <= 0;

                              return (
                                <div
                                  key={st.id}
                                  role="group"
                                  aria-label={`${st.clientName} ${st.styleCode || st.styleName}`}
                                  draggable={!isInlinePlan && !isInlineActual && !resizingBlock}
                                  onDragStart={(e) => handleBlockDragStart(st, e)}
                                  onDragEnd={handleBlockDragEnd}
                                  style={{
                                    gridColumn: `${effStartHour} / span ${effSpanHours}`,
                                    gridRow: 1,
                                  }}
                                  onClick={() => {
                                    if (suppressNextBlockClickRef.current) return;
                                    openManageBlockModal(st, 'edit');
                                  }}
                                  className={`${
                                    isPastNeedsActual
                                      ? 'bg-rose-50/95 border-rose-500 ring-2 ring-rose-300'
                                      : `${cStyle.bg} ${cStyle.border}`
                                  } border rounded-lg px-3 py-2 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between text-left relative group select-none ${
                                    isResizingThis
                                      ? 'ring-2 ring-persian-600 shadow-lg z-30 cursor-ew-resize'
                                      : isInlinePlan || isInlineActual
                                      ? 'cursor-default'
                                      : 'cursor-grab active:cursor-grabbing'
                                  } ${isDraggingThis ? 'opacity-50 ring-2 ring-persian-500' : ''}`}
                                >
                                  {/* Left Edge Resize Handle (Grab Bar Edge to Change Start Time & Length) */}
                                  <div
                                    role="separator"
                                    aria-orientation="vertical"
                                    aria-label="Drag left edge to adjust start time"
                                    title="Drag left edge (konen allala) to control length & auto-adjust Start Time"
                                    onMouseDown={(e) => handleStartBlockResize(st, 'start', e)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-center group/lhandle hover:bg-persian-600/25 rounded-l-lg transition-colors"
                                  >
                                    <span className="w-1 h-6 rounded-full bg-slate-400/70 group-hover/lhandle:bg-persian-700 transition-colors" />
                                  </div>

                                  {/* Right Edge Resize Handle (Grab Bar Edge to Change End Time & Length) */}
                                  <div
                                    role="separator"
                                    aria-orientation="vertical"
                                    aria-label="Drag right edge to adjust end time"
                                    title="Drag right edge (konen allala) to control length & auto-adjust End Time"
                                    onMouseDown={(e) => handleStartBlockResize(st, 'end', e)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-center group/rhandle hover:bg-persian-600/25 rounded-r-lg transition-colors"
                                  >
                                    <span className="w-1 h-6 rounded-full bg-slate-400/70 group-hover/rhandle:bg-persian-700 transition-colors" />
                                  </div>

                                  <div className="flex items-center justify-between gap-1 mb-0.5 w-full">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span
                                        className={`text-[9px] font-black uppercase tracking-wider truncate ${
                                          isPastNeedsActual ? 'text-rose-900' : cStyle.text
                                        }`}
                                      >
                                        {st.clientName}
                                      </span>
                                      <span
                                        className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${
                                          isResizingThis
                                            ? 'bg-persian-800 text-white border-persian-900'
                                            : 'bg-white/85 text-slate-700 border-slate-300/80'
                                        }`}
                                        title={`Scheduled Time: ${timeInfo.startLabel}–${timeInfo.endFinishLabel} (H${timeInfo.startCol}–H${timeInfo.endCol} • ${timeInfo.hoursCount}h)`}
                                      >
                                        {timeInfo.shortText}
                                      </span>
                                      {isPastNeedsActual && (
                                        <span className="bg-rose-600 text-white text-[8px] font-black px-1 py-0.2 rounded uppercase tracking-wider shrink-0">
                                          Fill Actual!
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleQuickDuplicateBlock(st, e)}
                                        title="Click to duplicate this order onto another machine"
                                        className="text-[9px] bg-white/90 hover:bg-persian-50 border border-slate-200/80 px-1.5 py-0.5 rounded font-bold text-persian-700 inline-flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                      >
                                        <Copy className="w-2.5 h-2.5" />
                                        <span>Duplicate</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openManageBlockModal(st, 'edit');
                                        }}
                                        title="Open full block editor"
                                        className="text-[9px] bg-white/90 hover:bg-white border border-slate-200/80 px-1.5 py-0.5 rounded font-bold text-slate-600 cursor-pointer shadow-2xs"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>

                                  <div className="font-extrabold text-slate-800 text-[11px] truncate mb-1.5 w-full">
                                    {st.styleCode ? `${st.styleCode} — ` : ''}
                                    {st.styleName} ({st.size})
                                    {st.partName ? ` • ${st.partName}` : ''}
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold text-slate-600 w-full">
                                    {/* Click-to-Type Plan Quantity */}
                                    {isInlinePlan ? (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 bg-white border border-persian-500 rounded px-1 py-0.5 shadow-xs"
                                      >
                                        <span className="text-[9px] font-bold text-slate-500">
                                          Plan:
                                        </span>
                                        <input
                                          type="number"
                                          min={1}
                                          max={500000}
                                          autoFocus
                                          value={inlineEditValue}
                                          onFocus={(e) => e.currentTarget.select()}
                                          onChange={(e) => setInlineEditValue(e.target.value)}
                                          onBlur={() => commitInlineBlockQtyEdit(st)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              commitInlineBlockQtyEdit(st);
                                            } else if (e.key === 'Escape') {
                                              e.preventDefault();
                                              cancelInlineBlockQtyEdit();
                                            }
                                          }}
                                          className="w-14 text-[10px] font-extrabold font-mono text-persian-800 bg-transparent outline-none"
                                        />
                                        <button
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            commitInlineBlockQtyEdit(st);
                                          }}
                                          className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                          title="Save Plan Qty"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => startInlineBlockQtyEdit(st, 'plan', e)}
                                        title="Click to type Plan Qty directly"
                                        className="bg-white/90 hover:bg-white border border-slate-300/80 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-extrabold inline-flex items-center gap-1 shadow-2xs cursor-text"
                                      >
                                        <span>Plan: {st.planQty}</span>
                                        <Pencil className="w-2.5 h-2.5 text-slate-400" />
                                      </button>
                                    )}

                                    {/* Click-to-Type Actual Done Quantity (Locked until day ends; Red when past & unfilled) */}
                                    {isActualLockedForDay ? (
                                      <button
                                        type="button"
                                        onClick={(e) => startInlineBlockQtyEdit(st, 'actual', e)}
                                        title={`Actual Qty is locked until ${st.date} ends. Fill Actuals tomorrow (Pahuwada)!`}
                                        className="bg-slate-200/90 hover:bg-slate-300/90 border border-slate-300 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-not-allowed"
                                      >
                                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                                        <span>Act: Tomorrow</span>
                                      </button>
                                    ) : isInlineActual ? (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 bg-white border-2 border-rose-500 rounded px-1 py-0.5 shadow-xs"
                                      >
                                        <span className="text-[9px] font-bold text-rose-700">
                                          Act:
                                        </span>
                                        <input
                                          type="number"
                                          min={0}
                                          max={500000}
                                          autoFocus
                                          value={inlineEditValue}
                                          onFocus={(e) => e.currentTarget.select()}
                                          onChange={(e) => setInlineEditValue(e.target.value)}
                                          onBlur={() => commitInlineBlockQtyEdit(st)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              commitInlineBlockQtyEdit(st);
                                            } else if (e.key === 'Escape') {
                                              e.preventDefault();
                                              cancelInlineBlockQtyEdit();
                                            }
                                          }}
                                          className="w-14 text-[10px] font-extrabold font-mono text-rose-800 bg-transparent outline-none"
                                        />
                                        <button
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            commitInlineBlockQtyEdit(st);
                                          }}
                                          className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                          title="Save Actual Qty"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : isPastNeedsActual ? (
                                      <button
                                        type="button"
                                        onClick={(e) => startInlineBlockQtyEdit(st, 'actual', e)}
                                        title="Past day ended! Click to fill Actual Done Qty now"
                                        className="bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300 px-2 py-0.5 rounded text-[10px] font-extrabold inline-flex items-center gap-1 shadow-xs animate-pulse cursor-text"
                                      >
                                        <span>Fill Act: 0</span>
                                        <Pencil className="w-2.5 h-2.5 text-rose-100" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => startInlineBlockQtyEdit(st, 'actual', e)}
                                        title="Click to update Actual Done Qty"
                                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px] font-extrabold inline-flex items-center gap-1 shadow-2xs cursor-text"
                                      >
                                        <span>Act: {st.actualQty}</span>
                                        <Pencil className="w-2.5 h-2.5 text-emerald-200" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: LIVE FLOOR DISPLAY (READ-ONLY) — FULL-SCREEN 13-MACHINE VIEW
          ===================================================================== */}
      {subTab === 'floorDisplay' && (
        <div
          ref={floorDisplayContainerRef}
          className={`print:hidden flex flex-col gap-1 overflow-clip ${
            isFloorFullscreen
              ? 'fixed inset-0 z-[100] h-dvh w-full bg-slate-100 p-1.5'
              : 'h-[calc(100dvh-115px)] min-h-[580px] w-full'
          }`}
        >
          {/* ONLY the Dark Blue Header Bar (`me head eka witharak thiyala`) */}
          <div className="shrink-0 bg-persian-800 text-white rounded-xl px-3 py-1.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Monitor className="w-4 h-4 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide truncate">
                  Floor Production Monitoring Dashboard ({machines.length} Machines)
                </h3>
                <p className="text-[10px] text-blue-200 truncate">
                  Live Read-Only Floor Display synced with Daily Production Plan &amp; Style Master
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {/* Compact Inline Daily Target vs Actual Output Pill inside Header */}
              <div className="bg-persian-900/80 border border-persian-600/50 rounded-lg px-2.5 py-1 flex items-center gap-2 text-blue-100">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  Target vs Actual:
                </span>
                <span className="font-mono font-extrabold text-white">
                  {floorStats.shiftActualTotal.toLocaleString()} /{' '}
                  {floorStats.shiftPlanTotal.toLocaleString()} Pcs
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
                  {floorStats.overallPct}% Met
                </span>
              </div>

              <div className="bg-persian-900/70 border border-persian-600/40 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-blue-100">
                <label htmlFor={`${uid}-floor-date`} className="font-semibold text-amber-300">
                  Date:
                </label>
                <input
                  id={`${uid}-floor-date`}
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="bg-transparent text-white font-mono font-bold outline-none text-[11px]"
                />
              </div>

              <button
                type="button"
                onClick={() => setPlanShift((prev) => (prev === 'day' ? 'night' : 'day'))}
                className="bg-persian-900/80 px-2.5 py-1 rounded-lg border border-persian-600/50 flex items-center gap-1.5 text-[11px] font-bold text-white cursor-pointer"
              >
                {planShift === 'day' ? (
                  <>
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Day Shift (08:00 - 19:00)</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3 h-3 text-indigo-300" />
                    <span>Night Shift (19:00 - 06:00)</span>
                  </>
                )}
              </button>

              <div className="bg-blue-900/60 border border-blue-400/40 text-blue-100 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Eye className="w-3 h-3 text-blue-300" />
                <span>Live Display Mode (Read-Only)</span>
              </div>

              <button
                type="button"
                onClick={toggleBrowserFloorFullscreen}
                title={isFloorFullscreen ? 'Exit Full Screen Display' : 'Enter Full Screen Display'}
                className="bg-amber-400 hover:bg-amber-300 text-persian-950 font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] shadow-xs cursor-pointer transition-colors"
              >
                {isFloorFullscreen ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span>Full Screen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  setIsFloorFullscreen(false);
                  setSubTab('planEditor');
                }}
                className="bg-persian-700 hover:bg-persian-600 text-white font-bold px-2.5 py-1 rounded-lg border border-persian-500/60 flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
              >
                <Calendar className="w-3 h-3 text-amber-300" />
                <span>Plan Editor</span>
              </button>
            </div>
          </div>

          {/* All 13 Machines Simultaneously Fitted in Remaining Viewport Height (`1fr` per machine) */}
          <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-clip">
            {/* Compact Timeline Hours Header */}
            <div className="shrink-0 flex border-b border-slate-200 bg-slate-50 font-semibold text-[11px] text-slate-600">
              <div className="w-64 sm:w-72 px-2.5 py-1 flex items-center justify-between bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider shrink-0">
                <span>Machine &amp; Crew ({machines.length})</span>
                <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-300 font-normal text-slate-500">
                  Operator + Helper
                </span>
              </div>
              <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-200 border-r-2 border-r-rose-500">
                {SHIFT_HOURS.map((h, idx) => (
                  <div
                    key={h.col}
                    className="py-1 px-0.5 flex flex-col items-center justify-center bg-slate-50/90 leading-tight"
                  >
                    <span className="font-bold text-slate-800 text-[9.5px]">
                      {h.label}–{h.endLabel}
                    </span>
                    <span className="text-[8.5px] text-slate-400 font-normal">
                      Hour {idx + 1} {h.col === 11 ? '• End 07:00 PM' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 13 Machine Rows Grid — Equal Fractional Height so All 13 Fit on One Screen */}
            <div
              className="flex-1 min-h-0 grid divide-y divide-slate-200"
              style={{
                gridTemplateRows: `repeat(${Math.max(1, machines.length)}, minmax(0, 1fr))`,
              }}
            >
              {machines.map((mac) => {
                const macBlocks = activeDateShiftPlans.filter(
                  (b) => b.machineId === mac.id || b.machineName === mac.name
                );
                const macPlan = macBlocks.reduce((sum, b) => sum + b.planQty, 0);
                const macActual = macBlocks.reduce((sum, b) => sum + b.actualQty, 0);
                const compPercent = macPlan > 0 ? Math.round((macActual / macPlan) * 100) : 0;

                const latestBlock = macBlocks[macBlocks.length - 1];
                const assignedOp =
                  getMachineAssignedOperator(mac) ||
                  resolveRealEmployeeLabel(latestBlock?.operatorName);
                const assignedHelp =
                  getMachineAssignedHelper(mac) !== 'None'
                    ? getMachineAssignedHelper(mac)
                    : resolveRealEmployeeLabel(latestBlock?.helperName) || 'None';
                const hasValidOp = Boolean(assignedOp);

                return (
                  <div
                    key={mac.id}
                    className="min-h-0 flex items-stretch hover:bg-slate-50/80 transition-colors overflow-clip"
                  >
                    {/* Compact Machine & Crew Left Column */}
                    <div className="w-64 sm:w-72 px-2.5 py-0.5 bg-white border-r border-slate-300 flex flex-col justify-center gap-0.5 shrink-0 min-w-0">
                      <div className="flex items-center justify-between gap-1 leading-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-slate-800 text-xs tracking-tight truncate">
                            {mac.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ${
                              !hasValidOp
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : mac.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : mac.status === 'Setup'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {!hasValidOp
                              ? '⚠️ Assign Op'
                              : mac.status === 'Active'
                              ? 'Running'
                              : mac.status === 'Setup'
                              ? 'Setup'
                              : 'Idle'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                          Out: <strong className="text-slate-800">{macActual}</strong>/{macPlan} (
                          <span
                            className={
                              compPercent >= 100
                                ? 'text-emerald-600 font-bold'
                                : compPercent >= 85
                                ? 'text-amber-600 font-bold'
                                : 'text-rose-500 font-bold'
                            }
                          >
                            {compPercent}%
                          </span>
                          )
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 text-[10px] leading-none min-w-0">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          {hasValidOp ? (
                            <div
                              title={assignedOp}
                              className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-semibold truncate max-w-[155px]"
                            >
                              <UserCheck className="w-2.5 h-2.5 text-persian-600 shrink-0" />
                              <span className="truncate">{assignedOp}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-1.5 py-0.5 rounded text-rose-800 font-extrabold shrink-0">
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                              <span>Assign Operator</span>
                            </div>
                          )}
                          <div
                            title={`Helper: ${assignedHelp}`}
                            className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium truncate max-w-[90px]"
                          >
                            <Users className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span className="truncate">{assignedHelp}</span>
                          </div>
                        </div>

                        <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200 shrink-0">
                          <div
                            className={`${
                              compPercent >= 100
                                ? 'bg-emerald-500'
                                : compPercent >= 85
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            } h-full rounded-full`}
                            style={{ width: `${Math.min(compPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Compact Right Side 11-Hour Timeline Grid Track */}
                    <div className="flex-1 grid grid-cols-11 relative matrix-grid px-1 py-0.5 gap-1 items-stretch min-h-0 min-w-0">
                      {macBlocks.map((st) => {
                        const cStyle = getCompanyColor(st.clientName);
                        const pct =
                          st.planQty > 0 ? Math.round((st.actualQty / st.planQty) * 100) : 0;
                        const performanceGlow =
                          pct >= 100
                            ? 'glow-target-met'
                            : pct >= 85
                            ? 'glow-target-near'
                            : 'glow-target-behind';

                        return (
                          <div
                            key={st.id}
                            style={{
                              gridColumn: `${st.startHour} / span ${st.spanHours}`,
                              gridRow: 1,
                            }}
                            className={`${cStyle.bg} ${cStyle.border} ${performanceGlow} border rounded-lg px-2 py-0.5 shadow-2xs flex flex-col justify-center gap-0.5 relative min-w-0 overflow-clip leading-tight`}
                          >
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider shrink-0 ${cStyle.text}`}
                                >
                                  {st.clientName}
                                </span>
                                <span className="font-extrabold text-slate-800 text-[11px] tracking-tight truncate">
                                  {st.styleCode ? `${st.styleCode} — ` : ''}
                                  {st.styleName} ({st.size})
                                </span>
                              </div>
                              <span className="text-[9px] font-mono font-bold text-slate-500 shrink-0">
                                {pct}%
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-slate-600 truncate">
                                Plan: {st.planQty}
                              </span>
                              <div className="bg-persian-800 text-white font-extrabold text-[10px] px-1.5 py-0 rounded shadow-2xs shrink-0">
                                Act: {st.actualQty}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: STYLE & PARTS MASTER CRUD (style and other crud.html)
          ===================================================================== */}
      {subTab === 'styleCrud' && (
        <div className="space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <h3
                id={`${uid}-style-form-title`}
                className="font-extrabold text-sm uppercase text-slate-600 flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-persian-500" />
                {editingStyleId ? 'Edit Master Style Hierarchy' : 'Register Master Style Hierarchy'}
              </h3>
              <span className="text-xs text-slate-500">
                Needle Spec is synced with Needle Stock Directory • Client is synced with Company CRUD
              </span>
            </div>

            <form
              aria-labelledby={`${uid}-style-form-title`}
              onSubmit={handleStyleSubmit}
              className="space-y-6"
            >
              {/* Parent Style Info (7-col grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label
                    htmlFor={`${uid}-style-code`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Style Code *
                  </label>
                  <input
                    id={`${uid}-style-code`}
                    name="styleCode"
                    type="text"
                    value={styleCode}
                    onChange={(e) => setStyleCode(e.target.value)}
                    placeholder="e.g. ST-102"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={60}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-style-company`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Client / Company *
                  </label>
                  <select
                    id={`${uid}-style-company`}
                    name="styleCompany"
                    value={styleCompany}
                    onChange={(e) => setStyleCompany(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
                  >
                    {companies.length === 0 ? (
                      <option value="">-- Add Company First --</option>
                    ) : (
                      companies.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-style-name`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Style Name *
                  </label>
                  <input
                    id={`${uid}-style-name`}
                    name="styleName"
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="e.g. Track Jacket"
                    maxLength={120}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-style-fabric`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Fabric Color *
                  </label>
                  <select
                    id={`${uid}-style-fabric`}
                    name="styleFabric"
                    value={styleFabric}
                    onChange={(e) => setStyleFabric(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-persian-500"
                  >
                    {FABRIC_COLORS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-style-currency`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Currency *
                  </label>
                  <select
                    id={`${uid}-style-currency`}
                    name="styleCurrency"
                    value={styleCurrency}
                    onChange={(e) => setStyleCurrency(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-persian-500"
                  >
                    {CURRENCY_OPTIONS.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-style-price`}
                    className="block text-xs font-bold text-emerald-800 mb-1"
                  >
                    Garment Price *
                  </label>
                  <input
                    id={`${uid}-style-price`}
                    name="stylePrice"
                    type="number"
                    step="0.01"
                    min={0}
                    max={1000000}
                    value={stylePrice}
                    onChange={(e) => setStylePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    required
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-sm font-black text-emerald-700 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-style-qty`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Total Order Qty *
                  </label>
                  <input
                    id={`${uid}-style-qty`}
                    name="styleQty"
                    type="number"
                    min={1}
                    max={1000000}
                    value={styleQty}
                    onChange={(e) => {
                      const nextTotal = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setStyleQty(nextTotal);
                      setSizeLimitWarning(null);
                      if (draftSizes.length === 1) {
                        setDraftSizes([{ ...draftSizes[0], qty: nextTotal }]);
                      } else {
                        let running = 0;
                        setDraftSizes((prev) =>
                          prev.map((item) => {
                            const rem = Math.max(0, nextTotal - running);
                            const clampedQty = Math.min(Math.max(0, Number(item.qty) || 0), rem);
                            running += clampedQty;
                            return { ...item, qty: clampedQty };
                          })
                        );
                      }
                    }}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-persian-800 outline-none focus:border-persian-500 border-l-4 border-l-persian-500"
                  />
                </div>
              </div>

              {/* Garment Size & Quantity Breakdown (Cannot Exceed Total Order Qty) */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Garment Size &amp; Quantity Breakdown *
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Enter the sizes and quantities for this style. Total cannot exceed Order Qty ({styleQty.toLocaleString()} Pcs).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                        sizeBreakdownTotal === styleQty
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : sizeBreakdownTotal < styleQty
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      Size Total: {sizeBreakdownTotal.toLocaleString()} / {styleQty.toLocaleString()}{' '}
                      Pcs{' '}
                      {sizeBreakdownTotal === styleQty
                        ? '✓ Matched'
                        : sizeBreakdownTotal < styleQty
                        ? `(${(styleQty - sizeBreakdownTotal).toLocaleString()} Pcs Adui / Short)`
                        : `(${(sizeBreakdownTotal - styleQty).toLocaleString()} Pcs Over)`}
                    </span>

                    {sizeBreakdownTotal !== styleQty && (
                      <button
                        type="button"
                        onClick={handleAutoBalanceSizes}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold cursor-pointer"
                      >
                        Balance to {styleQty.toLocaleString()} Pcs
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleAddSizeRow}
                      disabled={sizeBreakdownTotal >= styleQty}
                      title={
                        sizeBreakdownTotal >= styleQty
                          ? `Total Order Qty (${styleQty.toLocaleString()} Pcs) is already 100% allocated`
                          : 'Add another garment size'
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 ${
                        sizeBreakdownTotal >= styleQty
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-persian-50 text-persian-700 border border-persian-200 hover:bg-persian-100 cursor-pointer'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Size
                    </button>
                  </div>
                </div>

                {/* Inline Message when Size Total is Less (Short) than Order Qty */}
                {sizeBreakdownTotal < styleQty && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Size Breakdown total eka Total Order Qty ({styleQty.toLocaleString()} Pcs) walata wada{' '}
                      <strong>{(styleQty - sizeBreakdownTotal).toLocaleString()} Pcs adui (Short)</strong>. Aduwen fill wela thibunata save karanna puluwan, eth Order Qty ekata wada wadiyen danna ba.
                    </span>
                  </div>
                )}

                {/* Inline Warning when User Attempts to Exceed Order Qty */}
                {sizeLimitWarning && (
                  <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{sizeLimitWarning}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSizeLimitWarning(null)}
                      className="text-rose-500 hover:text-rose-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <datalist id={`${uid}-size-suggestions`}>
                  {allAvailableSizes.map((sz) => (
                    <option key={sz} value={sz} />
                  ))}
                </datalist>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {draftSizes.map((item, sIdx) => {
                    const otherSum = draftSizes.reduce(
                      (sum, row, idx) =>
                        idx === sIdx ? sum : sum + (Math.max(0, Number(row.qty)) || 0),
                      0
                    );
                    const maxRowQty = Math.max(0, (styleQty || 0) - otherSum);

                    return (
                      <div
                        key={sIdx}
                        className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-end gap-2 shadow-2xs"
                      >
                        <div className="w-28">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Size *
                          </label>
                          <input
                            type="text"
                            list={`${uid}-size-suggestions`}
                            value={item.size}
                            onChange={(e) => handleUpdateSizeField(sIdx, 'size', e.target.value)}
                            placeholder="e.g. 3-6, M, L"
                            required
                            className="w-full p-1.5 border border-slate-300 rounded text-xs font-bold bg-white outline-none focus:border-persian-500"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Qty (Max {maxRowQty}) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={maxRowQty}
                            value={item.qty}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              handleUpdateSizeField(
                                sIdx,
                                'qty',
                                Math.max(0, parseInt(e.target.value, 10) || 0)
                              )
                            }
                            required
                            className="w-full p-1.5 border border-slate-300 rounded text-xs font-extrabold font-mono text-persian-800 bg-white outline-none focus:border-persian-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSizeRow(sIdx)}
                          aria-label={`Remove size row ${sIdx + 1}`}
                          className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Parts & Thread Matrices */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-700">
                    Style Parts &amp; Thread Matrices
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Garment Part
                  </button>
                </div>

                <div className="space-y-4">
                  {draftParts.map((part, pIdx) => (
                    <div
                      key={pIdx}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                    >
                      <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                            Part Location *
                          </label>
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => handleUpdatePartField(pIdx, 'name', e.target.value)}
                            placeholder="e.g. Front Logo / Back Crest"
                            required
                            className="w-full p-1.5 bg-white border border-slate-300 rounded text-sm font-bold"
                          />
                        </div>

                        <div className="w-28">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                            Part Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={part.qty}
                            onChange={(e) =>
                              handleUpdatePartField(
                                pIdx,
                                'qty',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-full p-1.5 border border-slate-300 rounded text-sm font-bold text-persian-700 bg-persian-50"
                          />
                        </div>

                        <div className="w-52">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                            Backing Required
                          </label>
                          <select
                            value={part.backing}
                            onChange={(e) => handleUpdatePartField(pIdx, 'backing', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                          >
                            {BACKING_OPTIONS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-48">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                            Needle Spec (Stock Synced)
                          </label>
                          <select
                            value={part.needle}
                            onChange={(e) => handleUpdatePartField(pIdx, 'needle', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                          >
                            {needleSpecOptions.length === 0 ? (
                              <option value="">-- Add Needle in Needle Stock --</option>
                            ) : (
                              needleSpecOptions.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePart(pIdx)}
                          aria-label={`Remove garment part ${pIdx + 1}`}
                          className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="overflow-x-auto p-3">
                        <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                          <thead className="text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2 w-1/5">Thread Color</th>
                              <th className="p-2 w-1/6">Shade #</th>
                              <th className="p-2 w-1/6">Brand</th>
                              <th className="p-2 bg-blue-50/50 w-28">Mach. Len (m)</th>
                              <th className="p-2 bg-blue-50/50 w-28">Cone Size (m)</th>
                              <th className="p-2 text-center bg-persian-50 w-28">Req. Cones</th>
                              <th className="p-2 w-12 text-center">Del</th>
                            </tr>
                          </thead>
                          <tbody>
                            {part.threads.map((thread, tIdx) => {
                              const reqCones = (
                                (thread.mLen * 1.5 * part.qty * (styleQty || 0)) /
                                (thread.cLen || 5000)
                              ).toFixed(2);
                              return (
                                <tr
                                  key={tIdx}
                                  className="hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                >
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={thread.color}
                                      onChange={(e) =>
                                        handleUpdateThreadField(
                                          pIdx,
                                          tIdx,
                                          'color',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Color"
                                      className="w-full p-1.5 border border-slate-200 rounded text-xs"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={thread.shade}
                                      onChange={(e) =>
                                        handleUpdateThreadField(
                                          pIdx,
                                          tIdx,
                                          'shade',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Shade #"
                                      autoCorrect="off"
                                      autoCapitalize="none"
                                      spellCheck={false}
                                      className="w-full p-1.5 border border-slate-200 rounded text-xs font-mono"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <select
                                      value={thread.brand}
                                      onChange={(e) =>
                                        handleUpdateThreadField(
                                          pIdx,
                                          tIdx,
                                          'brand',
                                          e.target.value
                                        )
                                      }
                                      className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white"
                                    >
                                      {THREAD_BRANDS.map((b) => (
                                        <option key={b} value={b}>
                                          {b}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-1.5 bg-blue-50 border-l border-slate-200">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min={0}
                                      value={thread.mLen}
                                      onChange={(e) =>
                                        handleUpdateThreadField(
                                          pIdx,
                                          tIdx,
                                          'mLen',
                                          Math.max(0, parseFloat(e.target.value) || 0)
                                        )
                                      }
                                      className="w-full p-1.5 border border-blue-300 rounded text-xs font-bold text-blue-800 bg-white"
                                    />
                                  </td>
                                  <td className="p-1.5 bg-blue-50">
                                    <select
                                      value={thread.cLen}
                                      onChange={(e) =>
                                        handleUpdateThreadField(
                                          pIdx,
                                          tIdx,
                                          'cLen',
                                          parseInt(e.target.value, 10) || 5000
                                        )
                                      }
                                      className="w-full p-1.5 border border-blue-300 rounded text-xs font-bold text-blue-800 bg-white"
                                    >
                                      {CONE_SIZES.map((cs) => (
                                        <option key={cs} value={cs}>
                                          {cs}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-1.5 bg-persian-50 text-center font-black text-persian-800 text-sm border-x border-slate-200 font-mono">
                                    {reqCones}
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveThread(pIdx, tIdx)}
                                      aria-label="Remove thread row"
                                      className="text-rose-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      <X className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <button
                          type="button"
                          onClick={() => handleAddThread(pIdx)}
                          className="mt-2 text-[11px] font-bold text-persian-600 hover:text-persian-800 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Thread Row
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-persian-900 text-white font-bold px-8 py-3 rounded-xl text-sm hover:bg-persian-800 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {editingStyleId ? 'Update Master Style' : 'Save Master Style'}
                </button>
                {editingStyleId && (
                  <button
                    type="button"
                    onClick={resetStyleForm}
                    className="bg-slate-200 text-slate-700 font-bold px-8 py-3 rounded-xl text-sm hover:bg-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Style Master Directory Table */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3
                id={`${uid}-style-table-caption`}
                className="font-extrabold text-sm uppercase text-slate-500"
              >
                Active Style Master Directory ({activeStylesMetrics.length})
              </h3>
              {doneStylesMetrics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubTab('doneStyles')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  View Done Styles ({doneStylesMetrics.length})
                </button>
              )}
            </div>
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={`${uid}-style-table-caption`}
              className="table-region rounded-xl border border-slate-200"
            >
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">Code</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Style Name</th>
                    <th className="p-4">Fabric</th>
                    <th className="p-4">Order Qty &amp; Sizes</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Garment Price</th>
                    <th className="p-4">Composition</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStylesMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                        No active styles registered right now. Use the form above to add a style or check the Done Styles tab.
                      </td>
                    </tr>
                  ) : (
                    activeStylesMetrics.map(({ style: s, doneQty, orderQty }) => {
                      const totalThreads = s.parts.reduce((sum, p) => sum + p.threads.length, 0);
                      const pct = orderQty > 0 ? Math.min(100, Math.round((doneQty / orderQty) * 100)) : 0;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <th scope="row" className="p-4 font-black text-persian-800 bg-white">
                            {s.code || '—'}
                          </th>
                          <td className="p-4">
                            <span className="bg-slate-200 px-2.5 py-1 rounded text-[10px] font-bold uppercase">
                              {s.company}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-800">{s.name}</td>
                          <td className="p-4 font-semibold text-slate-600">{s.fabric}</td>
                          <td className="p-4">
                            <div className="font-mono font-bold text-persian-800">
                              {s.qty.toLocaleString()} Pcs
                            </div>
                            {s.sizeBreakdown && s.sizeBreakdown.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {s.sizeBreakdown.map((sz) => (
                                  <span
                                    key={sz.size}
                                    className="text-[10px] font-mono font-bold bg-persian-50 text-persian-800 border border-persian-200 px-1.5 py-0.5 rounded"
                                  >
                                    {sz.size}: {sz.qty}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono text-xs">
                            <span className="font-bold text-emerald-700">
                              {doneQty.toLocaleString()}
                            </span>{' '}
                            / {orderQty.toLocaleString()} Pcs ({pct}%)
                          </td>
                          <td className="p-4 font-black text-emerald-600 font-mono">
                            {s.currency} {Number(s.price || 0).toFixed(2)}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-500 text-xs">
                            {s.parts.length} Parts / {totalThreads} Threads
                          </td>
                          <td className="p-4 text-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStyleCompleted(s, true)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                              title="Mark this style as Done and move to Done Styles tab"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mark Done
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStrikeOff(s.id)}
                              className="text-persian-600 hover:text-persian-800 border-r border-slate-300 pr-3 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> Strike-Off
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditStyle(s)}
                              aria-label={`Edit style ${s.code || s.name}`}
                              className="text-slate-500 hover:text-persian-600 p-1 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStyle(s)}
                              aria-label={`Delete style ${s.code || s.name}`}
                              className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB: DONE STYLES DIRECTORY (Completed Orders with Filters)
          ===================================================================== */}
      {subTab === 'doneStyles' && (
        <div className="space-y-5 print:hidden">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Completed Styles (Filtered)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {filteredDoneStylesMetrics.length}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  of {doneStylesMetrics.length} Total Done
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Total Completed Garments
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-persian-800 font-mono">
                  {filteredDoneStylesMetrics
                    .reduce((sum, m) => sum + Math.max(m.doneQty, m.orderQty), 0)
                    .toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-slate-500">Pcs Finished</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Completed Order Value (LKR)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {filteredDoneStylesMetrics
                    .filter((m) => m.style.currency === 'LKR')
                    .reduce(
                      (sum, m) => sum + Number(m.style.price || 0) * Math.max(m.doneQty, m.orderQty),
                      0
                    )
                    .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-semibold text-slate-500">LKR</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Client Companies Served
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-indigo-700 font-mono">
                  {new Set(filteredDoneStylesMetrics.map((m) => m.style.company)).size}
                </span>
                <span className="text-xs font-semibold text-slate-500">Clients</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-persian-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Filter Done Styles
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDoneSearchQuery('');
                  setDoneCompanyFilter('ALL');
                  setDoneFabricFilter('ALL');
                  setDoneSizeFilter('ALL');
                  setDoneDateFrom('');
                  setDoneDateTo('');
                }}
                className="text-xs font-bold text-slate-600 hover:text-persian-800 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Search Style Code / Name / Company
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={doneSearchQuery}
                    onChange={(e) => setDoneSearchQuery(e.target.value)}
                    placeholder="Search completed styles..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:border-persian-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Company / Client
                </label>
                <select
                  value={doneCompanyFilter}
                  onChange={(e) => setDoneCompanyFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:border-persian-500"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Fabric Color
                </label>
                <select
                  value={doneFabricFilter}
                  onChange={(e) => setDoneFabricFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:border-persian-500"
                >
                  <option value="ALL">All Fabrics</option>
                  {FABRIC_COLORS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Garment Size
                </label>
                <select
                  value={doneSizeFilter}
                  onChange={(e) => setDoneSizeFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:border-persian-500"
                >
                  <option value="ALL">All Sizes</option>
                  {allAvailableSizes.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={doneDateFrom}
                    onChange={(e) => setDoneDateFrom(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={doneDateTo}
                    onChange={(e) => setDoneDateTo(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Done Styles Table */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h3
              id={`${uid}-done-styles-table-caption`}
              className="font-extrabold mb-4 text-sm uppercase text-emerald-800 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Done Styles Archive ({filteredDoneStylesMetrics.length})
            </h3>

            <div
              tabIndex={0}
              role="region"
              aria-labelledby={`${uid}-done-styles-table-caption`}
              className="table-region rounded-xl border border-slate-200"
            >
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-emerald-950 text-white text-xs uppercase font-bold border-b border-emerald-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">Code</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Style Name</th>
                    <th className="p-4">Fabric</th>
                    <th className="p-4">Size Breakdown</th>
                    <th className="p-4">Done / Order Qty</th>
                    <th className="p-4">Price &amp; Total Value</th>
                    <th className="p-4">Completed Date</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoneStylesMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                        No completed styles match your current filters. Styles automatically appear here once their Done Qty reaches Order Qty or when marked Done.
                      </td>
                    </tr>
                  ) : (
                    filteredDoneStylesMetrics.map(({ style: s, doneQty, orderQty, lastPlanDate }) => {
                      const effectiveQty = Math.max(doneQty, orderQty);
                      const totalVal = Number(s.price || 0) * effectiveQty;
                      const compDate =
                        (s.completedAt ? s.completedAt.split('T')[0] : '') ||
                        lastPlanDate ||
                        todayStr;
                      return (
                        <tr key={s.id} className="hover:bg-emerald-50/40">
                          <th scope="row" className="p-4 font-black text-persian-800 bg-white">
                            {s.code || '—'}
                          </th>
                          <td className="p-4">
                            <span className="bg-slate-200 px-2.5 py-1 rounded text-[10px] font-bold uppercase">
                              {s.company}
                            </span>
                          </td>
                          <td className="p-4 font-extrabold text-slate-800">{s.name}</td>
                          <td className="p-4 font-semibold text-slate-600">{s.fabric}</td>
                          <td className="p-4">
                            {s.sizeBreakdown && s.sizeBreakdown.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {s.sizeBreakdown.map((sz) => (
                                  <span
                                    key={sz.size}
                                    className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded"
                                  >
                                    {sz.size}: {sz.qty}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Standard</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-emerald-700">
                                {effectiveQty.toLocaleString()} / {orderQty.toLocaleString()} Pcs
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                DONE
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-mono">
                            <div className="font-bold text-slate-700 text-xs">
                              {s.currency} {Number(s.price || 0).toFixed(2)} / Pc
                            </div>
                            <div className="font-black text-emerald-700 text-xs">
                              Total: {s.currency}{' '}
                              {totalVal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs font-bold text-slate-600">
                            {compDate}
                          </td>
                          <td className="p-4 text-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenStrikeOff(s.id)}
                              className="text-persian-600 hover:text-persian-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> Strike-Off
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStyleCompleted(s, false)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Reopen
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: STRIKE-OFF SUBMISSION SHEETS (A4 PORTRAIT PRINT)
          ===================================================================== */}
      {subTab === 'strikeOff' && (
        <div className="space-y-6">
          {/* Controls bar (hidden on print) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-persian-800 uppercase">
                  Embellishment Strike-Off Submission Sheets (A4 Portrait)
                </h3>
                <p className="text-xs text-slate-500">
                  Generates 1 physical A4 Strike-Off Sheet per Garment Part for customer approval.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!strikeOffStyle}
                  className="bg-persian-800 hover:bg-persian-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print All Parts
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('styleCrud')}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Back to Style Master
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Select Master Style
                </label>
                <select
                  value={selectedStrikeOffStyleId}
                  onChange={(e) => setSelectedStrikeOffStyleId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  {styles.length === 0 ? (
                    <option value="">-- No Styles --</option>
                  ) : (
                    styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `${s.code} — ${s.name}` : s.name} ({s.company})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Sent To</label>
                <input
                  type="text"
                  value={strikeSentTo}
                  onChange={(e) => setStrikeSentTo(e.target.value)}
                  placeholder="Buyer / Merchandiser"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Sent By</label>
                <input
                  type="text"
                  value={strikeSentBy}
                  onChange={(e) => setStrikeSentBy(e.target.value)}
                  placeholder="Sample Room Incharge"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Submission No
                </label>
                <input
                  type="text"
                  value={strikeSubmissionNo}
                  onChange={(e) => setStrikeSubmissionNo(e.target.value)}
                  placeholder="01 / First Strike-Off"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Needle Supplier
                </label>
                <input
                  type="text"
                  value={strikeNeedleSupplier}
                  onChange={(e) => setStrikeNeedleSupplier(e.target.value)}
                  placeholder="Groz-Beckert"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Remarks</label>
                <input
                  type="text"
                  value={strikeRemarks}
                  onChange={(e) => setStrikeRemarks(e.target.value)}
                  placeholder="Optional remarks"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {!strikeOffStyle ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 print:hidden">
              <p className="text-xs text-slate-500">
                No Style selected. Please register a Style in the Style &amp; Parts CRUD tab first.
              </p>
            </div>
          ) : (
            <div className="space-y-10 print:space-y-0">
              {strikeOffStyle.parts.map((part, pIdx) => {
                const formattedDate = new Date().toLocaleDateString().replace(/\//g, '.');
                return (
                  <div
                    key={pIdx}
                    className="bg-white text-black mx-auto w-[210mm] h-[285mm] border-[2px] border-black relative box-border flex flex-col shadow-xl print:shadow-none print:break-after-page print:last:break-after-auto"
                  >
                    {/* Header */}
                    <div className="flex h-[86px] border-b-[2px] border-black">
                      <div className="flex-1 px-4 flex flex-col justify-center border-r-[2px] border-black">
                        <h1 className="text-3xl font-serif font-extrabold uppercase tracking-wide leading-none">
                          DINUSHA
                        </h1>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest mt-1">
                          Embroidery (Pvt) Ltd
                        </h2>
                      </div>
                      <div className="w-[120px] flex items-center justify-center bg-white relative">
                        <div className="w-16 h-16 rounded-full border-[2px] border-gray-700 flex items-center justify-center font-serif italic text-lg text-gray-800 bg-gray-50">
                          Dinusha
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="border-b-[2px] border-black text-center py-2 bg-white">
                      <h2 className="text-[18px] font-bold font-serif tracking-wide">
                        Embellishment Strike Off Submission Sheet
                      </h2>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 border-b-[2px] border-black text-[12px]">
                      <div className="border-r-[2px] border-black">
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Customer
                          </div>
                          <div className="px-2 font-semibold uppercase text-[11px] truncate">
                            {strikeOffStyle.company}
                          </div>
                        </div>
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Style No
                          </div>
                          <div className="px-2 font-semibold uppercase text-[11px] truncate">
                            {strikeOffStyle.code}
                          </div>
                        </div>
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Graphic Name
                          </div>
                          <div className="px-2 font-semibold uppercase text-[11px] truncate">
                            {strikeOffStyle.name} - {part.name}
                          </div>
                        </div>
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Fabric Color
                          </div>
                          <div className="px-2 font-semibold uppercase text-[11px] truncate">
                            {strikeOffStyle.fabric}
                          </div>
                        </div>
                        <div className="flex h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Date
                          </div>
                          <div className="px-2 font-mono text-[11px] font-semibold">
                            {formattedDate}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Sent To
                          </div>
                          <div className="px-2 text-[11px] font-semibold">{strikeSentTo}</div>
                        </div>
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Sent By
                          </div>
                          <div className="px-2 text-[11px] font-semibold">{strikeSentBy}</div>
                        </div>
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Technique
                          </div>
                          <div className="px-2 text-[11px] font-semibold">Embroidery</div>
                        </div>
                        <div className="flex border-b border-black h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Submission No
                          </div>
                          <div className="px-2 text-[11px] font-semibold">
                            {strikeSubmissionNo}
                          </div>
                        </div>
                        <div className="flex h-6 items-center">
                          <div className="w-32 pl-1.5 font-bold border-r border-black h-full flex items-center">
                            Order Qty
                          </div>
                          <div className="px-2 font-mono text-[11px] font-semibold">
                            {strikeOffStyle.qty.toLocaleString()} Pcs
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="flex border-b-[2px] border-black text-[12px] h-7">
                      <div className="w-[128px] pl-1.5 font-bold border-r border-black flex items-center">
                        Remarks
                      </div>
                      <div className="flex-1 px-2 flex items-center text-[11px] font-semibold">
                        {strikeRemarks}
                      </div>
                    </div>

                    {/* Main Swatch & Right Thread Spec Column */}
                    <div className="flex flex-1">
                      <div className="flex-1 relative bg-white">
                        <span className="print:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-200 text-2xl font-bold uppercase text-center w-full select-none">
                          Attach Strike-Off
                          <br />
                          Sample Here
                        </span>
                      </div>

                      <div className="w-[220px] border-l-[2px] border-black flex flex-col">
                        <div className="text-center p-1 border-b border-black text-[11px] font-bold">
                          Thread Colours
                        </div>
                        <div className="flex text-[11px] border-b border-black text-center font-semibold">
                          <div className="w-1/3 border-r border-black p-0.5">Shade No</div>
                          <div className="w-2/3 p-0.5">Sample</div>
                        </div>
                        <div className="flex-col border-b-[2px] border-black bg-white">
                          {Array.from({ length: 14 }, (_, tIdx) => {
                            const th = part.threads[tIdx];
                            return (
                              <div
                                key={tIdx}
                                className="flex border-b border-black last:border-b-0 h-[22px]"
                              >
                                <div className="w-1/3 border-r border-black px-1 text-[11px] font-mono flex items-center font-bold text-gray-800 truncate">
                                  {th?.shade || ''}
                                </div>
                                <div className="w-2/3 px-1 text-[10px] flex items-center text-gray-600 truncate">
                                  {th?.color ? `${th.color} (${th.brand})` : ''}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="text-[11px] bg-white border-b-[2px] border-black">
                          <div className="flex flex-col border-b border-black">
                            <div className="px-1 py-0.5 font-bold border-b border-black text-center">
                              Backing Type
                            </div>
                            <div className="px-1 h-7 font-semibold flex items-center justify-center text-center leading-tight">
                              {part.backing}
                            </div>
                          </div>
                          <div className="flex flex-col border-b border-black">
                            <div className="px-1 py-0.5 font-bold border-b border-black text-center">
                              Needle Size
                            </div>
                            <div className="px-1 h-7 font-semibold flex items-center justify-center text-center leading-tight">
                              {part.needle}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="px-1 py-0.5 font-bold border-b border-black text-center">
                              Needle Supplier
                            </div>
                            <div className="px-1 h-7 font-semibold flex items-center justify-center text-center">
                              {strikeNeedleSupplier}
                            </div>
                          </div>
                        </div>

                        <div className="h-24 relative p-2 bg-white flex-1 flex flex-col justify-end items-end">
                          <div className="text-[11px] text-center mb-2 w-full flex flex-col items-end pr-2">
                            <span className="mr-6 font-semibold">Approved By</span>
                            <div className="border-b border-dotted border-black w-32 mt-6" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: COMPANY / CLIENT MASTER CRUD (style and other crud.html)
          ===================================================================== */}
      {subTab === 'companyCrud' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 lg:col-span-1 h-fit">
            <h3
              id={`${uid}-company-form-title`}
              className="font-extrabold mb-5 text-sm uppercase text-slate-500 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-persian-600" />
              {editingCompanyId ? 'Edit Client Company' : 'Add Client Company'}
            </h3>
            <form
              aria-labelledby={`${uid}-company-form-title`}
              onSubmit={handleCompanySubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor={`${uid}-comp-name`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Company Name *
                </label>
                <input
                  id={`${uid}-comp-name`}
                  name="compName"
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Nike Apparel"
                  maxLength={120}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`${uid}-comp-contact`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Contact Person *
                </label>
                <input
                  id={`${uid}-comp-contact`}
                  name="compContact"
                  type="text"
                  value={compContact}
                  onChange={(e) => setCompContact(e.target.value)}
                  placeholder="Representative Name"
                  maxLength={100}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`${uid}-comp-email`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Email Address *
                </label>
                <input
                  id={`${uid}-comp-email`}
                  name="compEmail"
                  type="email"
                  autoComplete="email"
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                  placeholder="contact@company.com"
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`${uid}-comp-phone`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Phone Number *
                </label>
                <input
                  id={`${uid}-comp-phone`}
                  name="compPhone"
                  type="tel"
                  autoComplete="tel"
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`${uid}-comp-address`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Billing / Company Address *
                </label>
                <textarea
                  id={`${uid}-comp-address`}
                  name="compAddress"
                  rows={2}
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  placeholder="No. 120, Industrial Zone, Biyagama, Sri Lanka"
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`${uid}-comp-color`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Gantt Timeline Badge Color
                </label>
                <select
                  id={`${uid}-comp-color`}
                  name="compColor"
                  value={compColor}
                  onChange={(e) => setCompColor(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:border-persian-500 outline-none"
                >
                  <option value="indigo">Indigo Blue</option>
                  <option value="amber">Amber Gold</option>
                  <option value="emerald">Emerald Green</option>
                  <option value="purple">Royal Purple</option>
                  <option value="rose">Crimson Rose</option>
                  <option value="cyan">Ocean Cyan</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-persian-900 text-white font-bold p-3 rounded-lg text-sm hover:bg-persian-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editingCompanyId ? 'Update Company' : 'Register Company'}
                </button>
                {editingCompanyId && (
                  <button
                    type="button"
                    onClick={resetCompanyForm}
                    className="bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-lg text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 lg:col-span-2">
            <h3
              id={`${uid}-company-table-caption`}
              className="font-extrabold mb-5 text-sm uppercase text-slate-500"
            >
              Registered Client Directory ({companies.length})
            </h3>
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={`${uid}-company-table-caption`}
              className="table-region rounded-xl border border-slate-200"
            >
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">Company Name</th>
                    <th className="p-4">Contact Person</th>
                    <th className="p-4">Billing Address</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Styles</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                        No client companies registered yet.
                      </td>
                    </tr>
                  ) : (
                    companies.map((c) => {
                      const styleCount = styles.filter(
                        (s) =>
                          (s.clientId && s.clientId === c.id) ||
                          s.company.trim().toLowerCase() === c.name.trim().toLowerCase()
                      ).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <th scope="row" className="p-4 font-bold text-persian-900 bg-white">
                            {c.name}
                          </th>
                          <td className="p-4 text-slate-700">{c.contactPerson}</td>
                          <td className="p-4 text-slate-600 text-xs">{c.address || '-'}</td>
                          <td className="p-4 text-blue-600">{c.email || '-'}</td>
                          <td className="p-4 text-slate-600 font-mono">{c.phone || '-'}</td>
                          <td className="p-4 font-mono text-xs font-bold text-slate-500">
                            {styleCount} Styles
                          </td>
                          <td className="p-4 text-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditCompany(c)}
                              aria-label={`Edit ${c.name}`}
                              className="text-slate-500 hover:text-persian-600 p-1 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCompany(c)}
                              aria-label={`Delete ${c.name}`}
                              className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: MACHINE INVENTORY MASTER CRUD (style and other crud.html)
          ===================================================================== */}
      {subTab === 'machineCrud' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 lg:col-span-1 h-fit">
            <h3
              id={`${uid}-machine-form-title`}
              className="font-extrabold mb-5 text-sm uppercase text-slate-500 flex items-center gap-2"
            >
              <Cpu className="w-4 h-4 text-persian-600" />
              {editingMachineId ? 'Edit Machine' : 'Register Machine'}
            </h3>
            <form
              aria-labelledby={`${uid}-machine-form-title`}
              onSubmit={handleMachineSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor={`${uid}-mach-name`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Machine Identifier / Name *
                </label>
                <input
                  id={`${uid}-mach-name`}
                  name="machName"
                  type="text"
                  value={machName}
                  onChange={(e) => setMachName(e.target.value)}
                  placeholder="e.g. Machine 01"
                  maxLength={60}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={`${uid}-mach-heads`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Head Count *
                  </label>
                  <input
                    id={`${uid}-mach-heads`}
                    name="machHeads"
                    type="number"
                    min={1}
                    max={60}
                    value={machHeads}
                    onChange={(e) => setMachHeads(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${uid}-mach-speed`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Speed (SPM) *
                  </label>
                  <input
                    id={`${uid}-mach-speed`}
                    name="machSpeed"
                    type="number"
                    min={100}
                    max={3000}
                    value={machSpeed}
                    onChange={(e) =>
                      setMachSpeed(Math.max(100, parseInt(e.target.value, 10) || 100))
                    }
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${uid}-mach-brand`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Brand *
                </label>
                <input
                  id={`${uid}-mach-brand`}
                  name="machBrand"
                  type="text"
                  value={machBrand}
                  onChange={(e) => setMachBrand(e.target.value)}
                  placeholder="e.g. Tajima / Barudan"
                  maxLength={60}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none"
                />
              </div>

              <fieldset className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <legend className="text-xs font-bold text-slate-700 px-1">
                  Supported Embroidery Types *
                </legend>
                <div className="flex flex-wrap gap-4 mt-1.5">
                  {(['Normal', 'Chenille', 'Sequence'] as const).map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <input
                        id={`${uid}-mach-type-${type}`}
                        type="checkbox"
                        checked={machTypes.includes(type)}
                        onChange={() => toggleMachineType(type)}
                        className="w-4 h-4 accent-persian-600 rounded"
                      />
                      <label
                        htmlFor={`${uid}-mach-type-${type}`}
                        className="text-sm font-semibold text-slate-700 cursor-pointer"
                      >
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor={`${uid}-mach-status`}
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Operational Status *
                </label>
                <select
                  id={`${uid}-mach-status`}
                  name="machStatus"
                  value={machStatus}
                  onChange={(e) => setMachStatus(e.target.value as MachineOperationalStatus)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-persian-500 outline-none cursor-pointer"
                >
                  <option value="Active">Active (Running)</option>
                  <option value="Setup">Setup</option>
                  <option value="Maintenance">Maintenance (Idle)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-persian-900 text-white font-bold p-3 rounded-lg text-sm hover:bg-persian-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {editingMachineId ? 'Update Machine' : 'Save Machine'}
                </button>
                {editingMachineId && (
                  <button
                    type="button"
                    onClick={resetMachineForm}
                    className="bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 lg:col-span-2">
            <h3
              id={`${uid}-machine-table-caption`}
              className="font-extrabold mb-5 text-sm uppercase text-slate-500"
            >
              Registered Machine Inventory ({machines.length})
            </h3>
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={`${uid}-machine-table-caption`}
              className="table-region rounded-xl border border-slate-200"
            >
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">Machine Name</th>
                    <th className="p-4">Brand</th>
                    <th className="p-4">Heads</th>
                    <th className="p-4">Speed</th>
                    <th className="p-4">Capabilities</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {machines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                        No machines registered yet.
                      </td>
                    </tr>
                  ) : (
                    machines.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <th scope="row" className="p-4 font-bold text-slate-800 bg-white">
                          {m.name}
                        </th>
                        <td className="p-4 text-slate-600 font-semibold">{m.brand}</td>
                        <td className="p-4 text-slate-600 font-mono">{m.heads} Heads</td>
                        <td className="p-4 text-slate-600 font-mono">{m.speed} SPM</td>
                        <td className="p-4">
                          {m.embroideryTypes.map((t) => (
                            <span
                              key={t}
                              className="bg-persian-100 text-persian-800 px-2 py-0.5 rounded text-[10px] font-bold mr-1 inline-block"
                            >
                              {t}
                            </span>
                          ))}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                              m.status === 'Active'
                                ? 'text-emerald-700 bg-emerald-50'
                                : m.status === 'Setup'
                                ? 'text-amber-700 bg-amber-50'
                                : 'text-rose-700 bg-rose-50'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditMachine(m)}
                            aria-label={`Edit ${m.name}`}
                            className="text-slate-500 hover:text-persian-600 p-1 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4 inline" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMachine(m)}
                            aria-label={`Delete ${m.name}`}
                            className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          NATIVE <dialog> MODAL: MANAGE OR DUPLICATE PRODUCTION BLOCK
          ===================================================================== */}
      <dialog
        ref={dialogRef}
        aria-labelledby={`${uid}-modal-title`}
        {...({ closedby: 'any' } as Record<string, unknown>)}
        onClose={() => {
          if (dialogRef.current) dialogRef.current.returnValue = '';
          setEditingBlock(null);
          setModalMode('edit');
        }}
        className="m-auto rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-0 overflow-hidden bg-white text-slate-900"
      >
        {editingBlock && (
          <form onSubmit={handleUpdateBlockSubmit}>
            <div className="bg-persian-800 text-white p-4 flex items-center justify-between">
              <div>
                <h2
                  id={`${uid}-modal-title`}
                  className="font-bold text-sm flex items-center gap-2"
                >
                  {modalMode === 'duplicate' ? (
                    <>
                      <Copy className="w-4 h-4 text-emerald-300" />
                      Duplicate Production Block
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4 text-amber-400" />
                      Manage Production Block
                    </>
                  )}
                </h2>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  {modalMachineName || editingBlock.machineName} — {editingBlock.clientName} (
                  {editingBlock.date})
                </p>
              </div>
              <button
                type="button"
                onClick={closeManageBlockModal}
                aria-label="Close modal"
                className="w-7 h-7 rounded-lg bg-persian-900/60 text-blue-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-500 block text-[10px] uppercase">
                    Assigned Style
                  </span>
                  <span className="font-extrabold text-persian-800 truncate block">
                    {editingBlock.styleCode ? `${editingBlock.styleCode} — ` : ''}
                    {editingBlock.styleName}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-modal-machine`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Target Machine *
                  </label>
                  <select
                    id={`${uid}-modal-machine`}
                    value={modalMachineName}
                    onChange={(e) => {
                      const nextMacName = e.target.value;
                      setModalMachineName(nextMacName);
                      const nextMac = machines.find((m) => m.name === nextMacName);
                      const nextOp = getMachineAssignedOperator(nextMac);
                      const nextHelp = getMachineAssignedHelper(nextMac);
                      setModalOperator(nextOp);
                      setModalHelper(nextHelp);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-persian-800"
                  >
                    {machines.map((m) => {
                      const mOp = getMachineAssignedOperator(m);
                      return (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.heads}H) — {mOp || '⚠️ Assign Operator'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-modal-plan`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Plan Target Qty (Pcs) *
                  </label>
                  <input
                    id={`${uid}-modal-plan`}
                    type="number"
                    min={1}
                    max={500000}
                    autoFocus={modalMode === 'duplicate' || editingBlock.date >= todayStr}
                    value={modalPlanQtyInput}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setModalPlanQtyInput(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-extrabold font-mono text-persian-800 outline-none focus:border-persian-500"
                  />
                </div>
                <div>
                  {modalMode === 'duplicate' || editingBlock.date >= todayStr ? (
                    <>
                      <label
                        htmlFor={`${uid}-modal-actual`}
                        className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Actual Done Qty (Locked)</span>
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                        <span>0 (Fill Tomorrow / Pahuwada)</span>
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                    </>
                  ) : (
                    <>
                      <label
                        htmlFor={`${uid}-modal-actual`}
                        className={`block text-[10px] font-bold mb-1 ${
                          Number(modalActualQtyInput) <= 0 ? 'text-rose-700' : 'text-emerald-800'
                        }`}
                      >
                        {Number(modalActualQtyInput) <= 0
                          ? 'Actual Done Qty (Fill Now!) *'
                          : 'Actual Done Qty (Pcs) *'}
                      </label>
                      <input
                        id={`${uid}-modal-actual`}
                        type="number"
                        min={0}
                        max={500000}
                        autoFocus={modalMode === 'edit' && editingBlock.date < todayStr}
                        value={modalActualQtyInput}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setModalActualQtyInput(e.target.value)}
                        required
                        className={`w-full rounded-lg p-2 text-xs font-extrabold font-mono outline-none ${
                          Number(modalActualQtyInput) <= 0
                            ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200 focus:border-rose-600'
                            : 'bg-emerald-50 border border-emerald-300 text-emerald-800 focus:border-emerald-500'
                        }`}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-modal-start`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Start Hour
                  </label>
                  <select
                    id={`${uid}-modal-start`}
                    value={modalStartCol}
                    onChange={(e) => setModalStartCol(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                  >
                    {SHIFT_HOURS.map((h) => (
                      <option key={h.col} value={h.col}>
                        {h.label} ({h.short})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`${uid}-modal-end`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    End Hour
                  </label>
                  <select
                    id={`${uid}-modal-end`}
                    value={modalEndCol}
                    onChange={(e) => setModalEndCol(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                  >
                    {SHIFT_HOURS.map((h) => (
                      <option key={h.col} value={h.col}>
                        {h.endLabel} (End of {h.short})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-modal-size`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Garment Size *
                  </label>
                  <select
                    id={`${uid}-modal-size`}
                    value={modalSize}
                    onChange={(e) => setModalSize(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {editingBlockStyleSizes.length === 0 ? (
                      <option value={modalSize || ''}>
                        {modalSize || '-- Add Sizes in Style CRUD --'}
                      </option>
                    ) : (
                      editingBlockStyleSizes.map((sz) => (
                        <option key={sz.size} value={sz.size}>
                          {sz.size} ({sz.qty.toLocaleString()} Pcs)
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`${uid}-modal-part`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Part / Operation
                  </label>
                  <select
                    id={`${uid}-modal-part`}
                    value={modalPartName}
                    onChange={(e) => setModalPartName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {!editingBlockStyle || editingBlockStyle.parts.length === 0 ? (
                      <option value={modalPartName || 'Main Embroidery'}>
                        {modalPartName || 'Main Embroidery'}
                      </option>
                    ) : (
                      editingBlockStyle.parts.map((p, idx) => (
                        <option key={`${p.name}-${idx}`} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-modal-operator`}
                    className={`block text-[10px] font-bold mb-1 ${
                      !modalOperator ? 'text-rose-700' : 'text-slate-600'
                    }`}
                  >
                    Operator (Staff) *
                  </label>
                  <select
                    id={`${uid}-modal-operator`}
                    value={modalOperator}
                    onChange={(e) => setModalOperator(e.target.value)}
                    required
                    className={`w-full rounded-lg p-2 text-xs font-bold outline-none ${
                      !modalOperator
                        ? 'bg-rose-50 border-2 border-rose-400 text-rose-800'
                        : 'bg-slate-50 border border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">-- ⚠️ Assign Operator --</option>
                    {machineOperatorEmployees.map((emp) => {
                      const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                      const targetMac = machines.find(
                        (m) => m.name === (modalMachineName || editingBlock.machineName)
                      );
                      const usedInOtherMachine = findMachineWithEmployee(
                        label,
                        targetMac?.id,
                        modalMachineName || editingBlock.machineName
                      );
                      const isSameAsHelper = modalHelper === label;
                      const isDisabled = Boolean(usedInOtherMachine) || isSameAsHelper;
                      return (
                        <option key={emp.id} value={label} disabled={isDisabled}>
                          {label}
                          {usedInOtherMachine
                            ? ` (In ${usedInOtherMachine.name})`
                            : isSameAsHelper
                            ? ' (Helper)'
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`${uid}-modal-helper`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Helper
                  </label>
                  <select
                    id={`${uid}-modal-helper`}
                    value={modalHelper}
                    onChange={(e) => setModalHelper(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value="None">None</option>
                    {activeEmployees.map((emp) => {
                      const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                      const targetMac = machines.find(
                        (m) => m.name === (modalMachineName || editingBlock.machineName)
                      );
                      const usedInOtherMachine = findMachineWithEmployee(
                        label,
                        targetMac?.id,
                        modalMachineName || editingBlock.machineName
                      );
                      const isSameAsOperator = modalOperator === label;
                      const isDisabled = Boolean(usedInOtherMachine) || isSameAsOperator;
                      return (
                        <option key={emp.id} value={label} disabled={isDisabled}>
                          {label}
                          {usedInOtherMachine
                            ? ` (In ${usedInOtherMachine.name})`
                            : isSameAsOperator
                            ? ' (Operator)'
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {modalMode === 'duplicate' ? (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeManageBlockModal}
                    disabled={isSubmitting}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Create Duplicate Block
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDeleteBlock}
                    disabled={isSubmitting}
                    className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => openManageBlockModal(editingBlock, 'duplicate')}
                    disabled={isSubmitting}
                    className="px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Update &amp; Save
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
