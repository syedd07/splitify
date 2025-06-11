
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
  category: 'personal' | 'common';
  spentBy: string; // person id
  splitBetween?: string[]; // person ids for common expenses
}

export interface PersonBalance {
  personId: string;
  personalExpenses: number;
  commonExpenses: number;
  totalOwed: number;
}

export interface SplitCalculation {
  personBalances: PersonBalance[];
  totalAmount: number;
  totalCommonExpenses: number;
}
