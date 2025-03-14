import Image from "next/image";
import ProductList from "@/components/ProductList";

export default function Home() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <h1 className="text-4xl font-bold">Welcome to Our E-commerce</h1>
        <ProductList/>
      </main>
    );
  }
