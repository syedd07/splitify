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

  const getCardGradient = (cardType?: string) => {
    switch (cardType?.toLowerCase()) {
      case 'visa':
        return 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800';
      case 'mastercard':
        return 'bg-gradient-to-br from-red-600 via-orange-600 to-red-700';
      case 'american express':
      case 'amex':
        return 'bg-gradient-to-br from-green-600 via-teal-600 to-green-700';
      case 'rupay':
        return 'bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700';
      default:
        return 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900';
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/90 text-yellow-50 border-yellow-400/50';
      case 'member':
        return 'bg-green-500/90 text-green-50 border-green-400/50';
      default:
        return 'bg-blue-500/90 text-blue-50 border-blue-400/50';
    }
  };

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 cursor-pointer transform hover:scale-105 ${
        isSelected 
          ? 'ring-2 sm:ring-4 ring-blue-500 ring-offset-2 sm:ring-offset-4 shadow-xl scale-105' 
          : 'hover:shadow-xl shadow-md'
      } bg-white border border-gray-100 mx-auto w-full max-w-[350px] sm:max-w-none`}
      onClick={() => onSelect(card.id)}
    >
      <CardContent className="p-0">
        {/* Credit Card Visual */}
        <div className={`p-6 text-white relative ${getCardGradient(card.issuing_bank)} shadow-inner`}>
          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            </div>
          )}
          
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-8 h-8 drop-shadow-sm" />
              {card.is_primary && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm font-medium">
                  Primary
                </Badge>
              )}
            </div>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 backdrop-blur-sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border shadow-lg">
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
            )}
          </div>

          {showEditForm ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/70 backdrop-blur-sm"
                placeholder="Card name"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleEdit}
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm"
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
                  className="text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-4 drop-shadow-sm">{card.card_name}</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-mono tracking-wider drop-shadow-sm">
                  •••• •••• •••• {card.last_four_digits}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90 font-medium">
                  {card.issuing_bank || card.card_type || 'Credit Card'}
                </span>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <Badge className={`${getRoleBadgeColor('owner')} backdrop-blur-sm font-medium`}>
                      <Crown className="w-3 h-3 mr-1" />
                      Owner
                    </Badge>
                  )}
                  {isMember && (
                    <Badge className={`${getRoleBadgeColor('member')} backdrop-blur-sm font-medium`}>
                      <UserCheck className="w-3 h-3 mr-1" />
                      Member
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Card Info Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {card.card_type && (
                <Badge variant="outline" className="bg-white border-gray-300 text-gray-700 font-medium">
                  {card.card_type.toUpperCase()}
                </Badge>
              )}
            </div>
            {isSelected && (
              <div className="flex items-center gap-1 text-blue-600 font-medium text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Selected
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditCardDisplay;
