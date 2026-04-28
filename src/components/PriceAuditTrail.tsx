import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, TrendingUp, TrendingDown, RefreshCw, Clock, Filter, Download } from 'lucide-react';

interface AuditEntry {
  id: string;
  product_code: string;
  product_name: string;
  old_price: number;
  new_price: number;
  change_amount: number;
  change_percent: number;
  source: string;
  reason: string;
  triggered_by: string;
  created_at: string;
}

export default function PriceAuditTrail() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      // Try edge function first
      const { data, error } = await supabase.functions.invoke('price-stream', {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      });

      // Also try direct DB query
      let query = supabase
        .from('price_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterProduct !== 'all') {
        query = query.eq('product_code', filterProduct);
      }
      if (filterSource !== 'all') {
        query = query.eq('source', filterSource);
      }

      const { data: dbData, error: dbError } = await query;
      
      if (dbData && dbData.length > 0) {
        setAuditLog(dbData);
      } else if (data?.auditLog) {
        setAuditLog(data.auditLog);
      }
    } catch (e) {
      console.error('Error fetching audit log:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
    const interval = setInterval(fetchAuditLog, 30000);
    return () => clearInterval(interval);
  }, [filterProduct, filterSource]);

  const exportCSV = () => {
    const headers = ['Date', 'Product', 'Code', 'Old Price', 'New Price', 'Change', 'Change %', 'Source', 'Reason'];
    const rows = auditLog.map(entry => [
      new Date(entry.created_at).toLocaleString(),
      entry.product_name,
      entry.product_code,
      entry.old_price?.toFixed(2),
      entry.new_price?.toFixed(2),
      entry.change_amount?.toFixed(4),
      entry.change_percent?.toFixed(4) + '%',
      entry.source,
      entry.reason
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const uniqueProducts = [...new Set(auditLog.map(e => e.product_code).filter(Boolean))];

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#D4AF37]" />
          Price Audit Trail
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white text-xs h-8">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {uniqueProducts.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" size="sm" className="border-white/20 text-white h-8">
            <Download className="w-3 h-3 mr-1" />CSV
          </Button>
          <Button onClick={fetchAuditLog} variant="outline" size="sm" className="border-white/20 text-white h-8">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && auditLog.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
          </div>
        ) : auditLog.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No audit entries yet. Price changes will appear here automatically.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {auditLog.map((entry) => (
              <div key={entry.id} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    (entry.change_amount || 0) >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {(entry.change_amount || 0) >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{entry.product_name || entry.product_code}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">${entry.old_price?.toFixed(2)}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-white text-sm font-bold">${entry.new_price?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`text-xs font-medium ${(entry.change_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(entry.change_percent || 0) >= 0 ? '+' : ''}{entry.change_percent?.toFixed(4)}%
                    </span>
                    <Badge className="text-[10px] bg-slate-700 text-slate-300">{entry.source}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
