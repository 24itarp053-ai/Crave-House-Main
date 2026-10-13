import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

// Helper to safely parse currency string to numeric value
const parsePrice = (priceVal) => {
  if (typeof priceVal === 'number') return priceVal;
  if (typeof priceVal === 'string') {
    const parsed = parseFloat(priceVal.replace(/[^\d.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Helper to validate cart items structure loaded from localStorage
const validateCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.filter(item => {
    return (
      item &&
      (typeof item.id === 'number' || typeof item.id === 'string') &&
      typeof item.name === 'string' &&
      typeof item.price === 'number' &&
      typeof item.image === 'string' &&
      typeof item.category === 'string' &&
      typeof item.quantity === 'number' &&
      item.quantity >= 1
    );
  });
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem('craveHouseCart');
      if (stored) {
        const parsed = JSON.parse(stored);
        return validateCartItems(parsed);
      }
    } catch (error) {
      console.error('Error reading craveHouseCart from localStorage:', error);
    }
    return [];
  });

  const [toast, setToast] = useState({ show: false, message: '' });

  // Update localStorage whenever cartItems changes
  useEffect(() => {
    try {
      localStorage.setItem('craveHouseCart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error writing craveHouseCart to localStorage:', error);
    }
  }, [cartItems]);

  const showToast = (message) => {
    setToast({ show: true, message });
    // Reset toast after 3 seconds
    const timer = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);
    return () => clearTimeout(timer);
  };

  const addToCart = (product, quantity = 1, category) => {
    if (!product || !category) return;
    const numericPrice = parsePrice(product.price);
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.id === product.id && item.category === category
      );

      if (existingItemIndex > -1) {
        // Update quantity
        const updated = [...prevItems];
        updated[existingItemIndex] = {
          ...updated[existingItemIndex],
          quantity: updated[existingItemIndex].quantity + qtyToAdd
        };
        showToast(`Increased ${product.name} quantity to ${updated[existingItemIndex].quantity} in cart!`);
        return updated;
      } else {
        // Add new item
        showToast(`Added ${qtyToAdd} × ${product.name} to cart!`);
        return [
          ...prevItems,
          {
            id: product.id,
            name: product.name,
            price: numericPrice,
            image: product.image,
            category: category,
            quantity: qtyToAdd
          }
        ];
      }
    });
  };

  const updateQuantity = (productId, category, newQuantity) => {
    const qty = Math.max(1, parseInt(newQuantity, 10) || 1);
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId && item.category === category
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const removeFromCart = (productId, category) => {
    setCartItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.id === productId && item.category === category);
      if (itemToRemove) {
        showToast(`Removed ${itemToRemove.name} from cart.`);
      }
      return prevItems.filter(item => !(item.id === productId && item.category === category));
    });
  };

  const clearCart = () => {
    setCartItems([]);
    showToast('Shopping cart cleared.');
  };

  // Derived values
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartTotal = cartSubtotal; // Simple subtotal = total per requirement

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartSubtotal,
        cartTotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        toast,
        showToast
      }}
    >
      {children}

      {/* Floating Global Toast Notification */}
      {toast.show && (
        <div className="cart-toast">
          <span>{toast.message}</span>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
