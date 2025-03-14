import AdminOrders from "@/components/AdminOrders";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-6">Admin Panel - Order Management</h1>
      <AdminOrders />
    </main>
  );
}
