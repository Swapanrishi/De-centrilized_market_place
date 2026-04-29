import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ethers } from "ethers";

interface Product {
  id: string;
  title: string;
  description: string;
  priceEth: number;
  imageUrl: string;
  seller: {
    walletAddress: string;
    username: string;
  };
}

function AppContent() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [userId, setUserId] = useState<string>(""); 
  const [products, setProducts] = useState<Product[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceEth, setPriceEth] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:5000/api/products");
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to fetch catalog", error);
      }
    };
    loadData();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
        const address = accounts[0];
        setWalletAddress(address);

        try {
          const userRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/users`, {
            walletAddress: address,
            username: "Trader_" + address.slice(2, 6),
            bio: "BlockMart User",
          });
          
          if (userRes.data.user?.id) {
            setUserId(userRes.data.user.id);
          }
        } catch (dbError: unknown) {
          console.error("Database sync failed:", dbError);
        }
      } catch (error) {
        console.error("MetaMask connection failed", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return alert("Account syncing... please try again in a moment.");

    setIsSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/products`, {
        title, description, priceEth: parseFloat(priceEth), imageUrl, sellerId: userId,
      });
      navigate("/");
      setTitle(""); setDescription(""); setPriceEth(""); setImageUrl("");
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async (product: Product) => {
    if (!window.ethereum) return alert("Please install MetaMask to make purchases.");
    if (!userId) return alert("Please wait for your account to sync.");

    setBuyingId(product.id);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: product.seller.walletAddress,
        value: ethers.parseEther(product.priceEth.toString())
      });

      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/orders`, {
          productId: product.id, buyerId: userId, transactionHash: tx.hash
        });
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === "ACTION_REJECTED") {
        console.log("Transaction cancelled by user.");
      } else {
        alert("Transaction failed. Check console for details.");
      }
    } finally {
      setBuyingId(null);
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* --- GLASSMORPHISM HEADER --- */}
      <header className="px-6 py-4 bg-white/70 backdrop-blur-xl shadow-sm flex justify-between items-center sticky top-0 z-50 border-b border-slate-200/50">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 hover:opacity-80 transition-opacity">
            BLOCK<span className="text-slate-900">MART</span>
          </Link>
          <nav className="flex gap-6">
            <Link to="/" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Marketplace</Link>
            <Link to="/sell" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Sell Gear</Link>
          </nav>
        </div>
        
        {!walletAddress ? (
          <button onClick={connectWallet} className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95">
            Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-3 px-5 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600">{formatAddress(walletAddress)}</span>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        <Routes>
          <Route path="/" element={
            <>
              {/* --- PREMIUM HERO BANNER --- */}
              <div className="mb-12 relative overflow-hidden rounded-[2rem] bg-slate-900 p-10 md:p-16 shadow-2xl">
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                    Decentralized Hardware.
                  </h2>
                  <p className="text-slate-400 text-lg md:text-xl max-w-xl font-medium mb-8">
                    Trade microcontrollers, sensors, and components securely using Ethereum smart contracts.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 uppercase tracking-widest">
                    <span className="text-indigo-400">{products.length}</span> Active Listings
                  </div>
                </div>
                {/* Decorative Blobs */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 right-40 -mb-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
              </div>

              {/* --- PRODUCT GRID --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.length === 0 ? (
                  <div className="col-span-full text-center py-24 bg-white/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-xl font-bold text-slate-400 mb-6">The market is quiet right now...</p>
                    <Link to="/sell" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                      List the first item
                    </Link>
                  </div>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="group bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300">
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                        <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-md text-[10px] font-black rounded-lg shadow-sm uppercase tracking-widest text-indigo-600">
                          Verified
                        </div>
                      </div>
                      
                      <div className="p-6 md:p-8">
                        <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {product.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6 h-10">{product.description}</p>
                        
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                            <p className="text-xl font-black text-slate-900">{product.priceEth} <span className="text-indigo-600 text-sm">ETH</span></p>
                          </div>
                          <button 
                            onClick={() => handleBuyNow(product)}
                            disabled={!walletAddress || buyingId === product.id} 
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                              buyingId === product.id 
                              ? 'bg-amber-100 text-amber-700 cursor-wait animate-pulse' 
                              : walletAddress 
                                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-indigo-600 hover:to-blue-600 hover:shadow-lg hover:shadow-indigo-200 active:scale-95' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {buyingId === product.id ? 'Processing...' : walletAddress ? 'Buy Now' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          } />

          <Route path="/sell" element={
            <div className="max-w-xl mx-auto bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400"></div>
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">List Your Item</h2>
                <p className="text-slate-500 font-medium mt-2 text-sm">Deploy your hardware to the decentralized market.</p>
              </div>

              {!walletAddress ? (
                <div className="text-center p-8 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <p className="text-indigo-900 font-bold mb-4">Connect your wallet to start selling.</p>
                  <button onClick={connectWallet} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Connect MetaMask</button>
                </div>
              ) : (
                <form onSubmit={handleCreateListing} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Product Title</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. NodeMCU ESP8266" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium placeholder-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Description</label>
                    <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, specifications, pin layout..." rows={3} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium placeholder-slate-400 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Price (ETH)</label>
                      <input type="number" step="0.001" required value={priceEth} onChange={(e) => setPriceEth(e.target.value)} placeholder="0.05" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-indigo-600 placeholder-slate-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Image URL</label>
                      <input type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium placeholder-slate-400" />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full mt-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Signing Transaction...' : 'Publish to Blockchain'}
                  </button>
                </form>
              )}
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;