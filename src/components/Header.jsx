import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useState } from 'react';

function Header() {
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [logoError, setLogoError] = useState(false);

  // Get base path for GitHub Pages subdirectory deployment
  const basePath = import.meta.env.BASE_URL || '/';
  const [logoSrc, setLogoSrc] = useState(`${basePath}logo.png`);

  const handleLogoError = () => {
    if (logoSrc.endsWith('logo.png')) {
      setLogoSrc(`${basePath}logo.jpg`);
    } else if (logoSrc.endsWith('logo.jpg')) {
      setLogoSrc(`${basePath}logo.jpeg`);
    } else if (logoSrc.endsWith('logo.jpeg')) {
      setLogoSrc(`${basePath}logo.svg`);
    } else {
      setLogoError(true);
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          {!logoError ? (
            <img
              src={logoSrc}
              alt="{{BUSINESS_NAME}}"
              className="h-12 w-auto object-contain"
              onError={handleLogoError}
            />
          ) : (
            <span className="text-xl font-bold text-gray-800">{{ BUSINESS_NAME }}</span>
          )}
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-gray-600 hover:text-blue-600">Home</Link>
          <Link to="/shop" className="text-gray-600 hover:text-blue-600">Shop</Link>
          <Link to="/cart" className="relative text-gray-600 hover:text-blue-600">
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link to="/admin" className="text-sm text-gray-400 hover:text-gray-600">Login</Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;