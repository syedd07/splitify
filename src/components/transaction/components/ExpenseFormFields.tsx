
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Person } from '@/types/BillSplitter';

interface ExpenseFormFieldsProps {
  amount: string;
  setAmount: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  spentBy: string;
  setSpentBy: (value: string) => void;
  category: 'personal' | 'common';
  setCategory: (value: 'personal' | 'common') => void;
  people: Person[];
  getDaysInMonth: () => string[];
}

const ExpenseFormFields: React.FC<ExpenseFormFieldsProps> = ({
  amount,
  setAmount,
  description,
  setDescription,
  date,
  setDate,
  spentBy,
  setSpentBy,
  category,
  setCategory,
  people,
  getDaysInMonth
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Amount (₹)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <Select value={date} onValueChange={setDate}>
            <SelectTrigger>
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {getDaysInMonth().map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <Input
          placeholder="What was this expense for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Spent by {category === 'common' && '(Will be split equally)'}
          </label>
          <Select 
            value={spentBy} 
            onValueChange={setSpentBy}
            disabled={category === 'common'}
          >
            <SelectTrigger className={category === 'common' ? 'opacity-50' : ''}>
              <SelectValue placeholder={
                category === 'common' 
                  ? "Split among all people" 
                  : "Who spent this?"
              } />
            </SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name} {person.isCardOwner && '(Card Owner)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <Select value={category} onValueChange={(value: 'personal' | 'common') => {
            setCategory(value);
            if (value === 'common') {
              setSpentBy('');
            }
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="common">Common (Split Equally)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFormFields;
