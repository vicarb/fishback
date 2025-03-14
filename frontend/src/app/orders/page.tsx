import Orders from "@/components/Orders";

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-6">Your Orders</h1>
      <Orders />
    </main>
  );
}
