import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, Calculator, TrendingUp, TrendingDown, 
  Check, X, Info, Percent, Coins, Edit3, RefreshCw
} from 'lucide-react';

interface PriceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number, currency: string, quantity: number) => void;
  productName: string;
  productCode: string;
  livePrice: number;
  unit: string;
  minQuantity: number;
  maxQuantity: number;
  priceSource?: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

// Approximate exchange rates (in production, fetch from API)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1550,
  EUR: 0.92,
  GBP: 0.79,
};

export default function PriceInputModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  productCode,
  livePrice,
  unit,
  minQuantity,
  maxQuantity,
  priceSource = 'Live Market'
}: PriceInputModalProps) {
  const [customPrice, setCustomPrice] = useState(livePrice.toString());
  const [quantity, setQuantity] = useState(minQuantity.toString());
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [useMarketPrice, setUseMarketPrice] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const price = useMarketPrice ? livePrice : parseFloat(customPrice) || 0;
  const qty = parseInt(quantity) || 0;
  const currencyInfo = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];
  const exchangeRate = EXCHANGE_RATES[selectedCurrency] || 1;
  
  // Calculate totals
  const subtotal = price * qty;
  const serviceFee = 0; // 0% service fee
  const total = subtotal + serviceFee;
  const totalInSelectedCurrency = total * exchangeRate;

  // Calculate price difference from market
  const priceDifference = price - livePrice;
  const priceDifferencePercent = livePrice > 0 ? ((priceDifference / livePrice) * 100) : 0;

  useEffect(() => {
    if (isOpen) {
      setCustomPrice(livePrice.toString());
      setQuantity(minQuantity.toString());
      setUseMarketPrice(true);
      setError(null);
    }
  }, [isOpen, livePrice, minQuantity]);

  const validateAndConfirm = () => {
    setError(null);

    if (price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    if (qty < minQuantity) {
      setError(`Minimum quantity is ${minQuantity.toLocaleString()} ${unit}s`);
      return;
    }

    if (qty > maxQuantity) {
      setError(`Maximum quantity is ${maxQuantity.toLocaleString()} ${unit}s`);
      return;
    }

    // Warn if price is significantly different from market
    if (!useMarketPrice && Math.abs(priceDifferencePercent) > 10) {
      const confirmed = window.confirm(
        `Your price is ${priceDifferencePercent > 0 ? 'above' : 'below'} market price by ${Math.abs(priceDifferencePercent).toFixed(1)}%. Continue?`
      );
      if (!confirmed) return;
    }

    onConfirm(price, selectedCurrency, qty);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 border-[#D4AF37]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#D4AF37]" />
                Price Configuration
              </CardTitle>
              <p className="text-slate-400 text-sm mt-1">{productName} ({productCode})</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Live Market Price */}
          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Live Market Price</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {priceSource}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#D4AF37]">${livePrice.toFixed(2)}</span>
              <span className="text-slate-400">per {unit}</span>
            </div>
          </div>

          {/* Price Input Mode Toggle */}
          <div className="space-y-3">
            <Label className="text-white">Price Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUseMarketPrice(true)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  useMarketPrice 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    useMarketPrice ? 'bg-[#D4AF37]/20' : 'bg-slate-700'
                  }`}>
                    <TrendingUp className={`w-5 h-5 ${useMarketPrice ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold ${useMarketPrice ? 'text-[#D4AF37]' : 'text-white'}`}>
                      Market Price
                    </div>
                    <div className="text-slate-400 text-sm">Use live price</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setUseMarketPrice(false)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  !useMarketPrice 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    !useMarketPrice ? 'bg-[#D4AF37]/20' : 'bg-slate-700'
                  }`}>
                    <Edit3 className={`w-5 h-5 ${!useMarketPrice ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold ${!useMarketPrice ? 'text-[#D4AF37]' : 'text-white'}`}>
                      Custom Price
                    </div>
                    <div className="text-slate-400 text-sm">Enter manually</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Price Input */}
          {!useMarketPrice && (
            <div className="space-y-3">
              <Label className="text-white">Custom Price (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600 text-white text-lg"
                  min="0"
                  step="0.01"
                  placeholder="Enter price..."
                />
              </div>
              
              {/* Price Comparison */}
              {price !== livePrice && (
                <div className={`flex items-center gap-2 text-sm ${priceDifference > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {priceDifference > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {priceDifference > 0 ? '+' : ''}{priceDifferencePercent.toFixed(2)}% 
                    ({priceDifference > 0 ? '+' : ''}${priceDifference.toFixed(2)}) from market
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-3">
            <Label className="text-white">Quantity ({unit}s)</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white text-lg"
              min={minQuantity}
              max={maxQuantity}
              step="1"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Min: {minQuantity.toLocaleString()}</span>
              <span>Max: {maxQuantity.toLocaleString()}</span>
            </div>
          </div>

          {/* Currency Selection */}
          <div className="space-y-3">
            <Label className="text-white">Payment Currency</Label>
            <div className="grid grid-cols-4 gap-2">
              {CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => setSelectedCurrency(currency.code)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedCurrency === currency.code
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className={`text-lg font-bold ${selectedCurrency === currency.code ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {currency.symbol}
                  </div>
                  <div className="text-xs text-slate-400">{currency.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Unit Price</span>
              <span className="text-white">${price.toFixed(2)} / {unit}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Quantity</span>
              <span className="text-white">{qty.toLocaleString()} {unit}s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Subtotal (USD)</span>
              <span className="text-white">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                Service Fee
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">0%</Badge>
              </span>
              <span className="text-green-400 font-bold">FREE</span>
            </div>
            <div className="border-t border-slate-600 pt-3">
              <div className="flex justify-between items-center text-lg">
                <span className="text-white font-bold">Total ({selectedCurrency})</span>
                <span className="text-[#D4AF37] font-bold text-xl">
                  {currencyInfo.symbol}{totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {selectedCurrency !== 'USD' && (
                <div className="text-right text-slate-400 text-sm mt-1">
                  ≈ ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </div>
              )}
            </div>
          </div>

          {/* 0% Fee Banner */}
          <Alert className="bg-green-500/10 border-green-500/30">
            <Percent className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              <strong>0% Service Fee</strong> - No hidden charges on your transaction!
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert className="bg-red-500/20 border-red-500/50">
              <X className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={validateAndConfirm}
              className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Price
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
