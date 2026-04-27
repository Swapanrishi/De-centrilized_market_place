import { useState, useEffect} from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {ethers} from "ethers";
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
  // --- CORE STATE ---
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [userId, setUserId] = useState<string>(""); 
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  // --- FORM STATE ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceEth, setPriceEth] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  // --- FETCH LOGIC ---

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
  }, []); // Empty array ensures this only runs once when the app loads

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = (await window.ethereum.request({ 
          method: "eth_requestAccounts" 
        })) as string[];
        
        const address = accounts[0];
        setWalletAddress(address);

        try {
          const userRes = await axios.post("http://127.0.0.1:5000/api/users", {
            walletAddress: address,
            username: "Trader_" + address.slice(2, 6),
            bio: "BlockMart User",
          });
          
          if (userRes.data.user?.id) {
            setUserId(userRes.data.user.id);
            console.log("Database Sync Successful. User ID:", userRes.data.user.id);
          }
        } catch (dbError: unknown) {
          if (axios.isAxiosError(dbError)) {
            console.error("Database sync failed:", dbError.response?.data || dbError.message);
          }
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
    if (!userId) return alert("Syncing account...");

    setIsSubmitting(true);
    try {
      await axios.post("http://127.0.0.1:5000/api/products", {
        title,
        description,
        priceEth: parseFloat(priceEth),
        imageUrl,
        sellerId: userId,
      });
      
      // Instead of calling fetchCatalog(), we just go home. 
      // The useEffect on the home route will handle the refresh.
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
      // 1. Connect to MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 2. Build the transaction
      const tx = await signer.sendTransaction({
        to: product.seller.walletAddress,
        value: ethers.parseEther(product.priceEth.toString())
      });

      console.log("Transaction sent! Hash:", tx.hash);

      // 3. Wait for confirmation
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        // 4. Save to Database
        await axios.post("http://127.0.0.1:5000/api/orders", {
          productId: product.id,
          buyerId: userId,
          transactionHash: tx.hash
        });

        alert("Purchase successful! The item is yours.");
        
        // INSTANT UI UPDATE: Remove the purchased item from the current view
        setProducts((prevProducts) => prevProducts.filter((p) => p.id !== product.id));
      }

    } catch (error: unknown) {
      console.error("Transaction Failed:", error);
      const err=error as { code?: string ;message?: string};
      if (err.code === "ACTION_REJECTED") {
        alert("Transaction cancelled by user.");
      } else {
        alert("Transaction failed. Check console for details.");
      }
    } finally {
      setBuyingId(null);
    }
  };
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* --- STYLISH HEADER --- */}
      <header className="p-4 bg-white/80 backdrop-blur-md shadow-sm flex justify-between items-center sticky top-0 z-50 border-b border-gray-100">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-black tracking-tighter text-blue-600 hover:opacity-80 transition-opacity">
            BLOCK<span className="text-gray-900">MART</span>
          </Link>
          <nav className="flex gap-4">
            <Link to="/" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors">Marketplace</Link>
            <Link to="/sell" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors">Sell Gear</Link>
          </nav>
        </div>
        
        {!walletAddress ? (
          <button 
            onClick={connectWallet} 
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono font-bold text-gray-600">{formatAddress(walletAddress)}</span>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <Routes>
          {/* --- MARKETPLACE VIEW --- */}
          <Route path="/" element={
            <>
              <div className="mb-10 flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">Marketplace</h2>
                  <p className="text-gray-500 font-medium">Discover unique hardware and IOT devices.</p>
                </div>
                <p className="px-4 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full uppercase tracking-widest">
                  {products.length} Active
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.length === 0 ? (
                  <div className="col-span-full text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <p className="text-xl font-bold text-gray-400 mb-6">The market is quiet right now...</p>
                    <Link to="/sell" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                      Be the first to list an item
                    </Link>
                  </div>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img 
                          src={product.imageUrl} 
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-black rounded-lg shadow-sm uppercase tracking-widest text-blue-600">
                          Verified
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                            {product.title}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 font-medium line-clamp-2 mb-6 h-10">{product.description}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</p>
                            <p className="text-xl font-black text-blue-600">{product.priceEth} ETH</p>
                          </div>
                         <button 
  // 1. Triggers the blockchain transaction logic
  onClick={() => handleBuyNow(product)}
  
  // 2. Disable if wallet is disconnected OR if we are currently buying this specific item
  disabled={!walletAddress || buyingId === product.id} 
  
  className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
    buyingId === product.id 
    ? 'bg-yellow-400 text-yellow-900 cursor-wait animate-pulse' 
    : walletAddress 
      ? 'bg-gray-900 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100' 
      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
  }`}
>
  {/* 3. Dynamic text feedback */}
  {buyingId === product.id ? 'Processing TX...' : walletAddress ? 'Buy Now' : 'Connect'}
</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          } />

          {/* --- SELL PAGE VIEW --- */}
          <Route path="/sell" element={
            <div className="max-w-xl mx-auto bg-white p-10 rounded-[32px] shadow-2xl shadow-gray-200/50 border border-gray-50">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-gray-900 italic">List Your Item</h2>
                <p className="text-gray-500 font-medium mt-2 text-sm">Join the BlockMart hardware economy.</p>
              </div>

              {!walletAddress ? (
                <div className="text-center p-8 bg-blue-50 border border-blue-100 rounded-2xl">
                  <p className="text-blue-800 font-bold mb-4 italic">Wallet Connection Required</p>
                  <button onClick={connectWallet} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl">Connect Now</button>
                </div>
              ) : (
                <form onSubmit={handleCreateListing} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Product Title</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ESP32 board" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                    <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Item condition, specs, etc..." rows={3} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Price (ETH)</label>
                      <input type="number" step="0.001" required value={priceEth} onChange={(e) => setPriceEth(e.target.value)} placeholder="0.05" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Image URL</label>
                      <input type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-medium" />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50">
                    {isSubmitting ? 'Verifying...' : 'Publish to Marketplace'}
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