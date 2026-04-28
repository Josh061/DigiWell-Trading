/**
 * Comprehensive Application ID System for Digiwell Trading
 * 
 * Format: DW-{TYPE}-{YEAR}-{RANDOM5}-{SEQ2}
 * 
 * Types:
 *   PET = Petroleum Products (Crude Oil, Natural Gas, Fuel, etc.)
 *   RWA = Real World Assets (Gold, Silver, Lithium, Copper, Nickel, etc.)
 *   BLK = Bulk Orders (> 250,000 litres/barrels)
 * 
 * Examples:
 *   DW-PET-2026-A3K7M-04  (Petroleum product application)
 *   DW-RWA-2026-B8N2P-12  (Real World Asset application)
 *   DW-BLK-2026-C5R9T-07  (Bulk order > 250,000 litres/barrels)
 */

export const APPLICATION_TYPES = {
  PETROLEUM: 'PET',
  RWA: 'RWA',
  BULK: 'BLK',
} as const;

export type ApplicationType = typeof APPLICATION_TYPES[keyof typeof APPLICATION_TYPES];

// Product code to type mapping
const PETROLEUM_CODES = ['BRENT', 'WTI', 'BONNYLT', 'NATGAS', 'JETA1', 'PMS', 'LPG', 'AGO', 'LSFO'];
const RWA_CODES = ['GOLD', 'SILVER', 'LITHIUM', 'COPPER', 'NICKEL'];

// Broker commission constants (renamed from service fee)
export const BROKER_COMMISSION_RATE = 0.0087; // 0.87%
export const BULK_ORDER_VOLUME_THRESHOLD = 250000; // 250,000 litres/barrels

/** @deprecated Use BROKER_COMMISSION_RATE instead */
export const SERVICE_FEE_RATE = BROKER_COMMISSION_RATE;

/** @deprecated Use BULK_ORDER_VOLUME_THRESHOLD instead */
export const BULK_ORDER_THRESHOLD = BULK_ORDER_VOLUME_THRESHOLD;

export function getApplicationType(productCode: string, isRWA?: boolean, quantity?: number): ApplicationType {
  // Bulk is determined by volume (quantity in litres/barrels), not dollar amount
  if (quantity && quantity >= BULK_ORDER_VOLUME_THRESHOLD) {
    return APPLICATION_TYPES.BULK;
  }
  if (isRWA || RWA_CODES.includes(productCode?.toUpperCase())) {
    return APPLICATION_TYPES.RWA;
  }
  return APPLICATION_TYPES.PETROLEUM;
}

export function generateApplicationId(productCode: string, isRWA?: boolean, quantity?: number): string {
  const type = getApplicationType(productCode, isRWA, quantity);
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const seq = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  return `DW-${type}-${year}-${random}-${seq}`;
}

export function getApplicationTypeLabel(type: ApplicationType): string {
  switch (type) {
    case 'PET': return 'Petroleum Product';
    case 'RWA': return 'Real World Asset';
    case 'BLK': return 'Bulk Order';
    default: return 'Application';
  }
}

export function getApplicationTypeColor(type: ApplicationType): string {
  switch (type) {
    case 'PET': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'RWA': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'BLK': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function parseApplicationId(appId: string): { type: ApplicationType; year: number; code: string; seq: string } | null {
  const match = appId.match(/^DW-(PET|RWA|BLK)-(\d{4})-([A-Z0-9]{5})-(\d{2})$/);
  if (!match) return null;
  return {
    type: match[1] as ApplicationType,
    year: parseInt(match[2]),
    code: match[3],
    seq: match[4],
  };
}

export function calculateBrokerCommission(subtotal: number, isDigiCoin: boolean = false): number {
  if (isDigiCoin) return 0;
  return subtotal * BROKER_COMMISSION_RATE;
}

/** @deprecated Use calculateBrokerCommission instead */
export function calculateServiceFee(subtotal: number, isDigiCoin: boolean = false): number {
  return calculateBrokerCommission(subtotal, isDigiCoin);
}

export function calculateTotal(subtotal: number, isDigiCoin: boolean = false): number {
  return subtotal + calculateBrokerCommission(subtotal, isDigiCoin);
}

export function isBulkOrder(quantity: number): boolean {
  return quantity >= BULK_ORDER_VOLUME_THRESHOLD;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
