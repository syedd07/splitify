
export interface Person {
  id: string;
  name: string;
  isCardOwner?: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'expense' | 'payment'; // New field to distinguish expenses from payments
  category: 'personal' | 'common'; // For expenses only, payments are always personal
  spentBy: string; // person id
  splitBetween?: string[]; // person ids for common expenses
  isCommonSplit?: boolean; // to identify individual splits from common expenses
}

export interface PersonBalance {
  personId: string;
  personalExpenses: number;
  commonExpenses: number;
  totalExpenses: number;
  totalPayments: number;
  netBalance: number; // positive means they owe, negative means they should receive
}

export interface SplitCalculation {
  personBalances: PersonBalance[];
  totalExpenses: number;
  totalPayments: number;
  totalCommonExpenses: number;
  outstandingBalance: number;
}
