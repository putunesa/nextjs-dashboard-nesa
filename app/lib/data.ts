import postgres from 'postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

// ===============================
// 🔥 DATABASE CONNECTION FIX FINAL
// ===============================
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
});

// ===============================
// REVENUE
// ===============================
export async function fetchRevenue() {
  try {
    const data = await sql<Revenue[]>`SELECT * FROM revenue`;
    return data ?? [];
  } catch (error) {
    console.error('fetchRevenue error:', error);
    return [];
  }
}

// ===============================
// LATEST INVOICES
// ===============================
export async function fetchLatestInvoices() {
  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT 
        invoices.amount, 
        customers.name, 
        customers.image_url, 
        customers.email, 
        invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5
    `;

    return (data ?? []).map((invoice) => ({
      ...invoice,
      amount: formatCurrency(Number(invoice.amount ?? 0)),
    }));
  } catch (error) {
    console.error('fetchLatestInvoices error:', error);
    return [];
  }
}

// ===============================
// CARD DATA
// ===============================
export async function fetchCardData() {
  try {
    const invoiceCount = sql`SELECT COUNT(*) FROM invoices`;
    const customerCount = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatus = sql`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending
      FROM invoices
    `;

    const [inv, cust, status] = await Promise.all([
      invoiceCount,
      customerCount,
      invoiceStatus,
    ]);

    return {
      numberOfInvoices: Number(inv?.[0]?.count ?? 0),
      numberOfCustomers: Number(cust?.[0]?.count ?? 0),
      totalPaidInvoices: formatCurrency(Number(status?.[0]?.paid ?? 0)),
      totalPendingInvoices: formatCurrency(Number(status?.[0]?.pending ?? 0)),
    };
  } catch (error) {
    console.error('fetchCardData error:', error);

    return {
      numberOfInvoices: 0,
      numberOfCustomers: 0,
      totalPaidInvoices: formatCurrency(0),
      totalPendingInvoices: formatCurrency(0),
    };
  }
}

// ===============================
// INVOICES LIST
// ===============================
const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(query: string, currentPage: number) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const data = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return data ?? [];
  } catch (error) {
    console.error('fetchFilteredInvoices error:', error);
    return [];
  }
}

// ===============================
// INVOICE PAGINATION
// ===============================
export async function fetchInvoicesPages(query: string) {
  try {
    const data = await sql`
      SELECT COUNT(*)
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
    `;

    const total = Number(data?.[0]?.count ?? 0);
    return Math.ceil(total / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('fetchInvoicesPages error:', error);
    return 0;
  }
}

// ===============================
// INVOICE BY ID
// ===============================
export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT * FROM invoices WHERE id = ${id}
    `;

    if (!data?.[0]) return null;

    return {
      ...data[0],
      amount: Number(data[0].amount ?? 0) / 100,
    };
  } catch (error) {
    console.error('fetchInvoiceById error:', error);
    return null;
  }
}

// ===============================
// CUSTOMERS
// ===============================
export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField[]>`
      SELECT id, name FROM customers ORDER BY name ASC
    `;

    return data ?? [];
  } catch (error) {
    console.error('fetchCustomers error:', error);
    return [];
  }
}

// ===============================
// FILTERED CUSTOMERS
// ===============================
export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
      SELECT
        customers.id,
        customers.name,
        customers.email,
        customers.image_url,
        COUNT(invoices.id) AS total_invoices,
        SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
        SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
      FROM customers
      LEFT JOIN invoices ON customers.id = invoices.customer_id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
      GROUP BY customers.id, customers.name, customers.email, customers.image_url
      ORDER BY customers.name ASC
    `;

    return (data ?? []).map((c) => ({
      ...c,
      total_pending: formatCurrency(Number(c.total_pending ?? 0)),
      total_paid: formatCurrency(Number(c.total_paid ?? 0)),
    }));
  } catch (error) {
    console.error('fetchFilteredCustomers error:', error);
    return [];
  }
}