import { useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useNavigate } from 'react-router-dom'

function Checkout() {
  const { cartItems, getTotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    zip: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Order placed successfully! Thank you for your purchase.')
    clearCart()
    navigate('/')
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.image || 'https://placehold.co/50x50?text=No+Image'} 
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="Full Name" 
                    required 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRingColor: '#1e2a67' }}
                  />
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="Email" 
                    required 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRingColor: '#1e2a67' }}
                  />
                </div>
                <input 
                  type="text" 
                  name="address" 
                  placeholder="Address" 
                  required 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 border rounded-lg mt-4 focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: '#1e2a67' }}
                />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <input 
                    type="text" 
                    name="city" 
                    placeholder="City" 
                    required 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRingColor: '#1e2a67' }}
                  />
                  <input 
                    type="text" 
                    name="zip" 
                    placeholder="ZIP Code" 
                    required 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRingColor: '#1e2a67' }}
                  />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
                <input 
                  type="text" 
                  name="cardNumber" 
                  placeholder="Card Number" 
                  required 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: '#1e2a67' }}
                />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <input 
                    type="text" 
                    name="expiry" 
                    placeholder="MM/YY" 
                    required 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRingColor: '#1e2a67' }}
                  />
                  <input 
                    type="text" 
                    name="cvv" 
                    placeholder="CVV" 
                    required 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRingColor: '#1e2a67' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: '#1e2a67' }}
              >
                Place Order - ${getTotal().toFixed(2)}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout