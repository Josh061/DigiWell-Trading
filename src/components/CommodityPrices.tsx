import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, RefreshCw, BarChart3, 
  Globe, Clock, Fuel, Flame, Droplets, Zap, Gem, CircleDot
} from 'lucide-react';

// Safe number helper - ensures we always have a valid number for .toFixed()
const safeNum = (val: any, fallback: number = 0): number => {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return Number(val);
};

interface PriceData {
  price: number;
  change: number;
  changePercent?: number;
  source: string;
  unit?: string;
  timestamp: string;
  name?: string;
}

interface MarketPrices {
  crude_oil: {
    brent: PriceData;
    wti: PriceData;
    dubai: PriceData;
    opec_basket?: PriceData;
    murban?: PriceData;
    bonny_light?: PriceData;
    louisiana_light?: PriceData;
    mars_us?: PriceData;
    urals?: PriceData;
  };
  natural_gas: {
    henry_hub: PriceData;
    ttf: PriceData;
  };
  refined_products: {
    jet_a1: PriceData;
    pms: PriceData;
    ago: PriceData;
    lpg: PriceData;
    lsfo?: PriceData;
    hsfo?: PriceData;
    heating_oil?: PriceData;
    gasoline?: PriceData;
    naphtha?: PriceData;
  };
  precious_metals?: {
    gold: PriceData;
    silver: PriceData;
    platinum?: PriceData;
    palladium?: PriceData;
    rhodium?: PriceData;
  };
  diamonds?: {
    diamond: PriceData;
    diamond_rough?: PriceData;
  };
  industrial_minerals?: {
    lithium: PriceData;
    lithium_hydroxide?: PriceData;
    copper?: PriceData;
    aluminum?: PriceData;
    nickel?: PriceData;
    zinc?: PriceData;
    cobalt?: PriceData;
    iron_ore?: PriceData;
    rare_earth?: PriceData;
    uranium?: PriceData;
  };
  market_indicators: {
    opec_production: string;
    global_demand: string;
    us_inventory_change: string;
    rig_count: number;
    gold_reserves?: string;
    silver_production?: string;
    lithium_production?: string;
    diamond_production?: string;
    platinum_production?: string;
    sources?: string[];
  };
  metadata?: {
    lastUpdated: string;
    sources: {
      oil?: string;
      rwa?: string;
      primary?: string;
      secondary?: string;
      reference: string;
    };
    disclaimer: string;
  };
}


export default function CommodityPrices() {
  const [prices, setPrices] = useState<MarketPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeTab, setActiveTab] = useState('crude');

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bloomberg-prices', {
        body: { action: 'get-all-prices' }
      });

      if (error) throw error;
      if (data?.success) {
        setPrices(data.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const PriceCard = ({ 
    title, 
    price, 
    change, 
    source, 
    unit = 'barrel',
    icon: Icon 
  }: { 
    title: string; 
    price: number; 
    change: number; 
    source: string; 
    unit?: string;
    icon: any;
  }) => {
    const safePrice = safeNum(price);
    const safeChange = safeNum(change);
    const isPositive = safeChange >= 0;
    
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <Icon className={`w-5 h-5 ${isPositive ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{title}</h3>
                <Badge className="bg-slate-700/50 text-slate-300 text-xs">{source}</Badge>
              </div>
            </div>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">{isPositive ? '+' : ''}{safeChange.toFixed(2)}%</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">${safePrice.toFixed(2)}</span>
            <span className="text-slate-400 text-xs">/{unit}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && !prices) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  // Get OPEC basket from crude_oil if available
  const opecBasket = prices?.crude_oil?.opec_basket;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
            Live Commodity Prices
          </h2>
          <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
            <Globe className="w-4 h-4" />
            OilPrices.com • Investing.com • OPEC
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-slate-400 text-sm flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Updated: {lastUpdated}
          </div>
          <Button
            onClick={fetchPrices}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* OPEC Basket Highlight */}
      {opecBasket && (
        <Card className="bg-gradient-to-r from-[#D4AF37]/20 to-[#00D4FF]/20 border-[#D4AF37]/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[#D4AF37] font-bold text-lg mb-1">OPEC Reference Basket</h3>
                <p className="text-slate-400 text-sm">Official OPEC benchmark price</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-white">${safeNum(opecBasket.price).toFixed(2)}</div>
                {(() => {
                  const changeVal = safeNum(opecBasket.changePercent ?? opecBasket.change);
                  const isUp = changeVal >= 0;
                  return (
                    <div className={`flex items-center justify-end gap-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span>{isUp ? '+' : ''}{changeVal.toFixed(2)}%</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10 border border-white/20 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="crude" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs sm:text-sm">
            <Droplets className="w-4 h-4 mr-1 sm:mr-2" />
            Crude Oil
          </TabsTrigger>
          <TabsTrigger value="gas" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs sm:text-sm">
            <Flame className="w-4 h-4 mr-1 sm:mr-2" />
            Natural Gas
          </TabsTrigger>
          <TabsTrigger value="refined" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs sm:text-sm">
            <Fuel className="w-4 h-4 mr-1 sm:mr-2" />
            Refined
          </TabsTrigger>
          <TabsTrigger value="metals" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs sm:text-sm">
            <CircleDot className="w-4 h-4 mr-1 sm:mr-2" />
            Metals
          </TabsTrigger>
          <TabsTrigger value="diamonds" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs sm:text-sm">
            <Gem className="w-4 h-4 mr-1 sm:mr-2" />
            Diamonds
          </TabsTrigger>
          <TabsTrigger value="minerals" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs sm:text-sm">
            <Zap className="w-4 h-4 mr-1 sm:mr-2" />
            Minerals
          </TabsTrigger>
          <TabsTrigger value="indicators" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />
            Indicators
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crude" className="mt-4">
          <div className="mb-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Source: OilPrices.com</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {prices?.crude_oil && (
              <>
                <PriceCard
                  title="Brent Crude"
                  price={safeNum(prices.crude_oil.brent?.price)}
                  change={safeNum(prices.crude_oil.brent?.changePercent ?? prices.crude_oil.brent?.change)}
                  source={prices.crude_oil.brent?.source || 'OilPrices.com'}
                  icon={Droplets}
                />
                <PriceCard
                  title="WTI Crude"
                  price={safeNum(prices.crude_oil.wti?.price)}
                  change={safeNum(prices.crude_oil.wti?.changePercent ?? prices.crude_oil.wti?.change)}
                  source={prices.crude_oil.wti?.source || 'OilPrices.com'}
                  icon={Droplets}
                />
                <PriceCard
                  title="Dubai Crude"
                  price={safeNum(prices.crude_oil.dubai?.price)}
                  change={safeNum(prices.crude_oil.dubai?.changePercent ?? prices.crude_oil.dubai?.change)}
                  source={prices.crude_oil.dubai?.source || 'OilPrices.com'}
                  icon={Droplets}
                />
                {prices.crude_oil.opec_basket && (
                  <PriceCard
                    title="OPEC Basket"
                    price={safeNum(prices.crude_oil.opec_basket?.price)}
                    change={safeNum(prices.crude_oil.opec_basket?.changePercent ?? prices.crude_oil.opec_basket?.change)}
                    source={prices.crude_oil.opec_basket?.source || 'OPEC Official'}
                    icon={Globe}
                  />
                )}
                {prices.crude_oil.murban && (
                  <PriceCard
                    title="Murban Crude"
                    price={safeNum(prices.crude_oil.murban?.price)}
                    change={safeNum(prices.crude_oil.murban?.changePercent ?? prices.crude_oil.murban?.change)}
                    source={prices.crude_oil.murban?.source || 'OilPrices.com'}
                    icon={Droplets}
                  />
                )}
                {prices.crude_oil.bonny_light && (
                  <PriceCard
                    title="Bonny Light (Nigeria)"
                    price={safeNum(prices.crude_oil.bonny_light?.price)}
                    change={safeNum(prices.crude_oil.bonny_light?.changePercent ?? prices.crude_oil.bonny_light?.change)}
                    source={prices.crude_oil.bonny_light?.source || 'OilPrices.com'}
                    icon={Droplets}
                  />
                )}
                {prices.crude_oil.louisiana_light && (
                  <PriceCard
                    title="Louisiana Light"
                    price={safeNum(prices.crude_oil.louisiana_light?.price)}
                    change={safeNum(prices.crude_oil.louisiana_light?.changePercent ?? prices.crude_oil.louisiana_light?.change)}
                    source={prices.crude_oil.louisiana_light?.source || 'OilPrices.com'}
                    icon={Droplets}
                  />
                )}
                {prices.crude_oil.mars_us && (
                  <PriceCard
                    title="Mars US"
                    price={safeNum(prices.crude_oil.mars_us?.price)}
                    change={safeNum(prices.crude_oil.mars_us?.changePercent ?? prices.crude_oil.mars_us?.change)}
                    source={prices.crude_oil.mars_us?.source || 'OilPrices.com'}
                    icon={Droplets}
                  />
                )}
                {prices.crude_oil.urals && (
                  <PriceCard
                    title="Urals (Russia)"
                    price={safeNum(prices.crude_oil.urals?.price)}
                    change={safeNum(prices.crude_oil.urals?.changePercent ?? prices.crude_oil.urals?.change)}
                    source={prices.crude_oil.urals?.source || 'OilPrices.com'}
                    icon={Droplets}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gas" className="mt-4">
          <div className="mb-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Source: OilPrices.com</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prices?.natural_gas && (
              <>
                <PriceCard
                  title="Henry Hub Natural Gas"
                  price={safeNum(prices.natural_gas.henry_hub?.price)}
                  change={safeNum(prices.natural_gas.henry_hub?.changePercent ?? prices.natural_gas.henry_hub?.change)}
                  source={prices.natural_gas.henry_hub?.source || 'OilPrices.com'}
                  unit="MMBtu"
                  icon={Flame}
                />
                <PriceCard
                  title="TTF Natural Gas"
                  price={safeNum(prices.natural_gas.ttf?.price)}
                  change={safeNum(prices.natural_gas.ttf?.changePercent ?? prices.natural_gas.ttf?.change)}
                  source={prices.natural_gas.ttf?.source || 'OilPrices.com'}
                  unit="MWh"
                  icon={Flame}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="refined" className="mt-4">
          <div className="mb-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Source: OilPrices.com</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {prices?.refined_products && (
              <>
                <PriceCard
                  title="Aviation Fuel (Jet A-1)"
                  price={safeNum(prices.refined_products.jet_a1?.price)}
                  change={safeNum(prices.refined_products.jet_a1?.changePercent ?? prices.refined_products.jet_a1?.change)}
                  source={prices.refined_products.jet_a1?.source || 'OilPrices.com'}
                  unit="gallon"
                  icon={Fuel}
                />
                <PriceCard
                  title="PMS (Petrol)"
                  price={safeNum(prices.refined_products.pms?.price)}
                  change={safeNum(prices.refined_products.pms?.changePercent ?? prices.refined_products.pms?.change)}
                  source={prices.refined_products.pms?.source || 'OilPrices.com'}
                  unit="liter"
                  icon={Fuel}
                />
                <PriceCard
                  title="AGO (Diesel)"
                  price={safeNum(prices.refined_products.ago?.price)}
                  change={safeNum(prices.refined_products.ago?.changePercent ?? prices.refined_products.ago?.change)}
                  source={prices.refined_products.ago?.source || 'OilPrices.com'}
                  unit="liter"
                  icon={Fuel}
                />
                <PriceCard
                  title="LPG"
                  price={safeNum(prices.refined_products.lpg?.price)}
                  change={safeNum(prices.refined_products.lpg?.changePercent ?? prices.refined_products.lpg?.change)}
                  source={prices.refined_products.lpg?.source || 'OilPrices.com'}
                  unit="kg"
                  icon={Flame}
                />
                {prices.refined_products.lsfo && (
                  <PriceCard
                    title="Low Sulfur Fuel Oil"
                    price={safeNum(prices.refined_products.lsfo?.price)}
                    change={safeNum(prices.refined_products.lsfo?.changePercent ?? prices.refined_products.lsfo?.change)}
                    source={prices.refined_products.lsfo?.source || 'OilPrices.com'}
                    unit="metric ton"
                    icon={Fuel}
                  />
                )}
                {prices.refined_products.hsfo && (
                  <PriceCard
                    title="High Sulfur Fuel Oil"
                    price={safeNum(prices.refined_products.hsfo?.price)}
                    change={safeNum(prices.refined_products.hsfo?.changePercent ?? prices.refined_products.hsfo?.change)}
                    source={prices.refined_products.hsfo?.source || 'OilPrices.com'}
                    unit="metric ton"
                    icon={Fuel}
                  />
                )}
                {prices.refined_products.heating_oil && (
                  <PriceCard
                    title="Heating Oil"
                    price={safeNum(prices.refined_products.heating_oil?.price)}
                    change={safeNum(prices.refined_products.heating_oil?.changePercent ?? prices.refined_products.heating_oil?.change)}
                    source={prices.refined_products.heating_oil?.source || 'OilPrices.com'}
                    unit="gallon"
                    icon={Flame}
                  />
                )}
                {prices.refined_products.gasoline && (
                  <PriceCard
                    title="RBOB Gasoline"
                    price={safeNum(prices.refined_products.gasoline?.price)}
                    change={safeNum(prices.refined_products.gasoline?.changePercent ?? prices.refined_products.gasoline?.change)}
                    source={prices.refined_products.gasoline?.source || 'OilPrices.com'}
                    unit="gallon"
                    icon={Fuel}
                  />
                )}
                {prices.refined_products.naphtha && (
                  <PriceCard
                    title="Naphtha"
                    price={safeNum(prices.refined_products.naphtha?.price)}
                    change={safeNum(prices.refined_products.naphtha?.changePercent ?? prices.refined_products.naphtha?.change)}
                    source={prices.refined_products.naphtha?.source || 'OilPrices.com'}
                    unit="metric ton"
                    icon={Fuel}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="metals" className="mt-4">
          <div className="mb-3">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Source: Investing.com</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {prices?.precious_metals && (
              <>
                <PriceCard
                  title="Gold (XAU)"
                  price={safeNum(prices.precious_metals.gold?.price)}
                  change={safeNum(prices.precious_metals.gold?.changePercent ?? prices.precious_metals.gold?.change)}
                  source={prices.precious_metals.gold?.source || 'Investing.com'}
                  unit="troy oz"
                  icon={CircleDot}
                />
                <PriceCard
                  title="Silver (XAG)"
                  price={safeNum(prices.precious_metals.silver?.price)}
                  change={safeNum(prices.precious_metals.silver?.changePercent ?? prices.precious_metals.silver?.change)}
                  source={prices.precious_metals.silver?.source || 'Investing.com'}
                  unit="troy oz"
                  icon={CircleDot}
                />
                {prices.precious_metals.platinum && (
                  <PriceCard
                    title="Platinum (XPT)"
                    price={safeNum(prices.precious_metals.platinum?.price)}
                    change={safeNum(prices.precious_metals.platinum?.changePercent ?? prices.precious_metals.platinum?.change)}
                    source={prices.precious_metals.platinum?.source || 'Investing.com'}
                    unit="troy oz"
                    icon={CircleDot}
                  />
                )}
                {prices.precious_metals.palladium && (
                  <PriceCard
                    title="Palladium (XPD)"
                    price={safeNum(prices.precious_metals.palladium?.price)}
                    change={safeNum(prices.precious_metals.palladium?.changePercent ?? prices.precious_metals.palladium?.change)}
                    source={prices.precious_metals.palladium?.source || 'Investing.com'}
                    unit="troy oz"
                    icon={CircleDot}
                  />
                )}
                {prices.precious_metals.rhodium && (
                  <PriceCard
                    title="Rhodium"
                    price={safeNum(prices.precious_metals.rhodium?.price)}
                    change={safeNum(prices.precious_metals.rhodium?.changePercent ?? prices.precious_metals.rhodium?.change)}
                    source={prices.precious_metals.rhodium?.source || 'Investing.com'}
                    unit="troy oz"
                    icon={CircleDot}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="diamonds" className="mt-4">
          <div className="mb-3">
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Source: Investing.com</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prices?.diamonds && (
              <>
                <PriceCard
                  title="Diamond (1ct D-FL)"
                  price={safeNum(prices.diamonds.diamond?.price)}
                  change={safeNum(prices.diamonds.diamond?.changePercent ?? prices.diamonds.diamond?.change)}
                  source={prices.diamonds.diamond?.source || 'Investing.com'}
                  unit="carat"
                  icon={Gem}
                />
                {prices.diamonds.diamond_rough && (
                  <PriceCard
                    title="Rough Diamond Index"
                    price={safeNum(prices.diamonds.diamond_rough?.price)}
                    change={safeNum(prices.diamonds.diamond_rough?.changePercent ?? prices.diamonds.diamond_rough?.change)}
                    source={prices.diamonds.diamond_rough?.source || 'Investing.com'}
                    unit="carat"
                    icon={Gem}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="minerals" className="mt-4">
          <div className="mb-3">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Source: Investing.com</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {prices?.industrial_minerals && (
              <>
                <PriceCard
                  title="Lithium Carbonate"
                  price={safeNum(prices.industrial_minerals.lithium?.price)}
                  change={safeNum(prices.industrial_minerals.lithium?.changePercent ?? prices.industrial_minerals.lithium?.change)}
                  source={prices.industrial_minerals.lithium?.source || 'Investing.com'}
                  unit="metric ton"
                  icon={Zap}
                />
                {prices.industrial_minerals.lithium_hydroxide && (
                  <PriceCard
                    title="Lithium Hydroxide"
                    price={safeNum(prices.industrial_minerals.lithium_hydroxide?.price)}
                    change={safeNum(prices.industrial_minerals.lithium_hydroxide?.changePercent ?? prices.industrial_minerals.lithium_hydroxide?.change)}
                    source={prices.industrial_minerals.lithium_hydroxide?.source || 'Investing.com'}
                    unit="metric ton"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.copper && (
                  <PriceCard
                    title="Copper"
                    price={safeNum(prices.industrial_minerals.copper?.price)}
                    change={safeNum(prices.industrial_minerals.copper?.changePercent ?? prices.industrial_minerals.copper?.change)}
                    source={prices.industrial_minerals.copper?.source || 'Investing.com'}
                    unit="metric ton"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.aluminum && (
                  <PriceCard
                    title="Aluminum"
                    price={safeNum(prices.industrial_minerals.aluminum?.price)}
                    change={safeNum(prices.industrial_minerals.aluminum?.changePercent ?? prices.industrial_minerals.aluminum?.change)}
                    source={prices.industrial_minerals.aluminum?.source || 'Investing.com'}
                    unit="metric ton"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.nickel && (
                  <PriceCard
                    title="Nickel"
                    price={safeNum(prices.industrial_minerals.nickel?.price)}
                    change={safeNum(prices.industrial_minerals.nickel?.changePercent ?? prices.industrial_minerals.nickel?.change)}
                    source={prices.industrial_minerals.nickel?.source || 'Investing.com'}
                    unit="metric ton"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.zinc && (
                  <PriceCard
                    title="Zinc"
                    price={safeNum(prices.industrial_minerals.zinc?.price)}
                    change={safeNum(prices.industrial_minerals.zinc?.changePercent ?? prices.industrial_minerals.zinc?.change)}
                    source={prices.industrial_minerals.zinc?.source || 'Investing.com'}
                    unit="metric ton"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.cobalt && (
                  <PriceCard
                    title="Cobalt"
                    price={safeNum(prices.industrial_minerals.cobalt?.price)}
                    change={safeNum(prices.industrial_minerals.cobalt?.changePercent ?? prices.industrial_minerals.cobalt?.change)}
                    source={prices.industrial_minerals.cobalt?.source || 'Investing.com'}
                    unit="metric ton"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.iron_ore && (
                  <PriceCard
                    title="Iron Ore"
                    price={safeNum(prices.industrial_minerals.iron_ore?.price)}
                    change={safeNum(prices.industrial_minerals.iron_ore?.changePercent ?? prices.industrial_minerals.iron_ore?.change)}
                    source={prices.industrial_minerals.iron_ore?.source || 'Investing.com'}
                    unit="metric ton"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.rare_earth && (
                  <PriceCard
                    title="Rare Earth Index"
                    price={safeNum(prices.industrial_minerals.rare_earth?.price)}
                    change={safeNum(prices.industrial_minerals.rare_earth?.changePercent ?? prices.industrial_minerals.rare_earth?.change)}
                    source={prices.industrial_minerals.rare_earth?.source || 'Investing.com'}
                    unit="kg"
                    icon={Zap}
                  />
                )}
                {prices.industrial_minerals.uranium && (
                  <PriceCard
                    title="Uranium (U3O8)"
                    price={safeNum(prices.industrial_minerals.uranium?.price)}
                    change={safeNum(prices.industrial_minerals.uranium?.changePercent ?? prices.industrial_minerals.uranium?.change)}
                    source={prices.industrial_minerals.uranium?.source || 'Investing.com'}
                    unit="lb"
                    icon={Zap}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="indicators" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {prices?.market_indicators && (
              <>
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">OPEC Production</div>
                    <div className="text-2xl font-bold text-white">{prices.market_indicators.opec_production}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Global Demand</div>
                    <div className="text-2xl font-bold text-white">{prices.market_indicators.global_demand}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">US Inventory Change</div>
                    <div className="text-2xl font-bold text-red-400">{prices.market_indicators.us_inventory_change}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Active Rig Count</div>
                    <div className="text-2xl font-bold text-white">{prices.market_indicators.rig_count}</div>
                  </CardContent>
                </Card>
                {prices.market_indicators.gold_reserves && (
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-slate-400 text-sm mb-2">Global Gold Reserves</div>
                      <div className="text-2xl font-bold text-[#D4AF37]">{prices.market_indicators.gold_reserves}</div>
                    </CardContent>
                  </Card>
                )}
                {prices.market_indicators.lithium_production && (
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-slate-400 text-sm mb-2">Lithium Production</div>
                      <div className="text-2xl font-bold text-green-400">{prices.market_indicators.lithium_production}</div>
                    </CardContent>
                  </Card>
                )}
                {prices.market_indicators.diamond_production && (
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-slate-400 text-sm mb-2">Diamond Production</div>
                      <div className="text-2xl font-bold text-pink-400">{prices.market_indicators.diamond_production}</div>
                    </CardContent>
                  </Card>
                )}
                {prices.market_indicators.platinum_production && (
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-slate-400 text-sm mb-2">Platinum Production</div>
                      <div className="text-2xl font-bold text-slate-300">{prices.market_indicators.platinum_production}</div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Data Sources */}
      <div className="flex items-center justify-center gap-4 flex-wrap text-slate-500 text-xs">
        <span>Data Sources:</span>
        <Badge variant="outline" className="border-blue-500/50 text-blue-400">OilPrices.com</Badge>
        <Badge variant="outline" className="border-purple-500/50 text-purple-400">Investing.com</Badge>
        <Badge variant="outline" className="border-slate-600">Yahoo Finance</Badge>
        <Badge variant="outline" className="border-slate-600">TradingEconomics</Badge>
        <Badge variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37]">OPEC</Badge>
        <Badge variant="outline" className="border-slate-600">EIA</Badge>
      </div>

      {/* Disclaimer */}
      {prices?.metadata?.disclaimer && (
        <p className="text-center text-slate-500 text-xs italic">
          {prices.metadata.disclaimer}
        </p>
      )}
    </div>
  );
}
