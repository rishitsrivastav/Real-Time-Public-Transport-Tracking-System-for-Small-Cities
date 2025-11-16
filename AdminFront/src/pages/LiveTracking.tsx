import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MapPin, Navigation, Clock, Gauge, Filter, X, Bus, Activity } from 'lucide-react';
import liveBusesData from '../data/liveBuses.json';

interface LiveBus {
  busId: string;
  busNumber: string;
  driverName: string;
  latitude: number;
  longitude: number;
  currentStop: string;
  routeId: string;
  status: 'moving' | 'stopped' | 'idle';
  speed: number;
  lastUpdated: string;
}

const LiveTracking: React.FC = () => {
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<LiveBus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load initial data
    setBuses(liveBusesData);
    setFilteredBuses(liveBusesData);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = buses;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bus => bus.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(bus =>
        bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.currentStop.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBuses(filtered);
  }, [buses, statusFilter, searchTerm]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Simulate live updates with random position changes
      setBuses(prevBuses => 
        prevBuses.map(bus => ({
          ...bus,
          latitude: bus.latitude + (Math.random() - 0.5) * 0.001,
          longitude: bus.longitude + (Math.random() - 0.5) * 0.001,
          speed: Math.floor(Math.random() * 60),
          status: ['moving', 'stopped', 'idle'][Math.floor(Math.random() * 3)] as 'moving' | 'stopped' | 'idle',
          lastUpdated: new Date().toISOString()
        }))
      );
      setIsRefreshing(false);
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'moving': return 'text-green-400';
      case 'stopped': return 'text-red-400';
      case 'idle': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'moving': return 'bg-green-600';
      case 'stopped': return 'bg-red-600';
      case 'idle': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const rowVariants = {
    hidden: { 
      opacity: 0, 
      x: -20,
      scale: 0.98
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      x: 20,
      scale: 0.98,
      transition: {
        duration: 0.2
      }
    }
  };

  const statsVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Title */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Live Bus Tracking</h1>
        <p className="text-gray-600">Monitor real-time bus locations and status</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
      >
        <motion.div 
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Total Buses
              </p>
              <motion.p 
                className="text-3xl font-bold text-gray-800 mt-2"
                variants={statsVariants}
              >
                {buses.length}
              </motion.p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Bus size={24} className="text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Moving
              </p>
              <motion.p 
                className="text-3xl font-bold text-green-600 mt-2"
                variants={statsVariants}
              >
                {buses.filter(b => b.status === 'moving').length}
              </motion.p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <Navigation size={24} className="text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Stopped
              </p>
              <motion.p 
                className="text-3xl font-bold text-red-500 mt-2"
                variants={statsVariants}
              >
                {buses.filter(b => b.status === 'stopped').length}
              </motion.p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-red-400 to-red-500">
              <X size={24} className="text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Idle
              </p>
              <motion.p 
                className="text-3xl font-bold text-yellow-600 mt-2"
                variants={statsVariants}
              >
                {buses.filter(b => b.status === 'idle').length}
              </motion.p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600">
              <Clock size={24} className="text-white" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Controls */}
      <motion.div 
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        variants={itemVariants}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Live Bus Data</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search buses, drivers, or stops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 pl-10 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
              />
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            >
              <option value="all">All Status</option>
              <option value="moving">Moving</option>
              <option value="stopped">Stopped</option>
              <option value="idle">Idle</option>
            </select>

            {/* Refresh Button */}
            <motion.button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center px-6 py-2 rounded-lg font-semibold text-white transition-all duration-300 transform ${
                isRefreshing
                  ? 'bg-blue-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95'
              } focus:outline-none focus:ring-4 focus:ring-blue-200 shadow-lg hover:shadow-blue-300/40`}
              whileHover={!isRefreshing ? { scale: 1.05 } : {}}
              whileTap={!isRefreshing ? { scale: 0.95 } : {}}
            >
              <RefreshCw size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Bus Table */}
      <motion.div 
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        variants={itemVariants}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Bus Number</th>
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Driver</th>
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Current Stop</th>
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Latitude</th>
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Longitude</th>
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Status</th>
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Speed</th>
                <th className="text-left py-4 px-4 text-gray-700 font-semibold">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredBuses.map((bus, index) => (
                  <motion.tr 
                    key={bus.busId} 
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={index}
                    layout
                    whileHover={{ 
                      backgroundColor: 'rgba(59, 130, 246, 0.05)',
                      scale: 1.01,
                      transition: { duration: 0.2 }
                    }}
                  >
                    {/* Bus Number */}
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 mr-3">
                          <Bus size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-gray-800 font-bold">{bus.busNumber}</p>
                          <p className="text-gray-600 text-xs">Route: {bus.routeId}</p>
                        </div>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="p-1 rounded-full bg-blue-500 mr-2">
                          <Navigation size={12} className="text-white" />
                        </div>
                        <span className="text-gray-800 font-semibold">{bus.driverName}</span>
                      </div>
                    </td>

                    {/* Current Stop */}
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <MapPin size={14} className="mr-2 text-gray-500" />
                        <span className="text-gray-800">{bus.currentStop}</span>
                      </div>
                    </td>

                    {/* Latitude */}
                    <td className="py-4 px-4">
                      <span className="text-gray-600 font-mono text-sm">
                        {formatCoordinate(bus.latitude)}
                      </span>
                    </td>

                    {/* Longitude */}
                    <td className="py-4 px-4">
                      <span className="text-gray-600 font-mono text-sm">
                        {formatCoordinate(bus.longitude)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <motion.span 
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          bus.status === 'moving' ? 'bg-green-100 text-green-700' :
                          bus.status === 'stopped' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        {bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                      </motion.span>
                    </td>

                    {/* Speed */}
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <Gauge size={14} className="mr-2 text-gray-500" />
                        <span className="text-gray-800 font-semibold">{bus.speed} km/h</span>
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <Clock size={14} className="mr-2 text-gray-500" />
                        <span className="text-gray-600 text-sm">
                          {formatLastUpdated(bus.lastUpdated)}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {/* Empty State */}
          {filteredBuses.length === 0 && (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="p-4 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Activity size={32} className="text-gray-500" />
              </div>
              <p className="text-gray-600 text-lg">No buses found</p>
              <p className="text-gray-500 text-sm mt-1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'No live bus data available at the moment'
                }
              </p>
            </motion.div>
          )}
        </div>

        {/* Results Summary */}
        {filteredBuses.length > 0 && (
          <motion.div 
            className="mt-6 pt-4 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="text-gray-600 text-sm">
              Showing {filteredBuses.length} of {buses.length} buses
              {statusFilter !== 'all' && ` (filtered by: ${statusFilter})`}
              {searchTerm && ` (search: "${searchTerm}")`}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default LiveTracking;