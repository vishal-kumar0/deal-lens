import { getBenchmark } from './benchmarks';

export function generateInsights(ltm, metricsData, businessType, dealType, qualitative = null, customerPanelData = null) {
  const bench = getBenchmark(businessType);
  const baseSignals = generateAtomicSignals(ltm, bench);
  const qualSignals = qualitative ? generateQualitativeSignals(qualitative) : [];
  const cpSignals = customerPanelData ? generateCustomerPanelSignals(customerPanelData) : [];
  const signals = [...baseSignals, ...qualSignals, ...cpSignals];
  const order = { red: 0, amber: 1, green: 2 };
  signals.sort((a, b) => order[a.severity] - order[b.severity]);

  const composites = generateCompositeInsights(ltm, signals, bench);
  let thesis = generateDealThesis(ltm, signals, composites, bench, dealType, businessType);
  let watchList = generateWatchList(ltm);

  if (qualitative) {
    watchList = [...watchList, ...generateQualitativeWatchItems(qualitative)];
    thesis = augmentThesisWithQualitative(thesis, qualitative);
  }

  return { signals, composites, thesis, watchList };
}

function generateCustomerPanelSignals(cpData) {
  const signals = [];
  if (!cpData || cpData.length === 0) return signals;

  // NRR signals — use last 3 months average if available
  const nrrRows = cpData.filter((r) => r.nrr > 0);
  if (nrrRows.length > 0) {
    const recent = nrrRows.slice(-3);
    const avgNRR = recent.reduce((s, r) => s + r.nrr, 0) / recent.length;
    const fmtNRR = avgNRR.toFixed(1);
    if (avgNRR >= 120) {
      signals.push({ category: 'retention', severity: 'green', text: `Net Revenue Retention of ${fmtNRR}% — expansion revenue more than offsets churn; cohort economics improving over time` });
    } else if (avgNRR >= 100) {
      signals.push({ category: 'retention', severity: 'amber', text: `Net Revenue Retention of ${fmtNRR}% — stable cohorts but limited upsell momentum; expansion revenue approximately offsets churn` });
    } else {
      signals.push({ category: 'retention', severity: 'red', text: `Net Revenue Retention of ${fmtNRR}% — revenue base is shrinking net of churn; requires top-of-funnel growth to offset cohort decay` });
    }
  }

  // GRR signals
  const grrRows = cpData.filter((r) => r.grr > 0);
  if (grrRows.length > 0) {
    const recent = grrRows.slice(-3);
    const avgGRR = recent.reduce((s, r) => s + r.grr, 0) / recent.length;
    const fmtGRR = avgGRR.toFixed(1);
    if (avgGRR >= 90) {
      signals.push({ category: 'retention', severity: 'green', text: `Gross Revenue Retention of ${fmtGRR}% — minimal gross churn; base recurring revenue is sticky` });
    } else if (avgGRR >= 80) {
      signals.push({ category: 'retention', severity: 'amber', text: `Gross Revenue Retention of ${fmtGRR}% — moderate gross churn; validate whether losses are concentrated in a specific segment or cohort` });
    } else {
      signals.push({ category: 'retention', severity: 'red', text: `Gross Revenue Retention of ${fmtGRR}% — elevated gross churn; underlying retention is weak independent of expansion` });
    }
  }

  // Customer churn signals — compute trailing 3-month avg churn rate
  const churnRows = cpData.filter((r) => r.churnedCustomers !== undefined && r.activeCustomers > 0);
  if (churnRows.length >= 3) {
    const recent = churnRows.slice(-3);
    const avgChurnRate = recent.reduce((s, r) => s + (r.churnedCustomers / r.activeCustomers) * 100, 0) / recent.length;
    const annualised = avgChurnRate * 12;
    if (annualised < 10) {
      signals.push({ category: 'retention', severity: 'green', text: `Annualised logo churn of ${annualised.toFixed(1)}% — low attrition supports durable ARR base` });
    } else if (annualised < 20) {
      signals.push({ category: 'retention', severity: 'amber', text: `Annualised logo churn of ${annualised.toFixed(1)}% — in-line with mid-market benchmarks but warrants cohort-level investigation` });
    } else {
      signals.push({ category: 'retention', severity: 'red', text: `Annualised logo churn of ${annualised.toFixed(1)}% — materially elevated; growth is treadmill-dependent on continuous new logo acquisition` });
    }
  }

  return signals;
}

function generateQualitativeSignals(q) {
  const signals = [];
  if (q.managementRating !== null && q.managementRating < 3) {
    signals.push({ category: 'qualitative', severity: 'red', text: `Analyst flagged management quality concerns (rated ${q.managementRating}/5) — succession planning and leadership depth require diligence` });
  }
  if (q.marketDynamics === 'contracting') {
    signals.push({ category: 'qualitative', severity: 'red', text: 'Analyst assesses market dynamics as contracting — validate whether revenue growth represents share gain against a shrinking TAM' });
  }
  if (q.moats.includes('none')) {
    signals.push({ category: 'qualitative', severity: 'amber', text: 'No competitive moat identified by analyst — pricing power and customer retention durability are unvalidated' });
  }
  return signals;
}

function generateQualitativeWatchItems(q) {
  const items = [];
  if (q.managementRating !== null && q.managementRating < 3) {
    items.push({ claim: `Management quality rated ${q.managementRating}/5`, question: 'Obtain references for the CEO and CFO. Map key-person dependencies. Evaluate whether board composition and potential leadership upgrades post-acquisition can mitigate the identified risk.' });
  }
  if (q.marketDynamics === 'contracting') {
    items.push({ claim: 'Analyst flagged contracting market dynamics', question: 'Quantify addressable market trajectory using independent market data (IBISWorld, Euromonitor, or sector-specific reports). Determine whether the company can grow share faster than the market shrinks, and at what customer acquisition cost.' });
  }
  return items;
}

function augmentThesisWithQualitative(thesis, q) {
  if (q.moats.includes('none')) {
    return thesis + ' [Analyst note: no identifiable competitive moat — the investment thesis is dependent on continued execution rather than structural defensibility.]';
  }
  return thesis;
}

/**
 * Atomic signals — single metric observations with severity.
 */
function generateAtomicSignals(ltm, bench) {
  const signals = [];

  // Revenue growth
  if (ltm.revenueGrowth !== null) {
    if (ltm.revenueGrowth >= bench.revenueGrowth.green) {
      signals.push({ category: 'growth', severity: 'green', text: `LTM revenue growth of ${fmt(ltm.revenueGrowth)}% — strong topline momentum` });
    } else if (ltm.revenueGrowth >= bench.revenueGrowth.amber) {
      signals.push({ category: 'growth', severity: 'amber', text: `LTM revenue growth of ${fmt(ltm.revenueGrowth)}% — moderate pace` });
    } else if (ltm.revenueGrowth >= 0) {
      signals.push({ category: 'growth', severity: 'amber', text: `LTM revenue growth of ${fmt(ltm.revenueGrowth)}% — below sector benchmark` });
    } else {
      signals.push({ category: 'growth', severity: 'red', text: `Revenue has declined ${fmt(Math.abs(ltm.revenueGrowth))}% LTM — topline is contracting` });
    }
  }

  // Customer growth
  if (ltm.customerGrowth !== null) {
    if (ltm.customerGrowth >= bench.customerGrowth.green) {
      signals.push({ category: 'customers', severity: 'green', text: `Customer base expanded ${fmt(ltm.customerGrowth)}% — strong acquisition` });
    } else if (ltm.customerGrowth >= bench.customerGrowth.amber) {
      signals.push({ category: 'customers', severity: 'amber', text: `Customer growth of ${fmt(ltm.customerGrowth)}% — steady but not accelerating` });
    } else if (ltm.customerGrowth > 0) {
      signals.push({ category: 'customers', severity: 'amber', text: `Customer growth of ${fmt(ltm.customerGrowth)}% — decelerating` });
    } else {
      signals.push({ category: 'customers', severity: 'red', text: `Customer base is shrinking (${fmt(ltm.customerGrowth)}%)` });
    }
  }

  // ARPU change
  if (ltm.arpuChange !== null) {
    if (ltm.arpuChange >= bench.arpuChange.green) {
      signals.push({ category: 'efficiency', severity: 'green', text: `ARPU improved ${fmt(ltm.arpuChange)}% — monetisation strengthening` });
    } else if (ltm.arpuChange >= bench.arpuChange.amber) {
      signals.push({ category: 'efficiency', severity: 'amber', text: `ARPU declined ${fmt(Math.abs(ltm.arpuChange))}% — modest pricing pressure` });
    } else {
      signals.push({ category: 'efficiency', severity: 'red', text: `ARPU declined ${fmt(Math.abs(ltm.arpuChange))}% — significant pricing erosion` });
    }
  }

  // Gross margin vs benchmark
  if (ltm.ltmGrossMargin >= bench.grossMargin.green) {
    signals.push({ category: 'efficiency', severity: 'green', text: `LTM gross margin of ${fmt(ltm.ltmGrossMargin)}% — above ${bench.label} median of ${bench.grossMargin.median}%` });
  } else if (ltm.ltmGrossMargin >= bench.grossMargin.amber) {
    signals.push({ category: 'efficiency', severity: 'amber', text: `LTM gross margin of ${fmt(ltm.ltmGrossMargin)}% — in-line with ${bench.label} range` });
  } else {
    signals.push({ category: 'efficiency', severity: 'red', text: `LTM gross margin of ${fmt(ltm.ltmGrossMargin)}% — below ${bench.label} median of ${bench.grossMargin.median}%` });
  }

  // GM trend
  if (ltm.gmDelta !== null) {
    if (ltm.gmDelta >= bench.gmDelta.green) {
      signals.push({ category: 'efficiency', severity: 'green', text: `Gross margin expanded ${fmt(Math.abs(ltm.gmDelta))}pp LTM — operating leverage evident` });
    } else if (ltm.gmDelta >= bench.gmDelta.amber) {
      signals.push({ category: 'efficiency', severity: 'amber', text: `Gross margin compressed ${fmt(Math.abs(ltm.gmDelta))}pp LTM` });
    } else {
      signals.push({ category: 'efficiency', severity: 'red', text: `Gross margin compressed ${fmt(Math.abs(ltm.gmDelta))}pp LTM — significant erosion` });
    }
  }

  // EBITDA
  if (bench.useRuleOf40 && ltm.ruleOf40 !== null) {
    if (ltm.ruleOf40 >= 40) {
      signals.push({ category: 'efficiency', severity: 'green', text: `Rule of 40 score: ${fmt(ltm.ruleOf40)} — above threshold` });
    } else if (ltm.ruleOf40 >= 25) {
      signals.push({ category: 'efficiency', severity: 'amber', text: `Rule of 40 score: ${fmt(ltm.ruleOf40)} — below 40 threshold` });
    } else {
      signals.push({ category: 'efficiency', severity: 'red', text: `Rule of 40 score: ${fmt(ltm.ruleOf40)} — well below threshold` });
    }
  } else {
    if (ltm.ltmEBITDAMargin >= bench.ebitdaMargin.green) {
      signals.push({ category: 'efficiency', severity: 'green', text: `EBITDA margin of ${fmt(ltm.ltmEBITDAMargin)}% — strong operating profitability` });
    } else if (ltm.ltmEBITDAMargin >= bench.ebitdaMargin.amber) {
      signals.push({ category: 'efficiency', severity: 'amber', text: `EBITDA margin of ${fmt(ltm.ltmEBITDAMargin)}% — acceptable but below sector best-in-class` });
    } else {
      signals.push({ category: 'efficiency', severity: 'red', text: `EBITDA margin of ${fmt(ltm.ltmEBITDAMargin)}% — below sector benchmark of ${bench.ebitdaMargin.median}%` });
    }
  }

  // EBITDA margin trend
  if (ltm.ebitdaMarginDelta !== null) {
    if (ltm.ebitdaMarginDelta > 0) {
      signals.push({ category: 'efficiency', severity: 'green', text: `EBITDA margin improved ${fmt(ltm.ebitdaMarginDelta)}pp — operating leverage building` });
    } else if (ltm.ebitdaMarginDelta > -3) {
      signals.push({ category: 'efficiency', severity: 'amber', text: `EBITDA margin declined ${fmt(Math.abs(ltm.ebitdaMarginDelta))}pp — margin structure weakening` });
    } else {
      signals.push({ category: 'efficiency', severity: 'red', text: `EBITDA margin declined ${fmt(Math.abs(ltm.ebitdaMarginDelta))}pp — significant margin deterioration` });
    }
  }

  // Retention proxy: revenue vs customer growth divergence
  if (ltm.revenueGrowth !== null && ltm.customerGrowth !== null) {
    if (ltm.revenueGrowth > 0 && ltm.customerGrowth < 0) {
      signals.push({
        category: 'customers',
        severity: 'red',
        text: 'Revenue growing while customer base shrinks — fragile, extraction-driven growth',
      });
    }
  }

  // Sort by severity: red first
  const order = { red: 0, amber: 1, green: 2 };
  signals.sort((a, b) => order[a.severity] - order[b.severity]);

  return signals;
}

/**
 * Composite insights — multi-metric synthesis.
 */
function generateCompositeInsights(ltm, signals, bench) {
  const composites = [];

  const revUp = ltm.revenueGrowth !== null && ltm.revenueGrowth > 0;
  const custUp = ltm.customerGrowth !== null && ltm.customerGrowth > 5;
  const custFlat = ltm.customerGrowth !== null && ltm.customerGrowth <= 5 && ltm.customerGrowth >= -5;
  const arpuUp = ltm.arpuChange !== null && ltm.arpuChange > 0;
  const arpuDown = ltm.arpuChange !== null && ltm.arpuChange < -3;
  const gmDown = ltm.gmDelta !== null && ltm.gmDelta < -2;
  const gmUp = ltm.gmDelta !== null && ltm.gmDelta > 1;
  const gmStable = ltm.gmDelta !== null && Math.abs(ltm.gmDelta) <= 2;
  const ebitdaUp = ltm.ebitdaMarginDelta !== null && ltm.ebitdaMarginDelta > 0;
  const revDecelerating = ltm.revenueGrowth !== null && ltm.revenueGrowth < bench.revenueGrowth.amber;

  if (revUp && custUp && arpuUp && gmStable) {
    composites.push({
      severity: 'green',
      text: 'High-quality compounding: volume, pricing, and margin all moving in the right direction. Rare and investable at the right price.',
    });
  }

  if (revUp && custUp && arpuDown && gmDown) {
    composites.push({
      severity: 'red',
      text: 'Volume-dependent growth story. The business is acquiring customers but monetising them less effectively each period. Scale alone will not fix this — requires commercial intervention.',
    });
  }

  if (revUp && (custFlat || (ltm.customerGrowth !== null && ltm.customerGrowth < 0)) && arpuUp) {
    composites.push({
      severity: 'amber',
      text: 'Revenue is being extracted from an existing, non-growing base. Pricing power is present, but the absence of new customer growth is a structural fragility.',
    });
  }

  if (revUp && custUp && gmDown) {
    composites.push({
      severity: 'amber',
      text: 'Growth is being funded by margin. Investigate whether this is an investment phase (deliberate) or an efficiency problem (structural).',
    });
  }

  if (revDecelerating && arpuDown && gmDown) {
    composites.push({
      severity: 'red',
      text: 'Three-way pressure: slowing growth, eroding pricing, and compressing margins simultaneously. Requires a clear recovery thesis before investment can be underwritten.',
    });
  }

  if (gmUp && ebitdaUp && revUp) {
    composites.push({
      severity: 'green',
      text: 'Operating leverage is evident — the business is growing its top line while expanding margins, the hallmark of a scalable model.',
    });
  }

  if (ebitdaUp && !revUp) {
    composites.push({
      severity: 'amber',
      text: 'Margin improvement is being driven by cost efficiency, not top-line growth. Investigate whether this is sustainable or the result of cutting investment.',
    });
  }

  // Growth driver decomposition
  if (ltm.customerGrowth !== null && ltm.arpuChange !== null) {
    if (ltm.customerGrowth > ltm.arpuChange + 5) {
      composites.push({
        severity: 'amber',
        text: 'Growth is primarily volume-driven — customer expansion is outpacing monetisation improvement. Unit economics require attention.',
      });
    } else if (ltm.arpuChange > ltm.customerGrowth + 5) {
      composites.push({
        severity: 'amber',
        text: 'Growth is primarily price-driven — monetisation is improving but new customer acquisition is lagging.',
      });
    }
  }

  return composites;
}

/**
 * Generate deal thesis — Bain/MBB consulting style.
 * Hypothesis-first, assertive, specific numbers, no hedging.
 */
function generateDealThesis(ltm, signals, composites, bench, dealType) {
  const parts = [];

  if (dealType === 'growth_equity') {
    parts.push(generateGrowthEquityThesis(ltm, bench));
  } else if (dealType === 'buyout') {
    parts.push(generateBuyoutThesis(ltm));
  } else if (dealType === 'distressed') {
    parts.push(generateDistressedThesis(ltm, bench));
  }

  return parts.join(' ');
}

function generateGrowthEquityThesis(ltm, bench) {
  const parts = [];

  // Sentence 1: Headline verdict
  if (ltm.revenueGrowth >= bench.revenueGrowth.green && ltm.gmDelta >= 0) {
    parts.push(`This is a high-quality growth story — ${fmt(ltm.revenueGrowth)}% LTM revenue growth with stable-to-improving margins.`);
  } else if (ltm.revenueGrowth >= bench.revenueGrowth.amber && ltm.gmDelta < -2) {
    parts.push(`This is a growing but increasingly expensive business — ${fmt(ltm.revenueGrowth)}% LTM topline growth is real, but it is being purchased at declining unit economics.`);
  } else if (ltm.revenueGrowth < bench.revenueGrowth.amber) {
    parts.push(`Growth has decelerated to ${fmt(ltm.revenueGrowth)}% LTM, below the ${bench.label} benchmark of ${bench.revenueGrowth.amber}%, raising questions about the growth equity case.`);
  } else {
    parts.push(`The business is delivering ${fmt(ltm.revenueGrowth)}% LTM revenue growth, a credible pace for a growth equity conversation.`);
  }

  // Sentence 2: Growth driver
  if (ltm.customerGrowth !== null && ltm.arpuChange !== null) {
    if (ltm.customerGrowth > Math.abs(ltm.arpuChange)) {
      parts.push(`Customer additions of ${fmt(ltm.customerGrowth)}% are the primary growth driver, but ARPU has ${ltm.arpuChange >= 0 ? 'improved' : 'declined'} ${fmt(Math.abs(ltm.arpuChange))}% to ${fmtCurrency(ltm.latestARPU)}, ${ltm.arpuChange < 0 ? 'indicating the business is either targeting smaller accounts or discounting to win' : 'demonstrating pricing discipline'}.`);
    } else {
      parts.push(`Revenue growth is predominantly pricing-driven — ARPU has ${ltm.arpuChange >= 0 ? 'grown' : 'declined'} ${fmt(Math.abs(ltm.arpuChange))}% while customer growth stands at ${fmt(ltm.customerGrowth)}%.`);
    }
  }

  // Sentence 3: Efficiency
  parts.push(`Gross margins ${ltm.gmDelta >= 0 ? 'have held at' : 'have compressed to'} ${fmt(ltm.ltmGrossMargin)}%${ltm.gmDelta < 0 ? `, ${fmt(Math.abs(ltm.gmDelta))}pp below prior year` : ''}, ${ltm.ltmGrossMargin < bench.grossMargin.median ? `below the ${bench.label} median of ${bench.grossMargin.median}%` : `in-line with the ${bench.label} median`}.`);

  // Sentence 4: Synthesis
  if (ltm.revenueGrowth > 0 && ltm.gmDelta < -2) {
    parts.push(`The core tension: volume is expanding, but each unit of growth is generating less margin than the last — a trajectory that must be reversed for the equity story to hold.`);
  } else if (ltm.revenueGrowth > 0 && ltm.gmDelta >= 0) {
    parts.push(`Volume and margin are both moving in the right direction — the growth equity thesis is structurally sound.`);
  }

  // Sentence 5: Double-click (only where warranted)
  if (ltm.arpuChange < -3) {
    parts.push(`[Needs further double-click on ARPU decline driver and cost structure before a view can be formed on margin recovery potential.]`);
  }

  if (bench.useRuleOf40 && ltm.ruleOf40 !== null) {
    parts.push(`Rule of 40 score of ${fmt(ltm.ruleOf40)} ${ltm.ruleOf40 >= 40 ? 'supports' : 'does not support'} a premium growth equity valuation.`);
  }

  return parts.join(' ');
}

function generateBuyoutThesis(ltm) {
  const parts = [];

  // Sentence 1: Cash generation headline
  parts.push(`This business generates ${fmtCurrency(ltm.ltmRevenue)} in LTM revenue at a ${fmt(ltm.ltmEBITDAMargin)}% EBITDA margin, implying approximately ${fmtCurrency(ltm.ltmEBITDA)} in run-rate EBITDA.`);

  // Sentence 2: Leverage context
  const impliedDebt = ltm.ltmEBITDA * 6;
  const interestCost = impliedDebt * 0.09;
  const coverageRatio = ltm.ltmEBITDA > 0 ? ltm.ltmEBITDA / interestCost : 0;

  if (ltm.ltmEBITDA > 0) {
    parts.push(`At a conservative 6x leverage, the business would carry ~${fmtCurrency(impliedDebt)} in debt, requiring ~${fmtCurrency(interestCost)} in annual interest at 9% cost — implying a ${fmt(coverageRatio, 1)}x interest coverage ratio.${coverageRatio < 2.5 ? ' This is tight by PE standards; most buyout structurings target >2.5x.' : ' This provides reasonable coverage headroom.'}`);
  } else {
    parts.push(`EBITDA is negative — the business cannot currently support a leveraged structure.`);
  }

  // Sentence 3: Trajectory
  if (ltm.ebitdaMarginDelta !== null && ltm.ebitdaMarginDelta < -2) {
    parts.push(`The more material concern is trajectory: EBITDA margins have compressed ${fmt(Math.abs(ltm.ebitdaMarginDelta))}pp in twelve months, driven by both gross margin erosion${ltm.gmDelta !== null ? ` (${fmt(Math.abs(ltm.gmDelta))}pp)` : ''} and operating cost growth. If this trend continues, the business may not generate sufficient free cash flow to service a leveraged structure within 18–24 months.`);
  } else if (ltm.ebitdaMarginDelta !== null && ltm.ebitdaMarginDelta > 0) {
    parts.push(`Margin trajectory is positive — EBITDA margins have improved ${fmt(ltm.ebitdaMarginDelta)}pp LTM, suggesting operating leverage is building. This de-risks the debt structure.`);
  }

  // Sentence 4: Operating leverage assessment
  if (ltm.revenueGrowth !== null && ltm.ebitdaMarginDelta !== null) {
    if (ltm.ebitdaMarginDelta < 0 && ltm.revenueGrowth > 0) {
      parts.push(`Operating leverage is not evident — OpEx is rising proportionally with revenue, suggesting no fixed-cost scale benefit is being realised.`);
    }
  }

  // Double-click
  if (ltm.ebitdaMarginDelta !== null && ltm.ebitdaMarginDelta < -2) {
    parts.push(`[Needs further double-click: a detailed cost structure decomposition is required before a buyout structure can be sized with confidence.]`);
  }

  return parts.join(' ');
}

function generateDistressedThesis(ltm, bench) {
  const parts = [];

  // Sentence 1: Current state
  parts.push(`The business is generating ${fmtCurrency(ltm.ltmRevenue)} in revenue with a ${fmt(ltm.ltmEBITDAMargin)}% EBITDA margin${ltm.ebitdaMarginDelta !== null ? `, and the trajectory is ${ltm.ebitdaMarginDelta < 0 ? 'deteriorating' : 'stabilising'}` : ''}.`);

  // Sentence 2: Margin floor assessment
  if (ltm.ltmGrossMargin >= bench.grossMargin.amber) {
    parts.push(`Critically, the gross margin of ${fmt(ltm.ltmGrossMargin)}% — while ${ltm.ltmGrossMargin < bench.grossMargin.median ? 'below' : 'in-line with'} the ${bench.label} median — does suggest the unit economics of the core product remain viable.`);
  } else {
    parts.push(`Gross margin of ${fmt(ltm.ltmGrossMargin)}% is significantly below the ${bench.label} median of ${bench.grossMargin.median}%. The fundamental unit economics require restructuring.`);
  }

  // Sentence 3: Demand assessment
  if (ltm.customerGrowth !== null && ltm.customerGrowth > 0) {
    parts.push(`Customer count is still growing (+${fmt(ltm.customerGrowth)}%), which rules out a demand-side collapse — this appears to be an internal cost control problem, not a market problem.`);
  } else if (ltm.customerGrowth !== null) {
    parts.push(`Customer count has declined ${fmt(Math.abs(ltm.customerGrowth))}%, suggesting both demand weakness and operational challenges. The recovery thesis must address both.`);
  }

  // Sentence 4: Recovery thesis
  const targetEBITDAMargin = bench.ebitdaMargin.amber;
  if (ltm.ltmEBITDAMargin < targetEBITDAMargin) {
    parts.push(`Recovery thesis: stabilising ARPU and implementing OpEx discipline could restore EBITDA margins to ${targetEBITDAMargin}–${targetEBITDAMargin + 5}%, materially changing the return profile.`);
  } else {
    parts.push(`EBITDA margin remains at ${fmt(ltm.ltmEBITDAMargin)}%, providing a base from which recovery is possible without structural overhaul.`);
  }

  return parts.join(' ');
}

/**
 * Generate watch list — diligence questions tied to thesis claims.
 */
function generateWatchList(ltm) {
  const items = [];

  // ARPU decline → investigate driver
  if (ltm.arpuChange !== null && ltm.arpuChange < -3) {
    items.push({
      claim: `ARPU declined ${fmt(Math.abs(ltm.arpuChange))}%`,
      question: 'Determine whether ARPU decline is (a) a deliberate downmarket move, (b) sales discounting to hit volume targets, or (c) customer mix shift. Each has a different fix and a different impact on the investment case.',
    });
  }

  // GM compression → cost decomposition
  if (ltm.gmDelta !== null && ltm.gmDelta < -2) {
    items.push({
      claim: `Gross margin compressed ${fmt(Math.abs(ltm.gmDelta))}pp`,
      question: 'Decompose COGS movement: is cost-of-service rising per customer, or is revenue pricing declining on a fixed cost base? The former is structural; the latter may be manageable.',
    });
  }

  // EBITDA decline → operating leverage
  if (ltm.ebitdaMarginDelta !== null && ltm.ebitdaMarginDelta < -2) {
    items.push({
      claim: `EBITDA margin declined ${fmt(Math.abs(ltm.ebitdaMarginDelta))}pp`,
      question: 'Identify which OpEx line items are driving the increase. Is this investment in growth (S&M, R&D) or structural overhead (G&A, rent)? Growth investment is recoverable; structural overhead is not.',
    });
  }

  // Customer growth slowing
  if (ltm.customerGrowth !== null && ltm.customerGrowth < 10 && ltm.customerGrowth > 0) {
    items.push({
      claim: `Customer growth at ${fmt(ltm.customerGrowth)}%`,
      question: 'Assess whether customer growth deceleration is supply-constrained (capacity, geo) or demand-constrained (market saturation, competition). Supply constraints are fixable; demand constraints may not be.',
    });
  }

  // Revenue growing, customers shrinking
  if (ltm.revenueGrowth > 0 && ltm.customerGrowth !== null && ltm.customerGrowth < 0) {
    items.push({
      claim: 'Revenue growing while customer base shrinks',
      question: 'Quantify revenue concentration risk. What percentage of revenue comes from the top 5 and top 10 customers? If concentration is high, a single churn event could cause a step-change decline.',
    });
  }

  // If no specific items, add generic
  if (items.length === 0) {
    items.push({
      claim: 'Financial profile appears healthy',
      question: 'Validate data quality — confirm that reported metrics align with audited financials or source systems. Healthy-looking numbers warrant confirmation before proceeding.',
    });
  }

  return items;
}

// Formatting helpers
function fmt(val, decimals = 1) {
  if (val === null || val === undefined) return 'N/A';
  return val.toFixed(decimals);
}

function fmtCurrency(val) {
  if (val === null || val === undefined) return 'N/A';
  if (Math.abs(val) >= 1000000) return `£${(val / 1000000).toFixed(1)}M`;
  if (Math.abs(val) >= 1000) return `£${(val / 1000).toFixed(0)}K`;
  return `£${val.toFixed(0)}`;
}

export { fmt, fmtCurrency };
