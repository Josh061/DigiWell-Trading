import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LivePrice } from '@/hooks/useLivePrices';

// Safe number helper - ensures we always have a valid number for .toFixed()
const safeNum = (val: any, fallback: number = 0): number => {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return Number(val);
};

interface LivePriceCardProps {
  price: LivePrice;
  icon?: React.ReactNode;
  showUnit?: boolean;
  compact?: boolean;
  className?: string;
}

function LivePriceCardComponent({ 
  price, 
  icon, 
  showUnit = true,
  compact = false,
  className 
}: LivePriceCardProps) {
  const safeChangePercent = safeNum(price?.changePercent);
  const safePrice = safeNum(price?.price);
  const safeChange = safeNum(price?.change);
  const isPositive = safeChangePercent >= 0;
  const isNeutral = safeChangePercent === 0;
  
  // Determine flash animation class
  const flashClass = price?.flash === 'up' 
    ? 'animate-flash-green' 
    : price?.flash === 'down' 
      ? 'animate-flash-red' 
      : '';

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 transition-all duration-300",
          flashClass,
          className
        )}
      >
        {icon && (
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{price?.symbol || 'N/A'}</span>
            <Badge className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5">
              {(price?.name || '').split(' ')[0]}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            "font-mono font-bold transition-colors duration-300",
            price?.flash === 'up' ? 'text-green-400' : price?.flash === 'down' ? 'text-red-400' : 'text-white'
          )}>
            ${safePrice.toFixed(2)}
          </div>
          <div className={cn(
            "text-xs flex items-center justify-end gap-0.5",
            isNeutral ? 'text-slate-400' : isPositive ? 'text-green-400' : 'text-red-400'
          )}>
            {isNeutral ? (
              <Minus className="w-3 h-3" />
            ) : isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{isPositive ? '+' : ''}{safeChangePercent.toFixed(3)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300 overflow-hidden relative",
        flashClass,
        className
      )}
    >
      {/* Flash overlay */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-500",
          price?.flash === 'up' ? 'bg-green-500/20 opacity-100' : 
          price?.flash === 'down' ? 'bg-red-500/20 opacity-100' : 
          'opacity-0'
        )}
      />
      
      <CardContent className="p-4 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300",
                isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
              )}>
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-white font-semibold">{price?.name || 'N/A'}</h3>
              <Badge className="bg-slate-700/50 text-slate-300 text-xs">{price?.symbol || 'N/A'}</Badge>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 transition-colors duration-300",
            isNeutral ? 'text-slate-400' : isPositive ? 'text-green-400' : 'text-red-400'
          )}>
            {isNeutral ? (
              <Minus className="w-4 h-4" />
            ) : isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}{safeChangePercent.toFixed(3)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span 
            className={cn(
              "text-3xl font-bold transition-colors duration-300",
              price?.flash === 'up' ? 'text-green-400' : 
              price?.flash === 'down' ? 'text-red-400' : 
              'text-white'
            )}
          >
            ${safePrice.toFixed(2)}
          </span>
          {showUnit && (
            <span className="text-slate-400 text-sm">/{price?.unit || 'unit'}</span>
          )}
        </div>
        
        {/* Price change indicator */}
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span>Change:</span>
          <span className={cn(
            "font-mono",
            isPositive ? 'text-green-400' : 'text-red-400'
          )}>
            {isPositive ? '+' : ''}{safeChange.toFixed(4)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export const LivePriceCard = memo(LivePriceCardComponent);
export default LivePriceCard;
