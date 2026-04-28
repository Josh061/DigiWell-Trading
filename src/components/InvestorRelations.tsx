import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingUp, DollarSign, BarChart3, Calendar, Download,
  FileText, Users, Globe, ChevronRight, Send, CheckCircle,
  Building2, Shield, ArrowRight, Briefcase, PieChart, Target,
  Award, Clock, Mail, Phone, ExternalLink
} from 'lucide-react';

// Animated counter hook
const useCountUp = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, duration, started]);

  return { count, ref };
};

const financialMetrics = [
  { label: 'Annual Revenue', value: 1200, suffix: 'M+', prefix: '$', icon: DollarSign, color: 'from-green-500 to-emerald-600' },
  { label: 'Trading Volume', value: 3500, suffix: 'M+', prefix: '$', icon: TrendingUp, color: 'from-blue-500 to-cyan-600' },
  { label: 'Active Investors', value: 2800, suffix: '+', prefix: '', icon: Users, color: 'from-purple-500 to-violet-600' },
  { label: 'Markets Served', value: 45, suffix: '+', prefix: '', icon: Globe, color: 'from-[#D4AF37] to-[#B8941F]' },
];

const quarterlyData = [
  { quarter: 'Q1 2025', revenue: '$280M', growth: '+12%', ebitda: '$42M' },
  { quarter: 'Q2 2025', revenue: '$310M', growth: '+18%', ebitda: '$48M' },
  { quarter: 'Q3 2025', revenue: '$295M', growth: '+15%', ebitda: '$45M' },
  { quarter: 'Q4 2025', revenue: '$340M', growth: '+22%', ebitda: '$55M' },
];

const annualReports = [
  { year: '2025', title: 'Annual Report 2025', size: '4.2 MB', type: 'PDF' },
  { year: '2024', title: 'Annual Report 2024', size: '3.8 MB', type: 'PDF' },
  { year: '2023', title: 'Annual Report 2023', size: '3.5 MB', type: 'PDF' },
  { year: '2022', title: 'Annual Report 2022', size: '3.1 MB', type: 'PDF' },
];

const upcomingEvents = [
  { date: 'Apr 15, 2026', title: 'Q1 2026 Earnings Call', type: 'Earnings', time: '2:00 PM WAT' },
  { date: 'May 20, 2026', title: 'Annual General Meeting', type: 'AGM', time: '10:00 AM WAT' },
  { date: 'Jun 10, 2026', title: 'Investor Day 2026', type: 'Conference', time: '9:00 AM WAT' },
  { date: 'Jul 15, 2026', title: 'Q2 2026 Earnings Call', type: 'Earnings', time: '2:00 PM WAT' },
];

const governanceItems = [
  { title: 'Board of Directors', description: '7-member board with independent majority', icon: Users },
  { title: 'Audit Committee', description: 'Quarterly financial review and compliance', icon: Shield },
  { title: 'Risk Management', description: 'Enterprise risk framework and controls', icon: Target },
  { title: 'ESG Commitment', description: 'Environmental, Social & Governance standards', icon: Award },
];

export default function InvestorRelations() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', inquiry_type: 'general', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const revenue = useCountUp(1200, 2500);
  const volume = useCountUp(3500, 2500);
  const investors = useCountUp(2800, 2000);
  const markets = useCountUp(45, 1800);
  const counters = [revenue, volume, investors, markets];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await supabase.from('investor_contacts').insert(contactForm);
      // Send notification
      try {
        await supabase.functions.invoke('sendgrid-notifications', {
          body: {
            action: 'send_email',
            to: 'investors@digiwelltrading.com',
            subject: `Investor Inquiry: ${contactForm.inquiry_type} from ${contactForm.name}`,
            content: `New investor inquiry:\n\nName: ${contactForm.name}\nEmail: ${contactForm.email}\nCompany: ${contactForm.company}\nType: ${contactForm.inquiry_type}\n\nMessage:\n${contactForm.message}`
          }
        });
      } catch (e) { console.log('Email notification error'); }
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      setContactForm({ name: '', email: '', company: '', inquiry_type: 'general', message: '' });
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[450px] overflow-hidden">
        <img src="https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768344885616_913c2568.png" alt="Investor Relations" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-blue-900/85 to-purple-900/75">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
            <div className="max-w-3xl">
              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">Investor Relations</Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Building <span className="text-[#D4AF37]">Value</span> for<br />Our Stakeholders
              </h1>
              <p className="text-xl text-slate-200 mb-8 leading-relaxed">
                Transparent reporting, strong governance, and consistent growth define our commitment to investors.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] px-8 py-6 text-lg font-semibold" onClick={() => document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' })}>
                  View Reports <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg" onClick={() => document.getElementById('contact-ir')?.scrollIntoView({ behavior: 'smooth' })}>
                  Contact IR Team
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Metrics */}
      <section className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {financialMetrics.map((metric, i) => {
              const counter = counters[i];
              return (
                <div key={i} ref={counter.ref} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                    {metric.prefix}{counter.count}{metric.suffix}
                  </div>
                  <div className="text-slate-800 font-medium">{metric.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quarterly Performance */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50 mb-4">Financial Performance</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Quarterly <span className="text-[#D4AF37]">Results</span></h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {quarterlyData.map((q, i) => (
              <Card key={i} className="bg-white/5 backdrop-blur-md border-white/10 hover:border-[#D4AF37]/30 transition-all group">
                <CardContent className="p-6 text-center">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mb-4">{q.quarter}</Badge>
                  <div className="text-3xl font-bold text-white mb-2">{q.revenue}</div>
                  <div className="text-green-400 font-semibold mb-3">{q.growth} YoY</div>
                  <div className="text-slate-400 text-sm">EBITDA: {q.ebitda}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Token Performance Chart Placeholder */}
          <Card className="mt-8 bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#D4AF37]" />DigiCoin Token Performance</h3>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-[#D4AF37]">$1.02</div>
                  <div className="text-slate-400 text-xs">Current Price</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">+24.5%</div>
                  <div className="text-slate-400 text-xs">YTD Return</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">$1.25B</div>
                  <div className="text-slate-400 text-xs">Market Cap</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-[#00D4FF]">850M</div>
                  <div className="text-slate-400 text-xs">Tokens in Circulation</div>
                </div>
              </div>
              {/* Chart bars */}
              <div className="flex items-end gap-2 h-40">
                {[65, 72, 58, 80, 75, 85, 70, 90, 82, 95, 88, 100].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full rounded-t bg-gradient-to-t from-[#D4AF37] to-[#D4AF37]/50 transition-all`} style={{ height: `${h}%` }} />
                    <span className="text-slate-500 text-[9px]">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Annual Reports */}
      <section id="reports" className="py-20 bg-gradient-to-br from-purple-900/50 to-blue-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">Reports & Filings</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Annual <span className="text-[#D4AF37]">Reports</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Download our comprehensive annual reports for detailed financial information.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {annualReports.map((report, i) => (
              <Card key={i} className="bg-white/5 backdrop-blur-md border-white/10 hover:border-[#D4AF37]/30 transition-all group cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-white font-bold mb-1">{report.title}</h3>
                  <p className="text-slate-400 text-sm mb-3">{report.type} - {report.size}</p>
                  <Button variant="outline" size="sm" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 w-full">
                    <Download className="w-4 h-4 mr-2" />Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Governance */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 mb-4">Governance</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Corporate <span className="text-[#D4AF37]">Governance</span></h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {governanceItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} className="bg-white/5 backdrop-blur-md border-white/10 hover:border-green-500/30 transition-all group">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-green-400" />
                    </div>
                    <h3 className="text-white font-bold mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 bg-gradient-to-br from-blue-900/50 to-purple-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50 mb-4">Events Calendar</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Upcoming <span className="text-[#D4AF37]">Events</span></h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {upcomingEvents.map((event, i) => (
              <Card key={i} className="bg-white/5 backdrop-blur-md border-white/10 hover:border-[#00D4FF]/30 transition-all">
                <CardContent className="p-6 flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#00D4FF]/20 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-[#00D4FF] mb-1" />
                    <span className="text-[#00D4FF] text-[10px] font-bold">{event.date.split(',')[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold">{event.title}</h3>
                      <Badge className={event.type === 'Earnings' ? 'bg-green-500/20 text-green-400' : event.type === 'AGM' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}>
                        {event.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Shareholder Information */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">Shareholder Info</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Shareholder <span className="text-[#D4AF37]">Information</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardContent className="p-6">
                <PieChart className="w-8 h-8 text-[#D4AF37] mb-4" />
                <h3 className="text-white font-bold mb-3">Ownership Structure</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Founders & Management', pct: 45, color: 'bg-[#D4AF37]' },
                    { label: 'Institutional Investors', pct: 30, color: 'bg-blue-500' },
                    { label: 'Retail Investors', pct: 15, color: 'bg-green-500' },
                    { label: 'Treasury', pct: 10, color: 'bg-purple-500' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-slate-400 text-sm flex-1">{item.label}</span>
                      <span className="text-white font-medium text-sm">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardContent className="p-6">
                <Briefcase className="w-8 h-8 text-[#00D4FF] mb-4" />
                <h3 className="text-white font-bold mb-3">Key Dates</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Dividend Record Date', date: 'Mar 31, 2026' },
                    { label: 'Dividend Payment', date: 'Apr 15, 2026' },
                    { label: 'Q1 Earnings', date: 'Apr 15, 2026' },
                    { label: 'AGM', date: 'May 20, 2026' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <span className="text-slate-400 text-sm">{item.label}</span>
                      <span className="text-white text-sm font-medium">{item.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardContent className="p-6">
                <DollarSign className="w-8 h-8 text-green-400 mb-4" />
                <h3 className="text-white font-bold mb-3">Dividend History</h3>
                <div className="space-y-3">
                  {[
                    { year: '2025', amount: '$0.85', yield: '3.2%' },
                    { year: '2024', amount: '$0.72', yield: '2.8%' },
                    { year: '2023', amount: '$0.60', yield: '2.4%' },
                    { year: '2022', amount: '$0.45', yield: '1.9%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <span className="text-slate-400 text-sm">{item.year}</span>
                      <div className="text-right">
                        <span className="text-white text-sm font-medium">{item.amount}/share</span>
                        <span className="text-green-400 text-xs ml-2">({item.yield})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact IR */}
      <section id="contact-ir" className="py-20 bg-gradient-to-br from-purple-900/50 to-blue-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50 mb-4">Contact Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Investor <span className="text-[#D4AF37]">Contact</span></h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-[#D4AF37]" />IR Department</h3>
                  <div className="space-y-3">
                    <p className="text-slate-300 flex items-center gap-3"><Mail className="w-5 h-5 text-[#00D4FF]" />investors@digiwelltrading.com</p>
                    <p className="text-slate-300 flex items-center gap-3"><Phone className="w-5 h-5 text-[#00D4FF]" />(+234) 809 848 0088</p>
                    <p className="text-slate-300 flex items-center gap-3"><Globe className="w-5 h-5 text-[#00D4FF]" />ir.digiwelltrading.com</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-[#D4AF37]" />SEC Filings</h3>
                  <p className="text-slate-300 mb-4">Access our regulatory filings and disclosures through the Securities and Exchange Commission Nigeria portal.</p>
                  <Button variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                    View SEC Filings <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Investor Inquiry</h3>
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Inquiry Submitted!</h4>
                    <p className="text-slate-400">Our IR team will respond within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                        <Input value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/20 text-white" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
                        <Input value={contactForm.company} onChange={e => setContactForm(p => ({ ...p, company: e.target.value }))} className="bg-white/5 border-white/20 text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <Input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} className="bg-white/5 border-white/20 text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Inquiry Type</label>
                      <select value={contactForm.inquiry_type} onChange={e => setContactForm(p => ({ ...p, inquiry_type: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                        <option value="general" className="bg-slate-800">General Inquiry</option>
                        <option value="financial" className="bg-slate-800">Financial Information</option>
                        <option value="governance" className="bg-slate-800">Corporate Governance</option>
                        <option value="dividend" className="bg-slate-800">Dividend Information</option>
                        <option value="token" className="bg-slate-800">Token/DigiCoin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                      <Textarea value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} rows={4} className="bg-white/5 border-white/20 text-white" required />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] py-6 text-lg font-semibold">
                      <Send className="w-5 h-5 mr-2" />{submitting ? 'Submitting...' : 'Submit Inquiry'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
