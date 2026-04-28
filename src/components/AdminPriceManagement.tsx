import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { products, Product } from '@/data/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign, Edit3, Save, X, Loader2, Shield, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, History, RefreshCw, Lock, Unlock, Percent,
  BarChart3, Clock, User, FileText, Coins, Gem, Fuel, Zap
} from 'lucide-react';

interface PriceOverride {
  id: string;
  product_id: string;
  product_code: string;
  original_price: number;
  override_price: number;
  currency: string;
  reason: string;
  set_by: string;
  set_by_name?: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PriceHistory {
  id: string;
  product_id: string;
  product_code: string;
  old_price: number;
  new_price: number;
  change_type: 'manual' | 'market' | 'api';
  changed_by: string;
  changed_by_name?: string;
  reason: string;
  created_at: string;
}

export default function AdminPriceManagement() {
  const { user, userProfile, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState<string | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    price: '',
    currency: 'USD',
    reason: '',
    expiresAt: '',
    isActive: true
  });

  // 0.87% Service Fee on all transactions
  const SERVICE_FEE_RATE = 0.0087;


  useEffect(() => {
    if (hasRole('admin')) {
      loadPriceData();
    }
  }, []);

  const loadPriceData = async () => {
    setLoading(true);
    try {
      // Load price overrides from database
      const { data: overrides, error: overridesError } = await supabase
        .from('price_overrides')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!overridesError && overrides) {
        setPriceOverrides(overrides);
      }

      // Load price history
      const { data: history, error: historyError } = await supabase
        .from('price_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!historyError && history) {
        setPriceHistory(history);
      }
    } catch (error) {
      console.error('Error loading price data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (product: Product) => {
    const existingOverride = priceOverrides.find(o => o.product_id === product.id && o.is_active);
    
    setEditingProduct(product);
    setEditForm({
      price: existingOverride ? existingOverride.override_price.toString() : product.price.toString(),
      currency: existingOverride?.currency || 'USD',
      reason: '',
      expiresAt: existingOverride?.expires_at ? existingOverride.expires_at.split('T')[0] : '',
      isActive: true
    });
    setShowEditModal(true);
  };

  const handleSavePrice = async () => {
    if (!editingProduct || !user) return;

    const newPrice = parseFloat(editForm.price);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Please enter a valid price');
      return;
    }

    setSaving(editingProduct.id);
    try {
      // Check if override exists
      const existingOverride = priceOverrides.find(
        o => o.product_id === editingProduct.id
      );

      const overrideData = {
        product_id: editingProduct.id,
        product_code: editingProduct.code,
        original_price: editingProduct.price,
        override_price: newPrice,
        currency: editForm.currency,
        reason: editForm.reason || 'Manual price adjustment by admin',
        set_by: user.id,
        set_by_name: userProfile?.full_name || user.email,
        is_active: editForm.isActive,
        expires_at: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('price_overrides')
          .update(overrideData)
          .eq('id', existingOverride.id);

        if (error) throw error;
      } else {
        // Create new override
        const { error } = await supabase
          .from('price_overrides')
          .insert({
            ...overrideData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Log price change to history
      await supabase.from('price_history').insert({
        product_id: editingProduct.id,
        product_code: editingProduct.code,
        old_price: existingOverride?.override_price || editingProduct.price,
        new_price: newPrice,
        change_type: 'manual',
        changed_by: user.id,
        changed_by_name: userProfile?.full_name || user.email,
        reason: editForm.reason || 'Manual price adjustment by admin',
        created_at: new Date().toISOString()
      });

      // Reload data
      await loadPriceData();
      setShowEditModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving price:', error);
      alert('Failed to save price. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleOverride = async (override: PriceOverride) => {
    setSaving(override.id);
    try {
      const { error } = await supabase
        .from('price_overrides')
        .update({ 
          is_active: !override.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', override.id);

      if (error) throw error;
      await loadPriceData();
    } catch (error) {
      console.error('Error toggling override:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('Are you sure you want to delete this price override?')) return;

    setSaving(overrideId);
    try {
      const { error } = await supabase
        .from('price_overrides')
        .delete()
        .eq('id', overrideId);

      if (error) throw error;
      await loadPriceData();
    } catch (error) {
      console.error('Error deleting override:', error);
    } finally {
      setSaving(null);
    }
  };

  const viewProductHistory = (productId: string) => {
    setSelectedProductHistory(productId);
    setShowHistoryModal(true);
  };

  const getEffectivePrice = (product: Product): { price: number; isOverridden: boolean; override?: PriceOverride } => {
    const activeOverride = priceOverrides.find(
      o => o.product_id === product.id && o.is_active && 
      (!o.expires_at || new Date(o.expires_at) > new Date())
    );

    if (activeOverride) {
      return { price: activeOverride.override_price, isOverridden: true, override: activeOverride };
    }
    return { price: product.price, isOverridden: false };
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'Precious Metals') return <Gem className="w-4 h-4 text-[#D4AF37]" />;
    if (category === 'Industrial Minerals') return <Zap className="w-4 h-4 text-purple-400" />;
    return <Fuel className="w-4 h-4 text-cyan-400" />;
  };

  const filteredProducts = products.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'energy') return !p.isRWA;
    if (activeTab === 'rwa') return p.isRWA;
    if (activeTab === 'overridden') {
      return priceOverrides.some(o => o.product_id === p.id && o.is_active);
    }
    return true;
  });

  const productHistory = priceHistory.filter(h => h.product_id === selectedProductHistory);

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Access Denied</h3>
          <p className="text-slate-400">Admin access required for price management.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#D4AF37]" />
            Price Management
          </h2>
          <p className="text-slate-400 text-sm">Admin-only manual price input for all products</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Percent className="w-3 h-3 mr-1" />
            0% Service Fee
          </Badge>
          <Button
            onClick={loadPriceData}
            disabled={loading}
            variant="outline"
            className="border-[#00D4FF] text-[#00D4FF]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
        <Lock className="h-4 w-4 text-[#D4AF37]" />
        <AlertDescription className="text-[#D4AF37]">
          <strong>Admin Only:</strong> Manual price overrides take precedence over market prices. 
          All changes are logged for audit purposes. Service fee is 0% on all transactions.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            All Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="energy" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Fuel className="w-4 h-4 mr-1" />
            Energy ({products.filter(p => !p.isRWA).length})
          </TabsTrigger>
          <TabsTrigger value="rwa" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Gem className="w-4 h-4 mr-1" />
            RWAs ({products.filter(p => p.isRWA).length})
          </TabsTrigger>
          <TabsTrigger value="overridden" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Edit3 className="w-4 h-4 mr-1" />
            Overridden ({priceOverrides.filter(o => o.is_active).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const { price, isOverridden, override } = getEffectivePrice(product);
                const priceChange = ((price - product.price) / product.price) * 100;

                return (
                  <Card 
                    key={product.id} 
                    className={`bg-white/10 backdrop-blur-md border-white/20 ${isOverridden ? 'border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/30' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(product.category)}
                          <div>
                            <h3 className="text-white font-semibold">{product.name}</h3>
                            <p className="text-slate-400 text-xs">{product.code}</p>
                          </div>
                        </div>
                        {isOverridden && (
                          <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Manual
                          </Badge>
                        )}
                        {product.isRWA && !isOverridden && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                            RWA
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Market Price:</span>
                          <span className={`font-mono ${isOverridden ? 'text-slate-500 line-through' : 'text-white'}`}>
                            ${product.price.toLocaleString()} / {product.unit}
                          </span>
                        </div>
                        
                        {isOverridden && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#D4AF37] text-sm font-medium">Override Price:</span>
                            <span className="text-[#D4AF37] font-bold font-mono">
                              ${price.toLocaleString()} / {product.unit}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Change:</span>
                          <span className={`flex items-center gap-1 text-sm ${product.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {product.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {product.change >= 0 ? '+' : ''}{product.change}%
                          </span>
                        </div>

                        {isOverridden && override?.expires_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">Expires:</span>
                            <span className="text-orange-400 text-sm flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(override.expires_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Source:</span>
                          <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300">
                            {isOverridden ? 'Admin Override' : product.priceSource}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => openEditModal(product)}
                          className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
                          size="sm"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          {isOverridden ? 'Edit Price' : 'Set Price'}
                        </Button>
                        <Button
                          onClick={() => viewProductHistory(product.id)}
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        {isOverridden && override && (
                          <Button
                            onClick={() => handleToggleOverride(override)}
                            disabled={saving === override.id}
                            variant="outline"
                            size="sm"
                            className={override.is_active ? 'border-green-500 text-green-400' : 'border-slate-600 text-slate-400'}
                          >
                            {saving === override.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : override.is_active ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Active Overrides Summary */}
      {priceOverrides.filter(o => o.is_active).length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
              Active Price Overrides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priceOverrides.filter(o => o.is_active).map(override => (
                <div 
                  key={override.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">{override.product_code}</Badge>
                    <div>
                      <span className="text-white font-medium">${override.override_price.toLocaleString()}</span>
                      <span className="text-slate-500 mx-2">←</span>
                      <span className="text-slate-400 line-through">${override.original_price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">
                      by {override.set_by_name || 'Admin'}
                    </span>
                    {override.expires_at && (
                      <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(override.expires_at).toLocaleDateString()}
                      </Badge>
                    )}
                    <Button
                      onClick={() => handleDeleteOverride(override.id)}
                      disabled={saving === override.id}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {saving === override.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Price Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#D4AF37]" />
              Set Manual Price - {editingProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Current Market Price:</span>
                  <span className="text-white font-mono">${editingProduct.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Unit:</span>
                  <span className="text-white">{editingProduct.unit}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">New Price *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="pl-8 bg-slate-800 border-slate-600 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <Select value={editForm.currency} onValueChange={(v) => setEditForm({ ...editForm, currency: v })}>
                    <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="NGN">NGN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.price && (
                  <p className={`text-sm ${parseFloat(editForm.price) > editingProduct.price ? 'text-green-400' : parseFloat(editForm.price) < editingProduct.price ? 'text-red-400' : 'text-slate-400'}`}>
                    {parseFloat(editForm.price) > editingProduct.price ? '+' : ''}
                    {(((parseFloat(editForm.price) - editingProduct.price) / editingProduct.price) * 100).toFixed(2)}% from market price
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-white">Reason for Change</Label>
                <Textarea
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                  placeholder="Enter reason for price adjustment..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Expiration Date (Optional)</Label>
                <Input
                  type="date"
                  value={editForm.expiresAt}
                  onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-slate-400 text-xs">Leave empty for no expiration</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white">Active Override</Label>
                  <p className="text-slate-400 text-xs">Enable to apply this price immediately</p>
                </div>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                />
              </div>

              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">
                  0% service fee applies to all transactions
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePrice}
              disabled={saving !== null || !editForm.price}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#D4AF37]" />
              Price History - {products.find(p => p.id === selectedProductHistory)?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {productHistory.length > 0 ? (
              <div className="space-y-2">
                {productHistory.map(entry => (
                  <div 
                    key={entry.id}
                    className="p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          entry.change_type === 'manual' 
                            ? 'bg-[#D4AF37]/20 text-[#D4AF37]' 
                            : 'bg-blue-500/20 text-blue-400'
                        }>
                          {entry.change_type === 'manual' ? 'Manual' : 'Market'}
                        </Badge>
                        <span className="text-white font-mono">
                          ${entry.old_price.toLocaleString()} → ${entry.new_price.toLocaleString()}
                        </span>
                        <span className={`text-sm ${entry.new_price > entry.old_price ? 'text-green-400' : 'text-red-400'}`}>
                          ({entry.new_price > entry.old_price ? '+' : ''}{(((entry.new_price - entry.old_price) / entry.old_price) * 100).toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <User className="w-3 h-3" />
                        {entry.changed_by_name || 'System'}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </div>
                    {entry.reason && (
                      <p className="text-slate-400 text-sm mt-2 flex items-start gap-2">
                        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {entry.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No price history available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
