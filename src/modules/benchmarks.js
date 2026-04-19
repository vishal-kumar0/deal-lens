/**
 * Industry-specific benchmarks for PE diligence.
 * All thresholds sourced from 2024–2025 market research
 * (KeyBanc, SaaS Capital, PwC mid-market, Bain).
 */

const BENCHMARKS = {
  saas: {
    label: 'SaaS / Subscription Tech',
    icon: '💻',
    grossMargin: { green: 75, amber: 65, median: 72 },
    ebitdaMargin: { green: 15, amber: 5, median: 10 },
    revenueGrowth: { green: 30, amber: 15 },
    customerGrowth: { green: 20, amber: 10 },
    arpuChange: { green: 0, amber: -5 },
    gmDelta: { green: 0, amber: -3, red: -7 },
    useRuleOf40: true,
    notes: 'EBITDA margin assessed via Rule of 40 (Growth% + EBITDA% ≥ 40).',
  },
  ecommerce: {
    label: 'E-commerce / D2C',
    icon: '🛒',
    grossMargin: { green: 50, amber: 40, median: 45 },
    ebitdaMargin: { green: 10, amber: 5, median: 7 },
    revenueGrowth: { green: 25, amber: 10 },
    customerGrowth: { green: 20, amber: 8 },
    arpuChange: { green: 0, amber: -8 },
    gmDelta: { green: 0, amber: -4, red: -8 },
    useRuleOf40: false,
    notes: 'Gross margin below 40% is structurally problematic — insufficient room for logistics and returns.',
  },
  brick_mortar: {
    label: 'Brick & Mortar / Retail',
    icon: '🏪',
    grossMargin: { green: 35, amber: 25, median: 32 },
    ebitdaMargin: { green: 12, amber: 7, median: 10 },
    revenueGrowth: { green: 8, amber: 3 },
    customerGrowth: { green: 8, amber: 3 },
    arpuChange: { green: 2, amber: -3 },
    gmDelta: { green: 0, amber: -3, red: -6 },
    useRuleOf40: false,
    notes: 'Revenue growth below inflation (~3%) signals real decline. EBITDA below 7% makes debt service difficult.',
  },
  b2b_services: {
    label: 'B2B Services / Professional Services',
    icon: '🤝',
    grossMargin: { green: 45, amber: 30, median: 40 },
    ebitdaMargin: { green: 20, amber: 12, median: 17 },
    revenueGrowth: { green: 15, amber: 8 },
    customerGrowth: { green: 10, amber: 5 },
    arpuChange: { green: 0, amber: -5 },
    gmDelta: { green: 0, amber: -3, red: -6 },
    useRuleOf40: false,
    notes: 'Revenue growth below 8% often signals market saturation or client concentration risk.',
  },
  marketplace: {
    label: 'Marketplace / Platform',
    icon: '🔗',
    grossMargin: { green: 65, amber: 50, median: 60 },
    ebitdaMargin: { green: 15, amber: 5, median: 10 },
    revenueGrowth: { green: 30, amber: 15 },
    customerGrowth: { green: 20, amber: 10 },
    arpuChange: { green: 0, amber: -5 },
    gmDelta: { green: 0, amber: -4, red: -8 },
    useRuleOf40: true,
    notes: 'Take rate trends are critical. Declining ARPU may indicate competitive pressure on platform fees.',
  },
  tmt_media: {
    label: 'TMT / Media',
    icon: '📡',
    grossMargin: { green: 60, amber: 50, median: 58 },
    ebitdaMargin: { green: 18, amber: 10, median: 15 },
    revenueGrowth: { green: 12, amber: 5 },
    customerGrowth: { green: 10, amber: 5 },
    arpuChange: { green: 0, amber: -5 },
    gmDelta: { green: 0, amber: -3, red: -6 },
    useRuleOf40: false,
    notes: 'Subscriber/user growth is the leading indicator. Content costs are the primary margin lever.',
  },
  healthcare: {
    label: 'Healthcare / MedTech',
    icon: '🏥',
    grossMargin: { green: 55, amber: 40, median: 50 },
    ebitdaMargin: { green: 15, amber: 8, median: 12 },
    revenueGrowth: { green: 12, amber: 6 },
    customerGrowth: { green: 10, amber: 5 },
    arpuChange: { green: 0, amber: -5 },
    gmDelta: { green: 0, amber: -3, red: -6 },
    useRuleOf40: false,
    notes: 'Volume and payer mix are the primary drivers. Regulatory changes can materially shift margins.',
  },
  fmcg_cpg: {
    label: 'FMCG / CPG',
    icon: '📦',
    grossMargin: { green: 45, amber: 35, median: 42 },
    ebitdaMargin: { green: 15, amber: 8, median: 12 },
    revenueGrowth: { green: 8, amber: 3 },
    customerGrowth: { green: 5, amber: 1 },
    arpuChange: { green: 0, amber: -3 },
    gmDelta: { green: 0, amber: -3, red: -5 },
    useRuleOf40: false,
    notes: 'Volume growth below 1% in FMCG is a structural concern. Brand contribution margin is the key lever.',
  },
};

export const REVENUE_MODELS = {
  subscription: {
    label: 'Recurring / Subscription',
    description: 'Customers = subscribers. ARPU = MRR per user.',
    customerLabel: 'Subscribers',
    arpuLabel: 'MRR/Subscriber',
  },
  transactional: {
    label: 'Transactional / Usage-based',
    description: 'Customers = buyers/orders. ARPU = Avg Order Value.',
    customerLabel: 'Buyers',
    arpuLabel: 'Avg Order Value',
  },
  project: {
    label: 'Project-based / Lumpy',
    description: 'Revenue is episodic. Customer = client count.',
    customerLabel: 'Clients',
    arpuLabel: 'Revenue/Client',
  },
  hybrid: {
    label: 'Hybrid (Recurring + One-off)',
    description: 'ARPU is a blended signal.',
    customerLabel: 'Customers',
    arpuLabel: 'ARPU',
  },
};

export const DEAL_TYPES = {
  growth_equity: {
    label: 'Growth Equity',
    description: 'Growth rate, monetisation quality, market penetration',
    icon: '📈',
  },
  buyout: {
    label: 'Buyout / LBO',
    description: 'Cash generation, margin stability, debt serviceability',
    icon: '🏦',
  },
  distressed: {
    label: 'Distressed / Turnaround',
    description: 'Revenue floor, margin recovery, fixable problems',
    icon: '🔧',
  },
};

export function getBenchmark(businessType) {
  return BENCHMARKS[businessType] || BENCHMARKS.b2b_services;
}

export function getSignalColor(value, thresholds) {
  if (value >= thresholds.green) return 'green';
  if (value >= thresholds.amber) return 'amber';
  return 'red';
}

export function getMarginSignalColor(value, benchmark) {
  const diff = value - benchmark.grossMargin.median;
  if (diff >= 0) return 'green';
  if (diff >= -5) return 'amber';
  return 'red';
}

export default BENCHMARKS;
