import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Home,
  Package,
  Truck,
  FileText,
  Receipt,
  MapPin,
  RefreshCw,
  DollarSign,
  Headphones,
  User,
  Clock,
  Calendar,
  Download,
  Eye,
  Plus,
  Edit,
  Trash2,
  Star,
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  Phone,
  Mail,
  Building,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Fuel,
  Navigation,
  Camera,
  PenTool,
  Wallet,
  Shield,
  Zap,
  Printer,
  ExternalLink,
  Settings,
  Bell,
  Lock
} from 'lucide-react';

interface CustomerAccount {
  id: string;
  email: string;
  phone: string;
  company_name: string;
  contact_name: string;
  account_number: string;
  account_type: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  payment_terms: string;
  status: string;
}

interface Order {
  id: string;
  order_date: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  status: string;
  delivery_date?: string;
  estimated_delivery?: string;
  payment_status: string;
}

interface Delivery {
  id: string;
  order_id: string;
  tracking_code: string;
  product_name: string;
  quantity: number;
  unit: string;
  status: string;
  driver_name: string;
  driver_phone: string;
  vehicle_number: string;
  current_location: { lat: number; lng: number; address: string };
  destination: { address: string; lat: number; lng: number };
  estimated_arrival: string;
  last_updated: string;
  progress: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  issue_date: string;
  due_date: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  paid_date?: string;
  payment_method?: string;
  product_name?: string;
  quantity?: number;
  unit?: string;
}

interface PODReport {
  id: string;
  report_number: string;
  order_id: string;
  delivery_date: string;
  product_name: string;
  quantity_ordered: number;
  quantity_delivered: number;
  unit: string;
  receiver_name: string;
  has_signature: boolean;
  has_photos: boolean;
  photo_count: number;
  gps_coordinates: { lat: number; lng: number };
  status: string;
}

interface Address {
  id: string;
  label: string;
  address_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  contact_name?: string;
  contact_phone?: string;
  delivery_instructions?: string;
  access_code?: string;
  is_default: boolean;
}

interface RecurringOrder {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  frequency: string;
  next_delivery: string;
  delivery_address: string;
  status: string;
  total_deliveries: number;
  estimated_cost: number;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  order_id?: string;
  created_at: string;
  updated_at: string;
  satisfaction_rating?: number;
}

interface TicketReply {
  id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  created_at: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  payment_method: string;
  payment_gateway: string;
  transaction_id: string;
  amount: number;
  service_fee: number;
  total_amount: number;
  currency: string;
  status: string;
  receipt_number: string;
  payment_date: string;
}

interface AutoPaymentSetting {
  id: string;
  recurring_order_id: string;
  is_enabled: boolean;
  payment_method: string;
  payment_gateway: string;
  card_last_four: string;
  card_brand: string;
  card_expiry: string;
  max_amount: number;
  notification_email: boolean;
  notification_sms: boolean;
}

const statusColors: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800',
  in_transit: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-red-100 text-red-800',
  overdue: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800'
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const ticketCategories = [
  { value: 'order_issue', label: 'Order Issue' },
  { value: 'delivery_problem', label: 'Delivery Problem' },
  { value: 'billing_inquiry', label: 'Billing Inquiry' },
  { value: 'product_quality', label: 'Product Quality' },
  { value: 'account_help', label: 'Account Help' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'general_inquiry', label: 'General Inquiry' },
  { value: 'feedback', label: 'Feedback' }
];

export default function CustomerSelfServicePortal() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  
  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [pods, setPods] = useState<PODReport[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recurringOrders, setRecurringOrders] = useState<RecurringOrder[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [autoPaymentSettings, setAutoPaymentSettings] = useState<AutoPaymentSetting[]>([]);
  
  // Dashboard summary
  const [dashboardStats, setDashboardStats] = useState({
    total_orders: 0,
    active_deliveries: 0,
    pending_invoices: 0,
    open_tickets: 0,
    saved_addresses: 0,
    recurring_orders: 0,
    total_spent: 0,
    available_credit: 0,
    outstanding_balance: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Modal states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showTicketDetailModal, setShowTicketDetailModal] = useState(false);
  const [showDeliveryDetailModal, setShowDeliveryDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAutoPaymentModal, setShowAutoPaymentModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedRecurringOrder, setSelectedRecurringOrder] = useState<RecurringOrder | null>(null);
  const [ticketReplies, setTicketReplies] = useState<TicketReply[]>([]);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'flutterwave'>('stripe');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  
  // Form states
  const [addressForm, setAddressForm] = useState({
    label: '',
    address_type: 'delivery',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Nigeria',
    contact_name: '',
    contact_phone: '',
    delivery_instructions: '',
    access_code: '',
    is_default: false
  });
  
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general_inquiry',
    priority: 'medium',
    description: '',
    order_id: ''
  });
  
  const [autoPaymentForm, setAutoPaymentForm] = useState({
    payment_method: 'stripe',
    card_last_four: '',
    card_brand: 'Visa',
    card_expiry: '',
    max_amount: 50000,
    notification_email: true,
    notification_sms: false
  });
  
  const [newReply, setNewReply] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (user) {
      initializeCustomer();
    }
  }, [user]);

  const initializeCustomer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action: 'get_or_create_customer',
          email: user?.email,
          user_id: user?.id,
          company_name: userProfile?.company_name,
          contact_name: userProfile?.full_name,
          phone: userProfile?.phone
        }
      });

      if (error) throw error;
      setCustomer(data.customer);
      
      await loadDashboardData(data.customer.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize customer portal',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (customerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action: 'get_dashboard_summary',
          customer_id: customerId,
          customer_email: user?.email
        }
      });

      if (error) throw error;
      
      setDashboardStats(data.stats);
      setRecentActivity(data.recent_activity || []);
      
      await Promise.all([
        loadOrders(),
        loadDeliveries(),
        loadInvoices(),
        loadOutstandingInvoices(),
        loadPODs(),
        loadAddresses(customerId),
        loadRecurringOrders(),
        loadTickets(customerId),
        loadPaymentHistory(customerId),
        loadAutoPaymentSettings(customerId)
      ]);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_order_history', customer_email: user?.email }
      });
      if (!error) setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const loadDeliveries = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_active_deliveries', customer_email: user?.email }
      });
      if (!error) setDeliveries(data.deliveries || []);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_invoices', customer_email: user?.email }
      });
      if (!error) setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const loadOutstandingInvoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_outstanding_invoices', customer_email: user?.email }
      });
      if (!error) setOutstandingInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to load outstanding invoices:', error);
    }
  };

  const loadPODs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_customer_pods', customer_email: user?.email }
      });
      if (!error) setPods(data.pods || []);
    } catch (error) {
      console.error('Failed to load PODs:', error);
    }
  };

  const loadAddresses = async (customerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_addresses', customer_id: customerId }
      });
      if (!error) setAddresses(data.addresses || []);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const loadRecurringOrders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_recurring_orders', customer_email: user?.email }
      });
      if (!error) setRecurringOrders(data.recurring_orders || []);
    } catch (error) {
      console.error('Failed to load recurring orders:', error);
    }
  };

  const loadTickets = async (customerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_support_tickets', customer_id: customerId }
      });
      if (!error) setTickets(data.tickets || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  const loadPaymentHistory = async (customerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_payment_history', customer_id: customerId }
      });
      if (!error) setPayments(data.payments || []);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    }
  };

  const loadAutoPaymentSettings = async (customerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_auto_payment_settings', customer_id: customerId }
      });
      if (!error) setAutoPaymentSettings(data.settings || []);
    } catch (error) {
      console.error('Failed to load auto-payment settings:', error);
    }
  };

  const handleSaveAddress = async () => {
    if (!customer) return;
    
    try {
      const action = selectedAddress ? 'update_address' : 'add_address';
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action,
          customer_id: customer.id,
          address_id: selectedAddress?.id,
          ...addressForm
        }
      });

      if (error) throw error;

      toast({
        title: selectedAddress ? 'Address Updated' : 'Address Added',
        description: 'Your delivery address has been saved'
      });

      setShowAddressModal(false);
      resetAddressForm();
      loadAddresses(customer.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save address',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'delete_address', address_id: addressId }
      });

      if (error) throw error;

      toast({
        title: 'Address Deleted',
        description: 'The delivery address has been removed'
      });

      if (customer) loadAddresses(customer.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete address',
        variant: 'destructive'
      });
    }
  };

  const handleCreateTicket = async () => {
    if (!customer) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action: 'create_support_ticket',
          customer_id: customer.id,
          customer_email: user?.email,
          ...ticketForm
        }
      });

      if (error) throw error;

      toast({
        title: 'Ticket Created',
        description: `Your support ticket ${data.ticket.ticket_number} has been submitted`
      });

      setShowTicketModal(false);
      resetTicketForm();
      loadTickets(customer.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive'
      });
    }
  };

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_ticket_details', ticket_id: ticket.id }
      });

      if (!error) {
        setTicketReplies(data.replies || []);
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error);
    }
    
    setShowTicketDetailModal(true);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !newReply.trim() || !customer) return;
    
    try {
      const { error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action: 'add_ticket_reply',
          ticket_id: selectedTicket.id,
          customer_id: customer.id,
          customer_name: userProfile?.full_name || user?.email,
          message: newReply
        }
      });

      if (error) throw error;

      setNewReply('');
      handleViewTicket(selectedTicket);
      
      toast({
        title: 'Reply Sent',
        description: 'Your message has been added to the ticket'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reply',
        variant: 'destructive'
      });
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentStep('select');
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedInvoice || !customer) return;
    
    setProcessingPayment(true);
    setPaymentStep('processing');

    try {
      const action = paymentMethod === 'stripe' ? 'initiate_stripe_payment' : 'initiate_flutterwave_payment';
      
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action,
          customer_id: customer.id,
          invoice_id: selectedInvoice.id,
          invoice_number: selectedInvoice.invoice_number,
          amount: selectedInvoice.total,
          currency: selectedInvoice.currency,
          customer_email: user?.email,
          customer_name: userProfile?.full_name || customer.contact_name,
          redirect_url: window.location.href
        }
      });

      if (error) throw error;

      if (paymentMethod === 'flutterwave' && data.payment_link) {
        // Redirect to Flutterwave payment page
        window.open(data.payment_link, '_blank');
        
        // Simulate successful payment for demo
        setTimeout(async () => {
          await confirmPayment(data.tx_ref, data.service_fee, data.total_amount);
        }, 3000);
      } else if (paymentMethod === 'stripe') {
        // For Stripe, we'd normally use Stripe Elements
        // Simulating successful payment for demo
        setTimeout(async () => {
          await confirmPayment(data.payment_intent_id, data.service_fee, data.total_amount);
        }, 2000);
      }
    } catch (error: any) {
      setPaymentStep('error');
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment',
        variant: 'destructive'
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const confirmPayment = async (transactionId: string, serviceFee: number, totalAmount: number) => {
    if (!selectedInvoice || !customer) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action: 'confirm_payment',
          customer_id: customer.id,
          invoice_id: selectedInvoice.id,
          invoice_number: selectedInvoice.invoice_number,
          payment_method: paymentMethod,
          payment_gateway: paymentMethod,
          transaction_id: transactionId,
          amount: selectedInvoice.total,
          service_fee: serviceFee,
          total_amount: totalAmount,
          currency: selectedInvoice.currency,
          customer_email: user?.email,
          customer_name: userProfile?.full_name || customer.contact_name,
          company_name: customer.company_name
        }
      });

      if (error) throw error;

      setPaymentStep('success');
      
      toast({
        title: 'Payment Successful',
        description: `Receipt ${data.receipt_number} has been emailed to you`
      });

      // Reload data
      if (customer) {
        loadInvoices();
        loadOutstandingInvoices();
        loadPaymentHistory(customer.id);
      }
    } catch (error: any) {
      setPaymentStep('error');
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm payment',
        variant: 'destructive'
      });
    }
  };

  const handleViewReceipt = async (payment: Payment) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'get_receipt', receipt_number: payment.receipt_number }
      });

      if (error) throw error;
      
      setSelectedReceipt(data.receipt);
      setShowReceiptModal(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load receipt',
        variant: 'destructive'
      });
    }
  };

  const handleEmailReceipt = async (receiptNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action: 'email_receipt',
          receipt_number: receiptNumber,
          customer_email: user?.email,
          customer_name: userProfile?.full_name
        }
      });

      if (error) throw error;

      toast({
        title: 'Receipt Sent',
        description: 'The receipt has been emailed to you'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to email receipt',
        variant: 'destructive'
      });
    }
  };

  const handleSetupAutoPayment = async () => {
    if (!customer || !selectedRecurringOrder) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-self-service', {
        body: {
          action: 'setup_auto_payment',
          customer_id: customer.id,
          recurring_order_id: selectedRecurringOrder.id,
          payment_method: autoPaymentForm.payment_method,
          payment_gateway: autoPaymentForm.payment_method,
          card_last_four: autoPaymentForm.card_last_four,
          card_brand: autoPaymentForm.card_brand,
          card_expiry: autoPaymentForm.card_expiry,
          max_amount: autoPaymentForm.max_amount,
          notification_email: autoPaymentForm.notification_email,
          notification_sms: autoPaymentForm.notification_sms
        }
      });

      if (error) throw error;

      toast({
        title: 'Auto-Payment Enabled',
        description: 'Automatic payments have been set up for this recurring order'
      });

      setShowAutoPaymentModal(false);
      loadAutoPaymentSettings(customer.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to setup auto-payment',
        variant: 'destructive'
      });
    }
  };

  const handleToggleAutoPayment = async (settingId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('customer-self-service', {
        body: { action: 'toggle_auto_payment', setting_id: settingId, is_enabled: isEnabled }
      });

      if (error) throw error;

      toast({
        title: isEnabled ? 'Auto-Payment Enabled' : 'Auto-Payment Disabled',
        description: `Automatic payments have been ${isEnabled ? 'enabled' : 'disabled'}`
      });

      if (customer) loadAutoPaymentSettings(customer.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update auto-payment setting',
        variant: 'destructive'
      });
    }
  };

  const resetAddressForm = () => {
    setSelectedAddress(null);
    setAddressForm({
      label: '',
      address_type: 'delivery',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Nigeria',
      contact_name: '',
      contact_phone: '',
      delivery_instructions: '',
      access_code: '',
      is_default: false
    });
  };

  const resetTicketForm = () => {
    setTicketForm({
      subject: '',
      category: 'general_inquiry',
      priority: 'medium',
      description: '',
      order_id: ''
    });
  };

  const openEditAddress = (address: Address) => {
    setSelectedAddress(address);
    setAddressForm({
      label: address.label,
      address_type: address.address_type,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state || '',
      postal_code: address.postal_code || '',
      country: address.country,
      contact_name: address.contact_name || '',
      contact_phone: address.contact_phone || '',
      delivery_instructions: address.delivery_instructions || '',
      access_code: address.access_code || '',
      is_default: address.is_default
    });
    setShowAddressModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // 0% Service Fee - No fees on any transactions!
  const SERVICE_FEE_RATE = 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {userProfile?.full_name || 'Customer'}</h1>
            <p className="text-purple-100">
              Account: {customer?.account_number} | {customer?.company_name || user?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-purple-200">Outstanding Balance</p>
              <p className="text-xl font-bold">{formatCurrency(dashboardStats.outstanding_balance)}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setActiveTab('payments')}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 lg:grid-cols-9 gap-1 h-auto p-1 bg-gray-100">
          <TabsTrigger value="dashboard" className="flex items-center gap-1 text-xs py-2">
            <Home className="h-3 w-3" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1 text-xs py-2">
            <Package className="h-3 w-3" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-1 text-xs py-2">
            <Truck className="h-3 w-3" />
            <span className="hidden sm:inline">Deliveries</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1 text-xs py-2">
            <CreditCard className="h-3 w-3" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1 text-xs py-2">
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-1 text-xs py-2">
            <MapPin className="h-3 w-3" />
            <span className="hidden sm:inline">Addresses</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-1 text-xs py-2">
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Recurring</span>
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-1 text-xs py-2">
            <DollarSign className="h-3 w-3" />
            <span className="hidden sm:inline">Balance</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-1 text-xs py-2">
            <Headphones className="h-3 w-3" />
            <span className="hidden sm:inline">Support</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('orders')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-xl font-bold">{dashboardStats.total_orders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('deliveries')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Truck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Deliveries</p>
                    <p className="text-xl font-bold">{dashboardStats.active_deliveries}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('payments')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Invoices</p>
                    <p className="text-xl font-bold">{dashboardStats.pending_invoices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('support')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Open Tickets</p>
                    <p className="text-xl font-bold">{dashboardStats.open_tickets}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Outstanding Invoices */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-red-600" />
                  Outstanding Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {outstandingInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>All invoices are paid!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outstandingInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">
                            Due: {formatDate(invoice.due_date)} • {invoice.product_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(invoice.total, invoice.currency)}</p>
                            <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
                          </div>
                          <Button size="sm" onClick={() => handlePayInvoice(invoice)}>
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'delivery' ? 'bg-green-100' :
                        activity.type === 'order' ? 'bg-blue-100' :
                        'bg-purple-100'
                      }`}>
                        {activity.type === 'delivery' && <Truck className="h-4 w-4 text-green-600" />}
                        {activity.type === 'order' && <Package className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'payment' && <CreditCard className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Order History</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Order ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Quantity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{order.id}</td>
                        <td className="py-3 px-4">{order.product_name}</td>
                        <td className="py-3 px-4">{order.quantity.toLocaleString()} {order.unit}</td>
                        <td className="py-3 px-4">{formatCurrency(order.total_amount)}</td>
                        <td className="py-3 px-4">
                          <Badge className={statusColors[order.status]}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(order.order_date)}</td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Deliveries</CardTitle>
              <CardDescription>Track your in-progress deliveries in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Deliveries</h3>
                  <p className="text-gray-500">You don't have any deliveries in progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="p-6 border rounded-xl hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setShowDeliveryDetailModal(true);
                      }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{delivery.product_name}</h3>
                            <Badge className={statusColors[delivery.status]}>
                              {delivery.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-gray-500">
                            {delivery.quantity.toLocaleString()} {delivery.unit} • Tracking: {delivery.tracking_code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Estimated Arrival</p>
                          <p className="font-medium">{formatDateTime(delivery.estimated_arrival)}</p>
                        </div>
                      </div>

                      <Progress value={delivery.progress} className="h-3 mb-4" />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-2">
                          <Navigation className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Current Location</p>
                            <p className="font-medium">{delivery.current_location.address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Destination</p>
                            <p className="font-medium">{delivery.destination.address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <User className="h-5 w-5 text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Driver</p>
                            <p className="font-medium">{delivery.driver_name}</p>
                            <p className="text-sm text-gray-500">{delivery.driver_phone}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Outstanding Invoices */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-red-600" />
                  Outstanding Invoices
                </CardTitle>
                <CardDescription>Pay your pending invoices securely</CardDescription>
              </CardHeader>
              <CardContent>
                {outstandingInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500">You have no outstanding invoices</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {outstandingInvoices.map((invoice) => (
                      <div key={invoice.id} className="p-4 border rounded-lg">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{invoice.invoice_number}</span>
                              <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{invoice.product_name}</p>
                            <p className="text-sm text-gray-500">
                              {invoice.quantity?.toLocaleString()} {invoice.unit} • Due: {formatDate(invoice.due_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Amount Due</p>
                              <p className="text-xl font-bold text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</p>
                              <p className="text-xs text-gray-400">+ {formatCurrency(invoice.total * SERVICE_FEE_RATE, invoice.currency)} fee</p>
                            </div>
                            <Button onClick={() => handlePayInvoice(invoice)} className="bg-green-600 hover:bg-green-700">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Stripe</p>
                      <p className="text-sm text-gray-500">Credit/Debit Cards</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Visa, Mastercard, American Express</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Zap className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Flutterwave</p>
                      <p className="text-sm text-gray-500">Multiple Options</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Cards, Bank Transfer, Mobile Money, USSD</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Service Fee: <span className="font-semibold">0.87%</span></p>
                  <p className="text-xs text-gray-400">Applied to all transactions</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No payment history yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Receipt #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Method</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Fee</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Total</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{formatDate(payment.payment_date)}</td>
                          <td className="py-3 px-4 font-mono text-sm">{payment.receipt_number}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {payment.payment_gateway === 'stripe' ? (
                                <CreditCard className="h-4 w-4 text-purple-600" />
                              ) : (
                                <Zap className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="capitalize">{payment.payment_gateway}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{formatCurrency(payment.amount, payment.currency)}</td>
                          <td className="py-3 px-4 text-gray-500">{formatCurrency(payment.service_fee, payment.currency)}</td>
                          <td className="py-3 px-4 font-semibold">{formatCurrency(payment.total_amount, payment.currency)}</td>
                          <td className="py-3 px-4">
                            <Badge className={statusColors[payment.status]}>{payment.status}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleViewReceipt(payment)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEmailReceipt(payment.receipt_number)}>
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(invoice.issue_date)} • {formatCurrency(invoice.total)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[invoice.status]}>
                          {invoice.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* POD Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Proof of Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pods.map((pod) => (
                    <div key={pod.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{pod.report_number}</p>
                        <p className="text-sm text-gray-500">
                          {pod.product_name} • {formatDate(pod.delivery_date)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {pod.has_signature && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <PenTool className="h-3 w-3" /> Signed
                            </span>
                          )}
                          {pod.has_photos && (
                            <span className="flex items-center gap-1 text-xs text-blue-600">
                              <Camera className="h-3 w-3" /> {pod.photo_count} photos
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Delivery Addresses</CardTitle>
                <Button onClick={() => { resetAddressForm(); setShowAddressModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Addresses</h3>
                  <p className="text-gray-500 mb-4">Add your delivery addresses for faster checkout</p>
                  <Button onClick={() => setShowAddressModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Address
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="p-4 border rounded-lg relative">
                      {address.is_default && (
                        <Badge className="absolute top-2 right-2 bg-green-100 text-green-800">
                          Default
                        </Badge>
                      )}
                      <h4 className="font-medium mb-2">{address.label}</h4>
                      <p className="text-gray-600 text-sm">
                        {address.address_line1}
                        {address.address_line2 && <>, {address.address_line2}</>}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {address.city}, {address.state} {address.postal_code}
                      </p>
                      <p className="text-gray-600 text-sm">{address.country}</p>
                      {address.contact_phone && (
                        <p className="text-gray-500 text-sm mt-2">
                          <Phone className="h-3 w-3 inline mr-1" />
                          {address.contact_phone}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" onClick={() => openEditAddress(address)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring Orders Tab */}
        <TabsContent value="recurring" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Orders</CardTitle>
              <CardDescription>Manage your automated delivery schedules and auto-payments</CardDescription>
            </CardHeader>
            <CardContent>
              {recurringOrders.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recurring Orders</h3>
                  <p className="text-gray-500">Set up automated deliveries for your regular needs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recurringOrders.map((order) => {
                    const autoPayment = autoPaymentSettings.find(s => s.recurring_order_id === order.id);
                    return (
                      <div key={order.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{order.product_name}</h4>
                            <p className="text-sm text-gray-500">
                              {order.quantity.toLocaleString()} {order.unit} • {order.frequency}
                            </p>
                          </div>
                          <Badge className={statusColors[order.status]}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-500">Next Delivery</p>
                            <p className="font-medium">{formatDate(order.next_delivery)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Delivery Address</p>
                            <p className="font-medium truncate">{order.delivery_address}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Deliveries</p>
                            <p className="font-medium">{order.total_deliveries}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Est. Cost</p>
                            <p className="font-medium">{formatCurrency(order.estimated_cost)}</p>
                          </div>
                        </div>
                        
                        {/* Auto-Payment Section */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-orange-500" />
                              <span className="font-medium text-sm">Auto-Payment</span>
                            </div>
                            {autoPayment ? (
                              <div className="flex items-center gap-3">
                                <div className="text-sm text-gray-600">
                                  {autoPayment.card_brand} •••• {autoPayment.card_last_four}
                                </div>
                                <Switch
                                  checked={autoPayment.is_enabled}
                                  onCheckedChange={(checked) => handleToggleAutoPayment(autoPayment.id, checked)}
                                />
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRecurringOrder(order);
                                  setShowAutoPaymentModal(true);
                                }}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Setup
                              </Button>
                            )}
                          </div>
                          {autoPayment && (
                            <p className="text-xs text-gray-500 mt-2">
                              Max amount: {formatCurrency(autoPayment.max_amount)} • 
                              Notifications: {autoPayment.notification_email ? 'Email' : ''} {autoPayment.notification_sms ? 'SMS' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Tab */}
        <TabsContent value="balance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Account Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white">
                  <p className="text-sm opacity-80">Available Credit</p>
                  <p className="text-3xl font-bold">{formatCurrency(customer?.available_credit || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Credit Limit</p>
                    <p className="font-bold">{formatCurrency(customer?.credit_limit || 0)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className="font-bold">{formatCurrency(customer?.current_balance || 0)}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Payment Terms</p>
                  <p className="font-medium">{customer?.payment_terms?.replace('_', ' ').toUpperCase() || 'Net 30'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No recent transactions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${txn.amount < 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            {txn.amount < 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{txn.description}</p>
                            <p className="text-sm text-gray-500">{formatDateTime(txn.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${txn.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                          </p>
                          <p className="text-sm text-gray-500">Balance: {formatCurrency(txn.balance_after)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Support Tickets</CardTitle>
                <Button onClick={() => setShowTicketModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-12">
                  <Headphones className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Support Tickets</h3>
                  <p className="text-gray-500 mb-4">Need help? Create a support ticket</p>
                  <Button onClick={() => setShowTicketModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewTicket(ticket)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{ticket.ticket_number}</span>
                            <Badge className={statusColors[ticket.status]}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={priorityColors[ticket.priority]}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{ticket.subject}</h4>
                          <p className="text-sm text-gray-500">
                            {ticket.category.replace('_', ' ')} • Created {formatDate(ticket.created_at)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number} - {formatCurrency(selectedInvoice?.total || 0, selectedInvoice?.currency)}
            </DialogDescription>
          </DialogHeader>
          
          {paymentStep === 'select' && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Invoice Amount</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice?.total || 0, selectedInvoice?.currency)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Service Fee (0%)</span>
                  <span className="font-medium text-green-600">FREE</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total to Pay</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedInvoice?.total || 0, selectedInvoice?.currency)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Select Payment Method</Label>
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'stripe' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setPaymentMethod('stripe')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Stripe</p>
                      <p className="text-sm text-gray-500">Credit/Debit Card</p>
                    </div>
                    {paymentMethod === 'stripe' && <CheckCircle className="h-5 w-5 text-purple-600" />}
                  </div>
                </div>
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'flutterwave' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setPaymentMethod('flutterwave')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Zap className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Flutterwave</p>
                      <p className="text-sm text-gray-500">Cards, Bank Transfer, Mobile Money</p>
                    </div>
                    {paymentMethod === 'flutterwave' && <CheckCircle className="h-5 w-5 text-orange-600" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Lock className="h-4 w-4" />
                <span>Your payment is secured with 256-bit SSL encryption</span>
              </div>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Processing Payment</h3>
              <p className="text-gray-500">Please wait while we process your payment...</p>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Payment Successful!</h3>
              <p className="text-gray-500 mb-4">Your payment has been processed successfully.</p>
              <p className="text-sm text-gray-400">A receipt has been emailed to {user?.email}</p>
            </div>
          )}

          {paymentStep === 'error' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Payment Failed</h3>
              <p className="text-gray-500 mb-4">There was an error processing your payment.</p>
              <Button onClick={() => setPaymentStep('select')}>Try Again</Button>
            </div>
          )}

          {paymentStep === 'select' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button onClick={processPayment} disabled={processingPayment}>
                {processingPayment ? 'Processing...' : `Pay ${formatCurrency((selectedInvoice?.total || 0) * (1 + SERVICE_FEE_RATE), selectedInvoice?.currency)}`}
              </Button>
            </DialogFooter>
          )}

          {(paymentStep === 'success' || paymentStep === 'error') && (
            <DialogFooter>
              <Button onClick={() => setShowPaymentModal(false)}>Close</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="py-4">
              <div dangerouslySetInnerHTML={{ __html: selectedReceipt.receipt_html }} />
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => handleEmailReceipt(selectedReceipt.receipt_number)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auto-Payment Setup Modal */}
      <Dialog open={showAutoPaymentModal} onOpenChange={setShowAutoPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Auto-Payment</DialogTitle>
            <DialogDescription>
              Configure automatic payments for {selectedRecurringOrder?.product_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={autoPaymentForm.payment_method}
                onValueChange={(value) => setAutoPaymentForm({ ...autoPaymentForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe (Credit/Debit Card)</SelectItem>
                  <SelectItem value="flutterwave">Flutterwave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Card Last 4 Digits</Label>
                <Input
                  value={autoPaymentForm.card_last_four}
                  onChange={(e) => setAutoPaymentForm({ ...autoPaymentForm, card_last_four: e.target.value.slice(0, 4) })}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Card Expiry</Label>
                <Input
                  value={autoPaymentForm.card_expiry}
                  onChange={(e) => setAutoPaymentForm({ ...autoPaymentForm, card_expiry: e.target.value })}
                  placeholder="MM/YY"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Card Brand</Label>
              <Select
                value={autoPaymentForm.card_brand}
                onValueChange={(value) => setAutoPaymentForm({ ...autoPaymentForm, card_brand: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visa">Visa</SelectItem>
                  <SelectItem value="Mastercard">Mastercard</SelectItem>
                  <SelectItem value="Amex">American Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maximum Payment Amount</Label>
              <Input
                type="number"
                value={autoPaymentForm.max_amount}
                onChange={(e) => setAutoPaymentForm({ ...autoPaymentForm, max_amount: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">Payments exceeding this amount will require manual approval</p>
            </div>
            <div className="space-y-3">
              <Label>Notifications</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email notifications</span>
                <Switch
                  checked={autoPaymentForm.notification_email}
                  onCheckedChange={(checked) => setAutoPaymentForm({ ...autoPaymentForm, notification_email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">SMS notifications</span>
                <Switch
                  checked={autoPaymentForm.notification_sms}
                  onCheckedChange={(checked) => setAutoPaymentForm({ ...autoPaymentForm, notification_sms: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetupAutoPayment}>
              Enable Auto-Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Modal */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription>
              {selectedAddress ? 'Update your delivery address details' : 'Add a new delivery address to your account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  placeholder="e.g., Main Office"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={addressForm.address_type}
                  onValueChange={(value) => setAddressForm({ ...addressForm, address_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address Line 1 *</Label>
              <Input
                value={addressForm.address_line1}
                onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={addressForm.address_line2}
                onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                placeholder="Apartment, suite, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input
                  value={addressForm.postal_code}
                  onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                  placeholder="Postal code"
                />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={addressForm.contact_name}
                  onChange={(e) => setAddressForm({ ...addressForm, contact_name: e.target.value })}
                  placeholder="Contact person"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={addressForm.contact_phone}
                  onChange={(e) => setAddressForm({ ...addressForm, contact_phone: e.target.value })}
                  placeholder="+234..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Delivery Instructions</Label>
              <Textarea
                value={addressForm.delivery_instructions}
                onChange={(e) => setAddressForm({ ...addressForm, delivery_instructions: e.target.value })}
                placeholder="Special delivery instructions..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Set as default address</Label>
              <Switch
                checked={addressForm.is_default}
                onCheckedChange={(checked) => setAddressForm({ ...addressForm, is_default: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddress}>
              {selectedAddress ? 'Update Address' : 'Add Address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Ticket Modal */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and our team will get back to you shortly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                placeholder="Brief description of your issue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Related Order ID (Optional)</Label>
              <Input
                value={ticketForm.order_id}
                onChange={(e) => setTicketForm({ ...ticketForm, order_id: e.target.value })}
                placeholder="e.g., ORD-2026-0117-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Please describe your issue in detail..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={!ticketForm.subject || !ticketForm.description}>
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Modal */}
      <Dialog open={showTicketDetailModal} onOpenChange={setShowTicketDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTicket?.ticket_number}
              <Badge className={statusColors[selectedTicket?.status || 'open']}>
                {selectedTicket?.status?.replace('_', ' ')}
              </Badge>
            </DialogTitle>
            <DialogDescription>{selectedTicket?.subject}</DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                  <span>{ticketCategories.find(c => c.value === selectedTicket.category)?.label}</span>
                  <span>•</span>
                  <Badge className={priorityColors[selectedTicket.priority]}>
                    {selectedTicket.priority}
                  </Badge>
                  <span>•</span>
                  <span>Created {formatDateTime(selectedTicket.created_at)}</span>
                </div>
                <p className="text-gray-700">{selectedTicket.description}</p>
              </div>

              {/* Replies */}
              <div className="space-y-3">
                <h4 className="font-medium">Conversation</h4>
                {ticketReplies.length === 0 ? (
                  <p className="text-gray-500 text-sm">No replies yet</p>
                ) : (
                  ticketReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-lg ${
                        reply.sender_type === 'customer'
                          ? 'bg-blue-50 ml-8'
                          : 'bg-gray-50 mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{reply.sender_name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{reply.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Input */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <div className="space-y-2">
                  <Label>Add Reply</Label>
                  <Textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                  />
                  <Button onClick={handleSendReply} disabled={!newReply.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Detail Modal */}
      <Dialog open={showDeliveryDetailModal} onOpenChange={setShowDeliveryDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDelivery.product_name}</h3>
                  <p className="text-gray-500">
                    {selectedDelivery.quantity.toLocaleString()} {selectedDelivery.unit}
                  </p>
                </div>
                <Badge className={statusColors[selectedDelivery.status]}>
                  {selectedDelivery.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 h-48 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Navigation className="h-12 w-12 mx-auto mb-2" />
                  <p>Live Map View</p>
                  <p className="text-sm">Driver location updates every 30 seconds</p>
                </div>
              </div>

              <Progress value={selectedDelivery.progress} className="h-3" />
              <p className="text-center text-sm text-gray-500">
                {selectedDelivery.progress}% complete
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Tracking Code</p>
                  <p className="font-medium">{selectedDelivery.tracking_code}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Vehicle</p>
                  <p className="font-medium">{selectedDelivery.vehicle_number}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Driver</p>
                  <p className="font-medium">{selectedDelivery.driver_name}</p>
                  <p className="text-sm text-gray-500">{selectedDelivery.driver_phone}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">ETA</p>
                  <p className="font-medium">{formatDateTime(selectedDelivery.estimated_arrival)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Driver
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
