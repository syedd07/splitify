
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Crown, Trash2, Edit } from 'lucide-react';

interface CreditCardDisplayProps {
  card: {
    id: string;
    card_name: string;
    last_four_digits: string;
    issuing_bank?: string;
    card_type?: string;
    is_primary: boolean;
  };
  onUpdate: () => void;
}

const CreditCardDisplay: React.FC<CreditCardDisplayProps> = ({ card, onUpdate }) => {
  const getCardGradient = (cardType?: string) => {
    switch (cardType?.toLowerCase()) {
      case 'visa':
        return 'from-blue-600 to-blue-800';
      case 'mastercard':
        return 'from-red-600 to-orange-600';
      case 'american express':
      case 'amex':
        return 'from-green-600 to-teal-600';
      case 'rupay':
        return 'from-purple-600 to-pink-600';
      default:
        return 'from-gray-600 to-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-8 rounded bg-gradient-to-r ${getCardGradient(card.card_type)} flex items-center justify-center`}>
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{card.card_name}</h3>
              <p className="text-sm text-muted-foreground">•••• {card.last_four_digits}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {card.is_primary && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Primary
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {card.issuing_bank && (
            <div>
              <p className="text-xs text-muted-foreground">Issuing Bank</p>
              <p className="text-sm font-medium">{card.issuing_bank}</p>
            </div>
          )}
          {card.card_type && (
            <div>
              <p className="text-xs text-muted-foreground">Card Type</p>
              <p className="text-sm font-medium">{card.card_type}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditCardDisplay;
