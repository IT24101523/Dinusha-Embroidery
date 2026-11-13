import * as XLSX from 'xlsx';
import { EmployeeEntity, PayrollCalculationBreakdown } from './entities';

export interface EpfEtfRow {
  memberNo: number;
  epfNo: number;
  initials: string;
  surname: string;
  fullName: string;
  formCName: string;
  nic: string;
  basicEarnings: number;
  grossEarnings: number;
  epf8: number;
  epf12: number;
  totalEpf20: number;
  etf3: number;
  daysWorked: number;
  status: 'E' | 'N'; // E = Existing, N = New
  employerNumber: string;
  zone: string;
  period: string; // YYYYMM without slash
}

/**
 * Parses Sri Lankan names like "G.A.S.N. Kumara" into Initials and Surname
 */
export function parseSriLankanName(fullName: string): { initials: string; surname: string; formCName: string } {
  if (!fullName) return { initials: '', surname: '', formCName: '' };

  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const initialParts = parts.slice(0, parts.length - 1).join(' ');
    // Remove dots, format with space
    const initials = initialParts.replace(/\./g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    const surname = last.toUpperCase();
    return {
      initials,
      surname,
      formCName: `${surname} ${initials}`.trim(),
    };
  }

  return {
    initials: '',
    surname: trimmed.toUpperCase(),
    formCName: trimmed.toUpperCase(),
  };
}

/**
 * Transforms employees and monthly payroll breakdowns into standardized EPF / ETF rows
 */
export function generateEpfEtfData(
  employees: EmployeeEntity[],
  recordsMap: Record<string, PayrollCalculationBreakdown>,
  monthString: string
): EpfEtfRow[] {
  // Convert month string (e.g. "October 2026") into YYYY/MM format for EPF
  const period = formatMonthToPeriod(monthString);

  return employees
    .filter((e) => e.isActive)
    .sort((a, b) => a.epfNo - b.epfNo)
    .map((emp) => {
      // Prioritize explicit initials and surname fields, fallback to name parser
      let initials = (emp.initials || '').trim().replace(/\./g, ' ').replace(/\s+/g, ' ').toUpperCase();
      let surname = (emp.surname || '').trim().toUpperCase();
      let formCName = '';

      if (!initials || !surname) {
        const parsed = parseSriLankanName(emp.fullName);
        if (!initials) initials = parsed.initials;
        if (!surname) surname = parsed.surname;
        formCName = parsed.formCName;
      } else {
        formCName = `${surname} ${initials}`.trim();
      }

      const rec = recordsMap[emp.id];

      const basicEarnings = rec
        ? Math.max(0, Number((rec.basic - rec.unpaidDeduction).toFixed(2)))
        : emp.basicSalary;
      const grossEarnings = rec ? rec.gross : emp.basicSalary;
      const epf8 = rec ? rec.epf8 : Number((basicEarnings * 0.08).toFixed(2));
      const epf12 = rec ? rec.epf12 : Number((basicEarnings * 0.12).toFixed(2));
      const totalEpf20 = Number((epf8 + epf12).toFixed(2));
      const etf3 = rec ? rec.etf3 : Number((basicEarnings * 0.03).toFixed(2));

      // Calculate days worked (standard 25 minus unpaid days)
      const unpaidDays = rec ? rec.unpaidDays : 0;
      const daysWorked = Math.max(0, Number((25 - unpaidDays).toFixed(2)));

      // Check if employee joined this year/month -> 'N' for New, else 'E' for Existing
      const isNew = emp.joinedDate ? emp.joinedDate.startsWith('2026') : false;

      return {
        memberNo: emp.epfNo,
        epfNo: emp.epfNo,
        initials,
        surname,
        fullName: emp.fullName,
        formCName,
        nic: emp.nic,
        basicEarnings,
        grossEarnings,
        epf8,
        epf12,
        totalEpf20,
        etf3,
        daysWorked,
        status: isNew ? 'N' : 'E',
        employerNumber: '14585',
        zone: 'I',
        period,
      };
    });
}

function formatMonthToPeriod(monthStr: string): string {
  // Try to match "October 2026" or similar
  const months: Record<string, string> = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };

  const lower = monthStr.toLowerCase();
  let foundMonth = '10';
  for (const m in months) {
    if (lower.includes(m)) {
      foundMonth = months[m];
      break;
    }
  }

  const yearMatch = monthStr.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : '2026';

  // Return YYYYMM format (e.g. 202610) without "/" separator
  return `${year}${foundMonth}`;
}

/**
 * Downloads data as a native Excel .xlsx file
 */
export function exportToExcel(sheets: { name: string; data: Record<string, unknown>[] }[], filename: string) {
  const wb = XLSX.utils.book_new();

  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

