/**
 * Data simulation — generates 24 months of realistic monthly data.
 * Scenario: "Growth with Emerging Pressure"
 *
 * - Revenue increasing steadily
 * - Customer growth slowing slightly over time
 * - ARPU declining gradually (pricing pressure)
 * - Costs rising faster than revenue
 * - Gross margin declining
 */

export function generateSampleData() {
  const data = [];
  const startDate = new Date(2024, 0, 1); // Jan 2024

  // Base values
  let revenue = 280000;
  let customers = 520;
  let cogsRate = 0.32; // starts at 32% of revenue (68% GM)
  let opexBase = 95000;

  for (let i = 0; i < 24; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);

    // Revenue: steady growth, ~1.5% MoM early, slowing slightly
    const revGrowthRate = 0.015 - (i * 0.0001);
    revenue = revenue * (1 + revGrowthRate);

    // Customers: growing but decelerating
    const custGrowthRate = Math.max(0.012 - (i * 0.0003), 0.003);
    customers = Math.round(customers * (1 + custGrowthRate));

    // New customers (roughly): higher early, declining
    const newCustomers = Math.round(customers * custGrowthRate * 1.3);

    // COGS: rising faster than revenue — margin compression
    cogsRate = 0.32 + (i * 0.0035);
    const cogs = Math.round(revenue * cogsRate);

    // OpEx: rising steadily
    opexBase = opexBase * 1.008;
    const opex = Math.round(opexBase + (i * 800));

    // Add slight seasonal variation (Q4 bump, Q1 dip)
    const month = date.getMonth();
    let seasonalFactor = 1;
    if (month === 10 || month === 11) seasonalFactor = 1.04;
    if (month === 0 || month === 1) seasonalFactor = 0.97;

    const adjustedRevenue = Math.round(revenue * seasonalFactor);
    const adjustedCogs = Math.round(cogs * seasonalFactor);

    data.push({
      date: formatDate(date),
      revenue: adjustedRevenue,
      customers: customers,
      new_customers: newCustomers,
      cogs: adjustedCogs,
      opex: opex,
    });
  }

  return data;
}

function formatDate(date) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[date.getMonth()]}-${String(date.getFullYear()).slice(2)}`;
}

export default generateSampleData;
