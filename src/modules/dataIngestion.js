/**
 * Data ingestion — CSV parsing with fuzzy column mapping.
 * Uses PapaParse for robust CSV handling.
 */

import Papa from 'papaparse';

// Known aliases for each required field
const COLUMN_ALIASES = {
  date: ['date', 'month', 'period', 'time', 'month_year', 'monthyear', 'reporting_date', 'report_date'],
  revenue: ['revenue', 'total_revenue', 'net_revenue', 'sales', 'total_sales', 'income', 'turnover', 'top_line', 'topline', 'gmv_net', 'net_sales'],
  customers: ['customers', 'customer_count', 'subscribers', 'users', 'active_users', 'buyers', 'orders', 'order_count', 'client_count', 'clients', 'active_customers', 'total_customers', 'num_customers'],
  cogs: ['cogs', 'cost_of_goods', 'cost_of_goods_sold', 'cost_of_revenue', 'cos', 'direct_costs', 'cost_of_sales', 'variable_costs', 'direct_cost'],
  opex: ['opex', 'operating_expenses', 'operating_costs', 'total_opex', 'sg_a', 'sga', 'overheads', 'overhead', 'indirect_costs', 'operating_expenditure'],
};

// Optional columns
const OPTIONAL_ALIASES = {
  new_customers: ['new_customers', 'new_customer_count', 'new_subscribers', 'new_users', 'new_buyers', 'new_clients', 'acquired_customers'],
  churn: ['churn', 'churned_customers', 'lost_customers', 'customer_churn', 'cancelled', 'cancellations'],
  headcount: ['headcount', 'employees', 'employee_count', 'fte', 'full_time_employees', 'staff_count', 'team_size'],
  marketing_spend: ['marketing_spend', 'marketing_cost', 'marketing', 'advertising', 'ad_spend', 'cac_spend', 'sales_marketing', 'sales_and_marketing'],
};

/**
 * Parse a CSV file and return structured data with column mapping.
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('Failed to parse CSV: ' + results.errors[0].message));
          return;
        }
        const headers = results.meta.fields || [];
        const mapping = autoMapColumns(headers);
        resolve({
          rawData: results.data,
          headers,
          mapping,
          rowCount: results.data.length,
        });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Fuzzy match CSV headers to required/optional fields.
 */
export function autoMapColumns(headers) {
  const mapping = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[\s\-\.]+/g, '_'));

  // Map required fields
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const match = findBestMatch(normalizedHeaders, aliases);
    if (match !== null) {
      mapping[field] = headers[match];
    }
  }

  // Map optional fields
  for (const [field, aliases] of Object.entries(OPTIONAL_ALIASES)) {
    const match = findBestMatch(normalizedHeaders, aliases);
    if (match !== null) {
      mapping[field] = headers[match];
    }
  }

  return mapping;
}

function findBestMatch(normalizedHeaders, aliases) {
  // Exact match first
  for (const alias of aliases) {
    const idx = normalizedHeaders.indexOf(alias);
    if (idx !== -1) return idx;
  }
  // Partial match (contains)
  for (const alias of aliases) {
    const idx = normalizedHeaders.findIndex((h) => h.includes(alias) || alias.includes(h));
    if (idx !== -1) return idx;
  }
  return null;
}

/**
 * Parse date strings in many formats to Date objects.
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // Try: Jan-24, Jan 24, Jan-2024, January 2024
  const monthNames = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  // Pattern: "Mon-YY" or "Mon-YYYY" or "Month YYYY"
  const monthYearMatch = str.match(/^([a-zA-Z]+)[\s\-\/](\d{2,4})$/);
  if (monthYearMatch) {
    const month = monthNames[monthYearMatch[1].toLowerCase()];
    let year = parseInt(monthYearMatch[2]);
    if (year < 100) year += 2000;
    if (month !== undefined) return new Date(year, month, 1);
  }

  // Pattern: "YYYY-MM" or "YYYY/MM"
  const isoMatch = str.match(/^(\d{4})[\-\/](\d{1,2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, 1);
  }

  // Pattern: "MM/YYYY" or "MM-YYYY"
  const mmyyyyMatch = str.match(/^(\d{1,2})[\-\/](\d{4})$/);
  if (mmyyyyMatch) {
    return new Date(parseInt(mmyyyyMatch[2]), parseInt(mmyyyyMatch[1]) - 1, 1);
  }

  // Fallback: try native Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

/**
 * Clean and transform raw CSV data using the column mapping.
 */
export function transformData(rawData, mapping) {
  return rawData
    .map((row) => {
      const date = parseDate(row[mapping.date]);
      if (!date) return null;

      const entry = {
        date,
        dateLabel: formatDateLabel(date),
        revenue: cleanNumber(row[mapping.revenue]),
        customers: cleanNumber(row[mapping.customers]),
        cogs: cleanNumber(row[mapping.cogs]),
        opex: cleanNumber(row[mapping.opex]),
      };

      // Optional fields
      if (mapping.new_customers) {
        entry.newCustomers = cleanNumber(row[mapping.new_customers]);
      }
      if (mapping.churn) {
        entry.churn = cleanNumber(row[mapping.churn]);
      }
      if (mapping.headcount) {
        entry.headcount = cleanNumber(row[mapping.headcount]);
      }
      if (mapping.marketing_spend) {
        entry.marketingSpend = cleanNumber(row[mapping.marketing_spend]);
      }

      return entry;
    })
    .filter((row) => row !== null)
    .sort((a, b) => a.date - b.date);
}

function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(/[£$€,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatDateLabel(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]}-${String(date.getFullYear()).slice(2)}`;
}

/**
 * Transform sample data (already structured) into the standard format.
 */
export function transformSampleData(sampleData) {
  return sampleData.map((row) => {
    const date = parseDate(row.date);
    return {
      date,
      dateLabel: row.date,
      revenue: row.revenue,
      customers: row.customers,
      newCustomers: row.new_customers || null,
      cogs: row.cogs,
      opex: row.opex,
    };
  });
}

export function getRequiredFields() {
  return ['date', 'revenue', 'customers', 'cogs', 'opex'];
}

export function getMissingFields(mapping) {
  const required = getRequiredFields();
  return required.filter((field) => !mapping[field]);
}
