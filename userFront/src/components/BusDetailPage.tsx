import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap, Popup } from 'react-leaflet';
import { decode } from '@mapbox/polyline';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { ArrowLeft, Bus, Clock, Route, MapPin, Wifi, WifiOff, Navigation, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { LatLngBounds } from 'leaflet';
import L from 'leaflet';

// Configuration
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Types
interface Stop {
  stopId?: string;
  name: string;
  etaMinutes?: number;
  lat?: number;
  lng?: number;
}

interface BusLocation {
  lat: number;
  lng: number;
}

interface BusUpdate {
  busId: string;
  routeId: string;
  snappedLocation: BusLocation;
  avgSpeed: number;
  lastUpdated: string;
  etaStops: Stop[];
  status: 'online' | 'offline';
}

interface RouteData {
  _id: string;
  routeName: string;
  geometry: string;
  distance: number;
  duration: number;
  stops?: Stop[];
}

interface BusInfo {
  _id: string;
  busId: string;
  busNumber: string;
  capacity: number;
  driverId: string;
  routeId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  route: {
    _id: string;
    routeName: string;
    stops: Stop[];
  };
}

// Custom bus icon
const createBusIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 40px; 
        height: 40px; 
        background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
        border: 3px solid white; 
        border-radius: 12px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        position: relative;
      ">
        <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
          <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10M6.5 17.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M5 11V6h14v5H5z"/>
        </svg>
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border: 2px solid white;
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    `,
    className: 'bus-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// Stop marker icon
const createStopIcon = (isArrived: boolean = false, hasETA: boolean = true) => {
  const color = isArrived ? '#10b981' : hasETA ? '#ef4444' : '#6b7280';
  const pulseColor = isArrived ? '#10b981' : '#ef4444';
  return L.divIcon({
    html: `
      <div style="
        width: 24px; 
        height: 32px; 
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 20px;
          height: 20px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(45deg);
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
        ${!isArrived && hasETA ? `
          <div style="
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            border: 2px solid ${pulseColor};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            opacity: 0.75;
          "></div>
        ` : ''}
      </div>
      <style>
        @keyframes ping {
          75%, 100% {
            transform: rotate(-45deg) scale(1.5);
            opacity: 0;
          }
        }
      </style>
    `,
    className: 'stop-marker',
    iconSize: [24, 32],
    iconAnchor: [12, 28]
  });
};

// Map bounds updater component
const MapBoundsUpdater: React.FC<{ 
  routeCoordinates: [number, number][];
  busLocation: BusLocation | null;
  followBus: boolean;
}> = ({ routeCoordinates, busLocation, followBus }) => {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      if (busLocation) {
        bounds.extend([busLocation.lat, busLocation.lng]);
      }
      map.fitBounds(bounds, { padding: [20, 20] });
      hasInitialized.current = true;
    } else if (followBus && busLocation) {
      map.setView([busLocation.lat, busLocation.lng], map.getZoom());
    }
  }, [map, routeCoordinates, busLocation, followBus]);

  return null;
};

const BusDetailPage: React.FC = () => {
  const { busId } = useParams<{ busId: string }>();
  const navigate = useNavigate();
  
  // State for route data
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

  // State for live tracking
  const [busData, setBusData] = useState<BusUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [followBus, setFollowBus] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [showStops, setShowStops] = useState(false);
  const [busStatus, setBusStatus] = useState<'active' | 'inactive' | 'unknown'>('unknown');
  const [routeStops, setRouteStops] = useState<Stop[]>([]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>('');

  // Throttled update function
  const throttledUpdate = useCallback((newData: BusUpdate) => {
    const dataString = JSON.stringify({
      snappedLocation: newData.snappedLocation,
      etaStops: newData.etaStops,
      status: newData.status,
      avgSpeed: newData.avgSpeed
    });
    
    if (dataString !== lastUpdateRef.current) {
      setBusData(newData);
      setLastUpdateTime(new Date());
      lastUpdateRef.current = dataString;
      console.log('Bus data updated:', newData);
    }
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current || !busId) return;

    try {
      console.log('Initializing socket connection to:', SOCKET_URL);
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });

      socket.on('connect', () => {
        console.log('Socket connected successfully');
        setIsConnected(true);
        // Join room for this specific bus
        socket.emit('joinBus', busId);
        console.log('Joined bus room:', busId);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        // Start polling as fallback
        startPolling();
      });

      socket.on('bus:update', (data: BusUpdate) => {
        console.log('Received bus update via socket:', data);
        if (data.busId === busId) {
          throttledUpdate(data);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        // Start polling as fallback
        startPolling();
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setIsConnected(false);
      startPolling();
    }
  }, [busId, throttledUpdate]);

  // Polling fallback - calls the live API every 30 seconds
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || !busId) return;

    console.log('Starting polling for bus:', busId);

    const poll = async () => {
      try {
        console.log(`Fetching live data from: ${API_BASE}/api/bus/${busId}/live`);
        const response = await axios.get(`${API_BASE}/api/bus/${busId}/live`, {
          timeout: 10000
        });
        
        console.log('Received live data via polling:', response.data);
        throttledUpdate(response.data);
      } catch (error) {
        console.error('Polling error:', error);
        // Don't stop polling on error, just log it
      }
    };

    // Initial poll
    poll();
    // Set up interval for every 30 seconds
    pollingIntervalRef.current = setInterval(poll, 30000);
  }, [busId, throttledUpdate]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('Stopping polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Fetch bus info and route data
  const fetchBusAndRouteData = async () => {
    try {
      console.log('Fetching bus data for busId:', busId);
      // Get all buses to find our specific bus
      const busesResponse = await axios.get(`${API_BASE}/api/buses`, {
        timeout: 10000
      });
      
      const currentBus = busesResponse.data.find((bus: any) => bus.busId === busId);
      if (!currentBus) {
        throw new Error('Bus not found');
      }
      
      console.log('Found bus:', currentBus);
      setBusInfo(currentBus);
      setBusStatus(currentBus.status);
      
      // Set route stops from bus info
      if (currentBus.route && currentBus.route.stops) {
        setRouteStops(currentBus.route.stops);
      }
      
      // Get route with polyline data
      await fetchPolylineData(currentBus.route.routeName);
      
    } catch (error) {
      console.error('Error fetching bus/route data:', error);
      throw error;
    }
  };

  // Fetch polyline data
  const fetchPolylineData = async (routeName: string) => {
    try {
      console.log('Fetching polyline for route:', routeName);
      const polylineResponse = await axios.get(`${API_BASE}/api/admin/routes-with-polyline?routeName=${routeName}`, {
        timeout: 10000
      });
      
      console.log('Polyline response:', polylineResponse.data);
      
      if (polylineResponse.data && polylineResponse.data.geometry) {
        const routeWithPolyline = polylineResponse.data;
        setRouteData(routeWithPolyline);
        
        // Cache the data
        localStorage.setItem(`route_${busId}`, JSON.stringify(routeWithPolyline));
        localStorage.setItem(`route_${busId}_timestamp`, Date.now().toString());
        
        processPolyline(routeWithPolyline.geometry);
      } else {
        throw new Error('No polyline data received');
      }
    } catch (error) {
      console.error('Failed to fetch polyline data:', error);
      throw error;
    }
  };

  // Check bus live status and start tracking
  const startLiveTracking = async () => {
    try {
      console.log('Starting live tracking for bus:', busId);
      
      // First try to get initial live data
      const response = await axios.get(`${API_BASE}/api/bus/${busId}/live`, {
        timeout: 5000
      });
      
      if (response.data) {
        console.log('Initial live data received:', response.data);
        throttledUpdate(response.data);
        
        // Try to initialize socket connection
        initializeSocket();
        
        // Also start polling as backup
        setTimeout(() => {
          if (!isConnected) {
            console.log('Socket not connected, using polling only');
            startPolling();
          }
        }, 3000);
      }
    } catch (error) {
      console.warn('Initial live data not available, starting polling:', error);
      // Start polling even if initial request fails
      startPolling();
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (!busId) return;
      
      setLoading(true);
      
      try {
        // Check localStorage first for route data
        const cachedRoute = localStorage.getItem(`route_${busId}`);
        const cachedTimestamp = localStorage.getItem(`route_${busId}_timestamp`);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (cachedRoute && cachedTimestamp && (now - parseInt(cachedTimestamp) < oneHour)) {
          const data = JSON.parse(cachedRoute);
          setRouteData(data);
          if (data.geometry) {
            processPolyline(data.geometry);
          }
        }

        // Always fetch fresh bus data
        await fetchBusAndRouteData();
        
        // Start live tracking regardless of bus status
        await startLiveTracking();
        
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // Cleanup function
    return () => {
      console.log('Cleaning up connections');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      stopPolling();
    };
  }, [busId]);

  // Check for offline status
  useEffect(() => {
    if (!busData || !lastUpdateTime) return;

    const checkOfflineStatus = () => {
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdateTime.getTime();
      
      // Mark as offline if no update for 2 minutes
      if (timeDiff > 120000 && busData.status === 'online') {
        console.log('Bus marked as offline due to no updates');
        setBusData(prev => prev ? { ...prev, status: 'offline' } : null);
      }
    };

    const interval = setInterval(checkOfflineStatus, 15000);
    return () => clearInterval(interval);
  }, [busData, lastUpdateTime]);

  const processPolyline = (geometry: string) => {
    try {
      const decodedCoordinates = decode(geometry);
      setCoordinates(decodedCoordinates);
      
      if (decodedCoordinates.length > 0) {
        const lats = decodedCoordinates.map(coord => coord[0]);
        const lngs = decodedCoordinates.map(coord => coord[1]);
        
        const bounds = L.latLngBounds([
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        ]);
        
        setMapBounds(bounds);
      }
    } catch (error) {
      console.error('Error processing polyline:', error);
    }
  };

  const formatDistance = (distance: number) => {
    return (distance / 1000).toFixed(1) + ' km';
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.round(duration / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600';
      case 'inactive':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBusStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'text-green-600';
      case 'offline':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-md mx-auto mb-8">
          <div className="relative h-16 bg-gray-100 rounded-full overflow-hidden">
            <div className="absolute top-1/2 left-4 transform -translate-y-1/2 animate-[moveRight_3s_ease-in-out_infinite]">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Bus className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading Route & Live Data...
          </h2>
          <p className="text-gray-600">Fetching route details and connecting to live tracking</p>
        </div>

        <div className="mt-8 flex space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  if (!routeData || !busInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Route not found</h3>
          <p className="text-gray-600 mb-4">The requested route could not be loaded.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {busInfo.busNumber} - {routeData.routeName}
                </h1>
                <p className="text-sm text-gray-600">Live Bus Tracking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-xl shadow-sm ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Status Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-1 ${getStatusColor(busStatus)}`}>
                <div className={`w-2 h-2 rounded-full ${
                  busStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className="font-medium capitalize">{busStatus}</span>
              </div>
              {busData && (
                <>
                  <div className={`flex items-center space-x-1 ${getBusStatusColor(busData.status)}`}>
                    <div className={`w-2 h-2 rounded-full ${
                      busData.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium capitalize">{busData.status}</span>
                  </div>
                  <div className="text-gray-600">
                    Speed: <span className="font-semibold">{busData.avgSpeed} km/h</span>
                  </div>
                </>
              )}
            </div>
            <div className="text-gray-500">
              {busData
                ? formatTimeAgo(busData.lastUpdated)
                : 'Waiting for live data...'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Route Stats */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Bus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Capacity</p>
                <p className="font-semibold text-gray-900">{busInfo.capacity} seats</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Route className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stops</p>
                <p className="font-semibold text-gray-900">{routeStops.length}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Distance</p>
                <p className="font-semibold text-gray-900">{routeData.distance ? formatDistance(routeData.distance) : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-semibold text-gray-900">{routeData.duration ? formatDuration(routeData.duration) : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stops List - Show if we have live ETA data */}
      {busData && busData.etaStops && busData.etaStops.length > 0 && (
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-20 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setShowStops(!showStops)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">
                    Live ETA - Upcoming Stops ({busData.etaStops.length})
                  </h2>
                  <p className="text-sm text-gray-600">
                    {showStops ? 'Click to hide stops' : 'Click to view all stops and ETAs'}
                  </p>
                </div>
              </div>
              {showStops ? (
                <ChevronUp className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-600" />
              )}
            </button>
            
            {showStops && (
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto stops-container">
                {busData.etaStops.map((stop, index) => (
                  <div
                    key={stop.stopId || index}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                        stop.etaMinutes === 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{stop.name}</p>
                        <p className="text-sm text-gray-500">Stop {index + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {stop.etaMinutes === 0 ? (
                        <span className="px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs rounded-full font-medium shadow-sm">
                          Arrived
                        </span>
                      ) : (
                        <div>
                          <p className="text-lg font-bold text-gray-900">{stop.etaMinutes}m</p>
                          <p className="text-xs text-gray-500">ETA</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Show route stops when no live ETA data */}
      {(!busData || !busData.etaStops || busData.etaStops.length === 0) && routeStops.length > 0 && (
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-20 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setShowStops(!showStops)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-red-50 hover:from-gray-100 hover:to-red-100 rounded-xl transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">
                    Route Stops ({routeStops.length})
                  </h2>
                  <p className="text-sm text-gray-600">
                    No live ETA data available - showing route stops
                  </p>
                </div>
              </div>
              {showStops ? (
                <ChevronUp className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-600" />
              )}
            </button>
            
            {showStops && (
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto stops-container">
                {routeStops.map((stop, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
                      <div>
                        <p className="font-medium text-gray-900">{stop.name}</p>
                        <p className="text-sm text-gray-500">Stop {index + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        No ETA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative shadow-inner" style={{ height: showStops ? 'calc(100vh - 600px)' : 'calc(100vh - 300px)', minHeight: '400px' }}>
        {coordinates.length > 0 && mapBounds && (
          <>
            {/* Map Controls */}
            {busData && busData.snappedLocation && (
              <div className="absolute top-6 right-6 z-30 flex flex-col space-y-3">
                <button
                  onClick={() => setFollowBus(!followBus)}
                  className={`p-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 ${
                    followBus 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-gray-200'
                  }`}
                >
                  <Navigation className="w-5 h-5" />
                </button>
              </div>
            )}

            <MapContainer
              bounds={mapBounds}
              className="w-full h-full"
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Route Polyline */}
              <Polyline
                positions={coordinates}
                color="#2563eb"
                weight={4}
                opacity={0.8}
              />
              
              {/* Bus Marker - Only show if we have live location */}
              {busData?.snappedLocation && (
                <Marker
                  position={[busData.snappedLocation.lat, busData.snappedLocation.lng]}
                  icon={createBusIcon()}
                >
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-bold text-gray-900">{busInfo.busNumber}</h3>
                      <p className="text-sm text-gray-600">Speed: {busData.avgSpeed} km/h</p>
                      <p className="text-sm text-gray-600">Status: {busData.status}</p>
                      <p className="text-xs text-gray-500">Last update: {formatTimeAgo(busData.lastUpdated)}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Stop Markers - live stops if available, otherwise route stops */}
              {busData?.etaStops && busData.etaStops.length > 0 
                ? busData.etaStops.map((stop, index) => (
                    stop.lat && stop.lng && (
                      <Marker
                        key={stop.stopId || index}
                        position={[stop.lat, stop.lng]}
                        icon={createStopIcon(stop.etaMinutes === 0, true)}
                      >
                        <Popup>
                          <div className="text-center">
                            <h3 className="font-bold text-gray-900">{stop.name}</h3>
                            <p className="text-sm text-gray-600">
                              {stop.etaMinutes === 0 ? 'Bus has arrived' : `ETA: ${stop.etaMinutes} minutes`}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))
                : routeStops.map((stop: any, index: number) => (
                    stop.lat && stop.lng && (
                      <Marker
                        key={index}
                        position={[stop.lat, stop.lng]}
                        icon={createStopIcon(false, false)}
                      >
                        <Popup>
                          <div className="text-center">
                            <h3 className="font-bold text-gray-900">{stop.name}</h3>
                            <p className="text-sm text-gray-600">Stop {index + 1}</p>
                            <p className="text-xs text-gray-500">No live data available</p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))
              }
              
              <MapBoundsUpdater
                routeCoordinates={coordinates}
                busLocation={busData?.snappedLocation || null}
                followBus={followBus}
              />
            </MapContainer>
          </>
        )}
        
        {coordinates.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center">
              <div className="p-4 bg-white rounded-2xl shadow-lg">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-lg font-medium text-gray-600">Loading route map...</p>
                <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the route data</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4">
          <div className="text-center text-sm text-gray-500">
            {isConnected ? (
              <p>🟢 Live updates via WebSocket{busData && ` • Last update: ${formatTimeAgo(busData.lastUpdated)}`}</p>
            ) : (
              <p>🟡 Updates via polling (every 30s){busData && ` • Last update: ${formatTimeAgo(busData.lastUpdated)}`}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusDetailPage;