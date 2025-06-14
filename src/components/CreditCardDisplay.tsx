
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Crown, Trash2, Edit, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(card.card_name);
  const { toast } = useToast();

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

  const handleEdit = async () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Card name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({ card_name: editName.trim() })
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Card name updated successfully",
      });

      setEditOpen(false);
      onUpdate();
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

  const handleRemove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credit card removed successfully",
      });

      onUpdate();
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
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Card Name</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cardName">Card Name</Label>
                  <Input
                    id="cardName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g., My HDFC Card"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" disabled={loading}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Credit Card</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{card.card_name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    'Remove Card'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditCardDisplay;
