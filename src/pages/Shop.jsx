import { useProducts } from '../context/ProductContext.jsx'
import ProductCard from '../components/ProductCard.jsx'

function Shop() {
  const { products } = useProducts()

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Shop All Products</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Discover our complete collection of premium fashion pieces designed for the modern woman.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-12">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#1e2a6720' }}
            >
              <svg className="w-12 h-12" style={{ color: '#1e2a67' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">No Products Available Yet</h2>
            <p className="text-gray-500 text-lg mb-6">Our collection is being curated. Check back soon for amazing fashion finds!</p>
            <p className="text-gray-400">Store owners can add products via the Admin panel.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Shop