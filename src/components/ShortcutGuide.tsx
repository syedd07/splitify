import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Keyboard, X, Zap } from 'lucide-react';

const ShortcutGuide = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Keyboard className="w-4 h-4 mr-2" />
        Shortcuts
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Keyboard Shortcuts
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span>New Expense</span>
            <Badge variant="outline" className="text-xs">Ctrl + N</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>New Payment</span>
            <Badge variant="outline" className="text-xs">Ctrl + P</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Focus Amount</span>
            <Badge variant="outline" className="text-xs">Ctrl + A</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Focus Description</span>
            <Badge variant="outline" className="text-xs">Ctrl + D</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Submit Form</span>
            <Badge variant="outline" className="text-xs">Enter</Badge>
          </div>
        </div>
        <div className="border-t pt-2 mt-3">
          <p className="text-xs text-muted-foreground">
            Press shortcuts while form is visible
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShortcutGuide;