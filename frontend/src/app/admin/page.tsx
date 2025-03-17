import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-8">Admin Panel</h1>

      <div className="flex flex-col items-center gap-6">
        <Link href="/admin/orders" className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600">
          📦 Manage Orders
        </Link>
        <Link href="/admin/products" className="bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600">
          🛍️ Manage Products
        </Link>
      </div>
    </main>
  );
}
