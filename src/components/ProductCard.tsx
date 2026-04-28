import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Droplets, Flame, Fuel, Zap } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  priceSource: string;
  availableQuantity: number;
  minOrderQuantity: number;
  image: string;
  change: number;
}

interface ProductCardProps {
  product: Product;
  onApply: (product: Product) => void;
}

// Safe number helper - ensures we always have a valid number for .toFixed()
const safeNum = (val: any, fallback: number = 0): number => {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return Number(val);
};

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'crude oil':
      return Droplets;
    case 'natural gas':
    case 'lpg':
      return Flame;
    case 'aviation fuel':
    case 'gasoline':
    case 'diesel':
    case 'fuel oil':
      return Fuel;
    default:
      return Zap;
  }
};

export default function ProductCard({ product, onApply }: ProductCardProps) {
  const [livePrice, setLivePrice] = useState<number>(safeNum(product.price, 0));
  const [priceChange, setPriceChange] = useState<number>(safeNum(product.change, 0));
  
  useEffect(() => {
    // Fetch live price from OilPrice.com API
    const fetchLivePrice = async () => {
      try {
        const { data } = await supabase.functions.invoke('bloomberg-prices', {
          body: { action: 'get-product-price', product: product.code }
        });
        
        if (data?.success && data.data) {
          // Only update if we get valid numeric values
          const newPrice = safeNum(data.data.price);
          const newChange = safeNum(data.data.change);
          
          if (newPrice > 0) {
            setLivePrice(newPrice);
          }
          setPriceChange(newChange);
        }
      } catch (err) {
        // Use default price if API fails - no state change needed
      }
    };

    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [product.code]);

  const safeLivePrice = safeNum(livePrice, safeNum(product.price, 0));
  const safePriceChange = safeNum(priceChange, safeNum(product.change, 0));
  const isPositive = safePriceChange >= 0;
  const Icon = getCategoryIcon(product.category);

  return (
    <Card className="bg-[#1A1A24] backdrop-blur-md border-white/5 hover:bg-[#1f1f2e] hover:shadow-glow-purple transition-all duration-300 group overflow-hidden">
      <div className="relative h-40 overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        <div className="absolute top-3 left-3">
          <Badge className="bg-[#D4AF37]/90 text-slate-900 font-bold">
            {product.code}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className={`${isPositive ? 'bg-green-500/90' : 'bg-red-500/90'} text-white flex items-center gap-1`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{safePriceChange.toFixed(2)}%
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-lg truncate">{product.name}</h3>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#00D4FF]" />
          </div>
          <div>
            <span className="text-slate-400 text-xs">{product.category}</span>
            <div className="text-slate-500 text-xs">Source: {product.priceSource}</div>
          </div>
        </div>
        
        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{product.description}</p>
        
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-white">${safeLivePrice.toFixed(2)}</span>
          <span className="text-slate-400 text-sm">/{product.unit}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
          <span>Min: {(product.minOrderQuantity || 0).toLocaleString()} {product.unit}s</span>
          <span>Available: {(product.availableQuantity || 0).toLocaleString()}</span>
        </div>
        
        <Button 
          onClick={() => onApply(product)}
          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all"
        >
          Apply for Allocation
        </Button>
      </CardContent>
    </Card>
  );
}
