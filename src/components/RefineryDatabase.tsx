import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin, Navigation, Loader2, RefreshCw, Search, Fuel, Gem,
  Clock, Truck, DollarSign, Star, Globe, Zap, Building2,
  ArrowRight, ChevronDown, ChevronUp, Brain, Shield, Package,
  Send, ExternalLink, AlertTriangle, CheckCircle, Award, Map,
  Mail, FileText, TrendingUp, Info, Ship, Anchor, Scale,
  CreditCard, BarChart3, Activity, Target
} from 'lucide-react';

interface Refinery {
  id: string;
  name: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  capacity: string;
  type: string;
  products: string[];
  status: string;
  quality: string;
  quality_score: number;
  email: string;
  contact_dept: string;
  certifications: string[];
  year_built: number;
  owner: string;
  distance_km?: number;
  distance_miles?: number;
  eta_hours?: number;
  eta_days?: number;
  transport_mode?: string;
  transport_cost_per_unit?: number;
  total_transport_cost?: number;
  estimated_unit_price?: number;
  google_maps_url?: string;
}

export default function RefineryDatabase() {
  const { toast } = useToast();
  const [refineries, setRefineries] = useState<Refinery[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [traderLat, setTraderLat] = useState('');
  const [traderLng, setTraderLng] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('barrels');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [nearest, setNearest] = useState<Refinery | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  // Allocation modal
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedRefinery, setSelectedRefinery] = useState<Refinery | null>(null);
  const [allocationNotes, setAllocationNotes] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [submittingAllocation, setSubmittingAllocation] = useState(false);

  // Logistics options in allocation
  const [shippingMethod, setShippingMethod] = useState('');
  const [incoterms, setIncoterms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [loadingPort, setLoadingPort] = useState('');
  const [dischargePort, setDischargePort] = useState('');

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const BULK_THRESHOLD = 250000;
  const BULK_THRESHOLD_VALUE = 250000;

  const detectLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setTraderLat(pos.coords.latitude.toFixed(6));
          setTraderLng(pos.coords.longitude.toFixed(6));
          setLocating(false);
          toast({ title: 'Location Detected', description: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        },
        () => {
          setTraderLat('6.5244');
          setTraderLng('3.3792');
          setLocating(false);
          toast({ title: 'Default Location', description: 'Using Lagos, Nigeria as default' });
        }
      );
    } else {
      setTraderLat('6.5244');
      setTraderLng('3.3792');
      setLocating(false);
    }
  };

  const searchRefineries = async () => {
    if (!traderLat || !traderLng) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('refinery-database', {
        body: {
          action: 'calculate_distance',
          trader_lat: parseFloat(traderLat),
          trader_lng: parseFloat(traderLng),
          product_type: productFilter === 'all' ? undefined : productFilter,
          product_name: productName || undefined,
          quantity: quantity ? parseInt(quantity) : undefined,
          unit
        }
      });
      if (error) throw error;
      if (data?.success) {
        setRefineries(data.refineries || []);
        setNearest(data.nearest || null);
        setAiRecommendation(data.ai_recommendation || '');
      }
    } catch (err: any) {
      console.error('Refinery search error:', err);
      toast({ title: 'Search Error', description: err.message || 'Failed to search refineries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const { data } = await supabase.functions.invoke('refinery-response', {
        body: { action: 'get_analytics' }
      });
      if (data?.success) setAnalytics(data.analytics);
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const isBulkEligible = () => {
    const qty = parseInt(quantity) || 0;
    const estimatedValue = qty * (nearest?.estimated_unit_price || 72);
    return qty >= BULK_THRESHOLD || estimatedValue >= BULK_THRESHOLD_VALUE;
  };

  const openAllocationModal = (refinery: Refinery) => {
    setSelectedRefinery(refinery);
    setShowAllocationModal(true);
    setLoadingPort('');
    setDischargePort('');
    setShippingMethod('');
    setIncoterms('');
    setPaymentTerms('');
    setInsuranceRequired(false);
  };

  const submitBulkAllocation = async () => {
    if (!selectedRefinery || !quantity) return;
    setSubmittingAllocation(true);
    try {
      const applicationId = `DW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const qty = parseInt(quantity);
      const unitPrice = selectedRefinery.estimated_unit_price || 72;
      const subtotal = qty * unitPrice;
      const serviceFee = subtotal * 0.0087;

      // Build logistics info for the order
      const logisticsInfo = [
        `Nearest Refinery: ${selectedRefinery.name} (${selectedRefinery.location})`,
        `Distance: ${selectedRefinery.distance_km}km | ETA: ${selectedRefinery.eta_days} days`,
        `Quality: ${selectedRefinery.quality} (${selectedRefinery.quality_score}/100)`,
        `Transport Mode: ${selectedRefinery.transport_mode}`,
        shippingMethod ? `Shipping Method: ${shippingMethod}` : '',
        incoterms ? `Incoterms: ${incoterms}` : '',
        paymentTerms ? `Payment Terms: ${paymentTerms}` : '',
        loadingPort ? `Loading Port: ${loadingPort}` : '',
        dischargePort ? `Discharge Port: ${dischargePort}` : '',
        insuranceRequired ? 'Insurance: Required' : '',
        allocationNotes ? `Notes: ${allocationNotes}` : '',
      ].filter(Boolean).join('\n');

      // Send bulk order request
      const { data: bulkData, error: bulkErr } = await supabase.functions.invoke('bulk-order-request', {
        body: {
          application_id: applicationId,
          product_name: productName || 'Crude Oil',
          product_code: productName?.toUpperCase().replace(/\s/g, '-') || 'CRUDE',
          product_category: selectedRefinery.type === 'rwa' ? 'RWA' : 'Petroleum',
          quantity: qty,
          unit,
          unit_price: unitPrice,
          subtotal,
          total_amount: subtotal + serviceFee,
          delivery_location: deliveryLocation || 'To be confirmed',
          delivery_date: deliveryDate || null,
          delivery_coordinates: traderLat && traderLng ? { lat: parseFloat(traderLat), lng: parseFloat(traderLng) } : null,
          notes: `Auto-allocation via AI Refinery Database.\n${logisticsInfo}`,
          is_rwa: selectedRefinery.type === 'rwa',
          service_fee: serviceFee,
          refinery_id: selectedRefinery.id,
          refinery_name: selectedRefinery.name,
          refinery_email: selectedRefinery.email,
          shipping_method: shippingMethod || undefined,
          incoterms: incoterms || undefined,
          payment_terms: paymentTerms || undefined,
          insurance_required: insuranceRequired,
          loading_port: loadingPort || undefined,
          discharge_port: dischargePort || undefined,
        }
      });

      // Create response token for refinery portal
      const { data: tokenData } = await supabase.functions.invoke('refinery-response', {
        body: {
          action: 'create_token',
          application_id: applicationId,
          refinery_id: selectedRefinery.id,
        }
      });

      toast({
        title: 'Bulk Order Submitted Successfully',
        description: `Order ${applicationId} sent to ${selectedRefinery.email}. Response portal token: ${tokenData?.token || 'Generated'}`,
      });

      setShowAllocationModal(false);
      setAllocationNotes('');
      setDeliveryLocation('');
      setDeliveryDate('');
    } catch (err: any) {
      console.error('Allocation error:', err);
      toast({ title: 'Allocation Error', description: err.message || 'Failed to submit allocation', variant: 'destructive' });
    } finally {
      setSubmittingAllocation(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 95) return 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30';
    if (score >= 85) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 70) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-7 h-7 text-[#D4AF37]" />
            AI Refinery Database & Allocation System
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Gemini Flash AI-powered | 18+ worldwide refineries | Global logistics & shipping | Auto bulk order allocation
          </p>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
          <Shield className="w-3 h-3 mr-1" />18 Refineries Online
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="search" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]">
            <Search className="w-4 h-4 mr-2" />Find Refineries
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]" onClick={fetchAnalytics}>
            <BarChart3 className="w-4 h-4 mr-2" />Response Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6 mt-4">
          {/* Search Controls */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Your GPS Location</label>
                  <div className="flex gap-2">
                    <Input value={traderLat} onChange={e => setTraderLat(e.target.value)} placeholder="Latitude"
                      className="bg-slate-700 border-slate-600 text-white flex-1" />
                    <Input value={traderLng} onChange={e => setTraderLng(e.target.value)} placeholder="Longitude"
                      className="bg-slate-700 border-slate-600 text-white flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Product Type</label>
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="petroleum">Petroleum Only</SelectItem>
                      <SelectItem value="rwa">RWA Only (Gold, Silver, Lithium...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Specific Product</label>
                  <Select value={productName} onValueChange={setProductName}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Product</SelectItem>
                      <SelectItem value="Crude Oil">Crude Oil</SelectItem>
                      <SelectItem value="PMS">PMS (Petrol)</SelectItem>
                      <SelectItem value="AGO">AGO (Diesel)</SelectItem>
                      <SelectItem value="Aviation Fuel">Aviation Fuel</SelectItem>
                      <SelectItem value="LPG">LPG</SelectItem>
                      <SelectItem value="Natural Gas">Natural Gas</SelectItem>
                      <SelectItem value="LSFO">LSFO</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Platinum">Platinum</SelectItem>
                      <SelectItem value="Lithium">Lithium</SelectItem>
                      <SelectItem value="Nickel">Nickel</SelectItem>
                      <SelectItem value="Copper">Copper</SelectItem>
                      <SelectItem value="Palladium">Palladium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Quantity</label>
                  <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g., 500000"
                    className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Unit</label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barrels">Barrels</SelectItem>
                      <SelectItem value="litres">Litres</SelectItem>
                      <SelectItem value="tonnes">Tonnes</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="oz">Troy Ounces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={detectLocation} disabled={locating} variant="outline"
                    className="border-[#00D4FF]/50 text-[#00D4FF] hover:bg-[#00D4FF]/10">
                    {locating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}GPS
                  </Button>
                  <Button onClick={searchRefineries} disabled={loading || !traderLat || !traderLng}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold flex-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Find Refineries
                  </Button>
                </div>
              </div>

              {/* Bulk Order Threshold */}
              {quantity && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isBulkEligible() ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'
                }`}>
                  {isBulkEligible() ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-green-400 text-sm font-medium">
                        Bulk order eligible ({parseInt(quantity).toLocaleString()} {unit}). Auto-allocation with global logistics available.
                      </span>
                    </>
                  ) : (
                    <>
                      <Info className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-400 text-sm">
                        Bulk orders require 250,000+ {unit} or $250,000+ value for auto-allocation.
                      </span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendation */}
          {aiRecommendation && (
            <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-purple-400 font-bold text-sm mb-1 flex items-center gap-2">
                      Gemini Flash AI Recommendation
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">AI-Powered</Badge>
                    </h4>
                    <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">{aiRecommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nearest Refinery Highlight */}
          {nearest && (
            <Card className="bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="text-[#D4AF37] font-bold">Nearest - {nearest.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    {nearest.google_maps_url && (
                      <a href={nearest.google_maps_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-[#00D4FF]/50 text-[#00D4FF] hover:bg-[#00D4FF]/10">
                          <Map className="w-3 h-3 mr-1" />Maps
                        </Button>
                      </a>
                    )}
                    {isBulkEligible() && (
                      <Button size="sm" onClick={() => openAllocationModal(nearest)}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold">
                        <Send className="w-3 h-3 mr-1" />Apply for Allocation
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Location</div>
                    <div className="text-white text-sm">{nearest.location}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Distance</div>
                    <div className="text-[#D4AF37] font-bold">{nearest.distance_km?.toLocaleString()} km</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">ETA</div>
                    <div className="text-white font-bold">{nearest.eta_days} days ({nearest.transport_mode})</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Quality</div>
                    <Badge className={getQualityColor(nearest.quality_score)}>{nearest.quality_score}/100</Badge>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Transport</div>
                    <div className="text-[#D4AF37] font-bold">${nearest.transport_cost_per_unit?.toFixed(2)}/{unit}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Capacity</div>
                    <div className="text-white text-sm">{nearest.capacity}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Contact</div>
                    <div className="text-[#00D4FF] text-xs truncate">{nearest.email}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refineries List */}
          {searched && (
            <div className="space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#D4AF37]" />
                {refineries.length} Refineries Found (sorted by distance)
              </h3>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
                  <p className="text-slate-400">Calculating Haversine distances with Gemini Flash AI...</p>
                </div>
              ) : refineries.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-12 text-center">
                    <Globe className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-white font-bold">No refineries found</p>
                    <p className="text-slate-400 text-sm">Try adjusting your product filter</p>
                  </CardContent>
                </Card>
              ) : (
                refineries.map((refinery, idx) => {
                  const isExpanded = expandedId === refinery.id;
                  return (
                    <Card key={refinery.id} className={`bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors ${idx === 0 ? 'ring-1 ring-[#D4AF37]/30' : ''}`}>
                      <CardContent className="p-0">
                        <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : refinery.id)}>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-slate-500 text-xs font-mono w-6">#{idx + 1}</span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              refinery.type === 'petroleum' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                            }`}>
                              {refinery.type === 'petroleum' ? <Fuel className="w-5 h-5 text-blue-400" /> : <Gem className="w-5 h-5 text-purple-400" />}
                            </div>
                          </div>
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-3 items-center">
                            <div>
                              <div className="text-white font-bold text-sm">{refinery.name}</div>
                              <div className="text-slate-400 text-xs">{refinery.country}</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px] uppercase">Distance</div>
                              <div className="text-[#D4AF37] font-bold">{refinery.distance_km?.toLocaleString()} km</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px] uppercase">ETA</div>
                              <div className="text-white font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-400" />{refinery.eta_days}d
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px] uppercase">Quality</div>
                              <Badge className={`${getQualityColor(refinery.quality_score)} text-[10px]`}>{refinery.quality_score}/100</Badge>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px] uppercase">Transport</div>
                              <div className="text-white text-sm">${refinery.transport_cost_per_unit?.toFixed(2)}/{unit}</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px] uppercase">Mode</div>
                              <Badge className={refinery.transport_mode === 'sea' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}>
                                {refinery.transport_mode === 'sea' ? <Ship className="w-3 h-3 mr-1" /> : <Truck className="w-3 h-3 mr-1" />}
                                {refinery.transport_mode}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              {isBulkEligible() && (
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAllocationModal(refinery); }}
                                  className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-[10px] h-7 px-2">
                                  <Send className="w-3 h-3 mr-1" />Allocate
                                </Button>
                              )}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-700 p-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="bg-slate-700/50 rounded-lg p-3">
                                <div className="text-slate-400 text-[10px] uppercase">Products Available</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {refinery.products.map(p => (
                                    <Badge key={p} className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">{p}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-slate-700/50 rounded-lg p-3">
                                <div className="text-slate-400 text-[10px] uppercase">Certifications</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {refinery.certifications.map(c => (
                                    <Badge key={c} className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">{c}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-slate-700/50 rounded-lg p-3">
                                <div className="text-slate-400 text-[10px] uppercase">GPS Coordinates</div>
                                <div className="text-white text-sm font-mono mt-1">{refinery.lat.toFixed(4)}, {refinery.lng.toFixed(4)}</div>
                                {refinery.google_maps_url && (
                                  <a href={refinery.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] text-xs flex items-center gap-1 mt-1 hover:underline">
                                    <ExternalLink className="w-3 h-3" />Google Maps
                                  </a>
                                )}
                              </div>
                              <div className="bg-slate-700/50 rounded-lg p-3">
                                <div className="text-slate-400 text-[10px] uppercase">Contact</div>
                                <div className="text-white text-sm mt-1">{refinery.contact_dept}</div>
                                <div className="text-[#00D4FF] text-xs mt-1">{refinery.email}</div>
                              </div>
                              <div className="bg-slate-700/50 rounded-lg p-3">
                                <div className="text-slate-400 text-[10px] uppercase">Details</div>
                                <div className="text-white text-sm mt-1">Owner: {refinery.owner}</div>
                                <div className="text-slate-400 text-xs">Est. {refinery.year_built} | {refinery.capacity}</div>
                              </div>
                            </div>
                            {refinery.total_transport_cost != null && (
                              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                                  <span className="text-white text-sm">Total Transport Cost for {parseInt(quantity).toLocaleString()} {unit}:</span>
                                </div>
                                <span className="text-[#D4AF37] font-bold text-lg">${refinery.total_transport_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Initial State */}
          {!searched && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <Globe className="w-16 h-16 text-[#D4AF37]/30 mx-auto mb-4" />
                <h3 className="text-white font-bold text-xl mb-2">Find Your Nearest Refinery</h3>
                <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
                  Enter your GPS location or use auto-detection to find the nearest petroleum and RWA refineries worldwide.
                  Gemini Flash AI calculates distance, ETA, transport costs, quality ratings, and provides intelligent allocation recommendations.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-3xl mx-auto">
                  {[
                    { icon: Building2, color: 'text-[#D4AF37]', label: '18+', desc: 'Refineries' },
                    { icon: Globe, color: 'text-[#00D4FF]', label: '12', desc: 'Countries' },
                    { icon: Brain, color: 'text-purple-400', label: 'Gemini', desc: 'AI Powered' },
                    { icon: Ship, color: 'text-blue-400', label: 'Global', desc: 'Logistics' },
                    { icon: Send, color: 'text-green-400', label: 'Auto', desc: 'Allocation' },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <item.icon className={`w-6 h-6 ${item.color} mx-auto mb-2`} />
                      <div className="text-white font-bold">{item.label}</div>
                      <div className="text-slate-400 text-xs">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          {loadingAnalytics ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
              <p className="text-slate-400">Loading response analytics...</p>
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total Requests', value: analytics.total_requests, color: 'text-white', bg: 'bg-slate-700/50' },
                  { label: 'Approved', value: analytics.approved, color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: 'Rejected', value: analytics.rejected, color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: 'Pending', value: analytics.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { label: 'Avg Response', value: `${analytics.avg_response_time_hours}h`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                ].map((stat, i) => (
                  <Card key={i} className={`${stat.bg} border-slate-700`}>
                    <CardContent className="p-4 text-center">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-slate-400 text-xs">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#D4AF37]" />Escalation Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Escalations</span>
                      <span className="text-red-400 font-bold">{analytics.total_escalations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Currently Overdue (48h+)</span>
                      <span className="text-yellow-400 font-bold">{analytics.overdue_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Counter Offers</span>
                      <span className="text-blue-400 font-bold">{analytics.counter_offers || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Modifications</span>
                      <span className="text-purple-400 font-bold">{analytics.modifications}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#D4AF37]" />Recent Responses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.recent_responses?.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {analytics.recent_responses.slice(0, 5).map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-slate-700/30 rounded-lg p-2">
                            <div>
                              <span className="text-white font-mono text-xs">{r.application_id || 'N/A'}</span>
                              <span className="text-slate-500 text-xs ml-2">{r.responder_name || 'Unknown'}</span>
                            </div>
                            <Badge className={
                              r.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              r.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }>{r.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">No responses yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-white font-bold">No analytics data available</p>
                <p className="text-slate-400 text-sm">Submit bulk orders to see response analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Allocation Modal with Global Logistics */}
      <Dialog open={showAllocationModal} onOpenChange={setShowAllocationModal}>
        <DialogContent className="bg-slate-900 border-[#D4AF37]/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-[#D4AF37]" />
              Apply for Bulk Allocation
            </DialogTitle>
          </DialogHeader>

          {selectedRefinery && (
            <div className="space-y-4">
              {/* Refinery Summary */}
              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[#D4AF37] font-bold">{selectedRefinery.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-400">Location:</span> <span className="text-white">{selectedRefinery.location}</span></div>
                  <div><span className="text-slate-400">Distance:</span> <span className="text-white">{selectedRefinery.distance_km?.toLocaleString()} km</span></div>
                  <div><span className="text-slate-400">ETA:</span> <span className="text-white">{selectedRefinery.eta_days} days</span></div>
                  <div><span className="text-slate-400">Quality:</span> <span className="text-white">{selectedRefinery.quality_score}/100</span></div>
                </div>
              </div>

              {/* Order Details */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#D4AF37]" />Order Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-400">Product:</span> <span className="text-white">{productName || 'Crude Oil'}</span></div>
                  <div><span className="text-slate-400">Quantity:</span> <span className="text-[#D4AF37] font-bold">{parseInt(quantity).toLocaleString()} {unit}</span></div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Delivery Location</Label>
                  <Input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)}
                    placeholder="e.g., Lagos Port, Nigeria" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Delivery Date</Label>
                  <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>

              {/* Global Logistics Options */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                <h4 className="text-blue-400 font-bold text-sm flex items-center gap-2">
                  <Ship className="w-4 h-4" />Global Logistics & Shipping
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white text-xs">Shipping Method</Label>
                    <Select value={shippingMethod} onValueChange={setShippingMethod}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sea">Sea Freight (Tanker)</SelectItem>
                        <SelectItem value="pipeline">Pipeline</SelectItem>
                        <SelectItem value="rail">Rail Transport</SelectItem>
                        <SelectItem value="road">Road Tanker</SelectItem>
                        <SelectItem value="air">Air Freight</SelectItem>
                        <SelectItem value="multimodal">Multimodal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white text-xs">Incoterms</Label>
                    <Select value={incoterms} onValueChange={setIncoterms}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOB">FOB</SelectItem>
                        <SelectItem value="CIF">CIF</SelectItem>
                        <SelectItem value="CFR">CFR</SelectItem>
                        <SelectItem value="EXW">EXW</SelectItem>
                        <SelectItem value="DDP">DDP</SelectItem>
                        <SelectItem value="DAP">DAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white text-xs">Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LC at Sight">LC at Sight</SelectItem>
                        <SelectItem value="LC 30 Days">LC 30 Days</SelectItem>
                        <SelectItem value="LC 60 Days">LC 60 Days</SelectItem>
                        <SelectItem value="TT Advance">TT Advance</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-2">
                    <Switch checked={insuranceRequired} onCheckedChange={setInsuranceRequired} />
                    <Label className="text-white text-xs">Insurance Required</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white text-xs">Loading Port</Label>
                    <Input value={loadingPort} onChange={e => setLoadingPort(e.target.value)}
                      placeholder="e.g., Lekki Port" className="bg-slate-700 border-slate-600 text-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white text-xs">Discharge Port</Label>
                    <Input value={dischargePort} onChange={e => setDischargePort(e.target.value)}
                      placeholder="e.g., Rotterdam" className="bg-slate-700 border-slate-600 text-white text-sm" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Additional Notes</Label>
                <Textarea value={allocationNotes} onChange={e => setAllocationNotes(e.target.value)}
                  placeholder="Special requirements, specifications..." className="bg-slate-700 border-slate-600 text-white text-sm" rows={2} />
              </div>

              {/* Email Notice */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-400 font-medium">Order sent from: commercial@digiwelltrading.com</p>
                  <p className="text-white text-xs">To: {selectedRefinery.email}</p>
                  <p className="text-slate-400 text-xs mt-1">Includes secure Refinery Response Portal link for approval with global logistics options.</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllocationModal(false)} className="border-slate-600 text-slate-300">Cancel</Button>
            <Button onClick={submitBulkAllocation} disabled={submittingAllocation}
              className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold">
              {submittingAllocation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Bulk Order Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
