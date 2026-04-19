/**
 * Metric calculator — computes all derived metrics from cleaned data.
 * All KPI cards display LTM (Last Twelve Months) figures.
 */

/**
 * Compute derived metrics for each row.
 */
export function computeMetrics(data) {
  return data.map((row, i) => {
    const ebitda = row.revenue - row.cogs - row.opex;
    const grossMargin = row.revenue > 0 ? ((row.revenue - row.cogs) / row.revenue) * 100 : 0;
    const ebitdaMargin = row.revenue > 0 ? (ebitda / row.revenue) * 100 : 0;
    const arpu = row.customers > 0 ? row.revenue / row.customers : 0;
    const opexPctRevenue = row.revenue > 0 ? (row.opex / row.revenue) * 100 : 0;
    const grossProfit = row.revenue - row.cogs;

    // MoM growth rates
    let revenueMoM = null;
    let customerMoM = null;
    if (i > 0 && data[i - 1].revenue > 0) {
      revenueMoM = ((row.revenue - data[i - 1].revenue) / data[i - 1].revenue) * 100;
    }
    if (i > 0 && data[i - 1].customers > 0) {
      customerMoM = ((row.customers - data[i - 1].customers) / data[i - 1].customers) * 100;
    }

    // Customer decomposition
    let retainedCustomers = null;
    let lostCustomers = null;
    if (row.newCustomers !== null && row.newCustomers !== undefined) {
      retainedCustomers = row.customers - row.newCustomers;
      if (i > 0) {
        lostCustomers = Math.max(0, data[i - 1].customers + row.newCustomers - row.customers);
      }
    }

    return {
      ...row,
      ebitda,
      grossProfit,
      grossMargin,
      ebitdaMargin,
      arpu,
      opexPctRevenue,
      revenueMoM,
      customerMoM,
      retainedCustomers,
      lostCustomers,
    };
  });
}

/**
 * Compute LTM (Last Twelve Months) summary metrics.
 */
export function computeLTMMetrics(metricsData) {
  const n = metricsData.length;
  if (n === 0) return null;

  const latest = metricsData[n - 1];
  const hasLTM = n >= 12;
  const ltmStart = hasLTM ? n - 12 : 0;
  const ltmSlice = metricsData.slice(ltmStart);

  // LTM sums
  const ltmRevenue = ltmSlice.reduce((s, r) => s + r.revenue, 0);
  const ltmCOGS = ltmSlice.reduce((s, r) => s + r.cogs, 0);
  const ltmOpEx = ltmSlice.reduce((s, r) => s + r.opex, 0);
  const ltmEBITDA = ltmRevenue - ltmCOGS - ltmOpEx;
  const ltmGrossMargin = ltmRevenue > 0 ? ((ltmRevenue - ltmCOGS) / ltmRevenue) * 100 : 0;
  const ltmEBITDAMargin = ltmRevenue > 0 ? (ltmEBITDA / ltmRevenue) * 100 : 0;

  // Prior LTM (for YoY comparison)
  let priorLTMRevenue = null;
  let priorLTMCOGS = null;
  let priorLTMOpEx = null;
  let priorLTMEBITDA = null;
  let priorLTMGrossMargin = null;
  let priorLTMEBITDAMargin = null;
  let priorCustomers = null;
  let priorARPU = null;

  if (n >= 24) {
    const priorSlice = metricsData.slice(n - 24, n - 12);
    priorLTMRevenue = priorSlice.reduce((s, r) => s + r.revenue, 0);
    priorLTMCOGS = priorSlice.reduce((s, r) => s + r.cogs, 0);
    priorLTMOpEx = priorSlice.reduce((s, r) => s + r.opex, 0);
    priorLTMEBITDA = priorLTMRevenue - priorLTMCOGS - priorLTMOpEx;
    priorLTMGrossMargin = priorLTMRevenue > 0
      ? ((priorLTMRevenue - priorLTMCOGS) / priorLTMRevenue) * 100 : 0;
    priorLTMEBITDAMargin = priorLTMRevenue > 0
      ? (priorLTMEBITDA / priorLTMRevenue) * 100 : 0;
    priorCustomers = metricsData[n - 13].customers;
    priorARPU = metricsData[n - 13].arpu;
  } else if (n >= 13) {
    priorCustomers = metricsData[0].customers;
    priorARPU = metricsData[0].arpu;
  }

  // Growth rates
  const revenueGrowth = priorLTMRevenue && priorLTMRevenue > 0
    ? ((ltmRevenue - priorLTMRevenue) / priorLTMRevenue) * 100 : null;
  const customerGrowth = priorCustomers && priorCustomers > 0
    ? ((latest.customers - priorCustomers) / priorCustomers) * 100 : null;
  const arpuChange = priorARPU && priorARPU > 0
    ? ((latest.arpu - priorARPU) / priorARPU) * 100 : null;
  const gmDelta = priorLTMGrossMargin !== null
    ? ltmGrossMargin - priorLTMGrossMargin : null;
  const ebitdaMarginDelta = priorLTMEBITDAMargin !== null
    ? ltmEBITDAMargin - priorLTMEBITDAMargin : null;

  // Rule of 40 (for SaaS)
  const ruleOf40 = revenueGrowth !== null ? revenueGrowth + ltmEBITDAMargin : null;

  return {
    ltmRevenue,
    ltmCOGS,
    ltmOpEx,
    ltmEBITDA,
    ltmGrossMargin,
    ltmEBITDAMargin,
    latestCustomers: latest.customers,
    latestARPU: latest.arpu,
    revenueGrowth,
    customerGrowth,
    arpuChange,
    gmDelta,
    ebitdaMarginDelta,
    ruleOf40,
    priorLTMRevenue,
    priorLTMCOGS,
    priorLTMOpEx,
    priorLTMEBITDA,
    latestMonth: latest.dateLabel,
    dataMonths: n,
  };
}

/**
 * Compute EBITDA bridge: Prior LTM → Current LTM waterfall.
 */
export function computeEBITDABridge(metricsData) {
  const n = metricsData.length;
  if (n < 24) return null;

  const currentSlice = metricsData.slice(n - 12);
  const priorSlice = metricsData.slice(n - 24, n - 12);

  const priorRevenue = priorSlice.reduce((s, r) => s + r.revenue, 0);
  const currentRevenue = currentSlice.reduce((s, r) => s + r.revenue, 0);
  const priorCOGS = priorSlice.reduce((s, r) => s + r.cogs, 0);
  const currentCOGS = currentSlice.reduce((s, r) => s + r.cogs, 0);
  const priorOpEx = priorSlice.reduce((s, r) => s + r.opex, 0);
  const currentOpEx = currentSlice.reduce((s, r) => s + r.opex, 0);
  const priorEBITDA = priorRevenue - priorCOGS - priorOpEx;
  const currentEBITDA = currentRevenue - currentCOGS - currentOpEx;

  const deltaRevenue = currentRevenue - priorRevenue;
  const deltaCOGS = currentCOGS - priorCOGS;
  const deltaOpEx = currentOpEx - priorOpEx;

  return {
    priorEBITDA,
    deltaRevenue,
    deltaCOGS: -deltaCOGS, // negative impact shown
    deltaOpEx: -deltaOpEx, // negative impact shown
    currentEBITDA,
    items: [
      { name: 'Prior LTM EBITDA', value: priorEBITDA, isTotal: true },
      { name: 'Revenue Growth', value: deltaRevenue, isTotal: false },
      { name: 'COGS Impact', value: -deltaCOGS, isTotal: false },
      { name: 'OpEx Impact', value: -deltaOpEx, isTotal: false },
      { name: 'Current LTM EBITDA', value: currentEBITDA, isTotal: true },
    ],
  };
}

/**
 * Aggregate data by quarter.
 */
export function aggregateQuarterly(metricsData) {
  const quarterMap = {};

  metricsData.forEach((row) => {
    const q = Math.floor(row.date.getMonth() / 3);
    const year = row.date.getFullYear();
    const key = `Q${q + 1}-${String(year).slice(2)}`;

    if (!quarterMap[key]) {
      quarterMap[key] = {
        dateLabel: key,
        date: row.date,
        revenue: 0,
        cogs: 0,
        opex: 0,
        customers: 0,
        newCustomers: 0,
        arpu: 0,
        months: 0,
        hasNewCustomers: false,
      };
    }

    const entry = quarterMap[key];
    entry.revenue += row.revenue;
    entry.cogs += row.cogs;
    entry.opex += row.opex;
    entry.customers = row.customers; // end-of-quarter
    if (row.newCustomers !== null && row.newCustomers !== undefined) {
      entry.newCustomers += row.newCustomers;
      entry.hasNewCustomers = true;
    }
    entry.months++;
  });

  return Object.values(quarterMap).map((q) => {
    const ebitda = q.revenue - q.cogs - q.opex;
    return {
      dateLabel: q.dateLabel,
      date: q.date,
      revenue: q.revenue,
      cogs: q.cogs,
      opex: q.opex,
      ebitda,
      customers: q.customers,
      newCustomers: q.hasNewCustomers ? q.newCustomers : null,
      arpu: q.customers > 0 ? q.revenue / q.customers : 0,
      grossMargin: q.revenue > 0 ? ((q.revenue - q.cogs) / q.revenue) * 100 : 0,
      ebitdaMargin: q.revenue > 0 ? (ebitda / q.revenue) * 100 : 0,
      opexPctRevenue: q.revenue > 0 ? (q.opex / q.revenue) * 100 : 0,
      retainedCustomers: q.hasNewCustomers ? q.customers - q.newCustomers : null,
      lostCustomers: null,
    };
  });
}

/**
 * Compute revenue CAGR.
 */
export function computeCAGR(metricsData) {
  if (metricsData.length < 2) return null;
  const first = metricsData[0].revenue;
  const last = metricsData[metricsData.length - 1].revenue;
  const years = metricsData.length / 12;
  if (first <= 0 || years <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

/**
 * Detect growth acceleration / deceleration using rolling 3M average.
 */
export function detectGrowthTrend(metricsData) {
  if (metricsData.length < 6) return 'insufficient_data';

  const growthRates = metricsData
    .map((r) => r.revenueMoM)
    .filter((r) => r !== null);

  if (growthRates.length < 6) return 'insufficient_data';

  const recent3 = growthRates.slice(-3).reduce((s, v) => s + v, 0) / 3;
  const prior3 = growthRates.slice(-6, -3).reduce((s, v) => s + v, 0) / 3;

  if (recent3 > prior3 + 0.5) return 'accelerating';
  if (recent3 < prior3 - 0.5) return 'decelerating';
  return 'stable';
}
