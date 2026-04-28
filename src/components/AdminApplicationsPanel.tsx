import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, Search, Filter, CheckCircle, XCircle, Clock, 
  Loader2, Eye, Trash2, Download, RefreshCw, User, Mail, 
  MapPin, Calendar, CreditCard, Package, Building, Phone,
  ChevronLeft, ChevronRight, AlertCircle, Shield, Users,
  CheckSquare, Square, MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

interface Application {
  id: string;
  user_id: string | null;
  product_id: string;
  product_name: string;
  product_code: string;
  product_unit: string;
  application_type: string;
  quantity: number;
  proposed_price: number;
  delivery_location: string;
  delivery_date: string;
  payment_method: string;
  notes: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  guest_name: string | null;
  guest_email: string | null;
  session_id: string | null;
  users?: { 
    full_name: string; 
    email: string; 
    company?: string;
    phone?: string;
    kyc_status?: string;
  } | null;
}

interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  allocated: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'allocated', label: 'Allocated' }
];

const PAYMENT_METHODS: Record<string, string> = {
  card: 'Credit/Debit Card',
  flutterwave: 'Flutterwave',
  bank_transfer: 'Bank Transfer',
  lc: 'Letter of Credit (LC)',
  digicoin: 'DigiCoin'
};


export default function AdminApplicationsPanel() {
  const { hasRole } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0, pending: 0, approved: 0, rejected: 0, allocated: 0
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Detail modal
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Bulk action modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkNotes, setBulkNotes] = useState('');

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });
      
      const { count: pending } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: approved } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      const { count: rejected } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');
      
      const { count: allocated } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'allocated');

      setStats({
        total: total || 0,
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
        allocated: allocated || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('applications')
        .select(`
          *,
          users (full_name, email, company, phone, kyc_status)
        `, { count: 'exact' });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      // Apply search filter (search in guest_name, guest_email, or user's name/email)
      if (searchQuery.trim()) {
        query = query.or(`guest_name.ilike.%${searchQuery}%,guest_email.ilike.%${searchQuery}%,product_name.ilike.%${searchQuery}%`);
      }

      // Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setApplications(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('admin')) {
      fetchStats();
      fetchApplications();
    }
  }, [statusFilter, currentPage, dateFrom, dateTo]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (hasRole('admin')) {
        setCurrentPage(1);
        fetchApplications();
      }
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleStatusUpdate = async (appId: string, newStatus: 'approved' | 'rejected') => {
    setUpdating(appId);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', appId);

      if (error) throw error;

      // If approved, create allocation
      if (newStatus === 'approved') {
        const app = applications.find(a => a.id === appId);
        if (app) {
          const serviceFee = 0; // 0% service fee - no fees on any transactions

          const totalAmount = app.quantity * (app.proposed_price || 0);
          
          await supabase.from('allocations').insert({
            application_id: appId,
            user_id: app.user_id,
            product_id: app.product_id,
            allocated_quantity: app.quantity,
            unit_price: app.proposed_price,
            total_amount: totalAmount,
            service_fee: serviceFee,
            final_amount: totalAmount + serviceFee,
            status: 'allocated'
          });
        }
      }

      // Refresh data
      fetchStats();
      fetchApplications();
    } catch (err) {
      console.error('Error updating application:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    
    setBulkUpdating(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: bulkAction === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          notes: bulkNotes || undefined
        })
        .in('id', idsArray);

      if (error) throw error;

      // If approving, create allocations for each
      if (bulkAction === 'approve') {
        const appsToAllocate = applications.filter(a => selectedIds.has(a.id));
        for (const app of appsToAllocate) {
          const serviceFee = 0; // 0% service fee - no fees on any transactions

          const totalAmount = app.quantity * (app.proposed_price || 0);
          
          await supabase.from('allocations').insert({
            application_id: app.id,
            user_id: app.user_id,
            product_id: app.product_id,
            allocated_quantity: app.quantity,
            unit_price: app.proposed_price,
            total_amount: totalAmount,
            service_fee: serviceFee,
            final_amount: totalAmount + serviceFee,
            status: 'allocated'
          });
        }
      }

      // Reset selection and refresh
      setSelectedIds(new Set());
      setSelectAll(false);
      setShowBulkModal(false);
      setBulkNotes('');
      setBulkAction(null);
      fetchStats();
      fetchApplications();
    } catch (err) {
      console.error('Error bulk updating:', err);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const pendingIds = applications
        .filter(a => a.status === 'pending')
        .map(a => a.id);
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
    setSelectAll(false);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'Applicant', 'Email', 'Type', 'Product', 'Quantity', 'Price', 'Location', 'Status'];
    const rows = applications.map(app => [
      app.id,
      new Date(app.created_at).toLocaleDateString(),
      app.user_id ? app.users?.full_name : app.guest_name,
      app.user_id ? app.users?.email : app.guest_email,
      app.user_id ? 'Registered' : 'Guest',
      app.product_name,
      app.quantity,
      app.proposed_price,
      app.delivery_location,
      app.status
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      allocated: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return styles[status] || 'bg-slate-500/20 text-slate-400';
  };

  const getApplicantInfo = (app: Application) => {
    if (app.user_id && app.users) {
      return {
        name: app.users.full_name || 'Unknown',
        email: app.users.email || '',
        type: 'Registered',
        company: app.users.company,
        phone: app.users.phone,
        kycStatus: app.users.kyc_status
      };
    }
    return {
      name: app.guest_name || 'Guest',
      email: app.guest_email || '',
      type: 'Guest',
      company: null,
      phone: null,
      kycStatus: null
    };
  };

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Access Denied</h3>
          <p className="text-slate-400">Admin access required to view this panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#D4AF37]" />
            Applications Management
          </h2>
          <p className="text-slate-400 text-sm">Review and manage all submitted applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { fetchStats(); fetchApplications(); }}
            disabled={loading}
            variant="outline"
            className="border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total</div>
                <div className="text-xl font-bold text-white">{stats.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Pending</div>
                <div className="text-xl font-bold text-yellow-400">{stats.pending}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Approved</div>
                <div className="text-xl font-bold text-green-400">{stats.approved}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Rejected</div>
                <div className="text-xl font-bold text-red-400">{stats.rejected}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Allocated</div>
                <div className="text-xl font-bold text-blue-400">{stats.allocated}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px] bg-white/10 border-white/20">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="w-[150px] bg-white/10 border-white/20 text-white"
                placeholder="From date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="w-[150px] bg-white/10 border-white/20 text-white"
                placeholder="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white font-medium">{selectedIds.size} application(s) selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => { setBulkAction('approve'); setShowBulkModal(true); }}
                size="sm"
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve All
              </Button>
              <Button
                onClick={() => { setBulkAction('reject'); setShowBulkModal(true); }}
                size="sm"
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject All
              </Button>
              <Button
                onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Applications ({totalCount})</CardTitle>
            {applications.some(a => a.status === 'pending') && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  className="border-white/30"
                />
                <span className="text-slate-400 text-sm">Select all pending</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No applications found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {applications.map(app => {
                const applicant = getApplicantInfo(app);
                const totalValue = app.quantity * (app.proposed_price || 0);
                
                return (
                  <div key={app.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Checkbox for pending items */}
                      {app.status === 'pending' && (
                        <Checkbox
                          checked={selectedIds.has(app.id)}
                          onCheckedChange={(checked) => handleSelectOne(app.id, !!checked)}
                          className="mt-1 border-white/30"
                        />
                      )}
                      
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          {/* Applicant Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium">{applicant.name}</span>
                              <Badge className={applicant.type === 'Guest' 
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }>
                                {applicant.type}
                              </Badge>
                              {applicant.company && (
                                <Badge className="bg-slate-700 text-slate-300 text-xs">
                                  {applicant.company}
                                </Badge>
                              )}
                            </div>
                            <div className="text-slate-400 text-sm flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {applicant.email}
                            </div>
                            
                            {/* Product & Details */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                              <span className="text-[#D4AF37] font-medium flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {app.product_name}
                              </span>
                              <span className="text-slate-400">
                                {app.quantity?.toLocaleString()} {app.product_unit}
                              </span>
                              <span className="text-green-400 font-medium">
                                ${totalValue.toLocaleString()}
                              </span>
                              <span className="text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {app.delivery_location}
                              </span>
                            </div>
                            
                            {/* Date & Payment */}
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(app.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {PAYMENT_METHODS[app.payment_method] || app.payment_method}
                              </span>
                            </div>
                          </div>
                          
                          {/* Status & Actions */}
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusBadge(app.status)} capitalize`}>
                              {app.status}
                            </Badge>
                            
                            {app.status === 'pending' ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  onClick={() => handleStatusUpdate(app.id, 'approved')}
                                  disabled={updating === app.id}
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 h-8"
                                >
                                  {updating === app.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(app.id, 'rejected')}
                                  disabled={updating === app.id}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-400 hover:bg-red-500/10 h-8"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : null}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedApplication(app); setShowDetailModal(true); }}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {app.status !== 'approved' && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(app.id, 'approved')}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {app.status !== 'rejected' && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(app.id, 'rejected')}>
                                    <XCircle className="w-4 h-4 mr-2 text-red-400" />
                                    Reject
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div className="text-slate-400 text-sm">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-white text-sm px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-slate-900 border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              Application Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge className={`${getStatusBadge(selectedApplication.status)} capitalize text-sm px-3 py-1`}>
                  {selectedApplication.status}
                </Badge>
                <span className="text-slate-400 text-sm">
                  ID: {selectedApplication.id.slice(0, 8)}...
                </span>
              </div>
              
              {/* Applicant Section */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  Applicant Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Name</div>
                    <div className="text-white font-medium">
                      {selectedApplication.user_id 
                        ? selectedApplication.users?.full_name 
                        : selectedApplication.guest_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Email</div>
                    <div className="text-white">
                      {selectedApplication.user_id 
                        ? selectedApplication.users?.email 
                        : selectedApplication.guest_email}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Type</div>
                    <Badge className={selectedApplication.user_id 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-orange-500/20 text-orange-400'
                    }>
                      {selectedApplication.user_id ? 'Registered User' : 'Guest'}
                    </Badge>
                  </div>
                  {selectedApplication.users?.company && (
                    <div>
                      <div className="text-slate-400">Company</div>
                      <div className="text-white flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {selectedApplication.users.company}
                      </div>
                    </div>
                  )}
                  {selectedApplication.users?.phone && (
                    <div>
                      <div className="text-slate-400">Phone</div>
                      <div className="text-white flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedApplication.users.phone}
                      </div>
                    </div>
                  )}
                  {selectedApplication.users?.kyc_status && (
                    <div>
                      <div className="text-slate-400">KYC Status</div>
                      <Badge className={
                        selectedApplication.users.kyc_status === 'verified' 
                          ? 'bg-green-500/20 text-green-400'
                          : selectedApplication.users.kyc_status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }>
                        {selectedApplication.users.kyc_status}
                      </Badge>
                    </div>
                  )}
                  {selectedApplication.session_id && (
                    <div className="col-span-2">
                      <div className="text-slate-400">Session ID</div>
                      <div className="text-slate-500 font-mono text-xs">
                        {selectedApplication.session_id}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Product Section */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#D4AF37]" />
                  Product Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Product</div>
                    <div className="text-[#D4AF37] font-medium">{selectedApplication.product_name}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Code</div>
                    <div className="text-white">{selectedApplication.product_code}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Quantity</div>
                    <div className="text-white">{selectedApplication.quantity?.toLocaleString()} {selectedApplication.product_unit}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Unit Price</div>
                    <div className="text-white">${selectedApplication.proposed_price?.toFixed(2)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-400">Total Value</div>
                    <div className="text-green-400 font-bold text-lg">
                      ${(selectedApplication.quantity * (selectedApplication.proposed_price || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Delivery Section */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  Delivery Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <div className="text-slate-400">Location</div>
                    <div className="text-white">{selectedApplication.delivery_location}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Preferred Date</div>
                    <div className="text-white">
                      {selectedApplication.delivery_date 
                        ? new Date(selectedApplication.delivery_date).toLocaleDateString()
                        : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Payment Method</div>
                    <div className="text-white flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {PAYMENT_METHODS[selectedApplication.payment_method] || selectedApplication.payment_method}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              {selectedApplication.notes && (
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-white font-medium">Additional Notes</h4>
                  <p className="text-slate-300 text-sm">{selectedApplication.notes}</p>
                </div>
              )}
              
              {/* Timestamps */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Submitted: {new Date(selectedApplication.created_at).toLocaleString()}</span>
                {selectedApplication.reviewed_at && (
                  <span>Reviewed: {new Date(selectedApplication.reviewed_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            {selectedApplication?.status === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedApplication.id, 'approved');
                    setShowDetailModal(false);
                  }}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedApplication.id, 'rejected');
                    setShowDetailModal(false);
                  }}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowDetailModal(false)}
              variant="outline"
              className="border-white/20 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {bulkAction === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              Bulk {bulkAction === 'approve' ? 'Approve' : 'Reject'} Applications
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-white">
                You are about to <span className={bulkAction === 'approve' ? 'text-green-400' : 'text-red-400'}>
                  {bulkAction}
                </span> {selectedIds.size} application(s).
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Add a note (optional)</Label>
              <Textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Enter any notes for this bulk action..."
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => { setShowBulkModal(false); setBulkAction(null); setBulkNotes(''); }}
              variant="outline"
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={bulkUpdating}
              className={bulkAction === 'approve' 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
              }
            >
              {bulkUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : bulkAction === 'approve' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirm {bulkAction === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
