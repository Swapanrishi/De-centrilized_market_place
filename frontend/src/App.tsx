import { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";

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

  // --- FETCH LOGIC ---
  const fetchCatalog = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/api/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch catalog", error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCatalog();
  }, [fetchCatalog]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = (await window.ethereum.request({ 
          method: "eth_requestAccounts" 
        })) as string[];
        
        const address = accounts[0];
        setWalletAddress(address);

        // Sync with Database
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
    
    // If this alert still triggers, the database sync above failed
    if (!userId) {
      return alert("Wait! Your account is still syncing with the database. Please try again in 2 seconds.");
    }

    setIsSubmitting(true);
    try {
      await axios.post("http://127.0.0.1:5000/api/products", {
        title,
        description,
        priceEth: parseFloat(priceEth),
        imageUrl,
        sellerId: userId,
      });
      
      await fetchCatalog();
      navigate("/");
      
      // Reset Form
      setTitle(""); setDescription(""); setPriceEth(""); setImageUrl("");
    } catch (error: unknown) {
      console.error("Failed to create listing", error);
      if (axios.isAxiosError(error)) {
        alert("Error: " + (error.response?.data?.error || "Check backend logs"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="p-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10 border-b">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-2xl font-bold text-blue-600">BlockMart</Link>
          <nav className="flex gap-4">
            <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Marketplace</Link>
            <Link to="/sell" className="text-gray-600 hover:text-blue-600 font-medium">Sell an Item</Link>
          </nav>
        </div>
        
        {!walletAddress ? (
          <button onClick={connectWallet} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
            Connect Wallet
          </button>
        ) : (
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-mono border border-green-300">
            {formatAddress(walletAddress)}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <Routes>
          <Route path="/" element={
            <>
              <div className="mb-8 flex justify-between items-end">
                <h2 className="text-3xl font-bold text-gray-800">Active Listings</h2>
                <p className="text-gray-500">{products.length} items available</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                  <div className="col-span-full text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">No products available yet.</p>
                    <Link to="/sell" className="px-6 py-2 bg-blue-50 text-blue-600 font-medium rounded-md hover:bg-blue-100">
                      Be the first to list an item
                    </Link>
                  </div>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <img src={product.imageUrl} alt={product.title} className="w-full h-48 object-cover bg-gray-100" />
                      <div className="p-4">
                        <h3 className="text-lg font-semibold">{product.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                        <div className="mt-4 flex justify-between items-center">
                          <span className="font-bold text-blue-600">{product.priceEth} ETH</span>
                        </div>
                        <button disabled={!walletAddress} className={`w-full mt-4 py-2 rounded-md font-medium ${walletAddress ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-200 text-gray-400'}`}>
                          {walletAddress ? 'Buy Now' : 'Connect Wallet to Buy'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          } />

          <Route path="/sell" element={
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">List an Item</h2>
              {!walletAddress ? (
                <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                  You must connect your wallet before listing an item.
                </div>
              ) : (
                <form onSubmit={handleCreateListing} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ESP32 board" className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the condition..." rows={3} className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (ETH)</label>
                    <input type="number" step="0.001" required value={priceEth} onChange={(e) => setPriceEth(e.target.value)} placeholder="0.05" className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste link to product image" className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors">
                    {isSubmitting ? 'Listing Item...' : 'Publish to Marketplace'}
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