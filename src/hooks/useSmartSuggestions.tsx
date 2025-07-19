import { useState, useEffect, useMemo } from 'react';
import { Transaction } from '@/types/BillSplitter';

interface UseSmartSuggestionsProps {
  transactions: Transaction[];
  currentDescription: string;
}

export const useSmartSuggestions = ({ transactions, currentDescription }: UseSmartSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get unique descriptions from previous transactions
  const previousDescriptions = useMemo(() => {
    const descriptions = transactions
      .map(t => t.description.toLowerCase().trim())
      .filter(desc => desc.length > 2);
    
    return [...new Set(descriptions)].slice(0, 20); // Limit to 20 unique descriptions
  }, [transactions]);

  // Common expense suggestions
  const commonSuggestions = [
    'Groceries', 'Dinner', 'Lunch', 'Coffee', 'Gas', 'Uber', 'Movie tickets',
    'Shopping', 'Restaurant', 'Fast food', 'Pharmacy', 'Utilities', 'Internet',
    'Phone bill', 'Subscription', 'Parking', 'Hotel', 'Flight', 'Train ticket'
  ];

  useEffect(() => {
    if (currentDescription.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = currentDescription.toLowerCase();
    
    // Filter previous descriptions
    const matchingPrevious = previousDescriptions.filter(desc => 
      desc.includes(query) && desc !== query
    );

    // Filter common suggestions
    const matchingCommon = commonSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(query) && 
      suggestion.toLowerCase() !== query
    );

    // Combine and limit results
    const combined = [...matchingPrevious, ...matchingCommon].slice(0, 5);
    
    setSuggestions(combined);
    setShowSuggestions(combined.length > 0);
  }, [currentDescription, previousDescriptions]);

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions
  };
};