import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CreditCardDisplay from './CreditCardDisplay';

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
}

interface CreditCardCarouselProps {
  cards: CreditCardData[];
  selectedCardId: string | null;
  onCardSelect: (cardId: string) => void;
  onUpdate: () => void;
  showAddCardButton?: boolean;
  onAddCard?: () => void;
}

const CreditCardCarousel: React.FC<CreditCardCarouselProps> = ({
  cards,
  selectedCardId,
  onCardSelect,
  onUpdate,
  showAddCardButton = false,
  onAddCard
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Find current selected card index
  useEffect(() => {
    const selectedIndex = cards.findIndex(card => card.id === selectedCardId);
    if (selectedIndex !== -1 && selectedIndex !== currentIndex) {
      setCurrentIndex(selectedIndex);
      scrollToCard(selectedIndex);
    }
  }, [selectedCardId, cards]);

  const scrollToCard = useCallback((index: number, smooth = true) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const cardWidth = 320; // Card width + gap
    const containerWidth = container.clientWidth;
    const targetScrollLeft = Math.max(0, (index * cardWidth) - (containerWidth / 2) + (cardWidth / 2));
    
    if (smooth) {
      setIsTransitioning(true);
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
      
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      container.scrollLeft = targetScrollLeft;
    }
  }, []);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onCardSelect(cards[newIndex].id);
      scrollToCard(newIndex);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onCardSelect(cards[newIndex].id);
      scrollToCard(newIndex);
    }
  };

  // Touch/Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleDragEnd = () => {
    if (!isDragging || !containerRef.current) return;
    setIsDragging(false);
    
    // Snap to nearest card
    const container = containerRef.current;
    const cardWidth = 320;
    const scrollPosition = container.scrollLeft;
    const nearestIndex = Math.round(scrollPosition / cardWidth);
    const clampedIndex = Math.max(0, Math.min(nearestIndex, cards.length - 1));
    
    if (clampedIndex !== currentIndex && clampedIndex < cards.length) {
      setCurrentIndex(clampedIndex);
      onCardSelect(cards[clampedIndex].id);
    }
    
    scrollToCard(currentIndex);
  };

  // Prevent default drag behavior on images
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full">
      {/* Navigation Arrows */}
      {cards.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-sm shadow-lg border-gray-200 hover:bg-white hover:shadow-xl transition-all duration-200 ${
              currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
            }`}
            onClick={handlePrevious}
            disabled={currentIndex === 0 || isTransitioning}
            aria-label="Previous card"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-sm shadow-lg border-gray-200 hover:bg-white hover:shadow-xl transition-all duration-200 ${
              currentIndex === cards.length - 1 ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
            }`}
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1 || isTransitioning}
            aria-label="Next card"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Cards Container */}
      <div
        ref={containerRef}
        className={`flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        {/* Cards */}
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="flex-shrink-0 scroll-snap-align-center"
            style={{ 
              scrollSnapAlign: 'center',
              width: '300px' 
            }}
          >
            <CreditCardDisplay
              card={{
                ...card,
                // Assign different background images based on card index
                backgroundIndex: (index % 25) + 1
              }}
              onUpdate={onUpdate}
              isSelected={selectedCardId === card.id}
              onSelect={onCardSelect}
            />
          </div>
        ))}

        {/* Add Card Button */}
        {showAddCardButton && onAddCard && (
          <div 
            className="flex-shrink-0 scroll-snap-align-center"
            style={{ 
              scrollSnapAlign: 'center',
              width: '300px' 
            }}
          >
            <div 
              className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors cursor-pointer bg-white/50 backdrop-blur-sm rounded-lg h-full min-h-[240px] flex items-center justify-center"
              onClick={onAddCard}
            >
              <div className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-600 mb-2">Add New Card</h3>
                <p className="text-sm text-muted-foreground">
                  Add another credit card
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {cards.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-blue-600 w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => {
                setCurrentIndex(index);
                onCardSelect(cards[index].id);
                scrollToCard(index);
              }}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CreditCardCarousel;