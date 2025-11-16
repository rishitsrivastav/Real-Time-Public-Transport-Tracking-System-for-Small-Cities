import axios from 'axios';
import Constants from 'expo-constants';

// Get the appropriate API URL based on platform
const getApiBaseUrl = () => {
  // First try environment variables
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
  }
  
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  
  // For development, use different URLs based on platform
  const { Platform } = require('react-native');
  
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  } else {
    // For iOS/Android, use your computer's IP address instead of localhost
    // You'll need to replace this with your actual IP address
    // You can find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
    return 'http://100.64.4.165:4000'; // Your actual IP address
  }
};

const API_BASE_URL = getApiBaseUrl();

console.log('API Configuration:');
console.log('- Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL:', Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL);
console.log('- process.env.EXPO_PUBLIC_BACKEND_URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
console.log('- Final API_BASE_URL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log('Request Data:', JSON.stringify(config.data, null, 2));
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// API Types
export interface RouteStop {
  stopName: string;
  lat: number;
  lng: number;
}

export interface Bus {
  busNumber: string;
  capacity: number;
  status: string;
  route: RouteStop[];
}

export interface BusResponse {
  success: boolean;
  bus: Bus;
}

export interface LocationUpdate {
  busId: string;
  lat: number;
  lng: number;
  speed: number;
}

export interface LocationResponse {
  success: boolean;
  busId: string;
  routeId?: string;
  snappedLocation: { lat: number; lng: number };
  avgSpeed: number;
  lastUpdated: string;
  etaStops: any[];
  status: string;
}

// API Functions for Node.js/Express backend
export const getDriverBus = async (username: string): Promise<BusResponse> => {
  const response = await api.get(`/api/driver/${username}/bus`);
  return response.data;
};

export const updateBusLocation = async (locationData: LocationUpdate): Promise<LocationResponse> => {
  try {
    console.log('API: Sending location update to:', `${API_BASE_URL}/api/bus/update-location`);
    console.log('API: Request data:', JSON.stringify(locationData, null, 2));
    
    const response = await api.post('/api/bus/update-location', locationData);
    
    console.log('API: Response received:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('API: Error sending location update:', error);
    if (error.response) {
      console.error('API: Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('API: Network error:', error.request);
    } else {
      console.error('API: Other error:', error.message);
    }
    throw error;
  }
};

export const getBusLiveData = async (busId: string) => {
  const response = await api.get(`/api/bus/${busId}/live`);
  return response.data;
};