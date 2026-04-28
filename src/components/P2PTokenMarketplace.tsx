import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowUpDown, Search, Plus, ShieldCheck, TrendingUp, TrendingDown, 
  Clock, Star, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  ArrowRight, Wallet, Lock, Unlock, History, BarChart3, Users,
  Filter, ChevronDown, ChevronUp, ExternalLink, Copy, Info
} from 'lucide-react';

interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  tokenSymbol: string;
  tokenName: string;
  quantity: number;
  remainingQuantity: number;
  pricePerToken: number;
  currency: string;
  minPurchase: number;
  maxPurchase: number;
  status: string;
  listingType: 'sell' | 'buy';
  rating: number;
  completedTrades: number;
  createdAt: string;
}

interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  tokenSymbol: string;
  quantity: number;
  pricePerToken: number;
  totalAmount: number;
  platformFee: number;
  totalWithFee: number;
  escrowId: string;
  status: string;
  createdAt: string;
}

interface Trade {
  id: string;
  tokenSymbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  pricePerToken: number;
  totalAmount: number;
  platformFee: number;
  counterparty: string;
  executedAt: string;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
  orders: number;
}

interface MarketStats {
  totalVolume24h: number;
  totalTrades24h: number;
  activeListings: number;
  activeBuyOrders: number;
  activeSellOrders: number;
  platformFeeCollected24h: number;
  topTokens: { symbol: string; volume: number; change: number }[];
}

const PLATFORM_FEE_PERCENT = 1.0;

const TOKEN_OPTIONS = [
  { symbol: 'DGC-WTC', name: 'West Texas Crude Oil Reserve' },
  { symbol: 'DGC-BRT', name: 'Brent Crude Oil Futures' },
  { symbol: 'DGC-NGP', name: 'Natural Gas Pipeline' },
  { symbol: 'DGC-REF', name: 'Refinery Expansion Project' }
];

export default function P2PTokenMarketplace() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [listings, setListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [orderBook, setOrderBook] = useState<{ buyOrders: OrderBookEntry[]; sellOrders: OrderBookEntry[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterToken, setFilterToken] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'quantity' | 'rating'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    tokenSymbol: '',
    quantity: '',
    pricePerToken: '',
    minPurchase: '1',
    maxPurchase: '',
    listingType: 'sell' as 'sell' | 'buy',
    expiresInDays: '30'
  });

  const [buyForm, setBuyForm] = useState({
    quantity: '',
    paymentMethod: 'digicoin'
  });

  useEffect(() => {
    loadListings();
    loadMarketStats();
    loadOrderBook();
    loadTradeHistory();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('p2p-trading', {
        body: { 
          action: 'get_listings',
          tokenSymbol: filterToken !== 'all' ? filterToken : undefined,
          listingType: filterType !== 'all' ? filterType : undefined
        }
      });
      if (data?.success) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketStats = async () => {
    try {
      const { data } = await supabase.functions.invoke('p2p-trading', {
        body: { action: 'get_market_stats' }
      });
      if (data?.success) {
        setMarketStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load market stats:', error);
    }
  };

  const loadOrderBook = async () => {
    try {
      const { data } = await supabase.functions.invoke('p2p-trading', {
        body: { action: 'get_order_book', tokenSymbol: 'DGC-WTC' }
      });
      if (data?.success) {
        setOrderBook(data.orderBook);
      }
    } catch (error) {
      console.error('Failed to load order book:', error);
    }
  };

  const loadTradeHistory = async () => {
    try {
      const { data } = await supabase.functions.invoke('p2p-trading', {
        body: { action: 'get_trade_history', userId: user?.id, limit: 10 }
      });
      if (data?.success) {
        setTradeHistory(data.trades);
      }
    } catch (error) {
      console.error('Failed to load trade history:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadListings(), loadMarketStats(), loadOrderBook()]);
    setRefreshing(false);
  };

  const handleCreateListing = async () => {
    if (!createForm.tokenSymbol || !createForm.quantity || !createForm.pricePerToken) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const tokenInfo = TOKEN_OPTIONS.find(t => t.symbol === createForm.tokenSymbol);
      const { data } = await supabase.functions.invoke('p2p-trading', {
        body: {
          action: 'create_listing',
          sellerId: user?.id,
          sellerName: userProfile?.full_name || 'Anonymous',
          tokenSymbol: createForm.tokenSymbol,
          tokenName: tokenInfo?.name || createForm.tokenSymbol,
          quantity: parseFloat(createForm.quantity),
          pricePerToken: parseFloat(createForm.pricePerToken),
          currency: 'USD',
          minPurchase: parseFloat(createForm.minPurchase) || 1,
          maxPurchase: parseFloat(createForm.maxPurchase) || parseFloat(createForm.quantity),
          listingType: createForm.listingType,
          expiresInDays: parseInt(createForm.expiresInDays)
        }
      });

      if (data?.success) {
        alert(data.message);
        setShowCreateListing(false);
        setCreateForm({
          tokenSymbol: '',
          quantity: '',
          pricePerToken: '',
          minPurchase: '1',
          maxPurchase: '',
          listingType: 'sell',
          expiresInDays: '30'
        });
        loadListings();
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
      alert('Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedListing || !buyForm.quantity) {
      alert('Please enter a quantity');
      return;
    }

    const quantity = parseFloat(buyForm.quantity);
    if (quantity < selectedListing.minPurchase || quantity > selectedListing.maxPurchase) {
      alert(`Quantity must be between ${selectedListing.minPurchase} and ${selectedListing.maxPurchase}`);
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('p2p-trading', {
        body: {
          action: 'place_order',
          listingId: selectedListing.id,
          buyerId: user?.id,
          buyerName: userProfile?.full_name || 'Anonymous',
          sellerId: selectedListing.sellerId,
          sellerName: selectedListing.sellerName,
          tokenSymbol: selectedListing.tokenSymbol,
          quantity,
          pricePerToken: selectedListing.pricePerToken
        }
      });

      if (data?.success) {
        setSelectedOrder(data.order);
        setShowBuyModal(false);
        setShowOrderDetails(true);
        setBuyForm({ quantity: '', paymentMethod: 'digicoin' });
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleFundEscrow = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('p2p-trading', {
        body: {
          action: 'fund_escrow',
          orderId: selectedOrder.id,
          escrowId: selectedOrder.escrowId,
          paymentMethod: buyForm.paymentMethod
        }
      });

      if (data?.success) {
        // Execute the trade
        const tradeResult = await supabase.functions.invoke('p2p-trading', {
          body: {
            action: 'execute_trade',
            orderId: selectedOrder.id,
            escrowId: selectedOrder.escrowId,
            buyerId: selectedOrder.buyerId,
            sellerId: selectedOrder.sellerId,
            tokenSymbol: selectedOrder.tokenSymbol,
            quantity: selectedOrder.quantity,
            pricePerToken: selectedOrder.pricePerToken,
            totalAmount: selectedOrder.totalAmount,
            platformFee: selectedOrder.platformFee
          }
        });

        if (tradeResult.data?.success) {
          alert(tradeResult.data.message);
          setShowOrderDetails(false);
          setSelectedOrder(null);
          loadListings();
          loadTradeHistory();
          loadMarketStats();
        }
      }
    } catch (error) {
      console.error('Failed to fund escrow:', error);
      alert('Failed to complete transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings
    .filter(listing => {
      if (filterToken !== 'all' && listing.tokenSymbol !== filterToken) return false;
      if (filterType !== 'all' && listing.listingType !== filterType) return false;
      if (searchQuery && !listing.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !listing.sellerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'price') return (a.pricePerToken - b.pricePerToken) * multiplier;
      if (sortBy === 'quantity') return (a.remainingQuantity - b.remainingQuantity) * multiplier;
      if (sortBy === 'rating') return (a.rating - b.rating) * multiplier;
      return 0;
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ArrowUpDown className="w-8 h-8 text-[#D4AF37]" />
            P2P Token Marketplace
          </h2>
          <p className="text-slate-400 mt-1">Trade tokens directly with other users with escrow protection</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateListing(true)}
            className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Listing
          </Button>
        </div>
      </div>

      {/* Market Stats */}
      {marketStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">24h Volume</div>
              <div className="text-xl font-bold text-white">{formatCurrency(marketStats.totalVolume24h)}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">24h Trades</div>
              <div className="text-xl font-bold text-[#00D4FF]">{formatNumber(marketStats.totalTrades24h)}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Active Listings</div>
              <div className="text-xl font-bold text-green-400">{formatNumber(marketStats.activeListings)}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Buy Orders</div>
              <div className="text-xl font-bold text-emerald-400">{formatNumber(marketStats.activeBuyOrders)}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Sell Orders</div>
              <div className="text-xl font-bold text-red-400">{formatNumber(marketStats.activeSellOrders)}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="text-slate-400 text-xs mb-1">Platform Fee</div>
              <div className="text-xl font-bold text-[#D4AF37]">{PLATFORM_FEE_PERCENT}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Tokens */}
      {marketStats?.topTokens && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {marketStats.topTokens.map((token) => (
            <Card key={token.symbol} className="bg-slate-800/50 border-slate-700 hover:border-[#D4AF37]/50 transition-all cursor-pointer" onClick={() => setFilterToken(token.symbol)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[#D4AF37] font-mono font-bold">{token.symbol}</div>
                    <div className="text-white text-lg font-semibold mt-1">{formatCurrency(token.volume)}</div>
                  </div>
                  <Badge className={token.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                    {token.change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {token.change >= 0 ? '+' : ''}{token.change}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700 p-1">
          <TabsTrigger value="browse" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Search className="w-4 h-4 mr-2" />Browse Listings
          </TabsTrigger>
          <TabsTrigger value="orderbook" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <BarChart3 className="w-4 h-4 mr-2" />Order Book
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <History className="w-4 h-4 mr-2" />Trade History
          </TabsTrigger>
        </TabsList>

        {/* Browse Listings Tab */}
        <TabsContent value="browse" className="mt-6">
          {/* Filters */}
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search by token name or seller..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <Select value={filterToken} onValueChange={setFilterToken}>
                  <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="All Tokens" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Tokens</SelectItem>
                    {TOKEN_OPTIONS.map(token => (
                      <SelectItem key={token.symbol} value={token.symbol}>{token.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px] bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sell">Sell Orders</SelectItem>
                    <SelectItem value="buy">Buy Orders</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
                  const [by, order] = v.split('-');
                  setSortBy(by as any);
                  setSortOrder(order as any);
                }}>
                  <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="quantity-desc">Quantity: High to Low</SelectItem>
                    <SelectItem value="rating-desc">Rating: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Listings Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredListings.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No listings found</h3>
                <p className="text-slate-400">Try adjusting your filters or create a new listing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="bg-slate-800 border-slate-700 hover:border-[#D4AF37]/50 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={listing.listingType === 'sell' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                          {listing.listingType === 'sell' ? 'SELLING' : 'BUYING'}
                        </Badge>
                        <CardTitle className="text-white mt-2">{listing.tokenName}</CardTitle>
                        <p className="text-[#D4AF37] font-mono text-sm">{listing.tokenSymbol}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-semibold">{listing.rating}</span>
                        </div>
                        <div className="text-slate-400 text-xs">{listing.completedTrades} trades</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{listing.sellerName}</span>
                      <Badge className="bg-green-500/20 text-green-400 text-xs ml-auto">
                        <ShieldCheck className="w-3 h-3 mr-1" />Verified
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Price/Token</p>
                        <p className="font-bold text-[#D4AF37] text-lg">{formatCurrency(listing.pricePerToken)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Available</p>
                        <p className="font-semibold text-white">{formatNumber(listing.remainingQuantity)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Min Purchase</p>
                        <p className="font-semibold text-white">{formatNumber(listing.minPurchase)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Max Purchase</p>
                        <p className="font-semibold text-white">{formatNumber(listing.maxPurchase)}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Filled</span>
                        <span>{((listing.quantity - listing.remainingQuantity) / listing.quantity * 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={(listing.quantity - listing.remainingQuantity) / listing.quantity * 100} 
                        className="h-2 bg-slate-700"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(listing.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-green-400" />
                        Escrow Protected
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedListing(listing);
                        setShowBuyModal(true);
                      }}
                      className={`w-full ${
                        listing.listingType === 'sell' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      } text-white font-bold`}
                    >
                      {listing.listingType === 'sell' ? 'Buy Tokens' : 'Sell Tokens'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Order Book Tab */}
        <TabsContent value="orderbook" className="mt-6">
          {orderBook && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Buy Orders */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Buy Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 text-xs text-slate-400 pb-2 border-b border-slate-700">
                      <span>Price</span>
                      <span className="text-right">Quantity</span>
                      <span className="text-right">Total</span>
                      <span className="text-right">Orders</span>
                    </div>
                    {orderBook.buyOrders.map((order, idx) => (
                      <div key={idx} className="grid grid-cols-4 text-sm py-1 hover:bg-slate-700/50 rounded">
                        <span className="text-green-400 font-mono">${order.price.toFixed(2)}</span>
                        <span className="text-right text-white">{formatNumber(order.quantity)}</span>
                        <span className="text-right text-slate-300">{formatCurrency(order.total)}</span>
                        <span className="text-right text-slate-400">{order.orders}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sell Orders */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Sell Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 text-xs text-slate-400 pb-2 border-b border-slate-700">
                      <span>Price</span>
                      <span className="text-right">Quantity</span>
                      <span className="text-right">Total</span>
                      <span className="text-right">Orders</span>
                    </div>
                    {orderBook.sellOrders.map((order, idx) => (
                      <div key={idx} className="grid grid-cols-4 text-sm py-1 hover:bg-slate-700/50 rounded">
                        <span className="text-red-400 font-mono">${order.price.toFixed(2)}</span>
                        <span className="text-right text-white">{formatNumber(order.quantity)}</span>
                        <span className="text-right text-slate-300">{formatCurrency(order.total)}</span>
                        <span className="text-right text-slate-400">{order.orders}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Market Summary */}
          <Card className="bg-slate-800 border-slate-700 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Market Summary - DGC-WTC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-slate-400 text-xs">Last Price</p>
                  <p className="text-xl font-bold text-white">$101.25</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Spread</p>
                  <p className="text-xl font-bold text-[#D4AF37]">$2.50 (2.44%)</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">24h Volume</p>
                  <p className="text-xl font-bold text-[#00D4FF]">$1.25M</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">24h High</p>
                  <p className="text-xl font-bold text-green-400">$105.50</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">24h Low</p>
                  <p className="text-xl font-bold text-red-400">$98.00</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Platform Fee</p>
                  <p className="text-xl font-bold text-slate-300">{PLATFORM_FEE_PERCENT}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#D4AF37]" />
                Your Trade History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tradeHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No trades yet. Start trading to see your history here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tradeHistory.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          trade.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {trade.type === 'buy' ? (
                            <TrendingUp className="w-5 h-5 text-green-400" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{trade.type === 'buy' ? 'Bought' : 'Sold'}</span>
                            <span className="text-[#D4AF37] font-mono">{trade.tokenSymbol}</span>
                          </div>
                          <div className="text-sm text-slate-400">
                            {formatNumber(trade.quantity)} tokens @ {formatCurrency(trade.pricePerToken)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{formatCurrency(trade.totalAmount)}</div>
                        <div className="text-xs text-slate-400">
                          Fee: {formatCurrency(trade.platformFee)} • {getTimeAgo(trade.executedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Listing Modal */}
      <Dialog open={showCreateListing} onOpenChange={setShowCreateListing}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D4AF37]" />
              Create New Listing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Listing Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  type="button"
                  variant={createForm.listingType === 'sell' ? 'default' : 'outline'}
                  onClick={() => setCreateForm({ ...createForm, listingType: 'sell' })}
                  className={createForm.listingType === 'sell' ? 'bg-red-600 hover:bg-red-700' : 'border-slate-600'}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Sell Tokens
                </Button>
                <Button
                  type="button"
                  variant={createForm.listingType === 'buy' ? 'default' : 'outline'}
                  onClick={() => setCreateForm({ ...createForm, listingType: 'buy' })}
                  className={createForm.listingType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600'}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Buy Tokens
                </Button>
              </div>
            </div>

            <div>
              <Label>Token</Label>
              <Select value={createForm.tokenSymbol} onValueChange={(v) => setCreateForm({ ...createForm, tokenSymbol: v })}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TOKEN_OPTIONS.map(token => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol} - {token.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                  placeholder="1000"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label>Price per Token (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={createForm.pricePerToken}
                  onChange={(e) => setCreateForm({ ...createForm, pricePerToken: e.target.value })}
                  placeholder="100.00"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Purchase</Label>
                <Input
                  type="number"
                  value={createForm.minPurchase}
                  onChange={(e) => setCreateForm({ ...createForm, minPurchase: e.target.value })}
                  placeholder="1"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label>Max Purchase</Label>
                <Input
                  type="number"
                  value={createForm.maxPurchase}
                  onChange={(e) => setCreateForm({ ...createForm, maxPurchase: e.target.value })}
                  placeholder="Optional"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div>
              <Label>Expires In (Days)</Label>
              <Select value={createForm.expiresInDays} onValueChange={(v) => setCreateForm({ ...createForm, expiresInDays: v })}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createForm.quantity && createForm.pricePerToken && (
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Value</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(parseFloat(createForm.quantity) * parseFloat(createForm.pricePerToken))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
                  <span className="text-[#D4AF37]">
                    {formatCurrency(parseFloat(createForm.quantity) * parseFloat(createForm.pricePerToken) * PLATFORM_FEE_PERCENT / 100)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-700/30 p-3 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <span>All trades are protected by automatic escrow</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateListing(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleCreateListing}
              disabled={loading || !createForm.tokenSymbol || !createForm.quantity || !createForm.pricePerToken}
              className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy/Sell Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedListing?.listingType === 'sell' ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
              {selectedListing?.listingType === 'sell' ? 'Buy' : 'Sell'} {selectedListing?.tokenSymbol}
            </DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Seller</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{selectedListing.sellerName}</span>
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      <Star className="w-3 h-3 mr-1 fill-current" />{selectedListing.rating}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Price per Token</span>
                  <span className="text-[#D4AF37] font-bold text-lg">{formatCurrency(selectedListing.pricePerToken)}</span>
                </div>
              </div>

              <div>
                <Label>Quantity (Min: {selectedListing.minPurchase}, Max: {selectedListing.maxPurchase})</Label>
                <Input
                  type="number"
                  value={buyForm.quantity}
                  onChange={(e) => setBuyForm({ ...buyForm, quantity: e.target.value })}
                  placeholder={`${selectedListing.minPurchase}`}
                  min={selectedListing.minPurchase}
                  max={selectedListing.maxPurchase}
                  className="bg-slate-700 border-slate-600 mt-2"
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={buyForm.paymentMethod} onValueChange={(v) => setBuyForm({ ...buyForm, paymentMethod: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="digicoin">DigiCoin (Ð)</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="flutterwave">Flutterwave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {buyForm.quantity && (
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-white">
                      {formatCurrency(parseFloat(buyForm.quantity) * selectedListing.pricePerToken)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
                    <span className="text-[#D4AF37]">
                      {formatCurrency(parseFloat(buyForm.quantity) * selectedListing.pricePerToken * PLATFORM_FEE_PERCENT / 100)}
                    </span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 flex justify-between">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-white font-bold text-lg">
                      {formatCurrency(parseFloat(buyForm.quantity) * selectedListing.pricePerToken * (1 + PLATFORM_FEE_PERCENT / 100))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-slate-400 bg-green-500/10 border border-green-500/30 p-3 rounded-lg">
                <Lock className="w-5 h-5 text-green-400" />
                <span>Funds will be held in escrow until trade completion</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyModal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={loading || !buyForm.quantity}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details / Escrow Funding Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              Complete Your Order
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">Order Created Successfully</span>
                </div>
                <p className="text-sm text-slate-300">
                  Your order has been created. Fund the escrow to complete the trade.
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Order ID</span>
                  <span className="text-white font-mono">{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Escrow ID</span>
                  <span className="text-[#00D4FF] font-mono">{selectedOrder.escrowId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Token</span>
                  <span className="text-[#D4AF37] font-mono">{selectedOrder.tokenSymbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Quantity</span>
                  <span className="text-white">{formatNumber(selectedOrder.quantity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Price per Token</span>
                  <span className="text-white">{formatCurrency(selectedOrder.pricePerToken)}</span>
                </div>
                <div className="border-t border-slate-600 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-white">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Platform Fee</span>
                    <span className="text-[#D4AF37]">{formatCurrency(selectedOrder.platformFee)}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-600">
                    <span className="text-white font-semibold">Total to Pay</span>
                    <span className="text-white font-bold text-xl">{formatCurrency(selectedOrder.totalWithFee)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-[#00D4FF]" />
                <span>Once funded, tokens will be transferred automatically and funds released to seller.</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowOrderDetails(false);
                setSelectedOrder(null);
              }} 
              className="border-slate-600"
            >
              Cancel Order
            </Button>
            <Button
              onClick={handleFundEscrow}
              disabled={loading}
              className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Fund Escrow & Complete Trade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
