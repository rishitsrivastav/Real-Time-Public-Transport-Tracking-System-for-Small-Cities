import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import LoadingAnimation from './components/LoadingAnimation';
import BusCard from './components/BusCard';
import BusDetailPage from './components/BusDetailPage';
import { Bus, RefreshCw, Search, X } from 'lucide-react';

// Configuration
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface Route {
  _id: string;
  routeName: string;
  stops: Stop[];
}

interface BusData {
  _id: string;
  busId: string;
  busNumber: string;
  capacity: number;
  driverId: string;
  routeId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  route: Route;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/bus/:busId" element={<BusDetailPage />} />
    </Routes>
  );
}

const HomePage: React.FC = () => {
  const [busData, setBusData] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBusData, setFilteredBusData] = useState<BusData[]>([]);

  const fetchBusData = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setRefreshing(true);
    }
    
    try {
      const response = await axios.get(`${API_BASE}/api/buses`, {
        timeout: 3000
      });
      
      setBusData(response.data);
      
      // Cache data in localStorage
      localStorage.setItem('busData', JSON.stringify(response.data));
      localStorage.setItem('busDataTimestamp', Date.now().toString());
      
    } catch (error) {
      // Try to load from cache on error
      const cachedData = localStorage.getItem('busData');
      if (cachedData) {
        setBusData(JSON.parse(cachedData));
      } else {
        // Use demo data if no cached data and backend is unavailable
        const demoData = [
          {
            _id: "demo1",
            busId: "demo-bus-1",
            busNumber: "DEMO 01",
            capacity: 40,
            driverId: "demo-driver-1",
            routeId: "demo-route-1",
            status: "offline",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            route: {
              _id: "demo-route-1",
              routeName: "Demo Route",
              stops: [
                { name: "Demo Stop 1", lat: 19.0760, lng: 72.8777 },
                { name: "Demo Stop 2", lat: 19.0896, lng: 72.8656 },
                { name: "Demo Stop 3", lat: 19.1136, lng: 72.8697 }
              ]
            }
          }
        ];
        setBusData(demoData);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Check for cached data first
    const cachedData = localStorage.getItem('busData');
    const cachedTimestamp = localStorage.getItem('busDataTimestamp');
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds for more frequent updates

    if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < twoMinutes)) {
      // Use cached data if less than 2 minutes old
      setBusData(JSON.parse(cachedData));
      setLoading(false);
    } else {
      // Fetch fresh data
      fetchBusData();
    }
  }, []);

  const handleRefresh = () => {
    fetchBusData(true);
  };

  // Filter buses based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBusData(busData);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = busData.filter(bus => {
      // Search by bus number
      if (bus.busNumber.toLowerCase().includes(query)) return true;
      
      // Search by route name
      if (bus.route.routeName.toLowerCase().includes(query)) return true;
      
      // Search by stop names
      const hasMatchingStop = bus.route.stops.some(stop => 
        stop.name.toLowerCase().includes(query)
      );
      if (hasMatchingStop) return true;
      
      return false;
    });
    
    setFilteredBusData(filtered);
  }, [searchQuery, busData]);

  if (loading) {
    return <LoadingAnimation isVisible={loading} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Bus className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Track Bus
                </h1>
                <p className="text-sm text-gray-600">Real-time bus tracking & navigation</p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Search by bus number, route, or stop name..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-center mt-3">
              <p className="text-sm text-gray-600">
                {filteredBusData.length === 0 
                  ? `No buses found for "${searchQuery}"`
                  : `Found ${filteredBusData.length} bus${filteredBusData.length === 1 ? '' : 'es'} for "${searchQuery}"`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredBusData.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-6 bg-white rounded-2xl shadow-lg max-w-md mx-auto">
              <Bus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No matching buses found' : 'No buses available'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try searching with different keywords or clear the search to see all buses.'
                  : 'Please check your backend connection or try refreshing.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
              {!searchQuery && (
                <button
                  onClick={() => fetchBusData(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBusData.map((bus) => (
              <BusCard key={bus._id} bus={bus} />
            ))}
          </div>
        )}

        {/* Stats */}
        {filteredBusData.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {searchQuery ? filteredBusData.length : busData.length}
                </p>
                <p className="text-sm text-gray-600">Total Buses</p>
              </div>
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                  {(searchQuery ? filteredBusData : busData).filter(bus => bus.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Active Buses</p>
              </div>
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  {(searchQuery ? filteredBusData : busData).reduce((total, bus) => total + bus.route.stops.length, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Stops</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default App;