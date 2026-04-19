/**
 * Bakery sample data — "Crust & Crumb Artisan Bakery"
 *
 * Scenario: 2-location artisan bakery with growing wholesale channel.
 * 36 months Jan-2022 → Dec-2024.
 *
 * Story arc:
 *   2022: Strong post-COVID recovery, revenue growing well but ingredient inflation
 *         (flour, butter, eggs) starting to squeeze COGS from 60% toward 64%.
 *   2023: Peak input cost pressure H1, margins at trough. H2 sees relief as commodity
 *         prices normalise and wholesale pricing renegotiated.
 *   2024: Margin recovery, COGS back below 58%. Wholesale channel now 45%+ of revenue.
 *         Revenue growth moderating but quality of earnings improving materially.
 *
 * Revenue drivers: retail walk-in + wholesale (cafes, hotels, restaurants, events).
 * Seasonality: Dec (+38%), Feb/May peaks (Valentine's, Mother's Day), Aug trough.
 * Customers: wholesale accounts (B2B), growing from 95 → 169 accounts.
 */

// Seasonal revenue multiplier per calendar month (index 0 = January)
const SEASONAL = [
  0.82,  // Jan — post-holiday lull, January diets
  1.18,  // Feb — Valentine's Day: gifting boxes, cakes, wholesale café orders spike
  1.02,  // Mar — steady
  1.07,  // Apr — Easter, spring events begin
  1.12,  // May — Mother's Day, wedding season starts
  0.98,  // Jun — steady, some summer drop-off
  0.93,  // Jul — summer holidays, reduced footfall
  0.88,  // Aug — holiday trough, staff holidays too
  1.01,  // Sep — back to school / work, steady recovery
  1.03,  // Oct — autumnal products, Halloween
  1.08,  // Nov — Christmas prep, wholesale pre-orders
  1.38,  // Dec — Christmas: highest revenue month by far
];

// Wholesale channel seasonal (less volatile than retail)
const WHOLESALE_SEASONAL = [
  0.88, 1.10, 1.00, 1.05, 1.08, 0.97,
  0.94, 0.90, 1.01, 1.03, 1.07, 1.25,
];

// Hardcoded wholesale account counts (verified: net = gross_new - churn)
const CUSTOMER_COUNTS = [
  95,  97,  99,  101, 103, 105, 107, 108, 110, 112, 114, 116,  // 2022
  118, 120, 122, 124, 127, 129, 131, 132, 134, 136, 138, 141,  // 2023
  143, 146, 148, 151, 154, 156, 158, 159, 161, 163, 166, 169,  // 2024
];

// Gross new accounts per month (null for Jan-22 = no prior period)
const NEW_CUSTOMERS = [
  null, 4, 4, 4, 5, 4, 4, 3, 4, 4, 4, 5,
     5, 5, 5, 5, 6, 5, 5, 4, 5, 5, 5, 6,
     5, 6, 5, 6, 6, 5, 5, 4, 5, 5, 6, 6,
];

// Accounts lost per month (null for Jan-22)
const CHURN_COUNTS = [
  null, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 3,
     3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
     3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
];

// Net Revenue Retention % — monthly, trailing 12-month basis
// 2022: steady ~110-115%, 2023 H1 dips to 107-109% (accounts under cost pressure), recovers H2, 2024 strong
const NRR_VALS = [
  109, 112, 110, 111, 113, 112, 111, 110, 111, 112, 113, 115,
  107, 109, 108, 108, 109, 108, 110, 111, 112, 112, 114, 116,
  112, 115, 114, 115, 116, 115, 114, 113, 115, 116, 117, 119,
];

// Gross Revenue Retention %
// 2022: 89-92%, 2023: 86-91% (higher gross churn), 2024: 90-93%
const GRR_VALS = [
   89, 91, 90, 90, 91, 91, 90, 89, 90, 91, 91, 92,
   86, 87, 87, 88, 88, 88, 89, 88, 89, 90, 90, 91,
   90, 91, 91, 92, 92, 92, 91, 91, 92, 92, 93, 93,
];

/**
 * COGS rate trajectory.
 * Starts at 60%, peaks at 64% in early 2023 (ingredient inflation),
 * recovers to ~57% by late 2024 (supplier renegotiations, pricing power).
 */
function getCOGSRate(i) {
  if (i < 6)  return 0.600 + i * 0.004;             // Jan-22 → Jun-22: 60.0% → 62.0%
  if (i < 12) return 0.624 + (i - 6) * 0.002;       // Jul-22 → Dec-22: 62.4% → 63.4%
  if (i < 15) return 0.638 + (i - 12) * 0.002;      // Jan-23 → Mar-23: 63.8% → 64.2% (peak)
  if (i < 24) return 0.644 - (i - 15) * 0.006;      // Apr-23 → Dec-23: 64.4% → 59.0%
  if (i < 30) return 0.590 - (i - 24) * 0.003;      // Jan-24 → Jun-24: 59.0% → 57.2%
  return Math.max(0.565, 0.572 - (i - 30) * 0.001); // Jul-24 → Dec-24: settles ~57%
}

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]}-${String(date.getFullYear()).slice(2)}`;
}

/**
 * Generates 36 months of monthly P&L data for the sample bakery.
 * Compatible with transformSampleData() in dataIngestion.js.
 */
export function generateSampleData() {
  const data = [];
  // Deseasonalized base revenue — starts £197K/month in Jan-22
  let normBase = 197000;

  for (let i = 0; i < 36; i++) {
    const date = new Date(2022, i, 1);
    const month = i % 12;

    // Apply monthly trend growth (decelerating across years)
    if (i > 0) {
      const trendGrowth = i < 12 ? 0.016 : i < 24 ? 0.011 : 0.009;
      normBase *= (1 + trendGrowth);
    }

    const revenue = Math.round(normBase * SEASONAL[month]);
    const cogs = Math.round(revenue * getCOGSRate(i));

    // OpEx: fixed base (rent £18K + utilities £3.5K + admin £3.5K = £25K)
    //       + variable staff that scales with revenue (17.5% covers front/back of house)
    const opex = Math.round(25000 + revenue * 0.175);

    data.push({
      date: formatDate(date),
      revenue,
      customers: CUSTOMER_COUNTS[i],
      new_customers: NEW_CUSTOMERS[i],
      cogs,
      opex,
    });
  }

  return data;
}

/**
 * Generates matching customer panel data (wholesale accounts) for the same period.
 * Includes NRR, GRR, churn counts, expansion/contraction revenue, and MRR.
 */
export function generateCustomerPanelData() {
  const data = [];
  let prevMRR = null;

  for (let i = 0; i < 36; i++) {
    const date = new Date(2022, i, 1);
    const month = i % 12;
    const activeCustomers = CUSTOMER_COUNTS[i];

    // Average revenue per wholesale account grows from ~£720 → ~£1,190
    // (combination of price increases + upsell to broader product range)
    const avgRevPerAccount = 720 + i * 13;
    const mrr = Math.round(activeCustomers * avgRevPerAccount * WHOLESALE_SEASONAL[month]);

    const nrr = NRR_VALS[i];
    const grr = GRR_VALS[i];

    // Expansion = revenue gained from accounts growing their orders
    // Contraction = revenue lost from accounts reducing (but not churning)
    const expansionRevenue = prevMRR !== null
      ? Math.round(prevMRR * Math.max(0, (nrr - grr) / 100) * 1.05)
      : null;
    const contractionRevenue = prevMRR !== null
      ? Math.round(prevMRR * Math.max(0, (100 - grr) / 100) * 0.38)
      : null;

    data.push({
      date: formatDate(date),
      active_customers: activeCustomers,
      new_customers: NEW_CUSTOMERS[i],
      churned_customers: CHURN_COUNTS[i],
      nrr,
      grr,
      expansion_revenue: expansionRevenue,
      contraction_revenue: contractionRevenue,
      mrr,
    });

    prevMRR = mrr;
  }

  return data;
}

export default generateSampleData;
