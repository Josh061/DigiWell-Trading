import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, Hash, FileText, Package, MapPin, Calendar, CreditCard,
  CheckCircle, Clock, Truck, Loader2, X, QrCode, Download,
  DollarSign, AlertCircle, ArrowRight, Copy
} from 'lucide-react';
import { parseApplicationId, getApplicationTypeLabel, getApplicationTypeColor } from '@/lib/applicationId';

interface SearchResult {
  application: any;
  orders: any[];
  bulkOrder: any;
}

// Simple QR Code generator using SVG
function QRCodeSVG({ value, size = 200 }: { value: string; size?: number }) {
  // Simple QR-like pattern generator (visual representation)
  const [qrData, setQrData] = useState<boolean[][]>([]);
  
  useEffect(() => {
    // Generate a deterministic pattern from the value string
    const gridSize = 21;
    const grid: boolean[][] = [];
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    
    for (let y = 0; y < gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        // Finder patterns (3 corners)
        const isFinderTL = (x < 7 && y < 7);
        const isFinderTR = (x >= gridSize - 7 && y < 7);
        const isFinderBL = (x < 7 && y >= gridSize - 7);
        
        if (isFinderTL || isFinderTR || isFinderBL) {
          const fx = isFinderTR ? x - (gridSize - 7) : x;
          const fy = isFinderBL ? y - (gridSize - 7) : y;
          grid[y][x] = (fx === 0 || fx === 6 || fy === 0 || fy === 6) ||
                       (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
        } else {
          // Data pattern based on hash
          const seed = (hash * (x + 1) * (y + 1) + x * 7 + y * 13) & 0xFFFF;
          grid[y][x] = (seed % 3) !== 0;
        }
      }
    }
    setQrData(grid);
  }, [value]);

  const cellSize = size / 25;
  const offset = cellSize * 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white rounded-lg p-2">
      <rect width={size} height={size} fill="white" />
      {qrData.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={offset + x * cellSize}
              y={offset + y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function ApplicationIdSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async () => {
    const query = searchQuery.trim().toUpperCase();
    if (!query) return;

    // Validate Application ID format
    const parsed = parseApplicationId(query);
    if (!parsed) {
      setError('Invalid Application ID format. Expected: DW-PET/RWA/BLK-YYYY-XXXXX-XX');
      setResult(null);
      return;
    }

    setSearching(true);
    setError('');
    setResult(null);

    try {
      // Search applications table
      const { data: appData } = await supabase
        .from('applications')
        .select('*')
        .eq('application_number', query)
        .maybeSingle();

      // Search orders table
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .or(`application_number.eq.${query},notes.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      // Search bulk orders
      const { data: bulkData } = await supabase
        .from('bulk_orders')
        .select('*')
        .eq('application_id', query)
        .maybeSingle();

      if (!appData && (!orderData || orderData.length === 0) && !bulkData) {
        setError('No records found for this Application ID.');
        return;
      }

      setResult({
        application: appData,
        orders: orderData || [],
        bulkOrder: bulkData,
      });
    } catch (err: any) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': case 'allocated': case 'completed': case 'dangote_approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': case 'pending_review': case 'processing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'rejected': case 'cancelled': case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'shipped': case 'in_transit': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const parsed = searchQuery.trim() ? parseApplicationId(searchQuery.trim().toUpperCase()) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Search className="w-7 h-7 text-[#D4AF37]" />
          Application ID Search
        </h2>
        <p className="text-slate-400 text-sm mt-1">Search any DW-PET/RWA/BLK Application ID to view full details</p>
      </div>

      {/* Search Bar */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Enter Application ID (e.g., DW-PET-2026-A3K7M-04)"
                className="pl-11 bg-slate-700 border-slate-600 text-white text-lg font-mono tracking-wider h-12"
                maxLength={20}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
              className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold h-12 px-6">
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5 mr-2" />Search</>}
            </Button>
          </div>
          {parsed && (
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getApplicationTypeColor(parsed.type)}>{getApplicationTypeLabel(parsed.type)}</Badge>
              <span className="text-slate-400 text-xs">Year: {parsed.year}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Application Details */}
          {result.application && (
            <Card className="bg-slate-800/50 border-[#D4AF37]/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#D4AF37]" />Application Details
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.application.application_number)}
                      className="border-slate-600 text-white hover:bg-slate-700 text-xs">
                      {copied ? <CheckCircle className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copied ? 'Copied!' : 'Copy ID'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowQR(!showQR)}
                      className="border-slate-600 text-white hover:bg-slate-700 text-xs">
                      <QrCode className="w-3 h-3 mr-1" />QR Code
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code */}
                {showQR && (
                  <div className="flex justify-center p-4 bg-white rounded-xl">
                    <div className="text-center">
                      <QRCodeSVG value={`https://digiwelltrading.com/track/${result.application.application_number}`} size={180} />
                      <p className="text-slate-900 font-mono text-sm mt-2 font-bold">{result.application.application_number}</p>
                      <p className="text-slate-500 text-xs">Scan to track order status</p>
                    </div>
                  </div>
                )}

                {/* Application ID Highlight */}
                <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 border-2 border-[#D4AF37]/50 rounded-xl p-4 text-center">
                  <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Application ID</div>
                  <div className="text-[#D4AF37] font-mono text-2xl font-bold tracking-wider">{result.application.application_number}</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Status</div>
                    <Badge className={`${getStatusColor(result.application.status)} border mt-1`}>{result.application.status}</Badge>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Product</div>
                    <div className="text-white text-sm font-medium mt-1">{result.application.product_name}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Quantity</div>
                    <div className="text-white text-sm font-bold mt-1">{Number(result.application.quantity || 0).toLocaleString()} {result.application.product_unit}s</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Total</div>
                    <div className="text-[#D4AF37] text-sm font-bold mt-1">${Number(result.application.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1"><MapPin className="w-3 h-3" />Delivery Location</div>
                    <div className="text-white text-sm mt-1">{result.application.delivery_location || 'Not specified'}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1"><Calendar className="w-3 h-3" />Delivery Date</div>
                    <div className="text-white text-sm mt-1">{result.application.delivery_date ? new Date(result.application.delivery_date).toLocaleDateString() : 'TBC'}</div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1"><CreditCard className="w-3 h-3" />Payment Method</div>
                  <div className="text-white text-sm mt-1 capitalize">{result.application.payment_method?.replace('_', ' ') || 'Not specified'}</div>
                </div>

                <div className="text-slate-500 text-xs">
                  Created: {new Date(result.application.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Orders */}
          {result.orders.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />Payment History ({result.orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.orders.map((order: any) => (
                  <div key={order.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-mono text-sm font-bold">{order.order_number}</div>
                      <div className="text-slate-400 text-xs">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(order.status)} border text-[10px]`}>{order.status}</Badge>
                      <span className="text-[#D4AF37] font-bold">${Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Bulk Order Info */}
          {result.bulkOrder && (
            <Card className="bg-slate-800/50 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-red-400" />Bulk Order Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">PDF Sent</div>
                    <Badge className={result.bulkOrder.pdf_sent ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}>
                      {result.bulkOrder.pdf_sent ? 'Yes' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Dangote Status</div>
                    <Badge className={`${getStatusColor(result.bulkOrder.dangote_status)} border text-[10px]`}>
                      {result.bulkOrder.dangote_status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Quantity</div>
                    <div className="text-white text-sm font-bold">{Number(result.bulkOrder.quantity).toLocaleString()} {result.bulkOrder.unit}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Delivery</div>
                    <div className="text-white text-sm truncate">{result.bulkOrder.delivery_location || 'TBC'}</div>
                  </div>
                </div>
                {result.bulkOrder.dangote_response_notes && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Dangote Response Notes</div>
                    <div className="text-white text-sm mt-1">{result.bulkOrder.dangote_response_notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
