export interface FinanceStyleOption {
  code: string;
  name: string;
  price: number;
  currency: 'LKR' | 'USD' | 'EUR' | 'GBP';
}

export const COGS_CATEGORIES = [
  'Embroidery Threads',
  'Backing (Tearaway/Cutaway)',
  'Needles',
  'Chemicals & Sprays',
  'Packaging Materials',
  'Other Raw Materials',
];

export const OPEX_CATEGORIES = [
  'Advertising And Marketing',
  'Automobile Expense',
  'Bank Fees and Charges',
  'Electricity & Utilities',
  'IT and Internet Expenses',
  'Janitorial Expense',
  'Meals and Entertainment',
  'Office Supplies',
  'Repairs and Maintenance',
  'Telephone Expense',
  'Travel Expense',
  'Other Expenses',
];
