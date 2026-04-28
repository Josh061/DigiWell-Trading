import { useState } from 'react';
import { 
  Home, BarChart3, Package, Bell, User, Gavel, 
  MessageCircle, Ship, Receipt, Wallet, Menu, X,
  Settings, Shield, History, Coins, FileText, Truck, Gift, HelpCircle, Newspaper
} from 'lucide-react';


interface MobileNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenWallet: () => void;
  unreadNotifications?: number;
  unreadMessages?: number;
}

export default function MobileNavigation({ 
  activeTab, 
  setActiveTab, 
  onOpenWallet,
  unreadNotifications = 0,
  unreadMessages = 0
}: MobileNavigationProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const navItems = [
    { id: 'mobile-dashboard', icon: Home, label: 'Home' },
    { id: 'commodities', icon: BarChart3, label: 'Prices' },
    { id: 'orders', icon: Package, label: 'Orders' },
    { id: 'auctions', icon: Gavel, label: 'Auctions' },
    { id: 'more', icon: Menu, label: 'More' },
  ];

  const moreMenuItems = [
    { id: 'alerts', icon: Bell, label: 'Price Alerts' },
    { id: 'support', icon: MessageCircle, label: 'Support' },
    { id: 'faq', icon: HelpCircle, label: 'FAQ & Help' },
    { id: 'news', icon: Newspaper, label: 'News & Blog' },
    { id: 'shipping', icon: Ship, label: 'Shipping' },
    { id: 'invoices', icon: Receipt, label: 'Invoices' },
    { id: 'portfolio', icon: Coins, label: 'Portfolio' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'referrals', icon: Gift, label: 'Referrals' },
    { id: 'kyc', icon: Shield, label: 'KYC' },
    { id: 'about', icon: FileText, label: 'About Us' },
  ];





  const handleNavClick = (id: string) => {
    if (id === 'more') {
      setShowMoreMenu(!showMoreMenu);
    } else {
      setActiveTab(id);
      setShowMoreMenu(false);
    }
  };

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowMoreMenu(false)}>
          <div 
            className="absolute bottom-32 left-4 right-4 bg-slate-900 rounded-2xl border border-white/20 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreMenuItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                      activeTab === item.id
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={onOpenWallet}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] rounded-xl text-slate-900 font-semibold"
            >
              <Wallet className="w-5 h-5" />
              Open Wallet
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Bar - Swipeable horizontal scroll */}
      <div className="fixed bottom-16 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 z-40 safe-area-bottom">
        <div className="flex overflow-x-auto gap-2 px-3 py-2 scrollbar-hide">
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] rounded-full text-slate-900 font-semibold text-sm whitespace-nowrap"
          >
            <Wallet className="w-4 h-4" />
            Wallet
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all relative ${
              activeTab === 'alerts'
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                : 'bg-white/10 text-white/80'
            }`}
          >
            <Bell className="w-4 h-4" />
            Alerts
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all relative ${
              activeTab === 'support'
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                : 'bg-white/10 text-white/80'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Support
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              activeTab === 'shipping'
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                : 'bg-white/10 text-white/80'
            }`}
          >
            <Ship className="w-4 h-4" />
            Shipping
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              activeTab === 'invoices'
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                : 'bg-white/10 text-white/80'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Invoices
          </button>
        </div>
      </div>

      {/* Main Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/98 backdrop-blur-lg border-t border-white/20 z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || 
              (item.id === 'mobile-dashboard' && activeTab === 'products') ||
              (item.id === 'more' && showMoreMenu);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive ? 'text-[#D4AF37]' : 'text-white/60'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-[#D4AF37]/20' : ''
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                </div>
                <span className={`text-xs mt-0.5 font-medium ${
                  isActive ? 'text-[#D4AF37]' : ''
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
