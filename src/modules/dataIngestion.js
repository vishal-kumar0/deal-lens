import Papa from 'papaparse';

const CUSTOMER_PANEL_ALIASES = {
  date: ['date', 'month', 'period', 'reporting_date', 'report_date', 'month_year'],
  nrr: ['nrr', 'net_revenue_retention', 'net_dollar_retention', 'ndr', 'net_retention', 'net_revenue_retention_rate'],
  grr: ['grr', 'gross_revenue_retention', 'gross_dollar_retention', 'gross_retention', 'gross_revenue_retention_rate'],
  new_customers: ['new_customers', 'new_customer_count', 'acquired', 'new_subscribers', 'new_logos', 'new_accounts', 'adds'],
  churned_customers: ['churned_customers', 'lost_customers', 'churn_count', 'cancelled', 'cancellations', 'churned', 'churned_count', 'churn'],
  active_customers: ['active_customers', 'total_customers', 'customers', 'subscribers', 'active_accounts', 'active_logos', 'eop_customers'],
  expansion_revenue: ['expansion_revenue', 'expansion_mrr', 'upsell', 'expansion', 'upsell_revenue', 'upgrade_revenue'],
  contraction_revenue: ['contraction_revenue', 'contraction_mrr', 'downsell', 'contraction', 'downsell_revenue', 'downgrade_revenue'],
  mrr: ['mrr', 'monthly_recurring_revenue', 'arr_monthly', 'monthly_revenue'],
  arr: ['arr', 'annual_recurring_revenue'],
};

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

export async function parseExcel(file) {
  const { read, utils } = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = read(data, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false });
        if (jsonData.length < 2) {
          reject(new Error('Excel file appears empty or has no data rows'));
          return;
        }
        const headers = jsonData[0].map(String);
        const rawData = jsonData.slice(1).map((row) => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
          return obj;
        });
        const mapping = autoMapColumns(headers);
        resolve({ rawData, headers, mapping, rowCount: rawData.length });
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcel(file);
  return parseCSV(file);
}

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
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[\s-.]+/g, '_'));

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
  const monthYearMatch = str.match(/^([a-zA-Z]+)[\s\-/](\d{2,4})$/);
  if (monthYearMatch) {
    const month = monthNames[monthYearMatch[1].toLowerCase()];
    let year = parseInt(monthYearMatch[2]);
    if (year < 100) year += 2000;
    if (month !== undefined) return new Date(year, month, 1);
  }

  // Pattern: "YYYY-MM" or "YYYY/MM"
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, 1);
  }

  // Pattern: "MM/YYYY" or "MM-YYYY"
  const mmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmyyyyMatch) {
    return new Date(parseInt(mmyyyyMatch[2]), parseInt(mmyyyyMatch[1]) - 1, 1);
  }

  // Fallback: try native Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

export function transformData(rawData, mapping) {
  const results = [];
  const parseErrors = [];

  rawData.forEach((row, index) => {
    const date = parseDate(row[mapping.date]);
    if (!date) {
      parseErrors.push({ rowIndex: index + 2, field: 'date', rawValue: String(row[mapping.date] ?? ''), reason: 'Could not parse date — expected: Jan-24, 2024-01, 01/2024' });
      return;
    }

    const entry = {
      date,
      dateLabel: formatDateLabel(date),
      revenue: cleanNumber(row[mapping.revenue]),
      customers: cleanNumber(row[mapping.customers]),
      cogs: cleanNumber(row[mapping.cogs]),
      opex: cleanNumber(row[mapping.opex]),
    };

    for (const [field, key] of [['revenue', mapping.revenue], ['customers', mapping.customers], ['cogs', mapping.cogs], ['opex', mapping.opex]]) {
      const raw = String(row[key] ?? '');
      if (raw !== '' && raw !== '0' && entry[field] === 0) {
        parseErrors.push({ rowIndex: index + 2, field, rawValue: raw, reason: 'Non-numeric value — treated as 0' });
      }
    }

    if (mapping.new_customers) entry.newCustomers = cleanNumber(row[mapping.new_customers]);
    if (mapping.churn) entry.churn = cleanNumber(row[mapping.churn]);
    if (mapping.headcount) entry.headcount = cleanNumber(row[mapping.headcount]);
    if (mapping.marketing_spend) entry.marketingSpend = cleanNumber(row[mapping.marketing_spend]);

    results.push(entry);
  });

  const data = results.sort((a, b) => a.date - b.date);
  return { data, parseErrors, successCount: data.length, totalRows: rawData.length };
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

/**
 * Detect file type from filename + headers.
 * Returns: 'pnl' | 'customer_panel' | 'cim' | 'unknown'
 */
export function detectFileType(filename, headers = []) {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf')) return 'cim';

  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[\s\-.]+/g, '_'));

  // Customer panel: look for NRR/GRR/churn/retention markers
  const cpMarkers = ['nrr', 'grr', 'net_revenue_retention', 'gross_revenue_retention',
    'churned', 'churn_rate', 'expansion', 'contraction', 'cohort', 'retention'];
  if (cpMarkers.some((m) => normalized.some((h) => h.includes(m)))) return 'customer_panel';

  // P&L: revenue + (cogs or opex)
  const hasRevenue = normalized.some((h) => ['revenue', 'sales', 'turnover', 'income'].some((k) => h.includes(k)));
  const hasCost = normalized.some((h) => ['cogs', 'cost', 'opex', 'operating'].some((k) => h.includes(k)));
  if (hasRevenue && hasCost) return 'pnl';

  // Fallback: if has a date + numeric columns, assume P&L
  const hasDate = normalized.some((h) => ['date', 'month', 'period'].some((k) => h.includes(k)));
  if (hasDate && hasRevenue) return 'pnl';

  return 'unknown';
}

export function autoMapCustomerPanel(headers) {
  const mapping = {};
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[\s\-.]+/g, '_'));
  for (const [field, aliases] of Object.entries(CUSTOMER_PANEL_ALIASES)) {
    const match = findBestMatch(normalized, aliases);
    if (match !== null) mapping[field] = headers[match];
  }
  return mapping;
}

export function transformCustomerPanel(rawData, mapping) {
  const results = [];
  rawData.forEach((row) => {
    const date = parseDate(row[mapping.date]);
    if (!date) return;
    const entry = { date, dateLabel: formatDateLabel(date) };
    if (mapping.nrr) entry.nrr = cleanNumber(row[mapping.nrr]);
    if (mapping.grr) entry.grr = cleanNumber(row[mapping.grr]);
    if (mapping.new_customers) entry.newCustomers = cleanNumber(row[mapping.new_customers]);
    if (mapping.churned_customers) entry.churnedCustomers = cleanNumber(row[mapping.churned_customers]);
    if (mapping.active_customers) entry.activeCustomers = cleanNumber(row[mapping.active_customers]);
    if (mapping.expansion_revenue) entry.expansionRevenue = cleanNumber(row[mapping.expansion_revenue]);
    if (mapping.contraction_revenue) entry.contractionRevenue = cleanNumber(row[mapping.contraction_revenue]);
    if (mapping.mrr) entry.mrr = cleanNumber(row[mapping.mrr]);
    if (mapping.arr) entry.arr = cleanNumber(row[mapping.arr]);
    results.push(entry);
  });
  return results.sort((a, b) => a.date - b.date);
}

export async function parseCustomerPanel(file) {
  const parsed = await parseFile(file);
  const mapping = autoMapCustomerPanel(parsed.headers);
  const data = transformCustomerPanel(parsed.rawData, mapping);
  return { data, mapping, headers: parsed.headers, rowCount: parsed.rowCount };
}

export async function parseCIM(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    const textParts = [];

    // Extract first 8 pages max (CIM executive summary is usually early)
    const pagesToRead = Math.min(pageCount, 8);
    for (let i = 1; i <= pagesToRead; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();
      if (pageText.length > 50) textParts.push(pageText);
    }

    return { text: textParts.join('\n\n'), pageCount };
  } catch (err) {
    throw new Error('Failed to extract CIM text: ' + err.message);
  }
}
