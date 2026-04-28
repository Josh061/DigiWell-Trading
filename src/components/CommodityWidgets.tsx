import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BarChart3, Droplets, Flame, Coins, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WidgetConfig {
  id: string;
  name: string;
  url: string;
  icon: React.ReactNode;
  category: 'oil' | 'gas' | 'gold' | 'commodities';
}

const widgets: WidgetConfig[] = [
  {
    id: 'wti-oil',
    name: 'WTI Crude Oil',
    url: 'https://www.oil-price.net/TABLE2/gen.php?lang=en',
    icon: <Droplets className="w-5 h-5" />,
    category: 'oil',
  },
  {
    id: 'brent-oil',
    name: 'Brent Crude Oil',
    url: 'https://www.oil-price.net/widgets/brent_crude_price_large/gen.php?lang=en',
    icon: <Droplets className="w-5 h-5" />,
    category: 'oil',
  },
  {
    id: 'oil-chart',
    name: 'Oil Price Chart',
    url: 'https://www.oil-price.net/TINY_CHART/gen.php?lang=en',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'oil',
  },
  {
    id: 'oil-table',
    name: 'Oil Prices Table',
    url: 'https://www.oil-price.net/TABLE3/gen.php?lang=en',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'oil',
  },
  {
    id: 'natural-gas-large',
    name: 'Natural Gas',
    url: 'https://www.oil-price.net/widgets/natural_gas_large/gen.php?lang=en',
    icon: <Flame className="w-5 h-5" />,
    category: 'gas',
  },
  {
    id: 'natural-gas-small',
    name: 'Natural Gas (Compact)',
    url: 'https://www.oil-price.net/widgets/natural_gas_small/gen.php?lang=en',
    icon: <Flame className="w-5 h-5" />,
    category: 'gas',
  },
  {
    id: 'gasoline',
    name: 'Gasoline Prices',
    url: 'https://www.gas-cost.net/widget.php?lang=en',
    icon: <Droplets className="w-5 h-5" />,
    category: 'gas',
  },
  {
    id: 'commodities',
    name: 'Commodities Overview',
    url: 'https://www.oil-price.net/COMMODITIES/gen.php?lang=en',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'commodities',
  },
  {
    id: 'gold-bars',
    name: 'Gold Bars & Coins',
    url: 'https://www.gold-quote.net/BARS_COINS/gen.php?lang=en',
    icon: <Coins className="w-5 h-5" />,
    category: 'gold',
  },
  {
    id: 'gold-3bars',
    name: 'Gold 3 Small Bars',
    url: 'https://www.gold-quote.net/3SMALLBARS/gen.php?lang=en',
    icon: <Coins className="w-5 h-5" />,
    category: 'gold',
  },
  {
    id: 'gold-eagles',
    name: 'American Eagles',
    url: 'https://www.gold-quote.net/STACK_AMERICAN_EAGLES/gen.php?lang=en',
    icon: <Coins className="w-5 h-5" />,
    category: 'gold',
  },
  {
    id: 'gold-creditsuisse',
    name: 'Credit Suisse Bars',
    url: 'https://www.gold-quote.net/3CREDITSUISSE_BARS/gen.php?lang=en',
    icon: <Coins className="w-5 h-5" />,
    category: 'gold',
  },
  {
    id: 'gold-2bars',
    name: 'Gold 2 Bars',
    url: 'https://www.gold-quote.net/2BARS/gen.php?lang=en',
    icon: <Coins className="w-5 h-5" />,
    category: 'gold',
  },
];

function WidgetLoader({ widget, onLoad }: { widget: WidgetConfig; onLoad: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(false);

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create script element
    const script = document.createElement('script');
    script.src = widget.url;
    script.async = true;
    
    script.onload = () => {
      setLoading(false);
      onLoad();
    };
    
    script.onerror = () => {
      setLoading(false);
      setError(true);
    };

    // Add a timeout to hide loading after a reasonable time
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    containerRef.current.appendChild(script);

    return () => {
      clearTimeout(timeout);
    };
  }, [widget.url]);

  const handleRetry = () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = widget.url;
      script.async = true;
      setLoading(true);
      setError(false);
      
      script.onload = () => setLoading(false);
      script.onerror = () => {
        setLoading(false);
        setError(true);
      };
      
      containerRef.current.appendChild(script);
    }
  };

  return (
    <div className="relative min-h-[200px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 rounded-lg z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
            <span className="text-sm text-slate-400">Loading {widget.name}...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 rounded-lg z-10">
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm text-red-400">Failed to load widget</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="widget-container bg-white rounded-lg p-2 min-h-[180px] overflow-auto"
        style={{ colorScheme: 'light' }}
      />
    </div>
  );
}

export default function CommodityWidgets() {
  const [activeTab, setActiveTab] = useState('oil');
  const [loadedWidgets, setLoadedWidgets] = useState<Set<string>>(new Set());

  const handleWidgetLoad = (widgetId: string) => {
    setLoadedWidgets(prev => new Set([...prev, widgetId]));
  };

  const filteredWidgets = widgets.filter(w => w.category === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#00D4FF] rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Live Commodity Prices
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time prices from oil-price.net and gold-quote.net
          </p>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 self-start">
          Live Data
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/50 border border-white/10 p-1 w-full md:w-auto grid grid-cols-4 md:flex">
          <TabsTrigger 
            value="oil" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <Droplets className="w-4 h-4 mr-2" />
            Oil
          </TabsTrigger>
          <TabsTrigger 
            value="gas" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <Flame className="w-4 h-4 mr-2" />
            Gas
          </TabsTrigger>
          <TabsTrigger 
            value="gold" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <Coins className="w-4 h-4 mr-2" />
            Gold
          </TabsTrigger>
          <TabsTrigger 
            value="commodities" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWidgets.map((widget) => (
              <Card key={widget.id} className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center text-[#D4AF37]">
                      {widget.icon}
                    </div>
                    {widget.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WidgetLoader 
                    widget={widget} 
                    onLoad={() => handleWidgetLoad(widget.id)} 
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Attribution */}
      <div className="text-center text-slate-500 text-sm">
        Price data provided by{' '}
        <a 
          href="https://www.oil-price.net" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#00D4FF] hover:underline"
        >
          oil-price.net
        </a>
        {' '}and{' '}
        <a 
          href="https://www.gold-quote.net" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#D4AF37] hover:underline"
        >
          gold-quote.net
        </a>
      </div>
    </div>
  );
}
