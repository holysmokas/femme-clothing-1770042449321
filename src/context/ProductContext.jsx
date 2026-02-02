import { createContext, useContext, useState, useEffect } from 'react';

const ProductContext = createContext();

const defaultProducts = [
  { id: '1', name: 'Product 1', description: 'Quality product for your needs', price: 29.99, image: 'https://placehold.co/300x300?text=Product+1', category: 'General', inStock: true },
  { id: '2', name: 'Product 2', description: 'Another excellent choice', price: 49.99, image: 'https://placehold.co/300x300?text=Product+2', category: 'General', inStock: true },
  { id: '3', name: 'Product 3', description: 'Premium quality item', price: 79.99, image: 'https://placehold.co/300x300?text=Product+3', category: 'Premium', inStock: true },
];

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('products');
    if (saved) {
      setProducts(JSON.parse(saved));
    } else {
      setProducts(defaultProducts);
    }
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('products', JSON.stringify(products));
    }
  }, [products]);

  const addProduct = (product) => {
    setProducts(prev => [...prev, { ...product, id: Date.now().toString() }]);
  };

  const updateProduct = (id, updates) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductContext);
}


export default ProductContext;
