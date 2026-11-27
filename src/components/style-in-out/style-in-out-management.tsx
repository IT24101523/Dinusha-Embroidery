'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ProductionBundle, StyleMasterEntity } from '@/actions/production';
import { EmployeeEntity } from '@/modules/payroll/domain/entities';
import {
  StyleInOutBundle,
  StyleInBatchEntity,
  StyleBundleEntity,
  StyleDespatchEntity,
  BundleMdStatus,
  BundleWorkflowStatus,
  createStyleInBatchAction,
  deleteStyleInBatchAction,
  updateStyleBundleCheckAction,
  bulkUpdateStyleBundlesStatusAction,
  deleteStyleBundleAction,
  createStyleDespatchAction,
  deleteStyleDespatchAction,
} from '@/actions/style-in-out';
import {
  StyleInOutPrintModal,
  StyleInOutPrintPayload,
} from './style-in-out-print-sheets';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Layers,
  Truck,
  Sparkles,
  FileText,
  ShieldCheck,
  Filter,
  X,
  RefreshCw,
} from 'lucide-react';

export type StyleInOutSubTab = 'overview' | 'cutIn' | 'bundleCheck' | 'despatchOut';

interface StyleInOutManagementProps {
  employees: EmployeeEntity[];
  productionBundle: ProductionBundle;
  initialStyleInOutBundle: StyleInOutBundle;
  onBundleChange?: (updated: StyleInOutBundle) => void;
  externalSubTab?: StyleInOutSubTab;
}

interface DraftCutInBundleRow {
  rowKey: string;
  cutNo: string;
  bundleNo: string;
  ratio: string;
  noRange: string;
  partName: string;
  size: string;
  tagQty: number;
  fabDamageQty: number;
  printDamageQty: number;
  remarks: string;
}

const ALL_PARTS_VALUE = 'All Parts';
const LOCAL_STORAGE_KEY = 'dinusha_style_in_out_v1';

function bundleMatchesPartFilter(bundlePartName: string, filterPart: string): boolean {
  if (filterPart === 'ALL') return true;
  const raw = (bundlePartName || '').trim();
  const rawLower = raw.toLowerCase();
  const targetLower = filterPart.trim().toLowerCase();
  if (filterPart === ALL_PARTS_VALUE) {
    return rawLower === 'all parts' || rawLower === '';
  }
  if (rawLower === 'all parts' || rawLower === '') return true;
  const tokens = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  return tokens.includes(targetLower);
}

function makeLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function makeEmptyRow(cutNo = '', size = '', partName = ALL_PARTS_VALUE): DraftCutInBundleRow {
  return {
    rowKey: makeLocalId('row'),
    cutNo,
    bundleNo: '',
    ratio: '',
    noRange: '',
    partName,
    size,
    tagQty: 0,
    fabDamageQty: 0,
    printDamageQty: 0,
    remarks: '',
  };
}

export function StyleInOutManagement({
  employees,
  productionBundle,
  initialStyleInOutBundle,
  onBundleChange,
  externalSubTab,
}: StyleInOutManagementProps) {
  const { styles, companies } = productionBundle;
  const activeStyles = useMemo(
    () => styles.filter((s) => !s.isCompleted && s.isActive !== false),
    [styles]
  );

  const [subTab, setSubTab] = useState<StyleInOutSubTab>(externalSubTab || 'overview');
  useEffect(() => {
    if (externalSubTab) setSubTab(externalSubTab);
  }, [externalSubTab]);

  const [cloudReady, setCloudReady] = useState<boolean>(initialStyleInOutBundle.cloudReady);
  const [batches, setBatches] = useState<StyleInBatchEntity[]>(initialStyleInOutBundle.batches);
  const [bundles, setBundles] = useState<StyleBundleEntity[]>(initialStyleInOutBundle.bundles);
  const [despatches, setDespatches] = useState<StyleDespatchEntity[]>(
    initialStyleInOutBundle.despatches
  );

  // Hydrate localStorage fallback if cloud tables are not yet created
  useEffect(() => {
    if (initialStyleInOutBundle.cloudReady) return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StyleInOutBundle>;
        if (Array.isArray(parsed.batches)) setBatches(parsed.batches);
        if (Array.isArray(parsed.bundles)) setBundles(parsed.bundles);
        if (Array.isArray(parsed.despatches)) setDespatches(parsed.despatches);
      }
    } catch {
      // ignore localStorage parse errors
    }
  }, [initialStyleInOutBundle.cloudReady]);

  // Persist local fallback & notify parent
  useEffect(() => {
    onBundleChange?.({ cloudReady, batches, bundles, despatches });
    if (!cloudReady) {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({ batches, bundles, despatches })
        );
      } catch {
        // ignore storage quota errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudReady, batches, bundles, despatches]);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [printPayload, setPrintPayload] = useState<StyleInOutPrintPayload | null>(null);

  const showSuccess = (text: string) => setStatusMsg({ type: 'success', text });
  const showError = (text: string) => setStatusMsg({ type: 'error', text });

  const todayStr = useMemo(() => getTodayIso(), []);
  const staffOptions = useMemo(
    () => employees.filter((e) => e.isActive !== false),
    [employees]
  );

  // Auto-increment serial helpers
  const nextBatchNo = useMemo(
    () => `IN-${String(batches.length + 1).padStart(4, '0')}`,
    [batches.length]
  );
  const nextDespatchSeq = useMemo(() => despatches.length + 1, [despatches.length]);

  // ============================================================================
  // STYLE-WISE IN / OUT SUMMARY (MAINLY LINKED TO STYLE CRUD)
  // ============================================================================
  const despatchById = useMemo(() => {
    const map = new Map<string, StyleDespatchEntity>();
    for (const d of despatches) map.set(d.id, d);
    return map;
  }, [despatches]);

  const styleBalanceRows = useMemo(() => {
    const map = new Map<
      string,
      {
        style: StyleMasterEntity;
        orderQty: number;
        totalInQty: number;
        inHouseQty: number;
        readyQty: number;
        outQty: number;
        edQty: number;
        mdQty: number;
        bundleCount: number;
        inHouseBundles: number;
        readyBundles: number;
        outBundles: number;
        sizeMap: Map<string, { inQty: number; outQty: number; readyQty: number }>;
        partMap: Map<
          string,
          {
            orderQty: number;
            inQty: number;
            inHouseQty: number;
            readyQty: number;
            outQty: number;
            sizeInMap: Map<string, number>;
          }
        >;
      }
    >();

    for (const s of activeStyles) {
      const sizeMap = new Map<string, { inQty: number; outQty: number; readyQty: number }>();
      for (const sz of s.sizeBreakdown || []) {
        if (sz.size) sizeMap.set(sz.size, { inQty: 0, outQty: 0, readyQty: 0 });
      }
      const partMap = new Map<
        string,
        {
          orderQty: number;
          inQty: number;
          inHouseQty: number;
          readyQty: number;
          outQty: number;
          sizeInMap: Map<string, number>;
        }
      >();
      for (const part of s.parts || []) {
        const pName = (part.name || '').trim();
        if (pName) {
          partMap.set(pName, {
            orderQty: part.qty > 0 ? part.qty : s.qty,
            inQty: 0,
            inHouseQty: 0,
            readyQty: 0,
            outQty: 0,
            sizeInMap: new Map<string, number>(),
          });
        }
      }
      map.set(s.id, {
        style: s,
        orderQty: s.qty,
        totalInQty: 0,
        inHouseQty: 0,
        readyQty: 0,
        outQty: 0,
        edQty: 0,
        mdQty: 0,
        bundleCount: 0,
        inHouseBundles: 0,
        readyBundles: 0,
        outBundles: 0,
        sizeMap,
        partMap,
      });
    }

    for (const b of bundles) {
      const matched =
        (b.styleId && map.get(b.styleId)) ||
        Array.from(map.values()).find(
          (item) =>
            (b.styleCode && item.style.code === b.styleCode) ||
            item.style.name.trim().toLowerCase() === b.styleName.trim().toLowerCase()
        );
      if (!matched) continue;

      matched.bundleCount += 1;
      matched.totalInQty += b.tagQty;
      matched.edQty += b.edQty;
      matched.mdQty += b.mdQty;

      const szKey = b.size || 'Free Size';
      const szEntry = matched.sizeMap.get(szKey) || { inQty: 0, outQty: 0, readyQty: 0 };
      szEntry.inQty += b.tagQty;

      const qtyEff = b.goodQty || b.tagQty;
      if (b.status === 'DISPATCHED') {
        matched.outQty += qtyEff;
        matched.outBundles += 1;
        szEntry.outQty += qtyEff;
      } else if (b.status === 'READY_FOR_OUT') {
        matched.readyQty += qtyEff;
        matched.readyBundles += 1;
        szEntry.readyQty += qtyEff;
      } else {
        matched.inHouseQty += qtyEff;
        matched.inHouseBundles += 1;
      }
      matched.sizeMap.set(szKey, szEntry);

      // Credit Part-Wise Balance (All Parts credits every part; specific part credits that part)
      const rawPart = (b.partName || '').trim();
      const rawLower = rawPart.toLowerCase();
      let targetParts: string[] = [];
      if (!rawPart || rawLower === 'all parts') {
        targetParts = Array.from(matched.partMap.keys());
      } else {
        const tokens = rawPart.split(',').map((t) => t.trim()).filter(Boolean);
        for (const tok of tokens) {
          const foundKey = Array.from(matched.partMap.keys()).find(
            (k) => k.toLowerCase() === tok.toLowerCase()
          );
          if (foundKey) {
            targetParts.push(foundKey);
          } else {
            matched.partMap.set(tok, {
              orderQty: matched.orderQty,
              inQty: 0,
              inHouseQty: 0,
              readyQty: 0,
              outQty: 0,
              sizeInMap: new Map<string, number>(),
            });
            targetParts.push(tok);
          }
        }
      }

      for (const pKey of targetParts) {
        const pEntry = matched.partMap.get(pKey);
        if (!pEntry) continue;
        pEntry.inQty += b.tagQty;
        pEntry.sizeInMap.set(szKey, (pEntry.sizeInMap.get(szKey) || 0) + b.tagQty);
        if (b.status === 'DISPATCHED') pEntry.outQty += qtyEff;
        else if (b.status === 'READY_FOR_OUT') pEntry.readyQty += qtyEff;
        else pEntry.inHouseQty += qtyEff;
      }
    }

    return Array.from(map.values());
  }, [activeStyles, bundles]);

  const globalTotals = useMemo(() => {
    let totalIn = 0;
    let inHouse = 0;
    let ready = 0;
    let dispatched = 0;
    for (const b of bundles) {
      totalIn += b.tagQty;
      if (b.status === 'DISPATCHED') dispatched += b.goodQty || b.tagQty;
      else if (b.status === 'READY_FOR_OUT') ready += b.goodQty || b.tagQty;
      else inHouse += b.goodQty || b.tagQty;
    }
    return {
      totalIn,
      inHouse,
      ready,
      dispatched,
      totalBundles: bundles.length,
      totalDespatches: despatches.length,
    };
  }, [bundles, despatches.length]);

  // ============================================================================
  // TAB 1: UNIVERSAL BUNDLE SEARCH & FILTER STATES
  // ============================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterStyleId, setFilterStyleId] = useState('ALL');
  const [filterPart, setFilterPart] = useState('ALL');
  const [filterSize, setFilterSize] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | BundleWorkflowStatus>('ALL');
  const [filterMdStatus, setFilterMdStatus] = useState<'ALL' | BundleMdStatus>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const allBundleSizes = useMemo(() => {
    const set = new Set<string>();
    for (const b of bundles) {
      if (b.size.trim()) set.add(b.size.trim());
    }
    for (const s of activeStyles) {
      for (const sz of s.sizeBreakdown || []) {
        if (sz.size.trim()) set.add(sz.size.trim());
      }
    }
    return Array.from(set);
  }, [bundles, activeStyles]);

  const allBundleParts = useMemo(() => {
    const set = new Set<string>();
    for (const s of activeStyles) {
      for (const p of s.parts || []) {
        if (p.name && p.name.trim()) set.add(p.name.trim());
      }
    }
    for (const b of bundles) {
      const raw = (b.partName || '').trim();
      if (raw && raw.toLowerCase() !== 'all parts') {
        for (const tok of raw.split(',').map((t) => t.trim()).filter(Boolean)) {
          set.add(tok);
        }
      }
    }
    return Array.from(set);
  }, [activeStyles, bundles]);

  const filteredOverviewBundles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bundles.filter((b) => {
      if (
        filterCompany !== 'ALL' &&
        b.companyName.trim().toLowerCase() !== filterCompany.trim().toLowerCase()
      ) {
        return false;
      }
      if (filterStyleId !== 'ALL') {
        const targetStyle = styles.find((s) => s.id === filterStyleId);
        const matchesStyle =
          b.styleId === filterStyleId ||
          (targetStyle &&
            ((targetStyle.code && b.styleCode === targetStyle.code) ||
              b.styleName.trim().toLowerCase() === targetStyle.name.trim().toLowerCase()));
        if (!matchesStyle) return false;
      }
      if (!bundleMatchesPartFilter(b.partName, filterPart)) return false;
      if (filterSize !== 'ALL' && b.size.trim().toLowerCase() !== filterSize.trim().toLowerCase()) {
        return false;
      }
      if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
      if (filterMdStatus !== 'ALL' && b.mdStatus !== filterMdStatus) return false;
      if (filterDateFrom && b.receivedDate < filterDateFrom) return false;
      if (filterDateTo && b.receivedDate > filterDateTo) return false;

      if (q) {
        const desp = b.despatchId ? despatchById.get(b.despatchId) : null;
        const haystack = [
          b.bundleNo,
          b.cutNo,
          b.jobNo,
          b.noRange,
          b.size,
          b.styleCode,
          b.styleName,
          b.companyName,
          b.partName,
          b.remarks,
          desp?.despatchNo || '',
          desp?.gatepassNo || '',
          desp?.checklistNo || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    bundles,
    searchQuery,
    filterCompany,
    filterStyleId,
    filterPart,
    filterSize,
    filterStatus,
    filterMdStatus,
    filterDateFrom,
    filterDateTo,
    styles,
    despatchById,
  ]);

  // ============================================================================
  // TAB 2: CUT IN / PARTIAL BUNDLE RECEIVING FORM STATES
  // ============================================================================
  const [cutInStyleId, setCutInStyleId] = useState<string>(activeStyles[0]?.id || '');
  const [cutInDate, setCutInDate] = useState<string>(todayStr);
  const [cutInBatchNo, setCutInBatchNo] = useState<string>('');
  const [cutInCutNo, setCutInCutNo] = useState<string>('');
  const [cutInColor, setCutInColor] = useState<string>('');
  const [cutInClientRef, setCutInClientRef] = useState<string>('');
  const [cutInDefaultPart, setCutInDefaultPart] = useState<string>(ALL_PARTS_VALUE);
  const [cutInReceivedBy, setCutInReceivedBy] = useState<string>('');
  const [cutInCheckedBy, setCutInCheckedBy] = useState<string>('');
  const [cutInRemarks, setCutInRemarks] = useState<string>('');
  const [cutInRows, setCutInRows] = useState<DraftCutInBundleRow[]>([makeEmptyRow()]);

  // Quick Range Generator States (for fast client Numbering Sheet entry!)
  const [showRangeGen, setShowRangeGen] = useState(false);
  const [genStartBundle, setGenStartBundle] = useState<number>(1);
  const [genCount, setGenCount] = useState<number>(5);
  const [genPart, setGenPart] = useState<string>(ALL_PARTS_VALUE);
  const [genSize, setGenSize] = useState<string>('');
  const [genQty, setGenQty] = useState<number>(100);
  const [genStartNo, setGenStartNo] = useState<string>('');
  const [genRatios, setGenRatios] = useState<string>('A,B,C');

  const selectedCutInStyle = useMemo(
    () => activeStyles.find((s) => s.id === cutInStyleId) || null,
    [activeStyles, cutInStyleId]
  );

  const selectedCutInStyleSizes = useMemo(
    () =>
      (selectedCutInStyle?.sizeBreakdown || []).filter(
        (sz) => sz.size && sz.size.trim().length > 0
      ),
    [selectedCutInStyle]
  );

  const selectedCutInStyleParts = useMemo(
    () =>
      Array.from(
        new Set(
          (selectedCutInStyle?.parts || [])
            .map((p) => (p.name || '').trim())
            .filter(Boolean)
        )
      ),
    [selectedCutInStyle]
  );

  const buildRowsFromStyleSizes = (
    styleObj: StyleMasterEntity | null,
    cutNoVal = '',
    partVal = ALL_PARTS_VALUE
  ) => {
    const sizes = (styleObj?.sizeBreakdown || []).filter(
      (sz) => sz.size && sz.size.trim().length > 0
    );
    if (sizes.length > 0) {
      return sizes.map((sz) => makeEmptyRow(cutNoVal, sz.size.trim(), partVal));
    }
    return [makeEmptyRow(cutNoVal, '', partVal)];
  };

  // Sync style defaults & auto-load all Style CRUD sizes when style changes
  useEffect(() => {
    if (!selectedCutInStyle) return;
    setCutInColor(selectedCutInStyle.fabric || '');
    const styleParts = (selectedCutInStyle.parts || [])
      .map((p) => (p.name || '').trim())
      .filter(Boolean);
    const initialPart = styleParts.length === 1 ? styleParts[0] : ALL_PARTS_VALUE;
    setCutInDefaultPart(initialPart);
    setGenPart(initialPart);
    const defaultSize = selectedCutInStyle.sizeBreakdown?.[0]?.size || '';
    setGenSize(defaultSize);
    setCutInRows(buildRowsFromStyleSizes(selectedCutInStyle, '', initialPart));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCutInStyle?.id]);

  const cutInStyleBalance = useMemo(() => {
    if (!selectedCutInStyle) return null;
    return styleBalanceRows.find((r) => r.style.id === selectedCutInStyle.id) || null;
  }, [selectedCutInStyle, styleBalanceRows]);

  const cutInDraftQtyBySize = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of cutInRows) {
      const key = r.size.trim();
      if (!key) continue;
      if (
        cutInDefaultPart !== ALL_PARTS_VALUE &&
        !bundleMatchesPartFilter(r.partName, cutInDefaultPart)
      ) {
        continue;
      }
      map.set(key, (map.get(key) || 0) + Math.max(0, Number(r.tagQty) || 0));
    }
    return map;
  }, [cutInRows, cutInDefaultPart]);

  const cutInDraftTotalQty = useMemo(
    () => cutInRows.reduce((sum, r) => sum + Math.max(0, Number(r.tagQty) || 0), 0),
    [cutInRows]
  );

  // Detect Excess (+Extra) Cut-In per Size & Overall so extra pieces are always clearly noted (never blocked!)
  const cutInExcessSummary = useMemo(() => {
    const excessSizes: Array<{ size: string; orderQty: number; totalIn: number; extraQty: number }> = [];
    for (const sz of selectedCutInStyleSizes) {
      const alreadyIn =
        cutInDefaultPart !== ALL_PARTS_VALUE
          ? cutInStyleBalance?.partMap.get(cutInDefaultPart)?.sizeInMap.get(sz.size) || 0
          : cutInStyleBalance?.sizeMap.get(sz.size)?.inQty || 0;
      const thisBatch = cutInDraftQtyBySize.get(sz.size) || 0;
      const totalIn = alreadyIn + thisBatch;
      if (sz.qty > 0 && totalIn > sz.qty) {
        excessSizes.push({
          size: sz.size,
          orderQty: sz.qty,
          totalIn,
          extraQty: totalIn - sz.qty,
        });
      }
    }

    const baseOrderQty =
      cutInDefaultPart !== ALL_PARTS_VALUE
        ? cutInStyleBalance?.partMap.get(cutInDefaultPart)?.orderQty ||
          cutInStyleBalance?.orderQty ||
          0
        : cutInStyleBalance?.orderQty || 0;
    const baseAlreadyIn =
      cutInDefaultPart !== ALL_PARTS_VALUE
        ? cutInStyleBalance?.partMap.get(cutInDefaultPart)?.inQty || 0
        : cutInStyleBalance?.totalInQty || 0;
    const projectedTotalIn = baseAlreadyIn + cutInDraftTotalQty;
    const overallVariance = projectedTotalIn - baseOrderQty; // >0 EXTRA, <0 SHORT/PENDING

    return {
      excessSizes,
      baseOrderQty,
      baseAlreadyIn,
      projectedTotalIn,
      overallVariance,
    };
  }, [
    selectedCutInStyleSizes,
    cutInDefaultPart,
    cutInStyleBalance,
    cutInDraftQtyBySize,
    cutInDraftTotalQty,
  ]);

  const handleGenerateBundleRange = () => {
    const count = Math.min(100, Math.max(1, Math.round(genCount)));
    const qty = Math.max(1, Math.round(genQty));
    const ratioList = genRatios
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const startSerial = genStartNo.trim() ? parseInt(genStartNo.trim(), 10) : NaN;
    const sizeVal =
      genSize.trim() || selectedCutInStyle?.sizeBreakdown?.[0]?.size || 'Free Size';
    const partVal = genPart || cutInDefaultPart || ALL_PARTS_VALUE;

    const generated: DraftCutInBundleRow[] = [];
    for (let i = 0; i < count; i++) {
      const bNum = genStartBundle + i;
      const rangeStr = !Number.isNaN(startSerial)
        ? `${startSerial + i * qty} - ${startSerial + (i + 1) * qty - 1}`
        : '';
      generated.push({
        rowKey: makeLocalId('gen'),
        cutNo: cutInCutNo.trim(),
        bundleNo: String(bNum),
        ratio: ratioList.length > 0 ? ratioList[i % ratioList.length] : '',
        noRange: rangeStr,
        partName: partVal,
        size: sizeVal,
        tagQty: qty,
        fabDamageQty: 0,
        printDamageQty: 0,
        remarks: '',
      });
    }

    setCutInRows((prev) => {
      const cleaned = prev.filter((r) => r.bundleNo.trim() !== '' || r.tagQty > 0);
      return [...cleaned, ...generated];
    });
    setGenStartBundle((prev) => prev + count);
    if (!Number.isNaN(startSerial)) {
      setGenStartNo(String(startSerial + count * qty));
    }
    setShowRangeGen(false);
    showSuccess(
      `Generated ${count} bundle rows (${generated[0].bundleNo} – ${generated[generated.length - 1].bundleNo}) for ${partVal} / Size ${sizeVal}.`
    );
  };

  const handleSaveCutInBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!selectedCutInStyle) {
      showError('Please select a Style from Style Master first.');
      return;
    }

    const validRows = cutInRows.filter((r) => r.bundleNo.trim() && Number(r.tagQty) > 0);
    if (validRows.length === 0) {
      showError('Please add at least one bundle row with Bundle No and Tag Qty > 0.');
      return;
    }

    setSaving(true);
    const effectiveBatchNo = cutInBatchNo.trim() || nextBatchNo;
    const distinctPartsInBatch = Array.from(
      new Set(validRows.map((r) => (r.partName || cutInDefaultPart || ALL_PARTS_VALUE).trim()))
    );
    const partsNote = distinctPartsInBatch.join(', ');

    // Automatically record Excess Cut-In note if any size or total exceeds Order Qty
    const autoExcessNote =
      cutInExcessSummary.excessSizes.length > 0
        ? `Excess In: ${cutInExcessSummary.excessSizes
            .map((ex) => `${ex.size} (+${ex.extraQty} Extra)`)
            .join(', ')}`
        : cutInExcessSummary.overallVariance > 0
        ? `Excess In: +${cutInExcessSummary.overallVariance} Extra`
        : '';
    const finalBatchRemarks = [cutInRemarks.trim(), autoExcessNote].filter(Boolean).join(' | ');

    const payload = {
      batchNo: effectiveBatchNo,
      receivedDate: cutInDate || todayStr,
      styleId: selectedCutInStyle.id,
      styleCode: selectedCutInStyle.code,
      styleName: selectedCutInStyle.name,
      companyName: selectedCutInStyle.company,
      cutNo: cutInCutNo.trim(),
      color: cutInColor.trim(),
      partsNote,
      clientRefNo: cutInClientRef.trim(),
      receivedBy: cutInReceivedBy.trim(),
      checkedBy: cutInCheckedBy.trim(),
      remarks: finalBatchRemarks,
      bundles: validRows.map((r) => ({
        cutNo: r.cutNo.trim() || cutInCutNo.trim(),
        jobNo: r.cutNo.trim() || cutInCutNo.trim(),
        bundleNo: r.bundleNo.trim(),
        ratio: r.ratio.trim(),
        noRange: r.noRange.trim(),
        size: r.size.trim() || selectedCutInStyle.sizeBreakdown?.[0]?.size || 'Free Size',
        partName: (r.partName || cutInDefaultPart || ALL_PARTS_VALUE).trim(),
        tagQty: Math.max(0, Math.round(Number(r.tagQty) || 0)),
        fabDamageQty: 0,
        printDamageQty: 0,
        remarks: '',
      })),
    };

    const res = await createStyleInBatchAction(payload);
    setSaving(false);

    if (res.success && res.batch && res.bundles) {
      setCloudReady(true);
      setBatches((prev) => [res.batch!, ...prev]);
      setBundles((prev) => [...res.bundles!, ...prev]);
    } else if (res.cloudReady === false || res.error === 'CLOUD_TABLE_MISSING') {
      // Seamless local mode
      setCloudReady(false);
      const localBatchId = makeLocalId('batch');
      const nowIso = new Date().toISOString();
      const newBatch: StyleInBatchEntity = {
        id: localBatchId,
        batchNo: payload.batchNo,
        receivedDate: payload.receivedDate,
        styleId: payload.styleId,
        styleCode: payload.styleCode,
        styleName: payload.styleName,
        companyName: payload.companyName,
        cutNo: payload.cutNo,
        color: payload.color,
        partsNote: payload.partsNote,
        clientRefNo: payload.clientRefNo,
        receivedBy: payload.receivedBy,
        checkedBy: payload.checkedBy,
        remarks: payload.remarks,
        createdAt: nowIso,
      };
      const newBundles: StyleBundleEntity[] = payload.bundles.map((b) => ({
        id: makeLocalId('bun'),
        batchId: localBatchId,
        styleId: payload.styleId,
        styleCode: payload.styleCode,
        styleName: payload.styleName,
        companyName: payload.companyName,
        receivedDate: payload.receivedDate,
        cutNo: b.cutNo,
        jobNo: b.jobNo,
        bundleNo: b.bundleNo,
        ratio: b.ratio,
        noRange: b.noRange,
        size: b.size,
        partName: b.partName,
        tagQty: b.tagQty,
        goodQty: Math.max(0, b.tagQty - b.fabDamageQty - b.printDamageQty),
        mdQty: 0,
        edQty: 0,
        fabDamageQty: b.fabDamageQty,
        printDamageQty: b.printDamageQty,
        mdStatus: 'PENDING',
        status: 'IN_HOUSE',
        checkedBy: payload.checkedBy,
        checkedDate: null,
        despatchId: null,
        remarks: b.remarks,
        createdAt: nowIso,
      }));
      setBatches((prev) => [newBatch, ...prev]);
      setBundles((prev) => [...newBundles, ...prev]);
    } else {
      showError(res.error || 'Failed to save Cut-In batch.');
      return;
    }

    const totalSavedQty = payload.bundles.reduce((s, b) => s + b.tagQty, 0);
    setCutInBatchNo('');
    setCutInCutNo('');
    setCutInClientRef('');
    setCutInRemarks('');
    setCutInRows(buildRowsFromStyleSizes(selectedCutInStyle, '', cutInDefaultPart));
    showSuccess(
      `Cut-In Batch ${effectiveBatchNo} saved! ${payload.bundles.length} bundles (${totalSavedQty.toLocaleString()} pcs) added for ${selectedCutInStyle.code || selectedCutInStyle.name}.${autoExcessNote ? ` [${autoExcessNote}]` : ''}`
    );
  };

  const handleDeleteBatch = async (batch: StyleInBatchEntity) => {
    const batchBundles = bundles.filter((b) => b.batchId === batch.id);
    if (batchBundles.some((b) => b.status === 'DISPATCHED')) {
      showError('Cannot delete this batch because one or more bundles are already Dispatched.');
      return;
    }
    if (!window.confirm(`Delete Cut-In Batch ${batch.batchNo} and its ${batchBundles.length} bundles?`)) {
      return;
    }

    if (cloudReady) {
      const res = await deleteStyleInBatchAction(batch.id);
      if (!res.success && res.error !== 'CLOUD_TABLE_MISSING') {
        showError(res.error || 'Failed to delete batch.');
        return;
      }
    }
    setBatches((prev) => prev.filter((b) => b.id !== batch.id));
    setBundles((prev) => prev.filter((b) => b.batchId !== batch.id));
    showSuccess(`Deleted Cut-In Batch ${batch.batchNo}.`);
  };

  // ============================================================================
  // TAB 3: BUNDLE CHECKING & YELLOW SHEET READY QUEUE
  // ============================================================================
  const [checkStyleFilter, setCheckStyleFilter] = useState('ALL');
  const [checkPartFilter, setCheckPartFilter] = useState('ALL');
  const [checkSizeFilter, setCheckSizeFilter] = useState('ALL');
  const [checkSearch, setCheckSearch] = useState('');
  const [checkStatusFilter, setCheckStatusFilter] = useState<'PENDING_AND_READY' | 'IN_HOUSE' | 'READY_FOR_OUT'>('PENDING_AND_READY');
  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
  const [bulkCheckerName, setBulkCheckerName] = useState('');

  const checkQueueBundles = useMemo(() => {
    const q = checkSearch.trim().toLowerCase();
    return bundles.filter((b) => {
      if (b.status === 'DISPATCHED') return false;
      if (checkStatusFilter === 'IN_HOUSE' && b.status !== 'IN_HOUSE') return false;
      if (checkStatusFilter === 'READY_FOR_OUT' && b.status !== 'READY_FOR_OUT') return false;
      if (checkStyleFilter !== 'ALL' && b.styleId !== checkStyleFilter) return false;
      if (!bundleMatchesPartFilter(b.partName, checkPartFilter)) return false;
      if (checkSizeFilter !== 'ALL' && b.size !== checkSizeFilter) return false;
      if (q) {
        const hay = `${b.bundleNo} ${b.cutNo} ${b.noRange} ${b.size} ${b.partName} ${b.styleCode} ${b.styleName} ${b.companyName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bundles, checkStatusFilter, checkStyleFilter, checkPartFilter, checkSizeFilter, checkSearch]);

  const handleUpdateBundleInline = async (
    bundle: StyleBundleEntity,
    patch: Partial<Pick<StyleBundleEntity, 'goodQty' | 'mdQty' | 'edQty' | 'mdStatus' | 'status' | 'checkedBy' | 'remarks' | 'jobNo'>>
  ) => {
    const nextEd = patch.edQty !== undefined ? Math.max(0, patch.edQty) : bundle.edQty;
    const nextMd = patch.mdQty !== undefined ? Math.max(0, patch.mdQty) : bundle.mdQty;
    const autoGood =
      patch.goodQty !== undefined
        ? Math.max(0, patch.goodQty)
        : patch.edQty !== undefined || patch.mdQty !== undefined
        ? Math.max(0, bundle.tagQty - nextEd - nextMd)
        : bundle.goodQty;

    const updatedLocal: StyleBundleEntity = {
      ...bundle,
      ...patch,
      goodQty: autoGood,
      edQty: nextEd,
      mdQty: nextMd,
      checkedDate: patch.status === 'READY_FOR_OUT' ? todayStr : bundle.checkedDate,
    };

    setBundles((prev) => prev.map((item) => (item.id === bundle.id ? updatedLocal : item)));

    if (cloudReady) {
      const res = await updateStyleBundleCheckAction({
        id: bundle.id,
        jobNo: updatedLocal.jobNo,
        goodQty: updatedLocal.goodQty,
        mdQty: updatedLocal.mdQty,
        edQty: updatedLocal.edQty,
        mdStatus: updatedLocal.mdStatus,
        status: updatedLocal.status,
        checkedBy: updatedLocal.checkedBy,
        checkedDate: updatedLocal.checkedDate,
        remarks: updatedLocal.remarks,
      });
      if (!res.success && res.error !== 'CLOUD_TABLE_MISSING') {
        showError(res.error || 'Failed to save bundle update.');
      }
    }
  };

  const handleBulkMarkReady = async (mdStatus: 'PASS' | 'FAIL') => {
    if (selectedCheckIds.length === 0) {
      showError('Select at least one bundle first.');
      return;
    }
    const targetStatus: BundleWorkflowStatus = mdStatus === 'PASS' ? 'READY_FOR_OUT' : 'IN_HOUSE';
    setBundles((prev) =>
      prev.map((b) =>
        selectedCheckIds.includes(b.id)
          ? {
              ...b,
              mdStatus,
              status: targetStatus,
              checkedBy: bulkCheckerName.trim() || b.checkedBy,
              checkedDate: todayStr,
            }
          : b
      )
    );
    if (cloudReady) {
      await bulkUpdateStyleBundlesStatusAction(selectedCheckIds, {
        mdStatus,
        status: targetStatus,
        checkedBy: bulkCheckerName.trim() || undefined,
        checkedDate: todayStr,
      });
    }
    showSuccess(
      `${selectedCheckIds.length} bundles marked as MD ${mdStatus}${targetStatus === 'READY_FOR_OUT' ? ' & Ready for Out!' : '.'}`
    );
    setSelectedCheckIds([]);
  };

  const handleDeleteSingleBundle = async (bundle: StyleBundleEntity) => {
    if (bundle.status === 'DISPATCHED') {
      showError('Cannot delete a dispatched bundle.');
      return;
    }
    if (!window.confirm(`Delete Bundle #${bundle.bundleNo} (${bundle.size}, ${bundle.tagQty} pcs)?`)) {
      return;
    }
    if (cloudReady) {
      const res = await deleteStyleBundleAction(bundle.id);
      if (!res.success && res.error !== 'CLOUD_TABLE_MISSING') {
        showError(res.error || 'Failed to delete bundle.');
        return;
      }
    }
    setBundles((prev) => prev.filter((b) => b.id !== bundle.id));
    setSelectedCheckIds((prev) => prev.filter((id) => id !== bundle.id));
  };

  // ============================================================================
  // TAB 4: OUT / DESPATCH NOTE & GATE PASS BUILDER + ARCHIVE
  // ============================================================================
  const [outCompanyFilter, setOutCompanyFilter] = useState<string>('ALL');
  const [outStyleFilter, setOutStyleFilter] = useState<string>('ALL');
  const [outPartFilter, setOutPartFilter] = useState<string>('ALL');
  const [outSizeFilter, setOutSizeFilter] = useState<string>('ALL');
  const [outSearch, setOutSearch] = useState<string>('');
  const [includeInHouseForOut, setIncludeInHouseForOut] = useState<boolean>(true);
  const [selectedOutIds, setSelectedOutIds] = useState<string[]>([]);

  const [despatchNoInput, setDespatchNoInput] = useState<string>('');
  const [gatepassNoInput, setGatepassNoInput] = useState<string>('');
  const [checklistNoInput, setChecklistNoInput] = useState<string>('');
  const [despatchDateInput, setDespatchDateInput] = useState<string>(todayStr);
  const [toPersonInput, setToPersonInput] = useState<string>('');
  const [vehicleNoInput, setVehicleNoInput] = useState<string>('');
  const [driverNameInput, setDriverNameInput] = useState<string>('');
  const [despatchMdStatus, setDespatchMdStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [checkedByInput, setCheckedByInput] = useState<string>('');
  const [despatchedByInput, setDespatchedByInput] = useState<string>('');
  const [authorizedByInput, setAuthorizedByInput] = useState<string>('');
  const [receivedByInput, setReceivedByInput] = useState<string>('');
  const [despatchRemarksInput, setDespatchRemarksInput] = useState<string>('');

  // Archive search filters
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveCompany, setArchiveCompany] = useState('ALL');
  const [archiveSize, setArchiveSize] = useState('ALL');

  const availableOutBundles = useMemo(() => {
    const q = outSearch.trim().toLowerCase();
    return bundles
      .filter((b) => {
        if (b.status === 'DISPATCHED') return false;
        if (!includeInHouseForOut && b.status !== 'READY_FOR_OUT') return false;
        if (
          outCompanyFilter !== 'ALL' &&
          b.companyName.trim().toLowerCase() !== outCompanyFilter.trim().toLowerCase()
        ) {
          return false;
        }
        if (outStyleFilter !== 'ALL' && b.styleId !== outStyleFilter) return false;
        if (!bundleMatchesPartFilter(b.partName, outPartFilter)) return false;
        if (outSizeFilter !== 'ALL' && b.size !== outSizeFilter) return false;
        if (q) {
          const hay = `${b.bundleNo} ${b.cutNo} ${b.jobNo} ${b.noRange} ${b.size} ${b.partName} ${b.styleCode} ${b.styleName} ${b.companyName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // READY_FOR_OUT first
        if (a.status !== b.status) return a.status === 'READY_FOR_OUT' ? -1 : 1;
        return a.bundleNo.localeCompare(b.bundleNo, undefined, { numeric: true });
      });
  }, [
    bundles,
    includeInHouseForOut,
    outCompanyFilter,
    outStyleFilter,
    outPartFilter,
    outSizeFilter,
    outSearch,
  ]);

  const selectedOutBundles = useMemo(
    () => bundles.filter((b) => selectedOutIds.includes(b.id) && b.status !== 'DISPATCHED'),
    [bundles, selectedOutIds]
  );

  // Auto-fill TO contact person from Company CRUD when selecting bundles
  useEffect(() => {
    if (selectedOutBundles.length === 0 || toPersonInput.trim()) return;
    const compName = selectedOutBundles[0].companyName;
    const matchedComp = companies.find(
      (c) => c.name.trim().toLowerCase() === compName.trim().toLowerCase()
    );
    if (matchedComp?.contactPerson) {
      setToPersonInput(matchedComp.contactPerson);
    }
  }, [selectedOutBundles, companies, toPersonInput]);

  const handleConfirmDespatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (selectedOutBundles.length === 0) {
      showError('Please select at least one bundle to dispatch.');
      return;
    }

    const effectiveDespatchNo =
      despatchNoInput.trim() || `DN-${String(nextDespatchSeq).padStart(4, '0')}`;
    const effectiveGatepassNo =
      gatepassNoInput.trim() || `GP-${String(nextDespatchSeq).padStart(4, '0')}`;
    const effectiveChecklistNo =
      checklistNoInput.trim() || `CL-${String(nextDespatchSeq).padStart(4, '0')}`;
    const companyName =
      outCompanyFilter !== 'ALL' ? outCompanyFilter : selectedOutBundles[0].companyName;

    setSaving(true);
    const payload = {
      despatchNo: effectiveDespatchNo,
      gatepassNo: effectiveGatepassNo,
      checklistNo: effectiveChecklistNo,
      despatchDate: despatchDateInput || todayStr,
      companyName,
      toPerson: toPersonInput.trim(),
      vehicleNo: vehicleNoInput.trim(),
      driverName: driverNameInput.trim(),
      mdStatus: despatchMdStatus,
      checkedBy: checkedByInput.trim(),
      despatchedBy: despatchedByInput.trim(),
      authorizedBy: authorizedByInput.trim(),
      receivedBy: receivedByInput.trim(),
      remarks: despatchRemarksInput.trim(),
      bundleItems: selectedOutBundles.map((b) => ({
        bundleId: b.id,
        jobNo: b.jobNo || b.cutNo || '',
        goodQty: b.goodQty || b.tagQty,
        edQty: b.edQty,
        mdQty: b.mdQty,
        remarks: b.remarks,
      })),
    };

    const res = await createStyleDespatchAction(payload);
    setSaving(false);

    let finalDespatch: StyleDespatchEntity;
    let finalBundles: StyleBundleEntity[];

    if (res.success && res.despatch && res.updatedBundles) {
      setCloudReady(true);
      finalDespatch = res.despatch;
      finalBundles = res.updatedBundles;
      const updatedMap = new Map(finalBundles.map((b) => [b.id, b]));
      setDespatches((prev) => [finalDespatch, ...prev]);
      setBundles((prev) => prev.map((b) => updatedMap.get(b.id) || b));
    } else if (res.cloudReady === false || res.error === 'CLOUD_TABLE_MISSING') {
      setCloudReady(false);
      const localId = makeLocalId('desp');
      const nowIso = new Date().toISOString();
      const totalQty = payload.bundleItems.reduce((s, i) => s + i.goodQty, 0);
      const totalEd = payload.bundleItems.reduce((s, i) => s + i.edQty, 0);
      const totalMd = payload.bundleItems.reduce((s, i) => s + i.mdQty, 0);
      finalDespatch = {
        id: localId,
        despatchNo: payload.despatchNo,
        gatepassNo: payload.gatepassNo,
        checklistNo: payload.checklistNo,
        despatchDate: payload.despatchDate,
        companyName: payload.companyName,
        toPerson: payload.toPerson,
        vehicleNo: payload.vehicleNo,
        driverName: payload.driverName,
        mdStatus: payload.mdStatus,
        checkedBy: payload.checkedBy,
        despatchedBy: payload.despatchedBy,
        authorizedBy: payload.authorizedBy,
        receivedBy: payload.receivedBy,
        remarks: payload.remarks,
        totalBundles: payload.bundleItems.length,
        totalQty,
        totalEd,
        totalMd,
        createdAt: nowIso,
      };
      finalBundles = selectedOutBundles.map((b) => ({
        ...b,
        status: 'DISPATCHED',
        mdStatus: payload.mdStatus,
        despatchId: localId,
        checkedBy: payload.checkedBy || b.checkedBy,
        checkedDate: payload.despatchDate,
      }));
      const updatedMap = new Map(finalBundles.map((b) => [b.id, b]));
      setDespatches((prev) => [finalDespatch, ...prev]);
      setBundles((prev) => prev.map((b) => updatedMap.get(b.id) || b));
    } else {
      showError(res.error || 'Failed to save Despatch Note & Gate Pass.');
      return;
    }

    // Clear selection & open 3-in-1 Print Studio immediately
    setSelectedOutIds([]);
    setDespatchNoInput('');
    setGatepassNoInput('');
    setChecklistNoInput('');
    setDespatchRemarksInput('');
    showSuccess(
      `Despatch ${finalDespatch.despatchNo} & Gate Pass ${finalDespatch.gatepassNo} saved (${finalDespatch.totalBundles} bundles, ${finalDespatch.totalQty.toLocaleString()} pcs)!`
    );
    setPrintPayload({
      initialDoc: 'despatchNote',
      despatch: finalDespatch,
      bundles: finalBundles,
    });
  };

  const handleCancelDespatch = async (desp: StyleDespatchEntity) => {
    if (
      !window.confirm(
        `Cancel Despatch ${desp.despatchNo} (${desp.gatepassNo})? All its bundles will be returned to "Ready for Out".`
      )
    ) {
      return;
    }
    if (cloudReady) {
      const res = await deleteStyleDespatchAction(desp.id);
      if (!res.success && res.error !== 'CLOUD_TABLE_MISSING') {
        showError(res.error || 'Failed to cancel despatch.');
        return;
      }
    }
    setDespatches((prev) => prev.filter((d) => d.id !== desp.id));
    setBundles((prev) =>
      prev.map((b) =>
        b.despatchId === desp.id ? { ...b, status: 'READY_FOR_OUT', despatchId: null } : b
      )
    );
    showSuccess(`Cancelled Despatch ${desp.despatchNo}. Bundles moved back to Ready Queue.`);
  };

  const filteredDespatchArchive = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase();
    return despatches.filter((d) => {
      const dBundles = bundles.filter((b) => b.despatchId === d.id);
      if (
        archiveCompany !== 'ALL' &&
        d.companyName.trim().toLowerCase() !== archiveCompany.trim().toLowerCase()
      ) {
        return false;
      }
      if (archiveSize !== 'ALL' && !dBundles.some((b) => b.size === archiveSize)) {
        return false;
      }
      if (q) {
        const hay = [
          d.despatchNo,
          d.gatepassNo,
          d.checklistNo,
          d.companyName,
          d.toPerson,
          d.vehicleNo,
          d.driverName,
          ...dBundles.map(
            (b) =>
              `${b.bundleNo} ${b.cutNo} ${b.jobNo} ${b.size} ${b.partName} ${b.styleCode} ${b.styleName}`
          ),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [despatches, bundles, archiveSearch, archiveCompany, archiveSize]);

  // Quick helper to jump to Cut-In pre-selected for a style (and optional specific part)
  const jumpToCutInForStyle = (styleId: string, partName?: string) => {
    setCutInStyleId(styleId);
    if (partName) {
      setTimeout(() => {
        setCutInDefaultPart(partName);
        setGenPart(partName);
        setCutInRows((prev) => prev.map((r) => ({ ...r, partName })));
      }, 0);
    }
    setSubTab('cutIn');
  };

  // Quick helper to jump to Out pre-filtered for a style
  const jumpToOutForStyle = (style: StyleMasterEntity) => {
    setOutCompanyFilter(style.company || 'ALL');
    setOutStyleFilter(style.id);
    setSubTab('despatchOut');
  };

  // Build & open printable Style In & Out Reconciliation Summary (with Extra/Short per Size & Part)
  const openStyleReconciliationSummary = (row: (typeof styleBalanceRows)[number]) => {
    const styleBundles = bundles.filter(
      (b) =>
        b.styleId === row.style.id ||
        (row.style.code && b.styleCode === row.style.code) ||
        b.styleName.trim().toLowerCase() === row.style.name.trim().toLowerCase()
    );

    const styleOrderBySize = new Map<string, number>();
    for (const sz of row.style.sizeBreakdown || []) {
      if (sz.size) styleOrderBySize.set(sz.size, sz.qty);
    }

    const allSizeKeys = Array.from(
      new Set([...styleOrderBySize.keys(), ...row.sizeMap.keys()])
    );

    const sizeRows = allSizeKeys.map((size) => {
      const orderQty = styleOrderBySize.get(size) || 0;
      const szBundles = styleBundles.filter((b) => (b.size || 'Free Size') === size);
      const inQty = szBundles.reduce((s, b) => s + b.tagQty, 0);
      const outQty = szBundles
        .filter((b) => b.status === 'DISPATCHED')
        .reduce((s, b) => s + (b.goodQty || b.tagQty), 0);
      const edQty = szBundles.reduce((s, b) => s + b.edQty, 0);
      const mdQty = szBundles.reduce((s, b) => s + b.mdQty, 0);
      return {
        size,
        orderQty,
        inQty,
        variance: inQty - orderQty,
        outQty,
        edQty,
        mdQty,
        inHouseBalance: Math.max(0, inQty - outQty - edQty - mdQty),
      };
    });

    const partRows = Array.from(row.partMap.entries()).map(([partName, pv]) => ({
      partName,
      orderQty: pv.orderQty,
      inQty: pv.inQty,
      variance: pv.inQty - pv.orderQty,
      outQty: pv.outQty,
      inHouseBalance: Math.max(0, pv.inQty - pv.outQty),
    }));

    const styleBatches = batches
      .filter(
        (bt) =>
          bt.styleId === row.style.id ||
          (row.style.code && bt.styleCode === row.style.code) ||
          bt.styleName.trim().toLowerCase() === row.style.name.trim().toLowerCase()
      )
      .map((bt) => {
        const bList = styleBundles.filter((b) => b.batchId === bt.id);
        return {
          batchNo: bt.batchNo,
          receivedDate: bt.receivedDate,
          cutNo: bt.cutNo,
          partsNote: bt.partsNote,
          bundleCount: bList.length,
          totalQty: bList.reduce((s, b) => s + b.tagQty, 0),
          remarks: bt.remarks,
        };
      });

    const despatchIds = new Set(
      styleBundles.map((b) => b.despatchId).filter((id): id is string => Boolean(id))
    );
    const outDespatches = despatches
      .filter((d) => despatchIds.has(d.id))
      .map((d) => {
        const dList = styleBundles.filter((b) => b.despatchId === d.id);
        return {
          despatchNo: d.despatchNo,
          gatepassNo: d.gatepassNo,
          despatchDate: d.despatchDate,
          toPerson: d.toPerson,
          bundleCount: dList.length,
          totalQty: dList.reduce((s, b) => s + (b.goodQty || b.tagQty), 0),
          totalEd: dList.reduce((s, b) => s + b.edQty, 0),
          totalMd: dList.reduce((s, b) => s + b.mdQty, 0),
          remarks: d.remarks,
        };
      });

    setPrintPayload({
      initialDoc: 'reconciliationSummary',
      bundles: styleBundles,
      summaryData: {
        styleCode: row.style.code,
        styleName: row.style.name,
        companyName: row.style.company,
        generatedDate: todayStr,
        orderQty: row.orderQty,
        totalInQty: row.totalInQty,
        totalOutQty: row.outQty,
        totalInHouseQty: row.inHouseQty,
        totalReadyQty: row.readyQty,
        totalEd: row.edQty,
        totalMd: row.mdQty,
        sizeRows,
        partRows,
        inBatches: styleBatches,
        outDespatches,
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Main Interactive Workspace (Hidden during print when print modal is open) */}
      <div className={printPayload ? 'space-y-5 print:hidden' : 'space-y-5'}>
        {/* Top Studio Banner & Sub-Tabs */}
        <div className="bg-persian-800 text-white rounded-2xl shadow-md border border-persian-900 overflow-hidden print:hidden">
          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-black uppercase tracking-wider">
                  Style CRUD Linked
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    cloudReady
                      ? 'bg-emerald-500/25 text-emerald-200'
                      : 'bg-amber-400/25 text-amber-200'
                  }`}
                >
                  {cloudReady ? 'Cloud DB Synced' : 'Local Mode (Run SQL 0005 for Cloud Sync)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                Style In &amp; Out Control • Bundle Check List &amp; Gate Pass
              </h2>
              <p className="text-xs text-persian-100 mt-0.5">
                Partial Cut-In receiving, Yellow Bundle Check List QC (MD Pass/Fail), Outgoing Despatch Note &amp; Factory Gate Pass with Bundle/Size tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  {
                    id: 'overview',
                    label: 'Style Balance & Finder',
                    icon: Layers,
                    badge: String(bundles.length),
                  },
                  {
                    id: 'cutIn',
                    label: 'Cut In (Receiving)',
                    icon: ArrowDownToLine,
                    badge: String(batches.length),
                  },
                  {
                    id: 'bundleCheck',
                    label: 'Bundle Check List',
                    icon: ClipboardCheck,
                    badge: String(bundles.filter((b) => b.status !== 'DISPATCHED').length),
                  },
                  {
                    id: 'despatchOut',
                    label: 'Out / Gate Pass',
                    icon: Truck,
                    badge: String(despatches.length),
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubTab(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 transition cursor-pointer ${
                      active
                        ? 'bg-white text-persian-900 shadow-sm'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                        active ? 'bg-persian-100 text-persian-900' : 'bg-black/20 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            role={statusMsg.type === 'error' ? 'alert' : 'status'}
            className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
              statusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="p-1 rounded hover:bg-black/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Cut-In Qty
            </span>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {globalTotals.totalIn.toLocaleString()}
              <span className="text-[11px] font-sans font-semibold text-slate-500 ml-1">pcs</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {globalTotals.totalBundles} Total Bundles
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              In-House (Working / QC)
            </span>
            <div className="text-xl font-black text-amber-700 font-mono mt-0.5">
              {globalTotals.inHouse.toLocaleString()}
              <span className="text-[11px] font-sans font-semibold text-amber-600 ml-1">pcs</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {bundles.filter((b) => b.status === 'IN_HOUSE').length} Bundles Inside
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Checked &amp; Ready for Out
            </span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
              {globalTotals.ready.toLocaleString()}
              <span className="text-[11px] font-sans font-semibold text-emerald-600 ml-1">pcs</span>
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
              {bundles.filter((b) => b.status === 'READY_FOR_OUT').length} Bundles Ready
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-200 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Total Dispatched Out
            </span>
            <div className="text-xl font-black text-indigo-800 font-mono mt-0.5">
              {globalTotals.dispatched.toLocaleString()}
              <span className="text-[11px] font-sans font-semibold text-indigo-600 ml-1">pcs</span>
            </div>
            <div className="text-[10px] text-indigo-700 mt-1 font-semibold">
              {globalTotals.totalDespatches} Despatches / Gate Passes
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Styles Linked
            </span>
            <div className="text-xl font-black text-persian-800 font-mono mt-0.5">
              {activeStyles.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Synced from Style CRUD</div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: STYLE BALANCE OVERVIEW & UNIVERSAL BUNDLE FINDER           */}
        {/* ================================================================= */}
        {subTab === 'overview' && (
          <div className="space-y-5">
            {/* Style-Wise In vs Out Balance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Active Style-Wise Cut-In &amp; Despatch Out Balance (Style CRUD Synced)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Partial cut-in batches saha partial gatepass out okkoma style order qty ekath ekka auto calculate wenawa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubTab('cutIn')}
                  className="px-3.5 py-1.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Receive Cut-In Batch
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Style / Company</th>
                      <th className="py-2.5 px-3 text-right">Order Qty</th>
                      <th className="py-2.5 px-3 text-right">Total In (Extra/Short)</th>
                      <th className="py-2.5 px-3 text-right">In-House</th>
                      <th className="py-2.5 px-3 text-right">Ready Out</th>
                      <th className="py-2.5 px-3 text-right">Total Out</th>
                      <th className="py-2.5 px-3 text-right">In - Out Bal.</th>
                      <th className="py-2.5 px-3">Part-Wise &amp; Size-Wise (Out / In)</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {styleBalanceRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          No active styles registered in Style Master CRUD yet.
                        </td>
                      </tr>
                    ) : (
                      styleBalanceRows.map((row) => {
                        const inVariance = row.totalInQty - row.orderQty;
                        const inHandBal = Math.max(0, row.totalInQty - row.outQty - row.edQty - row.mdQty);
                        return (
                          <tr key={row.style.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-3">
                              <div className="font-black text-slate-900">
                                {row.style.code ? `${row.style.code} — ${row.style.name}` : row.style.name}
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500">
                                {row.style.company} • {row.bundleCount} Bundles
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                              {row.orderQty.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-mono font-black text-slate-900">
                                {row.totalInQty.toLocaleString()}
                              </div>
                              {inVariance > 0 ? (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9.5px] font-black">
                                  +{inVariance.toLocaleString()} EXTRA
                                </span>
                              ) : inVariance < 0 ? (
                                <span className="text-[10px] font-mono text-slate-500">
                                  {inVariance.toLocaleString()} Pending
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700">
                                  ✓ Exact
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                              {row.inHouseQty.toLocaleString()}
                              <span className="block text-[9px] text-slate-400 font-sans">
                                {row.inHouseBundles} bdl
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                              {row.readyQty.toLocaleString()}
                              <span className="block text-[9px] text-emerald-600 font-sans">
                                {row.readyBundles} bdl
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-indigo-700">
                              {row.outQty.toLocaleString()}
                              <span className="block text-[9px] text-indigo-500 font-sans">
                                {row.outBundles} bdl
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                              {inHandBal.toLocaleString()}
                              <span className="block text-[9px] text-slate-400 font-sans">
                                in factory
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="space-y-1.5 max-w-[290px]">
                                {row.partMap.size > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {Array.from(row.partMap.entries()).map(([partName, pv]) => (
                                      <button
                                        key={partName}
                                        type="button"
                                        onClick={() => jumpToCutInForStyle(row.style.id, partName)}
                                        title={`Click to Cut-In "${partName}" (Order: ${pv.orderQty}, In: ${pv.inQty}, Out: ${pv.outQty})`}
                                        className={`px-1.5 py-0.5 rounded border font-mono text-[10px] font-extrabold cursor-pointer transition ${
                                          pv.outQty >= pv.orderQty && pv.orderQty > 0
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                            : pv.inQty > 0
                                            ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                                        }`}
                                      >
                                        {partName}: {pv.outQty}/{pv.inQty}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(row.sizeMap.entries())
                                    .filter(([, v]) => v.inQty > 0 || v.outQty > 0)
                                    .map(([sz, v]) => (
                                      <span
                                        key={sz}
                                        className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-700"
                                      >
                                        {sz}: {v.outQty}/{v.inQty}
                                      </span>
                                    ))}
                                  {row.partMap.size === 0 &&
                                    Array.from(row.sizeMap.values()).every(
                                      (v) => v.inQty === 0 && v.outQty === 0
                                    ) && <span className="text-[10px] text-slate-400">No cuts yet</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex flex-wrap items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => jumpToCutInForStyle(row.style.id)}
                                  className="px-2 py-1 rounded-lg bg-persian-50 hover:bg-persian-100 text-persian-800 border border-persian-200 text-[10px] font-extrabold cursor-pointer"
                                >
                                  + Cut In
                                </button>
                                <button
                                  type="button"
                                  onClick={() => jumpToOutForStyle(row.style)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold cursor-pointer"
                                >
                                  Out / GP
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openStyleReconciliationSummary(row)}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                                  title="Open Printable Style In / Out & Extra-Short Reconciliation Summary"
                                >
                                  <FileText className="w-3 h-3" /> Summary
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

            {/* Universal Bundle Finder (Filter by Bundle No, Size, Cut No, Style, Gate Pass, Status) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-persian-700" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Master Bundle Tracker &amp; Filter ({filteredOverviewBundles.length} Bundles)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {filteredOverviewBundles.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPrintPayload({
                            initialDoc: 'bundleCheckList',
                            bundles: filteredOverviewBundles,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Yellow Check List ({filteredOverviewBundles.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCompany('ALL');
                        setFilterStyleId('ALL');
                        setFilterPart('ALL');
                        setFilterSize('ALL');
                        setFilterStatus('ALL');
                        setFilterMdStatus('ALL');
                        setFilterDateFrom('');
                        setFilterDateTo('');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>

                {/* Multi-Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-2">
                  <div className="xl:col-span-2 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Bundle No, Part, Cut, GP..."
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:border-persian-500"
                    />
                  </div>

                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStyleId}
                    onChange={(e) => setFilterStyleId(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Styles</option>
                    {styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `${s.code} - ${s.name}` : s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterPart}
                    onChange={(e) => setFilterPart(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Parts (Filter)</option>
                    <option value={ALL_PARTS_VALUE}>All Parts (Full Bundle)</option>
                    {allBundleParts.map((p) => (
                      <option key={p} value={p}>
                        Part: {p}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterSize}
                    onChange={(e) => setFilterSize(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Sizes</option>
                    {allBundleSizes.map((sz) => (
                      <option key={sz} value={sz}>
                        Size: {sz}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as 'ALL' | BundleWorkflowStatus)
                    }
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Status</option>
                    <option value="IN_HOUSE">In-House</option>
                    <option value="READY_FOR_OUT">Ready for Out</option>
                    <option value="DISPATCHED">Dispatched Out</option>
                  </select>

                  <select
                    value={filterMdStatus}
                    onChange={(e) =>
                      setFilterMdStatus(e.target.value as 'ALL' | BundleMdStatus)
                    }
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">MD: All</option>
                    <option value="PASS">MD Pass</option>
                    <option value="FAIL">MD Fail</option>
                    <option value="PENDING">MD Pending</option>
                  </select>

                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    title="Received From Date"
                    className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Style / Company</th>
                      <th className="py-2 px-3 text-center">Cut No</th>
                      <th className="py-2 px-3 text-center">Bundle No</th>
                      <th className="py-2 px-3 text-center">No Range</th>
                      <th className="py-2 px-3 text-center">Size</th>
                      <th className="py-2 px-3 text-right">Tag / Good</th>
                      <th className="py-2 px-3 text-center">ED / MD</th>
                      <th className="py-2 px-3 text-center">MD Check</th>
                      <th className="py-2 px-3 text-center">Status / Gate Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOverviewBundles.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400">
                          No bundles match your filter. Use &quot;Cut In (Receiving)&quot; to add incoming cut bundles.
                        </td>
                      </tr>
                    ) : (
                      filteredOverviewBundles.map((b) => {
                        const desp = b.despatchId ? despatchById.get(b.despatchId) : null;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                              {b.receivedDate}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">
                                {b.styleCode ? `${b.styleCode} - ${b.styleName}` : b.styleName}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-slate-500">{b.companyName}</span>
                                {b.partName && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[9.5px] font-extrabold">
                                    {b.partName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-center">
                              {b.cutNo || '-'}
                            </td>
                            <td className="py-2 px-3 font-mono font-black text-center text-persian-800">
                              {b.bundleNo}
                              {b.ratio && (
                                <span className="ml-1 text-[10px] text-slate-400">({b.ratio})</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-center text-slate-600">
                              {b.noRange || '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono font-bold">
                                {b.size}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              <span className="text-slate-500">{b.tagQty}</span> /{' '}
                              <span className="text-emerald-700">{b.goodQty}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-[11px]">
                              {b.edQty > 0 || b.mdQty > 0 ? (
                                <span className="text-rose-600 font-bold">
                                  {b.edQty}/{b.mdQty}
                                </span>
                              ) : (
                                <span className="text-slate-400">0/0</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  b.mdStatus === 'PASS'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.mdStatus === 'FAIL'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {b.mdStatus}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {b.status === 'DISPATCHED' && desp ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPrintPayload({
                                      initialDoc: 'despatchNote',
                                      despatch: desp,
                                      bundles: bundles.filter((item) => item.despatchId === desp.id),
                                    })
                                  }
                                  className="px-2 py-0.5 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-extrabold font-mono cursor-pointer"
                                  title="Click to open Despatch Note & Gate Pass"
                                >
                                  OUT • {desp.despatchNo} / {desp.gatepassNo}
                                </button>
                              ) : b.status === 'READY_FOR_OUT' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                  READY FOR OUT
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                                  IN-HOUSE
                                </span>
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

        {/* ================================================================= */}
        {/* TAB 2: CUT IN / PARTIAL BUNDLE RECEIVING (NUMBERING SHEET ENTRY)  */}
        {/* ================================================================= */}
        {subTab === 'cutIn' && (
          <div className="space-y-5">
            <form
              onSubmit={handleSaveCutInBatch}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-persian-700" />
                    Receive Partial Cut-In Batch &amp; Bundle Details
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Company eken ena Numbering Sheet / Cut-In tika tika meke enter karanna — yellow sheet bundle details okkoma save wenawa.
                  </p>
                </div>
                {cutInStyleBalance && (
                  <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-persian-50 border border-persian-200 text-[11px] font-bold text-persian-900">
                    <span>
                      Order: <span className="font-mono">{cutInExcessSummary.baseOrderQty.toLocaleString()}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Already In: <span className="font-mono text-emerald-700">{cutInExcessSummary.baseAlreadyIn.toLocaleString()}</span>
                    </span>
                    <span>•</span>
                    <span>
                      This Batch: <span className="font-mono text-indigo-700">+{cutInDraftTotalQty.toLocaleString()}</span>
                    </span>
                    {cutInExcessSummary.overallVariance > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono font-black text-[10px]">
                        +{cutInExcessSummary.overallVariance.toLocaleString()} EXTRA
                      </span>
                    ) : cutInExcessSummary.overallVariance < 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-persian-200 text-slate-700 font-mono text-[10px]">
                        Rem: {Math.abs(cutInExcessSummary.overallVariance).toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono text-[10px]">
                        ✓ Exact
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Batch Header Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Select Style (From Style CRUD) *
                    </label>
                    <select
                      value={cutInStyleId}
                      onChange={(e) => setCutInStyleId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-persian-500"
                    >
                      <option value="">-- Select Active Style --</option>
                      {activeStyles.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code ? `${s.code} — ${s.name}` : s.name} ({s.company} • Order: {s.qty.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Received Date *
                    </label>
                    <input
                      type="date"
                      value={cutInDate}
                      onChange={(e) => setCutInDate(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cut No (e.g. 3, 1533)
                    </label>
                    <input
                      type="text"
                      value={cutInCutNo}
                      onChange={(e) => setCutInCutNo(e.target.value)}
                      placeholder="e.g. 3 or 1535"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Batch No (Auto if blank)
                    </label>
                    <input
                      type="text"
                      value={cutInBatchNo}
                      onChange={(e) => setCutInBatchNo(e.target.value)}
                      placeholder={nextBatchNo}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Color / Fabric
                    </label>
                    <input
                      type="text"
                      value={cutInColor}
                      onChange={(e) => setCutInColor(e.target.value)}
                      placeholder="Fabric / Panel Color"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Client Sheet / Ref No
                    </label>
                    <input
                      type="text"
                      value={cutInClientRef}
                      onChange={(e) => setCutInClientRef(e.target.value)}
                      placeholder="Client GP / Numbering Sheet Ref"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Received / Checked By
                    </label>
                    <input
                      type="text"
                      list="style-inout-staff-list"
                      value={cutInReceivedBy}
                      onChange={(e) => {
                        setCutInReceivedBy(e.target.value);
                        if (!cutInCheckedBy) setCutInCheckedBy(e.target.value);
                      }}
                      placeholder="Staff Name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                    <datalist id="style-inout-staff-list">
                      {staffOptions.map((emp) => (
                        <option key={emp.id} value={emp.fullName} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Style Parts Selector Strip (All Parts + Individual Part-Wise Tracking from Style CRUD!) */}
                {selectedCutInStyleParts.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                        Style CRUD Parts ({selectedCutInStyleParts.length}) — Select Active Part for Cut-In (Or Choose Per Row Below)
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCutInRows((prev) =>
                            prev.map((r) => ({ ...r, partName: cutInDefaultPart }))
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-persian-50 text-persian-800 border border-persian-200 text-[10px] font-extrabold cursor-pointer"
                      >
                        Apply &quot;{cutInDefaultPart === ALL_PARTS_VALUE ? `All Parts (${selectedCutInStyleParts.length})` : cutInDefaultPart}&quot; to All Rows
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCutInDefaultPart(ALL_PARTS_VALUE);
                          setGenPart(ALL_PARTS_VALUE);
                          setCutInRows((prev) =>
                            prev.map((r) =>
                              !r.bundleNo.trim() && !r.tagQty
                                ? { ...r, partName: ALL_PARTS_VALUE }
                                : r
                            )
                          );
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                          cutInDefaultPart === ALL_PARTS_VALUE
                            ? 'bg-persian-800 text-white border-persian-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-persian-400'
                        }`}
                      >
                        All Parts ({selectedCutInStyleParts.length})
                      </button>
                      {selectedCutInStyleParts.map((partName) => {
                        const isSelected = cutInDefaultPart === partName;
                        const pStat = cutInStyleBalance?.partMap.get(partName);
                        return (
                          <button
                            key={partName}
                            type="button"
                            onClick={() => {
                              setCutInDefaultPart(partName);
                              setGenPart(partName);
                              setCutInRows((prev) =>
                                prev.map((r) =>
                                  !r.bundleNo.trim() && !r.tagQty ? { ...r, partName } : r
                                )
                              );
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer inline-flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-persian-800 text-white border-persian-800 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-persian-400'
                            }`}
                          >
                            <span>{partName}</span>
                            {pStat && (
                              <span
                                className={`text-[10px] font-mono px-1 rounded ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                In {pStat.inQty}/{pStat.orderQty}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Style CRUD Size Breakdown Strip (Auto-Suggested Sizes + Click to Add Bundle Row) */}
                {selectedCutInStyleSizes.length > 0 && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900">
                        Style CRUD Sizes ({selectedCutInStyleSizes.length}) — Showing Balance for{' '}
                        <span className="underline">
                          {cutInDefaultPart === ALL_PARTS_VALUE
                            ? `All Parts (${selectedCutInStyleParts.length})`
                            : cutInDefaultPart}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCutInRows(
                            buildRowsFromStyleSizes(
                              selectedCutInStyle,
                              cutInCutNo.trim(),
                              cutInDefaultPart
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-extrabold cursor-pointer"
                      >
                        Load All Style Sizes
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCutInStyleSizes.map((sz) => {
                        const alreadyIn =
                          cutInDefaultPart !== ALL_PARTS_VALUE
                            ? cutInStyleBalance?.partMap
                                .get(cutInDefaultPart)
                                ?.sizeInMap.get(sz.size) || 0
                            : cutInStyleBalance?.sizeMap.get(sz.size)?.inQty || 0;
                        const thisBatch = cutInDraftQtyBySize.get(sz.size) || 0;
                        const totalProjected = alreadyIn + thisBatch;
                        const diff = totalProjected - sz.qty; // >0 EXTRA, <0 Pending/Short
                        return (
                          <button
                            key={sz.size}
                            type="button"
                            onClick={() => {
                              const lastRow = cutInRows[cutInRows.length - 1];
                              const nextBNum =
                                lastRow && /^\d+$/.test(lastRow.bundleNo.trim())
                                  ? String(parseInt(lastRow.bundleNo.trim(), 10) + 1)
                                  : '';
                              setCutInRows((prev) => [
                                ...prev,
                                {
                                  ...makeEmptyRow(cutInCutNo.trim(), sz.size, cutInDefaultPart),
                                  bundleNo: nextBNum,
                                  tagQty: lastRow?.tagQty || 0,
                                },
                              ]);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                              diff > 0
                                ? 'bg-amber-100 hover:bg-amber-500 hover:text-white border-amber-400 text-amber-950'
                                : diff === 0 && sz.qty > 0
                                ? 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-300 text-emerald-900'
                                : 'bg-white hover:bg-indigo-600 hover:text-white border-indigo-200 text-slate-800'
                            }`}
                            title={`Click to add a new bundle row for ${cutInDefaultPart} / size ${sz.size}`}
                          >
                            <span className="font-mono font-black">{sz.size}</span>
                            <span className="text-[10px] font-mono">
                              In {totalProjected}/{sz.qty}{' '}
                              {diff > 0
                                ? `(+${diff} EXTRA)`
                                : diff === 0 && sz.qty > 0
                                ? '(✓ Exact)'
                                : `(Rem ${Math.abs(diff)})`}
                            </span>
                            <Plus className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Live Excess Cut-In Auto-Note Banner */}
                    {(cutInExcessSummary.excessSizes.length > 0 ||
                      cutInExcessSummary.overallVariance > 0) && (
                      <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-400 text-amber-950 text-[11px] font-bold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-black uppercase">Excess Cut-In Noted: </span>
                          {cutInExcessSummary.excessSizes.length > 0
                            ? cutInExcessSummary.excessSizes
                                .map(
                                  (ex) =>
                                    `Size ${ex.size}: ${ex.totalIn}/${ex.orderQty} (+${ex.extraQty} Extra)`
                                )
                                .join(' • ')
                            : `Total In ${cutInExcessSummary.projectedTotalIn}/${cutInExcessSummary.baseOrderQty} (+${cutInExcessSummary.overallVariance} Extra)`}
                          <span className="block text-[10px] font-semibold text-amber-900 mt-0.5">
                            Order Qty ekata wada wadiyen in wena pcs tika Extra widihata save wenawa — passe Style Summary eke hariyata pennanawa.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bundle Rows Toolbar + Quick Range Generator */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Bundle Breakdown Table ({cutInRows.length} Rows • {cutInDraftTotalQty.toLocaleString()} Pcs)
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRangeGen((v) => !v)}
                      className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Quick Bundle Range Generator
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lastRow = cutInRows[cutInRows.length - 1];
                        const nextBNum =
                          lastRow && /^\d+$/.test(lastRow.bundleNo.trim())
                            ? String(parseInt(lastRow.bundleNo.trim(), 10) + 1)
                            : '';
                        setCutInRows((prev) => [
                          ...prev,
                          {
                            ...makeEmptyRow(
                              lastRow?.cutNo || cutInCutNo,
                              lastRow?.size || selectedCutInStyleSizes[0]?.size || '',
                              lastRow?.partName || cutInDefaultPart
                            ),
                            bundleNo: nextBNum,
                            tagQty: lastRow?.tagQty || 0,
                          },
                        ]);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Bundle Row
                    </button>
                  </div>
                </div>

                {/* Quick Range Generator Drawer */}
                {showRangeGen && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                    <div className="text-xs font-extrabold text-amber-950">
                      Auto-Generate Sequential Bundles (Like Client Numbering Sheet: e.g. Bundle #28–#36, Qty 100, Start No 2521)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          Part (Style CRUD)
                        </label>
                        <select
                          value={genPart}
                          onChange={(e) => setGenPart(e.target.value)}
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                        >
                          <option value={ALL_PARTS_VALUE}>
                            All Parts ({selectedCutInStyleParts.length || 'All'})
                          </option>
                          {selectedCutInStyleParts.map((pName) => (
                            <option key={pName} value={pName}>
                              {pName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          Start Bundle #
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={genStartBundle}
                          onChange={(e) => setGenStartBundle(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          How Many Bundles
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={genCount}
                          onChange={(e) => setGenCount(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          Size (Style CRUD)
                        </label>
                        {selectedCutInStyleSizes.length > 0 ? (
                          <select
                            value={genSize}
                            onChange={(e) => setGenSize(e.target.value)}
                            className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                          >
                            {selectedCutInStyleSizes.map((sz) => (
                              <option key={sz.size} value={sz.size}>
                                {sz.size} (Order: {sz.qty})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={genSize}
                            onChange={(e) => setGenSize(e.target.value)}
                            placeholder="e.g. 3-6, 18-24, FS"
                            className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          Qty / Bundle
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={genQty}
                          onChange={(e) => setGenQty(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          Start Serial No (Opt.)
                        </label>
                        <input
                          type="text"
                          value={genStartNo}
                          onChange={(e) => setGenStartNo(e.target.value)}
                          placeholder="e.g. 2521"
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          Ratio Cycle
                        </label>
                        <input
                          type="text"
                          value={genRatios}
                          onChange={(e) => setGenRatios(e.target.value)}
                          placeholder="A,B,C"
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRangeGen(false)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateBundleRange}
                        className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold cursor-pointer"
                      >
                        Generate Rows
                      </button>
                    </div>
                  </div>
                )}

                {/* Multi-Bundle Entry Table (Clean Cut-In Columns — Damage & Remarks are on Out/QC Only) */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900 text-white uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-2 w-20">Cut No</th>
                        <th className="py-2 px-2 w-24">Bundle No *</th>
                        <th className="py-2 px-2 w-16">Ratio</th>
                        <th className="py-2 px-2 w-36">No Range (Start-End)</th>
                        <th className="py-2 px-2 w-44">Part (Style CRUD) *</th>
                        <th className="py-2 px-2">Size (Style CRUD) *</th>
                        <th className="py-2 px-2 w-28">Tag Qty *</th>
                        <th className="py-2 px-2 w-18 text-center">Row</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cutInRows.map((row, rowIdx) => (
                        <tr key={row.rowKey} className="bg-white">
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.cutNo}
                              onChange={(e) =>
                                setCutInRows((prev) =>
                                  prev.map((r) =>
                                    r.rowKey === row.rowKey ? { ...r, cutNo: e.target.value } : r
                                  )
                                )
                              }
                              placeholder={cutInCutNo || 'Cut'}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.bundleNo}
                              onChange={(e) =>
                                setCutInRows((prev) =>
                                  prev.map((r) =>
                                    r.rowKey === row.rowKey ? { ...r, bundleNo: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="e.g. 28"
                              className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.ratio}
                              onChange={(e) =>
                                setCutInRows((prev) =>
                                  prev.map((r) =>
                                    r.rowKey === row.rowKey ? { ...r, ratio: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="A"
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-center text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.noRange}
                              onChange={(e) =>
                                setCutInRows((prev) =>
                                  prev.map((r) =>
                                    r.rowKey === row.rowKey ? { ...r, noRange: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="2521 - 2620"
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.partName || ALL_PARTS_VALUE}
                              onChange={(e) =>
                                setCutInRows((prev) =>
                                  prev.map((r) =>
                                    r.rowKey === row.rowKey ? { ...r, partName: e.target.value } : r
                                  )
                                )
                              }
                              className="w-full p-1.5 bg-persian-50/70 border border-persian-200 rounded-lg font-bold text-xs text-persian-950"
                            >
                              <option value={ALL_PARTS_VALUE}>
                                All Parts ({selectedCutInStyleParts.length || 'All'})
                              </option>
                              {selectedCutInStyleParts.map((pName) => (
                                <option key={pName} value={pName}>
                                  {pName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1.5">
                            {selectedCutInStyleSizes.length > 0 ? (
                              <select
                                value={row.size}
                                onChange={(e) =>
                                  setCutInRows((prev) =>
                                    prev.map((r) =>
                                      r.rowKey === row.rowKey ? { ...r, size: e.target.value } : r
                                    )
                                  )
                                }
                                className="w-full p-1.5 bg-indigo-50/70 border border-indigo-300 rounded-lg font-mono font-bold text-xs text-slate-900"
                              >
                                {row.size &&
                                  !selectedCutInStyleSizes.some((sz) => sz.size === row.size) && (
                                    <option value={row.size}>{row.size}</option>
                                  )}
                                {selectedCutInStyleSizes.map((sz) => {
                                  const rowPart = row.partName || ALL_PARTS_VALUE;
                                  const alreadyIn =
                                    rowPart !== ALL_PARTS_VALUE
                                      ? cutInStyleBalance?.partMap
                                          .get(rowPart)
                                          ?.sizeInMap.get(sz.size) || 0
                                      : cutInStyleBalance?.sizeMap.get(sz.size)?.inQty || 0;
                                  const thisBatchSz = cutInDraftQtyBySize.get(sz.size) || 0;
                                  const projected = alreadyIn + thisBatchSz;
                                  const diff = projected - sz.qty;
                                  const statusLabel =
                                    diff > 0
                                      ? `+${diff} EXTRA (In: ${projected})`
                                      : diff === 0 && sz.qty > 0
                                      ? `✓ Exact (${projected}/${sz.qty})`
                                      : `In: ${projected}/${sz.qty} (Rem: ${Math.abs(diff)})`;
                                  return (
                                    <option key={sz.size} value={sz.size}>
                                      {sz.size} — Ord: {sz.qty} | {statusLabel}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={row.size}
                                onChange={(e) =>
                                  setCutInRows((prev) =>
                                    prev.map((r) =>
                                      r.rowKey === row.rowKey ? { ...r, size: e.target.value } : r
                                    )
                                  )
                                }
                                placeholder="Size"
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                              />
                            )}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min={0}
                              value={row.tagQty || ''}
                              onChange={(e) =>
                                setCutInRows((prev) =>
                                  prev.map((r) =>
                                    r.rowKey === row.rowKey
                                      ? { ...r, tagQty: Number(e.target.value) }
                                      : r
                                  )
                                )
                              }
                              placeholder="100"
                              className="w-full p-1.5 bg-emerald-50 border border-emerald-300 rounded-lg font-mono font-black text-xs text-right"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextBNum = /^\d+$/.test(row.bundleNo.trim())
                                    ? String(parseInt(row.bundleNo.trim(), 10) + 1)
                                    : '';
                                  const clone: DraftCutInBundleRow = {
                                    ...makeEmptyRow(
                                      row.cutNo || cutInCutNo,
                                      row.size,
                                      row.partName || cutInDefaultPart
                                    ),
                                    bundleNo: nextBNum,
                                    tagQty: row.tagQty,
                                  };
                                  setCutInRows((prev) => [
                                    ...prev.slice(0, rowIdx + 1),
                                    clone,
                                    ...prev.slice(rowIdx + 1),
                                  ]);
                                }}
                                title="Add another bundle row for this part & size"
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCutInRows((prev) =>
                                    prev.length > 1
                                      ? prev.filter((r) => r.rowKey !== row.rowKey)
                                      : buildRowsFromStyleSizes(
                                          selectedCutInStyle,
                                          cutInCutNo,
                                          cutInDefaultPart
                                        )
                                  )
                                }
                                title="Remove row"
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
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

                {/* Submit Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Rows with Bundle No &amp; Tag Qty &gt; 0 will be saved (blank size rows are automatically skipped).
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-persian-800 hover:bg-persian-600 text-white text-xs font-black inline-flex items-center justify-center gap-2 cursor-pointer transition shadow-sm disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    {saving
                      ? 'Saving Batch...'
                      : `Save Cut-In Batch (${cutInDraftTotalQty.toLocaleString()} Pcs)`}
                  </button>
                </div>
              </div>
            </form>

            {/* Recent Partial Cut-In Batches History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Incoming Cut-In Batches History ({batches.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Batch No / Date</th>
                      <th className="py-2 px-3">Style &amp; Company</th>
                      <th className="py-2 px-3">Cut No / Parts</th>
                      <th className="py-2 px-3 text-right">Bundles / Qty</th>
                      <th className="py-2 px-3">Received By</th>
                      <th className="py-2 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          No cut-in batches recorded yet.
                        </td>
                      </tr>
                    ) : (
                      batches.map((batch) => {
                        const batchBundles = bundles.filter((b) => b.batchId === batch.id);
                        const batchQty = batchBundles.reduce((s, b) => s + b.tagQty, 0);
                        return (
                          <tr key={batch.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-black text-persian-800">
                                {batch.batchNo}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {batch.receivedDate}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">
                                {batch.styleCode
                                  ? `${batch.styleCode} — ${batch.styleName}`
                                  : batch.styleName}
                              </div>
                              <div className="text-[10px] text-slate-500">{batch.companyName}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-slate-800">
                                Cut: {batch.cutNo || '-'} {batch.color ? `• ${batch.color}` : ''}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[260px]">
                                {batch.partsNote || '-'}
                              </div>
                              {batch.remarks && (
                                <div className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                                  {batch.remarks}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              <div className="font-black text-slate-900">
                                {batchQty.toLocaleString()} pcs
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {batchBundles.length} bundles
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-semibold">
                              {batch.receivedBy || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPrintPayload({
                                      initialDoc: 'bundleCheckList',
                                      bundles: batchBundles,
                                      checklistMeta: {
                                        serialNo: batch.batchNo,
                                        date: batch.receivedDate,
                                        plant: batch.companyName,
                                        styleLabel: batch.styleCode
                                          ? `${batch.styleCode} - ${batch.styleName}`
                                          : batch.styleName,
                                        mdStatus: 'PENDING',
                                        checkedBy: batch.checkedBy || batch.receivedBy,
                                        authorizedBy: '',
                                        directionLabel: 'INCOMING CUT-IN SHEET',
                                      },
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer className="w-3 h-3" /> Yellow Sheet
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBatch(batch)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Delete Batch"
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
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: BUNDLE CHECK LIST (YELLOW SHEET QC & READY FOR OUT QUEUE)  */}
        {/* ================================================================= */}
        {subTab === 'bundleCheck' && (
          <div className="bg-white rounded-2xl border border-amber-300/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-200 bg-amber-50/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-amber-700" />
                    Bundle Check List (Yellow Sheet QC — Good Qty, MD / ED &amp; Ready for Out)
                  </h3>
                  <p className="text-[11px] text-amber-900/80">
                    Check karala Good Qty, MD, ED fill karala MD PASS / Ready for Out mark karanna — Yellow Bundle Check List print karannath puluwan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={checkQueueBundles.length === 0}
                    onClick={() => {
                      const targetList =
                        selectedCheckIds.length > 0
                          ? checkQueueBundles.filter((b) => selectedCheckIds.includes(b.id))
                          : checkQueueBundles;
                      setPrintPayload({
                        initialDoc: 'bundleCheckList',
                        bundles: targetList,
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Yellow Sheet ({selectedCheckIds.length > 0 ? selectedCheckIds.length : checkQueueBundles.length})
                  </button>
                </div>
              </div>

              {/* Filters + Bulk Action Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={checkSearch}
                    onChange={(e) => setCheckSearch(e.target.value)}
                    placeholder="Bundle No, Part, Cut, Size..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                  />
                </div>
                <select
                  value={checkStyleFilter}
                  onChange={(e) => setCheckStyleFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                >
                  <option value="ALL">All Styles</option>
                  {activeStyles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `${s.code} - ${s.name}` : s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={checkPartFilter}
                  onChange={(e) => setCheckPartFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                >
                  <option value="ALL">All Parts (Filter)</option>
                  <option value={ALL_PARTS_VALUE}>All Parts (Full Bundle)</option>
                  {allBundleParts.map((p) => (
                    <option key={p} value={p}>
                      Part: {p}
                    </option>
                  ))}
                </select>
                <select
                  value={checkSizeFilter}
                  onChange={(e) => setCheckSizeFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                >
                  <option value="ALL">All Sizes</option>
                  {allBundleSizes.map((sz) => (
                    <option key={sz} value={sz}>
                      Size: {sz}
                    </option>
                  ))}
                </select>
                <select
                  value={checkStatusFilter}
                  onChange={(e) =>
                    setCheckStatusFilter(
                      e.target.value as 'PENDING_AND_READY' | 'IN_HOUSE' | 'READY_FOR_OUT'
                    )
                  }
                  className="py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                >
                  <option value="PENDING_AND_READY">In-House &amp; Ready</option>
                  <option value="IN_HOUSE">In-House Only</option>
                  <option value="READY_FOR_OUT">Ready for Out Only</option>
                </select>
                <input
                  type="text"
                  list="style-inout-staff-list"
                  value={bulkCheckerName}
                  onChange={(e) => setBulkCheckerName(e.target.value)}
                  placeholder="Checked By (for bulk)..."
                  className="py-1.5 px-2.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                />
              </div>

              {selectedCheckIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 text-white text-xs">
                  <span className="font-bold">
                    {selectedCheckIds.length} bundles selected
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkMarkReady('PASS')}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer"
                    >
                      ✓ Mark MD PASS &amp; Ready for Out
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMarkReady('FAIL')}
                      className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer"
                    >
                      ✗ Mark MD FAIL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutIds(selectedCheckIds);
                        setSubTab('despatchOut');
                      }}
                      className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-black cursor-pointer"
                    >
                      Send Selected to Out / Gate Pass →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-9">
                      <input
                        type="checkbox"
                        checked={
                          checkQueueBundles.length > 0 &&
                          checkQueueBundles.every((b) => selectedCheckIds.includes(b.id))
                        }
                        onChange={(e) =>
                          setSelectedCheckIds(
                            e.target.checked ? checkQueueBundles.map((b) => b.id) : []
                          )
                        }
                      />
                    </th>
                    <th className="py-2.5 px-2">Style / Company</th>
                    <th className="py-2.5 px-2 text-center">Cut No</th>
                    <th className="py-2.5 px-2 text-center">Bundle No</th>
                    <th className="py-2.5 px-2 text-center">No Range</th>
                    <th className="py-2.5 px-2 text-center">Size</th>
                    <th className="py-2.5 px-2 text-center">Tag Qty</th>
                    <th className="py-2.5 px-2 text-center w-20">Good Qty</th>
                    <th className="py-2.5 px-2 text-center w-16">MD</th>
                    <th className="py-2.5 px-2 text-center w-16">ED</th>
                    <th className="py-2.5 px-2 text-center">MD Check</th>
                    <th className="py-2.5 px-2">Remarks</th>
                    <th className="py-2.5 px-2 text-center">Ready</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checkQueueBundles.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-slate-400">
                        No pending / ready bundles found for this filter.
                      </td>
                    </tr>
                  ) : (
                    checkQueueBundles.map((b) => (
                      <tr
                        key={b.id}
                        className={
                          b.status === 'READY_FOR_OUT'
                            ? 'bg-emerald-50/40 hover:bg-emerald-50/80'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCheckIds.includes(b.id)}
                            onChange={(e) =>
                              setSelectedCheckIds((prev) =>
                                e.target.checked
                                  ? [...prev, b.id]
                                  : prev.filter((id) => id !== b.id)
                              )
                            }
                          />
                        </td>
                        <td className="py-2 px-2">
                          <div className="font-bold text-slate-900">
                            {b.styleCode ? `${b.styleCode} - ${b.styleName}` : b.styleName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-500">{b.companyName}</span>
                            {b.partName && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[9.5px] font-extrabold">
                                {b.partName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-center">{b.cutNo || '-'}</td>
                        <td className="py-2 px-2 font-mono font-black text-center text-persian-800">
                          {b.bundleNo}
                        </td>
                        <td className="py-2 px-2 font-mono text-[11px] text-center text-slate-500">
                          {b.noRange || '-'}
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-center">{b.size}</td>
                        <td className="py-2 px-2 font-mono font-bold text-center text-slate-600">
                          {b.tagQty}
                        </td>
                        <td className="py-1.5 px-1.5">
                          <input
                            type="number"
                            min={0}
                            value={b.goodQty}
                            onChange={(e) =>
                              handleUpdateBundleInline(b, { goodQty: Number(e.target.value) })
                            }
                            className="w-18 p-1 bg-white border border-emerald-300 rounded font-mono font-black text-center text-emerald-800"
                          />
                        </td>
                        <td className="py-1.5 px-1.5">
                          <input
                            type="number"
                            min={0}
                            value={b.mdQty}
                            onChange={(e) =>
                              handleUpdateBundleInline(b, { mdQty: Number(e.target.value) })
                            }
                            className="w-14 p-1 bg-white border border-slate-200 rounded font-mono text-center"
                          />
                        </td>
                        <td className="py-1.5 px-1.5">
                          <input
                            type="number"
                            min={0}
                            value={b.edQty}
                            onChange={(e) =>
                              handleUpdateBundleInline(b, { edQty: Number(e.target.value) })
                            }
                            className="w-14 p-1 bg-white border border-slate-200 rounded font-mono text-center"
                          />
                        </td>
                        <td className="py-1.5 px-1.5 text-center">
                          <select
                            value={b.mdStatus}
                            onChange={(e) =>
                              handleUpdateBundleInline(b, {
                                mdStatus: e.target.value as BundleMdStatus,
                              })
                            }
                            className={`p-1 rounded border text-[10px] font-extrabold ${
                              b.mdStatus === 'PASS'
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                : b.mdStatus === 'FAIL'
                                ? 'bg-rose-100 border-rose-300 text-rose-800'
                                : 'bg-slate-100 border-slate-300 text-slate-600'
                            }`}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PASS">MD PASS</option>
                            <option value="FAIL">MD FAIL</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-1.5">
                          <input
                            type="text"
                            value={b.remarks}
                            onChange={(e) =>
                              handleUpdateBundleInline(b, { remarks: e.target.value })
                            }
                            placeholder="Remarks..."
                            className="w-full min-w-[100px] p-1 bg-white border border-slate-200 rounded text-[11px]"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBundleInline(b, {
                                status: b.status === 'READY_FOR_OUT' ? 'IN_HOUSE' : 'READY_FOR_OUT',
                                mdStatus:
                                  b.status !== 'READY_FOR_OUT' && b.mdStatus === 'PENDING'
                                    ? 'PASS'
                                    : b.mdStatus,
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition ${
                              b.status === 'READY_FOR_OUT'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 hover:bg-emerald-100 text-slate-700'
                            }`}
                          >
                            {b.status === 'READY_FOR_OUT' ? '✓ Ready' : 'Mark Ready'}
                          </button>
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleBundle(b)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            title="Delete Bundle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: OUT / DESPATCH NOTE + FACTORY GATE PASS + ARCHIVE          */}
        {/* ================================================================= */}
        {subTab === 'despatchOut' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left 7 Cols: Select Bundles Going Out */}
              <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-emerald-600" />
                      1. Select Checked Bundles Going Out ({availableOutBundles.length} Available)
                    </h3>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeInHouseForOut}
                        onChange={(e) => setIncludeInHouseForOut(e.target.checked)}
                      />
                      Include In-House Bundles
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={outSearch}
                        onChange={(e) => setOutSearch(e.target.value)}
                        placeholder="Bundle / Part / Cut..."
                        className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <select
                      value={outCompanyFilter}
                      onChange={(e) => setOutCompanyFilter(e.target.value)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="ALL">All Companies</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={outStyleFilter}
                      onChange={(e) => setOutStyleFilter(e.target.value)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="ALL">All Styles</option>
                      {activeStyles.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code ? `${s.code} - ${s.name}` : s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={outPartFilter}
                      onChange={(e) => setOutPartFilter(e.target.value)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="ALL">All Parts</option>
                      <option value={ALL_PARTS_VALUE}>All Parts (Full)</option>
                      {allBundleParts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <select
                      value={outSizeFilter}
                      onChange={(e) => setOutSizeFilter(e.target.value)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="ALL">All Sizes</option>
                      {allBundleSizes.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2 px-2 text-center w-9">
                          <input
                            type="checkbox"
                            checked={
                              availableOutBundles.length > 0 &&
                              availableOutBundles.every((b) => selectedOutIds.includes(b.id))
                            }
                            onChange={(e) =>
                              setSelectedOutIds(
                                e.target.checked ? availableOutBundles.map((b) => b.id) : []
                              )
                            }
                          />
                        </th>
                        <th className="py-2 px-2">Style</th>
                        <th className="py-2 px-2 text-center w-16">Job/Cut</th>
                        <th className="py-2 px-2 text-center">Bun. No</th>
                        <th className="py-2 px-2 text-center">Size</th>
                        <th className="py-2 px-2 text-center w-18">Qty</th>
                        <th className="py-2 px-2 text-center w-14">E.D</th>
                        <th className="py-2 px-2 text-center w-14">M.D</th>
                        <th className="py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {availableOutBundles.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            No bundles available for dispatch. Receive Cut-In bundles first.
                          </td>
                        </tr>
                      ) : (
                        availableOutBundles.map((b) => {
                          const checked = selectedOutIds.includes(b.id);
                          return (
                            <tr
                              key={b.id}
                              className={
                                checked
                                  ? 'bg-emerald-50/80'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setSelectedOutIds((prev) =>
                                      e.target.checked
                                        ? [...prev, b.id]
                                        : prev.filter((id) => id !== b.id)
                                    )
                                  }
                                />
                              </td>
                              <td className="py-2 px-2">
                                <div className="font-bold text-slate-900">
                                  {b.styleCode || b.styleName}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-[10px] text-slate-500">{b.companyName}</span>
                                  {b.partName && (
                                    <span className="px-1 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[9px] font-extrabold">
                                      {b.partName}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="text"
                                  value={b.jobNo || b.cutNo}
                                  onChange={(e) =>
                                    handleUpdateBundleInline(b, { jobNo: e.target.value })
                                  }
                                  className="w-14 p-1 bg-white border border-slate-200 rounded font-mono text-center text-[11px]"
                                />
                              </td>
                              <td className="py-2 px-2 font-mono font-black text-center text-persian-800">
                                {b.bundleNo}
                              </td>
                              <td className="py-2 px-2 font-mono font-bold text-center">{b.size}</td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={b.goodQty}
                                  onChange={(e) =>
                                    handleUpdateBundleInline(b, { goodQty: Number(e.target.value) })
                                  }
                                  className="w-16 p-1 bg-white border border-emerald-300 rounded font-mono font-black text-center"
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={b.edQty}
                                  onChange={(e) =>
                                    handleUpdateBundleInline(b, { edQty: Number(e.target.value) })
                                  }
                                  className="w-12 p-1 bg-white border border-slate-200 rounded font-mono text-center"
                                />
                              </td>
                              <td className="py-1.5 px-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={b.mdQty}
                                  onChange={(e) =>
                                    handleUpdateBundleInline(b, { mdQty: Number(e.target.value) })
                                  }
                                  className="w-12 p-1 bg-white border border-slate-200 rounded font-mono text-center"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                                    b.status === 'READY_FOR_OUT'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {b.status === 'READY_FOR_OUT' ? 'READY' : 'IN-HOUSE'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right 5 Cols: Despatch Note + Gate Pass Details Form */}
              <form
                onSubmit={handleConfirmDespatch}
                className="xl:col-span-5 bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="px-4 py-3.5 border-b border-emerald-100 bg-emerald-50/70">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <ArrowUpFromLine className="w-4 h-4 text-emerald-700" />
                    2. Despatch Note &amp; Gate Pass Details
                  </h3>
                  <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>Selected Bundles: {selectedOutBundles.length}</span>
                    <span className="font-mono text-sm font-black">
                      Total: {selectedOutBundles.reduce((s, b) => s + (b.goodQty || b.tagQty), 0).toLocaleString()} pcs
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Despatch No
                      </label>
                      <input
                        type="text"
                        value={despatchNoInput}
                        onChange={(e) => setDespatchNoInput(e.target.value)}
                        placeholder={`DN-${String(nextDespatchSeq).padStart(4, '0')}`}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Gate Pass No
                      </label>
                      <input
                        type="text"
                        value={gatepassNoInput}
                        onChange={(e) => setGatepassNoInput(e.target.value)}
                        placeholder={`GP-${String(nextDespatchSeq).padStart(4, '0')}`}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Yellow Sheet No
                      </label>
                      <input
                        type="text"
                        value={checklistNoInput}
                        onChange={(e) => setChecklistNoInput(e.target.value)}
                        placeholder={`CL-${String(nextDespatchSeq).padStart(4, '0')}`}
                        className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Despatch Date *
                      </label>
                      <input
                        type="date"
                        value={despatchDateInput}
                        onChange={(e) => setDespatchDateInput(e.target.value)}
                        required
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        MD Check (Yellow Sheet)
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDespatchMdStatus('PASS')}
                          className={`py-2 rounded-lg font-extrabold border text-[11px] cursor-pointer ${
                            despatchMdStatus === 'PASS'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          ✓ MD PASS
                        </button>
                        <button
                          type="button"
                          onClick={() => setDespatchMdStatus('FAIL')}
                          className={`py-2 rounded-lg font-extrabold border text-[11px] cursor-pointer ${
                            despatchMdStatus === 'FAIL'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          ✗ MD FAIL
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      TO (Recipient Name — e.g. Mr. Jayarathna) *
                    </label>
                    <input
                      type="text"
                      value={toPersonInput}
                      onChange={(e) => setToPersonInput(e.target.value)}
                      required
                      placeholder="e.g. Mr. Jayarathna"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Vehicle No (Gate Pass)
                      </label>
                      <input
                        type="text"
                        value={vehicleNoInput}
                        onChange={(e) => setVehicleNoInput(e.target.value)}
                        placeholder="e.g. WP LK-4521"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Driver / Carrier Name
                      </label>
                      <input
                        type="text"
                        value={driverNameInput}
                        onChange={(e) => setDriverNameInput(e.target.value)}
                        placeholder="Driver Name"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Checked By
                      </label>
                      <input
                        type="text"
                        list="style-inout-staff-list"
                        value={checkedByInput}
                        onChange={(e) => setCheckedByInput(e.target.value)}
                        placeholder="Checker Name"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Despatched By
                      </label>
                      <input
                        type="text"
                        list="style-inout-staff-list"
                        value={despatchedByInput}
                        onChange={(e) => setDespatchedByInput(e.target.value)}
                        placeholder="Despatch Officer"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Authorized By
                      </label>
                      <input
                        type="text"
                        list="style-inout-staff-list"
                        value={authorizedByInput}
                        onChange={(e) => setAuthorizedByInput(e.target.value)}
                        placeholder="Manager / Supervisor"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Received By (Optional)
                      </label>
                      <input
                        type="text"
                        value={receivedByInput}
                        onChange={(e) => setReceivedByInput(e.target.value)}
                        placeholder="Leave blank to sign on print"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Despatch / Sample Remarks
                    </label>
                    <input
                      type="text"
                      value={despatchRemarksInput}
                      onChange={(e) => setDespatchRemarksInput(e.target.value)}
                      placeholder="e.g. sample 03, urgent delivery..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || selectedOutBundles.length === 0}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center justify-center gap-2 cursor-pointer transition shadow-sm disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    {saving
                      ? 'Generating Documents...'
                      : `Confirm Out & Print Despatch / Gate Pass (${selectedOutBundles.length} Bundles)`}
                  </button>
                </div>
              </form>
            </div>

            {/* Dispatched Archive & Filterable Gate Pass Register */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Despatch Notes &amp; Gate Pass Archive ({filteredDespatchArchive.length})
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      placeholder="Search DN, GP, Bundle, Size, Style..."
                      className="pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold w-56"
                    />
                  </div>
                  <select
                    value={archiveCompany}
                    onChange={(e) => setArchiveCompany(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={archiveSize}
                    onChange={(e) => setArchiveSize(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="ALL">All Sizes</option>
                    {allBundleSizes.map((sz) => (
                      <option key={sz} value={sz}>
                        Size: {sz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Despatch / Gate Pass</th>
                      <th className="py-2 px-3">Date / Vehicle</th>
                      <th className="py-2 px-3">Company / To</th>
                      <th className="py-2 px-3">Bundles &amp; Sizes</th>
                      <th className="py-2 px-3 text-right">Total Qty</th>
                      <th className="py-2 px-3 text-center">Print Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDespatchArchive.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          No outgoing despatches / gate passes recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredDespatchArchive.map((desp) => {
                        const dBundles = bundles.filter((b) => b.despatchId === desp.id);
                        return (
                          <tr key={desp.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono">
                              <div className="font-black text-persian-800">{desp.despatchNo}</div>
                              <div className="text-[10px] font-bold text-emerald-700">
                                {desp.gatepassNo}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-slate-800">
                                {desp.despatchDate}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {desp.vehicleNo || 'No Vehicle'} {desp.driverName ? `• ${desp.driverName}` : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{desp.companyName}</div>
                              <div className="text-[10px] text-slate-500">To: {desp.toPerson || '-'}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1 max-w-[260px]">
                                {dBundles.slice(0, 6).map((b) => (
                                  <span
                                    key={b.id}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold"
                                  >
                                    #{b.bundleNo} ({b.size})
                                  </span>
                                ))}
                                {dBundles.length > 6 && (
                                  <span className="text-[10px] font-bold text-slate-500">
                                    +{dBundles.length - 6} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              <div className="font-black text-indigo-800">
                                {desp.totalQty.toLocaleString()} pcs
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {desp.totalBundles} bundles
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex flex-wrap items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPrintPayload({
                                      initialDoc: 'despatchNote',
                                      despatch: desp,
                                      bundles: dBundles,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-persian-50 hover:bg-persian-100 text-persian-800 border border-persian-200 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> Despatch
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPrintPayload({
                                      initialDoc: 'gatePass',
                                      despatch: desp,
                                      bundles: dBundles,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Gate Pass
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPrintPayload({
                                      initialDoc: 'bundleCheckList',
                                      despatch: desp,
                                      bundles: dBundles,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ClipboardCheck className="w-3 h-3" /> Yellow
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelDespatch(desp)}
                                  className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Cancel Despatch & Return Bundles to Ready Queue"
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
          </div>
        )}
      </div>

      {/* 3-in-1 Official Print Preview Modal (Despatch Note, Gate Pass, Yellow Bundle Check List) */}
      <StyleInOutPrintModal payload={printPayload} onClose={() => setPrintPayload(null)} />
    </div>
  );
}
