import { useState, useEffect, useRef } from 'react';
import { useProducts } from '../context/ProductContext.jsx';

// Alimi API URL
const API_URL = 'https://api.alimi.ai';

// ============================================
// SECURITY: Input Sanitization Functions
// ============================================

const SecurityUtils = {
  // Sanitize text input - prevents XSS
  sanitizeText: (input) => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
      .replace(/data:/gi, '') // Remove data: protocol
      .trim()
      .slice(0, 1000); // Max length
  },

  // Sanitize product name - stricter
  sanitizeName: (input) => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[<>\"\'`;\\]/g, '') // Remove dangerous chars
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
      .slice(0, 200); // Max 200 chars for name
  },

  // Sanitize description - allows some formatting but no scripts
  sanitizeDescription: (input) => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim()
      .slice(0, 5000); // Max 5000 chars for description
  },

  // Sanitize price - only numbers and decimal
  sanitizePrice: (input) => {
    if (!input) return '';
    const cleaned = String(input).replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
    return cleaned.slice(0, 10); // Max price length
  },

  // Sanitize URL - validate and clean
  sanitizeUrl: (input) => {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();

    // Only allow http, https protocols
    if (trimmed && !trimmed.match(/^https?:\/\//i)) {
      return '';
    }

    // Block javascript: and data: in URLs
    if (trimmed.match(/^(javascript|data|vbscript):/i)) {
      return '';
    }

    return trimmed.slice(0, 2000);
  },

  // Sanitize email
  sanitizeEmail: (input) => {
    if (!input || typeof input !== 'string') return '';
    return input
      .toLowerCase()
      .replace(/[<>\"\'`;\\]/g, '')
      .trim()
      .slice(0, 254);
  },

  // Sanitize category
  sanitizeCategory: (input) => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[<>\"\'`;\\]/g, '')
      .trim()
      .slice(0, 100);
  },

  // Check for common attack patterns
  detectAttack: (input) => {
    if (!input || typeof input !== 'string') return false;
    const attackPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /union\s+select/i,
      /;\s*drop\s+table/i,
      /;\s*delete\s+from/i,
      /'\s*or\s+'1'\s*=\s*'1/i,
      /--\s*$/,
      /\/\*.*\*\//,
      /\$\{.*\}/,
      /\{\{.*\}\}/,
    ];
    return attackPatterns.some(pattern => pattern.test(input));
  }
};

// ============================================
// SECURITY: Rate Limiting for Login
// ============================================

const RateLimiter = {
  attempts: {},
  maxAttempts: 5,
  lockoutTime: 15 * 60 * 1000, // 15 minutes

  canAttempt: (identifier) => {
    const now = Date.now();
    const record = RateLimiter.attempts[identifier];

    if (!record) return true;

    // Check if lockout period has passed
    if (record.lockedUntil && now < record.lockedUntil) {
      return false;
    }

    // Reset if lockout expired
    if (record.lockedUntil && now >= record.lockedUntil) {
      delete RateLimiter.attempts[identifier];
      return true;
    }

    return record.count < RateLimiter.maxAttempts;
  },

  recordAttempt: (identifier, success) => {
    const now = Date.now();

    if (success) {
      delete RateLimiter.attempts[identifier];
      return;
    }

    if (!RateLimiter.attempts[identifier]) {
      RateLimiter.attempts[identifier] = { count: 0, firstAttempt: now };
    }

    RateLimiter.attempts[identifier].count++;

    if (RateLimiter.attempts[identifier].count >= RateLimiter.maxAttempts) {
      RateLimiter.attempts[identifier].lockedUntil = now + RateLimiter.lockoutTime;
    }
  },

  getRemainingTime: (identifier) => {
    const record = RateLimiter.attempts[identifier];
    if (!record?.lockedUntil) return 0;
    const remaining = record.lockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000 / 60) : 0;
  },

  getAttemptsLeft: (identifier) => {
    const record = RateLimiter.attempts[identifier];
    if (!record) return RateLimiter.maxAttempts;
    return Math.max(0, RateLimiter.maxAttempts - record.count);
  }
};

// Initialize Firebase Auth (loaded from CDN)
let auth = null;
let firebaseLoaded = false;

const loadFirebase = async () => {
  if (firebaseLoaded && auth) {
    return true;
  }

  // Check if already loaded
  if (window.firebase?.auth) {
    auth = window.firebase.auth();
    firebaseLoaded = true;
    return true;
  }

  try {
    // Fetch Firebase config from backend
    const configResponse = await fetch(`${API_URL}/api/firebase-config`);
    const configData = await configResponse.json();

    if (!configData.success) {
      throw new Error('Failed to load Firebase config');
    }

    // Load Firebase SDK
    await new Promise((resolve, reject) => {
      const script1 = document.createElement('script');
      script1.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
        script2.onload = () => resolve();
        script2.onerror = () => reject(new Error('Failed to load Firebase Auth'));
        document.head.appendChild(script2);
      };
      script1.onerror = () => reject(new Error('Failed to load Firebase'));
      document.head.appendChild(script1);
    });

    // Initialize Firebase with config from backend
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(configData.config);
    }
    auth = window.firebase.auth();
    firebaseLoaded = true;
    return true;
  } catch (err) {
    console.error('Failed to load Firebase:', err);
    return false;
  }
};

// Image Uploader Component with Security
function ImageUploader({ currentImage, onImageUploaded, userId, projectId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentImage || '');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Sync preview with currentImage when form is reset
  useEffect(() => {
    setPreview(currentImage || '');
    if (!currentImage) {
      setUploadSuccess(false);
      setError('');
    }
  }, [currentImage]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Security: Validate file type strictly
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    // Security: Check file extension matches type
    const extension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!validExtensions.includes(extension)) {
      setError('Invalid file extension');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Security: Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    setError('');
    setUploadSuccess(false);
    setUploading(true);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    try {
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('projectId', SecurityUtils.sanitizeText(projectId));
      if (userId) formData.append('userId', SecurityUtils.sanitizeText(userId));
      formData.append('productName', 'product-' + Date.now());

      const response = await fetch(`${API_URL}/api/upload-product-image`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        const imageUrl = data.driveUrl || data.primaryUrl || data.imageUrl;
        onImageUploaded(imageUrl, data.fileId);
        setPreview(imageUrl);
        setUploadSuccess(true);
        setError('');
      } else if (data.needsConnection) {
        setError('Google Drive not connected. Image saved locally.');
        onImageUploaded(reader.result, null);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed: ' + err.message);
      onImageUploaded(reader.result, null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {preview && (
        <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded border" />
      )}
      <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50 text-gray-700'}`}>
        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} disabled={uploading} className="hidden" />
        {uploading ? '⏳ Uploading...' : '📁 Choose Image'}
      </label>
      {uploadSuccess && <p className="text-green-600 text-sm">✅ Image uploaded to cloud!</p>}
      {error && <p className="text-amber-600 text-sm">⚠️ {error}</p>}
    </div>
  );
}

function AdminDashboard() {
  // Auth states
  const [authMode, setAuthMode] = useState('loading');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);

  // Product states
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    category: '',
    inStock: true,
    driveFileId: null,
    externalPaymentUrl: ''
  });

  // Security: Track form submission attempts
  const [formError, setFormError] = useState('');

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Stripe Connect state
  const [stripeConnect, setStripeConnect] = useState({
    loading: true,
    connected: false,
    chargesEnabled: false,
    accountId: null
  });

  // Get project ID from meta tag
  const projectId = document.querySelector('meta[name="project-id"]')?.content || '';

  // Check Stripe Connect status
  const checkStripeConnect = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`${API_URL}/check-connect-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await response.json();

      if (data.success) {
        setStripeConnect({
          loading: false,
          connected: data.hasAccount,
          chargesEnabled: data.chargesEnabled || false,
          accountId: data.accountId || null
        });
      } else {
        setStripeConnect(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Failed to check Stripe status:', err);
      setStripeConnect(prev => ({ ...prev, loading: false }));
    }
  };

  // Start Stripe Connect onboarding
  const startStripeConnect = async () => {
    if (!projectId || !user?.uid) {
      showToast('Unable to set up payments. Please try again.', 'error');
      return;
    }

    try {
      setStripeConnect(prev => ({ ...prev, loading: true }));

      const response = await fetch(`${API_URL}/create-connect-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: user.uid
        })
      });

      const data = await response.json();

      if (data.success && data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      } else {
        throw new Error(data.error || 'Failed to start payment setup');
      }
    } catch (err) {
      console.error('Stripe Connect error:', err);
      showToast(err.message || 'Failed to set up payments', 'error');
      setStripeConnect(prev => ({ ...prev, loading: false }));
    }
  };

  // Check for connect success/refresh in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connect_success') === 'true') {
      showToast('Payment setup completed successfully!', 'success');
      checkStripeConnect();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('connect_refresh') === 'true') {
      showToast('Please complete your payment setup', 'error');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Toast helper function
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Delete product and its image from Google Drive
  const handleDelete = async (product) => {
    if (product.driveFileId) {
      try {
        const response = await fetch(`${API_URL}/api/delete-product-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: SecurityUtils.sanitizeText(projectId),
            fileId: SecurityUtils.sanitizeText(product.driveFileId)
          })
        });
        const data = await response.json();
        if (data.success) {
          console.log('✅ Image deleted from Drive');
        }
      } catch (err) {
        console.warn('⚠️ Could not delete from Drive:', err);
      }
    }

    deleteProduct(product.id);
    showToast(`"${SecurityUtils.sanitizeName(product.name)}" has been deleted`, 'success');
  };

  // Initialize Firebase and check auth state
  useEffect(() => {
    const initAuth = async () => {
      const loaded = await loadFirebase();
      if (!loaded) {
        setAuthMode('error');
        setAuthError('Failed to initialize authentication. Please refresh the page.');
        return;
      }

      auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          try {
            const response = await fetch(`${API_URL}/api/verify-project-owner?` + new URLSearchParams({
              userId: firebaseUser.uid,
              projectId: projectId
            }));
            const data = await response.json();

            if (data.isOwner === true) {
              setIsOwner(true);
              setAuthMode('authenticated');
              localStorage.setItem('userId', firebaseUser.uid);
              localStorage.setItem('projectId', projectId);
              checkStripeConnect(); // Check Stripe Connect status
            } else {
              setIsOwner(false);
              setAuthMode('not-owner');
            }
          } catch (err) {
            console.error('Owner check failed:', err);
            setIsOwner(true);
            setAuthMode('authenticated');
            localStorage.setItem('userId', firebaseUser.uid);
            checkStripeConnect(); // Check Stripe Connect status
          }
        } else {
          setUser(null);
          setIsOwner(false);
          setAuthMode('login');
        }
      });
    };

    initAuth();
  }, [projectId]);

  // Security: Check rate limit status on mount
  useEffect(() => {
    const checkLockout = () => {
      const identifier = 'login_' + (projectId || 'default');
      if (!RateLimiter.canAttempt(identifier)) {
        setIsLocked(true);
        setLockoutMinutes(RateLimiter.getRemainingTime(identifier));
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [projectId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    const identifier = 'login_' + (projectId || 'default');

    // Security: Check rate limit
    if (!RateLimiter.canAttempt(identifier)) {
      const minutes = RateLimiter.getRemainingTime(identifier);
      setIsLocked(true);
      setLockoutMinutes(minutes);
      setAuthError(`Too many failed attempts. Please try again in ${minutes} minutes.`);
      return;
    }

    // Security: Sanitize inputs
    const sanitizedEmail = SecurityUtils.sanitizeEmail(email);

    // Security: Detect attack patterns
    if (SecurityUtils.detectAttack(email) || SecurityUtils.detectAttack(password)) {
      RateLimiter.recordAttempt(identifier, false);
      setAuthError('Invalid input detected.');
      return;
    }

    try {
      await auth.signInWithEmailAndPassword(sanitizedEmail, password);
      RateLimiter.recordAttempt(identifier, true); // Reset on success
    } catch (err) {
      console.error('Login error:', err);
      RateLimiter.recordAttempt(identifier, false);

      const attemptsLeft = RateLimiter.getAttemptsLeft(identifier);

      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError(`Invalid email or password. ${attemptsLeft} attempts remaining.`);
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Invalid email format');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Too many failed attempts. Please try again later.');
        setIsLocked(true);
        setLockoutMinutes(15);
      } else {
        setAuthError('Login failed. Please try again.');
      }

      if (attemptsLeft === 0) {
        setIsLocked(true);
        setLockoutMinutes(15);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('userId');
      localStorage.removeItem('projectId');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleImageUploaded = (imageUrl, fileId) => {
    setForm(prev => ({ ...prev, image: imageUrl, driveFileId: fileId || null }));
  };

  // Security: Sanitized form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Security: Sanitize all inputs
    const sanitizedData = {
      name: SecurityUtils.sanitizeName(form.name),
      description: SecurityUtils.sanitizeDescription(form.description),
      price: parseFloat(SecurityUtils.sanitizePrice(form.price)) || 0,
      image: form.image, // Already validated by ImageUploader
      category: SecurityUtils.sanitizeCategory(form.category),
      inStock: Boolean(form.inStock),
      driveFileId: form.driveFileId || null,
      externalPaymentUrl: SecurityUtils.sanitizeUrl(form.externalPaymentUrl)
    };

    // Security: Detect attack patterns
    if (SecurityUtils.detectAttack(form.name) ||
      SecurityUtils.detectAttack(form.description) ||
      SecurityUtils.detectAttack(form.category)) {
      setFormError('Invalid characters detected. Please remove special characters and try again.');
      showToast('Invalid input detected', 'error');
      return;
    }

    // Validate required fields
    if (!sanitizedData.name || sanitizedData.name.length < 1) {
      setFormError('Product name is required');
      return;
    }

    if (sanitizedData.price <= 0 || isNaN(sanitizedData.price)) {
      setFormError('Please enter a valid price');
      return;
    }

    // Validate external URL if provided
    if (form.externalPaymentUrl && !sanitizedData.externalPaymentUrl) {
      setFormError('Invalid payment URL. Must start with http:// or https://');
      return;
    }

    if (editing) {
      updateProduct(editing, sanitizedData);
      showToast('Product updated successfully!', 'success');
    } else {
      addProduct(sanitizedData);
      showToast('Product added successfully!', 'success');
    }

    setForm({ name: '', description: '', price: '', image: '', category: '', inStock: true, driveFileId: null, externalPaymentUrl: '' });
    setEditing(null);
    setFormError('');
  };

  const startEdit = (product) => {
    setEditing(product.id);
    setForm({
      ...product,
      price: product.price?.toString() || '',
      driveFileId: product.driveFileId || null,
      externalPaymentUrl: product.externalPaymentUrl || ''
    });
    setFormError('');
  };

  // Loading state
  if (authMode === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (authMode === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Login form with rate limiting
  if (authMode === 'login') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Store Login</h1>
            <p className="text-gray-600 text-sm">Log in with your Alimi account credentials</p>
          </div>

          {isLocked ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-5xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-red-600 mb-2">Account Temporarily Locked</h2>
              <p className="text-gray-600 mb-4">
                Too many failed login attempts. Please try again in {lockoutMinutes} minutes.
              </p>
              <p className="text-sm text-gray-500">
                This is a security measure to protect your account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  required
                  maxLength={128}
                  autoComplete="current-password"
                />
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {authError}
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium">
                Sign In
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-gray-600 text-sm mb-3">Don't have an account?</p>
            <a
              href="https://alimi.ai/dashboard.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Create account at Alimi →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Not owner state
  if (authMode === 'not-owner') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to manage this store. Please sign in with the account that owns this website.
          </p>
          <button
            onClick={handleLogout}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Sign in with different account
          </button>
        </div>
      </div>
    );
  }

  // Authenticated - Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Store Dashboard</h1>
            <p className="text-gray-600 text-sm mt-1">Signed in as {user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-medium">
            Logout
          </button>
        </div>

        {/* Connection Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">
            ✅ <strong>Connected to Your Store</strong> - Product images will be saved to your Google Drive
          </p>
        </div>

        {/* Stripe Connect Status */}
        <div className={`border rounded-lg p-4 mb-6 ${stripeConnect.chargesEnabled
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
          }`}>
          {stripeConnect.loading ? (
            <p className="text-gray-600">⏳ Checking payment setup...</p>
          ) : stripeConnect.chargesEnabled ? (
            <div className="flex items-center justify-between">
              <p className="text-green-800">
                ✅ <strong>Payments Enabled</strong> - Your store can accept payments
              </p>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Active</span>
            </div>
          ) : stripeConnect.connected ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800 font-medium">⚠️ Payment Setup Incomplete</p>
                <p className="text-yellow-700 text-sm">Complete your Stripe setup to accept payments</p>
              </div>
              <button
                onClick={startStripeConnect}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Complete Setup
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800 font-medium">💳 Set Up Payments</p>
                <p className="text-yellow-700 text-sm">Connect Stripe to accept credit card payments from customers</p>
              </div>
              <button
                onClick={startStripeConnect}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Connect Stripe
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Product' : 'Add Product'}</h2>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={200}
            />
            <input
              type="number"
              placeholder="Price"
              required
              step="0.01"
              min="0"
              max="999999.99"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
              <ImageUploader
                currentImage={form.image}
                onImageUploaded={handleImageUploaded}
                userId={user?.uid}
                projectId={projectId}
              />
              {form.image && !form.image.startsWith('data:') && (
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="Or enter image URL directly"
                  className="mt-2 p-2 border rounded w-full text-sm"
                  maxLength={2000}
                />
              )}
            </div>
            <input
              type="text"
              placeholder="Category (optional)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
            <div>
              <input
                type="url"
                placeholder="External Payment Link (optional)"
                value={form.externalPaymentUrl}
                onChange={(e) => setForm({ ...form, externalPaymentUrl: e.target.value })}
                className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">Stripe, PayPal, or other checkout link. If set, "Buy Now" opens this URL.</p>
            </div>
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 md:col-span-2"
              rows="3"
              maxLength={5000}
            />
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              In Stock
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
              {editing ? 'Update Product' : 'Add Product'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setForm({ name: '', description: '', price: '', image: '', category: '', inStock: true, driveFileId: null, externalPaymentUrl: '' }); setFormError(''); }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Products ({products.length})</h2>
          </div>
          {products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No products yet. Add your first product above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Image</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Payment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <img
                          src={product.image || 'https://placehold.co/50x50?text=No+Image'}
                          alt={SecurityUtils.sanitizeName(product.name)}
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => { e.target.src = 'https://placehold.co/50x50?text=Error'; }}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3">${product.price?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${product.externalPaymentUrl ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {product.externalPaymentUrl ? 'External' : 'Cart'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => startEdit(product)} className="text-blue-600 hover:text-blue-800 mr-4 font-medium">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white flex items-center gap-2`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;