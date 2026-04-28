import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  Gavel, Clock, TrendingUp, Users, Trophy, AlertTriangle, 
  Plus, DollarSign, Timer, ChevronUp, ChevronDown, RefreshCw
} from 'lucide-react';

interface Auction {
  id: string;
  product_id: string;
  product_name: string;
  description: string;
  starting_price: number;
  current_price: number;
  min_increment: number;
  quantity: number;
  unit: string;
  currency: string;
  status: string;
  start_time: string;
  end_time: string;
  winner_id: string | null;
  created_at: string;
}

interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  quantity: number;
  status: string;
  rank: number;
  created_at: string;
}

export default function BidAuction() {
  const { user, userProfile, hasRole } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [auctionBids, setAuctionBids] = useState<Bid[]>([]);
  const [userBids, setUserBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidQuantity, setBidQuantity] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [timers, setTimers] = useState<Record<string, string>>({});

  // New auction form state
  const [newAuction, setNewAuction] = useState({
    productId: '',
    productName: '',
    description: '',
    startingPrice: '',
    quantity: '',
    unit: 'barrels',
    currency: 'USD',
    duration: '24'
  });

  const fetchAuctions = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bid-auction', {
        body: { action: 'getAuctions', status: 'active' }
      });
      if (error) throw error;
      setAuctions(data.auctions || []);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserBids = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('bid-auction', {
        body: { action: 'getUserBids', userId: user.id }
      });
      if (error) throw error;
      setUserBids(data.bids || []);
    } catch (error) {
      console.error('Error fetching user bids:', error);
    }
  }, [user]);

  const fetchAuctionBids = useCallback(async (auctionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('bid-auction', {
        body: { action: 'getAuctionBids', auctionId }
      });
      if (error) throw error;
      setAuctionBids(data.bids || []);
    } catch (error) {
      console.error('Error fetching auction bids:', error);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
    fetchUserBids();
  }, [fetchAuctions, fetchUserBids]);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, string> = {};
      auctions.forEach(auction => {
        const endTime = new Date(auction.end_time).getTime();
        const now = Date.now();
        const diff = endTime - now;

        if (diff <= 0) {
          newTimers[auction.id] = 'Ended';
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newTimers[auction.id] = `${hours}h ${minutes}m ${seconds}s`;
        }
      });
      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [auctions]);

  // Check for ended auctions periodically
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      try {
        await supabase.functions.invoke('bid-auction', {
          body: { action: 'checkEndedAuctions' }
        });
        fetchAuctions();
        fetchUserBids();
      } catch (error) {
        console.error('Error checking ended auctions:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [fetchAuctions, fetchUserBids]);

  const handleCreateAuction = async () => {
    if (!user) return;

    try {
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + parseInt(newAuction.duration));

      const { data, error } = await supabase.functions.invoke('bid-auction', {
        body: {
          action: 'createAuction',
          productId: newAuction.productId || `PROD-${Date.now()}`,
          productName: newAuction.productName,
          description: newAuction.description,
          startingPrice: parseFloat(newAuction.startingPrice),
          quantity: parseFloat(newAuction.quantity),
          unit: newAuction.unit,
          currency: newAuction.currency,
          endTime: endTime.toISOString(),
          createdBy: user.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Auction Created',
        description: `${newAuction.productName} auction is now live!`,
      });

      setShowCreateModal(false);
      setNewAuction({
        productId: '',
        productName: '',
        description: '',
        startingPrice: '',
        quantity: '',
        unit: 'barrels',
        currency: 'USD',
        duration: '24'
      });
      fetchAuctions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handlePlaceBid = async () => {
    if (!user || !selectedAuction) return;

    try {
      const { data, error } = await supabase.functions.invoke('bid-auction', {
        body: {
          action: 'placeBid',
          auctionId: selectedAuction.id,
          userId: user.id,
          userEmail: user.email,
          userName: userProfile?.full_name || user.email?.split('@')[0],
          amount: parseFloat(bidAmount),
          quantity: parseFloat(bidQuantity) || selectedAuction.quantity
        }
      });

      if (error) throw error;

      toast({
        title: 'Bid Placed Successfully',
        description: `Your bid of $${parseFloat(bidAmount).toLocaleString()} has been submitted!`,
      });

      setShowBidModal(false);
      setBidAmount('');
      setBidQuantity('');
      fetchAuctions();
      fetchUserBids();
      if (selectedAuction) {
        fetchAuctionBids(selectedAuction.id);
      }
    } catch (error: any) {
      toast({
        title: 'Bid Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const openBidModal = (auction: Auction) => {
    setSelectedAuction(auction);
    setBidAmount((auction.current_price + auction.min_increment).toString());
    setBidQuantity(auction.quantity.toString());
    fetchAuctionBids(auction.id);
    setShowBidModal(true);
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦'
    };
    return symbols[currency] || currency;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'won': return 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50';
      case 'outbid': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'expired': return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gavel className="w-7 h-7 text-[#D4AF37]" />
            Petroleum Bid Auctions
          </h2>
          <p className="text-white/70 mt-1">Compete for premium petroleum allocations</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchAuctions} variant="outline" className="border-white/30 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {hasRole(['admin', 'trader', 'refiner']) && (
            <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 hover:shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Auction
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Gavel className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Active Auctions</p>
                <p className="text-2xl font-bold text-white">{auctions.filter(a => a.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Your Wins</p>
                <p className="text-2xl font-bold text-white">{userBids.filter(b => b.status === 'won').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Active Bids</p>
                <p className="text-2xl font-bold text-white">{userBids.filter(b => b.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Outbid</p>
                <p className="text-2xl font-bold text-white">{userBids.filter(b => b.status === 'outbid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Auctions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {auctions.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 col-span-2">
            <CardContent className="p-8 text-center">
              <Gavel className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">No active auctions at the moment</p>
              {hasRole(['admin', 'trader', 'refiner']) && (
                <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-[#D4AF37] text-slate-900">
                  Create First Auction
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          auctions.map(auction => (
            <Card key={auction.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white text-lg">{auction.product_name}</CardTitle>
                    <CardDescription className="text-white/60">{auction.description || 'Premium petroleum allocation'}</CardDescription>
                  </div>
                  <Badge className={auction.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                    {auction.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-white/60 text-xs">Current Bid</p>
                    <p className="text-[#D4AF37] text-xl font-bold">
                      {getCurrencySymbol(auction.currency)}{auction.current_price.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-white/60 text-xs">Quantity</p>
                    <p className="text-white text-xl font-bold">
                      {auction.quantity.toLocaleString()} <span className="text-sm text-white/60">{auction.unit}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00D4FF]" />
                    <span className="text-white/70 text-sm">Time Remaining</span>
                  </div>
                  <span className={`font-mono font-bold ${timers[auction.id] === 'Ended' ? 'text-red-400' : 'text-[#00D4FF]'}`}>
                    {timers[auction.id] || 'Loading...'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Min Increment: {getCurrencySymbol(auction.currency)}{auction.min_increment}</span>
                  <span className="text-white/60">Started: {getCurrencySymbol(auction.currency)}{auction.starting_price.toLocaleString()}</span>
                </div>

                <Button 
                  onClick={() => openBidModal(auction)} 
                  className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 hover:shadow-lg"
                  disabled={auction.status !== 'active' || timers[auction.id] === 'Ended'}
                >
                  <Gavel className="w-4 h-4 mr-2" />
                  Place Bid
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Your Bids Section */}
      {userBids.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00D4FF]" />
              Your Bid History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userBids.slice(0, 10).map(bid => (
                <div key={bid.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      bid.status === 'won' ? 'bg-[#D4AF37]/20' : 
                      bid.status === 'active' ? 'bg-green-500/20' : 
                      bid.status === 'outbid' ? 'bg-orange-500/20' : 'bg-slate-500/20'
                    }`}>
                      {bid.status === 'won' ? <Trophy className="w-5 h-5 text-[#D4AF37]" /> :
                       bid.status === 'active' ? <ChevronUp className="w-5 h-5 text-green-400" /> :
                       bid.status === 'outbid' ? <ChevronDown className="w-5 h-5 text-orange-400" /> :
                       <Timer className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-white font-medium">Bid #{bid.id.slice(0, 8)}</p>
                      <p className="text-white/60 text-sm">{new Date(bid.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#D4AF37] font-bold">${bid.amount.toLocaleString()}</p>
                    <Badge className={getStatusColor(bid.status)}>{bid.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Auction Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#D4AF37]" />
              Create New Auction
            </DialogTitle>
            <DialogDescription className="text-white/60">
              List a petroleum allocation for competitive bidding
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">Product Name</label>
              <Input
                value={newAuction.productName}
                onChange={(e) => setNewAuction({ ...newAuction, productName: e.target.value })}
                placeholder="e.g., Brent Crude Oil"
                className="bg-slate-800 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Description</label>
              <Input
                value={newAuction.description}
                onChange={(e) => setNewAuction({ ...newAuction, description: e.target.value })}
                placeholder="Premium quality allocation"
                className="bg-slate-800 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Starting Price ($)</label>
                <Input
                  type="number"
                  value={newAuction.startingPrice}
                  onChange={(e) => setNewAuction({ ...newAuction, startingPrice: e.target.value })}
                  placeholder="50000"
                  className="bg-slate-800 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">Quantity</label>
                <Input
                  type="number"
                  value={newAuction.quantity}
                  onChange={(e) => setNewAuction({ ...newAuction, quantity: e.target.value })}
                  placeholder="1000"
                  className="bg-slate-800 border-white/20 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Unit</label>
                <select
                  value={newAuction.unit}
                  onChange={(e) => setNewAuction({ ...newAuction, unit: e.target.value })}
                  className="w-full bg-slate-800 border border-white/20 text-white rounded-md p-2"
                >
                  <option value="barrels">Barrels</option>
                  <option value="MT">Metric Tons</option>
                  <option value="liters">Liters</option>
                  <option value="gallons">Gallons</option>
                </select>
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">Duration (hours)</label>
                <select
                  value={newAuction.duration}
                  onChange={(e) => setNewAuction({ ...newAuction, duration: e.target.value })}
                  className="w-full bg-slate-800 border border-white/20 text-white rounded-md p-2"
                >
                  <option value="1">1 Hour</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="48">48 Hours</option>
                  <option value="72">72 Hours</option>
                </select>
              </div>
            </div>
            <Button 
              onClick={handleCreateAuction} 
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900"
              disabled={!newAuction.productName || !newAuction.startingPrice || !newAuction.quantity}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Auction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Place Bid Modal */}
      <Dialog open={showBidModal} onOpenChange={setShowBidModal}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#D4AF37]" />
              Place Your Bid
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedAuction?.product_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAuction && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70">Current Highest Bid</span>
                  <span className="text-[#D4AF37] text-2xl font-bold">
                    {getCurrencySymbol(selectedAuction.currency)}{selectedAuction.current_price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Minimum Increment</span>
                  <span className="text-white/60">{getCurrencySymbol(selectedAuction.currency)}{selectedAuction.min_increment}</span>
                </div>
              </div>

              {/* Bid Rankings */}
              {auctionBids.length > 0 && (
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-white/70 text-sm mb-2">Top Bidders</p>
                  <div className="space-y-2">
                    {auctionBids.slice(0, 5).map((bid, index) => (
                      <div key={bid.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-[#D4AF37] text-slate-900' : 'bg-slate-700 text-white'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-white/80">{bid.user_name || 'Anonymous'}</span>
                          {bid.user_id === user?.id && <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] text-xs">You</Badge>}
                        </div>
                        <span className="text-white font-medium">${bid.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-white/70 text-sm mb-1 block">Your Bid Amount ($)</label>
                <Input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min: ${selectedAuction.current_price + selectedAuction.min_increment}`}
                  className="bg-slate-800 border-white/20 text-white text-lg"
                />
                <p className="text-white/50 text-xs mt-1">
                  Minimum bid: {getCurrencySymbol(selectedAuction.currency)}{(selectedAuction.current_price + selectedAuction.min_increment).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setBidAmount((selectedAuction.current_price + selectedAuction.min_increment).toString())}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                >
                  Min Bid
                </Button>
                <Button 
                  onClick={() => setBidAmount((selectedAuction.current_price * 1.1).toFixed(0))}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                >
                  +10%
                </Button>
                <Button 
                  onClick={() => setBidAmount((selectedAuction.current_price * 1.25).toFixed(0))}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                >
                  +25%
                </Button>
              </div>

              <Button 
                onClick={handlePlaceBid} 
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 py-6 text-lg"
                disabled={!bidAmount || parseFloat(bidAmount) <= selectedAuction.current_price}
              >
                <Gavel className="w-5 h-5 mr-2" />
                Place Bid - ${parseFloat(bidAmount || '0').toLocaleString()}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
