import { useCart } from '../context/CartContext.jsx'

function ProductCard({ product }) {
  const { addToCart } = useCart()

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <img 
        src={product.image || 'https://placehold.co/300x300?text=No+Image'} 
        alt={product.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xl font-bold text-gray-900">${product.price?.toFixed(2)}</span>
          <button
            onClick={() => addToCart(product)}
            className="text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: '#1e2a67' }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard