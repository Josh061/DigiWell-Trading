import { useState, useEffect, useRef, TouchEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

import { useLanguage } from '@/contexts/LanguageContext';
import { products } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import MarketTicker from '@/components/MarketTicker';
import CommodityPriceTicker from '@/components/CommodityPriceTicker';
import DigitalWallet from '@/components/DigitalWallet';
import ApplicationModal from '@/components/ApplicationModal';
import GPSTracker from '@/components/GPSTracker';
import AdminDashboard from '@/components/AdminDashboard';
import AdminApplicationsPanel from '@/components/AdminApplicationsPanel';
import AdminSettingsPanel from '@/components/AdminSettingsPanel';
import AdminOrdersDashboard from '@/components/AdminOrdersDashboard';
import OrderTrackingPage from '@/components/OrderTrackingPage';
import MyApplications from '@/components/MyApplications';
import AIPricePrediction from '@/components/AIPricePrediction';
import PriceSyncDashboard from '@/components/PriceSyncDashboard';
import AdminDisputePanel from '@/components/AdminDisputePanel';
import InvestorRelations from '@/components/InvestorRelations';
import BlogAdmin from '@/components/BlogAdmin';
import TermsOfService from '@/components/TermsOfService';
import CronJobMonitor from '@/components/CronJobMonitor';


import MarketIntelligence from '@/components/MarketIntelligence';
import EscrowDashboard from '@/components/EscrowDashboard';
import TokenMarketplace from '@/components/TokenMarketplace';
import KYCVerification from '@/components/KYCVerification';
import KYCAdminPanel from '@/components/KYCAdminPanel';
import Login from '@/components/Login';
import Signup from '@/components/Signup';
import UserProfile from '@/components/UserProfile';
import { RoleManagement } from '@/components/RoleManagement';
import { AuditLogs } from '@/components/AuditLogs';
import CommodityPrices from '@/components/CommodityPrices';
import CommodityWidgets from '@/components/CommodityWidgets';
import LivePricesDashboard from '@/components/LivePricesDashboard';
import PriceAlertsDashboard from '@/components/PriceAlertsDashboard';
import PortfolioTracker from '@/components/PortfolioTracker';
import TradingHistory from '@/components/TradingHistory';
import BidAuction from '@/components/BidAuction';
import PilotDashboard from '@/components/PilotDashboard';
import AuctionAnalytics from '@/components/AuctionAnalytics';
import OrderManagement from '@/components/OrderManagement';
import InvoiceManagement from '@/components/InvoiceManagement';
import DisputeResolution from '@/components/DisputeResolution';
import ShippingLogistics from '@/components/ShippingLogistics';
import AdvancedAnalyticsDashboard from '@/components/AdvancedAnalyticsDashboard';
import SupportChat from '@/components/SupportChat';
import ShipmentMap from '@/components/ShipmentMap';
import MobileNavigation from '@/components/MobileNavigation';
import MobileDashboard from '@/components/MobileDashboard';
import ChatWidget from '@/components/ChatWidget';
import LiveChatWidget from '@/components/LiveChatWidget';
import LiveChatAgentDashboard from '@/components/LiveChatAgentDashboard';
import EmailPreferences from '@/components/EmailPreferences';
import TeamPhotoManager from '@/components/TeamPhotoManager';

import PrivacyPolicy from '@/components/PrivacyPolicy';
import AMLCompliance from '@/components/AMLCompliance';
import P2PTokenMarketplace from '@/components/P2PTokenMarketplace';
import AboutUs from '@/components/AboutUs';
import FAQHelpCenter from '@/components/FAQHelpCenter';
import NewsBlog from '@/components/NewsBlog';
import ContractTemplates from '@/components/ContractTemplates';
import BiometricAuth from '@/components/BiometricAuth';
import OfflineIndicator from '@/components/OfflineIndicator';
import DocumentVault from '@/components/DocumentVault';
import DeliveryTracker from '@/components/DeliveryTracker';
import DeliveryScheduling from '@/components/DeliveryScheduling';
import RecurringDeliveries from '@/components/RecurringDeliveries';
import RouteOptimization from '@/components/RouteOptimization';
import DriverMobileInterface from '@/components/DriverMobileInterface';
import CustomerTrackingPortal from '@/components/CustomerTrackingPortal';
import PODReportingSystem from '@/components/PODReportingSystem';
import CustomerSelfServicePortal from '@/components/CustomerSelfServicePortal';
import FleetTrackingMap from '@/components/FleetTrackingMap';
import PaymentHistory from '@/components/PaymentHistory';
import LanguageSelector from '@/components/LanguageSelector';
import SessionManagement from '@/components/SessionManagement';
import TwoFactorTestGuide from '@/components/TwoFactorTestGuide';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import SecuritySettings from '@/components/SecuritySettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePushNotifications } from '@/lib/pushNotifications';
import ReferralProgram from '@/components/ReferralProgram';
import AdminPriceManagement from '@/components/AdminPriceManagement';
import SPAWizard from '@/components/SPAWizard';
import BulkOrderProcessor from '@/components/BulkOrderProcessor';
import BulkOrderManagement from '@/components/BulkOrderManagement';
import ApplicationIdSearch from '@/components/ApplicationIdSearch';
import ServiceFeeAnalytics from '@/components/ServiceFeeAnalytics';
import RefineryDatabase from '@/components/RefineryDatabase';
import MulticurrencyEscrow from '@/components/MulticurrencyEscrow';
import DigiCoinRewards from '@/components/DigiCoinRewards';
import InventoryManagement from '@/components/InventoryManagement';
import PriceAlertManager from '@/components/PriceAlertManager';
import SmartAlertsHub from '@/components/SmartAlertsHub';
import GlobalTrackingMap from '@/components/GlobalTrackingMap';
import JetA1SAFLanding from '@/components/JetA1SAFLanding';


import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { 
  Wallet, MapPin, Bell, Coins, BarChart3, Shield, 
  Users, FileText, History, User, Settings, LogOut,
  Fuel, Droplets, Building, Gavel, Truck, PieChart, Package, Receipt, Scale, Ship,
  Headphones, Globe, TrendingUp, BellRing, X, ChevronLeft, ChevronRight, Gift, ArrowUpDown, Info, HelpCircle, Newspaper, Fingerprint, FolderLock, Compass, CalendarClock, RefreshCw, Route, Navigation, Eye, FileCheck, UserCircle, Radio, ClipboardList, FolderOpen, CreditCard, DollarSign, Activity, Monitor, Key, LayoutGrid, Pen, Upload, Brain, Mail, MessageCircle, Camera, Crown, Briefcase, Timer, Lock, Gem, Plane, Search, Plus, ArrowRightLeft, ArrowDown
} from 'lucide-react';






export default function AppLayout() {
  const { user, userProfile, loading, signOut, hasRole } = useAuth();
  const { t, isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const pushNotifications = usePushNotifications();

  const [showWallet, setShowWallet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showTracker, setShowTracker] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const tabs = [
    { id: 'products', label: 'Products', icon: Fuel, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
    { id: 'my-applications', label: 'My Apps', icon: FolderOpen, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'order-tracking', label: 'My Orders', icon: Package, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
    { id: 'live-prices', label: 'Live Prices', icon: Activity, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency'] },
    { id: 'commodities', label: 'Prices', icon: BarChart3, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency'] },
    { id: 'widgets', label: 'Widgets', icon: LayoutGrid, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency'] },
    { id: 'investor-relations', label: 'Investors', icon: Briefcase, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
    { id: 'invoices', label: 'Invoices', icon: Receipt, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'shipping', label: 'Shipping', icon: Ship, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'pilot'] },
    { id: 'delivery-tracker', label: 'Track', icon: Compass, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'pilot'] },
    { id: 'delivery-scheduling', label: 'Schedule', icon: CalendarClock, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'pilot'] },
    { id: 'recurring-deliveries', label: 'Recurring', icon: RefreshCw, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'route-optimization', label: 'Routes', icon: Route, roles: ['admin', 'trader', 'refiner', 'marketer', 'pilot'] },
    { id: 'fleet-tracking', label: 'Fleet', icon: Radio, roles: ['admin', 'marketer'] },
    { id: 'driver-interface', label: 'Driver', icon: Navigation, roles: ['admin', 'pilot'] },
    { id: 'customer-tracking', label: 'Customer Portal', icon: Eye, roles: ['admin', 'trader', 'refiner', 'marketer'] },
    { id: 'pod-reports', label: 'POD Reports', icon: FileCheck, roles: ['admin', 'trader', 'refiner', 'marketer', 'pilot'] },
    { id: 'self-service', label: 'My Account', icon: UserCircle, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'shipment-map', label: 'Map', icon: Globe, roles: ['admin', 'trader', 'refiner', 'marketer', 'pilot'] },
    { id: 'disputes', label: 'Disputes', icon: Scale, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'support', label: 'Support', icon: Headphones, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency'] },
    { id: 'auctions', label: 'Auctions', icon: Gavel, roles: ['admin', 'trader', 'refiner', 'marketer'] },
    { id: 'auction-analytics', label: 'Analytics', icon: PieChart, roles: ['admin', 'trader', 'refiner', 'marketer'] },
    { id: 'reports', label: 'Reports', icon: TrendingUp, roles: ['admin'] },
    { id: 'alerts', label: 'Alerts', icon: Bell, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'portfolio', label: 'Portfolio', icon: Coins, roles: ['admin', 'trader', 'refiner', 'marketer'] },
    { id: 'history', label: 'History', icon: History, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'pilot-dashboard', label: 'Deliveries', icon: Truck, roles: ['admin', 'pilot'] },
    { id: 'profile', label: 'Profile', icon: User, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
    { id: 'security', label: 'Security', icon: Shield, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
    { id: 'kyc', label: 'KYC', icon: Shield, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency'] },
    { id: 'tokenization', label: 'Tokens', icon: Coins, roles: ['admin', 'trader'] },
    { id: 'p2p-trading', label: 'P2P Trade', icon: ArrowUpDown, roles: ['admin', 'trader'] },
    { id: 'escrow', label: 'Escrow', icon: FileText, roles: ['admin', 'trader'] },
    { id: 'market', label: 'Intel', icon: BarChart3, roles: ['admin', 'trader', 'marketer'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['admin'] },
    { id: 'admin-orders', label: 'Orders Mgmt', icon: Receipt, roles: ['admin'] },
    { id: 'price-management', label: 'Prices', icon: DollarSign, roles: ['admin'] },
    { id: 'price-sync', label: 'Price Sync', icon: RefreshCw, roles: ['admin'] },
    { id: 'admin-disputes', label: 'Adj. Disputes', icon: Scale, roles: ['admin'] },
    { id: 'blog-admin', label: 'Blog Admin', icon: Pen, roles: ['admin'] },
    { id: 'cron-monitor', label: 'Cron Jobs', icon: Timer, roles: ['admin'] },
    { id: 'applications-admin', label: 'Applications', icon: ClipboardList, roles: ['admin'] },
    { id: 'payment-history', label: 'Payments', icon: CreditCard, roles: ['admin'] },
    { id: 'kyc-admin', label: 'KYC Admin', icon: Shield, roles: ['admin', 'government_agency'] },
    { id: 'role-management', label: 'Roles', icon: Users, roles: ['admin'] },
    { id: 'audit-logs', label: 'Audit', icon: FileText, roles: ['admin'] },
    { id: 'admin-settings', label: 'Settings', icon: Key, roles: ['admin'] },
    { id: 'ai-predictions', label: 'AI Predict', icon: Brain, roles: ['admin', 'trader', 'marketer'] },
    { id: 'team-photos', label: 'Team Photos', icon: Camera, roles: ['admin'] },
    { id: 'email-preferences', label: 'Email Prefs', icon: Mail, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
    { id: 'live-chat-agent', label: 'Chat Agent', icon: MessageCircle, roles: ['admin'] },
    { id: 'app-id-search', label: 'App ID Search', icon: Monitor, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
    { id: 'bulk-orders', label: 'Bulk Orders', icon: Crown, roles: ['admin'] },
    { id: 'fee-analytics', label: 'Fee Analytics', icon: DollarSign, roles: ['admin'] },
    { id: 'refinery-db', label: 'Refineries', icon: Building, roles: ['admin', 'trader', 'refiner', 'marketer'] },
    { id: 'multi-escrow', label: 'Multi Escrow', icon: Lock, roles: ['admin', 'trader'] },
    { id: 'digicoin-rewards', label: 'DigiCoin', icon: Gift, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['admin'] },
    { id: 'smart-alerts', label: 'Smart Alerts', icon: BellRing, roles: ['admin', 'trader', 'user', 'refiner', 'marketer'] },
    { id: 'global-map', label: 'Global Map', icon: Globe, roles: ['admin', 'trader', 'refiner', 'marketer', 'pilot'] },
    { id: 'jet-a1', label: 'Jet A1 / SAF', icon: Plane, roles: ['admin', 'trader', 'user', 'refiner', 'marketer', 'government_agency', 'pilot'] },
  ];










  const visibleTabs = tabs.filter(tab => hasRole(tab.roles as any));


  // Check notification permission on mount
  useEffect(() => {
    if (pushNotifications.isSupported) {
      setNotificationPermission(pushNotifications.permissionStatus);
      if (pushNotifications.permissionStatus === 'default') {
        setShowNotificationBanner(true);
      }
    }
  }, []);

  // Subscribe to push notifications when user logs in
  useEffect(() => {
    if (user && notificationPermission === 'granted') {
      pushNotifications.subscribe(user.id);
    }
  }, [user, notificationPermission]);

  // Handle swipe gestures
  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
      
      if (isLeftSwipe && currentIndex < visibleTabs.length - 1) {
        setSwipeDirection('left');
        setActiveTab(visibleTabs[currentIndex + 1].id);
      } else if (isRightSwipe && currentIndex > 0) {
        setSwipeDirection('right');
        setActiveTab(visibleTabs[currentIndex - 1].id);
      }
      
      setTimeout(() => setSwipeDirection(null), 300);
    }
  };

  const requestNotificationPermission = async () => {
    const permission = await pushNotifications.requestPermission();
    setNotificationPermission(permission);
    setShowNotificationBanner(false);
    
    if (permission === 'granted' && user) {
      await pushNotifications.subscribe(user.id);
      pushNotifications.showNotification('Notifications Enabled', {
        body: 'You will now receive price alerts and order updates',
        icon: '/icons/digiwell-icon.png'
      });
    }
  };



  const handleApplicationSubmit = (data: any) => {
    alert(`Application submitted for ${data.product.name}!\nTotal: $${data.total.toLocaleString()}`);
    setSelectedProduct(null);
    
    // Show push notification
    if (notificationPermission === 'granted') {
      pushNotifications.showNotification('Order Submitted', {
        body: `Your order for ${data.product.name} has been submitted successfully`,
        tag: 'order-submitted'
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-400',
      trader: 'bg-blue-500/20 text-blue-400',
      refiner: 'bg-purple-500/20 text-purple-400',
      marketer: 'bg-green-500/20 text-green-400',
      government_agency: 'bg-yellow-500/20 text-yellow-400',
      pilot: 'bg-cyan-500/20 text-cyan-400',
      user: 'bg-slate-500/20 text-slate-400'
    };
    return colors[role] || colors.user;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0F2952] flex items-center justify-center">

        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-semibold">Loading Digiwell...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0F2952] flex items-center justify-center p-6">

        {/* Animated background orbs */}
        <div className="auth-grid-bg" />
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-orb auth-bg-orb-3" />
        <div className="auth-page-wrapper">
        {authView === 'login' ? (
          <Login onSwitchToSignup={() => setAuthView('signup')} />
        ) : (
          <Signup onSwitchToLogin={() => setAuthView('login')} />
        )}
        </div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0F2952]">

        
        {/* Push Notification Banner */}
        {showNotificationBanner && (
          <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 px-4 py-3 z-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5" />
              <span className="text-sm font-medium">Enable notifications for price alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={requestNotificationPermission}
                className="bg-slate-900 text-white hover:bg-slate-800 h-7 text-xs"
              >
                Enable
              </Button>
              <button onClick={() => setShowNotificationBanner(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className={`sticky ${showNotificationBanner ? 'top-12' : 'top-0'} z-40 glass-header`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-lg font-bold text-[#D4AF37]">Digiwell</h1>
              <p className="text-white/60 text-[10px]">Energy and assets trading</p>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSelector variant="mobile" />
              {userProfile && (
                <Badge className={`${getRoleBadgeColor(userProfile.role)} text-xs`}>
                  {userProfile.role.replace('_', ' ')}
                </Badge>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={signOut}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Swipe indicator */}
          {activeTab !== 'mobile-dashboard' && (
            <div className="flex items-center justify-between px-4 pb-2">
              <button 
                onClick={() => {
                  const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
                  if (currentIndex > 0) setActiveTab(visibleTabs[currentIndex - 1].id);
                }}
                className="text-white/50 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white/80 text-sm font-medium">
                {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
              </span>
              <button 
                onClick={() => {
                  const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
                  if (currentIndex < visibleTabs.length - 1) setActiveTab(visibleTabs[currentIndex + 1].id);
                }}
                className="text-white/50 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>


        {/* Mobile Content with Swipe */}
        <div 
          ref={contentRef}
          className={`px-4 py-4 transition-transform duration-300 ${
            swipeDirection === 'left' ? '-translate-x-4 opacity-80' : 
            swipeDirection === 'right' ? 'translate-x-4 opacity-80' : ''
          }`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {activeTab === 'mobile-dashboard' && (
            <MobileDashboard 
              onNavigate={setActiveTab} 
              onOpenWallet={() => setShowWallet(true)} 
            />
          )}
          
          {activeTab === 'products' && (
            <div className="space-y-4 pb-36">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">Products</h2>
                <p className="text-white/60 text-sm">Swipe left/right to navigate</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} onApply={setSelectedProduct} />
                ))}
              </div>
            </div>
          )}
          {activeTab === 'live-prices' && (
            <div className="pb-36">
              <LivePricesDashboard />
            </div>
          )}
          
          {activeTab === 'commodities' && (
            <div className="pb-36">
              <CommodityPrices />
            </div>
          )}

          
          {activeTab === 'orders' && (
            <div className="pb-36">
              <OrderManagement />
            </div>
          )}
          
          {activeTab === 'invoices' && (
            <div className="pb-36">
              <InvoiceManagement />
            </div>
          )}
          
          {activeTab === 'shipping' && (
            <div className="pb-36">
              <ShippingLogistics />
            </div>
          )}
          
          {activeTab === 'delivery-tracker' && (
            <div className="pb-36">
              <DeliveryTracker />
            </div>
          )}
          
          {activeTab === 'shipment-map' && (
            <div className="pb-36">
              <ShipmentMap />
            </div>
          )}

          
          {activeTab === 'disputes' && (
            <div className="pb-36">
              <DisputeResolution />
            </div>
          )}
          
          {activeTab === 'support' && (
            <div className="pb-36">
              <SupportChat />
            </div>
          )}
          
          {activeTab === 'auctions' && (
            <div className="pb-36">
              <BidAuction />
            </div>
          )}
          
          {activeTab === 'auction-analytics' && (
            <div className="pb-36">
              <AuctionAnalytics />
            </div>
          )}
          
          {activeTab === 'reports' && hasRole('admin') && (
            <div className="pb-36">
              <AdvancedAnalyticsDashboard />
            </div>
          )}

          
          {activeTab === 'alerts' && (
            <div className="pb-36">
              <PriceAlertsDashboard />
            </div>
          )}
          
          {activeTab === 'portfolio' && (
            <div className="pb-36">
              <PortfolioTracker />
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="pb-36">
              <TradingHistory />
            </div>
          )}
          
          {activeTab === 'pilot-dashboard' && (
            <div className="pb-36">
              <PilotDashboard />
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="pb-36">
              <UserProfile />
            </div>
          )}
          
          {activeTab === 'kyc' && (
            <div className="pb-36">
              <KYCVerification />
            </div>
          )}
          
          {activeTab === 'tokenization' && hasRole(['admin', 'trader']) && (
            <div className="pb-36">
              <TokenMarketplace />
            </div>
          )}
          
          {activeTab === 'p2p-trading' && hasRole(['admin', 'trader']) && (
            <div className="pb-36">
              <P2PTokenMarketplace />
            </div>
          )}
          
          {activeTab === 'escrow' && hasRole(['admin', 'trader']) && (
            <div className="pb-36">
              <EscrowDashboard />
            </div>
          )}

          
          {activeTab === 'market' && (
            <div className="pb-36">
              <CommodityPrices />
              <div className="mt-6">
                <MarketIntelligence />
              </div>
            </div>
          )}
          
          {activeTab === 'admin' && hasRole('admin') && (
            <div className="pb-36">
              <AdminDashboard />
            </div>
          )}
          
          {activeTab === 'applications-admin' && hasRole('admin') && (
            <div className="pb-36">
              <AdminApplicationsPanel />
            </div>
          )}
          
          {activeTab === 'my-applications' && (
            <div className="pb-36">
              <MyApplications />
            </div>
          )}
          
          {activeTab === 'kyc-admin' && hasRole(['admin', 'government_agency']) && (
            <div className="pb-36">
              <KYCAdminPanel />
            </div>
          )}


          
          {activeTab === 'role-management' && hasRole('admin') && (
            <div className="pb-36">
              <RoleManagement />
            </div>
          )}
          
          {activeTab === 'audit-logs' && hasRole('admin') && (
            <div className="pb-36">
              <AuditLogs />
            </div>
          )}
          
          {activeTab === 'referrals' && (
            <div className="pb-36">
              <ReferralProgram />
            </div>
          )}
          
          {activeTab === 'terms' && (
            <div className="pb-36">
              <TermsOfService />
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div className="pb-36">
              <PrivacyPolicy />
            </div>
          )}
          
          {activeTab === 'aml' && (
            <div className="pb-36">
              <AMLCompliance onNavigateToKYC={() => setActiveTab('kyc')} />
            </div>
          )}
          
          {activeTab === 'about' && (
            <div className="pb-36">
              <AboutUs />
            </div>
          )}
          
          {activeTab === 'faq' && (
            <div className="pb-36">
              <FAQHelpCenter />
            </div>
          )}
          
          {activeTab === 'news' && (
            <div className="pb-36">
              <NewsBlog />
            </div>
          )}
          
          {activeTab === 'contracts' && (
            <div className="pb-36">
              <ContractTemplates />
            </div>
          )}
          
          {activeTab === 'biometric' && (
            <div className="pb-36">
              <BiometricAuth />
            </div>
          )}
          
          {activeTab === 'document-vault' && (
            <div className="pb-36">
              <DocumentVault />
            </div>
          )}
          
          {activeTab === 'delivery-scheduling' && (
            <div className="pb-36">
              <DeliveryScheduling />
            </div>
          )}
          
          {activeTab === 'recurring-deliveries' && (
            <div className="pb-36">
              <RecurringDeliveries />
            </div>
          )}
          
          {activeTab === 'route-optimization' && (
            <div className="pb-36">
              <RouteOptimization />
            </div>
          )}
          
          {activeTab === 'driver-interface' && hasRole(['admin', 'pilot']) && (
            <div className="pb-36">
              <DriverMobileInterface />
            </div>
          )}
          
          {activeTab === 'customer-tracking' && (
            <div className="pb-36">
              <CustomerTrackingPortal />
            </div>
          )}
          
          {activeTab === 'pod-reports' && (
            <div className="pb-36">
              <PODReportingSystem />
            </div>
          )}
          
          {activeTab === 'self-service' && (
            <div className="pb-36">
              <CustomerSelfServicePortal />
            </div>
          )}

          
          {activeTab === 'fleet-tracking' && hasRole(['admin', 'marketer']) && (
            <div className="pb-36">
              <FleetTrackingMap />
            </div>
          )}
          
          {activeTab === 'widgets' && (
            <div className="pb-36">
              <CommodityWidgets />
            </div>
          )}
          {activeTab === 'security' && (
            <div className="pb-36">
              <SecuritySettings />
            </div>
          )}

          {/* New tabs - Mobile */}
          {activeTab === 'admin-settings' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Settings error"><AdminSettingsPanel /></ErrorBoundary></div>
          )}
          {activeTab === 'ai-predictions' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="AI Prediction error"><AIPricePrediction /></ErrorBoundary></div>
          )}
          {activeTab === 'team-photos' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Team photos error"><TeamPhotoManager /></ErrorBoundary></div>
          )}
          {activeTab === 'email-preferences' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Email preferences error"><EmailPreferences /></ErrorBoundary></div>
          )}
          {activeTab === 'live-chat-agent' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Chat agent error"><LiveChatAgentDashboard /></ErrorBoundary></div>
          )}
          {activeTab === 'payment-history' && hasRole('admin') && (
            <div className="pb-36"><PaymentHistory /></div>
          )}
          {activeTab === 'investor-relations' && (
            <div className="pb-36"><InvestorRelations /></div>
          )}
          {activeTab === 'price-sync' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Price Sync error"><PriceSyncDashboard /></ErrorBoundary></div>
          )}
          {activeTab === 'admin-disputes' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Disputes error"><AdminDisputePanel /></ErrorBoundary></div>
          )}
          {activeTab === 'blog-admin' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Blog Admin error"><BlogAdmin /></ErrorBoundary></div>
          )}
          {activeTab === 'cron-monitor' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Cron Monitor error"><CronJobMonitor /></ErrorBoundary></div>
          )}
          {activeTab === 'order-tracking' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Order tracking error"><OrderTrackingPage /></ErrorBoundary></div>
          )}
          {activeTab === 'admin-orders' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Admin orders error"><AdminOrdersDashboard /></ErrorBoundary></div>
          )}
          {/* New feature tabs - Mobile */}
          {activeTab === 'app-id-search' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="App ID Search error"><ApplicationIdSearch /></ErrorBoundary></div>
          )}
          {activeTab === 'bulk-orders' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Bulk Orders error"><BulkOrderManagement /></ErrorBoundary></div>
          )}
          {activeTab === 'fee-analytics' && hasRole('admin') && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Fee Analytics error"><ServiceFeeAnalytics /></ErrorBoundary></div>
          )}
          {activeTab === 'refinery-db' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Refinery DB error"><RefineryDatabase /></ErrorBoundary></div>
          )}
          {activeTab === 'multi-escrow' && hasRole(['admin', 'trader']) && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Multi Escrow error"><MulticurrencyEscrow /></ErrorBoundary></div>
          )}
          {activeTab === 'digicoin-rewards' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="DigiCoin Rewards error"><DigiCoinRewards /></ErrorBoundary></div>
          )}
          {activeTab === 'smart-alerts' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Smart Alerts error"><SmartAlertsHub /></ErrorBoundary></div>
          )}
          {activeTab === 'global-map' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Global Map error"><GlobalTrackingMap /></ErrorBoundary></div>
          )}
          {activeTab === 'jet-a1' && (
            <div className="pb-36"><ErrorBoundary compact fallbackTitle="Landing page error"><JetA1SAFLanding /></ErrorBoundary></div>
          )}


        </div>





        {/* Offline Indicator */}

        <OfflineIndicator />

        {/* Mobile Bottom Navigation */}

        <MobileNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          onOpenWallet={() => setShowWallet(true)}
        />

        {/* Modals */}
        {showWallet && <DigitalWallet onClose={() => setShowWallet(false)} />}
        {selectedProduct && <ApplicationModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onSubmit={handleApplicationSubmit} />}
        {showTracker && <GPSTracker orderId="ORD-2025-1001" onClose={() => setShowTracker(false)} />}
      </div>
    );
  }




  // Desktop Layout
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0F2952] text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="glass-sidebar w-64 flex flex-col h-screen fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Digiwell</h1>
            <p className="text-white/40 text-[10px]">Energy and assets trading</p>
          </div>
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/690fa8a3adf6239abee77da1_1766142528242_9b5c6665.jpg" 
            alt="Digiwell Logo" 
            className="w-8 h-8 rounded-lg shadow-lg object-cover"
          />
        </div>
        
        {/* Scrollable Tabs */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-hide">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  isActive 
                    ? 'nav-item-active' 
                    : 'text-white/55 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#29B6F6]' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden bg-transparent">
        {/* Top Header */}
        <header className="glass-header h-20 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex-1 max-w-xl">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
               <input type="text" placeholder="Search tokens, pairs, or features..." className="glass-input w-full rounded-full py-2.5 pl-10 pr-4 text-sm" />
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="glass-btn-primary px-5 py-2 rounded-full font-semibold flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" /> Send & Receive
            </button>
            
            <button className="relative p-2 text-white/70 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#29B6F6] rounded-full glow-cyan-pulse"></span>
            </button>

            <div className="flex items-center gap-3">
              <LanguageSelector variant="compact" />
              {userProfile && (
                <Badge className={`${getRoleBadgeColor(userProfile.role)} bg-[#1A1A24]`}>{userProfile.role.replace('_', ' ')}</Badge>
              )}
              <Button onClick={signOut} variant="ghost" size="sm" className="text-white/50 hover:text-white hover:bg-white/5">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Push Notification Banner */}
        {showNotificationBanner && (
          <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 px-6 py-3 flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              <BellRing className="w-5 h-5" />
              <span className="font-medium">Enable push notifications to receive price alerts and order updates in real-time</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                size="sm" 
                onClick={requestNotificationPermission}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Enable Notifications
              </Button>
              <button onClick={() => setShowNotificationBanner(false)} className="hover:opacity-70">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-8 pb-32">
           {activeTab === 'products' ? (
              <div className="max-w-7xl mx-auto space-y-8">
                 {/* 3-Column Layout Top Row */}
                 {/* Hero Banner Section */}
                 <div className="relative rounded-3xl overflow-hidden h-[350px] border border-white/10 shadow-2xl">
                    <img 
                       src="https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768344726151_403105a9.jpg" 
                       alt="Digiwell Petroleum Trading" 
                       className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent flex flex-col justify-center px-12">
                       <Badge className="w-fit bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">Official Trading Platform</Badge>
                       <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                          Global <span className="text-[#D4AF37]">Petroleum</span> & <br /> Energy Markets
                       </h2>
                       <p className="text-slate-300 max-w-xl text-lg mb-8">
                          Secure allocation for premium crude oil, aviation fuel, and sustainable energy assets with real-time market tracking.
                       </p>
                       <div className="flex gap-4">
                          <Button className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] font-bold px-8 py-6 rounded-xl text-lg shadow-lg shadow-[#D4AF37]/20">
                             Apply for Allocation
                          </Button>
                          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 rounded-xl text-lg">
                             View Market Intel
                          </Button>
                       </div>
                    </div>
                 </div>

                 {/* Bottom Row - Products Grid */}
                 <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-end mb-6">
                       <div>
                         <h3 className="text-2xl font-bold text-white mb-1">Energy Markets</h3>
                         <p className="text-white/50 text-sm">Live market prices and allocations</p>
                       </div>
                       <button className="text-[#8A2BE2] text-sm font-medium hover:text-[#D946EF] transition-colors flex items-center gap-1">View All Markets <ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      {products.map(product => (
                        <ProductCard key={product.id} product={product} onApply={setSelectedProduct} />
                      ))}
                    </div>
                 </div>
              </div>
           ) : (
              // General Content Area for Other Tabs
              <div className="max-w-7xl mx-auto">
                 {/* Real-time Commodity Price Ticker for Other Tabs */}
                 <div className="mb-8 rounded-2xl overflow-hidden border border-white/10">
                    <CommodityPriceTicker onCommodityClick={(symbol) => {
                       setActiveTab('commodities');
                    }} />
                 </div>

                 {activeTab === 'live-prices' && <LivePricesDashboard />}
                 {activeTab === 'commodities' && <CommodityPrices />}
                 {activeTab === 'invoices' && <InvoiceManagement />}
                 {activeTab === 'shipping' && <ShippingLogistics />}
                 {activeTab === 'delivery-tracker' && <DeliveryTracker />}
                 {activeTab === 'shipment-map' && <ShipmentMap />}
                 {activeTab === 'disputes' && <DisputeResolution />}
                 {activeTab === 'support' && <SupportChat />}
                 {activeTab === 'auctions' && <BidAuction />}
                 {activeTab === 'auction-analytics' && <AuctionAnalytics />}
                 {activeTab === 'reports' && hasRole('admin') && <AdvancedAnalyticsDashboard />}
                 {activeTab === 'alerts' && <PriceAlertsDashboard />}
                 {activeTab === 'portfolio' && <PortfolioTracker />}
                 {activeTab === 'history' && <TradingHistory />}
                 {activeTab === 'pilot-dashboard' && <PilotDashboard />}
                 {activeTab === 'profile' && <UserProfile />}
                 {activeTab === 'kyc' && <KYCVerification />}
                 {activeTab === 'tokenization' && hasRole(['admin', 'trader']) && <TokenMarketplace />}
                 {activeTab === 'p2p-trading' && hasRole(['admin', 'trader']) && <P2PTokenMarketplace />}
                 {activeTab === 'escrow' && hasRole(['admin', 'trader']) && <EscrowDashboard />}
                 {activeTab === 'market' && (<><CommodityPrices /><div className="mt-6"><MarketIntelligence /></div></>)}
                 {activeTab === 'admin' && hasRole('admin') && <AdminDashboard />}
                 {activeTab === 'applications-admin' && hasRole('admin') && <AdminApplicationsPanel />}
                 {activeTab === 'my-applications' && <MyApplications />}
                 {activeTab === 'kyc-admin' && hasRole(['admin', 'government_agency']) && <KYCAdminPanel />}
                 {activeTab === 'role-management' && hasRole('admin') && <RoleManagement />}
                 {activeTab === 'audit-logs' && hasRole('admin') && <AuditLogs />}
                 {activeTab === 'payment-history' && hasRole('admin') && <PaymentHistory />}
                 {activeTab === 'price-management' && hasRole('admin') && <AdminPriceManagement />}
                 {activeTab === 'privacy' && <PrivacyPolicy />}
                 {activeTab === 'aml' && <AMLCompliance onNavigateToKYC={() => setActiveTab('kyc')} />}
                 {activeTab === 'about' && <AboutUs />}
                 {activeTab === 'faq' && <FAQHelpCenter />}
                 {activeTab === 'news' && <NewsBlog />}
                 {activeTab === 'contracts' && <ContractTemplates />}
                 {activeTab === 'biometric' && <BiometricAuth />}
                 {activeTab === 'document-vault' && <DocumentVault />}
                 {activeTab === 'delivery-scheduling' && <DeliveryScheduling />}
                 {activeTab === 'route-optimization' && <RouteOptimization />}
                 {activeTab === 'driver-interface' && hasRole(['admin', 'pilot']) && <DriverMobileInterface />}
                 {activeTab === 'customer-tracking' && <CustomerTrackingPortal />}
                 {activeTab === 'pod-reports' && <PODReportingSystem />}
                 {activeTab === 'recurring-deliveries' && <RecurringDeliveries />}
                 {activeTab === 'self-service' && <CustomerSelfServicePortal />}
                 {activeTab === 'fleet-tracking' && hasRole(['admin', 'marketer']) && <FleetTrackingMap />}
                 {activeTab === 'widgets' && <CommodityWidgets />}
                 {activeTab === 'security' && <SecuritySettings />}

                 {/* New tabs - Desktop */}
                 {activeTab === 'admin-settings' && hasRole('admin') && <ErrorBoundary fallbackTitle="Settings Panel Error"><AdminSettingsPanel /></ErrorBoundary>}
                 {activeTab === 'ai-predictions' && <ErrorBoundary fallbackTitle="AI Predictions Error"><AIPricePrediction /></ErrorBoundary>}
                 {activeTab === 'team-photos' && hasRole('admin') && <ErrorBoundary fallbackTitle="Team Photos Error"><TeamPhotoManager /></ErrorBoundary>}
                 {activeTab === 'email-preferences' && <ErrorBoundary fallbackTitle="Email Preferences Error"><EmailPreferences /></ErrorBoundary>}
                 {activeTab === 'live-chat-agent' && hasRole('admin') && <ErrorBoundary fallbackTitle="Chat Agent Error"><LiveChatAgentDashboard /></ErrorBoundary>}
                 {activeTab === 'investor-relations' && <InvestorRelations />}
                 {activeTab === 'price-sync' && hasRole('admin') && <ErrorBoundary fallbackTitle="Price Sync Error"><PriceSyncDashboard /></ErrorBoundary>}
                 {activeTab === 'admin-disputes' && hasRole('admin') && <ErrorBoundary fallbackTitle="Disputes Error"><AdminDisputePanel /></ErrorBoundary>}
                 {activeTab === 'blog-admin' && hasRole('admin') && <ErrorBoundary fallbackTitle="Blog Admin Error"><BlogAdmin /></ErrorBoundary>}
                 {activeTab === 'cron-monitor' && hasRole('admin') && <ErrorBoundary fallbackTitle="Cron Monitor Error"><CronJobMonitor /></ErrorBoundary>}
                 {activeTab === 'terms' && <TermsOfService />}
                 {activeTab === 'admin-orders' && hasRole('admin') && <ErrorBoundary fallbackTitle="Admin Orders Error"><AdminOrdersDashboard /></ErrorBoundary>}

                 {/* New feature tabs - Desktop */}
                 {activeTab === 'bulk-orders' && hasRole('admin') && <ErrorBoundary fallbackTitle="Bulk Orders Error"><BulkOrderManagement /></ErrorBoundary>}
                 {activeTab === 'fee-analytics' && hasRole('admin') && <ErrorBoundary fallbackTitle="Fee Analytics Error"><ServiceFeeAnalytics /></ErrorBoundary>}
                 {activeTab === 'refinery-db' && <ErrorBoundary fallbackTitle="Refinery DB Error"><RefineryDatabase /></ErrorBoundary>}
                 {activeTab === 'multi-escrow' && hasRole(['admin', 'trader']) && <ErrorBoundary fallbackTitle="Multi Escrow Error"><MulticurrencyEscrow /></ErrorBoundary>}
                 {activeTab === 'digicoin-rewards' && <ErrorBoundary fallbackTitle="DigiCoin Rewards Error"><DigiCoinRewards /></ErrorBoundary>}
                 {activeTab === 'inventory' && hasRole('admin') && <ErrorBoundary fallbackTitle="Inventory Error"><InventoryManagement /></ErrorBoundary>}
                 {activeTab === 'smart-alerts' && <ErrorBoundary fallbackTitle="Smart Alerts Error"><SmartAlertsHub /></ErrorBoundary>}
                 {activeTab === 'global-map' && <ErrorBoundary fallbackTitle="Global Map Error"><GlobalTrackingMap /></ErrorBoundary>}
                 {activeTab === 'jet-a1' && <ErrorBoundary fallbackTitle="Landing Page Error"><JetA1SAFLanding /></ErrorBoundary>}
              </div>
           )}
        </div>
      </main>

      {/* Floating Chat Widget */}
      {activeTab !== 'support' && (
        <ChatWidget onOpenFullChat={() => setActiveTab('support')} />
      )}

      {/* Modals */}
      {showWallet && <DigitalWallet onClose={() => setShowWallet(false)} />}
      {selectedProduct && <ApplicationModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onSubmit={handleApplicationSubmit} />}
      {showTracker && <GPSTracker orderId="ORD-2025-1001" onClose={() => setShowTracker(false)} />}
      
      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
