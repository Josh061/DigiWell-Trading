import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  BookOpen,
  Users,
  CheckCircle,
  Building,
  Scale,
  CreditCard,
  AlertTriangle,
  Shield,
  Lock,
  Eye,
  AlertCircle,
  XCircle,
  Gavel,
  Edit,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Printer,
  Download,
  ArrowUp,
  TrendingUp,
  Wallet,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3
} from 'lucide-react';


interface Section {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export default function TermsOfService() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['introduction']);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const expandAll = () => {
    setExpandedSections(sections.map(s => s.id));
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  const sections: Section[] = [
    {
      id: 'introduction',
      number: 1,
      title: 'Introduction',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            This Agreement governs the relationship between <span className="text-[#D4AF37] font-semibold">Digiwell Trading</span> ("Company") 
            and its registered users/digital traders ("Users").
          </p>
          <p className="text-slate-300 leading-relaxed">
            By accessing or using Digiwell Trading's platform, Users agree to comply with the terms and conditions herein.
          </p>
          <p className="text-slate-300 leading-relaxed">
            This Agreement applies to all transactions involving petroleum products and other real-world assets facilitated through Digiwell Trading.
          </p>
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-4 mt-4">
            <p className="text-[#D4AF37] text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              By using our platform, you acknowledge that you have read, understood, and agree to be bound by these terms.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'definitions',
      number: 2,
      title: 'Definitions',
      icon: FileText,
      content: (
        <div className="space-y-3">
          <div className="grid gap-3">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <span className="text-[#00D4FF] font-semibold">"Platform"</span>
              <p className="text-slate-300 mt-1">www.digiwelltrading.com and associated applications.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <span className="text-[#00D4FF] font-semibold">"User"</span>
              <p className="text-slate-300 mt-1">Any individual or entity registered to trade via the Platform.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <span className="text-[#00D4FF] font-semibold">"Digital Trader"</span>
              <p className="text-slate-300 mt-1">A User actively engaged in trading petroleum products or real-world assets.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <span className="text-[#00D4FF] font-semibold">"Assets"</span>
              <p className="text-slate-300 mt-1">Petroleum products, commodities, or other real-world assets listed for trade.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <span className="text-[#00D4FF] font-semibold">"Transaction"</span>
              <p className="text-slate-300 mt-1">Any purchase, sale, or exchange of Assets executed via the Platform.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'eligibility',
      number: 3,
      title: 'Eligibility',
      icon: Users,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Users must be at least <span className="text-white font-semibold">18 years old</span> and legally capable of entering into binding contracts.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Corporate entities must provide valid incorporation documents and proof of authorization.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Users must comply with applicable laws, including trade, export, and financial regulations.</span>
            </li>
          </ul>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              Corporate accounts require additional verification through our KYC process.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'user-obligations',
      number: 4,
      title: 'User Obligations',
      icon: CheckCircle,
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 mb-4">As a User of Digiwell Trading, you agree to:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#D4AF37] text-xs font-bold">1</span>
              </div>
              <span className="text-slate-300">Provide accurate registration details and maintain updated account information.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#D4AF37] text-xs font-bold">2</span>
              </div>
              <span className="text-slate-300">Ensure compliance with international trade laws, sanctions, and anti-money laundering (AML) regulations.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#D4AF37] text-xs font-bold">3</span>
              </div>
              <span className="text-slate-300">Refrain from fraudulent, manipulative, or unlawful trading activities.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#D4AF37] text-xs font-bold">4</span>
              </div>
              <span className="text-slate-300">Maintain confidentiality of login credentials and trading data.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'company-obligations',
      number: 5,
      title: 'Company Obligations',
      icon: Building,
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 mb-4">Digiwell Trading commits to:</p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
              <Shield className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-white font-medium">Secure Platform</span>
                <p className="text-slate-400 text-sm mt-1">Provide a secure and transparent trading platform.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
              <Scale className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-white font-medium">Legal Compliance</span>
                <p className="text-slate-400 text-sm mt-1">Facilitate transactions in accordance with applicable laws.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
              <AlertTriangle className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-white font-medium">Risk Management</span>
                <p className="text-slate-400 text-sm mt-1">Implement risk management, compliance, and anti-fraud measures.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
              <Gavel className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-white font-medium">Dispute Resolution</span>
                <p className="text-slate-400 text-sm mt-1">Provide dispute resolution mechanisms.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'trading-terms',
      number: 6,
      title: 'Trading Terms',
      icon: Scale,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <ChevronRight className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">All trades are subject to market availability and verification of counterparties.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Prices are determined by market conditions and may fluctuate.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Digiwell Trading reserves the right to suspend or cancel trades suspected of fraud or illegality.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Settlement of trades must occur within agreed timelines; failure to settle may result in penalties.</span>
            </li>
          </ul>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Market prices are sourced from OPEC, OilPrice.com, and Investing.com and are subject to real-time changes.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'payment-settlement',
      number: 7,
      title: 'Payment & Settlement',
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Payments must be made via approved financial channels.</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Digiwell Trading may hold funds in escrow until transaction completion.</span>
            </li>
            <li className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Users are responsible for applicable taxes, duties, and fees.</span>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Late payments may incur interest charges.</span>
            </li>
          </ul>
          <div className="bg-slate-800/50 rounded-lg p-4 mt-4 border border-slate-700">
            <h4 className="text-white font-medium mb-3">Accepted Payment Methods</h4>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-500/20 text-blue-400">Stripe</Badge>
              <Badge className="bg-purple-500/20 text-purple-400">Flutterwave</Badge>
              <Badge className="bg-green-500/20 text-green-400">Bank Transfer</Badge>
              <Badge className="bg-amber-500/20 text-amber-400">Letter of Credit</Badge>
              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">DigiCoin</Badge>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'market-price-adjustment',
      number: 8,
      title: 'Market Price Adjustment Clause',
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-5">
            <h4 className="text-amber-400 font-semibold flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5" />
              Market Price Adjustment Policy
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Due to the volatile nature of petroleum products and real-world assets (RWAs), the price at the time of order placement 
              may differ from the actual market price at the time of payment settlement. Digiwell Trading implements an automated 
              <span className="text-[#D4AF37] font-semibold"> Market Price Adjustment Mechanism</span> to ensure fair and transparent 
              pricing for all parties.
            </p>
          </div>

          <div className="space-y-3">
            <h5 className="text-white font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#D4AF37]" />
              8.1 Wallet Deduction (Price Increase)
            </h5>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/20">
              <div className="flex items-start gap-3">
                <ArrowUpRight className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-slate-300">If the market price of a petroleum product or RWA <span className="text-red-400 font-semibold">increases</span> between 
                  the time of order placement and the time of payment settlement, the User's digital wallet shall be <span className="text-red-400 font-semibold">debited</span> for 
                  the difference to reflect the actual market price.</p>
                  <div className="bg-red-500/10 rounded p-3 text-sm">
                    <p className="text-red-300"><span className="font-semibold">Example:</span> If Brent Crude was $82.50/barrel at order time but rose to $84.20/barrel at settlement, 
                    the User's wallet will be debited $1.70 per barrel for the price difference.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-white font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#D4AF37]" />
              8.2 Wallet Addition (Price Decrease)
            </h5>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-start gap-3">
                <ArrowDownLeft className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-slate-300">If the market price of a petroleum product or RWA <span className="text-green-400 font-semibold">decreases</span> between 
                  the time of order placement and the time of payment settlement, the User's digital wallet shall be <span className="text-green-400 font-semibold">credited</span> for 
                  the difference to reflect the actual market price.</p>
                  <div className="bg-green-500/10 rounded p-3 text-sm">
                    <p className="text-green-300"><span className="font-semibold">Example:</span> If Gold was $2,340/oz at order time but dropped to $2,315/oz at settlement, 
                    the User's wallet will be credited $25.00 per ounce for the price difference.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-white font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
              8.3 Price Reference Sources
            </h5>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-slate-300 mb-3">Market prices for adjustment calculations are sourced from the following verified data providers:</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">OPEC Official Basket</Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">OilPrice.com</Badge>
                <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Investing.com</Badge>
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">Bloomberg</Badge>
                <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Alpha Vantage</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-white font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
              8.4 Adjustment Process
            </h5>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#D4AF37] text-xs font-bold">a</span>
                  </div>
                  <span className="text-slate-300">Adjustments are calculated automatically at the time of payment settlement using live market data.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#D4AF37] text-xs font-bold">b</span>
                  </div>
                  <span className="text-slate-300">Users will receive real-time notifications of any wallet adjustments via email, SMS, and in-platform alerts.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#D4AF37] text-xs font-bold">c</span>
                  </div>
                  <span className="text-slate-300">A minimum threshold of 0.01% price change is required before an adjustment is applied (de minimis rule).</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#D4AF37] text-xs font-bold">d</span>
                  </div>
                  <span className="text-slate-300">All adjustments are recorded in the User's transaction history with full audit trail including original price, settlement price, percentage change, and adjustment amount.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#D4AF37] text-xs font-bold">e</span>
                  </div>
                  <span className="text-slate-300">Users may dispute any adjustment within 7 business days of notification through the Platform's dispute resolution mechanism.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-white font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              8.5 Applicable Products
            </h5>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-slate-300 mb-3">This Market Price Adjustment Clause applies to the following product categories:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <p className="text-white text-sm font-medium">Brent Crude Oil</p>
                  <p className="text-slate-400 text-xs">Petroleum</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <p className="text-white text-sm font-medium">WTI Crude Oil</p>
                  <p className="text-slate-400 text-xs">Petroleum</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <p className="text-white text-sm font-medium">Natural Gas</p>
                  <p className="text-slate-400 text-xs">Energy</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <p className="text-white text-sm font-medium">Aviation Fuel (JET-A1)</p>
                  <p className="text-slate-400 text-xs">Petroleum</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <p className="text-white text-sm font-medium">PMS / AGO / LPG</p>
                  <p className="text-slate-400 text-xs">Petroleum Derivatives</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2 text-center">
                  <p className="text-white text-sm font-medium">Gold / Silver / Lithium</p>
                  <p className="text-slate-400 text-xs">Real World Assets</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-4 mt-4">
            <p className="text-[#D4AF37] text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              By placing an order on the Platform, Users expressly consent to the Market Price Adjustment Clause and acknowledge 
              that their wallet balance may be adjusted (debited or credited) to reflect the actual market price at the time of 
              payment settlement. This clause is integral to the fair and transparent operation of the Digiwell Trading platform.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'risk-disclosure',
      number: 9,
      title: 'Risk Disclosure',
      icon: AlertTriangle,
      content: (

        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" />
              Important Risk Warning
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">Trading petroleum products and real-world assets involves market, regulatory, and operational risks.</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">Digiwell Trading does not guarantee profits or protection against losses.</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">Users acknowledge full responsibility for their trading decisions.</span>
              </li>
            </ul>
          </div>
          <p className="text-slate-400 text-sm">
            Past performance is not indicative of future results. Please trade responsibly and only invest what you can afford to lose.
          </p>
        </div>
      )
    },
    {
      id: 'compliance',
      number: 10,

      title: 'Compliance & Legal Restrictions',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Users must comply with international sanctions, embargoes, and trade restrictions.</span>
            </li>
            <li className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Digiwell Trading may refuse service to Users from restricted jurisdictions.</span>
            </li>
            <li className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">All transactions are subject to Know Your Customer (KYC) and AML checks.</span>
            </li>
          </ul>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
              <Badge className="bg-green-500/20 text-green-400 mb-2">KYC Verified</Badge>
              <p className="text-slate-400 text-xs">Identity verification required</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
              <Badge className="bg-blue-500/20 text-blue-400 mb-2">AML Compliant</Badge>
              <p className="text-slate-400 text-xs">Anti-money laundering checks</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'intellectual-property',
      number: 11,
      title: 'Intellectual Property',
      icon: Lock,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">All content, trademarks, and software on the Platform are owned by Digiwell Trading.</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">Users may not copy, modify, or distribute Platform content without prior consent.</span>
            </li>
          </ul>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
            <p className="text-purple-400 text-sm">Unauthorized use of Digiwell Trading's intellectual property may result in legal action.</p>
          </div>
        </div>
      )
    },
    {
      id: 'confidentiality',
      number: 12,
      title: 'Confidentiality',
      icon: Eye,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3"><Eye className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Users must maintain confidentiality of trade data, counterparties, and proprietary information.</span></li>
            <li className="flex items-start gap-3"><Shield className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Digiwell Trading will protect User data in accordance with applicable privacy laws.</span></li>
          </ul>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4"><p className="text-cyan-400 text-sm flex items-center gap-2"><Lock className="w-4 h-4" />Your data is encrypted and stored securely using industry-standard protocols.</p></div>
        </div>
      )
    },
    {
      id: 'limitation-liability',
      number: 13,
      title: 'Limitation of Liability',
      icon: AlertCircle,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Digiwell Trading is not liable for indirect, incidental, or consequential damages.</span></li>
            <li className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Liability is limited to the amount of fees paid by the User for the disputed transaction.</span></li>
          </ul>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4"><p className="text-amber-400 text-sm">This limitation applies to the fullest extent permitted by applicable law.</p></div>
        </div>
      )
    },
    {
      id: 'termination',
      number: 14,
      title: 'Termination',
      icon: XCircle,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3"><XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Digiwell Trading may suspend or terminate User accounts for breach of this Agreement.</span></li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Users may terminate their account by providing written notice.</span></li>
            <li className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Termination does not affect obligations accrued prior to termination.</span></li>
          </ul>
        </div>
      )
    },
    {
      id: 'dispute-resolution',
      number: 15,
      title: 'Dispute Resolution',
      icon: Gavel,
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700"><div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0"><span className="text-[#D4AF37] font-bold">1</span></div><div><span className="text-white font-medium">Negotiation</span><p className="text-slate-400 text-sm mt-1">Disputes shall first be resolved through negotiation.</p></div></div>
          <div className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700"><div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0"><span className="text-[#D4AF37] font-bold">2</span></div><div><span className="text-white font-medium">Arbitration</span><p className="text-slate-400 text-sm mt-1">If unresolved, disputes may be referred to arbitration under the rules of the International Chamber of Commerce (ICC).</p></div></div>
          <div className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700"><div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0"><span className="text-[#D4AF37] font-bold">3</span></div><div><span className="text-white font-medium">Governing Law</span><p className="text-slate-400 text-sm mt-1">The laws of Nigeria (or jurisdiction specified by Digiwell Trading).</p></div></div>
        </div>
      )
    },
    {
      id: 'amendments',
      number: 16,
      title: 'Amendments',
      icon: Edit,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3"><Edit className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Digiwell Trading reserves the right to amend this Agreement at any time.</span></li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">Continued use of the Platform constitutes acceptance of updated terms.</span></li>
          </ul>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4"><p className="text-blue-400 text-sm">Users will be notified of significant changes via email or platform notification.</p></div>
        </div>
      )
    },
    {
      id: 'entire-agreement',
      number: 17,
      title: 'Entire Agreement',
      icon: FileCheck,
      content: (
        <div className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3"><FileCheck className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">This Agreement constitutes the entire understanding between Digiwell Trading and Users.</span></li>
            <li className="flex items-start gap-3"><FileCheck className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" /><span className="text-slate-300">No oral or written statements outside this Agreement shall be binding.</span></li>
          </ul>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4"><p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />This document supersedes all prior agreements and understandings.</p></div>
        </div>
      )
    }

  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-xl flex items-center justify-center">
            <Scale className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
            <p className="text-white/60">Digiwell Trading Agreement</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50">
            Last Updated: January 2026
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
            Version 2.0
          </Badge>
        </div>
      </div>

      {/* Quick Navigation & Actions */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Collapse All
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table of Contents */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            Table of Contents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  if (!expandedSections.includes(section.id)) {
                    toggleSection(section.id);
                  }
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-colors group"
              >
                <span className="text-[#D4AF37] font-mono text-sm">{section.number}.</span>
                <span className="text-slate-300 text-sm ml-2 group-hover:text-white transition-colors">
                  {section.title}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.includes(section.id);

          return (
            <Card
              key={section.id}
              id={section.id}
              className="bg-slate-900/50 border-slate-700 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full text-left"
              >
                <CardHeader className="pb-3 hover:bg-slate-800/50 transition-colors">
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/10 rounded-lg flex items-center justify-center border border-[#D4AF37]/30">
                        <Icon className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <span className="text-[#D4AF37] font-mono mr-2">{section.number}.</span>
                        <span>{section.title}</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </CardTitle>
                </CardHeader>
              </button>
              {isExpanded && (
                <CardContent className="pt-0 pb-6 border-t border-slate-700/50">
                  <div className="pt-4">{section.content}</div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Acceptance Section */}
      <Card className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Agreement Acceptance</h3>
          <p className="text-slate-300 mb-4 max-w-2xl mx-auto">
            By using Digiwell Trading's platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. 
            If you do not agree with any part of these terms, please do not use our platform.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              OPEC Certified
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              AML Compliant
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/50 px-4 py-2">
              <Lock className="w-4 h-4 mr-2" />
              Data Protected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">Questions about these terms?</h3>
              <p className="text-slate-400 text-sm">
                Contact our legal team at <span className="text-[#00D4FF]">legal@digiwelltrading.com</span>
              </p>
            </div>
            <Button className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 hover:opacity-90">
              Contact Legal Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scroll to Top Button */}
      <Button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900 shadow-lg z-50"
      >
        <ArrowUp className="w-5 h-5" />
      </Button>
    </div>
  );
}
