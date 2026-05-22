'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache'; 
import { redirect } from 'next/navigation'; 
import postgres from 'postgres'; 

// Hubungkan ke database PostgreSQL
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' }); 

// Definisikan skema validasi form menggunakan Zod
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

// Skema khusus untuk membuat invoice baru (mengabaikan id dan date karena di-generate otomatis)
const CreateInvoice = FormSchema.omit({ id: true, date: true });

// Skema validasi khusus untuk Memperbarui Invoice (mengabaikan id & date)
const UpdateInvoice = FormSchema.omit({ id: true, date: true });


// ==========================================================
// 1. FUNGSI UNTUK MEMBUAT INVOICE BARU (CREATE)
// ==========================================================
export async function createInvoice(formData: FormData) {
  // Validasi data form menggunakan skema Zod yang sudah di-omit
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Mengubah nilai currency ke bentuk sen (cents) untuk menghindari masalah floating-point JavaScript
  const amountInCents = amount * 100;
  
  // Membuat tanggal hari ini dengan format YYYY-MM-DD
  const date = new Date().toISOString().split('T')[0];

  // Eksekusi Query SQL untuk memasukkan data baru ke database
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  // Bersihkan cache pada halaman daftar invoice agar data terbaru langsung muncul
  revalidatePath('/dashboard/invoices');
  
  // Alihkan kembali pengguna ke halaman daftar invoice
  redirect('/dashboard/invoices');
}


// ==========================================================
// 2. FUNGSI UNTUK MEMPERBARUI INVOICE (UPDATE)
// ==========================================================
export async function updateInvoice(id: string, formData: FormData) {
  // Validasi input menggunakan skema UpdateInvoice
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Konversi nilai amount ke satuan sen
  const amountInCents = amount * 100;

  // Eksekusi SQL UPDATE berdasarkan ID data
  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  // Hapus cache halaman daftar invoice agar data terbaru langsung tampil
  revalidatePath('/dashboard/invoices');
  
  // Alihkan kembali pengguna ke halaman utama daftar invoice
  redirect('/dashboard/invoices');
}


// ==========================================================
// 3. FUNGSI UNTUK MENGHAPUS INVOICE (DELETE)
// ==========================================================
export async function deleteInvoice(id: string) {
  // Eksekusi SQL DELETE berdasarkan ID data
  await sql`
    DELETE FROM invoices WHERE id = ${id}
  `;
  
  // Memperbarui cache halaman invoice agar baris yang dihapus langsung hilang secara realtime
  revalidatePath('/dashboard/invoices');
}