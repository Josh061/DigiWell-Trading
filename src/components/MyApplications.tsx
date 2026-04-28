import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Search, Filter, CheckCircle, XCircle, Clock, 
  Loader2, Eye, Download, RefreshCw, MapPin, Calendar, 
  CreditCard, Package, ChevronRight, AlertCircle, 
  FileDown, Receipt, Award, TrendingUp, History,
  ChevronLeft, Printer, Share2, Bell
} from 'lucide-react';

interface Application {
  id: string;
  user_id: string;
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
  admin_notes?: string;
}

interface Allocation {
  id: string;
  application_id: string;
  allocated_quantity: number;
  unit_price: number;
  total_amount: number;
  service_fee: number;
  final_amount: number;
  status: string;
  created_at: string;
  allocation_number?: string;
}

interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalValue: number;
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


export default function MyApplications() {
  const { user, userProfile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [allocations, setAllocations] = useState<Record<string, Allocation>>({});
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0, pending: 0, approved: 0, rejected: 0, totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'timeline'>('list');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  
  // Detail modal
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const { data: apps } = await supabase
        .from('applications')
        .select('status, quantity, proposed_price')
        .eq('user_id', user.id);

      if (apps) {
        const stats = apps.reduce((acc, app) => {
          acc.total++;
          acc.totalValue += (app.quantity || 0) * (app.proposed_price || 0);
          if (app.status === 'pending') acc.pending++;
          else if (app.status === 'approved' || app.status === 'allocated') acc.approved++;
          else if (app.status === 'rejected') acc.rejected++;
          return acc;
        }, { total: 0, pending: 0, approved: 0, rejected: 0, totalValue: 0 });
        
        setStats(stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchApplications = async (isRefresh = false) => {
    if (!user) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      let query = supabase
        .from('applications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`product_name.ilike.%${searchQuery}%,delivery_location.ilike.%${searchQuery}%`);
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

      // Fetch allocations for approved applications
      const approvedIds = (data || [])
        .filter(a => a.status === 'approved' || a.status === 'allocated')
        .map(a => a.id);

      if (approvedIds.length > 0) {
        const { data: allocationData } = await supabase
          .from('allocations')
          .select('*')
          .in('application_id', approvedIds);

        if (allocationData) {
          const allocMap: Record<string, Allocation> = {};
          allocationData.forEach(alloc => {
            allocMap[alloc.application_id] = alloc;
          });
          setAllocations(allocMap);
        }
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Set up real-time subscription with error handling
  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel('my-applications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'applications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            try {
              console.log('Application update:', payload);
              fetchApplications(true);
              fetchStats();
            } catch (e) {
              console.warn('Application update handler error:', e);
            }
          }
        )
        .subscribe((status: string, err?: Error) => {
          if (err) {
            console.warn('MyApplications subscription error:', err.message);
          }
        });
    } catch (e) {
      console.warn('MyApplications channel setup error:', e);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [user]);


  useEffect(() => {
    fetchStats();
    fetchApplications();
  }, [user, statusFilter, currentPage]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setCurrentPage(1);
      fetchApplications();
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { class: string; icon: any }> = {
      pending: { class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
      approved: { class: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      rejected: { class: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
      allocated: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Award }
    };
    return styles[status] || { class: 'bg-slate-500/20 text-slate-400', icon: Clock };
  };

  const getStatusProgress = (status: string) => {
    const progress: Record<string, number> = {
      pending: 25,
      approved: 75,
      allocated: 100,
      rejected: 0
    };
    return progress[status] || 0;
  };

  const generateReceipt = async (app: Application) => {
    setDownloadingReceipt(app.id);
    
    try {
      const allocation = allocations[app.id];
      const receiptData = {
        receiptNumber: `RCP-${app.id.slice(0, 8).toUpperCase()}`,
        date: new Date().toISOString(),
        applicant: userProfile?.full_name || 'Customer',
        email: userProfile?.email || '',
        company: userProfile?.company || '',
        product: app.product_name,
        productCode: app.product_code,
        quantity: app.quantity,
        unit: app.product_unit,
        unitPrice: app.proposed_price,
        subtotal: app.quantity * app.proposed_price,
        serviceFee: allocation?.service_fee || 0,
        total: allocation?.final_amount || app.quantity * app.proposed_price,

        deliveryLocation: app.delivery_location,
        deliveryDate: app.delivery_date,
        paymentMethod: PAYMENT_METHODS[app.payment_method] || app.payment_method,
        status: app.status,
        applicationDate: app.created_at,
        approvalDate: app.reviewed_at,
        allocationNumber: allocation?.allocation_number || `ALLOC-${app.id.slice(0, 8).toUpperCase()}`
      };

      // Generate HTML receipt
      const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Digiwell - Receipt ${receiptData.receiptNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #f5f5f5; }
    .receipt { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #D4AF37; }
    .logo-sub { font-size: 12px; color: #666; }
    .receipt-info { text-align: right; }
    .receipt-number { font-size: 18px; font-weight: bold; color: #333; }
    .receipt-date { color: #666; font-size: 14px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { }
    .info-label { font-size: 12px; color: #666; }
    .info-value { font-size: 14px; color: #333; font-weight: 500; }
    .product-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .product-table th { background: #f8f8f8; padding: 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase; }
    .product-table td { padding: 12px; border-bottom: 1px solid #eee; }
    .totals { margin-top: 20px; text-align: right; }
    .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 8px 0; }
    .total-label { color: #666; }
    .total-value { font-weight: 500; min-width: 100px; }
    .grand-total { font-size: 18px; font-weight: bold; color: #D4AF37; border-top: 2px solid #D4AF37; padding-top: 10px; margin-top: 10px; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .status-approved { background: #dcfce7; color: #16a34a; }
    .status-allocated { background: #dbeafe; color: #2563eb; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
    .allocation-badge { background: linear-gradient(135deg, #D4AF37, #B8941F); color: white; padding: 15px 25px; border-radius: 8px; text-align: center; margin-top: 20px; }
    .allocation-number { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
    .allocation-label { font-size: 11px; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <div class="logo">DIGIWELL</div>
        <div class="logo-sub">Energy and assets trading</div>
      </div>



      <div class="receipt-info">
        <div class="receipt-number">${receiptData.receiptNumber}</div>
        <div class="receipt-date">${new Date(receiptData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div style="margin-top: 10px;">
          <span class="status-badge status-${receiptData.status}">${receiptData.status}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Customer Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Name</div>
          <div class="info-value">${receiptData.applicant}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${receiptData.email}</div>
        </div>
        ${receiptData.company ? `
        <div class="info-item">
          <div class="info-label">Company</div>
          <div class="info-value">${receiptData.company}</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">Payment Method</div>
          <div class="info-value">${receiptData.paymentMethod}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Product Details</div>
      <table class="product-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Code</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${receiptData.product}</strong></td>
            <td>${receiptData.productCode}</td>
            <td>${receiptData.quantity.toLocaleString()} ${receiptData.unit}</td>
            <td>$${receiptData.unitPrice.toFixed(2)}</td>
            <td>$${receiptData.subtotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Subtotal:</span>
          <span class="total-value">$${receiptData.subtotal.toLocaleString()}</span>
        <div class="total-row">
          <span class="total-label">Service Fee:</span>
          <span class="total-value">$0.00 (No fees!)</span>
        </div>

        </div>
        <div class="total-row grand-total">
          <span class="total-label">Total Amount:</span>
          <span class="total-value">$${receiptData.total.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Delivery Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Delivery Location</div>
          <div class="info-value">${receiptData.deliveryLocation}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Preferred Delivery Date</div>
          <div class="info-value">${receiptData.deliveryDate ? new Date(receiptData.deliveryDate).toLocaleDateString() : 'To be confirmed'}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Application Timeline</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Application Submitted</div>
          <div class="info-value">${new Date(receiptData.applicationDate).toLocaleString()}</div>
        </div>
        ${receiptData.approvalDate ? `
        <div class="info-item">
          <div class="info-label">Approval Date</div>
          <div class="info-value">${new Date(receiptData.approvalDate).toLocaleString()}</div>
        </div>
        ` : ''}
      </div>
    </div>

    ${(receiptData.status === 'approved' || receiptData.status === 'allocated') ? `
    <div class="allocation-badge">
      <div class="allocation-label">ALLOCATION NUMBER</div>
      <div class="allocation-number">${receiptData.allocationNumber}</div>
    </div>
    ` : ''}

    <div class="footer">
      <p><strong>Digiwell Trading LLC</strong></p>
      <p>OPEC Certified • OilPrice.com Live Data Integration • Web3 Blockchain Payments</p>
      <p>This is an official receipt. Please retain for your records.</p>
      <p style="margin-top: 15px; font-size: 10px; color: #999;">
        Generated on ${new Date().toLocaleString()} | Document ID: ${receiptData.receiptNumber}
      </p>
    </div>
  </div>
</body>
</html>
      `;

      // Create blob and download
      const blob = new Blob([receiptHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Digiwell_Receipt_${receiptData.receiptNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error generating receipt:', err);
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const generateAllocationDocument = async (app: Application) => {
    setDownloadingReceipt(app.id);
    
    try {
      const allocation = allocations[app.id];
      const allocationNumber = allocation?.allocation_number || `ALLOC-${app.id.slice(0, 8).toUpperCase()}`;
      
      const docHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Digiwell - Allocation Certificate ${allocationNumber}</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #f5f5f5; }
    .certificate { background: white; padding: 50px; border: 3px double #D4AF37; position: relative; }
    .certificate::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 1px solid #D4AF37; pointer-events: none; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; font-weight: bold; color: #D4AF37; letter-spacing: 4px; }
    .subtitle { font-size: 14px; color: #666; margin-top: 5px; letter-spacing: 2px; }
    .title { font-size: 28px; font-weight: bold; color: #1a365d; margin: 30px 0; text-align: center; text-transform: uppercase; letter-spacing: 3px; }
    .allocation-number { font-size: 24px; font-weight: bold; color: #D4AF37; text-align: center; margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 8px; }
    .content { line-height: 1.8; font-size: 14px; margin: 30px 0; }
    .highlight { font-weight: bold; color: #1a365d; }
    .details-box { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-value { font-weight: bold; color: #1e293b; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; }
    .signature-box { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 10px; }
    .signature-title { font-size: 12px; color: #666; }
    .seal { width: 100px; height: 100px; border: 2px solid #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
    .seal-text { font-size: 10px; text-align: center; color: #D4AF37; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(212, 175, 55, 0.05); font-weight: bold; pointer-events: none; z-index: 0; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="watermark">DIGIWELL</div>
    
    <div class="header">
      <div class="logo">DIGIWELL</div>
      <div class="subtitle">PETROLEUM TRADING PLATFORM</div>
    </div>

    <div class="title">Certificate of Allocation</div>

    <div class="allocation-number">
      ${allocationNumber}
    </div>

    <div class="content">
      <p>This is to certify that <span class="highlight">${userProfile?.full_name || 'the applicant'}</span>
      ${userProfile?.company ? `representing <span class="highlight">${userProfile.company}</span>` : ''} 
      has been granted an official allocation for petroleum products as detailed below.</p>
    </div>

    <div class="details-box">
      <div class="detail-row">
        <span class="detail-label">Product</span>
        <span class="detail-value">${app.product_name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Product Code</span>
        <span class="detail-value">${app.product_code}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Allocated Quantity</span>
        <span class="detail-value">${app.quantity.toLocaleString()} ${app.product_unit}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Unit Price</span>
        <span class="detail-value">$${app.proposed_price.toFixed(2)} per ${app.product_unit}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total Value</span>
        <span class="detail-value">$${(app.quantity * app.proposed_price).toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Delivery Location</span>
        <span class="detail-value">${app.delivery_location}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Allocation Date</span>
        <span class="detail-value">${app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>

    <div class="content">
      <p>This allocation is subject to the terms and conditions of Digiwell Trading LLC and applicable 
      petroleum trading regulations. The holder of this certificate is entitled to receive the allocated 
      quantity upon completion of payment and fulfillment of all contractual obligations.</p>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">Authorized Signatory</div>
        <div class="signature-title">Digiwell Trading LLC</div>
      </div>
      <div class="seal">
        <div class="seal-text">OFFICIAL<br/>SEAL</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Date of Issue</div>
        <div class="signature-title">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Digiwell Trading LLC</strong> | OPEC Certified | OilPrice.com Live Data Integration</p>
      <p>This document is electronically generated and is valid without physical signature.</p>
      <p>Verification Code: ${app.id.toUpperCase()}</p>
    </div>
  </div>
</body>
</html>
      `;

      const blob = new Blob([docHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Digiwell_Allocation_${allocationNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error generating allocation document:', err);
    } finally {
      setDownloadingReceipt(null);
    }
  };

  if (!user) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Login Required</h3>
          <p className="text-slate-400">Please log in to view your applications.</p>
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
            My Applications
          </h2>
          <p className="text-slate-400 text-sm">Track and manage your petroleum product applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchApplications(true)}
            disabled={refreshing}
            variant="outline"
            className="border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
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
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Value</div>
                <div className="text-lg font-bold text-[#D4AF37]">${stats.totalValue.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by product or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                />
              </div>
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
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeView === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('list')}
                className={activeView === 'list' ? 'bg-[#D4AF37] text-slate-900' : 'border-white/20 text-white'}
              >
                <FileText className="w-4 h-4 mr-1" />
                List
              </Button>
              <Button
                variant={activeView === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('timeline')}
                className={activeView === 'timeline' ? 'bg-[#D4AF37] text-slate-900' : 'border-white/20 text-white'}
              >
                <History className="w-4 h-4 mr-1" />
                Timeline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List/Timeline */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white flex items-center justify-between">
            <span>Applications ({totalCount})</span>
            <div className="flex items-center gap-2 text-sm text-slate-400 font-normal">
              <Bell className="w-4 h-4" />
              Real-time updates enabled
            </div>
          </CardTitle>
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
              <p className="text-sm">Submit your first application to get started</p>
            </div>
          ) : activeView === 'list' ? (
            <div className="divide-y divide-white/10">
              {applications.map(app => {
                const statusInfo = getStatusBadge(app.status);
                const StatusIcon = statusInfo.icon;
                const totalValue = app.quantity * (app.proposed_price || 0);
                const hasAllocation = app.status === 'approved' || app.status === 'allocated';
                
                return (
                  <div key={app.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Main Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[#D4AF37] font-bold">{app.product_name}</span>
                          <Badge className={`${statusInfo.class} capitalize`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {app.status}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {app.quantity?.toLocaleString()} {app.product_unit}
                          </span>
                          <span className="text-green-400 font-medium">
                            ${totalValue.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {app.delivery_location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(app.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Application Progress</span>
                            <span>{getStatusProgress(app.status)}%</span>
                          </div>
                          <Progress value={getStatusProgress(app.status)} className="h-1.5" />
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => { setSelectedApplication(app); setShowDetailModal(true); }}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        {hasAllocation && (
                          <>
                            <Button
                              onClick={() => generateReceipt(app)}
                              disabled={downloadingReceipt === app.id}
                              variant="outline"
                              size="sm"
                              className="border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10"
                            >
                              {downloadingReceipt === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Receipt className="w-4 h-4 mr-1" />
                                  Receipt
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => generateAllocationDocument(app)}
                              disabled={downloadingReceipt === app.id}
                              variant="outline"
                              size="sm"
                              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                            >
                              {downloadingReceipt === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Award className="w-4 h-4 mr-1" />
                                  Allocation
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Timeline View
            <div className="p-6">
              <div className="relative">
                {applications.map((app, index) => {
                  const statusInfo = getStatusBadge(app.status);
                  const StatusIcon = statusInfo.icon;
                  const totalValue = app.quantity * (app.proposed_price || 0);
                  
                  return (
                    <div key={app.id} className="relative pl-8 pb-8 last:pb-0">
                      {/* Timeline line */}
                      {index < applications.length - 1 && (
                        <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-white/20" />
                      )}
                      
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${statusInfo.class.replace('text-', 'bg-').split(' ')[0]}`}>
                        <StatusIcon className="w-3 h-3" />
                      </div>
                      
                      {/* Content */}
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-[#D4AF37] font-bold">{app.product_name}</span>
                            <Badge className={`${statusInfo.class} capitalize ml-2`}>
                              {app.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(app.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="text-sm text-slate-400 mb-3">
                          {app.quantity?.toLocaleString()} {app.product_unit} • ${totalValue.toLocaleString()}
                        </div>
                        
                        {/* Status Timeline */}
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Submitted
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-500" />
                          <div className={`flex items-center gap-1 ${app.status !== 'pending' ? 'text-green-400' : 'text-slate-500'}`}>
                            {app.status !== 'pending' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            Review
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-500" />
                          <div className={`flex items-center gap-1 ${
                            app.status === 'approved' || app.status === 'allocated' 
                              ? 'text-green-400' 
                              : app.status === 'rejected' 
                              ? 'text-red-400' 
                              : 'text-slate-500'
                          }`}>
                            {app.status === 'approved' || app.status === 'allocated' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : app.status === 'rejected' ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {app.status === 'rejected' ? 'Rejected' : 'Approved'}
                          </div>
                          {(app.status === 'approved' || app.status === 'allocated') && (
                            <>
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                              <div className={`flex items-center gap-1 ${app.status === 'allocated' ? 'text-blue-400' : 'text-slate-500'}`}>
                                {app.status === 'allocated' ? <Award className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                Allocated
                              </div>
                            </>
                          )}
                        </div>
                        
                        {app.reviewed_at && (
                          <div className="mt-2 text-xs text-slate-500">
                            Reviewed on {new Date(app.reviewed_at).toLocaleString()}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            onClick={() => { setSelectedApplication(app); setShowDetailModal(true); }}
                            variant="ghost"
                            size="sm"
                            className="text-white/70 hover:text-white hover:bg-white/10 h-7 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                          {(app.status === 'approved' || app.status === 'allocated') && (
                            <Button
                              onClick={() => generateReceipt(app)}
                              variant="ghost"
                              size="sm"
                              className="text-[#00D4FF] hover:bg-[#00D4FF]/10 h-7 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              {/* Status & ID */}
              <div className="flex items-center justify-between">
                <Badge className={`${getStatusBadge(selectedApplication.status).class} capitalize text-sm px-3 py-1`}>
                  {selectedApplication.status}
                </Badge>
                <span className="text-slate-400 text-sm font-mono">
                  #{selectedApplication.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              
              {/* Progress */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white font-medium">Application Progress</span>
                  <span className="text-[#D4AF37]">{getStatusProgress(selectedApplication.status)}%</span>
                </div>
                <Progress value={getStatusProgress(selectedApplication.status)} className="h-2" />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Submitted</span>
                  <span>Review</span>
                  <span>Approved</span>
                  <span>Allocated</span>
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
              
              {/* Timeline Section */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <History className="w-4 h-4 text-[#D4AF37]" />
                  Application Timeline
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm">Application Submitted</div>
                      <div className="text-slate-500 text-xs">{new Date(selectedApplication.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  {selectedApplication.reviewed_at && (
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedApplication.status === 'rejected' 
                          ? 'bg-red-500/20' 
                          : 'bg-green-500/20'
                      }`}>
                        {selectedApplication.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-white text-sm">
                          Application {selectedApplication.status === 'rejected' ? 'Rejected' : 'Approved'}
                        </div>
                        <div className="text-slate-500 text-xs">{new Date(selectedApplication.reviewed_at).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                  
                  {selectedApplication.status === 'allocated' && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Award className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-white text-sm">Allocation Confirmed</div>
                        <div className="text-slate-500 text-xs">Product allocated and ready for delivery</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Notes */}
              {selectedApplication.notes && (
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-white font-medium">Your Notes</h4>
                  <p className="text-slate-300 text-sm">{selectedApplication.notes}</p>
                </div>
              )}
              
              {/* Allocation Info */}
              {allocations[selectedApplication.id] && (
                <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 rounded-lg p-4 border border-[#D4AF37]/30">
                  <h4 className="text-[#D4AF37] font-medium flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4" />
                    Allocation Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Allocation Number</div>
                      <div className="text-white font-mono">
                        {allocations[selectedApplication.id].allocation_number || `ALLOC-${selectedApplication.id.slice(0, 8).toUpperCase()}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Service Fee</div>
                      <div className="text-white">${allocations[selectedApplication.id].service_fee?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Final Amount</div>
                      <div className="text-green-400 font-bold">${allocations[selectedApplication.id].final_amount?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            {selectedApplication && (selectedApplication.status === 'approved' || selectedApplication.status === 'allocated') && (
              <>
                <Button
                  onClick={() => generateReceipt(selectedApplication)}
                  disabled={downloadingReceipt === selectedApplication.id}
                  className="bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-slate-900"
                >
                  {downloadingReceipt === selectedApplication.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Receipt className="w-4 h-4 mr-2" />
                  )}
                  Download Receipt
                </Button>
                <Button
                  onClick={() => generateAllocationDocument(selectedApplication)}
                  disabled={downloadingReceipt === selectedApplication.id}
                  className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-slate-900"
                >
                  {downloadingReceipt === selectedApplication.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Award className="w-4 h-4 mr-2" />
                  )}
                  Allocation Certificate
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
    </div>
  );
}
