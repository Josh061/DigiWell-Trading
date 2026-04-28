export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  priceSource: string;
  availableQuantity: number;
  minOrderQuantity: number;
  image: string;
  change: number;
  isRWA?: boolean; // Real World Asset flag
}

export const products: Product[] = [
  // Energy Products
  {
    id: '1',
    name: 'Brent Crude Oil',
    code: 'BRENT',
    category: 'Crude Oil',
    description: 'North Sea Brent crude oil benchmark - Premium grade crude oil',
    unit: 'barrel',
    price: 79.25,
    priceSource: 'OilPrice.com',
    availableQuantity: 500000,
    minOrderQuantity: 1000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: 1.25
  },
  {
    id: '2',
    name: 'WTI Crude Oil',
    code: 'WTI',
    category: 'Crude Oil',
    description: 'West Texas Intermediate crude oil - US benchmark',
    unit: 'barrel',
    price: 75.10,
    priceSource: 'OilPrice.com',
    availableQuantity: 450000,
    minOrderQuantity: 1000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: -0.85
  },
  {
    id: '13',
    name: 'Bonny Light Crude Oil',
    code: 'BONNYLT',
    category: 'Crude Oil',
    description: 'Nigerian Bonny Light sweet crude oil - Low sulphur, high API gravity premium grade for refining',
    unit: 'barrel',
    price: 82.40,
    priceSource: 'OilPrice.com',
    availableQuantity: 350000,
    minOrderQuantity: 1000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: 1.68
  },
  {
    id: '3',
    name: 'Natural Gas',
    code: 'NATGAS',
    category: 'Natural Gas',
    description: 'Henry Hub natural gas - Clean energy fuel',
    unit: 'MMBtu',
    price: 2.92,
    priceSource: 'OilPrice.com',
    availableQuantity: 1000000,
    minOrderQuantity: 5000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: 2.15
  },
  {
    id: '4',
    name: 'Aviation Fuel (Jet A-1)',
    code: 'JETA1',
    category: 'Aviation Fuel',
    description: 'International aviation turbine fuel - Jet fuel standard',
    unit: 'gallon',
    price: 2.52,
    priceSource: 'OilPrice.com',
    availableQuantity: 200000,
    minOrderQuantity: 5000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: 0.45
  },
  {
    id: '5',
    name: 'Premium Motor Spirit (PMS)',
    code: 'PMS',
    category: 'Gasoline',
    description: 'Premium petrol/gasoline - High octane fuel',
    unit: 'liter',
    price: 0.88,
    priceSource: 'OilPrice.com',
    availableQuantity: 800000,
    minOrderQuantity: 10000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: -0.32
  },
  {
    id: '6',
    name: 'Liquefied Petroleum Gas (LPG)',
    code: 'LPG',
    category: 'LPG',
    description: 'Propane and butane mixture - Cooking and heating gas',
    unit: 'kg',
    price: 0.68,
    priceSource: 'OilPrice.com',
    availableQuantity: 300000,
    minOrderQuantity: 5000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: 1.85
  },
  {
    id: '7',
    name: 'Automotive Gas Oil (AGO)',
    code: 'AGO',
    category: 'Diesel',
    description: 'Diesel fuel for automotive use - Heavy duty fuel',
    unit: 'liter',
    price: 0.95,
    priceSource: 'OilPrice.com',
    availableQuantity: 600000,
    minOrderQuantity: 10000,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: 0.78
  },
  {
    id: '8',
    name: 'Low Sulphur Fuel Oil',
    code: 'LSFO',
    category: 'Fuel Oil',
    description: 'Marine fuel oil with low sulphur content - IMO compliant',
    unit: 'metric ton',
    price: 492.50,
    priceSource: 'OilPrice.com',
    availableQuantity: 100000,
    minOrderQuantity: 500,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888613603_6f97c63b.webp',
    change: -1.25
  },
  // Real World Assets (RWAs) - Precious Metals & Minerals
  {
    id: '9',
    name: 'Gold (XAU)',
    code: 'GOLD',
    category: 'Precious Metals',
    description: 'Pure gold bullion - 99.99% purity LBMA certified',
    unit: 'troy oz',
    price: 2024.50,
    priceSource: 'Investing.com',
    availableQuantity: 50000,
    minOrderQuantity: 1,
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800',
    change: 0.85,
    isRWA: true
  },
  {
    id: '10',
    name: 'Silver (XAG)',
    code: 'SILVER',
    category: 'Precious Metals',
    description: 'Pure silver bullion - 99.9% purity LBMA certified',
    unit: 'troy oz',
    price: 23.45,
    priceSource: 'Investing.com',
    availableQuantity: 200000,
    minOrderQuantity: 100,
    image: 'https://images.unsplash.com/photo-1589787168422-c6e1e5c5e5e5?w=800',
    change: 1.25,
    isRWA: true
  },
  {
    id: '11',
    name: 'Lithium Carbonate',
    code: 'LITHIUM',
    category: 'Industrial Minerals',
    description: 'Battery-grade lithium carbonate - 99.5% purity for EV batteries',
    unit: 'metric ton',
    price: 13250.00,
    priceSource: 'Investing.com',
    availableQuantity: 5000,
    minOrderQuantity: 1,
    image: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800',
    change: -2.15,
    isRWA: true
  },
  {
    id: '12',
    name: 'Copper (HG)',
    code: 'COPPER',
    category: 'Industrial Metals',
    description: 'High-grade copper cathode - 99.99% purity LME Grade A certified for industrial and electrical applications',
    unit: 'metric ton',
    price: 8945.00,
    priceSource: 'Investing.com',
    availableQuantity: 25000,
    minOrderQuantity: 5,
    image: 'https://images.unsplash.com/photo-1605557626902-2abe34b01f73?w=800',
    change: 1.42,
    isRWA: true
  },
  {
    id: '14',
    name: 'Nickel (NI)',
    code: 'NICKEL',
    category: 'Industrial Metals',
    description: 'Class 1 nickel - 99.8% purity LME certified for stainless steel, EV batteries and aerospace applications',
    unit: 'metric ton',
    price: 16320.00,
    priceSource: 'Investing.com',
    availableQuantity: 15000,
    minOrderQuantity: 5,
    image: 'https://images.unsplash.com/photo-1605557626902-2abe34b01f73?w=800',
    change: 0.92,
    isRWA: true
  }
];

export const getProductById = (id: string): Product | undefined => {
  return products.find(p => p.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(p => p.category === category);
};

export const getEnergyProducts = (): Product[] => {
  return products.filter(p => !p.isRWA);
};

export const getRWAProducts = (): Product[] => {
  return products.filter(p => p.isRWA);
};
export const categories = [...new Set(products.map(p => p.category))];
