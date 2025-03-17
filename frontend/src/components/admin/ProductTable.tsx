"use client";
import { FiEdit, FiTrash } from "react-icons/fi";

export default function ProductTable({ products, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-300 shadow-md rounded-lg">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-3">Name</th>
            <th className="p-3">Price</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.ID} className="border-t">
              <td className="p-3">{product.name}</td>
              <td className="p-3">${product.price.toFixed(2)}</td>
              <td className="p-3 flex gap-3">
                <button onClick={() => onEdit(product)} className="text-blue-500 hover:text-blue-700">
                  <FiEdit />
                </button>
                <button onClick={() => onDelete(product.ID)} className="text-red-500 hover:text-red-700">
                  <FiTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
