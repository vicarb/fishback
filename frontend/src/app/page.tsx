import ProductList from "@/components/ProductList";
import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-500 to-blue-700 text-white text-center py-20">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">Welcome to Our E-commerce</h1>
          <p className="text-lg mb-6">
            Find the best products at unbeatable prices.
          </p>
          <Link
            href="/products"
            className="bg-white text-blue-600 px-6 py-2 rounded-lg text-lg font-semibold shadow-md hover:bg-gray-100"
          >
            Browse Products
          </Link>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="container mx-auto px-6 py-12">
        <h2 className="text-3xl font-semibold text-center mb-6">Featured Products</h2>
        <ProductList />
      </section>
    </main>
  );
}
