'use client';

import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import {
  ProductionBundle,
  StyleMasterEntity,
  StyleSizeItem,
} from '@/actions/production';
import {
  QualityBundle,
  QualityCheckerStationEntity,
  QualityBlockEntity,
  QualityDeliveryTargetEntity,
  assignCheckerEmployeeAction,
  saveCheckerStationAction,
  saveQualityBlockAction,
  deleteQualityBlockAction,
  saveQualityDeliveryTargetAction,
} from '@/actions/quality';
import {
  ClipboardCheck,
  Calendar,
  Monitor,
  CheckCircle2,
  Users,
  PlusCircle,
  Layers,
  Pencil,
  Trash2,
  Share2,
  Sun,
  Moon,
  Eye,
  AlertCircle,
  AlertTriangle,
  X,
  UserCheck,
  Search,
  RotateCcw,
  Copy,
  GripVertical,
  Lock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Truck,
  Printer,
} from 'lucide-react';

interface QualityManagementProps {
  employees: EmployeeEntity[];
  productionBundle: ProductionBundle;
  initialQualityBundle: QualityBundle;
  onQualityBundleChange?: (bundle: QualityBundle) => void;
  externalSubTab?: QualitySubTab;
}

export type QualitySubTab =
  | 'checkingEditor'
  | 'deliveryPlan'
  | 'floorDisplay'
  | 'doneStyles'
  | 'checkerCrud';

function addDaysIso(isoDate: string, deltaDays: number): string {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const y = parseInt(yStr, 10) || new Date().getFullYear();
  const m = parseInt(mStr, 10) || 1;
  const d = parseInt(dStr, 10) || 1;
  const dt = new Date(y, m - 1, d + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

function formatShortDateMeta(isoDate: string): { weekday: string; dayMonth: string } {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const y = parseInt(yStr, 10) || new Date().getFullYear();
  const m = parseInt(mStr, 10) || 1;
  const d = parseInt(dStr, 10) || 1;
  const dt = new Date(y, m - 1, d);
  return {
    weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }),
    dayMonth: dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
  };
}

const SHIFT_HOURS = [
  { col: 1, value: '08:00', label: '08:00 AM', short: 'H1' },
  { col: 2, value: '09:00', label: '09:00 AM', short: 'H2' },
  { col: 3, value: '10:00', label: '10:00 AM', short: 'H3' },
  { col: 4, value: '11:00', label: '11:00 AM', short: 'H4' },
  { col: 5, value: '12:00', label: '12:00 PM', short: 'H5' },
  { col: 6, value: '13:00', label: '01:00 PM', short: 'H6' },
  { col: 7, value: '14:00', label: '02:00 PM', short: 'H7' },
  { col: 8, value: '15:00', label: '03:00 PM', short: 'H8' },
  { col: 9, value: '16:00', label: '04:00 PM', short: 'H9' },
  { col: 10, value: '17:00', label: '05:00 PM', short: 'H10' },
  { col: 11, value: '18:00', label: '06:00 PM', short: 'H11' },
];

const DEFAULT_CHECKER_SLOT_NAMES = Array.from(
  { length: 12 },
  (_, idx) => `Checker ${String(idx + 1).padStart(2, '0')}`
);

const CLIENT_COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string; tag: string; badge: string }
> = {
  indigo: {
    bg: 'bg-indigo-50/95',
    text: 'text-indigo-950',
    border: 'border-indigo-300',
    tag: 'bg-indigo-600',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  amber: {
    bg: 'bg-amber-50/95',
    text: 'text-amber-950',
    border: 'border-amber-300',
    tag: 'bg-amber-600',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  emerald: {
    bg: 'bg-emerald-50/95',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
    tag: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  purple: {
    bg: 'bg-purple-50/95',
    text: 'text-purple-950',
    border: 'border-purple-300',
    tag: 'bg-purple-600',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  rose: {
    bg: 'bg-rose-50/95',
    text: 'text-rose-950',
    border: 'border-rose-300',
    tag: 'bg-rose-600',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  cyan: {
    bg: 'bg-cyan-50/95',
    text: 'text-cyan-950',
    border: 'border-cyan-300',
    tag: 'bg-cyan-600',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  blue: {
    bg: 'bg-blue-50/95',
    text: 'text-blue-950',
    border: 'border-blue-300',
    tag: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export function QualityManagement({
  employees,
  productionBundle,
  initialQualityBundle,
  onQualityBundleChange,
  externalSubTab,
}: QualityManagementProps) {
  const uid = useId();
  const [subTab, setSubTab] = useState<QualitySubTab>(externalSubTab || 'checkingEditor');

  useEffect(() => {
    if (externalSubTab) setSubTab(externalSubTab);
  }, [externalSubTab]);
  const [isFloorFullscreen, setIsFloorFullscreen] = useState(false);
  const floorDisplayContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleBrowserFloorFullscreen = async () => {
    try {
      if (!document.fullscreenElement && floorDisplayContainerRef.current) {
        await floorDisplayContainerRef.current.requestFullscreen();
        setIsFloorFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFloorFullscreen(false);
      } else {
        setIsFloorFullscreen((prev) => !prev);
      }
    } catch {
      setIsFloorFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      if (document.fullscreenElement) {
        setIsFloorFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const [checkers, setCheckers] = useState<QualityCheckerStationEntity[]>(
    initialQualityBundle.checkers
  );
  const [blocks, setBlocks] = useState<QualityBlockEntity[]>(initialQualityBundle.blocks);
  const [deliveryTargets, setDeliveryTargets] = useState<QualityDeliveryTargetEntity[]>(
    initialQualityBundle.deliveryTargets
  );

  // Sync up to parent when local state changes
  useEffect(() => {
    onQualityBundleChange?.({ checkers, blocks, deliveryTargets });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkers, blocks, deliveryTargets]);

  const companies = productionBundle.companies;
  const styles = productionBundle.styles;

  // Feedback toast & validation banner
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showSuccess = (msg: string) => {
    setErrorMsg(null);
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const showError = (msg: string) => {
    setToastMsg(null);
    setErrorMsg(msg);
  };

  // Live clock
  const [liveTimeStr, setLiveTimeStr] = useState<string>('');
  const [todayStr] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  });

  useEffect(() => {
    const updateClock = () => {
      setLiveTimeStr(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive !== false),
    [employees]
  );

  const checkerEmployees = useMemo(
    () =>
      activeEmployees.filter((e) => {
        const role = (e.role || '').toLowerCase();
        const dept = (e.department || '').toLowerCase();
        return (
          role.includes('checker') ||
          role.includes('quality') ||
          dept.includes('quality') ||
          dept.includes('qc') ||
          dept.includes('checking')
        );
      }),
    [activeEmployees]
  );

  const resolveRealEmployeeLabel = (rawName: string | undefined | null): string => {
    const trimmed = (rawName || '').trim();
    if (!trimmed || trimmed === 'None' || trimmed === 'Unassigned') return '';
    const exact = activeEmployees.find(
      (emp) => `EPF #${emp.epfNo} - ${emp.fullName}` === trimmed
    );
    if (exact) return `EPF #${exact.epfNo} - ${exact.fullName}`;

    const epfMatch = trimmed.match(/^EPF\s*#(\d+)/i);
    if (epfMatch) {
      const epfNum = parseInt(epfMatch[1], 10);
      const byEpf = activeEmployees.find((emp) => emp.epfNo === epfNum);
      if (byEpf) return `EPF #${byEpf.epfNo} - ${byEpf.fullName}`;
    }

    const byName = activeEmployees.find(
      (emp) => emp.fullName.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (byName) return `EPF #${byName.epfNo} - ${byName.fullName}`;
    return '';
  };

  const checkerSlots = useMemo<QualityCheckerStationEntity[]>(() => {
    return DEFAULT_CHECKER_SLOT_NAMES.map((slotName, idx) => {
      const slotNum = idx + 1;
      const existing =
        checkers.find((st) => st.name.trim().toLowerCase() === slotName.toLowerCase()) ||
        checkers.find((st) => st.stationNumber === slotNum);
      if (existing) {
        return {
          ...existing,
          name: slotName,
          stationNumber: slotNum,
          status: existing.status || 'Active',
        };
      }
      return {
        id: `slot-${String(slotNum).padStart(2, '0')}`,
        stationNumber: slotNum,
        name: slotName,
        employeeName: '',
        status: 'Active',
        isActive: true,
      };
    });
  }, [checkers]);

  const getStationAssignedChecker = (st: QualityCheckerStationEntity | undefined | null): string => {
    if (!st) return '';
    return resolveRealEmployeeLabel(st.employeeName);
  };

  const findStationWithEmployee = (
    empLabelRaw: string | undefined | null,
    excludeStationId?: string | null,
    excludeStationName?: string | null
  ): QualityCheckerStationEntity | undefined => {
    const resolved = resolveRealEmployeeLabel(empLabelRaw);
    if (!resolved) return undefined;
    const normExcludeName = (excludeStationName || '').trim().toLowerCase();

    return checkerSlots.find((st) => {
      if (excludeStationId && st.id === excludeStationId) return false;
      if (normExcludeName && st.name.trim().toLowerCase() === normExcludeName) return false;
      const stEmp = getStationAssignedChecker(st);
      return stEmp === resolved;
    });
  };

  const getEmployeeCheckerStation = (emp: EmployeeEntity): QualityCheckerStationEntity | undefined => {
    const empLabel = `EPF #${emp.epfNo} - ${emp.fullName}`;
    return findStationWithEmployee(empLabel);
  };

  const getCompanyColor = (companyName: string) => {
    const matched = companies.find(
      (c) => c.name.toLowerCase() === companyName.trim().toLowerCase()
    );
    const scheme = matched?.colorScheme || 'indigo';
    return CLIENT_COLOR_MAP[scheme] || CLIENT_COLOR_MAP.indigo;
  };

  // ============================================================================
  // 1. CHECKER SLOTS STAFF ASSIGNMENT HANDLER
  // ============================================================================
  const handleQuickAssignStationEmployee = async (
    st: QualityCheckerStationEntity,
    nextEmpRaw: string
  ) => {
    const validEmp = resolveRealEmployeeLabel(nextEmpRaw);
    if (validEmp) {
      const conflictSt = findStationWithEmployee(validEmp, st.id, st.name);
      if (conflictSt) {
        showError(
          `${validEmp} danatamath ${conflictSt.name} ekata assign karala thiyenne! Checkersla duplicate wenna ba.`
        );
        return;
      }
    }

    const isVirtualSlot = st.id.startsWith('slot-');
    const prevEmp = st.employeeName;

    if (!isVirtualSlot) {
      setCheckers((prev) =>
        prev.map((item) => (item.id === st.id ? { ...item, employeeName: validEmp } : item))
      );
    }
    if (planStationName === st.name) {
      setPlanCheckerEmp(validEmp);
    }

    const res = isVirtualSlot
      ? await saveCheckerStationAction({
          name: st.name,
          status: 'Active',
          employeeName: validEmp,
        })
      : await assignCheckerEmployeeAction(st.id, validEmp);

    if (!res.success || !res.checker) {
      if (!isVirtualSlot) {
        setCheckers((prev) =>
          prev.map((item) => (item.id === st.id ? { ...item, employeeName: prevEmp } : item))
        );
      }
      showError(res.error || `Failed to assign staff to ${st.name}.`);
      return;
    }

    const savedChecker = res.checker;
    setCheckers((prev) => {
      const exists = prev.some((item) => item.id === savedChecker.id);
      return exists
        ? prev.map((item) => (item.id === savedChecker.id ? savedChecker : item))
        : [...prev, savedChecker];
    });
    if (validEmp) {
      setBlocks((prev) =>
        prev.map((b) =>
          (b.stationId === savedChecker.id || b.stationName === st.name) && b.date >= todayStr
            ? { ...b, checkerName: validEmp }
            : b
        )
      );
    }
    showSuccess(
      validEmp
        ? `Assigned ${validEmp} to ${st.name}.`
        : `Cleared staff assignment for ${st.name} (slot remains ready for scheduling).`
    );
  };

  // ============================================================================
  // 2. CHECKING PLAN EDITOR & GANTT MATRIX STATE & HANDLERS
  // ============================================================================
  const [planDate, setPlanDate] = useState(todayStr);
  const [scheduleDate, setScheduleDate] = useState(todayStr);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => todayStr.slice(0, 7));
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);
  const [planShift, setPlanShift] = useState<'day' | 'night'>('day');
  const [planStationName, setPlanStationName] = useState(DEFAULT_CHECKER_SLOT_NAMES[0]);
  const [planCompany, setPlanCompany] = useState('');
  const [planStyleId, setPlanStyleId] = useState('');
  const [planSize, setPlanSize] = useState('Free Size');
  const [planStartTime, setPlanStartTime] = useState('08:00');
  const [planEndTime, setPlanEndTime] = useState('18:00');
  const [planQty, setPlanQty] = useState<number>(300);
  const [planCheckerEmp, setPlanCheckerEmp] = useState('');

  // Inline Click-to-Type Today Delivery Qty on 4-Box Style Summary Cards
  const [editingDeliveryStyleId, setEditingDeliveryStyleId] = useState<string | null>(null);
  const [editingDeliveryValue, setEditingDeliveryValue] = useState<string>('');

  // Daily Style-Wise Delivery Plan Table State
  const [deliveryPlanStartDate, setDeliveryPlanStartDate] = useState<string>(todayStr);
  const [deliveryPlanDays, setDeliveryPlanDays] = useState<7 | 10 | 14>(7);
  const [deliveryPlanCompanyFilter, setDeliveryPlanCompanyFilter] = useState<string>('ALL');
  const [deliveryPlanSearch, setDeliveryPlanSearch] = useState<string>('');
  const [deliveryPlanIncludeDone, setDeliveryPlanIncludeDone] = useState<boolean>(false);
  const [deliveryDraftMap, setDeliveryDraftMap] = useState<Record<string, string>>({});
  const [savingDeliveryCellKey, setSavingDeliveryCellKey] = useState<string | null>(null);

  // Delivery vs Plan Qty Confirmation Alert Dialog (<dialog>)
  const deliveryAlertDialogRef = useRef<HTMLDialogElement | null>(null);
  const [pendingDeliveryAlert, setPendingDeliveryAlert] = useState<
    | {
        kind: 'delivery';
        style: StyleMasterEntity;
        date: string;
        nextDeliveryQty: number;
        dayPlanQty: number;
        draftKey?: string;
      }
    | {
        kind: 'schedule';
        style: StyleMasterEntity;
        date: string;
        newDayPlanTotal: number;
        dayDeliveryQty: number;
        onConfirm: () => Promise<void>;
      }
    | null
  >(null);

  // Done Checked Styles Tab Filters
  const [doneSearchQuery, setDoneSearchQuery] = useState('');
  const [doneCompanyFilter, setDoneCompanyFilter] = useState('ALL');
  const [doneFabricFilter, setDoneFabricFilter] = useState('ALL');
  const [doneSizeFilter, setDoneSizeFilter] = useState('ALL');
  const [doneDateFrom, setDoneDateFrom] = useState('');
  const [doneDateTo, setDoneDateTo] = useState('');

  // Native <dialog> Manage / Duplicate Block Modal state
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingBlock, setEditingBlock] = useState<QualityBlockEntity | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'duplicate'>('edit');
  const [modalStationName, setModalStationName] = useState<string>('');
  const [modalPlanQtyInput, setModalPlanQtyInput] = useState<string>('0');
  const [modalActualQtyInput, setModalActualQtyInput] = useState<string>('0');
  const [modalDefectQtyInput, setModalDefectQtyInput] = useState<string>('0');
  const [modalSize, setModalSize] = useState('Free Size');
  const [modalCheckerEmp, setModalCheckerEmp] = useState('');
  const [modalStartCol, setModalStartCol] = useState<number>(1);
  const [modalEndCol, setModalEndCol] = useState<number>(11);

  // Inline Click-to-Type Plan / Actual Qty on Gantt Matrix blocks
  const [inlineEditBlockId, setInlineEditBlockId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<'plan' | 'actual' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  // Drag & Drop ("Adala Danna" — Move Only) state
  const [draggingBlock, setDraggingBlock] = useState<QualityBlockEntity | null>(null);
  const [dragGrabOffsetHours, setDragGrabOffsetHours] = useState<number>(0);
  const [dragOverStationName, setDragOverStationName] = useState<string | null>(null);
  const [dragOverStartCol, setDragOverStartCol] = useState<number | null>(null);

  // Bar Edge Resize ("Konen Allala Length Control + Time Auto Adjust") state
  const [resizingBlock, setResizingBlock] = useState<{
    block: QualityBlockEntity;
    edge: 'start' | 'end';
    trackLeft: number;
    trackWidth: number;
    previewStartHour: number;
    previewSpanHours: number;
  } | null>(null);
  const resizingBlockRef = useRef<{
    block: QualityBlockEntity;
    edge: 'start' | 'end';
    trackLeft: number;
    trackWidth: number;
    previewStartHour: number;
    previewSpanHours: number;
  } | null>(null);
  const suppressNextBlockClickRef = useRef<boolean>(false);

  // Light-dismiss fallback for <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent, dlg: HTMLDialogElement) => {
        const r = dlg.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = outside(e, dialog);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e, dialog)) {
          dialog.close();
        }
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      return () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, []);

  // Sync default station & company dropdowns
  useEffect(() => {
    if (!planStationName && checkerSlots.length > 0) {
      setPlanStationName(checkerSlots[0].name);
    } else if (planStationName && !checkerSlots.some((c) => c.name === planStationName)) {
      setPlanStationName(checkerSlots[0]?.name || DEFAULT_CHECKER_SLOT_NAMES[0]);
    }
  }, [checkerSlots, planStationName]);

  useEffect(() => {
    if (!planCompany && companies.length > 0) {
      setPlanCompany(companies[0].name);
    } else if (planCompany && !companies.some((c) => c.name === planCompany)) {
      setPlanCompany(companies[0]?.name || '');
    }
  }, [companies, planCompany]);

  // Helper to get exact-date Delivery Qty for a style on targetDate
  const getDeliveryTargetForStyle = (style: StyleMasterEntity, targetDate: string): number => {
    const exactDateTarget = deliveryTargets.find(
      (t) =>
        t.date === targetDate &&
        ((t.styleId && t.styleId === style.id) ||
          t.styleName.trim().toLowerCase() === style.name.trim().toLowerCase())
    );
    return exactDateTarget ? exactDateTarget.deliveryQty : 0;
  };

  // Helper to get exact-date Planned Checking Qty for a style on targetDate
  const getStyleDatePlanQty = (style: StyleMasterEntity, targetDate: string): number => {
    return blocks
      .filter((b) => {
        if (b.date !== targetDate) return false;
        return (
          (b.styleId && b.styleId === style.id) ||
          (b.styleCode && style.code && b.styleCode === style.code) ||
          b.styleName.trim().toLowerCase() === style.name.trim().toLowerCase()
        );
      })
      .reduce((sum, b) => sum + b.planQty, 0);
  };

  // Helper to get All-Dates Total Planned Delivery Qty for a style
  const getStyleTotalDeliveryPlanned = (style: StyleMasterEntity): number => {
    return deliveryTargets
      .filter(
        (t) =>
          (t.styleId && t.styleId === style.id) ||
          t.styleName.trim().toLowerCase() === style.name.trim().toLowerCase()
      )
      .reduce((sum, t) => sum + t.deliveryQty, 0);
  };

  // Aggregate Per-Style Checking Metrics across ALL quality blocks
  const styleQualityMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        style: StyleMasterEntity;
        orderQty: number;
        plannedCheckingQty: number;
        todayPlanQty: number;
        actualDoneQty: number;
        defectQty: number;
        remainingQty: number;
        todayDeliveryQty: number;
        lastCheckDate: string;
        isDone: boolean;
      }
    >();

    for (const s of styles) {
      map.set(s.id, {
        style: s,
        orderQty: s.qty,
        plannedCheckingQty: 0,
        todayPlanQty: 0,
        actualDoneQty: 0,
        defectQty: 0,
        remainingQty: s.qty,
        todayDeliveryQty: getDeliveryTargetForStyle(s, planDate),
        lastCheckDate: s.completedAt ? s.completedAt.split('T')[0] : '',
        isDone: false,
      });
    }

    for (const b of blocks) {
      const matched =
        (b.styleId && map.get(b.styleId)) ||
        Array.from(map.values()).find(
          (item) =>
            (b.styleCode && item.style.code === b.styleCode) ||
            item.style.name.trim().toLowerCase() === b.styleName.trim().toLowerCase()
        );
      if (matched) {
        matched.plannedCheckingQty += b.planQty;
        if (b.date === planDate) {
          matched.todayPlanQty += b.planQty;
        }
        matched.actualDoneQty += b.actualQty;
        matched.defectQty += b.defectQty || 0;
        matched.remainingQty = Math.max(0, matched.orderQty - matched.actualDoneQty);
        if (!matched.lastCheckDate || b.date > matched.lastCheckDate) {
          matched.lastCheckDate = b.date;
        }
      }
    }

    for (const item of map.values()) {
      if (item.orderQty > 0 && item.actualDoneQty >= item.orderQty) {
        item.isDone = true;
      }
    }

    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styles, blocks, deliveryTargets, planDate]);

  const activeStylesMetrics = useMemo(
    () => styleQualityMetricsMap.filter((item) => !item.isDone),
    [styleQualityMetricsMap]
  );

  const doneStylesMetrics = useMemo(
    () => styleQualityMetricsMap.filter((item) => item.isDone),
    [styleQualityMetricsMap]
  );

  const allAvailableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const s of styles) {
      if (s.sizeBreakdown) {
        for (const sz of s.sizeBreakdown) {
          if (sz.size && sz.size.trim()) set.add(sz.size.trim());
        }
      }
    }
    for (const b of blocks) {
      if (b.size && b.size.trim()) set.add(b.size.trim());
    }
    return Array.from(set);
  }, [styles, blocks]);

  const filteredDoneStylesMetrics = useMemo(() => {
    return doneStylesMetrics.filter((item) => {
      const { style, lastCheckDate } = item;
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
            : blocks.some(
                (b) =>
                  (b.styleId === style.id || b.styleName === style.name) &&
                  b.size === doneSizeFilter
              );
        if (!hasSize) return false;
      }
      if (doneSearchQuery.trim()) {
        const q = doneSearchQuery.trim().toLowerCase();
        const matchesCode = style.code.toLowerCase().includes(q);
        const matchesName = style.name.toLowerCase().includes(q);
        const matchesCompany = style.company.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesCompany) return false;
      }
      if (doneDateFrom && lastCheckDate && lastCheckDate < doneDateFrom) return false;
      if (doneDateTo && lastCheckDate && lastCheckDate > doneDateTo) return false;
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
    blocks,
  ]);

  const activeStyleIdsSet = useMemo(
    () => new Set(activeStylesMetrics.map((m) => m.style.id)),
    [activeStylesMetrics]
  );

  // Filter styles by selected Company
  const companyFilteredStyles = useMemo(() => {
    if (!planCompany) return [];
    const targetCompany = planCompany.trim().toLowerCase();
    const selectedClient = companies.find(
      (c) => c.name.trim().toLowerCase() === targetCompany
    );
    return styles.filter((s) => {
      if (!activeStyleIdsSet.has(s.id)) return false;
      if (selectedClient && s.clientId && s.clientId === selectedClient.id) return true;
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
    return [];
  }, [selectedPlanStyle]);

  useEffect(() => {
    if (selectedPlanStyle) {
      if (selectedPlanStyleSizes.length > 0) {
        setPlanSize((prev) =>
          selectedPlanStyleSizes.some((sz) => sz.size === prev)
            ? prev
            : selectedPlanStyleSizes[0].size
        );
      } else {
        setPlanSize('Free Size');
      }
    } else {
      setPlanSize('Free Size');
    }
  }, [selectedPlanStyle, selectedPlanStyleSizes]);

  // Sync Checker Employee in form to the selected Checker Slot's assigned employee (if any)
  useEffect(() => {
    const selectedSt = checkerSlots.find((c) => c.name === planStationName);
    const stEmp = getStationAssignedChecker(selectedSt);
    setPlanCheckerEmp(stEmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planStationName, checkerSlots, activeEmployees]);

  // Filtered blocks for currently selected Date & Shift
  const activeDateShiftBlocks = useMemo(
    () => blocks.filter((b) => b.date === planDate && b.shift === planShift),
    [blocks, planDate, planShift]
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

  // Per-date status summary so Calendar highlights past dates needing Actual Checked Qty in RED
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

    for (const b of blocks) {
      const existing = map.get(b.date) || {
        date: b.date,
        totalBlocks: 0,
        pendingActualBlocks: 0,
        filledActualBlocks: 0,
        totalPlan: 0,
        totalActual: 0,
      };
      existing.totalBlocks += 1;
      existing.totalPlan += b.planQty;
      existing.totalActual += b.actualQty;
      if (b.actualQty <= 0) {
        existing.pendingActualBlocks += 1;
      } else {
        existing.filledActualBlocks += 1;
      }
      map.set(b.date, existing);
    }

    return map;
  }, [blocks]);

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
      const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
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

  // ============================================================================
  // TODAY DELIVERY QTY & DAILY DELIVERY PLAN SAVE + STRICT ALERT RULE
  // ============================================================================
  const deliveryPlanDates = useMemo(() => {
    const start = deliveryPlanStartDate || todayStr;
    return Array.from({ length: deliveryPlanDays }, (_, idx) => addDaysIso(start, idx));
  }, [deliveryPlanStartDate, deliveryPlanDays, todayStr]);

  const filteredDeliveryPlanRows = useMemo(() => {
    const base = deliveryPlanIncludeDone ? styleQualityMetricsMap : activeStylesMetrics;
    const q = deliveryPlanSearch.trim().toLowerCase();
    return base.filter((item) => {
      if (deliveryPlanCompanyFilter !== 'ALL') {
        if (
          item.style.company.trim().toLowerCase() !==
          deliveryPlanCompanyFilter.trim().toLowerCase()
        ) {
          return false;
        }
      }
      if (q) {
        const matchesCode = item.style.code.toLowerCase().includes(q);
        const matchesName = item.style.name.toLowerCase().includes(q);
        const matchesCompany = item.style.company.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesCompany) return false;
      }
      return true;
    });
  }, [
    deliveryPlanIncludeDone,
    styleQualityMetricsMap,
    activeStylesMetrics,
    deliveryPlanCompanyFilter,
    deliveryPlanSearch,
  ]);

  const clearDeliveryDraftKey = (draftKey?: string) => {
    if (!draftKey) return;
    setDeliveryDraftMap((prev) => {
      if (!(draftKey in prev)) return prev;
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  const closeDeliveryAlertDialog = (revertDraft = true) => {
    if (revertDraft && pendingDeliveryAlert?.kind === 'delivery' && pendingDeliveryAlert.draftKey) {
      clearDeliveryDraftKey(pendingDeliveryAlert.draftKey);
    }
    if (deliveryAlertDialogRef.current && deliveryAlertDialogRef.current.open) {
      deliveryAlertDialogRef.current.close();
    }
    setPendingDeliveryAlert(null);
  };

  const executeSaveDeliveryQty = async (
    style: StyleMasterEntity,
    targetDate: string,
    parsed: number,
    draftKey?: string
  ) => {
    if (draftKey) setSavingDeliveryCellKey(draftKey);
    const res = await saveQualityDeliveryTargetAction({
      styleId: style.id,
      styleName: style.name,
      date: targetDate,
      deliveryQty: parsed,
    });
    if (draftKey) setSavingDeliveryCellKey(null);

    if (!res.success || !res.target) {
      clearDeliveryDraftKey(draftKey);
      showError(res.error || 'Failed to save Delivery Qty.');
      return;
    }

    const saved = res.target;
    setDeliveryTargets((prev) => {
      const idx = prev.findIndex(
        (t) =>
          t.date === saved.date &&
          t.styleName.trim().toLowerCase() === saved.styleName.trim().toLowerCase()
      );
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = saved;
        return clone;
      }
      return [saved, ...prev];
    });
    clearDeliveryDraftKey(draftKey);
    showSuccess(
      `Updated Delivery Qty for "${style.code ? `${style.code} — ` : ''}${
        style.name
      }" on ${targetDate} to ${saved.deliveryQty.toLocaleString()} Pcs.`
    );
  };

  const requestSaveDeliveryQty = async (
    style: StyleMasterEntity,
    targetDate: string,
    parsed: number,
    draftKey?: string
  ) => {
    if (style.qty > 0 && parsed > style.qty) {
      clearDeliveryDraftKey(draftKey);
      showError(
        `Delivery Qty (${parsed.toLocaleString()} Pcs) cannot exceed Total Order Qty (${style.qty.toLocaleString()} Pcs).`
      );
      return;
    }

    const existingVal = getDeliveryTargetForStyle(style, targetDate);
    if (parsed === existingVal) {
      clearDeliveryDraftKey(draftKey);
      return;
    }

    const dayPlanQty = getStyleDatePlanQty(style, targetDate);
    if (dayPlanQty > 0 && parsed <= dayPlanQty) {
      setPendingDeliveryAlert({
        kind: 'delivery',
        style,
        date: targetDate,
        nextDeliveryQty: parsed,
        dayPlanQty,
        draftKey,
      });
      if (deliveryAlertDialogRef.current && !deliveryAlertDialogRef.current.open) {
        deliveryAlertDialogRef.current.showModal();
      }
      return;
    }

    await executeSaveDeliveryQty(style, targetDate, parsed, draftKey);
  };

  const confirmDeliveryAlertDialog = async () => {
    const alertState = pendingDeliveryAlert;
    if (!alertState) return;
    if (deliveryAlertDialogRef.current && deliveryAlertDialogRef.current.open) {
      deliveryAlertDialogRef.current.close();
    }
    setPendingDeliveryAlert(null);

    if (alertState.kind === 'delivery') {
      await executeSaveDeliveryQty(
        alertState.style,
        alertState.date,
        alertState.nextDeliveryQty,
        alertState.draftKey
      );
    } else if (alertState.kind === 'schedule') {
      await alertState.onConfirm();
    }
  };

  const startEditingDeliveryQty = (style: StyleMasterEntity, currentVal: number) => {
    setEditingDeliveryStyleId(style.id);
    setEditingDeliveryValue(String(currentVal));
  };

  const commitDeliveryQty = async (style: StyleMasterEntity) => {
    if (editingDeliveryStyleId !== style.id) return;
    const parsed = Math.max(0, parseInt(editingDeliveryValue.trim(), 10) || 0);
    setEditingDeliveryStyleId(null);
    await requestSaveDeliveryQty(style, planDate, parsed);
  };

  const commitDeliveryPlanCell = async (style: StyleMasterEntity, targetDate: string) => {
    const draftKey = `${style.id}::${targetDate}`;
    if (!(draftKey in deliveryDraftMap)) return;
    const raw = (deliveryDraftMap[draftKey] ?? '').trim();
    const parsed = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
    await requestSaveDeliveryQty(style, targetDate, parsed, draftKey);
  };

  // ============================================================================
  // SCHEDULE QUALITY CHECKING BLOCK SUBMIT
  // ============================================================================
  const getStyleCheckingPlannedTotal = (
    style: StyleMasterEntity | null | undefined,
    excludeBlockId?: string
  ): number => {
    if (!style) return 0;
    return blocks
      .filter((b) => {
        if (excludeBlockId && b.id === excludeBlockId) return false;
        return (
          (b.styleId && b.styleId === style.id) ||
          (b.styleCode && style.code && b.styleCode === style.code) ||
          b.styleName.trim().toLowerCase() === style.name.trim().toLowerCase()
        );
      })
      .reduce((sum, b) => sum + b.planQty, 0);
  };

  const getSizeCheckingPlannedTotal = (
    style: StyleMasterEntity | null | undefined,
    sizeName: string,
    excludeBlockId?: string
  ): number => {
    if (!style || !sizeName) return 0;
    const normSize = sizeName.trim().toLowerCase();
    return blocks
      .filter((b) => {
        if (excludeBlockId && b.id === excludeBlockId) return false;
        const matchesStyle =
          (b.styleId && b.styleId === style.id) ||
          (b.styleCode && style.code && b.styleCode === style.code) ||
          b.styleName.trim().toLowerCase() === style.name.trim().toLowerCase();
        return matchesStyle && b.size.trim().toLowerCase() === normSize;
      })
      .reduce((sum, b) => sum + b.planQty, 0);
  };

  const selectedPlanSizeMeta = useMemo(() => {
    if (!selectedPlanStyle) return null;
    const styleOrderQty = selectedPlanStyle.qty || 0;
    const styleAlreadyPlanned = getStyleCheckingPlannedTotal(selectedPlanStyle);
    const styleRemainingToPlan = Math.max(0, styleOrderQty - styleAlreadyPlanned);

    const matchedSizeObj = selectedPlanStyleSizes.find(
      (sz) => sz.size.trim().toLowerCase() === planSize.trim().toLowerCase()
    );
    const sizeOrderQty = matchedSizeObj ? matchedSizeObj.qty : styleOrderQty;
    const sizeAlreadyPlanned = matchedSizeObj
      ? getSizeCheckingPlannedTotal(selectedPlanStyle, matchedSizeObj.size)
      : styleAlreadyPlanned;
    const sizeRemainingToPlan = Math.max(0, sizeOrderQty - sizeAlreadyPlanned);

    return {
      styleOrderQty,
      styleAlreadyPlanned,
      styleRemainingToPlan,
      hasSizeBreakdown: Boolean(matchedSizeObj),
      sizeName: matchedSizeObj?.size || planSize || 'Free Size',
      sizeOrderQty,
      sizeAlreadyPlanned,
      sizeRemainingToPlan,
      maxAllowedForInput: Math.min(styleRemainingToPlan, sizeRemainingToPlan),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanStyle, selectedPlanStyleSizes, planSize, blocks]);

  const handleScheduleCheckingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (scheduleDate < todayStr) {
      showError('You can only schedule new checking plans for Today or Future dates.');
      return;
    }
    if (!planStationName) {
      showError('Please select a Checker Slot first.');
      return;
    }
    const matchedStation = checkerSlots.find((c) => c.name === planStationName);
    const validSelectedChecker =
      resolveRealEmployeeLabel(planCheckerEmp) || getStationAssignedChecker(matchedStation);

    if (validSelectedChecker) {
      const conflictSt = findStationWithEmployee(
        validSelectedChecker,
        matchedStation?.id,
        planStationName
      );
      if (conflictSt) {
        showError(
          `${validSelectedChecker} danatamath ${conflictSt.name} ekata assign karala thiyenne! Checkersla duplicate wenna ba.`
        );
        return;
      }
    }

    if (!selectedPlanStyle) {
      showError('Please register and select a Style in Style Master first.');
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

    // Check overlapping hours on the same Checker Station, scheduleDate, and shift
    const stationBlocks = blocks.filter(
      (b) =>
        b.date === scheduleDate &&
        b.shift === planShift &&
        b.stationName === planStationName
    );
    const overlap = stationBlocks.find((existing) => {
      const exStart = existing.startHour;
      const exEnd = existing.startHour + existing.spanHours - 1;
      return startCol <= exEnd && endCol >= exStart;
    });

    if (overlap) {
      showError(
        `${planStationName} already has "${
          overlap.styleCode || overlap.styleName
        }" scheduled on ${scheduleDate} during H${overlap.startHour}–H${
          overlap.startHour + overlap.spanHours - 1
        }. Click that block to edit or choose free hours.`
      );
      return;
    }

    if (!Number.isFinite(planQty) || planQty < 1 || planQty > 500000) {
      showError('Plan Checking Qty must be between 1 and 500,000 Pcs.');
      return;
    }

    if (selectedPlanSizeMeta) {
      if (planQty > selectedPlanSizeMeta.sizeRemainingToPlan) {
        showError(
          `Size "${selectedPlanSizeMeta.sizeName}" wala Qty (${selectedPlanSizeMeta.sizeOrderQty.toLocaleString()} Pcs) walata wada wadiyen Checking Plan danna ba! Danatamath ${selectedPlanSizeMeta.sizeAlreadyPlanned.toLocaleString()} Pcs plan karala thiyenne. Thawa ithuru ${selectedPlanSizeMeta.sizeRemainingToPlan.toLocaleString()} Pcs witharai.`
        );
        return;
      }
      if (planQty > selectedPlanSizeMeta.styleRemainingToPlan) {
        showError(
          `Style Total Order Qty (${selectedPlanSizeMeta.styleOrderQty.toLocaleString()} Pcs) walata wada wadiyen Checking Plan danna ba! Thawa ithuru ${selectedPlanSizeMeta.styleRemainingToPlan.toLocaleString()} Pcs witharai.`
        );
        return;
      }
    }

    const executeScheduleSubmit = async () => {
      setIsSubmitting(true);
      const res = await saveQualityBlockAction({
        stationId:
          matchedStation && !matchedStation.id.startsWith('slot-') ? matchedStation.id : null,
        stationName: planStationName,
        checkerName: validSelectedChecker || planStationName,
        styleId: selectedPlanStyle.id,
        styleCode: selectedPlanStyle.code,
        styleName: selectedPlanStyle.name,
        partName: 'Final QC',
        clientName: selectedPlanStyle.company,
        date: scheduleDate,
        shift: planShift,
        size: planSize || 'Free Size',
        startHour: startCol,
        spanHours,
        planQty,
        actualQty: 0,
        defectQty: 0,
      });
      setIsSubmitting(false);

      if (!res.success || !res.block) {
        showError(res.error || 'Failed to schedule quality checking block.');
        return;
      }

      const createdBlock = res.block;
      setBlocks((prev) => [...prev, createdBlock]);
      setPlanDate(scheduleDate);
      setCalendarMonth(scheduleDate.slice(0, 7));
      if (validSelectedChecker) {
        setCheckers((prev) =>
          prev.map((st) =>
            st.name === planStationName ? { ...st, employeeName: validSelectedChecker } : st
          )
        );
      }
      showSuccess(
        `Scheduled Checking for ${
          selectedPlanStyle.code
            ? `${selectedPlanStyle.code} (${selectedPlanStyle.name})`
            : selectedPlanStyle.name
        } on ${planStationName} (${scheduleDate}) [H${startCol}–H${endCol}].`
      );
    };

    const existingDatePlanQty = getStyleDatePlanQty(selectedPlanStyle, scheduleDate);
    const newDayPlanTotal = existingDatePlanQty + planQty;
    const dateDeliveryQty = getDeliveryTargetForStyle(selectedPlanStyle, scheduleDate);
    if (dateDeliveryQty > 0 && dateDeliveryQty <= newDayPlanTotal) {
      setPendingDeliveryAlert({
        kind: 'schedule',
        style: selectedPlanStyle,
        date: scheduleDate,
        newDayPlanTotal,
        dayDeliveryQty: dateDeliveryQty,
        onConfirm: executeScheduleSubmit,
      });
      if (deliveryAlertDialogRef.current && !deliveryAlertDialogRef.current.open) {
        deliveryAlertDialogRef.current.showModal();
      }
      return;
    }

    await executeScheduleSubmit();
  };

  // ============================================================================
  // INLINE CLICK-TO-TYPE QUANTITY EDITING ON GANTT BLOCKS
  // ============================================================================
  const startInlineBlockQtyEdit = (
    block: QualityBlockEntity,
    field: 'plan' | 'actual',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (field === 'actual' && block.date >= todayStr) {
      showError(
        `Actual Checked Qty eka e dawasa (${block.date}) iwara wenakan fill karanna ba! Pahuwada (${block.date} dawasa iwara unata passe) Actual Qty eka fill karanna.`
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

  const commitInlineBlockQtyEdit = async (block: QualityBlockEntity) => {
    if (inlineEditBlockId !== block.id || !inlineEditField) return;
    const field = inlineEditField;
    const parsed = parseInt(inlineEditValue.trim(), 10);
    cancelInlineBlockQtyEdit();

    if (!Number.isFinite(parsed)) return;

    if (field === 'actual' && block.date >= todayStr) {
      showError(
        `Actual Checked Qty eka e dawasa (${block.date}) iwara wenakan fill karanna ba! Pahuwada (${block.date} dawasa iwara unata passe) Actual Qty eka fill karanna.`
      );
      return;
    }

    const nextPlanQty = field === 'plan' ? Math.max(1, parsed) : block.planQty;
    const nextActualQty = field === 'actual' ? Math.max(0, parsed) : block.actualQty;

    if (nextPlanQty === block.planQty && nextActualQty === block.actualQty) return;

    setIsSubmitting(true);
    const res = await saveQualityBlockAction(
      {
        stationId: block.stationId,
        stationName: block.stationName,
        checkerName: block.checkerName,
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
        defectQty: block.defectQty,
      },
      block.id
    );
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      showError(res.error || 'Failed to update quantity.');
      return;
    }

    const updated = res.block;
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    showSuccess(
      `Updated ${updated.stationName}: Plan ${updated.planQty} / Actual ${updated.actualQty} Pcs.`
    );
  };

  // ============================================================================
  // BAR EDGE RESIZE ("KONEN ALLALA LENGTH CONTROL + TIME AUTO ADJUST")
  // ============================================================================
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
      shortText: `${startObj.value}–${
        endFinishCol <= 11
          ? SHIFT_HOURS.find((h) => h.col === endFinishCol)?.value || '19:00'
          : '19:00'
      } (H${startCol}–H${endCol} • ${endCol - startCol + 1}h)`,
    };
  };

  const handleStartBlockResize = (
    block: QualityBlockEntity,
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

    const handleMouseMove = (ev: MouseEvent) => {
      const curr = resizingBlockRef.current;
      if (!curr) return;

      const relX = ev.clientX - curr.trackLeft;
      const rawCol = Math.floor((relX / curr.trackWidth) * 11) + 1;
      const hoveredCol = Math.max(1, Math.min(11, rawCol));

      const origStart = curr.block.startHour;
      const origEnd = curr.block.startHour + curr.block.spanHours - 1;

      const otherBlocksOnStation = blocks.filter(
        (b) =>
          b.id !== curr.block.id &&
          b.date === curr.block.date &&
          b.shift === curr.block.shift &&
          b.stationName === curr.block.stationName
      );

      let nextStart = origStart;
      let nextEnd = origEnd;

      if (curr.edge === 'start') {
        let minAllowedStart = 1;
        for (const ob of otherBlocksOnStation) {
          const obEnd = ob.startHour + ob.spanHours - 1;
          if (obEnd < origEnd && obEnd + 1 > minAllowedStart) {
            minAllowedStart = obEnd + 1;
          }
        }
        nextStart = Math.max(minAllowedStart, Math.min(origEnd, hoveredCol));
      } else {
        let maxAllowedEnd = 11;
        for (const ob of otherBlocksOnStation) {
          if (ob.startHour > origStart && ob.startHour - 1 < maxAllowedEnd) {
            maxAllowedEnd = ob.startHour - 1;
          }
        }
        nextEnd = Math.min(maxAllowedEnd, Math.max(origStart, hoveredCol));
      }

      const nextSpan = Math.max(1, nextEnd - nextStart + 1);
      if (nextStart !== curr.previewStartHour || nextSpan !== curr.previewSpanHours) {
        const updated = {
          ...curr,
          previewStartHour: nextStart,
          previewSpanHours: nextSpan,
        };
        resizingBlockRef.current = updated;
        setResizingBlock(updated);
      }
    };

    const handleMouseUp = async () => {
      const finalState = resizingBlockRef.current;
      resizingBlockRef.current = null;
      setResizingBlock(null);
      suppressNextBlockClickRef.current = true;
      setTimeout(() => {
        suppressNextBlockClickRef.current = false;
      }, 150);

      if (!finalState) return;
      const { block, previewStartHour, previewSpanHours } = finalState;
      if (previewStartHour === block.startHour && previewSpanHours === block.spanHours) {
        return;
      }

      const prevStart = block.startHour;
      const prevSpan = block.spanHours;

      setBlocks((prev) =>
        prev.map((b) =>
          b.id === block.id
            ? { ...b, startHour: previewStartHour, spanHours: previewSpanHours }
            : b
        )
      );

      setIsSubmitting(true);
      const res = await saveQualityBlockAction(
        {
          stationId: block.stationId,
          stationName: block.stationName,
          checkerName: block.checkerName,
          styleId: block.styleId,
          styleCode: block.styleCode,
          styleName: block.styleName,
          partName: block.partName,
          clientName: block.clientName,
          date: block.date,
          shift: block.shift,
          size: block.size,
          startHour: previewStartHour,
          spanHours: previewSpanHours,
          planQty: block.planQty,
          actualQty: block.actualQty,
          defectQty: block.defectQty,
        },
        block.id
      );
      setIsSubmitting(false);

      if (!res.success || !res.block) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, startHour: prevStart, spanHours: prevSpan } : b
          )
        );
        showError(res.error || 'Failed to adjust block time.');
        return;
      }

      const saved = res.block;
      setBlocks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      const timeMeta = formatBlockTimeRange(saved.startHour, saved.spanHours);
      showSuccess(
        `Adjusted ${saved.stationName} time to ${timeMeta.startLabel} – ${timeMeta.endFinishLabel} (${timeMeta.hoursCount}h).`
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizingBlock, blocks]);

  // ============================================================================
  // DRAG & DROP ("ADALA DANNA" — MOVE ONLY) ON GANTT MATRIX
  // ============================================================================
  const handleBlockDragStart = (
    block: QualityBlockEntity,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    if (inlineEditBlockId === block.id || resizingBlock) {
      e.preventDefault();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, e.clientX - rect.left);
    const colWidth = rect.width / Math.max(1, block.spanHours);
    const grabOffset = Math.min(
      block.spanHours - 1,
      Math.max(0, Math.floor(relX / Math.max(1, colWidth)))
    );

    setDraggingBlock(block);
    setDragGrabOffsetHours(grabOffset);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
  };

  const handleBlockDragEnd = () => {
    setDraggingBlock(null);
    setDragGrabOffsetHours(0);
    setDragOverStationName(null);
    setDragOverStartCol(null);
  };

  const computeDropStartCol = (
    e: React.DragEvent<HTMLDivElement>,
    spanHours: number
  ): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
    const hoveredCol = Math.min(11, Math.max(1, Math.floor((relX / rect.width) * 11) + 1));
    const maxStart = Math.max(1, 11 - spanHours + 1);
    return Math.min(maxStart, Math.max(1, hoveredCol - dragGrabOffsetHours));
  };

  const handleTrackDragOver = (
    stationName: string,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    if (!draggingBlock) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const nextStartCol = computeDropStartCol(e, draggingBlock.spanHours);
    if (dragOverStationName !== stationName) setDragOverStationName(stationName);
    if (dragOverStartCol !== nextStartCol) setDragOverStartCol(nextStartCol);
  };

  const handleTrackDrop = async (
    targetStation: QualityCheckerStationEntity,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    const source = draggingBlock;
    const nextStartCol = source ? computeDropStartCol(e, source.spanHours) : 1;
    handleBlockDragEnd();

    if (!source) return;

    const spanHours = source.spanHours;
    const nextEndCol = nextStartCol + spanHours - 1;

    if (targetStation.name === source.stationName && nextStartCol === source.startHour) {
      return;
    }

    const targetStChecker = getStationAssignedChecker(targetStation) || targetStation.name;
    const effectiveTargetStationId = targetStation.id.startsWith('slot-')
      ? null
      : targetStation.id;

    const targetStationBlocks = activeDateShiftBlocks.filter(
      (b) => b.stationName === targetStation.name && b.id !== source.id
    );
    const overlap = targetStationBlocks.find((existing) => {
      const exStart = existing.startHour;
      const exEnd = existing.startHour + existing.spanHours - 1;
      return nextStartCol <= exEnd && nextEndCol >= exStart;
    });

    if (overlap) {
      showError(
        `${targetStation.name} already has "${
          overlap.styleCode || overlap.styleName
        }" on H${overlap.startHour}–H${
          overlap.startHour + overlap.spanHours - 1
        }. Drop onto free hours or another Checker Slot.`
      );
      return;
    }

    const prevStationId = source.stationId;
    const prevStationName = source.stationName;
    const prevStartHour = source.startHour;
    const prevCheckerName = source.checkerName;

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === source.id
          ? {
              ...b,
              stationId: effectiveTargetStationId,
              stationName: targetStation.name,
              startHour: nextStartCol,
              checkerName: targetStChecker,
            }
          : b
      )
    );

    setIsSubmitting(true);
    const res = await saveQualityBlockAction(
      {
        stationId: effectiveTargetStationId,
        stationName: targetStation.name,
        checkerName: targetStChecker,
        styleId: source.styleId,
        styleCode: source.styleCode,
        styleName: source.styleName,
        partName: source.partName,
        clientName: source.clientName,
        date: source.date,
        shift: source.shift,
        size: source.size,
        startHour: nextStartCol,
        spanHours,
        planQty: source.planQty,
        actualQty: source.actualQty,
        defectQty: source.defectQty,
      },
      source.id
    );
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === source.id
            ? {
                ...b,
                stationId: prevStationId,
                stationName: prevStationName,
                startHour: prevStartHour,
                checkerName: prevCheckerName,
              }
            : b
        )
      );
      showError(res.error || 'Failed to move checking block.');
      return;
    }

    const moved = res.block;
    setBlocks((prev) => prev.map((b) => (b.id === moved.id ? moved : b)));
    const timeMeta = formatBlockTimeRange(moved.startHour, moved.spanHours);
    showSuccess(
      `Moved "${moved.styleCode || moved.styleName} (${moved.size})" to ${moved.stationName} [${
        timeMeta.startLabel
      } – ${timeMeta.endFinishLabel}].`
    );
  };

  // ============================================================================
  // MANAGE / DUPLICATE BLOCK MODAL (<dialog>)
  // ============================================================================
  const findNextAvailableStationForBlock = (block: QualityBlockEntity): string => {
    const startCol = block.startHour;
    const endCol = block.startHour + block.spanHours - 1;
    const currentIdx = checkerSlots.findIndex((c) => c.name === block.stationName);

    const orderedCheckers =
      currentIdx >= 0
        ? [...checkerSlots.slice(currentIdx + 1), ...checkerSlots.slice(0, currentIdx + 1)]
        : checkerSlots;

    for (const st of orderedCheckers) {
      if (st.name === block.stationName) continue;
      const stBlocks = blocks.filter(
        (b) => b.date === block.date && b.shift === block.shift && b.stationName === st.name
      );
      const hasConflict = stBlocks.some((b) => {
        const exStart = b.startHour;
        const exEnd = b.startHour + b.spanHours - 1;
        return startCol <= exEnd && endCol >= exStart;
      });
      if (!hasConflict) return st.name;
    }
    return block.stationName;
  };

  const openManageBlockModal = (
    block: QualityBlockEntity,
    mode: 'edit' | 'duplicate' = 'edit'
  ) => {
    setEditingBlock(block);
    setModalMode(mode);
    const defaultTargetStation =
      mode === 'duplicate' ? findNextAvailableStationForBlock(block) : block.stationName;
    setModalStationName(defaultTargetStation);
    setModalPlanQtyInput(String(block.planQty));
    setModalActualQtyInput(mode === 'duplicate' ? '0' : String(block.actualQty));
    setModalDefectQtyInput(mode === 'duplicate' ? '0' : String(block.defectQty || 0));
    setModalSize(block.size || 'Free Size');
    const targetStObj = checkerSlots.find((c) => c.name === defaultTargetStation);
    const resolvedChecker =
      mode === 'duplicate'
        ? getStationAssignedChecker(targetStObj)
        : getStationAssignedChecker(targetStObj) || resolveRealEmployeeLabel(block.checkerName);
    setModalCheckerEmp(resolvedChecker);
    setModalStartCol(block.startHour);
    setModalEndCol(Math.min(11, block.startHour + block.spanHours - 1));
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  };

  const closeManageBlockModal = () => {
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.returnValue = '';
      dialogRef.current.close();
    }
    setEditingBlock(null);
    setModalMode('edit');
  };

  const editingBlockStyle = useMemo<StyleMasterEntity | null>(() => {
    if (!editingBlock) return null;
    return (
      styles.find(
        (s) =>
          (editingBlock.styleId && s.id === editingBlock.styleId) ||
          (editingBlock.styleCode && s.code === editingBlock.styleCode) ||
          s.name.trim().toLowerCase() === editingBlock.styleName.trim().toLowerCase()
      ) || null
    );
  }, [editingBlock, styles]);

  const editingBlockStyleSizes = useMemo<StyleSizeItem[]>(() => {
    if (!editingBlockStyle) return [];
    if (editingBlockStyle.sizeBreakdown && editingBlockStyle.sizeBreakdown.length > 0) {
      return editingBlockStyle.sizeBreakdown;
    }
    return [];
  }, [editingBlockStyle]);

  const saveModalBlock = async (asDuplicate: boolean) => {
    if (!editingBlock) return;
    if (modalStartCol > modalEndCol) {
      showError('Start Hour cannot be after End Hour.');
      return;
    }

    const parsedPlanQty = Math.max(1, parseInt(modalPlanQtyInput.trim(), 10) || 0);
    const isLockedFutureOrToday = asDuplicate || editingBlock.date >= todayStr;
    const parsedActualQty = isLockedFutureOrToday
      ? 0
      : Math.max(0, parseInt(modalActualQtyInput.trim(), 10) || 0);
    const parsedDefectQty = isLockedFutureOrToday
      ? 0
      : Math.max(0, parseInt(modalDefectQtyInput.trim(), 10) || 0);

    const spanHours = modalEndCol - modalStartCol + 1;
    const targetStationName = modalStationName || editingBlock.stationName;
    const matchedStation = checkerSlots.find((c) => c.name === targetStationName);
    const validModalChecker =
      resolveRealEmployeeLabel(modalCheckerEmp) || getStationAssignedChecker(matchedStation);

    if (validModalChecker) {
      const conflictSt = findStationWithEmployee(
        validModalChecker,
        matchedStation?.id,
        targetStationName
      );
      if (conflictSt) {
        showError(
          `${validModalChecker} danatamath ${conflictSt.name} ekata assign karala thiyenne! Checkersla duplicate wenna ba.`
        );
        return;
      }
    }

    const overlap = blocks.find((b) => {
      if (!asDuplicate && b.id === editingBlock.id) return false;
      if (
        b.date !== editingBlock.date ||
        b.shift !== editingBlock.shift ||
        b.stationName !== targetStationName
      ) {
        return false;
      }
      const exStart = b.startHour;
      const exEnd = b.startHour + b.spanHours - 1;
      return modalStartCol <= exEnd && modalEndCol >= exStart;
    });

    if (overlap) {
      showError(
        `Time conflict on ${targetStationName} with "${
          overlap.styleCode || overlap.styleName
        }" on H${overlap.startHour}–H${
          overlap.startHour + overlap.spanHours - 1
        }. Choose another Checker Slot or Start/End Hour.`
      );
      return;
    }

    setIsSubmitting(true);
    const res = await saveQualityBlockAction(
      {
        stationId:
          matchedStation && !matchedStation.id.startsWith('slot-')
            ? matchedStation.id
            : null,
        stationName: targetStationName,
        checkerName: validModalChecker || targetStationName,
        styleId: editingBlock.styleId,
        styleCode: editingBlock.styleCode,
        styleName: editingBlock.styleName,
        partName: 'Final QC',
        clientName: editingBlock.clientName,
        date: editingBlock.date,
        shift: editingBlock.shift,
        size: modalSize.trim() || 'Free Size',
        startHour: modalStartCol,
        spanHours,
        planQty: parsedPlanQty,
        actualQty: parsedActualQty,
        defectQty: parsedDefectQty,
      },
      asDuplicate ? undefined : editingBlock.id
    );
    setIsSubmitting(false);

    if (!res.success || !res.block) {
      showError(
        res.error ||
          (asDuplicate ? 'Failed to duplicate checking block.' : 'Failed to update checking block.')
      );
      return;
    }

    const savedBlock = res.block;
    setBlocks((prev) =>
      asDuplicate
        ? [...prev, savedBlock]
        : prev.map((b) => (b.id === savedBlock.id ? savedBlock : b))
    );
    if (validModalChecker) {
      setCheckers((prev) =>
        prev.map((st) =>
          st.name === savedBlock.stationName ? { ...st, employeeName: validModalChecker } : st
        )
      );
    }

    closeManageBlockModal();
    showSuccess(
      asDuplicate
        ? `Duplicated checking block onto ${savedBlock.stationName} [H${savedBlock.startHour}–H${
            savedBlock.startHour + savedBlock.spanHours - 1
          }] (Plan: ${savedBlock.planQty} Pcs).`
        : `Updated ${savedBlock.stationName}: Actual ${savedBlock.actualQty} / Plan ${savedBlock.planQty} Pcs.`
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
    const res = await deleteQualityBlockAction(target.id);
    setIsSubmitting(false);
    if (!res.success) {
      showError(res.error || 'Failed to delete checking block.');
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== target.id));
    closeManageBlockModal();
    showSuccess(`Removed checking block from ${target.stationName}.`);
  };

  // Floor Display Aggregate Metrics for Selected Date & Shift (matches quality dashbord display.html)
  const floorStats = useMemo(() => {
    let shiftPlanTotal = 0;
    let shiftActualTotal = 0;
    let shiftDeliveryTargetTotal = 0;

    // Sum exact-date Delivery Targets for active styles
    for (const item of activeStylesMetrics) {
      shiftDeliveryTargetTotal += item.todayDeliveryQty;
    }

    for (const b of activeDateShiftBlocks) {
      shiftPlanTotal += b.planQty;
      shiftActualTotal += b.actualQty;
    }

    const targetDenominator =
      shiftDeliveryTargetTotal > 0 ? shiftDeliveryTargetTotal : shiftPlanTotal;
    const overallPct =
      targetDenominator > 0 ? Math.round((shiftActualTotal / targetDenominator) * 100) : 0;
    const activeCheckersCount = checkerSlots.length;

    return {
      shiftPlanTotal,
      shiftActualTotal,
      shiftDeliveryTargetTotal: targetDenominator,
      overallPct,
      activeCheckersCount,
    };
  }, [activeDateShiftBlocks, activeStylesMetrics, checkerSlots]);

  return (
    <div className="space-y-6">
      {/* Top Persian Blue Studio Banner & Sub-Navigation Tabs (Hidden in Live Floor Display) */}
      {subTab !== 'floorDisplay' && (
        <div className="bg-persian-800 text-white rounded-2xl shadow-md border border-persian-900 overflow-hidden print:hidden">
          <div className="px-5 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white text-persian-800 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                D
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold tracking-wide uppercase">
                    Quality Checking &amp; Delivery Target Studio
                  </h2>
                  <span className="bg-emerald-500/30 text-emerald-100 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
                    Checking &amp; QC ({checkerSlots.length} Checker Slots)
                  </span>
                </div>
                <p className="text-xs text-blue-200/90 font-medium mt-0.5">
                  Weliweriya Factory — Style-Wise Delivery Targets, Checker Matrix &amp; Live Floor Display
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {liveTimeStr && (
                <div className="bg-persian-900/70 border border-persian-600/40 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-blue-100 font-mono mr-1">
                  <span className="text-amber-300 font-bold">{liveTimeStr}</span>
                </div>
              )}

              {(
                [
                  {
                    id: 'checkingEditor',
                    label: 'Checking Plan Editor',
                    icon: Calendar,
                  },
                  {
                    id: 'deliveryPlan',
                    label: 'Daily Delivery Plan',
                    icon: Truck,
                  },
                  {
                    id: 'floorDisplay',
                    label: 'Live Floor Display',
                    icon: Monitor,
                  },
                  {
                    id: 'doneStyles',
                    label: `Done Styles (${doneStylesMetrics.length})`,
                    icon: CheckCircle2,
                  },
                  {
                    id: 'checkerCrud',
                    label: `Checker Slots (${checkerSlots.length})`,
                    icon: Users,
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubTab(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white text-persian-900 shadow-sm'
                        : 'bg-persian-900/60 text-blue-100 hover:bg-persian-700/70 border border-persian-600/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Notifications */}
      {toastMsg && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs print:hidden"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs print:hidden"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: CHECKING PLAN EDITOR (quality dashbord editor.html)
          ===================================================================== */}
      {subTab === 'checkingEditor' && (
        <div className="space-y-5 print:hidden">
          {/* Top Bar: Date / Calendar Picker + Shift Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-persian-50 text-persian-600 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Checking Dashboard Editor ({checkerSlots.length} Checker Slots)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connected to Style Master, Company CRUD &amp; Employee Registry
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Interactive Calendar Popover Trigger */}
                <div ref={calendarPopoverRef} className="relative">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
                    <label
                      htmlFor={`${uid}-plan-date`}
                      className="text-xs font-bold text-slate-600"
                    >
                      Viewing Date:
                    </label>
                    <input
                      id={`${uid}-plan-date`}
                      type="date"
                      value={planDate}
                      onChange={(e) => selectViewingDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-persian-800 outline-none font-mono cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 border transition cursor-pointer ${
                        pendingActualDates.length > 0
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse'
                          : 'bg-persian-800 hover:bg-persian-700 text-white border-persian-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Calendar</span>
                      {pendingActualDates.length > 0 && (
                        <span className="bg-white text-rose-700 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                          {pendingActualDates.length} Red
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Custom Calendar Popover with Red Highlights for Unfilled Past Dates */}
                  {isCalendarOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => shiftCalendarMonth(-1)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                          {calendarGridData.monthLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => shiftCalendarMonth(1)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {calendarGridData.cells.map((cell) => {
                          if (!cell.dateStr || cell.dayNum === null) {
                            return <div key={cell.key} className="h-9" />;
                          }
                          const dStat = dateStatusMap.get(cell.dateStr);
                          const isSelected = cell.dateStr === planDate;
                          const isToday = cell.dateStr === todayStr;
                          const isPast = cell.dateStr < todayStr;
                          const needsActualFill =
                            isPast && dStat && dStat.pendingActualBlocks > 0;
                          const allActualFilled =
                            dStat && dStat.totalBlocks > 0 && dStat.pendingActualBlocks === 0;
                          const hasFutureOrTodayPlan = !isPast && dStat && dStat.totalBlocks > 0;

                          return (
                            <button
                              key={cell.key}
                              type="button"
                              onClick={() => selectViewingDate(cell.dateStr!)}
                              className={`h-9 rounded-lg text-xs font-bold flex flex-col items-center justify-center relative transition cursor-pointer border ${
                                isSelected
                                  ? 'ring-2 ring-persian-800 border-persian-800'
                                  : 'border-transparent'
                              } ${
                                needsActualFill
                                  ? 'bg-rose-600 text-white hover:bg-rose-700 font-black shadow-xs'
                                  : allActualFilled
                                  ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-emerald-300'
                                  : hasFutureOrTodayPlan
                                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300'
                                  : isToday
                                  ? 'bg-persian-100 text-persian-900 font-black'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>{cell.dayNum}</span>
                              {needsActualFill && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shift Toggle */}
                <button
                  type="button"
                  onClick={() => setPlanShift((prev) => (prev === 'day' ? 'night' : 'day'))}
                  className="bg-persian-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-persian-800 transition cursor-pointer"
                >
                  {planShift === 'day' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Day Shift (08:00 - 19:00)</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Night Shift (19:00 - 06:00)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Red Alert Banner for Past Dates with Unfilled Actual Checked Qty */}
            {pendingActualDates.length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Pahuwada Actual Checked Qty Fill Karanna One Dawas ({pendingActualDates.length}):
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {pendingActualDates.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => selectViewingDate(d.date)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                        planDate === d.date
                          ? 'bg-rose-800 text-white ring-2 ring-rose-400'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      <span>{d.date}</span>
                      <span className="bg-white/20 px-1.5 rounded text-[10px]">
                        {d.pendingActualBlocks} Pending
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Per-Style Summary Cards Section (4-Box Layout from quality dashbord editor.html) */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-persian-500" />
                Style-Wise Order &amp; Checking Breakdown ({activeStylesMetrics.length} Active Styles)
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Click &apos;Today Delivery Qty&apos; ({planDate}) to update</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryPlanStartDate(planDate || todayStr);
                    setSubTab('deliveryPlan');
                  }}
                  className="text-[11px] font-extrabold bg-persian-800 hover:bg-persian-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Daily Delivery Plan Sheet →</span>
                </button>
              </div>
            </div>

            {activeStylesMetrics.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                No active styles found in Style Master. Register styles in Production Management → Style &amp; Parts CRUD.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {activeStylesMetrics.map((item) => {
                  const {
                    style,
                    orderQty,
                    plannedCheckingQty,
                    todayPlanQty,
                    actualDoneQty,
                    todayDeliveryQty,
                  } = item;
                  const cStyle = getCompanyColor(style.company);
                  const isEditingDelivery = editingDeliveryStyleId === style.id;
                  const deliveryBelowOrEqualPlan =
                    todayPlanQty > 0 && todayDeliveryQty <= todayPlanQty;

                  return (
                    <div
                      key={style.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-soft flex flex-col justify-between space-y-2.5"
                    >
                      <div className="border-b border-slate-100 pb-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span
                            className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cStyle.badge}`}
                          >
                            {style.company}
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-xs truncate mt-1">
                            {style.code ? `${style.code} — ` : ''}
                            {style.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                          {orderQty > 0 ? Math.round((actualDoneQty / orderQty) * 100) : 0}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* BOX 1: Order Qty */}
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">
                            Order Qty
                          </span>
                          <span className="font-black text-slate-700 text-sm font-mono">
                            {orderQty.toLocaleString()}
                          </span>
                        </div>

                        {/* BOX 2: Planned Checking Qty */}
                        <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                          <span className="text-[9px] font-bold text-amber-700/85 block uppercase">
                            Planned Checking Qty
                          </span>
                          <span className="font-black text-amber-600 text-sm font-mono block leading-tight">
                            {plannedCheckingQty.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-amber-700/90 font-mono block mt-0.5">
                            Day Plan: {todayPlanQty.toLocaleString()}
                          </span>
                        </div>

                        {/* BOX 3: Actual Done Qty */}
                        <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                          <span className="text-[9px] font-bold text-emerald-700/85 block uppercase">
                            Actual Done Qty
                          </span>
                          <span className="font-black text-emerald-600 text-sm font-mono">
                            {actualDoneQty.toLocaleString()}
                          </span>
                        </div>

                        {/* BOX 4: Clickable Today Delivery Qty */}
                        {isEditingDelivery ? (
                          <div className="bg-indigo-100 p-1.5 rounded-lg border-2 border-indigo-500 flex flex-col justify-between">
                            <span className="text-[9px] font-extrabold text-indigo-900 block uppercase">
                              Delivery ({planDate})
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={orderQty || 500000}
                              autoFocus
                              value={editingDeliveryValue}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => setEditingDeliveryValue(e.target.value)}
                              onBlur={() => commitDeliveryQty(style)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitDeliveryQty(style);
                                } else if (e.key === 'Escape') {
                                  setEditingDeliveryStyleId(null);
                                }
                              }}
                              className="w-full bg-white border border-indigo-400 rounded px-1.5 py-0.5 text-xs font-black font-mono text-indigo-900 outline-none mt-0.5"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingDeliveryQty(style, todayDeliveryQty)}
                            title={`Click to set Today Delivery Qty for ${planDate}`}
                            className={`p-2 rounded-lg border cursor-pointer transition-colors text-left group ${
                              deliveryBelowOrEqualPlan
                                ? 'bg-rose-50/80 border-rose-300 hover:bg-rose-100'
                                : 'bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            <span
                              className={`text-[9px] font-bold flex items-center justify-between uppercase ${
                                deliveryBelowOrEqualPlan
                                  ? 'text-rose-700 group-hover:text-rose-900'
                                  : 'text-indigo-700/85 group-hover:text-indigo-900'
                              }`}
                            >
                              <span>Today Delivery Qty</span>
                              <Pencil
                                className={`w-2.5 h-2.5 ${
                                  deliveryBelowOrEqualPlan ? 'text-rose-500' : 'text-indigo-500'
                                }`}
                              />
                            </span>
                            <span
                              className={`font-black text-sm font-mono block leading-tight ${
                                deliveryBelowOrEqualPlan ? 'text-rose-700' : 'text-indigo-600'
                              }`}
                            >
                              {todayDeliveryQty.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                              {planDate}
                            </span>
                          </button>
                        )}
                      </div>

                      {deliveryBelowOrEqualPlan && (
                        <div className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>
                            Delivery ({todayDeliveryQty.toLocaleString()}) ≤ Day Plan ({todayPlanQty.toLocaleString()}). Delivery must exceed Plan!
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Assign Checker Slot & Timeline Block Form */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-persian-500" />
                Assign Checker Slot &amp; Timeline Block
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">
                Direct assign to any of {checkerSlots.length} Checker Slots • Staff selection optional
              </span>
            </div>

            <form onSubmit={handleScheduleCheckingSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <div>
                  <label
                    htmlFor={`${uid}-sched-date`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Schedule Date (Today / Future) *
                  </label>
                  <input
                    id={`${uid}-sched-date`}
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-persian-800 outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-sched-station`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Checker Slot (01 – 12) *
                  </label>
                  <select
                    id={`${uid}-sched-station`}
                    value={planStationName}
                    onChange={(e) => setPlanStationName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-persian-800 outline-none focus:border-persian-500"
                  >
                    {checkerSlots.map((st) => {
                      const stEmp = getStationAssignedChecker(st);
                      return (
                        <option key={st.id} value={st.name}>
                          {st.name}
                          {stEmp ? ` — ${stEmp}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-sched-company`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Company (From Company CRUD) *
                  </label>
                  <select
                    id={`${uid}-sched-company`}
                    value={planCompany}
                    onChange={(e) => setPlanCompany(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor={`${uid}-sched-style`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Style Name &amp; Total Qty *
                  </label>
                  <select
                    id={`${uid}-sched-style`}
                    value={planStyleId}
                    onChange={(e) => setPlanStyleId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {companyFilteredStyles.length === 0 ? (
                      <option value="">-- No Active Styles for {planCompany} --</option>
                    ) : (
                      companyFilteredStyles.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code ? `${s.code} — ` : ''}
                          {s.name} ({s.qty.toLocaleString()} Pcs)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-sched-size`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Size *
                  </label>
                  <select
                    id={`${uid}-sched-size`}
                    value={planSize}
                    onChange={(e) => setPlanSize(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:border-persian-500"
                  >
                    {selectedPlanStyleSizes.length === 0 ? (
                      <option value="Free Size">Free Size</option>
                    ) : (
                      selectedPlanStyleSizes.map((sz) => {
                        const used = getSizeCheckingPlannedTotal(selectedPlanStyle, sz.size);
                        const rem = Math.max(0, sz.qty - used);
                        return (
                          <option key={sz.size} value={sz.size}>
                            {sz.size} — {used}/{sz.qty} Pcs ({rem} Left)
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end pt-1">
                <div>
                  <label
                    htmlFor={`${uid}-sched-start`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Start Time *
                  </label>
                  <select
                    id={`${uid}-sched-start`}
                    value={planStartTime}
                    onChange={(e) => setPlanStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                  >
                    {SHIFT_HOURS.map((h) => (
                      <option key={h.col} value={h.value}>
                        {h.label} ({h.short})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-sched-end`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    End Time *
                  </label>
                  <select
                    id={`${uid}-sched-end`}
                    value={planEndTime}
                    onChange={(e) => setPlanEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none"
                  >
                    {SHIFT_HOURS.map((h) => (
                      <option key={h.col} value={h.value}>
                        {h.label} ({h.short})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-sched-qty`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Plan Checking Qty (Pcs) *
                  </label>
                  <input
                    id={`${uid}-sched-qty`}
                    type="number"
                    min={1}
                    max={
                      selectedPlanSizeMeta && selectedPlanSizeMeta.maxAllowedForInput > 0
                        ? selectedPlanSizeMeta.maxAllowedForInput
                        : 500000
                    }
                    value={planQty}
                    onChange={(e) => setPlanQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-persian-800 outline-none focus:border-persian-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-sched-checker-emp`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Checker Staff (Optional)
                  </label>
                  <select
                    id={`${uid}-sched-checker-emp`}
                    value={planCheckerEmp}
                    onChange={(e) => setPlanCheckerEmp(e.target.value)}
                    className="w-full rounded-lg p-2 text-xs font-semibold outline-none bg-slate-50 border border-slate-300 text-slate-800 focus:border-persian-500"
                  >
                    <option value="">-- Optional: Assign Staff --</option>
                    {activeEmployees.map((emp) => {
                      const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                      const targetSt = checkerSlots.find((c) => c.name === planStationName);
                      const usedInOtherStation = findStationWithEmployee(
                        label,
                        targetSt?.id,
                        planStationName
                      );
                      return (
                        <option
                          key={emp.id}
                          value={label}
                          disabled={Boolean(usedInOtherStation)}
                        >
                          {label}
                          {usedInOtherStation ? ` (In ${usedInOtherStation.name})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-persian-800 hover:bg-persian-600 text-white font-bold text-xs p-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Push into Dashboard</span>
                  </button>
                </div>
              </div>

              {/* Live Order Qty & Size Balance Feedback Pill */}
              {selectedPlanSizeMeta && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${
                    selectedPlanSizeMeta.maxAllowedForInput === 0
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : planQty < selectedPlanSizeMeta.maxAllowedForInput
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <span>
                    Style Order: {selectedPlanSizeMeta.styleOrderQty.toLocaleString()} Pcs •
                    Already Planned: {selectedPlanSizeMeta.styleAlreadyPlanned.toLocaleString()} Pcs •
                    Remaining to Plan:{' '}
                    <strong>{selectedPlanSizeMeta.styleRemainingToPlan.toLocaleString()} Pcs</strong>
                  </span>
                  <span>
                    {selectedPlanSizeMeta.maxAllowedForInput === 0
                      ? '100% Planned! Wadiyen Checking Plan add karanna ba.'
                      : planQty < selectedPlanSizeMeta.maxAllowedForInput
                      ? `Aduwen fill wela thiyenne: Thawa ${(
                          selectedPlanSizeMeta.maxAllowedForInput - planQty
                        ).toLocaleString()} Pcs ithuru wenawa.`
                      : 'Exact Remaining Balance Matched (100%).'}
                  </span>
                </div>
              )}
            </form>
          </section>

          {/* Interactive 11-Hour Checker Gantt Matrix */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-persian-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Interactive 11-Hour Quality Checking Matrix ({planDate})
                </h3>
                <span className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
                  Drag block to Move • Drag bar edges to Resize Time • Click Duplicate • Click Plan/Act to type Qty
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1120px]">
                {/* Matrix Header */}
                <div className="flex border-b border-slate-200 bg-slate-50 font-semibold text-xs text-slate-600">
                  <div className="w-72 sm:w-80 p-3 flex items-center justify-between bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider shrink-0">
                    <span>Checker Slots ({checkerSlots.length})</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-300 font-normal text-slate-500">
                      Optional Staff
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-200">
                    {SHIFT_HOURS.map((h, idx) => (
                      <div
                        key={h.col}
                        className="py-2 px-1 flex flex-col items-center justify-center bg-slate-50/90"
                      >
                        <span className="font-bold text-slate-800 text-xs">{h.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Hour {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checker Rows */}
                <div className="divide-y divide-slate-200">
                  {checkerSlots.map((st) => {
                    const stBlocks = activeDateShiftBlocks.filter(
                      (b) => b.stationId === st.id || b.stationName === st.name
                    );
                    const stPlan = stBlocks.reduce((sum, b) => sum + b.planQty, 0);
                    const stActual = stBlocks.reduce((sum, b) => sum + b.actualQty, 0);
                    const compPercent = stPlan > 0 ? Math.round((stActual / stPlan) * 100) : 0;

                    const assignedEmp = getStationAssignedChecker(st);
                    const hasValidEmp = Boolean(assignedEmp);
                    const isDropTarget = dragOverStationName === st.name;

                    return (
                      <div
                        key={st.id}
                        className={`flex items-stretch transition-colors ${
                          isDropTarget ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Left Column: Checker Slot + Optional Staff Dropdown */}
                        <div className="w-72 sm:w-80 p-3 bg-white border-r border-slate-300 flex flex-col justify-between shrink-0 gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-persian-800 text-xs sm:text-sm">
                              {st.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                hasValidEmp
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {hasValidEmp ? 'Staff Assigned' : 'Slot Ready'}
                            </span>
                          </div>

                          {/* Optional Staff Selector for this Checker Slot */}
                          <div>
                            <select
                              aria-label={`Assign Staff for ${st.name}`}
                              value={assignedEmp}
                              onChange={(e) => handleQuickAssignStationEmployee(st, e.target.value)}
                              className="w-full rounded-lg px-2 py-1.5 text-[11px] font-semibold outline-none cursor-pointer border bg-slate-50 border-slate-200 text-slate-800 focus:border-persian-500"
                            >
                              <option value="">-- Optional: Assign Staff --</option>
                              {activeEmployees.map((emp) => {
                                const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                                const usedInOtherStation = findStationWithEmployee(
                                  label,
                                  st.id,
                                  st.name
                                );
                                return (
                                  <option
                                    key={emp.id}
                                    value={label}
                                    disabled={Boolean(usedInOtherStation)}
                                  >
                                    {label}
                                    {usedInOtherStation ? ` (In ${usedInOtherStation.name})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                              <span>
                                Total Act: <strong className="text-slate-800">{stActual}</strong> /{' '}
                                {stPlan} Pcs
                              </span>
                              <span
                                className={
                                  compPercent >= 100
                                    ? 'text-emerald-600 font-bold'
                                    : 'text-slate-600 font-bold'
                                }
                              >
                                {compPercent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-200">
                              <div
                                className="bg-persian-600 h-full rounded-full"
                                style={{ width: `${Math.min(compPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Right 11-Hour Timeline Track */}
                        <div
                          data-gantt-track="true"
                          onDragOver={(e) => handleTrackDragOver(st.name, e)}
                          onDrop={(e) => handleTrackDrop(st, e)}
                          className="flex-1 grid grid-cols-11 relative matrix-grid p-1.5 gap-1.5 items-center min-h-[88px]"
                        >
                          {isDropTarget && draggingBlock && dragOverStartCol !== null && (
                            <div
                              style={{
                                gridColumn: `${dragOverStartCol} / span ${draggingBlock.spanHours}`,
                                gridRow: 1,
                              }}
                              className="h-full min-h-[68px] rounded-xl border-2 border-dashed border-persian-600 bg-persian-100/40 pointer-events-none flex items-center justify-center text-[11px] font-extrabold text-persian-800 z-10"
                            >
                              Move to {st.name} (H{dragOverStartCol}–H
                              {dragOverStartCol + draggingBlock.spanHours - 1})
                            </div>
                          )}

                          {stBlocks.map((b) => {
                            const cStyle = getCompanyColor(b.clientName);
                            const isResizingThis = resizingBlock?.block.id === b.id;
                            const effectiveStart = isResizingThis
                              ? resizingBlock.previewStartHour
                              : b.startHour;
                            const effectiveSpan = isResizingThis
                              ? resizingBlock.previewSpanHours
                              : b.spanHours;
                            const timeMeta = formatBlockTimeRange(effectiveStart, effectiveSpan);
                            const isFutureOrToday = b.date >= todayStr;
                            const isPastUnfilled = b.date < todayStr && b.actualQty <= 0;

                            return (
                              <div
                                key={b.id}
                                draggable={inlineEditBlockId !== b.id && !resizingBlock}
                                onDragStart={(e) => handleBlockDragStart(b, e)}
                                onDragEnd={handleBlockDragEnd}
                                onClick={() => {
                                  if (suppressNextBlockClickRef.current) return;
                                  openManageBlockModal(b, 'edit');
                                }}
                                style={{
                                  gridColumn: `${effectiveStart} / span ${effectiveSpan}`,
                                  gridRow: 1,
                                }}
                                className={`${cStyle.bg} ${cStyle.border} ${
                                  isPastUnfilled ? 'ring-2 ring-rose-500 border-rose-500' : ''
                                } border rounded-xl px-3 py-2 shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between relative group select-none`}
                              >
                                {/* Left Edge Resize Handle */}
                                <div
                                  onMouseDown={(e) => handleStartBlockResize(b, 'start', e)}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Drag left edge to adjust Start Time"
                                  className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center rounded-l-xl hover:bg-persian-600/20 z-20"
                                >
                                  <span className="w-0.5 h-5 bg-slate-400 group-hover:bg-persian-700 rounded-full" />
                                </div>

                                {/* Right Edge Resize Handle */}
                                <div
                                  onMouseDown={(e) => handleStartBlockResize(b, 'end', e)}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Drag right edge to adjust End Time"
                                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center rounded-r-xl hover:bg-persian-600/20 z-20"
                                >
                                  <span className="w-0.5 h-5 bg-slate-400 group-hover:bg-persian-700 rounded-full" />
                                </div>

                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span
                                      className={`text-[9px] font-black uppercase tracking-wider truncate ${cStyle.text}`}
                                    >
                                      {b.clientName}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-persian-800 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200/80 shrink-0">
                                      {timeMeta.shortText}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openManageBlockModal(b, 'duplicate');
                                      }}
                                      className="text-[9px] bg-white hover:bg-persian-50 text-persian-800 border border-slate-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 shadow-2xs cursor-pointer"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>Duplicate</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openManageBlockModal(b, 'edit');
                                      }}
                                      className="text-[9px] bg-white/90 hover:bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                <div className="font-extrabold text-slate-800 text-[11px] truncate mb-1">
                                  {b.styleCode ? `${b.styleCode} — ` : ''}
                                  {b.styleName} ({b.size})
                                </div>

                                <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                                  {/* Inline Click-to-Type Plan Qty */}
                                  {inlineEditBlockId === b.id && inlineEditField === 'plan' ? (
                                    <input
                                      type="number"
                                      min={1}
                                      max={500000}
                                      autoFocus
                                      value={inlineEditValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={(e) => e.currentTarget.select()}
                                      onChange={(e) => setInlineEditValue(e.target.value)}
                                      onBlur={() => commitInlineBlockQtyEdit(b)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          commitInlineBlockQtyEdit(b);
                                        } else if (e.key === 'Escape') {
                                          cancelInlineBlockQtyEdit();
                                        }
                                      }}
                                      className="w-20 bg-white border-2 border-persian-600 rounded px-1.5 py-0.5 text-[10px] font-extrabold font-mono text-persian-900 outline-none"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => startInlineBlockQtyEdit(b, 'plan', e)}
                                      title="Click to type Plan Checking Qty"
                                      className="bg-white/90 hover:bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-extrabold inline-flex items-center gap-1 cursor-text"
                                    >
                                      <span>Plan: {b.planQty}</span>
                                      <Pencil className="w-2.5 h-2.5 text-slate-400" />
                                    </button>
                                  )}

                                  {/* Inline Click-to-Type Actual Checked Qty (Locked for Today/Future) */}
                                  {inlineEditBlockId === b.id && inlineEditField === 'actual' ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={500000}
                                      autoFocus
                                      value={inlineEditValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={(e) => e.currentTarget.select()}
                                      onChange={(e) => setInlineEditValue(e.target.value)}
                                      onBlur={() => commitInlineBlockQtyEdit(b)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          commitInlineBlockQtyEdit(b);
                                        } else if (e.key === 'Escape') {
                                          cancelInlineBlockQtyEdit();
                                        }
                                      }}
                                      className="w-20 bg-white border-2 border-emerald-600 rounded px-1.5 py-0.5 text-[10px] font-extrabold font-mono text-emerald-900 outline-none"
                                    />
                                  ) : isFutureOrToday ? (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showError(
                                          `Actual Checked Qty eka e dawasa (${b.date}) iwara wenakan fill karanna ba! Pahuwada fill karanna.`
                                        );
                                      }}
                                      title="Locked until day ends (Fill Tomorrow / Pahuwada)"
                                      className="bg-slate-200/90 text-slate-600 border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-not-allowed"
                                    >
                                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                                      <span>Act: Tomorrow</span>
                                    </span>
                                  ) : isPastUnfilled ? (
                                    <button
                                      type="button"
                                      onClick={(e) => startInlineBlockQtyEdit(b, 'actual', e)}
                                      title="Click to fill Actual Checked Qty for this past date"
                                      className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded text-[10px] font-extrabold inline-flex items-center gap-1 shadow-xs animate-pulse cursor-text"
                                    >
                                      <span>Fill Act: 0</span>
                                      <Pencil className="w-2.5 h-2.5 text-rose-100" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => startInlineBlockQtyEdit(b, 'actual', e)}
                                      title="Click to update Actual Checked Qty"
                                      className="bg-emerald-700 hover:bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px] font-extrabold inline-flex items-center gap-1 shadow-2xs cursor-text"
                                    >
                                      <span>Act: {b.actualQty}</span>
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
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 1B: DAILY STYLE-WISE DELIVERY PLAN TABLE (PRINTABLE MATRIX)
          ===================================================================== */}
      {subTab === 'deliveryPlan' && (
        <div className="space-y-4">
          <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>

          {/* Interactive Toolbar (Hidden on Print) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft space-y-3 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Daily Style-Wise Delivery Plan Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Style ekata dawasin dawasa Delivery Qty enter karanna • Today Delivery Qty automatically sync wenawa
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-persian-800 hover:bg-persian-600 text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>Print Delivery Plan</span>
                </button>
              </div>
            </div>

            {/* Date Range, Filters & Quick Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 items-center">
              <div className="xl:col-span-4 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setDeliveryPlanStartDate((prev) => addDaysIso(prev || todayStr, -deliveryPlanDays))
                  }
                  title="Previous Period"
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                  <label
                    htmlFor={`${uid}-deliv-start`}
                    className="text-[11px] font-bold text-slate-600"
                  >
                    From:
                  </label>
                  <input
                    id={`${uid}-deliv-start`}
                    type="date"
                    value={deliveryPlanStartDate}
                    onChange={(e) => setDeliveryPlanStartDate(e.target.value || todayStr)}
                    className="bg-transparent text-xs font-bold font-mono text-persian-800 outline-none cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDeliveryPlanStartDate((prev) => addDaysIso(prev || todayStr, deliveryPlanDays))
                  }
                  title="Next Period"
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryPlanStartDate(todayStr)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="xl:col-span-2 flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                {([7, 10, 14] as const).map((daysOpt) => (
                  <button
                    key={daysOpt}
                    type="button"
                    onClick={() => setDeliveryPlanDays(daysOpt)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                      deliveryPlanDays === daysOpt
                        ? 'bg-white text-persian-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {daysOpt} Days
                  </button>
                ))}
              </div>

              <div className="xl:col-span-2">
                <select
                  aria-label="Filter by Company"
                  value={deliveryPlanCompanyFilter}
                  onChange={(e) => setDeliveryPlanCompanyFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search style..."
                  value={deliveryPlanSearch}
                  onChange={(e) => setDeliveryPlanSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                />
              </div>

              <div className="xl:col-span-2 flex items-center justify-end">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deliveryPlanIncludeDone}
                    onChange={(e) => setDeliveryPlanIncludeDone(e.target.checked)}
                    className="rounded border-slate-300 text-persian-600 focus:ring-persian-500 cursor-pointer"
                  />
                  <span>Include Done Styles</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/70 border border-amber-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-amber-900">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Rule: Dawase <strong>Delivery Qty</strong> eka e dawase <strong>Checking Plan Qty</strong> ekata wada wadi wenna one — adu ho samana unoth confirmation alert ekak enawa.
                </span>
              </div>
              <span className="font-mono text-[10px] text-amber-800">
                Type qty &amp; press Enter / click outside to save
              </span>
            </div>
          </div>

          {/* Printable Delivery Plan Sheet */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-soft overflow-hidden print:border-none print:shadow-none print:rounded-none">
            {/* Print-Only Header */}
            <div className="hidden print:flex items-end justify-between border-b-2 border-slate-900 pb-3 mb-4">
              <div>
                <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">
                  Dinusha Embroidery (Pvt) Ltd — Daily Style-Wise Delivery Plan
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Weliweriya Factory • Quality Checking &amp; Dispatch Schedule
                  {deliveryPlanCompanyFilter !== 'ALL' ? ` • Client: ${deliveryPlanCompanyFilter}` : ''}
                </p>
              </div>
              <div className="text-right text-xs font-mono text-slate-700">
                <div className="font-bold">
                  Period: {deliveryPlanDates[0]} to {deliveryPlanDates[deliveryPlanDates.length - 1]}
                </div>
                <div>Printed: {todayStr}</div>
              </div>
            </div>

            {filteredDeliveryPlanRows.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No styles match the current filter. Register styles in Production Management → Style Master.
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300 print:bg-slate-100">
                      <th
                        scope="col"
                        className="p-3 font-extrabold uppercase tracking-wider sticky left-0 z-20 bg-slate-100 border-r-2 border-slate-300 min-w-[230px] print:static print:min-w-[180px]"
                      >
                        Style Name &amp; Order Qty
                      </th>
                      {deliveryPlanDates.map((dStr) => {
                        const meta = formatShortDateMeta(dStr);
                        const isToday = dStr === todayStr;
                        const isViewing = dStr === planDate;
                        return (
                          <th
                            key={dStr}
                            scope="col"
                            className={`p-2 text-center font-extrabold border-r border-slate-200 min-w-[96px] print:min-w-0 print:p-1.5 ${
                              isToday
                                ? 'bg-indigo-100/90 text-indigo-950'
                                : isViewing
                                ? 'bg-persian-50 text-persian-900'
                                : ''
                            }`}
                          >
                            <div className="text-[10px] uppercase tracking-wider opacity-75">
                              {meta.weekday}
                            </div>
                            <div className="text-xs font-black">{meta.dayMonth}</div>
                            <div className="text-[9px] font-mono font-semibold text-slate-500 print:hidden">
                              {dStr}
                            </div>
                            {isToday && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-black uppercase print:bg-transparent print:text-slate-900 print:border print:border-slate-900">
                                Today
                              </span>
                            )}
                          </th>
                        );
                      })}
                      <th
                        scope="col"
                        className="p-2.5 text-right font-extrabold uppercase tracking-wider bg-slate-100 border-l-2 border-slate-300 min-w-[110px] print:min-w-[80px]"
                      >
                        Range Total
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredDeliveryPlanRows.map((row) => {
                      const { style, orderQty } = row;
                      const cStyle = getCompanyColor(style.company);
                      const rangeTotal = deliveryPlanDates.reduce(
                        (sum, dStr) => sum + getDeliveryTargetForStyle(style, dStr),
                        0
                      );
                      const allDatesTotal = getStyleTotalDeliveryPlanned(style);

                      return (
                        <tr key={style.id} className="hover:bg-slate-50/70">
                          {/* Column 1: Style Name */}
                          <th
                            scope="row"
                            className="p-3 sticky left-0 z-10 bg-white border-r-2 border-slate-300 align-middle print:static print:p-2"
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-0.5">
                              <span
                                className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border print:border-slate-400 print:text-slate-800 print:bg-transparent ${cStyle.badge}`}
                              >
                                {style.company}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                Order: {orderQty.toLocaleString()}
                              </span>
                            </div>
                            <div className="font-extrabold text-slate-900 text-xs leading-snug">
                              {style.code ? `${style.code} — ` : ''}
                              {style.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 print:hidden">
                              All Planned: <strong className="text-indigo-700">{allDatesTotal.toLocaleString()}</strong> / {orderQty.toLocaleString()}
                            </div>
                          </th>

                          {/* Date Columns */}
                          {deliveryPlanDates.map((dStr) => {
                            const draftKey = `${style.id}::${dStr}`;
                            const savedVal = getDeliveryTargetForStyle(style, dStr);
                            const dayPlanQty = getStyleDatePlanQty(style, dStr);
                            const displayInputVal =
                              draftKey in deliveryDraftMap
                                ? deliveryDraftMap[draftKey]
                                : savedVal > 0
                                ? String(savedVal)
                                : '';
                            const isToday = dStr === todayStr;
                            const isSavingThis = savingDeliveryCellKey === draftKey;
                            const violatesRule = dayPlanQty > 0 && savedVal <= dayPlanQty;

                            return (
                              <td
                                key={dStr}
                                className={`p-1.5 border-r border-slate-200 text-center align-middle print:p-1.5 ${
                                  isToday ? 'bg-indigo-50/40 print:bg-slate-50' : ''
                                }`}
                              >
                                {/* Interactive Input (Screen Only) */}
                                <div className="print:hidden flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={orderQty || 500000}
                                    placeholder="0"
                                    aria-label={`Delivery Qty for ${style.name} on ${dStr}`}
                                    value={displayInputVal}
                                    disabled={isSavingThis}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) =>
                                      setDeliveryDraftMap((prev) => ({
                                        ...prev,
                                        [draftKey]: e.target.value,
                                      }))
                                    }
                                    onBlur={() => commitDeliveryPlanCell(style, dStr)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.currentTarget.blur();
                                      } else if (e.key === 'Escape') {
                                        clearDeliveryDraftKey(draftKey);
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    className={`w-20 text-center font-mono font-extrabold text-xs rounded-lg px-1.5 py-1.5 border outline-none transition ${
                                      isSavingThis
                                        ? 'bg-slate-100 border-slate-300 text-slate-400'
                                        : violatesRule
                                        ? 'bg-rose-50 border-rose-400 text-rose-900 focus:border-rose-600'
                                        : savedVal > 0
                                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 focus:border-persian-600'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:border-persian-500'
                                    }`}
                                  />
                                  {dayPlanQty > 0 && (
                                    <span
                                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                        violatesRule
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                      title={`Checking Plan Qty on ${dStr}: ${dayPlanQty} Pcs`}
                                    >
                                      Plan: {dayPlanQty}
                                    </span>
                                  )}
                                </div>

                                {/* Crisp Print Value */}
                                <span className="hidden print:inline font-mono font-bold text-slate-900">
                                  {savedVal > 0 ? savedVal.toLocaleString() : '—'}
                                </span>
                              </td>
                            );
                          })}

                          {/* Row Total Column */}
                          <td className="p-2.5 text-right border-l-2 border-slate-300 bg-slate-50/70 align-middle font-mono print:bg-transparent print:p-2">
                            <div className="font-black text-persian-900 text-xs">
                              {rangeTotal.toLocaleString()}
                            </div>
                            <div
                              className={`text-[9px] font-bold print:hidden ${
                                orderQty > 0 && allDatesTotal > orderQty
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {orderQty > 0
                                ? `${Math.round((allDatesTotal / orderQty) * 100)}% of Order`
                                : '—'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="bg-persian-900 text-white font-extrabold border-t-2 border-slate-400 print:bg-slate-200 print:text-slate-900">
                      <th
                        scope="row"
                        className="p-3 text-left uppercase tracking-wider sticky left-0 z-10 bg-persian-900 border-r-2 border-persian-700 print:static print:bg-slate-200 print:border-slate-400"
                      >
                        Daily Total ({filteredDeliveryPlanRows.length} Styles)
                      </th>
                      {deliveryPlanDates.map((dStr) => {
                        const colTotal = filteredDeliveryPlanRows.reduce(
                          (sum, row) => sum + getDeliveryTargetForStyle(row.style, dStr),
                          0
                        );
                        return (
                          <td
                            key={dStr}
                            className="p-2.5 text-center font-mono font-black border-r border-persian-700/60 print:border-slate-300"
                          >
                            {colTotal > 0 ? colTotal.toLocaleString() : '0'}
                          </td>
                        );
                      })}
                      <td className="p-2.5 text-right font-mono font-black border-l-2 border-persian-700 print:border-slate-400">
                        {filteredDeliveryPlanRows
                          .reduce(
                            (grand, row) =>
                              grand +
                              deliveryPlanDates.reduce(
                                (s, dStr) => s + getDeliveryTargetForStyle(row.style, dStr),
                                0
                              ),
                            0
                          )
                          .toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Print-Only Signatures Footer */}
            <div className="hidden print:grid grid-cols-3 gap-12 mt-12 pt-6 px-2 text-xs text-slate-800">
              <div className="text-center">
                <div className="border-t border-slate-700 pt-1.5 font-bold">
                  Prepared By (QC Supervisor)
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-700 pt-1.5 font-bold">
                  Checked By (Production Manager)
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-700 pt-1.5 font-bold">
                  Approved By (Director)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: LIVE FLOOR DISPLAY (READ-ONLY) — FULL-SCREEN 8-CHECKER VIEW
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
                  Floor Checking Monitoring Dashboard ({checkerSlots.length} Checker Slots)
                </h3>
                <p className="text-[10px] text-blue-200 truncate">
                  Live Read-Only QC Floor Display synced with Daily Checking Plan &amp; Delivery Targets
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {/* Compact Inline Daily Checking vs Delivery Target Pill inside Header */}
              <div className="bg-persian-900/80 border border-persian-600/50 rounded-lg px-2.5 py-1 flex items-center gap-2 text-blue-100">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  Checking vs Delivery:
                </span>
                <span className="font-mono font-extrabold text-white">
                  {floorStats.shiftActualTotal.toLocaleString()} /{' '}
                  {floorStats.shiftDeliveryTargetTotal.toLocaleString()} Pcs
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
                  setSubTab('checkingEditor');
                }}
                className="bg-persian-700 hover:bg-persian-600 text-white font-bold px-2.5 py-1 rounded-lg border border-persian-500/60 flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
              >
                <Calendar className="w-3 h-3 text-amber-300" />
                <span>Checking Editor</span>
              </button>
            </div>
          </div>

          {/* All Checkers Simultaneously Fitted in Remaining Viewport Height (`1fr` per checker) */}
          <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-clip">
            {/* Compact Timeline Hours Header */}
            <div className="shrink-0 flex border-b border-slate-200 bg-slate-50 font-semibold text-[11px] text-slate-600">
              <div className="w-64 sm:w-72 px-2.5 py-1 flex items-center justify-between bg-slate-100 border-r border-slate-300 font-bold text-persian-800 uppercase tracking-wider shrink-0">
                <span>Checker Slots ({checkerSlots.length})</span>
                <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-300 font-normal text-slate-500">
                  12 Slots
                </span>
              </div>
              <div className="flex-1 grid grid-cols-11 text-center divide-x divide-slate-200">
                {SHIFT_HOURS.map((h, idx) => (
                  <div
                    key={h.col}
                    className="py-1 px-0.5 flex flex-col items-center justify-center bg-slate-50/90 leading-tight"
                  >
                    <span className="font-bold text-slate-800 text-[10px]">{h.label}</span>
                    <span className="text-[9px] text-slate-400 font-normal">Hour {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checker Rows Grid — Equal Fractional Height so All 12 Slots Fit on One Screen */}
            <div
              className="flex-1 min-h-0 grid divide-y divide-slate-200"
              style={{
                gridTemplateRows: `repeat(${Math.max(1, checkerSlots.length)}, minmax(0, 1fr))`,
              }}
            >
              {checkerSlots.map((st) => {
                const stBlocks = activeDateShiftBlocks.filter(
                  (b) => b.stationId === st.id || b.stationName === st.name
                );
                const stPlan = stBlocks.reduce((sum, b) => sum + b.planQty, 0);
                const stActual = stBlocks.reduce((sum, b) => sum + b.actualQty, 0);
                const compPercent = stPlan > 0 ? Math.round((stActual / stPlan) * 100) : 0;

                const latestBlock = stBlocks[stBlocks.length - 1];
                const assignedEmp =
                  getStationAssignedChecker(st) ||
                  resolveRealEmployeeLabel(latestBlock?.checkerName);
                const hasValidEmp = Boolean(assignedEmp);

                return (
                  <div
                    key={st.id}
                    className="min-h-0 flex items-stretch hover:bg-slate-50/80 transition-colors overflow-clip"
                  >
                    {/* Compact Checker Left Column */}
                    <div className="w-64 sm:w-72 px-2.5 py-1 bg-white border-r border-slate-300 flex flex-col justify-center gap-1 shrink-0 min-w-0">
                      <div className="flex items-center justify-between gap-1 leading-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-slate-800 text-xs tracking-tight truncate">
                            {st.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ${
                              hasValidEmp
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {hasValidEmp ? 'Assigned' : 'Ready'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                          Output: <strong className="text-slate-800">{stActual}</strong>/{stPlan} (
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
                        {hasValidEmp ? (
                          <div
                            title={assignedEmp}
                            className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-semibold truncate"
                          >
                            <UserCheck className="w-2.5 h-2.5 text-persian-600 shrink-0" />
                            <span className="truncate">{assignedEmp}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-semibold shrink-0">
                            <span>Open Slot</span>
                          </div>
                        )}

                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200 shrink-0">
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

                    {/* Compact Right Side 11-Hour Timeline Track */}
                    <div className="flex-1 grid grid-cols-11 relative matrix-grid px-1 py-0.5 gap-1 items-stretch min-h-0 min-w-0">
                      {stBlocks.map((b) => {
                        const cStyle = getCompanyColor(b.clientName);
                        const pct =
                          b.planQty > 0 ? Math.round((b.actualQty / b.planQty) * 100) : 0;

                        return (
                          <div
                            key={b.id}
                            style={{
                              gridColumn: `${b.startHour} / span ${b.spanHours}`,
                              gridRow: 1,
                            }}
                            className={`${cStyle.bg} ${cStyle.border} border rounded-lg px-2.5 py-1 shadow-2xs flex flex-col justify-center gap-0.5 relative min-w-0 overflow-clip leading-tight`}
                          >
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider shrink-0 ${cStyle.text}`}
                                >
                                  {b.clientName}
                                </span>
                                <span className="font-extrabold text-slate-800 text-[11px] tracking-tight truncate">
                                  {b.styleCode ? `${b.styleCode} — ` : ''}
                                  {b.styleName} ({b.size})
                                </span>
                              </div>
                              <span className="text-[9px] font-mono font-bold text-slate-500 shrink-0">
                                {pct}%
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-slate-600 truncate">
                                Plan: {b.planQty}
                              </span>
                              <div className="bg-persian-800 text-white font-extrabold text-[10px] px-2 py-0.2 rounded shadow-2xs shrink-0">
                                Act: {b.actualQty}
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
          TAB 3: DONE CHECKED STYLES (WITH FILTERS)
          ===================================================================== */}
      {subTab === 'doneStyles' && (
        <div className="space-y-5 print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Done Checked Styles ({filteredDoneStylesMetrics.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Styles where Total Checked Actual Qty has reached 100% of Order Qty
                </p>
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
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search style code or name..."
                  value={doneSearchQuery}
                  onChange={(e) => setDoneSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <select
                value={doneCompanyFilter}
                onChange={(e) => setDoneCompanyFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="ALL">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={doneSizeFilter}
                onChange={(e) => setDoneSizeFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="ALL">All Sizes</option>
                {allAvailableSizes.map((sz) => (
                  <option key={sz} value={sz}>
                    Size: {sz}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={doneDateFrom}
                onChange={(e) => setDoneDateFrom(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
              />

              <input
                type="date"
                value={doneDateTo}
                onChange={(e) => setDoneDateTo(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
              />
            </div>

            {filteredDoneStylesMetrics.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No completed QC styles match your filters yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Style Code &amp; Name</th>
                      <th className="p-3.5">Company</th>
                      <th className="p-3.5">Order Qty</th>
                      <th className="p-3.5">Checked Actual Qty</th>
                      <th className="p-3.5">Last Checked Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDoneStylesMetrics.map((item) => (
                      <tr key={item.style.id} className="hover:bg-slate-50">
                        <th scope="row" className="p-3.5 font-extrabold text-slate-800">
                          {item.style.code ? `${item.style.code} — ` : ''}
                          {item.style.name}
                        </th>
                        <td className="p-3.5 font-semibold text-slate-600">
                          {item.style.company}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700">
                          {item.orderQty.toLocaleString()} Pcs
                        </td>
                        <td className="p-3.5 font-mono font-extrabold text-emerald-700">
                          {item.actualDoneQty.toLocaleString()} Pcs (100%)
                        </td>
                        <td className="p-3.5 font-mono text-xs text-slate-500">
                          {item.lastCheckDate || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: 12 CHECKER SLOTS & INTERNAL CHECKER EMPLOYEES
          ===================================================================== */}
      {subTab === 'checkerCrud' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <h3
              id={`${uid}-slot-table-caption`}
              className="font-extrabold mb-3 text-sm uppercase text-slate-700 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-persian-500" />
                Checker Slots ({checkerSlots.length})
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 normal-case">
                Optional Staff Assignment
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Checker 01 sita Checker 12 dakwa slots 12 Checking Matrix ekata kelinma assign karanna puluwan. Awashya nam staff kenek select karala thiyanna.
            </p>
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={`${uid}-slot-table-caption`}
              className="table-region rounded-xl border border-slate-200"
            >
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Slot</th>
                    <th className="p-3">Assigned Staff (Optional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checkerSlots.map((st) => {
                    const assignedEmp = getStationAssignedChecker(st);
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <th scope="row" className="p-3 font-extrabold text-persian-800 bg-white">
                          {st.name}
                        </th>
                        <td className="p-3">
                          <select
                            aria-label={`Assign staff for ${st.name}`}
                            value={assignedEmp}
                            onChange={(e) => handleQuickAssignStationEmployee(st, e.target.value)}
                            className="w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none cursor-pointer border bg-slate-50 border-slate-200 text-slate-800 focus:border-persian-500"
                          >
                            <option value="">-- Open Slot (No Staff) --</option>
                            {activeEmployees.map((emp) => {
                              const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                              const usedInOtherStation = findStationWithEmployee(
                                label,
                                st.id,
                                st.name
                              );
                              return (
                                <option
                                  key={emp.id}
                                  value={label}
                                  disabled={Boolean(usedInOtherStation)}
                                >
                                  {label}
                                  {usedInOtherStation ? ` (In ${usedInOtherStation.name})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 h-fit">
            <h3
              id={`${uid}-employee-checkers-caption`}
              className="font-extrabold mb-3 text-sm uppercase text-slate-600 flex items-center justify-between"
            >
              <span>Our Checker Employees ({checkerEmployees.length})</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 normal-case">
                Synced from Employees
              </span>
            </h3>
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={`${uid}-employee-checkers-caption`}
              className="table-region rounded-xl border border-slate-200"
            >
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3.5">Checker Employee</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Assigned Slot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checkerEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-xs text-slate-500 text-center">
                        Employees list eke &quot;Checker&quot; / &quot;Final quality Checker&quot;
                        role ekak thiyana staff kenek thama na.
                      </td>
                    </tr>
                  ) : (
                    checkerEmployees.map((emp) => {
                      const assignedStation = getEmployeeCheckerStation(emp);
                      const empLabel = `EPF #${emp.epfNo} - ${emp.fullName}`;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <th scope="row" className="p-3.5 font-bold text-slate-800 bg-white">
                            <div className="flex items-center gap-2">
                              <span>{empLabel}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Staff
                              </span>
                            </div>
                          </th>
                          <td className="p-3.5 text-xs text-slate-600 font-medium">
                            {emp.role}
                          </td>
                          <td className="p-3.5 text-xs">
                            {assignedStation ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {assignedStation.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">Unassigned</span>
                            )}
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
          NATIVE <dialog> MODAL: MANAGE OR DUPLICATE QUALITY CHECKING BLOCK
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
                      Duplicate Checking Block
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4 text-amber-400" />
                      Update Checking Actuals &amp; Block
                    </>
                  )}
                </h2>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  {modalStationName || editingBlock.stationName} — {editingBlock.clientName} (
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
                    htmlFor={`${uid}-modal-station`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Target Checker Slot *
                  </label>
                  <select
                    id={`${uid}-modal-station`}
                    value={modalStationName}
                    onChange={(e) => {
                      const nextStName = e.target.value;
                      setModalStationName(nextStName);
                      const nextSt = checkerSlots.find((c) => c.name === nextStName);
                      setModalCheckerEmp(getStationAssignedChecker(nextSt));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-persian-800"
                  >
                    {checkerSlots.map((c) => {
                      const cEmp = getStationAssignedChecker(c);
                      return (
                        <option key={c.id} value={c.name}>
                          {c.name}
                          {cEmp ? ` — ${cEmp}` : ''}
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
                    Plan Checking Qty (Pcs) *
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
                            ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                            : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
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
                        {h.label} ({h.short})
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                  >
                    {editingBlockStyleSizes.length === 0 ? (
                      <option value={modalSize || 'Free Size'}>
                        {modalSize || 'Free Size'}
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
                    htmlFor={`${uid}-modal-checker`}
                    className="block text-[10px] font-bold text-slate-600 mb-1"
                  >
                    Assigned Checker (Optional)
                  </label>
                  <select
                    id={`${uid}-modal-checker`}
                    value={modalCheckerEmp}
                    onChange={(e) => setModalCheckerEmp(e.target.value)}
                    className="w-full rounded-lg p-2 text-xs font-semibold outline-none bg-slate-50 border border-slate-300 text-slate-800"
                  >
                    <option value="">-- Optional: Assign Staff --</option>
                    {activeEmployees.map((emp) => {
                      const label = `EPF #${emp.epfNo} - ${emp.fullName}`;
                      const targetSt = checkerSlots.find(
                        (c) => c.name === (modalStationName || editingBlock.stationName)
                      );
                      const usedInOtherStation = findStationWithEmployee(
                        label,
                        targetSt?.id,
                        modalStationName || editingBlock.stationName
                      );
                      return (
                        <option
                          key={emp.id}
                          value={label}
                          disabled={Boolean(usedInOtherStation)}
                        >
                          {label}
                          {usedInOtherStation ? ` (In ${usedInOtherStation.name})` : ''}
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
                    className="w-2/3 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate to {modalStationName}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDeleteBlock}
                    disabled={isSubmitting}
                    className="w-1/4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('duplicate')}
                    disabled={isSubmitting}
                    className="w-1/4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/4 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    Update &amp; Save
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </dialog>

      {/* =====================================================================
          NATIVE <dialog> ALERT: TODAY DELIVERY QTY MUST EXCEED TODAY PLAN QTY
          ===================================================================== */}
      <dialog
        ref={deliveryAlertDialogRef}
        aria-labelledby={`${uid}-delivery-alert-title`}
        onCancel={(e) => {
          e.preventDefault();
          closeDeliveryAlertDialog(true);
        }}
        className="m-auto rounded-2xl border-2 border-rose-300 shadow-2xl w-full max-w-md p-0 overflow-hidden bg-white text-slate-900"
      >
        {pendingDeliveryAlert && (
          <div>
            <div className="bg-rose-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <h2 id={`${uid}-delivery-alert-title`} className="font-extrabold text-sm">
                    Delivery Qty Alert — Confirmation Required
                  </h2>
                  <p className="text-[11px] text-rose-100">
                    {pendingDeliveryAlert.style.code
                      ? `${pendingDeliveryAlert.style.code} — `
                      : ''}
                    {pendingDeliveryAlert.style.name} ({pendingDeliveryAlert.date})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => closeDeliveryAlertDialog(true)}
                aria-label="Close alert"
                className="w-7 h-7 rounded-lg bg-rose-700/70 text-rose-100 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {pendingDeliveryAlert.kind === 'delivery' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase text-rose-600 block">
                        Entered Delivery Qty
                      </span>
                      <span className="font-mono font-black text-lg text-rose-800">
                        {pendingDeliveryAlert.nextDeliveryQty.toLocaleString()} Pcs
                      </span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase text-amber-700 block">
                        Day&apos;s Checking Plan Qty
                      </span>
                      <span className="font-mono font-black text-lg text-amber-900">
                        {pendingDeliveryAlert.dayPlanQty.toLocaleString()} Pcs
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <strong>Today Delivery Qty ({pendingDeliveryAlert.nextDeliveryQty.toLocaleString()} Pcs)</strong> eka{' '}
                    <strong>Today Plan Qty ({pendingDeliveryAlert.dayPlanQty.toLocaleString()} Pcs)</strong> ekata wada aniwaaryen wadi wenna one!
                    <br />
                    <span className="text-rose-700 font-bold block mt-1.5">
                      Ehema nathuwa me widihata update karanna oyata sure da?
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase text-indigo-600 block">
                        Day&apos;s Delivery Qty
                      </span>
                      <span className="font-mono font-black text-lg text-indigo-800">
                        {pendingDeliveryAlert.dayDeliveryQty.toLocaleString()} Pcs
                      </span>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase text-rose-600 block">
                        New Day Plan Total
                      </span>
                      <span className="font-mono font-black text-lg text-rose-800">
                        {pendingDeliveryAlert.newDayPlanTotal.toLocaleString()} Pcs
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
                    Me checking plan eka dammoth <strong>Today Plan Qty ({pendingDeliveryAlert.newDayPlanTotal.toLocaleString()} Pcs)</strong> eka,{' '}
                    <strong>Today Delivery Qty ({pendingDeliveryAlert.dayDeliveryQty.toLocaleString()} Pcs)</strong> ekata samana ho wadi wenawa!
                    <br />
                    <span className="text-rose-700 font-bold block mt-1.5">
                      Today Delivery Qty eka Today Plan Qty ekata wada wadi wenna one. Digatama schedule karanna oyata sure da?
                    </span>
                  </p>
                </>
              )}

              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => closeDeliveryAlertDialog(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition cursor-pointer"
                >
                  Cancel (No)
                </button>
                <button
                  type="button"
                  onClick={confirmDeliveryAlertDialog}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition cursor-pointer"
                >
                  Yes, I&apos;m Sure — Proceed
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
