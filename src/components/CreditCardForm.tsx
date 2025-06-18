import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Loader2, CheckCircle, AlertCircle, X, Edit2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreditCardFormProps {
  onCardAdded: (card: any) => void;
  onCancel: () => void;
}

// Common card brands for selection
const cardBrands = [
  'Visa', 
  'Mastercard', 
  'American Express', 
  'Discover', 
  'Diners Club', 
  'JCB', 
  'RuPay',
  'UnionPay',
  'Other'
];

// Card types for selection
const cardTypes = ['Credit', 'Debit', 'Prepaid'];

const CreditCardForm: React.FC<CreditCardFormProps> = ({ onCardAdded, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardInfo, setCardInfo] = useState<any>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    
    // Reset verification when card number changes
    setCardInfo(null);
    setIsConfirmed(false);
    setIsEditing(false);
    
    // Auto-identify when we have at least 6 digits
    const digits = formatted.replace(/\s/g, '');
    if (digits.length >= 6) {
      identifyCardType(digits);
    }
  };

  const identifyCardType = (cardDigits: string) => {
    // Card identification patterns
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3(?:0[0-5]|[68])/,
      jcb: /^(?:2131|1800|35)/,
      rupay: /^6[0-9]{15}$|^8[0-9]{15}$/,
    };
    
    // Default to unknown
    let cardType = 'Unknown';
    
    // Check each pattern
    if (patterns.visa.test(cardDigits)) {
      cardType = 'Visa';
    } else if (patterns.mastercard.test(cardDigits)) {
      cardType = 'Mastercard';
    } else if (patterns.amex.test(cardDigits)) {
      cardType = 'American Express';
    } else if (patterns.discover.test(cardDigits)) {
      cardType = 'Discover';
    } else if (patterns.diners.test(cardDigits)) {
      cardType = 'Diners Club';
    } else if (patterns.jcb.test(cardDigits)) {
      cardType = 'JCB';
    } else if (patterns.rupay.test(cardDigits)) {
      cardType = 'RuPay';
    } else if (cardDigits.startsWith('5')) {
      // Additional check for Mastercard that doesn't fit the main pattern
      cardType = 'Mastercard';
    } else if (cardDigits.startsWith('6')) {
      // Additional check for RuPay/other Indian cards
      cardType = 'RuPay';
    }
    
    // Set card type info
    setCardInfo({
      brand: cardType,
      type: 'Credit'
    });
  };

  const handleBrandChange = (value: string) => {
    setCardInfo({
      ...cardInfo,
      brand: value
    });
  };

  const handleTypeChange = (value: string) => {
    setCardInfo({
      ...cardInfo,
      type: value
    });
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    // Reset confirmation when editing
    if (!isEditing) {
      setIsConfirmed(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm the card information is correct",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      const lastFourDigits = cleanCardNumber.slice(-4);

      const { data, error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user.id,
          card_name: cardName,
          last_four_digits: lastFourDigits,
          bin_info: cardInfo,
          card_type: cardInfo?.brand,
          is_primary: true // First card is always primary for now
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Credit card added successfully",
      });

      onCardAdded(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Add Credit Card
          </CardTitle>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Number Input */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <div className="relative">
              <Input
                id="cardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
                className="text-lg font-mono tracking-wider"
                required
              />
            </div>
          </div>

          {/* Card Name Input */}
          <div className="space-y-2">
            <Label htmlFor="cardName">Card Name/Nickname</Label>
            <Input
              id="cardName"
              type="text"
              placeholder="e.g., My Personal Card, Travel Card"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              required
            />
          </div>

          {/* Card Type Information */}
          {cardInfo && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-blue-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-800">Card Information</h4>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={toggleEditMode}
                    className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  >
                    {isEditing ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Done
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4 text-sm">
                  {/* Card Brand - Editable or Display */}
                  <div>
                    <Label className="text-muted-foreground mb-1 block">Card Brand:</Label>
                    {isEditing ? (
                      <Select 
                        value={cardInfo.brand} 
                        onValueChange={handleBrandChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select card brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {cardBrands.map(brand => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{cardInfo.brand}</p>
                    )}
                  </div>
                  
                  {/* Card Type - Editable or Display */}
                  <div>
                    <Label className="text-muted-foreground mb-1 block">Card Type:</Label>
                    {isEditing ? (
                      <Select 
                        value={cardInfo.type} 
                        onValueChange={handleTypeChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          {cardTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{cardInfo.type}</p>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      type="button"
                      variant={isConfirmed ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsConfirmed(!isConfirmed)}
                      className={isConfirmed ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmed
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Confirm Details
                        </>
                      )}
                    </Button>
                    
                    {!isConfirmed && (
                      <p className="text-sm text-muted-foreground">
                        Please confirm the card information is correct
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Security Note</p>
                <p className="text-yellow-700">
                  We only store the last 4 digits of your card and brand information. Your full card number is never stored.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !cardInfo || !isConfirmed || isEditing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Card...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Credit Card
                </>
              )}
            </Button>
            
            <Button type="button" onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreditCardForm;
