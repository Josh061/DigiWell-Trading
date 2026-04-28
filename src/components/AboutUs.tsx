import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Globe, Users, Target, Eye, Award, Building2, MapPin, 
  Phone, Mail, Clock, ChevronRight,
  Briefcase, Shield, TrendingUp, Zap, Heart, Lightbulb,
  CheckCircle, Calendar, ArrowRight, Send, ExternalLink,
  Linkedin, Twitter
} from 'lucide-react';


// Animated counter hook
const useCountUp = (end: number, duration: number = 2000, startOnView: boolean = true) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) setHasStarted(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted) setHasStarted(true);
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, ref };
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
  linkedin_url: string;
  twitter_url: string;
  display_order: number;
  is_active: boolean;
}

const officeLocations = [
  { city: 'Lagos, Nigeria', address: 'Maben Terraces, Off Chevron Drive, Lekki', type: 'Global Headquarters', image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768344854748_faff566b.jpg', phone: '(+234) 809 848 0088', timezone: 'WAT (UTC+1)' },
  { city: 'London, UK', address: 'Canary Wharf, One Canada Square', type: 'European Operations', image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768344885616_913c2568.png', phone: '+44 20 7946 0958', timezone: 'GMT (UTC+0)' },
  { city: 'Dubai, UAE', address: 'DIFC, Gate Village Building 3', type: 'Middle East Hub', image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768344919669_8a4c605d.png', phone: '+971 4 123 4567', timezone: 'GST (UTC+4)' }
];

const companyValues = [
  { icon: Shield, title: 'Integrity', description: 'We conduct business with unwavering honesty and transparency, building trust with every transaction.' },
  { icon: Lightbulb, title: 'Innovation', description: 'We leverage cutting-edge AI and blockchain technology to revolutionize energy trading.' },
  { icon: Heart, title: 'Sustainability', description: 'We are committed to environmental responsibility and sustainable energy practices.' },
  { icon: Users, title: 'Collaboration', description: 'We believe in the power of partnerships and collective growth across borders.' },
  { icon: TrendingUp, title: 'Excellence', description: 'We strive for excellence in every aspect of our operations and service delivery.' },
  { icon: Zap, title: 'Agility', description: 'We adapt quickly to market changes and embrace new opportunities with confidence.' }
];

const milestones = [
  { year: '2018', title: 'Company Founded', description: 'Digiwell Exploration Limited established in Lagos, Nigeria' },
  { year: '2019', title: 'First Major Contract', description: 'Secured $50M crude oil trading contract with international partners' },
  { year: '2020', title: 'Digital Platform Launch', description: 'Launched AI-powered trading platform with blockchain integration' },
  { year: '2021', title: 'Global Expansion', description: 'Opened offices in London and Dubai, expanding global footprint' },
  { year: '2022', title: 'RWA Tokenization', description: 'Pioneered real-world asset tokenization for energy commodities' },
  { year: '2023', title: 'OilPrice.com Integration', description: 'Integrated live OilPrice.com API for real-time crude oil and petroleum pricing' },
  { year: '2024', title: '$1B Trading Volume', description: 'Achieved $1 billion in annual trading volume milestone' },
  { year: '2025', title: 'Digiwell Trading LLC', description: 'Launched dedicated trading entity for crude oil and RWAs' }
];

const certifications = [
  { name: 'OPEC Certified', description: 'Official OPEC trading certification' },
  { name: 'OilPrice.com', description: 'Live crude oil price feed partner' },
  { name: 'ISO 27001', description: 'Information security management' },
  { name: 'SEC Nigeria', description: 'Securities & Exchange Commission registered' },
  { name: 'NNPC Partner', description: 'Nigerian National Petroleum Corporation' },
  { name: 'Investing.com', description: 'RWA and metals price data partner' }
];

export default function AboutUs() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', department: 'general', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  const tradingVolume = useCountUp(1000, 2500);
  const clientsServed = useCountUp(500, 2000);
  const countriesReached = useCountUp(45, 1800);
  const teamMembersCount = useCountUp(150, 1500);

  // Fetch team members from database
  useEffect(() => {
    const fetchTeam = async () => {
      setTeamLoading(true);
      try {
        const { data } = await supabase
          .from('team_members')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        setTeamMembers(data || []);
      } catch (e) { console.error(e); }
      setTeamLoading(false);
    };
    fetchTeam();
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 3000);
    setContactForm({ name: '', email: '', department: 'general', message: '' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[500px] overflow-hidden">
        <img src="https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768344726151_403105a9.jpg" alt="Digiwell Trading" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-purple-900/80 to-blue-900/70">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
            <div className="max-w-3xl">
              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">About Digiwell Trading</Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Powering the <span className="text-[#D4AF37]">Future</span> of<br />Energy Trading
              </h1>
              <p className="text-xl text-slate-200 mb-8 leading-relaxed">
                Digiwell Trading LLC is an entity of Digiwell Exploration Limited, dedicated to trading crude oil, its derivatives, and other real-world assets (RWAs) through innovative AI and blockchain technology.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] px-8 py-6 text-lg font-semibold" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                  Get in Touch <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg" onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}>
                  Our Story
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Statistics */}
      <section className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div ref={tradingVolume.ref} className="text-center"><div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">${tradingVolume.count}M+</div><div className="text-slate-800 font-medium">Trading Volume</div></div>
            <div ref={clientsServed.ref} className="text-center"><div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">{clientsServed.count}+</div><div className="text-slate-800 font-medium">Clients Served</div></div>
            <div ref={countriesReached.ref} className="text-center"><div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">{countriesReached.count}+</div><div className="text-slate-800 font-medium">Countries Reached</div></div>
            <div ref={teamMembersCount.ref} className="text-center"><div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">{teamMembersCount.count}+</div><div className="text-slate-800 font-medium">Team Members</div></div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section id="story" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/50 mb-4">Our Story</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">An African Tale of <span className="text-[#D4AF37]">Transformation</span></h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>Our Digiwell story isn't one about energy exploits, commodity trading, or even real-world asset (RWAs) tokenization. It is a story about culture, heritage, and wealth creation.</p>
                <p>An African tale that meticulously documents decades of financial and economic oblivion into a whole new era of digital economy, financial growth, identity, sustainable energy, and infrastructural development.</p>
                <p>We are building bridges between traditional energy markets and the emerging digital economy, creating opportunities for wealth transfer and sustainable development across Africa and beyond.</p>
              </div>
            </div>
            <div className="relative">
              <img src="https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768344945978_1e52a5d5.png" alt="Digiwell Team Culture" className="rounded-2xl shadow-2xl" />
              <div className="absolute -bottom-6 -left-6 bg-[#D4AF37] text-slate-900 p-6 rounded-xl shadow-xl">
                <div className="text-3xl font-bold">7+</div><div className="text-sm font-medium">Years of Excellence</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gradient-to-br from-purple-900/50 to-blue-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50 mb-4">Our Purpose</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Mission & Vision</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden group hover:bg-white/15 transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Target className="w-8 h-8 text-[#D4AF37]" /></div>
                <h3 className="text-2xl font-bold text-white mb-4">Our Mission</h3>
                <p className="text-slate-300 text-lg leading-relaxed">To leverage artificial intelligence and cutting-edge technology to achieve a sustainable energy ecosystem with global footprints.</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden group hover:bg-white/15 transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-[#00D4FF]/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Eye className="w-8 h-8 text-[#00D4FF]" /></div>
                <h3 className="text-2xl font-bold text-white mb-4">Our Vision</h3>
                <p className="text-slate-300 text-lg leading-relaxed">To be a lead multinational energy player through the exploration and tokenization of real-world assets to drive the future digital economy.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Leadership & Executive Team */}
      <section className="py-20 bg-slate-900 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">Leadership & Executive Team</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Meet Our <span className="text-[#D4AF37]">Visionary Leaders</span></h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-lg">The experienced executives driving Digiwell's mission to transform energy trading through innovation, integrity, and global collaboration.</p>
          </div>

          {teamLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Loading leadership team...</p>
              </div>
            </div>
          ) : teamMembers.length > 0 ? (
            <>
              {/* CEO Feature Card - Full Width */}
              {teamMembers.filter(m => m.display_order === 1).map((ceo) => (
                <div key={ceo.id} className="mb-12">
                  <Card className="bg-gradient-to-r from-white/10 via-white/5 to-white/10 backdrop-blur-md border-[#D4AF37]/30 overflow-hidden group hover:border-[#D4AF37]/60 transition-all duration-500">
                    <div className="grid md:grid-cols-5 gap-0">
                      <div className="md:col-span-2 relative h-80 md:h-auto overflow-hidden">
                        {ceo.image_url ? (
                          <img
                            src={ceo.image_url}
                            alt={ceo.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ceo.name)}&size=400&background=D4AF37&color=1e293b&bold=true`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full min-h-[320px] bg-gradient-to-br from-[#D4AF37]/20 to-slate-800 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-32 h-32 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#D4AF37]/40">
                                <span className="text-5xl font-bold text-[#D4AF37]">{ceo.name.split(' ').map(n => n[0]).join('')}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/50 md:block hidden" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent md:hidden" />
                        {/* CEO Badge */}
                        <div className="absolute top-4 left-4">
                          <div className="flex items-center gap-2 bg-[#D4AF37] text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                            <Award className="w-3.5 h-3.5" />
                            <span>Chief Executive</span>
                          </div>
                        </div>
                        {ceo.linkedin_url && (
                          <a href={ceo.linkedin_url} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 z-10">
                            <div className="flex items-center gap-1 bg-[#0077B5] text-white px-2.5 py-1.5 rounded-full text-[11px] font-semibold shadow-lg hover:bg-[#005885] transition-colors">
                              <Linkedin className="w-3.5 h-3.5" />
                              <span>LinkedIn</span>
                            </div>
                          </a>
                        )}
                      </div>
                      <div className="md:col-span-3 p-8 md:p-10 flex flex-col justify-center">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{ceo.name}</h3>
                        <p className="text-[#D4AF37] text-lg font-semibold mb-4">{ceo.role}</p>
                        <div className="w-16 h-1 bg-gradient-to-r from-[#D4AF37] to-transparent rounded-full mb-5" />
                        {ceo.bio && <p className="text-slate-300 leading-relaxed text-base mb-6">{ceo.bio}</p>}
                        <div className="flex items-center gap-3">
                          {ceo.linkedin_url && (
                            <a href={ceo.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#0077B5]/20 rounded-lg hover:bg-[#0077B5]/40 transition-colors text-[#0077B5] text-sm font-medium">
                              <Linkedin className="w-4 h-4" />View LinkedIn Profile
                            </a>
                          )}
                          {ceo.twitter_url && (
                            <a href={ceo.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2]/20 rounded-lg hover:bg-[#1DA1F2]/40 transition-colors text-[#1DA1F2] text-sm font-medium">
                              <Twitter className="w-4 h-4" />Twitter
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}

              {/* Other C-Suite Members */}
              <div className="grid md:grid-cols-3 gap-8">
                {teamMembers.filter(m => m.display_order > 1).map((member) => (
                  <Card key={member.id} className="bg-white/5 backdrop-blur-md border-white/10 overflow-hidden group hover:border-[#D4AF37]/40 hover:bg-white/[0.08] transition-all duration-500 hover:shadow-xl hover:shadow-[#D4AF37]/5">
                    <div className="relative h-72 overflow-hidden">
                      {member.image_url ? (
                        <img
                          src={member.image_url}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=400&background=D4AF37&color=1e293b&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                          <div className="w-24 h-24 bg-[#D4AF37]/20 rounded-full flex items-center justify-center border-2 border-[#D4AF37]/30">
                            <span className="text-3xl font-bold text-[#D4AF37]">{member.name.split(' ').map(n => n[0]).join('')}</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
                      
                      {/* LinkedIn Verified Badge */}
                      {member.linkedin_url && (
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="absolute top-3 right-3 z-10">
                          <div className="flex items-center gap-1 bg-[#0077B5] text-white px-2 py-1 rounded-full text-[10px] font-semibold shadow-lg hover:bg-[#005885] transition-colors">
                            <Linkedin className="w-3 h-3" />
                            <span>LinkedIn</span>
                          </div>
                        </a>
                      )}

                      {/* Role Badge */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-3">
                          <h3 className="text-lg font-bold text-white leading-tight">{member.name}</h3>
                          <p className="text-[#D4AF37] text-sm font-medium mt-0.5">{member.role}</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      {member.bio && <p className="text-slate-400 text-sm line-clamp-4 mb-4 leading-relaxed">{member.bio}</p>}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        {member.linkedin_url && (
                          <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0077B5]/15 rounded-lg hover:bg-[#0077B5]/30 transition-colors text-[#0077B5] text-xs font-medium">
                            <Linkedin className="w-3.5 h-3.5" />LinkedIn
                          </a>
                        )}
                        {member.twitter_url && (
                          <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1DA1F2]/15 rounded-lg hover:bg-[#1DA1F2]/30 transition-colors text-[#1DA1F2] text-xs font-medium">
                            <Twitter className="w-3.5 h-3.5" />Twitter
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Leadership team information coming soon.</p>
            </div>
          )}
        </div>
      </section>


      {/* Company Values */}
      <section className="py-20 bg-gradient-to-br from-blue-900/50 to-purple-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">Our Values</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What Drives Us</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Our core values shape every decision we make and every relationship we build.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyValues.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="bg-white/5 backdrop-blur-md border-white/10 hover:border-[#D4AF37]/30 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-[#D4AF37]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                    <p className="text-slate-400">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Global Presence */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50 mb-4">Global Presence</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our <span className="text-[#D4AF37]">Office Locations</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Strategically positioned across three continents to serve our global clientele.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {officeLocations.map((office, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-md border-white/10 overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img src={office.image} alt={office.city} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  <Badge className="absolute top-4 left-4 bg-[#D4AF37] text-slate-900">{office.type}</Badge>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Globe className="w-5 h-5 text-[#00D4FF]" />{office.city}</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400 flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />{office.address}</p>
                    <p className="text-slate-400 flex items-center gap-2"><Phone className="w-4 h-4 text-slate-500" />{office.phone}</p>
                    <p className="text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" />{office.timezone}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-gradient-to-br from-purple-900/50 to-blue-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 mb-4">Certifications</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Industry <span className="text-[#D4AF37]">Certifications & Partnerships</span></h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {certifications.map((cert, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-md border-white/10 hover:border-green-500/30 hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-6 h-6 text-green-400" /></div>
                  <h3 className="text-white font-semibold text-sm mb-1">{cert.name}</h3>
                  <p className="text-slate-500 text-xs">{cert.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 mb-4">Our Journey</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Key <span className="text-[#D4AF37]">Milestones</span></h2>
          </div>
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#D4AF37] via-[#00D4FF] to-purple-500" />
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className={`relative flex items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-[#D4AF37] rounded-full transform -translate-x-1/2 z-10 ring-4 ring-slate-900" />
                  <div className={`ml-12 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-[#D4AF37]/30 transition-all duration-300 inline-block">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-2 justify-start md:justify-end">
                          <Calendar className="w-4 h-4 text-[#D4AF37]" /><span className="text-[#D4AF37] font-bold">{milestone.year}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{milestone.title}</h3>
                        <p className="text-slate-400 text-sm">{milestone.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-blue-900/50 to-purple-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50 mb-4">Get in Touch</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Contact <span className="text-[#D4AF37]">Our Team</span></h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-[#D4AF37]" />Headquarters</h3>
                  <div className="space-y-3">
                    <p className="text-slate-300 flex items-start gap-3"><MapPin className="w-5 h-5 text-[#00D4FF] mt-0.5" />Maben Terraces, Off Chevron Drive, Lekki, Lagos</p>
                    <p className="text-slate-300 flex items-center gap-3"><Phone className="w-5 h-5 text-[#00D4FF]" />(+234) 809 848 0088</p>
                    <p className="text-slate-300 flex items-center gap-3"><Globe className="w-5 h-5 text-[#00D4FF]" />www.digiwelltrading.com</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Mail className="w-5 h-5 text-[#D4AF37]" />Department Emails</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><div><p className="text-white font-medium">General Inquiries</p><p className="text-[#00D4FF] text-sm">info@digiwelltrading.com</p></div><ExternalLink className="w-4 h-4 text-slate-500" /></div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><div><p className="text-white font-medium">Customer Support</p><p className="text-[#00D4FF] text-sm">support@digiwelltrading.com</p></div><ExternalLink className="w-4 h-4 text-slate-500" /></div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><div><p className="text-white font-medium">Sales & Trading</p><p className="text-[#00D4FF] text-sm">sales@digiwelltrading.com</p></div><ExternalLink className="w-4 h-4 text-slate-500" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 backdrop-blur-md border-[#D4AF37]/30">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-[#D4AF37]" />Career Opportunities</h3>
                  <p className="text-slate-300 mb-4">Join our dynamic team and be part of the energy trading revolution.</p>
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg"><Mail className="w-5 h-5 text-[#D4AF37]" /><div><p className="text-white font-medium">Send your CV to:</p><p className="text-[#D4AF37]">career@digiwelltrading.com</p></div></div>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Send Us a Message</h3>
                {formSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-400" /></div>
                    <h4 className="text-xl font-bold text-white mb-2">Message Sent!</h4>
                    <p className="text-slate-400">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label><input type="text" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] transition-colors" placeholder="Enter your full name" required /></div>
                    <div><label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label><input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] transition-colors" placeholder="your@email.com" required /></div>
                    <div><label className="block text-sm font-medium text-slate-300 mb-2">Department</label><select value={contactForm.department} onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"><option value="general" className="bg-slate-800">General Inquiries</option><option value="sales" className="bg-slate-800">Sales & Trading</option><option value="support" className="bg-slate-800">Customer Support</option><option value="partnerships" className="bg-slate-800">Partnerships</option><option value="careers" className="bg-slate-800">Careers</option></select></div>
                    <div><label className="block text-sm font-medium text-slate-300 mb-2">Message</label><textarea value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} rows={5} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none" placeholder="How can we help you?" required /></div>
                    <Button type="submit" className="w-full bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] py-6 text-lg font-semibold"><Send className="w-5 h-5 mr-2" />Send Message</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[#D4AF37] to-[#B8941F]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Ready to Transform Your Energy Trading?</h2>
          <p className="text-slate-800 text-lg mb-8">Join hundreds of satisfied clients who trust Digiwell for their commodity trading needs.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-6 text-lg">Start Trading Today <ChevronRight className="ml-2 w-5 h-5" /></Button>
            <Button variant="outline" className="border-slate-900 text-slate-900 hover:bg-slate-900/10 px-8 py-6 text-lg">Schedule a Demo</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
