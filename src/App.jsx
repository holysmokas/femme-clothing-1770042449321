import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext.jsx'
import { ProductProvider } from './context/ProductContext.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Contact from './pages/Contact.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'

function App() {
  return (
    <ProductProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </ProductProvider>
  )
}

export default App