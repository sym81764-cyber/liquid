import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  BarChart3, 
  Package, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  DollarSign, 
  LayoutDashboard, 
  Settings, 
  Globe, 
  Bell, 
  Search, 
  Plus, 
  ChevronDown, 
  Check, 
  LogOut, 
  Tag, 
  Handshake, 
  HelpCircle, 
  Menu, 
  X, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Layers, 
  Star, 
  Rocket, 
  UserPlus, 
  Share2, 
  ExternalLink,
  Edit3,
  Trash2,
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram, 
  CreditCard,
  MousePointer2,
  ShieldCheck,
  Layout,
  Smartphone,
  Clock,
  Image as ImageIcon,
  UploadCloud,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, Store, Product, Sale } from './firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Toast Notification Component
const ToastContainer = () => {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  useEffect(() => {
    const handleToast = (event: any) => {
      const { message, type } = event.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type }]);
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    window.addEventListener('liquid-toast', handleToast);
    return () => window.removeEventListener('liquid-toast', handleToast);
  }, []);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto bg-black text-white px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 min-w-[320px] max-w-[450px] relative overflow-hidden"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toast.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
              {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">Notification</div>
              <div className="text-sm font-bold leading-tight">{toast.message}</div>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-40" />
            </button>
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className={`absolute bottom-0 left-0 h-1 ${toast.type === 'error' ? 'bg-red-500' : 'bg-accent'} rounded-full opacity-30`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Global helper for showing toasts from UI
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  window.dispatchEvent(new CustomEvent('liquid-toast', { 
    detail: { message, type } 
  }));
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10 text-center">
          <h1 className="text-4xl font-black mb-6 tracking-tighter">Something went wrong</h1>
          <div className="bg-white/10 p-6 rounded-2xl mb-8 max-w-2xl overflow-auto text-sm font-mono text-left">
            {this.state.errorInfo}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-accent text-black px-10 py-4 rounded-full font-black hover:scale-105 transition-transform"
          >
            Refresh App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CreateStoreModal = ({ isOpen, onClose, onComplete, existingSlugs, user }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onComplete: (s: Store) => void,
  existingSlugs: string[],
  user: User | null
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const categories = ['Digital Art', 'Software', 'Courses', 'E-books', 'Templates', 'Music', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (existingSlugs.includes(slug)) {
      setError('This URL is already taken.');
      return;
    }

    setIsCreating(true);
    const storeId = slug;
    const storePath = `stores/${storeId}`;

    try {
      // Check if slug taken globally
      const existingDoc = await getDocFromServer(doc(db, 'stores', storeId));
      if (existingDoc.exists()) {
        setError('This URL is already taken by another user.');
        setIsCreating(false);
        return;
      }
      
      const newStore: Store = {
        id: storeId,
        name,
        slug,
        ownerId: user.uid,
        theme_color: '#000000',
        category,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'stores', storeId), newStore).catch(err => handleFirestoreError(err, OperationType.CREATE, storePath));
      
      const productPath = 'products';
      await addDoc(collection(db, 'products'), {
        name: 'My First Digital Product',
        price: '$19.00',
        storeId: storeId,
        sales: 0,
        revenue: 0,
        description: '<p>Welcome to your new store! This is your first product.</p>'
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, productPath));

      showToast(`Store "${name}" created successfully!`);
      onComplete(newStore);
      setIsCreating(false);
      setName('');
      setSlug('');
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 text-black">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white p-8 md:p-10 rounded-[40px] shadow-2xl border border-ink/5"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-ink/5 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-2xl font-black">Create New Store</h2>
          <p className="text-ink/40 text-xs font-medium">Launch another digital business in seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Store Name</label>
            <input 
              type="text" 
              placeholder="e.g. Studio Archi" 
              value={name}
              maxLength={50}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3.5 font-bold focus:ring-2 focus:ring-accent transition-all" 
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Username (Unique URL)</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-ink/20 font-bold text-sm">liquid.app/</span>
              <input 
                type="text" 
                placeholder="studio-archi" 
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className={`w-full bg-gray-50 border-none rounded-2xl pl-[90px] pr-6 py-3.5 font-bold focus:ring-2 focus:ring-accent transition-all ${error ? 'ring-2 ring-red-500' : ''}`} 
                required
              />
            </div>
            {error && <p className="text-[10px] text-red-500 font-bold mt-1 ml-2">{error}</p>}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Store Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-xl text-[10px] font-black transition-all border-2 ${
                    category === cat 
                      ? 'bg-black text-white border-black' 
                      : 'bg-gray-50 text-ink/40 border-transparent hover:border-ink/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            disabled={isCreating || !name || !slug}
            className="w-full bg-black text-white py-4 rounded-2xl font-black hover:scale-[1.02] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Store <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Navbar = ({ isDark, toggleTheme, setView, store, onCreateStore, user, onLogin, onLogout }: { 
  isDark: boolean, 
  toggleTheme: () => void, 
  setView: (v: any) => void, 
  store: any, 
  onCreateStore: () => void,
  user: User | null,
  onLogin: () => void,
  onLogout: () => void
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAuthAction = () => {
    if (user) {
      if (store) {
        setView('dashboard');
      } else {
        onCreateStore();
      }
    } else {
      onLogin();
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="flex items-center justify-between px-6 md:px-12 py-8 bg-surface/80 backdrop-blur-md sticky top-0 z-[100] border-b border-ink/5">
      <div className="flex items-center gap-12">
        <div 
          onClick={() => setView('landing')} 
          className="font-black text-3xl tracking-tighter cursor-pointer hover:scale-105 transition-transform"
        >
          LIQUID
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Pricing'].map((item) => (
            <button 
              key={item}
              onClick={() => scrollTo(item.toLowerCase())}
              className="text-sm font-bold text-ink/40 hover:text-ink transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={toggleTheme}
          className="p-2.5 hover:bg-ink/5 rounded-full transition-colors hidden sm:block"
        >
          {isDark ? <Zap className="w-5 h-5 text-accent" /> : <Zap className="w-5 h-5" />}
        </button>
        
        <div className="hidden md:flex items-center gap-8">
          {user ? (
            <div className="flex items-center gap-6">
              <button 
                onClick={handleAuthAction}
                className="flex items-center gap-2 text-sm font-bold hover:opacity-60 transition-opacity"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} className="w-6 h-6 rounded-full border border-ink/10" referrerPolicy="no-referrer" />
                ) : (
                  <Rocket className="w-4 h-4 text-accent" />
                )}
                {store ? 'Dashboard' : 'Launch Store'}
              </button>
              <button 
                onClick={onLogout}
                className="text-xs font-black uppercase tracking-widest text-red-500 hover:opacity-60"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 text-sm font-bold hover:opacity-60 transition-opacity"
              >
                <div className="w-1.5 h-1.5 bg-ink rounded-full" />
                Sign In
              </button>
              <button 
                onClick={onLogin}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 hover:bg-ink/5 rounded-lg"
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-surface border-b border-ink/5 p-6 md:hidden flex flex-col gap-6 shadow-2xl"
          >
            {['Features', 'Pricing'].map((item) => (
              <button 
                key={item}
                onClick={() => { scrollTo(item.toLowerCase()); setIsMenuOpen(false); }}
                className="text-left font-bold text-lg"
              >
                {item}
              </button>
            ))}
            <button 
              onClick={handleAuthAction}
              className="bg-black text-white py-4 rounded-2xl font-black text-center"
            >
              {user ? (store ? 'Go to Dashboard' : 'Launch Store') : 'Sign In'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ setView, store, onCreateStore, user, onLogin }: { 
  setView: (v: any) => void, 
  store: any, 
  onCreateStore: () => void,
  user: User|null,
  onLogin: () => void
}) => {
  const handleStartSelling = () => {
    if (!user) {
      onLogin();
      return;
    }
    if (store) {
      setView('dashboard');
    } else {
      onCreateStore();
    }
  };

  return (
    <section className="relative flex flex-col items-center text-center pt-8 md:pt-12 pb-16 md:pb-24 px-6 md:px-8 overflow-hidden">
      <div className="hidden sm:block absolute top-20 left-[10%] md:left-[20%] animate-float-slow">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-lg rotate-12 flex items-center justify-center">
          <Zap className="text-accent w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl"
      >
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight leading-[0.9] mb-6">
          Sell Anything <br className="hidden sm:block" />
          Digital with LIQUID
        </h1>
        <p className="text-base md:text-lg font-medium text-ink/60 mb-10 max-w-2xl mx-auto">
          The fluid platform for creators. Sell courses, assets, and software in seconds.
        </p>
        <button 
          onClick={handleStartSelling}
          className="bg-black text-white px-10 py-5 rounded-full text-lg font-black hover:scale-105 transition-transform shadow-2xl flex items-center gap-3 group"
        >
          <Rocket className="w-6 h-6 text-accent group-hover:animate-bounce" />
          {user ? (store ? 'Go to Dashboard' : 'Start Selling Now') : 'Join Liquid Now'} <ArrowRight />
        </button>
      </motion.div>
    </section>
  );
};

const Features = () => (
  <section id="features" className="px-6 md:px-12 py-24 max-w-7xl mx-auto">
    <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-8">
      <div className="max-w-xl">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-4">Features</div>
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">Everything you need to <br /><span className="text-ink/20">Start Selling.</span></h2>
      </div>
      <div className="text-sm font-medium text-ink/40 max-w-sm">
        We built LIQUID to be the fastest way to turn your digital assets into a professional business. No complex setups, just pure flow.
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        { 
          title: "Instant Storefront", 
          desc: "Launch a beautiful, conversion-optimized store in under 60 seconds.", 
          icon: Layout,
          color: "bg-blue-500/10 text-blue-500"
        },
        { 
          title: "Fluid Analytics", 
          desc: "Track every sale, customer, and trend with real-time visual dashboards.", 
          icon: BarChart3,
          color: "bg-green-500/10 text-green-500"
        },
        { 
          title: "Mobile Ready", 
          desc: "Your store looks stunning on every device, from desktop to smartphone.", 
          icon: Smartphone,
          color: "bg-purple-500/10 text-purple-500"
        },
        { 
          title: "Secure Delivery", 
          desc: "Rest easy knowing your digital assets are protected and delivered instantly.", 
          icon: ShieldCheck,
          color: "bg-red-500/10 text-red-500"
        },
        { 
          title: "Global Reach", 
          desc: "Accept payments from anywhere in the world with localized checkouts.", 
          icon: Globe,
          color: "bg-accent/10 text-black"
        },
        { 
          title: "Pure Simplicity", 
          desc: "Focus on creating; we take care of the tech, hosting, and plumbing.", 
          icon: MousePointer2,
          color: "bg-orange-500/10 text-orange-500"
        }
      ].map((feature, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="p-10 rounded-[48px] border border-ink/5 bg-surface hover:shadow-2xl hover:scale-[1.02] transition-all group"
        >
          <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform`}>
            <feature.icon className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-black mb-4 tracking-tight">{feature.title}</h3>
          <p className="text-ink/40 font-medium text-sm leading-relaxed">{feature.desc}</p>
        </motion.div>
      ))}
    </div>
  </section>
);

const SocialProof = () => (
  <section className="px-6 md:px-12 py-12 md:py-16 border-y border-ink/5 bg-background/50">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
      <div className="font-black text-xl tracking-tighter">COURSES</div>
      <div className="font-black text-xl tracking-tighter">SOFTWARE</div>
      <div className="font-black text-xl tracking-tighter">ASSETS</div>
      <div className="font-black text-xl tracking-tighter">TEMPLATES</div>
      <div className="font-black text-xl tracking-tighter">BOOKS</div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section className="px-6 md:px-12 py-16 md:py-24 bg-background/30 border-y border-ink/5">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-black mb-4">How LIQUID Works</h2>
        <p className="text-ink/60 font-medium text-sm md:text-base">Four simple steps to digital freedom.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 relative">
        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-ink/5 -z-10" />
        {[
          { step: "01", title: "Join the Flow", desc: "Create your LIQUID account in seconds.", icon: UserPlus },
          { step: "02", title: "Drop your Assets", desc: "Upload your products and set your price.", icon: UploadCloud },
          { step: "03", title: "Share the Link", desc: "Use high-conversion links anywhere.", icon: Globe },
          { step: "04", title: "Collect Payouts", desc: "Get paid instantly as you make sales.", icon: DollarSign }
        ].map((item, i) => (
          <div key={i} className="text-center p-6 bg-surface rounded-[40px] border border-ink/5 shadow-sm hover:shadow-xl transition-all group">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <item.icon className="w-6 h-6 text-black" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">{item.step}</div>
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-xs text-ink/40 font-medium">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Pricing = ({ setView, store, onCreateStore, user, onLogin }: { 
  setView: (v: any) => void, 
  store: any, 
  onCreateStore: () => void,
  user: User | null,
  onLogin: () => void
}) => (
  <section id="pricing" className="px-6 md:px-12 py-24 bg-black text-white">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Simple, transparent pricing</h2>
        <p className="text-white/60 max-w-xl mx-auto font-medium">Powered by Whop. No monthly fees. No hidden costs. We only win when you win.</p>
      </div>
      <div className="max-w-2xl mx-auto bg-white/5 rounded-[40px] border border-white/10 p-8 md:p-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <span className="bg-accent text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Whop Powered</span>
        </div>
        <div className="text-7xl font-black mb-8">3%</div>
        <p className="text-xl font-bold mb-12 text-white/80">+ Whop Processing Fees</p>
        <button 
          onClick={() => user ? (store ? setView('dashboard') : onCreateStore()) : onLogin()}
          className="w-full bg-accent text-black py-6 rounded-full text-lg font-black hover:scale-[1.02] transition-transform shadow-xl"
        >
          {user ? (store ? 'Go to Dashboard' : 'Launch Now') : 'Get Started for Free'}
        </button>
      </div>
    </div>
  </section>
);

const Testimonials = () => (
  <section className="px-6 md:px-12 py-24 max-w-7xl mx-auto">
    <div className="text-center mb-16">
      <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Loved by 50,000+ creators</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-background/50 p-8 rounded-[32px] border border-ink/5">
          <p className="text-ink/70 font-medium italic mb-6 leading-relaxed">"LIQUID changed how I sell my brush packs. The interface is so clean, my customers love it."</p>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-ink/10 rounded-full" />
            <div>
              <div className="font-bold">Creator Name</div>
              <div className="text-[10px] text-ink/40 font-black uppercase tracking-widest">Digital Artist</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const FAQ = () => (
  <section className="px-6 md:px-12 py-24 bg-background/30 border-y border-ink/5">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-black mb-12 text-center">Frequently Asked Questions</h2>
      <div className="space-y-6">
        {[
          { q: "What can I sell on LIQUID?", a: "Anything digital! Courses, software, presets, assets, music, books, and more." },
          { q: "How do I get paid?", a: "Instantly. As soon as a customer pays, the funds are routed to your connected account." },
          { q: "Is there a monthly fee?", a: "No. You only pay when you make a sale. No hidden costs or monthly subscriptions." }
        ].map((item, i) => (
          <div key={i} className="bg-surface p-8 rounded-3xl border border-ink/5">
            <h3 className="font-bold text-lg mb-3">{item.q}</h3>
            <p className="text-sm text-ink/60 font-medium leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const SuccessPage = ({ setView }: { setView: (v: any) => void }) => (
  <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-black">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full text-center"
    >
      <div className="w-24 h-24 bg-green-500 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-green-500/20">
        <Check className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-black mb-4 tracking-tight">Payment Successful!</h1>
      <p className="text-ink/60 font-medium mb-10 leading-relaxed">Thank you for your purchase. Your digital assets are being delivered to your email via Whop.</p>
      <button 
        onClick={() => setView('landing')}
        className="w-full bg-black text-white py-5 rounded-full font-black text-lg hover:scale-105 transition-transform"
      >
        Back to Store
      </button>
    </motion.div>
  </div>
);

const Footer = () => (
  <footer className="px-6 md:px-12 py-16 bg-surface border-t border-ink/5">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-16">
        <div className="col-span-2">
          <div className="font-black text-3xl tracking-tighter mb-6 underline decoration-accent">LIQUID</div>
          <p className="text-sm text-ink/40 font-medium max-w-xs leading-relaxed mb-8">
            The design-first commerce platform for digital creators and modern software companies.
          </p>
          <div className="flex gap-4">
            <Facebook className="w-5 h-5 text-ink/20 hover:text-ink transition-colors cursor-pointer" />
            <Twitter className="w-5 h-5 text-ink/20 hover:text-ink transition-colors cursor-pointer" />
            <Instagram className="w-5 h-5 text-ink/20 hover:text-ink transition-colors cursor-pointer" />
            <Linkedin className="w-5 h-5 text-ink/20 hover:text-ink transition-colors cursor-pointer" />
          </div>
        </div>
        <div>
          <h4 className="font-black text-xs uppercase tracking-widest mb-6">Product</h4>
          <ul className="space-y-4 text-sm font-bold text-ink/40">
            <li className="hover:text-ink transition-colors cursor-pointer">Features</li>
            <li className="hover:text-ink transition-colors cursor-pointer">Pricing</li>
            <li className="hover:text-ink transition-colors cursor-pointer">Changelog</li>
          </ul>
        </div>
        <div>
          <h4 className="font-black text-xs uppercase tracking-widest mb-6">Company</h4>
          <ul className="space-y-4 text-sm font-bold text-ink/40">
            <li className="hover:text-ink transition-colors cursor-pointer">About</li>
            <li className="hover:text-ink transition-colors cursor-pointer">Careers</li>
            <li className="hover:text-ink transition-colors cursor-pointer">Privacy</li>
            <li className="hover:text-ink transition-colors cursor-pointer">Terms</li>
          </ul>
        </div>
      </div>
      <div className="pt-8 border-t border-ink/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-ink/20">© 2024 LIQUID INC. ALL RIGHTS RESERVED.</div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink/20">
          DESIGNED WITH <Sparkles className="w-3 h-3 text-accent" /> IN SF
        </div>
      </div>
    </div>
  </footer>
);

const ProductModal = ({ isOpen, onClose, onSave, product }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (p: any) => void,
  product?: any 
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [whopLink, setWhopLink] = useState('');
  const [whopPlanId, setWhopPlanId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPrice((product.price || '').replace('$', ''));
      setDescription(product.description || '');
      setWhopLink(product.whop_link || '');
      setWhopPlanId(product.whop_plan_id || '');
      setIsAvailable(product.isAvailable !== false); // Default to true if undefined
      setThumbnail(product.thumbnail);
    } else {
      setName('');
      setPrice('');
      setDescription('');
      setWhopLink('');
      setWhopPlanId('');
      setIsAvailable(true);
      setThumbnail(undefined);
    }
  }, [product, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result as string);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
        alert('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      name, 
      price: `$${price}`, 
      description, 
      whop_link: whopLink,
      whop_plan_id: whopPlanId,
      isAvailable,
      thumbnail
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 text-black">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-lg bg-white p-8 md:p-10 rounded-[40px] shadow-2xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-3xl font-black mb-8 tracking-tighter">{product ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-ink/10 rounded-[32px] bg-ink/[0.01] hover:bg-ink/[0.03] transition-all group relative overflow-hidden">
            {thumbnail ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden group">
                <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-transform">
                    Change Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer py-4">
                <div className="w-12 h-12 bg-white rounded-2xl border border-ink/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6 text-black" />
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-ink/40">Upload Thumbnail</div>
                <div className="text-[10px] text-ink/20 mt-1 font-medium italic">Max size: 500KB recommended</div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Product Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold border-2 border-transparent focus:border-accent transition-all bg-ink/[0.02]" required placeholder="e.g. Minimalist Icon Pack" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Price (USD)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold border-2 border-transparent focus:border-accent transition-all bg-ink/[0.02]" required placeholder="19.00" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Description</label>
            <div className="rounded-[32px] overflow-hidden border border-ink/5 bg-ink/[0.02]">
              <ReactQuill 
                theme="snow"
                value={description}
                onChange={setDescription}
                placeholder="Describe your product excellence..."
                className="liquid-editor"
                modules={{
                  toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                  ],
                }}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Whop Checkout Link</label>
            <input 
              type="url" 
              value={whopLink} 
              onChange={(e) => setWhopLink(e.target.value)} 
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold border-2 border-transparent focus:border-accent transition-all bg-ink/[0.02]" 
              placeholder="https://whop.com/checkout/..." 
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-2 block">Whop Plan ID (for Native Checkout)</label>
            <input 
              type="text" 
              value={whopPlanId} 
              onChange={(e) => setWhopPlanId(e.target.value)} 
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold border-2 border-transparent focus:border-accent transition-all bg-ink/[0.02]" 
              placeholder="plan_XXXXXXXX" 
            />
            <p className="text-[10px] text-ink/20 mt-2 font-medium">Recommended for a seamless "in-app" purchase experience.</p>
          </div>
          <div className="flex items-center justify-between p-4 bg-ink/[0.02] rounded-2xl">
            <div>
              <label className="text-xs font-black uppercase tracking-tight block">Product Visibility</label>
              <p className="text-[10px] text-ink/30 font-medium">Toggle whether customers can see this product.</p>
            </div>
            <button 
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAvailable ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl font-black text-sm text-ink/40 hover:bg-ink/5 transition-all">Cancel</button>
            <button type="submit" className="flex-[2] bg-black text-white py-4 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10">
              {product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ShareModal = ({ isOpen, onClose, url }: { isOpen: boolean, onClose: () => void, url: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 text-black">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl">
        <h2 className="text-2xl font-black mb-4">Share Store</h2>
        <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between gap-4 border border-ink/5">
          <code className="text-xs font-bold truncate">{url}</code>
          <button onClick={() => { navigator.clipboard.writeText(url); }} className="p-2 hover:bg-ink/5 rounded-lg transition-colors">
            <Check className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProductPage = ({ product, setView }: { product: any, setView: (v: any) => void }) => {
  const [showNativeCheckout, setShowNativeCheckout] = useState(false);

  useEffect(() => {
    // Listen for custom checkout events if the SDK provides them
    const handleWhopEvent = (e: any) => {
      if (e.detail?.action === 'payment_success') {
        setView('success');
      }
    };
    window.addEventListener('whop-event', handleWhopEvent);
    return () => window.removeEventListener('whop-event', handleWhopEvent);
  }, [setView]);

  return (
    <div className="min-h-screen bg-surface p-6 md:p-12">
      <div className="max-w-7xl mx-auto text-black">
        <button onClick={() => setView('landing')} className="mb-12 flex items-center gap-2 font-bold text-sm hover:opacity-60">
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to Store
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
          <div className="aspect-square bg-ink/5 rounded-[48px] flex items-center justify-center overflow-hidden">
            {product?.thumbnail ? (
              <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Package className="w-1/3 h-1/3 text-ink/10" />
            )}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-4">Product</div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">{product?.name}</h1>
            <div className="text-4xl font-black mb-10">{product?.price}</div>
            <div className="prose prose-sm dark:prose-invert font-medium text-ink/60 mb-12 leading-relaxed" dangerouslySetInnerHTML={{ __html: product?.description }} />
            
            <div className="space-y-6">
              {product?.isAvailable === false ? (
                <div className="p-10 rounded-[40px] bg-red-500/5 border border-red-500/10 text-center">
                   <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Clock className="w-6 h-6 text-red-500" />
                   </div>
                   <h3 className="text-xl font-black mb-2">Coming Soon</h3>
                   <p className="text-sm font-medium text-ink/40">This product is currently hidden from the store. Check back later!</p>
                </div>
              ) : product?.whop_plan_id ? (
                <>
                  <button 
                    onClick={() => setShowNativeCheckout(true)}
                    className="w-full h-20 bg-black text-white rounded-full font-black text-xl shadow-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-4 group"
                  >
                    Buy Now <Sparkles className="w-6 h-6 text-accent group-hover:rotate-12 transition-transform" />
                  </button>
                  <p className="text-center text-[10px] font-black uppercase tracking-widest text-ink/20 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-green-500" /> Secure checkout Experience
                  </p>
                </>
              ) : product?.whop_link ? (
                <a 
                  href={product.whop_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-20 bg-black text-white rounded-full font-black text-xl shadow-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-4 group"
                >
                  Buy Now with Whop <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </a>
              ) : (
                <div className="p-12 rounded-[48px] bg-red-500/5 border border-red-500/10 text-center">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-red-500 text-lg font-black tracking-tight mb-2">Checkout Unavailable</p>
                  <p className="text-ink/40 text-sm font-medium px-4">This product hasn't been linked to a checkout provider yet.</p>
                </div>
              )}
            </div>
            
            <div className="mt-16 pt-12 border-t border-ink/5 flex items-center gap-12 grayscale opacity-40">
               <div className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Secure</div>
               <div className="text-[10px] font-black uppercase tracking-[0.2em]">Instant Delivery</div>
            </div>
          </div>
        </div>
      </div>

      {/* Native Checkout Overlay */}
      <AnimatePresence>
        {showNativeCheckout && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowNativeCheckout(false)} 
              className="absolute inset-0 bg-ink/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden aspect-[4/5] md:aspect-video"
            >
              <button 
                onClick={() => setShowNativeCheckout(false)}
                className="absolute top-6 right-6 z-10 p-3 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-black"
              >
                <X className="w-6 h-6" />
              </button>
              {/* @ts-ignore */}
              <whop-checkout 
                plan-id={product.whop_plan_id}
                className="w-full h-full border-none"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StoreView = ({ store, products, setView, onSelectProduct }: { 
  store: Store, 
  products: any[], 
  setView: (v: any) => void,
  onSelectProduct: (p: any) => void
}) => {
  const visibleProducts = products.filter(p => p.isAvailable !== false);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 text-black">
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center justify-between mb-24">
          <div className="font-black text-2xl tracking-tighter cursor-pointer" onClick={() => setView('landing')}>{store.name}</div>
          <button onClick={() => setView('landing')} className="text-sm font-bold text-ink/40">Powered by LIQUID</button>
        </nav>
        <div className="mb-24 text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6">Welcome to {store.name}</h1>
          <p className="text-ink/40 font-medium">Browse our latest digital collections.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {visibleProducts.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <Package className="w-12 h-12 text-ink/10 mx-auto mb-4" />
              <p className="text-ink/40 font-medium">No products available at the moment.</p>
            </div>
          ) : (
            visibleProducts.map((p, i) => (
              <div key={i} className="group cursor-pointer" onClick={() => { onSelectProduct(p); setView('product-page'); }}>
                <div className="aspect-square bg-white rounded-[40px] border border-ink/5 mb-6 group-hover:shadow-2xl transition-all flex items-center justify-center overflow-hidden">
                   {p.thumbnail ? (
                     <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                   ) : (
                     <Package className="w-12 h-12 text-ink/5" />
                   )}
                </div>
                <h3 className="font-bold text-xl mb-2">{p.name}</h3>
                <div className="font-black text-accent">{p.price}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab = ({ sales, products }: { sales: Sale[], products: any[] }) => {
  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((acc, sale) => acc + sale.amount, 0);
    const totalOrders = sales.length;
    
    return [
      { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, trend: '+12%', icon: DollarSign },
      { label: 'Total Orders', value: totalOrders.toString(), trend: '+5%', icon: ShoppingBag },
      { label: 'Avg Order Value', value: `$${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0'}`, trend: '+2%', icon: TrendingUp },
    ];
  }, [sales]);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: sales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === date).reduce((acc, s) => acc + s.amount, 0),
      orders: sales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === date).length
    }));
  }, [sales]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[40px] border border-ink/5 shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-black" />
              </div>
              <span className={`text-xs font-black ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">{stat.label}</div>
            <div className="text-3xl font-black">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[48px] border border-ink/5 shadow-sm">
          <h3 className="font-black text-xl mb-10">Revenue Trend</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '12px 20px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[48px] border border-ink/5 shadow-sm">
          <h3 className="font-black text-xl mb-10">Order Volume</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#9CA3AF' }} />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '12px 20px' }}
                />
                <Bar dataKey="orders" fill="#000" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ 
  setView, 
  store, 
  stores, 
  onAddStore, 
  onSwitchStore, 
  products, 
  sales,
  onLogout,
  user,
  onSelectProduct 
}: { 
  setView: (v: any) => void, 
  store: Store, 
  stores: Store[], 
  onAddStore: (s: Store) => void, 
  onSwitchStore: (id: string) => void, 
  products: any[], 
  sales: Sale[],
  onLogout: () => void,
  user: User | null,
  onSelectProduct: (p: any) => void 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStoreSwitcherOpen, setIsStoreSwitcherOpen] = useState(false);

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((acc, sale) => acc + sale.amount, 0);
    const totalCustomers = new Set(sales.map(s => s.customerEmail)).size;
    const conversionRate = products.length > 0 ? (sales.length / (products.length * 10)) * 100 : 0; // Mock traffic factor
    
    return [
      { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, trend: '+12%', icon: DollarSign },
      { label: 'Customers', value: totalCustomers.toString(), trend: '+5%', icon: Users },
      { label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, trend: '-2%', icon: TrendingUp },
    ];
  }, [sales, products]);

  const handleAddProduct = async (newProduct: any) => {
    const path = 'products';
    await addDoc(collection(db, 'products'), {
      ...newProduct,
      storeId: store.id,
      sales: 0,
      revenue: 0,
      createdAt: Date.now()
    }).then(() => {
      showToast(`Product "${newProduct.name}" added successfully!`);
    }).catch(err => handleFirestoreError(err, OperationType.CREATE, path));
    setIsModalOpen(false);
  };

  const handleUpdateProduct = async (updatedDetails: any) => {
    if (!editingProduct) return;
    const path = `products/${editingProduct.id}`;
    await updateDoc(doc(db, 'products', editingProduct.id), {
      ...updatedDetails
    }).then(() => {
      showToast("Product updated successfully!");
    }).catch(err => handleFirestoreError(err, OperationType.UPDATE, path));
    setIsEditModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    const path = `products/${id}`;
    await deleteDoc(doc(db, 'products', id)).then(() => {
      showToast("Product deleted.");
    }).catch(err => handleFirestoreError(err, OperationType.DELETE, path));
  };

  const sidebarItems = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'Start Selling', icon: Rocket },
    { id: 'discounts', label: 'Discounts', icon: Tag },
    { id: 'affiliates', label: 'Affiliates', icon: Handshake },
    { id: 'payouts', label: 'Payouts', icon: DollarSign },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-surface relative text-black">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-6 border-b border-ink/5 bg-surface z-50">
        <div className="font-black text-xl tracking-tighter">LIQUID</div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-ink/5 rounded-full transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-0 md:inset-auto z-40 md:z-0
        w-full md:w-64 border-r border-ink/5 p-6 flex flex-col justify-between bg-surface
        transition-transform duration-300 md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          <div className="flex items-center justify-between mb-10 invisible md:visible">
            <div className="font-black text-2xl tracking-tighter">LIQUID</div>
            <button className="p-2 hover:bg-ink/5 rounded-full"><Bell className="w-5 h-5" /></button>
          </div>

          <div className="relative mb-8">
            <button 
              onClick={() => setIsStoreSwitcherOpen(!isStoreSwitcherOpen)}
              className="w-full p-4 bg-ink/5 rounded-2xl flex items-center justify-between hover:bg-ink/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-xs font-black">
                  {store.name[0]}
                </div>
                <div className="text-left">
                  <div className="text-sm font-black truncate max-w-[100px]">{store.name}</div>
                  <div className="text-[10px] font-medium text-ink/40">Basic Plan</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isStoreSwitcherOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isStoreSwitcherOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-ink/5 rounded-[24px] shadow-2xl p-2 z-[60]"
                >
                  {stores.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => { onSwitchStore(s.id); setIsStoreSwitcherOpen(false); }}
                      className="w-full p-3 flex items-center justify-between hover:bg-ink/5 rounded-xl transition-colors"
                    >
                      <span className="text-xs font-bold">{s.name}</span>
                      {s.id === store.id && <Check className="w-3 h-3 text-accent" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`
                  w-full p-4 rounded-2xl flex items-center gap-4 transition-all group
                  ${activeTab === item.id ? 'bg-black text-white shadow-lg' : 'hover:bg-ink/5 text-ink/40 hover:text-ink'}
                `}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-accent' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-ink/5">
          <button 
            onClick={onLogout}
            className="w-full p-4 flex items-center gap-4 text-ink/40 hover:text-red-500 transition-colors group"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2">Dashboard</div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              {activeTab === 'overview' ? `Welcome back, ${user?.displayName?.split(' ')[0]}` : sidebarItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('store-view')}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-ink/5 font-bold text-sm hover:bg-ink/5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> View Store
            </button>
            <button 
              onClick={() => {
                const url = `${window.location.origin}/store/${store.slug}`;
                navigator.clipboard.writeText(url);
                showToast("Store link copied to clipboard!");
              }}
              className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-2xl border border-ink/5 font-bold text-sm hover:bg-ink/5 transition-colors"
            >
              <Check className="w-4 h-4 text-accent" /> Copy Link
            </button>
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-ink/5 font-bold text-sm hover:bg-ink/5 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-bold text-sm hover:scale-105 transition-transform shadow-xl"
            >
              <Plus className="w-4 h-4 text-accent" /> New Product
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-[40px] border border-ink/5 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
                        <stat.icon className="w-6 h-6 text-black" />
                      </div>
                      <span className={`text-xs font-black ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.trend}
                      </span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-ink/30 mb-1">{stat.label}</div>
                    <div className="text-3xl font-black">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white p-6 md:p-10 rounded-[48px] border border-ink/5 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="font-black text-xl">Recent Sales</h3>
                  <button className="text-xs font-black uppercase tracking-widest border-b border-accent pb-1">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-ink/5">
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-ink/30">Customer</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-ink/30">Product</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-ink/30">Amount</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-ink/30">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-20 text-center text-ink/30 font-bold">No sales yet. Share your store to start selling!</td>
                        </tr>
                      ) : (
                        sales.slice(0, 5).map((sale, i) => (
                          <tr key={sale.id} className="group hover:bg-ink/[0.02] transition-colors">
                            <td className="py-6">
                              <div className="font-bold">{sale.customerEmail}</div>
                              <div className="text-[10px] font-medium text-ink/40">{new Date(sale.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="py-6 font-medium">{sale.productName}</td>
                            <td className="py-6 font-black">${sale.amount}</td>
                            <td className="py-6">
                              <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full uppercase">Success</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && <AnalyticsTab sales={sales} products={products} />}
          
          {activeTab === 'products' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.length === 0 ? (
                  <div className="col-span-full py-32 text-center bg-white rounded-[48px] border border-ink/5 shadow-sm">
                    <Rocket className="w-16 h-16 text-accent mx-auto mb-6 animate-bounce" />
                    <h3 className="text-3xl font-black mb-4">Start Selling Like a Pro</h3>
                    <p className="text-ink/40 font-medium mb-8 max-w-sm mx-auto">Launch your first product and join the thousands of creators driving traffic with LIQUID.</p>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="bg-black text-white px-8 py-4 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-5 h-5 text-accent" /> Add Your First Product
                    </button>
                  </div>
                ) : (
                  products.map((p, i) => (
                    <div key={i} className={`bg-white p-8 rounded-[40px] border border-ink/5 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden ${p.isAvailable === false ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingProduct(p); setIsEditModalOpen(true); }}
                          className="p-3 bg-surface rounded-2xl hover:bg-accent hover:text-black transition-all shadow-lg shadow-black/5"
                          title="Edit Product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-3 bg-surface rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-black/5"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-20 h-20 bg-ink/[0.03] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform overflow-hidden relative">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-8 h-8 text-ink/20" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-black text-2xl tracking-tight">{p.name}</h3>
                        {p.isAvailable === false && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-500 text-[8px] font-black uppercase rounded-full">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-ink/20">Revenue</span>
                            <span className="text-sm font-bold text-ink/40">${(p.revenue || 0).toLocaleString()}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-[10px] font-black uppercase tracking-widest text-ink/20 block">Price</span>
                            <span className="text-2xl font-black text-accent">{p.price}</span>
                         </div>
                      </div>
                    </div>
                  ))
                )}
             </motion.div>
          )}

          {activeTab === 'audience' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-[48px] border border-ink/5 shadow-sm">
                <h3 className="font-black text-2xl mb-8">Audience Insights</h3>
                <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-ink/5 rounded-[32px]">
                   <div className="text-center">
                      <Users className="w-12 h-12 text-ink/10 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Audience data is populating</h3>
                      <p className="text-ink/40 max-w-xs font-medium">Detailed demographic data will appear here as more sales are processed.</p>
                   </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>

        <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddProduct} />
        <ProductModal 
          isOpen={isEditModalOpen} 
          onClose={() => { setIsEditModalOpen(false); setEditingProduct(null); }} 
          onSave={handleUpdateProduct} 
          product={editingProduct} 
        />
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} url={`${window.location.origin}/store/${store.slug}`} />
      </main>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('landing');
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. You might be offline or using an invalid Project ID.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        setStores([]);
        setActiveStoreId(null);
        setView('landing');
      }
    }, (error) => {
      console.error("Auth state error", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(storesData);
      
      if (storesData.length > 0) {
        if (!activeStoreId || !storesData.find(s => s.id === activeStoreId)) {
          setActiveStoreId(storesData[0].id);
        }
      } else {
        setActiveStoreId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stores');
    });
    return () => unsubscribe();
  }, [user, activeStoreId]);

  useEffect(() => {
    if (!activeStoreId) {
      setProducts([]);
      setSales([]);
      return;
    }
    const qProd = query(collection(db, 'products'), where('storeId', '==', activeStoreId));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const qSales = query(collection(db, 'sales'), where('storeId', '==', activeStoreId));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
    });

    return () => {
      unsubProd();
      unsubSales();
    };
  }, [activeStoreId]);

  useEffect(() => {
    if (isAuthReady && user && stores.length > 0 && view === 'landing') {
      setView('dashboard');
    }
  }, [isAuthReady, user, stores.length]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const activeStore = stores.find(s => s.id === activeStoreId) || null;

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'dark bg-ink text-surface' : 'bg-surface text-ink'}`}>
      <ToastContainer />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap');
        :root {
          --accent: #FFD700;
          --surface: #FFFFFF;
          --background: #F8F9FA;
          --ink: #000000;
        }
        .dark {
          --accent: #FFD700;
          --surface: #000000;
          --background: #111111;
          --ink: #FFFFFF;
        }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-20px) rotate(12deg); }
        }
        .animate-float-slow {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
      
      {view === 'landing' && (
        <>
          <Navbar 
            isDark={isDark} 
            toggleTheme={toggleTheme} 
            setView={setView} 
            store={activeStore}
            onCreateStore={() => setIsCreateStoreModalOpen(true)}
            user={user}
            onLogin={handleLogin}
            onLogout={() => signOut(auth)}
          />
          <Hero 
            setView={setView} 
            store={activeStore} 
            onCreateStore={() => setIsCreateStoreModalOpen(true)}
            user={user}
            onLogin={handleLogin}
          />
          <SocialProof />
          <Features />
          <HowItWorks />
          <Pricing 
            setView={setView} 
            store={activeStore} 
            onCreateStore={() => setIsCreateStoreModalOpen(true)}
            user={user}
            onLogin={handleLogin}
          />
          <Testimonials />
          <FAQ />
          <Footer />
        </>
      )}

      {view === 'dashboard' && activeStore && (
        <Dashboard 
          setView={setView} 
          store={activeStore} 
          stores={stores}
          onAddStore={(s) => { setStores([...stores, s]); setActiveStoreId(s.id); }}
          onSwitchStore={setActiveStoreId}
          products={products}
          sales={sales}
          onLogout={() => signOut(auth)}
          user={user}
          onSelectProduct={setSelectedProduct}
        />
      )}

      {view === 'product-page' && selectedProduct && (
        <ProductPage product={selectedProduct} setView={setView} />
      )}

      {view === 'success' && (
        <SuccessPage setView={setView} />
      )}

      {view === 'store-view' && activeStore && (
        <StoreView store={activeStore} products={products} setView={setView} onSelectProduct={setSelectedProduct} />
      )}

      <CreateStoreModal 
        isOpen={isCreateStoreModalOpen} 
        onClose={() => setIsCreateStoreModalOpen(false)}
        onComplete={(s) => { setActiveStoreId(s.id); setView('dashboard'); setIsCreateStoreModalOpen(false); }}
        existingSlugs={stores.map(s => s.slug)}
        user={user}
      />
    </div>
  </ErrorBoundary>
  );
}
