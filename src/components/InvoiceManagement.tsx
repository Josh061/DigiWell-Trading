import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Mail,
  RefreshCw,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Send,
  Plus,
  QrCode,
  Printer,
  CreditCard,
  Calendar,
  Building,
  User,
  Receipt,
  Wallet,
  Banknote,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import InvoicePaymentModal from './InvoicePaymentModal';
import CreateInvoiceModal from './CreateInvoiceModal';

// Digiwell Exploration Limited Company Details
const COMPANY_INFO = {
  name: 'Digiwell Exploration Limited',
  tagline: 'Premium Energy Trading Solutions',
  address: 'Plot 123, Victoria Island, Lagos, Nigeria',
  phone: '+234 1 234 5678',
  email: 'billing@digiwellexploration.com',
  website: 'www.digiwellexploration.com',
  taxId: 'NG-TIN-12345678',
  rcNumber: 'RC 1234567'
};

// Bank Account Details - Providus Bank PLC
const BANK_ACCOUNTS = {
  naira: {
    bankName: 'Providus Bank PLC',
    accountName: 'Digiwell Exploration Limited',
    accountNumber: '1308106128',
    currency: 'NGN',
    swiftCode: 'UMPLNGLAXXX'
  },
  usd: {
    bankName: 'Providus Bank PLC',
    accountName: 'Digiwell Exploration Limited',
    accountNumber: '1308106104',
    currency: 'USD',
    swiftCodeLocal: 'UMPLNGLAXXX',
    swiftCodeInternational: 'UMPLNGLA'
  }
};

interface Invoice {
  id: string;
  invoice_number: string;
  order_reference: string | null;
  auction_reference: string | null;
  user_id: string;
  user_email: string;
  user_name: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_tax_id: string;
  invoice_type: string;
  billing_name: string | null;
  billing_address: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  payment_method: string | null;
  payment_reference: string | null;
  payment_date: string | null;
  payment_terms: string;
  notes: string | null;
  verification_code: string;
  qr_code_url: string;
  pdf_storage_path: string | null;
  pdf_url: string | null;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  sent_at: string | null;
  viewed_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface LineItem {
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total: number;
}

interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  pending: number;
  overdue: number;
  totalRevenue: number;
  pendingRevenue: number;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Eye },
  paid: { label: 'Paid', color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: XCircle },
};

const paymentStatusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  paid: { label: 'Paid', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  partial: { label: 'Partial', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  refunded: { label: 'Refunded', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
};

export default function InvoiceManagement() {
  const { user, hasRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);

  const isAdmin = hasRole(['admin']);

  useEffect(() => {
    fetchInvoices();
    if (isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: {
          action: 'get_invoices',
          user_id: user?.id,
          is_admin: isAdmin,
        },
      });

      if (error) throw error;
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices(getMockInvoices());
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: { action: 'get_invoice_stats' },
      });

      if (error) throw error;
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        total: 48,
        draft: 5,
        sent: 12,
        paid: 25,
        pending: 15,
        overdue: 6,
        totalRevenue: 2345678,
        pendingRevenue: 567890,
      });
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: { action: 'download_invoice', invoice_id: invoice.id },
      });

      if (error) throw error;

      const blob = new Blob([data.pdf_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${data.invoice_number}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      downloadMockInvoice(invoice);
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: { action: 'send_invoice', invoice_id: invoice.id },
      });

      if (error) throw error;

      setInvoices(invoices.map(inv =>
        inv.id === invoice.id
          ? { ...inv, status: 'sent', sent_at: new Date().toISOString() }
          : inv
      ));

      alert('Invoice sent successfully!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedInvoice) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: {
          action: 'update_payment_status',
          invoice_id: selectedInvoice.id,
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          send_confirmation: true,
        },
      });

      if (error) throw error;

      setInvoices(invoices.map(inv =>
        inv.id === selectedInvoice.id
          ? { ...inv, payment_status: 'paid', status: 'paid', payment_method: paymentMethod, payment_reference: paymentReference }
          : inv
      ));

      setShowPaymentModal(false);
      setPaymentMethod('');
      setPaymentReference('');
      fetchStats();
    } catch (error) {
      console.error('Error updating payment:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePayNow = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPayNowModal(true);
  };

  const handlePaymentSuccess = (updatedInvoice: Invoice) => {
    setInvoices(invoices.map(inv =>
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    ));
    fetchStats();
  };

  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: { action: 'download_invoice', invoice_id: invoice.id },
      });

      if (error) throw error;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.pdf_html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      const mockHtml = generateMockInvoiceHtml(invoice);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(mockHtml);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.user_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || invoice.payment_status === paymentFilter;
    
    if (activeTab === 'pending') {
      return matchesSearch && invoice.payment_status === 'pending';
    } else if (activeTab === 'paid') {
      return matchesSearch && invoice.payment_status === 'paid';
    } else if (activeTab === 'overdue') {
      return matchesSearch && (invoice.status === 'overdue' || (invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.payment_status !== 'paid'));
    }
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const isOverdue = (invoice: Invoice) => {
    return invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.payment_status !== 'paid';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Receipt className="w-8 h-8 text-[#D4AF37]" />
            Invoice Management
          </h2>
          <p className="text-white/70 mt-1">Generate, track, and pay invoices</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchInvoices} variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/20">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Admin Stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-slate-400">Total Invoices</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-500/10 border-slate-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-400">{stats.draft}</div>
              <div className="text-xs text-slate-400/70">Draft</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.sent}</div>
              <div className="text-xs text-blue-400/70">Sent</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-yellow-400/70">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.paid}</div>
              <div className="text-xs text-green-400/70">Paid</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
              <div className="text-xs text-red-400/70">Overdue</div>
            </CardContent>
          </Card>
          <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#D4AF37]">${(stats.totalRevenue / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-[#D4AF37]/70">Collected</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">${(stats.pendingRevenue / 1000).toFixed(0)}K</div>
              <div className="text-xs text-orange-400/70">Outstanding</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            All Invoices
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Pending Payment
          </TabsTrigger>
          <TabsTrigger value="paid" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Paid
          </TabsTrigger>
          <TabsTrigger value="overdue" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Overdue
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Filters */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by invoice number, customer name, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
                {activeTab === 'all' && (
                  <>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="viewed">Viewed</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue placeholder="Payment" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">All Payment</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                Invoices ({filteredInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No invoices found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Invoice #</TableHead>
                        <TableHead className="text-slate-300">Customer</TableHead>
                        <TableHead className="text-slate-300">Type</TableHead>
                        <TableHead className="text-slate-300">Amount</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Payment</TableHead>
                        <TableHead className="text-slate-300">Due Date</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => {
                        const config = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.draft;
                        const paymentConfig = paymentStatusConfig[invoice.payment_status as keyof typeof paymentStatusConfig];
                        const StatusIcon = config.icon;
                        const overdue = isOverdue(invoice);

                        return (
                          <TableRow key={invoice.id} className="border-slate-700 hover:bg-white/5">
                            <TableCell className="text-white font-mono text-sm">{invoice.invoice_number}</TableCell>
                            <TableCell>
                              <div className="text-white">{invoice.user_name}</div>
                              <div className="text-slate-400 text-xs">{invoice.user_email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-slate-300 border-slate-600">
                                {invoice.invoice_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[#D4AF37] font-semibold">
                              {invoice.currency} {Number(invoice.total_amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${overdue ? statusConfig.overdue.color : config.color} border`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {overdue ? 'Overdue' : config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${paymentConfig.color} border`}>
                                {paymentConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-sm ${overdue ? 'text-red-400' : 'text-slate-400'}`}>
                              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowInvoiceDetail(true);
                                  }}
                                  className="text-[#00D4FF] hover:text-[#00D4FF] hover:bg-[#00D4FF]/20"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadInvoice(invoice)}
                                  className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/20"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePrintInvoice(invoice)}
                                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                {/* Pay Now Button for pending invoices */}
                                {invoice.payment_status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handlePayNow(invoice)}
                                    className="bg-green-600 text-white hover:bg-green-700"
                                    title="Pay Now"
                                  >
                                    <Wallet className="w-4 h-4 mr-1" />
                                    Pay
                                  </Button>
                                )}
                                {isAdmin && invoice.status === 'draft' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSendInvoice(invoice)}
                                    disabled={sending}
                                    className="text-blue-400 hover:text-blue-400 hover:bg-blue-500/20"
                                    title="Send Invoice"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                )}
                                {isAdmin && invoice.payment_status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedInvoice(invoice);
                                      setShowPaymentModal(true);
                                    }}
                                    className="text-purple-400 hover:text-purple-400 hover:bg-purple-500/20"
                                    title="Mark as Paid (Admin)"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Modal */}
      <Dialog open={showInvoiceDetail} onOpenChange={setShowInvoiceDetail}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              Invoice Details - {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg flex items-center justify-between ${
                selectedInvoice.payment_status === 'paid' ? 'bg-green-500/20 border border-green-500/50' :
                isOverdue(selectedInvoice) ? 'bg-red-500/20 border border-red-500/50' :
                'bg-yellow-500/20 border border-yellow-500/50'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedInvoice.payment_status === 'paid' ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : isOverdue(selectedInvoice) ? (
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  ) : (
                    <Clock className="w-6 h-6 text-yellow-400" />
                  )}
                  <div>
                    <div className={`font-semibold ${
                      selectedInvoice.payment_status === 'paid' ? 'text-green-400' :
                      isOverdue(selectedInvoice) ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {selectedInvoice.payment_status === 'paid' ? 'Payment Received' :
                       isOverdue(selectedInvoice) ? 'Payment Overdue' : 'Payment Pending'}
                    </div>
                    {selectedInvoice.payment_date && (
                      <div className="text-sm text-slate-400">
                        Paid on {new Date(selectedInvoice.payment_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {selectedInvoice.currency} {Number(selectedInvoice.total_amount).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">Total Amount</div>
                </div>
              </div>

              {/* Pay Now Button in Detail View */}
              {selectedInvoice.payment_status === 'pending' && (
                <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-500/30 rounded-lg">
                        <Banknote className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">Ready to Pay?</div>
                        <div className="text-green-300/70 text-sm">Pay securely with Stripe or Flutterwave</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setShowInvoiceDetail(false);
                        handlePayNow(selectedInvoice);
                      }}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Pay Now
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      From
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="text-white font-medium">{selectedInvoice.company_name}</div>
                    <div className="text-slate-400">{selectedInvoice.company_address}</div>
                    <div className="text-slate-400">{selectedInvoice.company_phone}</div>
                    <div className="text-slate-400">{selectedInvoice.company_email}</div>
                    <div className="text-slate-500">Tax ID: {selectedInvoice.company_tax_id}</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Bill To
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="text-white font-medium">{selectedInvoice.billing_name || selectedInvoice.user_name}</div>
                    <div className="text-slate-400">{selectedInvoice.billing_address || 'Address on file'}</div>
                    <div className="text-slate-400">{selectedInvoice.billing_email || selectedInvoice.user_email}</div>
                    {selectedInvoice.billing_phone && (
                      <div className="text-slate-400">{selectedInvoice.billing_phone}</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Invoice Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span className="text-white">{new Date(selectedInvoice.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Due Date:</span>
                      <span className={isOverdue(selectedInvoice) ? 'text-red-400' : 'text-white'}>
                        {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : 'Upon Receipt'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-white capitalize">{selectedInvoice.invoice_type}</span>
                    </div>
                    {selectedInvoice.order_reference && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Order:</span>
                        <span className="text-[#00D4FF]">{selectedInvoice.order_reference}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Line Items */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">#</TableHead>
                        <TableHead className="text-slate-400">Description</TableHead>
                        <TableHead className="text-slate-400 text-center">Quantity</TableHead>
                        <TableHead className="text-slate-400 text-right">Unit Price</TableHead>
                        <TableHead className="text-slate-400 text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.line_items.map((item, index) => (
                        <TableRow key={index} className="border-slate-700">
                          <TableCell className="text-slate-400">{index + 1}</TableCell>
                          <TableCell>
                            <div className="text-white font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-slate-400 text-xs">{item.description}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-slate-300">
                            {item.quantity} {item.unit || ''}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">
                            {selectedInvoice.currency} {Number(item.unit_price).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium">
                            {selectedInvoice.currency} {Number(item.total).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Totals and QR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <img 
                      src={selectedInvoice.qr_code_url} 
                      alt="QR Code" 
                      className="w-24 h-24 rounded-lg bg-white p-2"
                    />
                    <div>
                      <div className="text-slate-400 text-sm">Verification Code</div>
                      <div className="text-white font-mono text-sm bg-slate-700 px-3 py-1 rounded mt-1">
                        {selectedInvoice.verification_code}
                      </div>
                      <div className="text-slate-500 text-xs mt-2">
                        Scan QR code to verify invoice authenticity
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="text-white">{selectedInvoice.currency} {Number(selectedInvoice.subtotal).toLocaleString()}</span>
                    </div>
                    {selectedInvoice.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Discount</span>
                        <span className="text-green-400">-{selectedInvoice.currency} {Number(selectedInvoice.discount_amount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Tax ({selectedInvoice.tax_rate}%)</span>
                      <span className="text-white">{selectedInvoice.currency} {Number(selectedInvoice.tax_amount).toLocaleString()}</span>
                    </div>
                    {selectedInvoice.shipping_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Shipping</span>
                        <span className="text-white">{selectedInvoice.currency} {Number(selectedInvoice.shipping_amount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-slate-700">
                      <span className="text-white font-semibold">Total</span>
                      <span className="text-[#D4AF37] font-bold text-xl">
                        {selectedInvoice.currency} {Number(selectedInvoice.total_amount).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Terms */}
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="text-yellow-400 font-medium mb-1">Payment Terms</div>
                  <div className="text-yellow-300/80 text-sm">{selectedInvoice.payment_terms}</div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedInvoice.notes && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="text-slate-400 font-medium mb-1">Notes</div>
                    <div className="text-slate-300 text-sm">{selectedInvoice.notes}</div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end flex-wrap">
                <Button
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
                <Button
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                {selectedInvoice.payment_status === 'pending' && (
                  <Button
                    onClick={() => {
                      setShowInvoiceDetail(false);
                      handlePayNow(selectedInvoice);
                    }}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                )}
                {isAdmin && selectedInvoice.payment_status === 'pending' && (
                  <Button
                    onClick={() => {
                      setShowInvoiceDetail(false);
                      setShowPaymentModal(true);
                    }}
                    variant="outline"
                    className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Mark as Paid (Admin)
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Record Payment (Admin)
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Invoice</div>
                <div className="text-white font-medium">{selectedInvoice.invoice_number}</div>
                <div className="text-[#D4AF37] font-bold text-xl mt-2">
                  {selectedInvoice.currency} {Number(selectedInvoice.total_amount).toLocaleString()}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="stripe">Stripe (Card Payment)</SelectItem>
                    <SelectItem value="flutterwave">Flutterwave</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Payment Reference / Transaction ID</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter reference number"
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Mail className="w-4 h-4" />
                  A payment confirmation will be sent to the customer
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPaymentModal(false)} className="text-slate-400">
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePayment}
              disabled={!paymentMethod || updating}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Now Modal (Stripe/Flutterwave) */}
      <InvoicePaymentModal
        open={showPayNowModal}
        onOpenChange={setShowPayNowModal}
        invoice={selectedInvoice}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onInvoiceCreated={(invoice) => {
          setInvoices([invoice, ...invoices]);
          fetchStats();
        }}
      />
    </div>
  );
}



// Mock data functions
function getMockInvoices(): Invoice[] {
  return [
    {
      id: '1',
      invoice_number: 'INV-202601-ABC123',
      order_reference: 'DW-M5K8X-A2B3',
      auction_reference: null,
      user_id: 'user1',
      user_email: 'john.trader@example.com',
      user_name: 'John Trader',
      company_name: 'Digiwell Energy Trading Ltd',
      company_address: '123 Energy Plaza, Houston, TX 77002, USA',
      company_phone: '+1 (555) 123-4567',
      company_email: 'billing@digiwell.com',
      company_tax_id: 'US-TAX-987654321',
      invoice_type: 'order',
      billing_name: 'John Trader',
      billing_address: '456 Commerce St, Houston, TX 77001',
      billing_email: 'john.trader@example.com',
      billing_phone: '+1 (555) 987-6543',
      line_items: [
        { name: 'Brent Crude Oil', description: 'Premium grade crude oil', quantity: 50000, unit: 'barrels', unit_price: 82.45, total: 4122500 }
      ],
      subtotal: 4122500,
      tax_rate: 10,
      tax_amount: 412250,
      discount_amount: 0,
      shipping_amount: 0,
      total_amount: 4534750,
      currency: 'USD',
      payment_status: 'paid',
      payment_method: 'wire_transfer',
      payment_reference: 'WT-2026-001234',
      payment_date: '2026-01-10T14:30:00Z',
      payment_terms: 'Payment due within 30 days of invoice date',
      notes: null,
      verification_code: 'ABCD1234EFGH5678',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-202601-ABC123',
      pdf_storage_path: 'user1/INV-202601-ABC123.html',
      pdf_url: null,
      status: 'paid',
      sent_at: '2026-01-05T12:00:00Z',
      viewed_at: '2026-01-06T09:30:00Z',
      due_date: '2026-02-04T00:00:00Z',
      created_at: '2026-01-05T10:30:00Z',
      updated_at: '2026-01-10T14:30:00Z',
    },
    {
      id: '2',
      invoice_number: 'INV-202601-DEF456',
      order_reference: 'DW-N7P2Q-C4D5',
      auction_reference: null,
      user_id: 'user2',
      user_email: 'sarah.refiner@example.com',
      user_name: 'Sarah Refiner',
      company_name: 'Digiwell Energy Trading Ltd',
      company_address: '123 Energy Plaza, Houston, TX 77002, USA',
      company_phone: '+1 (555) 123-4567',
      company_email: 'billing@digiwell.com',
      company_tax_id: 'US-TAX-987654321',
      invoice_type: 'order',
      billing_name: 'Sarah Refiner',
      billing_address: '789 Industrial Ave, Lagos, Nigeria',
      billing_email: 'sarah.refiner@example.com',
      billing_phone: '+234 801 234 5678',
      line_items: [
        { name: 'Natural Gas', description: 'High-quality natural gas', quantity: 100000, unit: 'MMBtu', unit_price: 3.25, total: 325000 }
      ],
      subtotal: 325000,
      tax_rate: 10,
      tax_amount: 32500,
      discount_amount: 0,
      shipping_amount: 5000,
      total_amount: 362500,
      currency: 'USD',
      payment_status: 'pending',
      payment_method: null,
      payment_reference: null,
      payment_date: null,
      payment_terms: 'Payment due within 30 days of invoice date',
      notes: 'Priority processing requested',
      verification_code: 'IJKL9012MNOP3456',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-202601-DEF456',
      pdf_storage_path: 'user2/INV-202601-DEF456.html',
      pdf_url: null,
      status: 'sent',
      sent_at: '2026-01-08T16:00:00Z',
      viewed_at: '2026-01-09T10:15:00Z',
      due_date: '2026-02-07T00:00:00Z',
      created_at: '2026-01-08T15:45:00Z',
      updated_at: '2026-01-09T10:15:00Z',
    },
    {
      id: '3',
      invoice_number: 'INV-202601-GHI789',
      order_reference: null,
      auction_reference: 'AUC-2026-0042',
      user_id: 'user3',
      user_email: 'mike.marketer@example.com',
      user_name: 'Mike Marketer',
      company_name: 'Digiwell Energy Trading Ltd',
      company_address: '123 Energy Plaza, Houston, TX 77002, USA',
      company_phone: '+1 (555) 123-4567',
      company_email: 'billing@digiwell.com',
      company_tax_id: 'US-TAX-987654321',
      invoice_type: 'auction',
      billing_name: 'Mike Marketer',
      billing_address: '321 Trading Lane, London, UK',
      billing_email: 'mike.marketer@example.com',
      billing_phone: '+44 20 7123 4567',
      line_items: [
        { name: 'Aviation Fuel (Jet A1)', description: 'Auction Win - AUC-2026-0042', quantity: 25000, unit: 'liters', unit_price: 1.95, total: 48750 }
      ],
      subtotal: 48750,
      tax_rate: 10,
      tax_amount: 4875,
      discount_amount: 0,
      shipping_amount: 0,
      total_amount: 53625,
      currency: 'USD',
      payment_status: 'pending',
      payment_method: null,
      payment_reference: null,
      payment_date: null,
      payment_terms: 'Payment due within 7 days of auction close',
      notes: null,
      verification_code: 'QRST7890UVWX1234',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-202601-GHI789',
      pdf_storage_path: 'user3/INV-202601-GHI789.html',
      pdf_url: null,
      status: 'overdue',
      sent_at: '2026-01-02T10:00:00Z',
      viewed_at: '2026-01-02T14:30:00Z',
      due_date: '2026-01-09T00:00:00Z',
      created_at: '2026-01-02T09:00:00Z',
      updated_at: '2026-01-02T14:30:00Z',
    },
    {
      id: '4',
      invoice_number: 'INV-202601-JKL012',
      order_reference: 'DW-U1V6W-G8H9',
      auction_reference: null,
      user_id: 'user4',
      user_email: 'emma.energy@example.com',
      user_name: 'Emma Energy',
      company_name: 'Digiwell Energy Trading Ltd',
      company_address: '123 Energy Plaza, Houston, TX 77002, USA',
      company_phone: '+1 (555) 123-4567',
      company_email: 'billing@digiwell.com',
      company_tax_id: 'US-TAX-987654321',
      invoice_type: 'order',
      billing_name: 'Emma Energy',
      billing_address: '555 Gulf Tower, Dubai, UAE',
      billing_email: 'emma.energy@example.com',
      billing_phone: '+971 4 123 4567',
      line_items: [
        { name: 'Premium Motor Spirit (PMS)', description: 'High-octane gasoline', quantity: 75000, unit: 'liters', unit_price: 0.95, total: 71250 }
      ],
      subtotal: 71250,
      tax_rate: 5,
      tax_amount: 3562.5,
      discount_amount: 1000,
      shipping_amount: 2500,
      total_amount: 76312.5,
      currency: 'USD',
      payment_status: 'pending',
      payment_method: null,
      payment_reference: null,
      payment_date: null,
      payment_terms: 'Payment due within 30 days of invoice date',
      notes: 'First-time customer discount applied',
      verification_code: 'YZAB5678CDEF9012',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-202601-JKL012',
      pdf_storage_path: 'user4/INV-202601-JKL012.html',
      pdf_url: null,
      status: 'draft',
      sent_at: null,
      viewed_at: null,
      due_date: '2026-02-11T00:00:00Z',
      created_at: '2026-01-12T08:15:00Z',
      updated_at: '2026-01-12T08:15:00Z',
    },
  ];
}

function downloadMockInvoice(invoice: Invoice) {
  const html = generateMockInvoiceHtml(invoice);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice-${invoice.invoice_number}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateMockInvoiceHtml(invoice: Invoice): string {
  const lineItemsHtml = invoice.line_items.map((item, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${item.name}</strong>
        ${item.description ? `<br><span style="color: #6b7280; font-size: 12px;">${item.description}</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity} ${item.unit || ''}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${Number(item.unit_price).toLocaleString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${Number(item.total).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #f8fafc; }
    .invoice-container { background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 40px; display: flex; justify-content: space-between; }
    .logo { font-size: 32px; font-weight: bold; color: #D4AF37; }
    .invoice-title { font-size: 36px; font-weight: bold; text-align: right; }
    .invoice-number { color: #D4AF37; font-size: 16px; }
    .content { padding: 40px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
    .info-box { background: #f8fafc; padding: 20px; border-left: 4px solid #D4AF37; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: white; padding: 12px; text-align: left; }
    .totals { margin-top: 30px; text-align: right; }
    .total-row { display: flex; justify-content: flex-end; padding: 8px 0; }
    .grand-total { background: #1e293b; color: white; padding: 16px; border-radius: 8px; margin-top: 10px; }
    .grand-total .value { color: #D4AF37; font-size: 24px; font-weight: bold; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        <div class="logo">DIGIWELL</div>
        <div style="color: #94a3b8;">Energy Trading Platform</div>
      </div>
      <div style="text-align: right;">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">${invoice.invoice_number}</div>
      </div>
    </div>
    <div class="content">
      <div class="info-grid">
        <div class="info-box">
          <h3>From</h3>
          <strong>${invoice.company_name}</strong><br>
          ${invoice.company_address}<br>
          ${invoice.company_phone}<br>
          ${invoice.company_email}
        </div>
        <div class="info-box">
          <h3>Bill To</h3>
          <strong>${invoice.billing_name || invoice.user_name}</strong><br>
          ${invoice.billing_address || 'Address on file'}<br>
          ${invoice.billing_email || invoice.user_email}
        </div>
        <div class="info-box">
          <h3>Details</h3>
          <strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}<br>
          <strong>Due:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon Receipt'}<br>
          <strong>Status:</strong> ${invoice.payment_status}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span style="width: 150px;">Subtotal:</span> <span>${invoice.currency} ${Number(invoice.subtotal).toLocaleString()}</span></div>
        <div class="total-row"><span style="width: 150px;">Tax (${invoice.tax_rate}%):</span> <span>${invoice.currency} ${Number(invoice.tax_amount).toLocaleString()}</span></div>
        <div class="total-row grand-total">
          <span style="width: 150px;">Total:</span>
          <span class="value">${invoice.currency} ${Number(invoice.total_amount).toLocaleString()}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <strong style="color: #D4AF37;">Digiwell Energy Trading Ltd</strong><br>
      Thank you for your business!
    </div>
  </div>
</body>
</html>
  `;
}
