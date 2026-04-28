import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone, 
  FileText, 
  Shield, 
  CreditCard, 
  Truck, 
  Coins, 
  TrendingUp,
  Send,
  CheckCircle,
  Clock,
  ChevronRight,
  Headphones,
  BookOpen,
  Zap
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

const faqData: FAQ[] = [
  // Trading FAQs
  {
    id: 'trading-1',
    question: 'How do I start trading on Digiwell Trading?',
    answer: 'To start trading on Digiwell Trading, you need to: 1) Create an account by signing up with your email. 2) Complete the KYC verification process by submitting required documents. 3) Fund your digital wallet using any of our supported payment methods. 4) Browse available commodities and tokens in our marketplace. 5) Place your first order by selecting the asset and quantity you wish to trade.',
    category: 'Trading',
    helpful: 245
  },
  {
    id: 'trading-2',
    question: 'What commodities can I trade on the platform?',
    answer: 'Digiwell Trading offers a wide range of commodities including: Crude Oil (Brent, WTI, Bonny Light), Natural Gas, Gold, Silver, Platinum, Agricultural commodities (Wheat, Corn, Soybeans), and various tokenized real-world assets (RWAs). Our marketplace is continuously expanding to include more asset classes.',
    category: 'Trading',
    helpful: 189
  },
  {
    id: 'trading-3',
    question: 'What are the trading hours on Digiwell?',
    answer: 'Our digital trading platform operates 24/7 for tokenized assets. For physical commodity trading, hours align with major global markets: London (8:00 AM - 4:30 PM GMT), New York (9:30 AM - 4:00 PM EST), and Lagos (9:00 AM - 5:00 PM WAT). Weekend trading is available for select digital assets.',
    category: 'Trading',
    helpful: 156
  },
  {
    id: 'trading-4',
    question: 'How do I place a limit order vs market order?',
    answer: 'A Market Order executes immediately at the current best available price. A Limit Order allows you to set a specific price at which you want to buy or sell - the order only executes when the market reaches your specified price. To place either: Go to the trading interface, select your asset, choose "Market" or "Limit" order type, enter quantity, and for limit orders, specify your target price.',
    category: 'Trading',
    helpful: 134
  },
  {
    id: 'trading-5',
    question: 'What is the minimum trade amount?',
    answer: 'Minimum trade amounts vary by asset class: Tokenized commodities start at $100 USD equivalent, Physical crude oil contracts require minimum 1,000 barrels, Gold tokens start at 0.01 oz equivalent, and P2P token trades have a minimum of $50 USD. These minimums ensure efficient settlement and reduce transaction costs.',
    category: 'Trading',
    helpful: 198
  },
  // Payments FAQs
  {
    id: 'payments-1',
    question: 'What payment methods are accepted?',
    answer: 'We accept multiple payment methods: Bank Wire Transfers (USD, EUR, GBP, NGN), Credit/Debit Cards (Visa, Mastercard), Cryptocurrency (BTC, ETH, USDT, USDC), Mobile Money (for African regions), Flutterwave integration for local payments, and Stripe for international card payments. All transactions are secured with bank-grade encryption.',
    category: 'Payments',
    helpful: 312
  },
  {
    id: 'payments-2',
    question: 'How long do deposits take to reflect?',
    answer: 'Deposit processing times vary: Card payments are instant to 5 minutes, Cryptocurrency deposits require 3-6 network confirmations (15-60 minutes), Bank wire transfers take 1-3 business days, Mobile money is typically instant to 30 minutes. You will receive email and SMS notifications once your deposit is confirmed.',
    category: 'Payments',
    helpful: 267
  },
  {
    id: 'payments-3',
    question: 'What are the withdrawal fees and limits?',
    answer: 'Withdrawal fees depend on the method: Bank transfers have a flat $25 fee (or equivalent), Crypto withdrawals include network fees only, Card withdrawals incur a 2.5% processing fee. Daily limits: Standard accounts $10,000, Verified accounts $50,000, Premium accounts $250,000. Higher limits available upon request with enhanced verification.',
    category: 'Payments',
    helpful: 289
  },
  {
    id: 'payments-4',
    question: 'How does the escrow system work?',
    answer: 'Our escrow system protects both buyers and sellers: 1) Buyer initiates trade and funds are held in escrow. 2) Seller confirms and ships/transfers the asset. 3) Buyer confirms receipt and satisfaction. 4) Funds are released to seller minus platform fees. If disputes arise, our resolution team mediates. Escrow fees are 1% of transaction value.',
    category: 'Payments',
    helpful: 234
  },
  // KYC FAQs
  {
    id: 'kyc-1',
    question: 'What documents are required for KYC verification?',
    answer: 'KYC verification requires: 1) Government-issued ID (Passport, National ID, or Driver\'s License). 2) Proof of Address (Utility bill, bank statement, or government letter dated within 3 months). 3) Selfie holding your ID for identity confirmation. 4) For corporate accounts: Certificate of Incorporation, Board Resolution, and Director IDs.',
    category: 'KYC',
    helpful: 356
  },
  {
    id: 'kyc-2',
    question: 'How long does KYC verification take?',
    answer: 'Standard KYC verification is completed within 24-48 hours. Express verification (available for premium accounts) takes 2-4 hours. Factors affecting timing include: document clarity, verification queue volume, and any additional information requests. You\'ll receive status updates via email and can track progress in your dashboard.',
    category: 'KYC',
    helpful: 278
  },
  {
    id: 'kyc-3',
    question: 'Why was my KYC application rejected?',
    answer: 'Common rejection reasons include: Blurry or unreadable documents, expired identification, address proof older than 3 months, mismatch between document name and account name, incomplete information, or documents in unsupported formats. You can resubmit with corrected documents. Contact support if you need clarification on specific rejection reasons.',
    category: 'KYC',
    helpful: 189
  },
  {
    id: 'kyc-4',
    question: 'What are the different KYC verification levels?',
    answer: 'We have three verification levels: Basic (email + phone verification) - $1,000 daily limit, Standard (ID + address verification) - $50,000 daily limit, Enhanced (additional financial documentation) - $250,000+ daily limit. Higher levels unlock more features including P2P trading, physical commodity access, and priority support.',
    category: 'KYC',
    helpful: 223
  },
  // Shipping FAQs
  {
    id: 'shipping-1',
    question: 'How does physical commodity delivery work?',
    answer: 'Physical delivery process: 1) Complete purchase and select delivery option. 2) Our logistics team arranges shipping from nearest depot. 3) Track shipment in real-time via GPS tracker in your dashboard. 4) Receive delivery at designated port/location. 5) Confirm receipt to release escrow. We partner with major shipping companies and maintain insurance coverage throughout transit.',
    category: 'Shipping',
    helpful: 167
  },
  {
    id: 'shipping-2',
    question: 'What shipping insurance coverage is provided?',
    answer: 'All physical shipments include comprehensive insurance: 100% coverage for loss or damage during transit, Protection against piracy and maritime risks, Weather-related incident coverage, and Third-party liability protection. Premium insurance options available for high-value shipments. Claims are processed within 14 business days.',
    category: 'Shipping',
    helpful: 145
  },
  {
    id: 'shipping-3',
    question: 'Can I track my shipment in real-time?',
    answer: 'Yes! Our GPS Tracker feature provides: Real-time vessel/truck location, Estimated arrival times updated hourly, Route visualization on interactive maps, Weather and port condition alerts, Milestone notifications (departure, customs, arrival), and Historical route data. Access tracking from your dashboard under "Shipping & Logistics".',
    category: 'Shipping',
    helpful: 198
  },
  {
    id: 'shipping-4',
    question: 'What are the delivery timeframes for different regions?',
    answer: 'Typical delivery timeframes: West Africa (Nigeria, Ghana) - 3-7 days, East Africa - 7-14 days, Europe - 14-21 days, Americas - 21-30 days, Asia - 14-28 days. Timeframes depend on commodity type, quantity, port availability, and customs processing. Express shipping available for select routes at additional cost.',
    category: 'Shipping',
    helpful: 156
  },
  // Tokens FAQs
  {
    id: 'tokens-1',
    question: 'What are tokenized assets and how do they work?',
    answer: 'Tokenized assets are digital representations of real-world assets on the blockchain. Each token represents fractional ownership of physical commodities like crude oil, gold, or real estate. Benefits include: 24/7 trading, fractional ownership (invest with smaller amounts), instant settlement, transparent pricing, and global accessibility. Tokens are backed 1:1 by physical assets held in secure custody.',
    category: 'Tokens',
    helpful: 345
  },
  {
    id: 'tokens-2',
    question: 'How do I tokenize my own assets?',
    answer: 'To tokenize assets: 1) Submit asset details via "Tokenize Asset" form. 2) Our team conducts due diligence and valuation. 3) Legal documentation and smart contract creation. 4) Asset custody arrangement established. 5) Tokens minted and listed on marketplace. Minimum asset value: $100,000. Process takes 2-4 weeks. Contact our tokenization team for consultation.',
    category: 'Tokens',
    helpful: 234
  },
  {
    id: 'tokens-3',
    question: 'Can I redeem tokens for physical assets?',
    answer: 'Yes, token holders can redeem for physical delivery: Minimum redemption thresholds apply (e.g., 1,000 barrels for crude oil), Submit redemption request through dashboard, Pay applicable delivery and handling fees, Arrange delivery logistics, Tokens are burned upon successful delivery. Redemption processing takes 5-10 business days.',
    category: 'Tokens',
    helpful: 267
  },
  {
    id: 'tokens-4',
    question: 'What blockchain are Digiwell tokens built on?',
    answer: 'Digiwell tokens are built on multiple blockchains for flexibility: Ethereum (ERC-20) for maximum compatibility, Polygon for lower transaction fees, Binance Smart Chain for Asian market access. All tokens follow industry standards and are audited by third-party security firms. Smart contracts are publicly verifiable on respective block explorers.',
    category: 'Tokens',
    helpful: 189
  },
  {
    id: 'tokens-5',
    question: 'How is token pricing determined?',
    answer: 'Token prices are determined by: Real-time commodity market prices from Bloomberg and Reuters feeds, Supply and demand on our P2P marketplace, Oracle price feeds for decentralized accuracy, and Daily NAV (Net Asset Value) calculations. Prices update every 15 seconds during market hours. Historical pricing data available in your trading dashboard.',
    category: 'Tokens',
    helpful: 212
  }
];

const categories = [
  { id: 'all', name: 'All Topics', icon: BookOpen, color: 'bg-slate-500' },
  { id: 'Trading', name: 'Trading', icon: TrendingUp, color: 'bg-blue-500' },
  { id: 'Payments', name: 'Payments', icon: CreditCard, color: 'bg-green-500' },
  { id: 'KYC', name: 'KYC & Verification', icon: Shield, color: 'bg-purple-500' },
  { id: 'Shipping', name: 'Shipping & Logistics', icon: Truck, color: 'bg-orange-500' },
  { id: 'Tokens', name: 'Tokens & Assets', icon: Coins, color: 'bg-amber-500' }
];

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

const FAQHelpCenter: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: '',
    email: '',
    attachments: ''
  });
  const [submittedTickets, setSubmittedTickets] = useState<Ticket[]>([
    {
      id: 'TKT-2024-001',
      subject: 'Unable to complete withdrawal',
      category: 'Payments',
      priority: 'high',
      status: 'in_progress',
      createdAt: '2026-01-12'
    },
    {
      id: 'TKT-2024-002',
      subject: 'KYC document resubmission',
      category: 'KYC',
      priority: 'medium',
      status: 'resolved',
      createdAt: '2026-01-10'
    }
  ]);
  const [helpfulFaqs, setHelpfulFaqs] = useState<Set<string>>(new Set());

  const filteredFaqs = faqData.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket: Ticket = {
      id: `TKT-2024-${String(submittedTickets.length + 3).padStart(3, '0')}`,
      subject: ticketForm.subject,
      category: ticketForm.category,
      priority: ticketForm.priority,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setSubmittedTickets([newTicket, ...submittedTickets]);
    setTicketModalOpen(false);
    setTicketForm({
      subject: '',
      category: '',
      priority: 'medium',
      description: '',
      email: '',
      attachments: ''
    });
    toast({
      title: 'Ticket Submitted',
      description: `Your support ticket ${newTicket.id} has been created. We'll respond within 24 hours.`,
    });
  };

  const markHelpful = (faqId: string) => {
    if (!helpfulFaqs.has(faqId)) {
      setHelpfulFaqs(new Set([...helpfulFaqs, faqId]));
      toast({
        title: 'Thank you!',
        description: 'Your feedback helps us improve our help center.',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-500">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-900 via-slate-900 to-purple-900 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-slate-800/30 opacity-20"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">Help Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How Can We <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Help You?</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Find answers to frequently asked questions or contact our support team for personalized assistance.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search for answers... (e.g., 'KYC verification', 'withdrawal fees')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 text-lg bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'FAQ Articles', value: faqData.length, icon: FileText },
            { label: 'Categories', value: '5', icon: BookOpen },
            { label: 'Avg Response Time', value: '< 2hrs', icon: Clock },
            { label: 'Satisfaction Rate', value: '98%', icon: CheckCircle }
          ].map((stat, index) => (
            <Card key={index} className="bg-slate-800/80 backdrop-blur border-slate-700">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <stat.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 ${
                selectedCategory === category.id 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.name}
              {category.id !== 'all' && (
                <Badge variant="secondary" className="ml-1 bg-slate-700 text-slate-300">
                  {faqData.filter(f => f.category === category.id).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto">
          {filteredFaqs.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                <p className="text-slate-400 mb-4">
                  We couldn't find any FAQs matching your search. Try different keywords or browse by category.
                </p>
                <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {filteredFaqs.map((faq) => {
                const categoryInfo = categories.find(c => c.id === faq.category);
                return (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-start gap-4 text-left">
                        <div className={`p-2 rounded-lg ${categoryInfo?.color || 'bg-slate-500'}`}>
                          {categoryInfo && <categoryInfo.icon className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-medium text-lg">{faq.question}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {faq.category}
                            </Badge>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {faq.helpful + (helpfulFaqs.has(faq.id) ? 1 : 0)} found helpful
                            </span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="pl-14">
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </p>
                        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-700">
                          <span className="text-sm text-slate-400">Was this helpful?</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markHelpful(faq.id)}
                            disabled={helpfulFaqs.has(faq.id)}
                            className={`border-slate-600 ${helpfulFaqs.has(faq.id) ? 'bg-green-500/20 text-green-400' : 'text-slate-300 hover:bg-slate-700'}`}
                          >
                            {helpfulFaqs.has(faq.id) ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Thanks!
                              </>
                            ) : (
                              'Yes'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTicketModalOpen(true)}
                            className="text-slate-400 hover:text-white"
                          >
                            No, I need more help
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

      {/* Contact Support Section */}
      <div className="bg-slate-800/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Still Need Help?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our support team is available 24/7 to assist you with any questions or issues.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Live Chat */}
            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50 hover:border-blue-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Live Chat</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Chat with our support team in real-time for immediate assistance.
                </p>
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Available Now
                </div>
              </CardContent>
            </Card>

            {/* Email Support */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-700/50 hover:border-purple-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Email Support</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Send us an email and we'll respond within 24 hours.
                </p>
                <a href="mailto:support@digiwelltrading.com" className="text-purple-400 text-sm hover:underline">
                  support@digiwelltrading.com
                </a>
              </CardContent>
            </Card>

            {/* Phone Support */}
            <Card className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 border-amber-700/50 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Phone className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Phone Support</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Speak directly with our support specialists.
                </p>
                <a href="tel:+2348098480088" className="text-amber-400 text-sm hover:underline">
                  +234 809 848 0088
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Support Tickets Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Your Support Tickets</h2>
              <p className="text-slate-400">Track and manage your submitted support requests.</p>
            </div>
            <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Send className="w-4 h-4 mr-2" />
                  Submit New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white">Submit Support Ticket</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Describe your issue and our team will get back to you within 24 hours.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTicketSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={ticketForm.email}
                      onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                      placeholder="your@email.com"
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject" className="text-slate-300">Subject</Label>
                    <Input
                      id="subject"
                      required
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="text-slate-300">Category</Label>
                      <Select
                        value={ticketForm.category}
                        onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {categories.filter(c => c.id !== 'all').map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="text-white">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority" className="text-slate-300">Priority</Label>
                      <Select
                        value={ticketForm.priority}
                        onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="low" className="text-white">Low</SelectItem>
                          <SelectItem value="medium" className="text-white">Medium</SelectItem>
                          <SelectItem value="high" className="text-white">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-slate-300">Description</Label>
                    <Textarea
                      id="description"
                      required
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      placeholder="Please provide detailed information about your issue..."
                      rows={5}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTicketModalOpen(false)}
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-4 h-4 mr-2" />
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {submittedTickets.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No tickets yet</h3>
                <p className="text-slate-400 mb-4">
                  You haven't submitted any support tickets. If you need help, click the button above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submittedTickets.map((ticket) => (
                <Card key={ticket.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-700 rounded-lg">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-mono text-slate-500">{ticket.id}</span>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <h4 className="text-white font-medium">{ticket.subject}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                            <span>{ticket.category}</span>
                            <span>Created: {ticket.createdAt}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-r from-blue-900/30 via-slate-900 to-purple-900/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">Quick Resources</h2>
            <p className="text-slate-400">Helpful links to get you started</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: BookOpen, label: 'Getting Started Guide', color: 'text-blue-400' },
              { icon: Shield, label: 'Security Best Practices', color: 'text-green-400' },
              { icon: Zap, label: 'API Documentation', color: 'text-amber-400' },
              { icon: Headphones, label: 'Video Tutorials', color: 'text-purple-400' }
            ].map((link, index) => (
              <Card 
                key={index} 
                className="bg-slate-800/50 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer group"
              >
                <CardContent className="p-4 text-center">
                  <link.icon className={`w-8 h-8 ${link.color} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
                  <p className="text-sm text-slate-300">{link.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQHelpCenter;
