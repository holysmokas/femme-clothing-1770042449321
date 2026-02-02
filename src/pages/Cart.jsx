import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getTotal } = useCart()

  if (cartItems.length === 0) {
    return (
      <div className="py-16 text-center bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#1e2a6720' }}
          >
            <svg className="w-12 h-12" style={{ color: '#1e2a67' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5m6-5V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">Add some beautiful fashion pieces to get started!</p>
          <Link 
            to="/shop" 
            className="text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition inline-block"
            style={{ backgroundColor: '#1e2a67' }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          {cartItems.map(item => (
            <div key={item.id} className="flex items-center justify-between py-4 border-b last:border-b-0">
              <div className="flex items-center gap-4">
                <img 
                  src={item.image || 'https://placehold.co/80x80?text=No+Image'} 
                  alt={item.name} 
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-gray-600">${item.price?.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                    className="px-3 py-2 hover:bg-gray-100 transition"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border-l border-r">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                    className="px-3 py-2 hover:bg-gray-100 transition"
                  >
                    +
                  </button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  className="text-red-500 hover:text-red-700 transition font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="mt-8 flex justify-between items-center">
            <div className="text-left">
              <p className="text-gray-600">Total Items: {cartItems.reduce((sum, item) => sum + item.quantity, 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold mb-4">Total: ${getTotal().toFixed(2)}</p>
              <Link 
                to="/checkout" 
                className="text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition inline-block"
                style={{ backgroundColor: '#1e2a67' }}
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart