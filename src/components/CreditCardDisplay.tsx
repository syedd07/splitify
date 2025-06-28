import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Users,
  Crown,
  UserCheck,
  Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import InviteUserDialog from './InviteUserDialog';
import CardMembersDialog from './CardMembersDialog';
import './CreditCardDisplay.css';

interface CreditCardData {
  id: string;
  card_name: string;
  last_four_digits: string;
  issuing_bank?: string;
  card_type?: string;
  is_primary: boolean;
  bin_info?: any;
  user_id?: string;
  role?: string;
  shared_emails?: string[];
  backgroundIndex?: number; // Add this for different backgrounds
}

interface CreditCardDisplayProps {
  card: CreditCardData;
  onUpdate: () => void;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
}

const CreditCardDisplay: React.FC<CreditCardDisplayProps> = ({
  card,
  onUpdate,
  isSelected,
  onSelect
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState(card.card_name);
  
  // Use backgroundIndex if provided, otherwise generate based on card ID
  const [cardBackground] = useState(() => {
    if (card.backgroundIndex) {
      return card.backgroundIndex;
    }
    // Generate a consistent background based on card ID
    const hash = card.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash % 25) + 1;
  });
  
  const { toast } = useToast();

  const isOwner = card.role === 'owner';
  const isMember = card.role === 'member';

  const handleDelete = async () => {
    if (!isOwner) {
      toast({
        title: "Access denied",
        description: "Only the card owner can delete this card",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this credit card? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credit card deleted successfully",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credit card",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (!isOwner) {
      toast({
        title: "Access denied",
        description: "Only the card owner can edit this card",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({ card_name: editName })
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credit card name updated successfully",
      });
      
      setShowEditForm(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update credit card",
        variant: "destructive",
      });
    }
  };

  // Get card brand from bin_info or card_type
  const getCardBrand = () => {
    if (card.bin_info?.brand) return card.bin_info.brand;
    if (card.card_type) return card.card_type;
    return 'Visa'; // default
  };

  // Get card type for the visual display
  const getCardTypeForImage = () => {
    const brand = getCardBrand().toLowerCase();
    
    // Special case for RuPay - use external image
    if (brand === 'rupay') {
      return 'rupay';
    }
    
    // Convert the brand name to lowercase for the image naming convention
    const brandMap: Record<string, string> = {
      'visa': 'visa',
      'mastercard': 'mastercard',
      'american express': 'amex',
      'discover': 'discover',
      'diners club': 'diners',
      'jcb': 'jcb',
      'unionpay': 'visa', // Fallback to visa icon for UnionPay
      'other': 'visa' // Fallback to visa icon for Other
    };
    
    return brandMap[brand] || 'visa';
  };

  const formatCardNumber = (lastFour: string) => {
    const cardType = getCardTypeForImage();
    
    if (cardType === 'amex') {
      // AMEX format: **** ****** *XXXX
      return `**** ****** *${lastFour}`;
    } else {
      // Other cards: **** **** **** XXXX
      return `**** **** **** ${lastFour}`;
    }
  };

  const getMemberCount = () => {
    if (!card.shared_emails) return 0;
    return Array.isArray(card.shared_emails) ? card.shared_emails.length : 0;
  };

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 cursor-pointer group ${
        isSelected 
          ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl scale-105' 
          : 'hover:shadow-xl shadow-md hover:scale-102'
      } bg-white border-0 mx-auto w-full max-w-[300px] select-none`}
      onClick={() => onSelect(card.id)}
    >
      <CardContent className="p-0">
        {/* Credit Card Visual - Similar to CreditCardForm */}
        <div className="relative">
          {/* Card Container */}
          <div className="aspect-[1.6/1] relative overflow-hidden rounded-t-lg">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={`https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/${cardBackground}.jpeg`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                alt="Card background"
                draggable={false}
                onError={(e) => {
                  // Fallback to a gradient if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Fallback gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800"></div>
              {/* Dark overlay for better text contrast */}
              <div className="absolute inset-0 bg-black/20"></div>
            </div>

            {/* Card Content */}
            <div className="relative z-10 p-4 sm:p-5 h-full flex flex-col text-white">
              {/* Top Row */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  {/* Chip */}
                  <img 
                    src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/chip.png" 
                    className="w-8 h-6 sm:w-10 sm:h-7 transition-transform duration-200 hover:scale-110"
                    alt="Credit card chip"
                    draggable={false}
                  />
                  
                  {/* Primary Badge */}
                  {card.is_primary && (
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs font-medium px-2 py-0.5 animate-pulse">
                      Primary
                    </Badge>
                  )}
                </div>
                
                {/* Card Brand Logo */}
                <div className="h-6 sm:h-8 flex items-center">
                  <img 
                    src={getCardTypeForImage() === 'rupay' 
                      ? "https://upload.wikimedia.org/wikipedia/commons/c/cb/Rupay-Logo.png" 
                      : `https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/${getCardTypeForImage()}.png`
                    }
                    alt={getCardBrand()}
                    className={`max-h-full max-w-[60px] sm:max-w-[80px] object-contain transition-transform duration-200 hover:scale-110 ${
                      getCardTypeForImage() === 'rupay' ? 'h-8' : ''
                    }`}
                    draggable={false}
                  />
                </div>
              </div>

              {/* Card Number */}
              <div className="flex-1 flex items-center">
                <div className="font-mono text-lg sm:text-xl font-medium tracking-wider text-shadow transition-all duration-200 group-hover:tracking-widest">
                  {formatCardNumber(card.last_four_digits)}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex justify-between items-end">
                {/* Card Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs opacity-80 mb-1">Card Name</div>
                  <div className="font-medium text-sm sm:text-base truncate text-shadow">
                    {card.card_name}
                  </div>
                </div>

                {/* Menu Button - Positioned absolutely to avoid conflicts */}
                {isOwner && (
                  <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-white hover:bg-white/30 backdrop-blur-sm w-7 h-7 p-0 rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setShowEditForm(true);
                        }}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Name
                        </DropdownMenuItem>
                        <CardMembersDialog 
                          cardId={card.id} 
                          cardName={card.card_name}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Users className="w-4 h-4 mr-2" />
                              Manage Members
                            </DropdownMenuItem>
                          }
                        />
                        <InviteUserDialog 
                          cardId={card.id} 
                          cardName={card.card_name}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Mail className="w-4 h-4 mr-2" />
                              Invite User
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting ? 'Deleting...' : 'Delete Card'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 left-3 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form Overlay */}
        {showEditForm && (
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3 shadow-xl animate-in slide-in-from-bottom-4 duration-200">
              <h4 className="font-semibold text-gray-800">Edit Card Name</h4>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                placeholder="Card name"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleEdit}
                  className="flex-1 transition-all duration-200 hover:scale-105"
                >
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditName(card.card_name);
                  }}
                  className="flex-1 transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Card Info Footer */}
        <div className="px-4 py-3 bg-gray-50/80 backdrop-blur-sm transition-all duration-200 group-hover:bg-gray-100/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Role Badge */}
              {isOwner && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 font-medium text-xs px-2 py-0.5 transition-all duration-200 hover:scale-105">
                  <Crown className="w-3 h-3 mr-1" />
                  Owner
                </Badge>
              )}
              {isMember && (
                <Badge className="bg-green-100 text-green-800 border-green-300 font-medium text-xs px-2 py-0.5 transition-all duration-200 hover:scale-105">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Member
                </Badge>
              )}
              
              {/* Card Type */}
              {card.bin_info?.type && (
                <Badge variant="outline" className="bg-white border-gray-300 text-gray-700 font-medium text-xs transition-all duration-200 hover:scale-105">
                  {card.bin_info.type}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Member Count for Owners */}
              {isOwner && getMemberCount() > 0 && (
                <div className="flex items-center gap-1 text-gray-600 text-xs transition-all duration-200 hover:scale-105">
                  <Users className="w-3 h-3" />
                  <span className="font-medium">{getMemberCount()}</span>
                </div>
              )}
              
              {/* Selection Status */}
              {isSelected && (
                <div className="flex items-center gap-1 text-blue-600 font-medium text-xs animate-pulse">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  Selected
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditCardDisplay;
