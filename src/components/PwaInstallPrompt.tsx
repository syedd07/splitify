import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Laptop, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';

// Add CSS for animations
import './PwaInstallPrompt.css';

type DeviceType = 'iOS' | 'Android' | 'Desktop' | 'Unknown';

// Add type definition for the iOS Safari standalone property
interface SafariNavigator extends Navigator {
  standalone?: boolean;
}

export default function PwaInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('Unknown');
  const [animationEnded, setAnimationEnded] = useState(false);
  
  useEffect(() => {
    // Check if already in PWA mode using the display-mode media query
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check iOS Safari-specific standalone mode
    const isIOSStandalone = 
      (window.navigator as SafariNavigator).standalone === true;
    
    // Don't show if already installed as PWA
    if (isStandalone || isIOSStandalone) {
      return;
    }
    
    // Check if the prompt was previously dismissed
    const isDismissed = localStorage.getItem('pwaPromptDismissed') === 'true';
    if (isDismissed) {
      return;
    }
    
    // Detect device type
    const detectDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // iOS detection
      if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        setDeviceType('iOS');
      } 
      // Android detection
      else if (/android/i.test(userAgent)) {
        setDeviceType('Android');
      } 
      // Desktop
      else {
        setDeviceType('Desktop');
      }
    };
    
    detectDevice();
    
    // Show prompt after a delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
      
      // Set animation ended after animation duration (4 seconds)
      const animationTimer = setTimeout(() => {
        setAnimationEnded(true);
      }, 4000);
      
      return () => clearTimeout(animationTimer);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Early return if already in PWA mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as SafariNavigator).standalone === true;
  
  if (isStandalone || isIOSStandalone) {
    return null;
  }
  
  const handleClose = () => {
    setShowPrompt(false);
    // Store in localStorage to avoid showing again in this session
    localStorage.setItem('pwaPromptDismissed', 'true');
  };
  
  const getInstructionTitle = () => {
    switch(deviceType) {
      case 'iOS': return 'Install on iOS';
      case 'Android': return 'Install on Android';
      case 'Desktop': return 'Install on Desktop';
      default: return 'Install App';
    }
  };
  
  const getInstructionSteps = () => {
    switch(deviceType) {
      case 'iOS':
        return (
          <div className="space-y-4">
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">1</div>
              <div>
                <p className="font-medium">Tap the Share button at the bottom of the screen</p>
                <img 
                  src="/pwa-ios-1.jpg" 
                  alt="iOS Share Button" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[300px]"
                />
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">2</div>
              <div>
                <p className="font-medium">Scroll down and tap "Add to Home Screen"</p>
                <img 
                  src="/pwa-ios-2.jpg" 
                  alt="iOS Add to Home Screen" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[300px]"
                />
              </div>
            </div>
            <div className="flex gap-2 items-start">
              {/* <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">3</div>
              <div>
                <p className="font-medium">Tap "Add" in the top right corner</p>
                <img 
                  src="/pwa-ios-3.png" 
                  alt="iOS Add Confirmation" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[300px]"
                />
              </div> */}
            </div>
          </div>
        );
        
      case 'Android':
        return (
          <div className="space-y-4">
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">1</div>
              <div>
                <p className="font-medium">Tap the menu (⋮) button in Chrome</p>
                <img 
                  src="/pwa-android-1.png" 
                  alt="Android Menu" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[300px]"
                />
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">2</div>
              <div>
                <p className="font-medium">Tap "Add to Home screen"</p>
                <img 
                  src="/pwa-android-2.png" 
                  alt="Android Add to Home Screen" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[300px]"
                />
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">3</div>
              <div>
                <p className="font-medium">Tap "Add" to confirm</p>
                <img 
                  src="/pwa-android-3.png" 
                  alt="Android Confirmation" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[300px]"
                />
              </div>
            </div>
          </div>
        );
        
      case 'Desktop':
        return (
          <div className="space-y-4">
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">1</div>
              <div>
                <p className="font-medium">Look for the install icon in the address bar</p>
                <img 
                  src="/pwa-desktop-1.jpg" 
                  alt="Desktop Install Icon" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[400px] h-9 object-fill"
                />
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">2</div>
              <div>
                <p className="font-medium">Click "Install" in the prompt</p>
                <img 
                  src="/pwa-desktop-2.jpg" 
                  alt="Desktop Install Prompt" 
                  className="mt-2 rounded-lg border shadow-sm max-w-[400px]"
                />
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="bg-blue-100 rounded-full p-2 text-blue-600 mt-1">3</div>
              <p className="font-medium">The app will open in its own window, and you can access it from your desktop/start menu</p>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="space-y-4">
            <p>To install this app on your device:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>On iOS: Use Safari and tap the share icon, then "Add to Home Screen"</li>
              <li>On Android: Tap the menu button (⋮) in Chrome, then "Add to Home Screen"</li>
              <li>On Desktop: Look for the install icon in the address bar of your browser</li>
            </ul>
          </div>
        );
    }
  };
  
  const getPromptIcon = () => {
    switch(deviceType) {
      case 'iOS':
      case 'Android':
        return <Smartphone className="w-4 h-4 mr-2" />;
      case 'Desktop':
        return <Laptop className="w-4 h-4 mr-2" />;
      default:
        return <Download className="w-4 h-4 mr-2" />;
    }
  };
  
  return (
    <>
      {/* Bottom-right prompt with animation */}
      {showPrompt && (
        <div className="fixed bottom-4 right-4 z-50">
          <div 
            className={`bg-white rounded-lg shadow-lg p-4 max-w-[300px] border border-gray-200 
                      ${!animationEnded ? 'animate-attention-grabber' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1 text-blue-600">
                <Download className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Install Splitify!</h3>
              </div>
              <button 
                onClick={handleClose} 
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Add Splitify to your home screen for a better experience
            </p>
            <Button 
              onClick={() => setIsOpen(true)} 
              variant="default" 
              size="sm"
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              {getPromptIcon()}
              Install App
            </Button>
          </div>
        </div>
      )}
      
      {/* Full-screen guide dialog with entrance animation */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[600px] max-h-[80vh] overflow-y-auto animate-dialog-content">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              {getInstructionTitle()}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to install Splitify on your device
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-1 mt-2">
            {getInstructionSteps()}
            
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800">Why install Splitify?</h4>
                  <ul className="text-sm text-blue-700 space-y-1 mt-1">
                    <li>• Faster access - no need to open browser</li>
                    <li>• Works offline or with poor connection</li>
                    <li>• Full-screen experience without browser controls</li>
                    <li>• Looks and feels like a native app</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Close Guide
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}