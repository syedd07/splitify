
export interface Person {
  id: string;
  name: string;
  isCardOwner?: boolean;
}

export interface CreditCard {
  id: string;
  card_name: string;
  last_four_digits: string;
  issuing_bank?: string;
  card_type?: string;
  is_primary: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'expense' | 'payment';
  category: 'personal' | 'common';
  spentBy: string; // person id
  creditCardId?: string; // New field for linking to credit card
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
