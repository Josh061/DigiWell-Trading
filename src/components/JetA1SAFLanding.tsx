import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plane, Leaf, ShieldCheck, Globe2, Droplets, Flame, Truck, Ship,
  Factory, Award, Mail, Phone, MapPin, CheckCircle2, Clock, TrendingUp,
  Fuel, Zap, Building2, AlertTriangle, Sparkles
} from 'lucide-react';

/**
 * SEO-optimized landing page for Digiwell Trading
 *  - Geo-targeted: Germany, UK, France, Netherlands, Australia
 *  - Target audience: Airline procurement managers, cargo operators, defense aviation buyers
 *  - Primary product: Jet A1 + SAF Blends (EU Aviation Compliance)
 *  - Secondary: Gasoline, Natural Gas, Diesel, Bonny Light Crude Oil
 */

const SEO_KEYWORDS = [
  'Jet A1 fuel supplier Europe',
  'SAF Sustainable Aviation Fuel blend',
  'bulk aviation fuel supply Germany UK France Netherlands',
  'EU aviation compliance Jet A1',
  'airline procurement Jet A1 quote',
  'defense aviation fuel supplier',
  'Bonny Light crude oil supplier',
  'Digiwell Trading aviation fuel',
  'Australian petroleum trader',
  'cargo operator Jet fuel Europe'
];

// Inject structured SEO metadata (Title, meta description, JSON-LD) into <head>
function injectSEO() {
  if (typeof document === 'undefined') return;
  document.title = 'Jet A1 + SAF Aviation Fuel Supplier Europe & Australia | Digiwell Trading';

  const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
    let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.setAttribute('content', content);
  };

  const description = 'Digiwell Trading is a trusted European & Australian supplier of Jet A1, SAF blends, gasoline, natural gas, diesel and Bonny Light crude oil. EU aviation compliance ready, bulk supply across Germany, UK, France and the Netherlands. Request a quote today.';

  setMeta('description', description);
  setMeta('keywords', SEO_KEYWORDS.join(', '));
  setMeta('robots', 'index,follow,max-image-preview:large');
  setMeta('author', 'Digiwell Trading');
  setMeta('geo.region', 'EU;AU');
  setMeta('geo.placename', 'Germany, United Kingdom, France, Netherlands, Australia');

  // Open Graph
  setMeta('og:title', 'Jet A1 + SAF Aviation Fuel Supplier Europe & Australia | Digiwell Trading', 'property');
  setMeta('og:description', description, 'property');
  setMeta('og:type', 'website', 'property');
  setMeta('og:url', 'https://www.digiwelltrading.com', 'property');
  setMeta('og:image', 'https://d64gsuwffb70l.cloudfront.net/690fa8a3adf6239abee77da1_1766142528242_9b5c6665.jpg', 'property');

  // Twitter
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', 'Jet A1 + SAF Aviation Fuel Supplier | Digiwell Trading');
  setMeta('twitter:description', description);

  // JSON-LD structured data
  let ld = document.getElementById('digiwell-ld-json');
  if (ld) ld.remove();
  ld = document.createElement('script');
  (ld as HTMLScriptElement).type = 'application/ld+json';
  ld.id = 'digiwell-ld-json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Digiwell Trading',
    url: 'https://www.digiwelltrading.com',
    logo: 'https://d64gsuwffb70l.cloudfront.net/690fa8a3adf6239abee77da1_1766142528242_9b5c6665.jpg',
    description,
    areaServed: ['Germany', 'United Kingdom', 'France', 'Netherlands', 'Australia', 'European Union'],
    sameAs: [],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Aviation & Petroleum Products',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Jet A1 Aviation Fuel' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'SAF (Sustainable Aviation Fuel) Blend' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Gasoline / PMS' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Natural Gas' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Diesel / AGO' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Bonny Light Crude Oil' } }
      ]
    }
  });
  document.head.appendChild(ld);
}

export default function JetA1SAFLanding() {
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', country: 'Germany',
    product: 'Jet A1', volume: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { injectSEO(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      // Persist lead (best-effort, don't fail if table policy rejects)
      await supabase.from('refinery_response_applications').insert({
        application_id: `LEAD-${Date.now()}`,
        applicant_name: form.name,
        applicant_email: form.email,
        applicant_phone: form.phone,
        company: form.company,
        country: form.country,
        product_requested: form.product,
        volume_requested: form.volume,
        additional_notes: form.notes,
        status: 'new_lead',
        source: 'jet-a1-saf-landing'
      } as any).then(() => null).catch(() => null);

      // CRM subscribe (mandatory for ALL email-collecting forms)
      try {
        await fetch('https://famous.ai/api/crm/69138b477443873c621b20e5/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            name: form.name,
            source: 'jet-a1-saf-landing',
            tags: ['aviation-fuel-quote', 'jet-a1', 'saf', form.country.toLowerCase(), form.product.toLowerCase().replace(/\s+/g, '-')]
          })
        });
      } catch (_) { /* swallow */ }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Submission failed, please email sales@digiwelltrading.com');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* HERO */}
      <section className="relative rounded-2xl overflow-hidden mb-8 border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" />
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative p-8 md:p-14">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"><Leaf className="w-3 h-3 mr-1" />EU Aviation Compliance Ready</Badge>
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"><Award className="w-3 h-3 mr-1" />OPEC-Certified Supplier</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/40"><Globe2 className="w-3 h-3 mr-1" />Europe • Australia</Badge>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Bulk <span className="text-[#D4AF37]">Jet A1 &amp; SAF Blends</span> for<br className="hidden md:inline" />
            European &amp; Australian Aviation
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mb-6">
            Digiwell Trading is a <strong className="text-white">trusted European and Australian supplier</strong> strategically positioned to
            deliver <strong>Jet A1 aviation fuel</strong> and <strong>Sustainable Aviation Fuel (SAF) blends</strong> across
            Germany, the United Kingdom, France and the Netherlands — with guaranteed EU compliance
            and dependable logistics for airlines, cargo operators and defense aviation buyers.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#quote">
              <Button size="lg" className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] font-bold">
                <Mail className="w-4 h-4 mr-2" />Request a Quote
              </Button>
            </a>
            <a href="#products">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Fuel className="w-4 h-4 mr-2" />View Products
              </Button>
            </a>
          </div>

          {/* trust strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              { icon: Plane, label: 'Jet A1 Bulk Supply', sub: 'Airport & tanker delivery' },
              { icon: Leaf, label: 'SAF Blends (up to 50%)', sub: 'CORSIA / RED II aligned' },
              { icon: ShieldCheck, label: 'EU Compliance', sub: 'DEF STAN 91-091 / ASTM D1655' },
              { icon: Clock, label: '48-72h Response', sub: 'Dedicated account manager' }
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4">
                <item.icon className="w-6 h-6 text-[#D4AF37] mb-2" />
                <div className="text-white font-semibold text-sm">{item.label}</div>
                <div className="text-white/60 text-xs">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section className="grid md:grid-cols-3 gap-4 mb-10">
        {[
          { icon: Plane, title: 'Airline Procurement Managers', text: 'Competitive index-linked pricing for commercial fleets with reliable quarterly uplift contracts across EU hubs.' },
          { icon: Truck, title: 'Cargo Operators', text: 'Dedicated bulk Jet A1 for freight carriers, overnight express and integrator fleets — hydrant and tanker options.' },
          { icon: ShieldCheck, title: 'Defense Aviation Buyers', text: 'Secure-chain supply of Jet A1 and F-34/F-35 equivalents for NATO-aligned operators and government aviation.' }
        ].map(c => (
          <div key={c.title} className="bg-slate-900/60 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all">
            <c.icon className="w-8 h-8 text-[#D4AF37] mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">{c.title}</h3>
            <p className="text-white/70 text-sm">{c.text}</p>
          </div>
        ))}
      </section>

      {/* GEO-TARGETING */}
      <section className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 md:p-8 mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Globe2 className="w-7 h-7 text-[#00D4FF]" />
          Strategic Delivery Across Europe &amp; Australia
        </h2>
        <p className="text-white/70 mb-6">Geo-targeted bulk supply with direct access to major refinery corridors and aviation hubs.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { country: 'Germany', hubs: 'Frankfurt, Munich, Hamburg', flag: '🇩🇪' },
            { country: 'United Kingdom', hubs: 'Heathrow, Gatwick, Stansted', flag: '🇬🇧' },
            { country: 'France', hubs: 'Paris CDG, Lyon, Marseille', flag: '🇫🇷' },
            { country: 'Netherlands', hubs: 'Amsterdam Schiphol, Rotterdam', flag: '🇳🇱' },
            { country: 'Australia', hubs: 'Sydney, Melbourne, Perth', flag: '🇦🇺' }
          ].map(g => (
            <div key={g.country} className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl p-4 text-center hover:scale-105 transition-transform">
              <div className="text-3xl mb-1">{g.flag}</div>
              <div className="text-white font-bold">{g.country}</div>
              <div className="text-white/60 text-xs mt-1">{g.hubs}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCT CATALOG */}
      <section id="products" className="mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-2">
          <Fuel className="w-7 h-7 text-[#D4AF37]" />
          Full Fuel &amp; Energy Portfolio
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Plane, name: 'Jet A1 Aviation Fuel', spec: 'DEF STAN 91-091 / ASTM D1655', highlight: 'Primary', color: 'from-blue-500/20 to-cyan-500/20' },
            { icon: Leaf, name: 'SAF Blends', spec: 'Up to 50% HEFA/PtL blend • CORSIA eligible', highlight: 'Sustainable', color: 'from-emerald-500/20 to-green-500/20' },
            { icon: Droplets, name: 'Bonny Light Crude Oil', spec: '35.4° API • 0.14% Sulphur', highlight: 'Premium', color: 'from-amber-500/20 to-orange-500/20' },
            { icon: Flame, name: 'Natural Gas (LNG/CNG)', spec: 'HH / TTF / NBP indexed', highlight: null, color: 'from-indigo-500/20 to-blue-500/20' },
            { icon: Zap, name: 'Gasoline / PMS', spec: 'EN 228 compliant', highlight: null, color: 'from-red-500/20 to-pink-500/20' },
            { icon: Truck, name: 'Diesel / AGO', spec: 'EN 590 Ultra-Low Sulphur', highlight: null, color: 'from-slate-500/20 to-zinc-500/20' }
          ].map(p => (
            <div key={p.name} className={`bg-gradient-to-br ${p.color} border border-white/10 rounded-xl p-5 hover:scale-105 transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <p.icon className="w-8 h-8 text-white" />
                {p.highlight && <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">{p.highlight}</Badge>}
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{p.name}</h3>
              <p className="text-white/60 text-xs mb-3">{p.spec}</p>
              <a href="#quote">
                <Button size="sm" variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">
                  Request Quote
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* WHY DIGIWELL */}
      <section className="grid md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Factory, t: 'Direct Refinery Access', d: 'Allocation from Rotterdam, Antwerp, Hamburg & Fujairah refinery corridors.' },
          { icon: Ship, t: 'Multi-Modal Logistics', d: 'Pipeline, tanker, barge and rail — door-to-wing delivery.' },
          { icon: ShieldCheck, t: 'Full Compliance', d: 'REACH, CORSIA, EU RED II, DEF STAN 91-091, ASTM D1655 / D7566.' },
          { icon: TrendingUp, t: 'Index-Linked Pricing', d: 'Platts Jet CIF NWE, Argus, or fixed-price contracts.' }
        ].map(v => (
          <div key={v.t} className="bg-slate-900/60 border border-white/10 rounded-xl p-5">
            <v.icon className="w-7 h-7 text-emerald-400 mb-3" />
            <h4 className="text-white font-bold mb-1">{v.t}</h4>
            <p className="text-white/70 text-sm">{v.d}</p>
          </div>
        ))}
      </section>

      {/* QUOTE FORM */}
      <section id="quote" className="bg-gradient-to-br from-slate-900 to-blue-950 border border-[#D4AF37]/30 rounded-2xl p-6 md:p-10 mb-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 mb-3">
              <Sparkles className="w-3 h-3 mr-1" />Bulk Aviation Fuel Supply
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Request a Quote Today</h2>
            <p className="text-white/80 mb-6">
              Our procurement specialists will respond within <strong className="text-[#D4AF37]">48 hours</strong> with
              a detailed quote, delivery schedule and compliance documentation.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-white/80"><Mail className="w-5 h-5 text-[#D4AF37]" />sales@digiwelltrading.com</div>
              <div className="flex items-center gap-3 text-white/80"><Phone className="w-5 h-5 text-[#D4AF37]" />+44 20 3807 9900 (EU) • +61 2 8311 0600 (AU)</div>
              <div className="flex items-center gap-3 text-white/80"><MapPin className="w-5 h-5 text-[#D4AF37]" />Rotterdam • London • Sydney</div>
              <div className="flex items-center gap-3 text-white/80"><Building2 className="w-5 h-5 text-[#D4AF37]" />www.digiwelltrading.com</div>
            </div>

            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" />What we need from you
              </div>
              <ul className="text-white/70 text-sm space-y-1 ml-6 list-disc">
                <li>Company ICAO / AOC number (for aviation buyers)</li>
                <li>Uplift airport(s) or delivery terminal</li>
                <li>Estimated monthly volume (m³ or metric tons)</li>
                <li>Preferred pricing basis (Platts / Argus / fixed)</li>
              </ul>
            </div>
          </div>

          <div>
            {submitted ? (
              <div className="bg-emerald-500/10 border border-emerald-400/40 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Quote Request Received</h3>
                <p className="text-white/70 mb-4">Thank you {form.name || 'for your interest'}. A Digiwell Trading specialist will contact you within 48 hours at {form.email}.</p>
                <Button onClick={() => { setSubmitted(false); setForm({ ...form, name: '', volume: '', notes: '' }); }} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Submit Another Request
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3 bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="John Smith" /></Field>
                  <Field label="Company *"><input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="input" placeholder="Airline Ltd" /></Field>
                </div>
                <Field label="Business Email *"><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="procurement@airline.com" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+44 ..." /></Field>
                  <Field label="Country *">
                    <select required value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="input">
                      {['Germany', 'United Kingdom', 'France', 'Netherlands', 'Australia', 'Belgium', 'Italy', 'Spain', 'Austria', 'Switzerland', 'Other EU', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Product *">
                    <select required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} className="input">
                      {['Jet A1', 'SAF Blend', 'Jet A1 + SAF Mix', 'Bonny Light Crude', 'Natural Gas', 'Gasoline / PMS', 'Diesel / AGO'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Volume"><input value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value })} className="input" placeholder="e.g. 50,000 m³/month" /></Field>
                </div>
                <Field label="Notes"><textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input resize-none" placeholder="Delivery terminal, contract length, pricing basis..." /></Field>

                {error && (
                  <div className="bg-red-500/10 border border-red-400/40 rounded-lg p-3 flex items-start gap-2 text-red-200 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />{error}
                  </div>
                )}

                <Button type="submit" disabled={submitting} className="w-full bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] font-bold">
                  {submitting ? 'Submitting…' : 'Request a Quote'}
                </Button>
                <p className="text-white/50 text-xs text-center">By submitting you agree to be contacted by Digiwell Trading. We never share your data.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ for SEO */}
      <section className="mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            { q: 'Does Digiwell Trading supply Jet A1 fuel across Europe?', a: 'Yes. We have the capacity to deliver Jet A1 fuel across Europe with guaranteed compliance to DEF STAN 91-091 and ASTM D1655, with dependable logistics through major refinery corridors in Rotterdam, Antwerp, Hamburg and beyond.' },
            { q: 'Are your SAF blends EU aviation compliance ready?', a: 'All our SAF blends are CORSIA-eligible and aligned with EU RED II sustainability criteria. We supply HEFA and Power-to-Liquid blends up to 50% with full certification and mass-balance accounting.' },
            { q: 'What minimum order volumes do you accept?', a: 'Typical minimums are 5,000 m³ for Jet A1 spot deliveries and 500 m³ for SAF blends. Contract supply starts from 50,000 m³/month. Contact us for smaller trial shipments.' },
            { q: 'Which airports can you deliver to?', a: 'We deliver into all major European airport fuel farms including Heathrow, CDG, Schiphol, Frankfurt, Munich, Hamburg, Gatwick, Stansted, Charleroi, Liège, and Australian gateways Sydney, Melbourne and Perth via tanker or pipeline.' },
            { q: 'How do I request a bulk aviation fuel quote?', a: 'Complete the quote form above or email sales@digiwelltrading.com with your ICAO/AOC number, uplift location, volume and preferred pricing basis. We respond within 48 hours.' }
          ].map(f => (
            <details key={f.q} className="bg-slate-900/60 border border-white/10 rounded-xl p-4 group">
              <summary className="text-white font-semibold cursor-pointer flex items-center justify-between">
                {f.q}<span className="text-[#D4AF37] group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
              </summary>
              <p className="text-white/70 mt-3 text-sm">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-white/70 mb-1">{label}</span>
      {children}
      <style>{`
        .input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 0.5rem;
          padding: 0.55rem 0.75rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border 0.15s;
        }
        .input:focus { border-color: #D4AF37; background: rgba(255,255,255,0.1); }
        .input::placeholder { color: rgba(255,255,255,0.35); }
        .input option { background: #0f172a; color: white; }
      `}</style>
    </label>
  );
}
