export interface Person {
  id: string;
  name: string;
  isCardOwner: boolean;
  role?: 'owner' | 'member' | 'guest';
  email?: string;
  user_id?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string; // This maps to transaction_date
  type: 'expense' | 'payment'; // This maps to transaction_type
  category: 'personal' | 'common';
  spentBy: string; // This should store person NAME, not ID (matches spent_by_person_name)
  splitBetween?: string[];
  includedPeople?: string[]; // Array of person IDs included in the split
  isCommonSplit?: boolean; // This maps to is_common_split
  month?: string; // Add these to match DB schema
  year?: string;
  user_id?: string; // Add to match DB schema
  credit_card_id?: string; // Add to match DB schema
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
