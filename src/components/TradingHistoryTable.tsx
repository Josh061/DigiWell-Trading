import { ArrowUpRight, ArrowDownRight, FileText, Shield, Coins, Briefcase } from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: string;
  commodity_symbol?: string;
  commodity_name?: string;
  quantity?: number;
  unit_price?: number;
  total_value?: number;
  counterparty_name?: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface Props {
  transactions: Transaction[];
  loading: boolean;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  tokenization: { icon: Coins, color: 'text-purple-400', label: 'Tokenization' },
  escrow_created: { icon: Shield, color: 'text-blue-400', label: 'Escrow Created' },
  escrow_released: { icon: Shield, color: 'text-green-400', label: 'Escrow Released' },
  escrow_disputed: { icon: Shield, color: 'text-red-400', label: 'Escrow Disputed' },
  token_purchase: { icon: ArrowDownRight, color: 'text-green-400', label: 'Token Purchase' },
  token_sale: { icon: ArrowUpRight, color: 'text-red-400', label: 'Token Sale' },
  portfolio_add: { icon: Briefcase, color: 'text-cyan-400', label: 'Portfolio Add' },
  portfolio_remove: { icon: Briefcase, color: 'text-amber-400', label: 'Portfolio Remove' }
};

export default function TradingHistoryTable({ transactions, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
        <FileText className="w-16 h-16 mx-auto text-slate-600 mb-4" />
        <p className="text-slate-400">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-400 text-sm bg-slate-900/50">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Commodity</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Counterparty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const config = TYPE_CONFIG[tx.transaction_type] || { icon: FileText, color: 'text-slate-400', label: tx.transaction_type };
              const Icon = config.icon;
              return (
                <tr key={tx.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-2 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white">{tx.commodity_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{tx.quantity?.toLocaleString() || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{tx.unit_price ? `$${tx.unit_price.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3 text-[#D4AF37] font-medium">{tx.total_value ? `$${tx.total_value.toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3 text-slate-400">{tx.counterparty_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{tx.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
