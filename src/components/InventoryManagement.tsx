import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package, AlertTriangle, TrendingDown, TrendingUp, RefreshCw, Loader2,
  BarChart3, Plus, Minus, Edit3, History, Bell, Fuel, Gem, ArrowDown, ArrowUp,
  Search, Save, CheckCircle
} from 'lucide-react';

interface InventoryLevel {
  id: string;
  product_code: string;
  product_name: string;
  product_category: string;
  current_stock: number;
  unit: string;
  reorder_threshold: number;
  max_capacity: number;
  auto_deduct_enabled: boolean;
  last_reorder_alert_at: string;
  notes: string;
  updated_at: string;
}

interface InventoryHistoryItem {
  id: string;
  product_code: string;
  change_type: string;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reference_id: string;
  performed_by: string;
  notes: string;
  created_at: string;
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  order_deduction: { label: 'Order Deduction', color: 'text-red-400', icon: ArrowDown },
  manual_adjustment: { label: 'Manual Adjustment', color: 'text-blue-400', icon: Edit3 },
  restock: { label: 'Restock', color: 'text-green-400', icon: ArrowUp },
  correction: { label: 'Correction', color: 'text-yellow-400', icon: RefreshCw },
};

export default function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryLevel[]>([]);
  const [history, setHistory] = useState<InventoryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'history' | 'adjust'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Adjustment form
  const [adjustForm, setAdjustForm] = useState({
    product_code: '',
    change_type: 'manual_adjustment',
    quantity: '',
    notes: ''
  });
  const [adjusting, setAdjusting] = useState(false);

  // Threshold edit
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');

  useEffect(() => { fetchInventory(); fetchHistory(); }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('inventory_levels')
        .select('*')
        .order('product_category', { ascending: true });
      setInventory(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await supabase
        .from('inventory_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setHistory(data || []);
    } catch (err) { console.error(err); }
  };

  const handleAdjustment = async () => {
    if (!adjustForm.product_code || !adjustForm.quantity) return;
    setAdjusting(true);
    try {
      const item = inventory.find(i => i.product_code === adjustForm.product_code);
      if (!item) throw new Error('Product not found');

      const qtyChange = parseFloat(adjustForm.quantity);
      if (isNaN(qtyChange) || qtyChange === 0) throw new Error('Invalid quantity');

      const previousStock = item.current_stock;
      const newStock = previousStock + qtyChange;

      // Update inventory level
      await supabase.from('inventory_levels').update({
        current_stock: Math.max(0, newStock),
        updated_at: new Date().toISOString()
      }).eq('id', item.id);

      // Record history
      await supabase.from('inventory_history').insert({
        product_code: adjustForm.product_code,
        change_type: adjustForm.change_type,
        quantity_change: qtyChange,
        previous_stock: previousStock,
        new_stock: Math.max(0, newStock),
        performed_by: 'Admin',
        notes: adjustForm.notes || `${adjustForm.change_type}: ${qtyChange > 0 ? '+' : ''}${qtyChange.toLocaleString()}`
      });

      // Check reorder threshold
      if (newStock < item.reorder_threshold) {
        // Send reorder alert
        try {
          await supabase.functions.invoke('sendgrid-notifications', {
            body: {
              type: 'inventory_reorder_alert',
              to: 'commercial@digiwelltrading.com',
              data: {
                productName: item.product_name,
                productCode: item.product_code,
                currentStock: Math.max(0, newStock),
                threshold: item.reorder_threshold,
                unit: item.unit
              }
            }
          });
        } catch (e) { console.warn('Reorder alert email failed:', e); }

        await supabase.from('inventory_levels').update({
          last_reorder_alert_at: new Date().toISOString()
        }).eq('id', item.id);
      }

      setAdjustForm({ product_code: '', change_type: 'manual_adjustment', quantity: '', notes: '' });
      await fetchInventory();
      await fetchHistory();
    } catch (err: any) {
      console.error('Adjustment failed:', err);
    } finally {
      setAdjusting(false);
    }
  };

  const updateThreshold = async (itemId: string) => {
    setSavingId(itemId);
    try {
      await supabase.from('inventory_levels').update({
        reorder_threshold: parseFloat(thresholdValue) || 0,
        updated_at: new Date().toISOString()
      }).eq('id', itemId);
      setEditingThreshold(null);
      await fetchInventory();
    } catch (err) { console.error(err); }
    finally { setSavingId(null); }
  };

  const filteredInventory = inventory.filter(item =>
    !searchTerm ||
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = inventory.filter(i => i.current_stock < i.reorder_threshold);
  const totalValue = inventory.reduce((s, i) => s + i.current_stock, 0);
  const petroleumItems = inventory.filter(i => i.product_category === 'petroleum');
  const rwaItems = inventory.filter(i => i.product_category === 'rwa');

  const getStockPercentage = (item: InventoryLevel) => {
    return Math.min(100, (item.current_stock / item.max_capacity) * 100);
  };

  const getStockColor = (item: InventoryLevel) => {
    if (item.current_stock < item.reorder_threshold) return 'bg-red-500';
    if (item.current_stock < item.reorder_threshold * 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-[#D4AF37]" />
            Inventory Management
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time stock tracking for petroleum products & RWAs</p>
        </div>
        <div className="flex gap-2">
          {['overview', 'history', 'adjust'].map(view => (
            <Button
              key={view}
              onClick={() => setActiveView(view as any)}
              variant={activeView === view ? 'default' : 'outline'}
              className={activeView === view ? 'bg-[#D4AF37] text-slate-900' : 'border-slate-600 text-white hover:bg-slate-700'}
              size="sm"
            >
              {view === 'overview' && <BarChart3 className="w-4 h-4 mr-1" />}
              {view === 'history' && <History className="w-4 h-4 mr-1" />}
              {view === 'adjust' && <Edit3 className="w-4 h-4 mr-1" />}
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </Button>
          ))}
          <Button onClick={() => { fetchInventory(); fetchHistory(); }} variant="outline" className="border-slate-600 text-white hover:bg-slate-700" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{inventory.length}</div>
            <div className="text-slate-400 text-xs">Products Tracked</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{petroleumItems.length}</div>
            <div className="text-blue-400/70 text-xs">Petroleum Products</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{rwaItems.length}</div>
            <div className="text-purple-400/70 text-xs">RWA Products</div>
          </CardContent>
        </Card>
        <Card className={`${lowStockItems.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {lowStockItems.length}
            </div>
            <div className={`${lowStockItems.length > 0 ? 'text-red-400/70' : 'text-green-400/70'} text-xs`}>
              {lowStockItems.length > 0 ? 'Low Stock Alerts' : 'All Stock OK'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#D4AF37]">{history.length}</div>
            <div className="text-[#D4AF37]/70 text-xs">History Records</div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400 font-bold">Low Stock Alerts ({lowStockItems.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lowStockItems.map(item => (
                <div key={item.id} className="bg-red-500/10 rounded-lg p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.product_category === 'petroleum' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                    {item.product_category === 'petroleum' ? <Fuel className="w-4 h-4 text-blue-400" /> : <Gem className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold">{item.product_name}</p>
                    <p className="text-red-400 text-xs">
                      {Number(item.current_stock).toLocaleString()} / {Number(item.reorder_threshold).toLocaleString()} {item.unit} threshold
                    </p>
                  </div>
                  <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="pl-10 bg-slate-800 border-slate-600 text-white"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
              <p className="text-slate-400">Loading inventory...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map(item => {
                const pct = getStockPercentage(item);
                const isLow = item.current_stock < item.reorder_threshold;
                return (
                  <Card key={item.id} className={`bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors ${isLow ? 'border-red-500/50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.product_category === 'petroleum' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                          {item.product_category === 'petroleum' ? <Fuel className="w-5 h-5 text-blue-400" /> : <Gem className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-sm">{item.product_name}</h4>
                          <p className="text-[#D4AF37] font-mono text-xs">{item.product_code}</p>
                        </div>
                        {isLow && <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Current Stock</span>
                          <span className={`font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>
                            {Number(item.current_stock).toLocaleString()} {item.unit}
                          </span>
                        </div>

                        {/* Stock Bar */}
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                          <div className={`${getStockColor(item)} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>

                        <div className="flex justify-between text-xs text-slate-500">
                          <span>0</span>
                          <span>{Number(item.max_capacity).toLocaleString()} {item.unit}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Reorder At</span>
                          {editingThreshold === item.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={thresholdValue}
                                onChange={e => setThresholdValue(e.target.value)}
                                className="w-24 h-6 bg-slate-700 border-slate-600 text-white text-xs"
                                type="number"
                              />
                              <Button size="sm" onClick={() => updateThreshold(item.id)} className="h-6 w-6 p-0 bg-green-600">
                                {savingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              </Button>
                            </div>
                          ) : (
                            <span
                              className="text-yellow-400 cursor-pointer hover:underline"
                              onClick={() => { setEditingThreshold(item.id); setThresholdValue(String(item.reorder_threshold)); }}
                            >
                              {Number(item.reorder_threshold).toLocaleString()} {item.unit}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Auto-deduct</span>
                          <Badge className={item.auto_deduct_enabled ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-slate-500/20 text-slate-400 text-[10px]'}>
                            {item.auto_deduct_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#D4AF37]" />Inventory History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400">No inventory changes recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50 sticky top-0">
                    <tr>
                      <th className="text-left text-slate-400 p-2">Date</th>
                      <th className="text-left text-slate-400 p-2">Product</th>
                      <th className="text-left text-slate-400 p-2">Type</th>
                      <th className="text-right text-slate-400 p-2">Change</th>
                      <th className="text-right text-slate-400 p-2">Previous</th>
                      <th className="text-right text-slate-400 p-2">New</th>
                      <th className="text-left text-slate-400 p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => {
                      const config = CHANGE_TYPE_CONFIG[h.change_type] || CHANGE_TYPE_CONFIG.correction;
                      const ChangeIcon = config.icon;
                      return (
                        <tr key={h.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                          <td className="p-2 text-slate-300 text-xs">{new Date(h.created_at).toLocaleString()}</td>
                          <td className="p-2 text-white font-mono text-xs">{h.product_code}</td>
                          <td className="p-2">
                            <Badge className={`${config.color} bg-slate-700/50 text-[10px]`}>
                              <ChangeIcon className="w-3 h-3 mr-1" />{config.label}
                            </Badge>
                          </td>
                          <td className={`p-2 text-right font-bold ${h.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {h.quantity_change > 0 ? '+' : ''}{Number(h.quantity_change).toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-slate-400">{Number(h.previous_stock).toLocaleString()}</td>
                          <td className="p-2 text-right text-white font-bold">{Number(h.new_stock).toLocaleString()}</td>
                          <td className="p-2 text-slate-400 text-xs truncate max-w-[200px]">{h.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Adjust View */}
      {activeView === 'adjust' && (
        <Card className="bg-slate-800/50 border-[#D4AF37]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#D4AF37]" />Manual Stock Adjustment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Product *</Label>
                <Select value={adjustForm.product_code} onValueChange={v => setAdjustForm({ ...adjustForm, product_code: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map(item => (
                      <SelectItem key={item.product_code} value={item.product_code}>
                        {item.product_name} ({item.product_code}) - {Number(item.current_stock).toLocaleString()} {item.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Adjustment Type *</Label>
                <Select value={adjustForm.change_type} onValueChange={v => setAdjustForm({ ...adjustForm, change_type: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">Restock (Add)</SelectItem>
                    <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                    <SelectItem value="order_deduction">Order Deduction (Remove)</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Quantity (use negative for deductions) *</Label>
                <Input
                  type="number"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  placeholder="e.g., 50000 or -10000"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Notes</Label>
                <Input
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="Reason for adjustment..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {adjustForm.product_code && adjustForm.quantity && (
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-bold text-sm mb-2">Preview</h4>
                {(() => {
                  const item = inventory.find(i => i.product_code === adjustForm.product_code);
                  const qty = parseFloat(adjustForm.quantity) || 0;
                  if (!item) return null;
                  const newStock = Math.max(0, item.current_stock + qty);
                  const isLow = newStock < item.reorder_threshold;
                  return (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Product:</span><span className="text-white">{item.product_name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Current Stock:</span><span className="text-white">{Number(item.current_stock).toLocaleString()} {item.unit}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Change:</span><span className={qty > 0 ? 'text-green-400' : 'text-red-400'}>{qty > 0 ? '+' : ''}{qty.toLocaleString()}</span></div>
                      <div className="border-t border-slate-600 pt-1 flex justify-between font-bold">
                        <span className="text-white">New Stock:</span>
                        <span className={isLow ? 'text-red-400' : 'text-green-400'}>{newStock.toLocaleString()} {item.unit}</span>
                      </div>
                      {isLow && (
                        <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Below reorder threshold ({Number(item.reorder_threshold).toLocaleString()}) - alert will be sent
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <Button
              onClick={handleAdjustment}
              disabled={adjusting || !adjustForm.product_code || !adjustForm.quantity}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-5"
            >
              {adjusting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : <><Save className="w-4 h-4 mr-2" />Apply Adjustment</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
