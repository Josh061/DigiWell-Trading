import { Filter, Calendar, Search } from 'lucide-react';

interface Props {
  type: string;
  setType: (t: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  search: string;
  setSearch: (s: string) => void;
}

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'tokenization', label: 'Tokenization' },
  { value: 'escrow_created', label: 'Escrow Created' },
  { value: 'escrow_released', label: 'Escrow Released' },
  { value: 'escrow_disputed', label: 'Escrow Disputed' },
  { value: 'token_purchase', label: 'Token Purchase' },
  { value: 'token_sale', label: 'Token Sale' },
  { value: 'portfolio_add', label: 'Portfolio Add' },
  { value: 'portfolio_remove', label: 'Portfolio Remove' }
];

export default function TradingHistoryFilters({ type, setType, startDate, setStartDate, endDate, setEndDate, search, setSearch }: Props) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-[#D4AF37]" />
        <h3 className="font-bold text-white">Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Transaction Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
            {TRANSACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-sm mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Start Date
          </label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div>
          <label className="block text-slate-400 text-sm mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> End Date
          </label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div>
          <label className="block text-slate-400 text-sm mb-1 flex items-center gap-1">
            <Search className="w-3 h-3" /> Search
          </label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
      </div>
    </div>
  );
}
