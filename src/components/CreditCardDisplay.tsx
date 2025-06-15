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
  UserCheck
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

  const getBankColor = (bank?: string) => {
    switch (bank?.toLowerCase()) {
      case 'mastercard':
        return 'bg-red-600/20 text-red-100 border-red-400/30';
      case 'american express':
      case 'amex':
        return 'bg-green-600/20 text-green-100 border-green-400/30';
      case 'rupay':
        return 'bg-purple-600/20 text-purple-100 border-purple-400/30';
      default:
        return 'bg-gray-500/20 text-gray-100 border-gray-400/30';
    }
  };

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
    <Card 
      className={`relative overflow-hidden transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg' 
          : 'hover:shadow-md'
      }`}
      onClick={() => onSelect(card.id)}
    >
      <CardContent className="p-0">
        {/* Credit Card Visual */}
        <div className={`p-6 text-white relative ${getCardGradient(card.issuing_bank)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-8 h-8" />
              {card.is_primary && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Primary
                </Badge>
              )}
              {isOwner && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-100 border-yellow-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  Owner
                </Badge>
              )}
              {isMember && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-100 border-green-400/30">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Member
                </Badge>
              )}
            </div>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                        <Users className="w-4 h-4 mr-2" />
                        Invite User
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
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
            )}
          </div>

          {showEditForm ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/70"
                placeholder="Card name"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={handleEdit}
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditName(card.card_name);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-2">{card.card_name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">
                  •••• •••• •••• {card.last_four_digits}
                </span>
                <span className="text-xs opacity-75">
                  {card.issuing_bank || 'Bank'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Card Type Badge */}
        {card.card_type && (
          <div className="px-6 py-3 bg-gray-50">
            <Badge variant="outline" className={getBankColor(card.issuing_bank)}>
              {card.card_type}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditCardDisplay;
