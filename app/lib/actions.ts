'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// Hubungkan ke database PostgreSQL
const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
});

// ==========================================================
// VALIDASI FORM DENGAN ZOD (Ditambahkan Pesan Custom Merah)
// ==========================================================
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// Tipe Data untuk State Error pada useActionState
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

// ==========================================================
// 1. CREATE INVOICE (Diupdate agar Sinkron dengan useActionState)
// ==========================================================
export async function createInvoice(prevState: State, formData: FormData) {
  // Gunakan safeParse agar form tidak crash jika kosong
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Jika ada field kosong, kembalikan errors berupa teks merah ke UI
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Jika sukses, ambil datanya
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Create Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// ==========================================================
// 2. UPDATE INVOICE
// ==========================================================
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// ==========================================================
// 3. DELETE INVOICE
// ==========================================================
export async function deleteInvoice(id: string) {
    await sql`
      DELETE FROM invoices
      WHERE id = ${id}
    `;
    revalidatePath('/dashboard/invoices');
}

// ==========================================================
// 4. AUTHENTICATE LOGIN
// ==========================================================
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}