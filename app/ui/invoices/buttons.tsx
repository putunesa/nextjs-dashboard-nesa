import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
// BARU: Mengimpor fungsi deleteInvoice dari Server Action (Slide Halaman 22)
import { deleteInvoice } from '@/app/lib/actions';

// ==========================================================
// 1. KOMPONEN UNTUK MEMBUAT INVOICE BARU (CREATE)
// ==========================================================
export function CreateInvoice() {
  return (
    <Link
      href="/dashboard/invoices/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">Create Invoice</span>{' '}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

// ==========================================================
// 2. KOMPONEN UNTUK MENGARAHKAN KE HALAMAN EDIT (UPDATE)
// ==========================================================
export function UpdateInvoice({ id }: { id: string }) {
  return (
    <Link
      // Menggunakan backtick (`) dan ${id} agar dinamis menuju ke halaman edit masing-masing invoice (Slide Halaman 19)
      href={`/dashboard/invoices/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}

// ==========================================================
// 3. KOMPONEN UNTUK MENGHAPUS DATA (DELETE) - [TERGABUNG & DIPERBARUI]
// ==========================================================
export function DeleteInvoice({ id }: { id: string }) {
  // BARU: Mengikat ID invoice yang spesifik ke fungsi deleteInvoice (Slide Halaman 22)
  const deleteInvoiceWithId = deleteInvoice.bind(null, id);

  return (
    // BARU: Mengganti fragmen kosong (<>) menjadi elemen form dengan atribut action (Slide Halaman 22)
    <form action={deleteInvoiceWithId}>
      <button type="submit" className="rounded-md border p-2 hover:bg-gray-100">
        <span className="sr-only">Delete</span>
        <TrashIcon className="w-5" />
      </button>
    </form>
  );
}