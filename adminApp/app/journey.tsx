import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AppState,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { getDriverBus, updateBusLocation, Bus } from '../services/api';
import { startBackgroundLocationUpdates, stopBackgroundLocationUpdates, isLocationTaskRunning } from '../services/locationTask';
import { flushQueue, getQueueLength, addToQueue } from '../services/queue';
import { requestLocationPermissions, checkLocationPermissions } from '../utils/permissions';

const USERNAME_KEY = 'driver_username';
const BUS_ID_KEY = 'current_bus_id';

interface LocationData {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  timestamp: number;
}

export default function JourneyScreen() {
  const [bus, setBus] = useState<Bus | null>(null);
  const [busId, setBusId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [isStoppingJourney, setIsStoppingJourney] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadJourneyData();
      
      // Handle app state changes for flushing queue
      const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === 'active') {
          flushPendingUpdates();
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      
      return () => {
        subscription?.remove();
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  const loadJourneyData = async () => {
    try {
      const storedUsername = await SecureStore.getItemAsync(USERNAME_KEY);
      const storedBusId = await AsyncStorage.getItem(BUS_ID_KEY);
      
      if (!storedUsername) {
        router.replace('/');
        return;
      }

      if (!storedBusId) {
        Alert.alert('Error', 'No bus ID found. Please go back to dashboard.');
        return;
      }

      const response = await getDriverBus(storedUsername);
      setBus(response.bus);
      setBusId(storedBusId);

      // Check if journey is already active
      const isRunning = await isLocationTaskRunning();
      setIsJourneyActive(isRunning);

      if (isRunning) {
        // If journey is already active, start foreground tracking
        startForegroundLocationTracking();
      }

      // Update queue length
      updateQueueLength();
    } catch (error) {
      console.error('Error loading journey data:', error);
      Alert.alert('Error', 'Failed to load journey data. Please ensure your Node.js backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const startForegroundLocationTracking = async () => {
    try {
      // Start foreground location subscription for UI updates
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update UI every 5 seconds
          distanceInterval: 5, // 5 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            speed: Math.max(0, location.coords.speed || 0),
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };
          setCurrentLocation(locationData);
        }
      );

      // Start interval to update queue length
      updateInterval.current = setInterval(() => {
        updateQueueLength();
      }, 10000); // Every 10 seconds

    } catch (error) {
      console.error('Error starting foreground location tracking:', error);
    }
  };

  const handleStartJourney = async () => {
    if (!bus || !busId) {
      Alert.alert('Error', 'No bus information available');
      return;
    }

    try {
      setIsLoading(true);

      // Check and request location permissions first
      console.log('Checking location permissions...');
      const permissions = await checkLocationPermissions();
      console.log('Current permissions:', permissions);

      if (!permissions.foreground) {
        console.log('Requesting foreground location permission...');
        const foregroundGranted = await requestLocationPermissions();
        if (!foregroundGranted) {
          Alert.alert('Permission Required', 'Location permission is required to track the bus location.');
          return;
        }
      }

      if (!permissions.background) {
        console.log('Requesting background location permission...');
        const backgroundGranted = await requestLocationPermissions();
        if (!backgroundGranted) {
          Alert.alert(
            'Background Permission Required', 
            'Background location permission is required for continuous tracking. Please enable "Allow all the time" in location settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Test location access
      console.log('Getting current location...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      
      console.log('Current location obtained:', {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy
      });

      // Start background location updates
      console.log('Starting background location updates...');
      const success = await startBackgroundLocationUpdates(busId);
      
      if (success) {
        setIsJourneyActive(true);
        await startForegroundLocationTracking();
        Alert.alert('Journey Started', 'Location tracking is now active. Data will be sent to your Node.js backend every 30 seconds.');
      } else {
        Alert.alert('Error', 'Failed to start location tracking. Please check permissions and try again.');
      }
    } catch (error) {
      console.error('Error starting journey:', error);
      Alert.alert('Error', `Failed to start journey: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopJourney = async () => {
    Alert.alert(
      'Stop Journey',
      'Are you sure you want to stop the journey? This will stop location tracking.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Journey',
          style: 'destructive',
          onPress: async () => {
            setIsStoppingJourney(true);
            try {
              // Stop background location updates
              await stopBackgroundLocationUpdates();

              // Stop foreground location subscription
              if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
              }

              // Clear update interval
              if (updateInterval.current) {
                clearInterval(updateInterval.current);
                updateInterval.current = null;
              }

              // Flush any remaining queue items
              await flushPendingUpdates();

              setIsJourneyActive(false);
              setCurrentLocation(null);
              setLastUpdateTime(null);

              Alert.alert('Journey Stopped', 'Location tracking has been stopped');
            } catch (error) {
              console.error('Error stopping journey:', error);
              Alert.alert('Error', 'Failed to stop journey');
            } finally {
              setIsStoppingJourney(false);
            }
          },
        },
      ]
    );
  };

  const flushPendingUpdates = async () => {
    try {
      await flushQueue();
      updateQueueLength();
    } catch (error) {
      console.error('Error flushing queue:', error);
    }
  };

  const updateQueueLength = async () => {
    try {
      const length = await getQueueLength();
      setQueueLength(length);
    } catch (error) {
      console.error('Error getting queue length:', error);
    }
  };

  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connection...');
      const testLocation = {
        busId: busId || 'bud-aYNRWfwvM', // Use the known working bus ID
        lat: 18.9338,
        lng: 72.8302,
        speed: 20
      };
      
      console.log('Sending test location update:', testLocation);
      const response = await updateBusLocation(testLocation);
      console.log('Backend response:', response);
      
      if (response.success) {
        Alert.alert('Connection Test', 'Successfully connected to backend!');
        setLastUpdateTime(new Date());
        setIsBackendConnected(true);
      } else {
        Alert.alert('Connection Test', 'Backend responded but with error');
        setIsBackendConnected(false);
      }
    } catch (error) {
      console.error('Backend connection test failed:', error);
      Alert.alert('Connection Failed', `Cannot connect to backend: ${error.message || 'Unknown error'}`);
    }
  };

  // Manual location update function removed - now using automatic HTTP updates

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={styles.statusIndicator}>
            <Ionicons 
              name="radio-button-on" 
              size={20} 
              color={isJourneyActive ? "#34C759" : "#FF9500"} 
            />
            <Text style={styles.statusText}>
              {isJourneyActive ? 'Journey Active' : 'Journey Inactive'}
            </Text>
          </View>
        </View>

        {/* Bus Information */}
        {bus && busId && (
          <View style={styles.busInfoCard}>
            <Text style={styles.busNumber}>{bus.busNumber}</Text>
            <Text style={styles.busDetails}>Capacity: {bus.capacity} passengers</Text>
            <Text style={styles.busIdText}>Bus ID: {busId}</Text>
          </View>
        )}

        {/* Location Information */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={24} color="#007AFF" />
            <Text style={styles.locationTitle}>Current Location</Text>
          </View>

          {currentLocation ? (
            <View style={styles.locationData}>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Latitude:</Text>
                <Text style={styles.locationValue}>
                  {currentLocation.latitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Longitude:</Text>
                <Text style={styles.locationValue}>
                  {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Speed:</Text>
                <Text style={styles.locationValue}>
                  {(currentLocation.speed * 3.6).toFixed(1)} km/h
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Accuracy:</Text>
                <Text style={[
                  styles.locationValue,
                  { color: currentLocation.accuracy > 50 ? '#FF9500' : '#34C759' }
                ]}>
                  ±{currentLocation.accuracy.toFixed(0)}m
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noLocationText}>
              {isJourneyActive ? 'Waiting for GPS location...' : 'Location tracking inactive'}
            </Text>
          )}
        </View>

        {/* Connection Status */}
        <View style={styles.updateCard}>
          <View style={styles.updateHeader}>
            <Ionicons name="sync" size={20} color="#007AFF" />
            <Text style={styles.updateTitle}>Backend Integration</Text>
          </View>
          
          <View style={styles.connectionStatus}>
            <View style={styles.connectionRow}>
              <Ionicons 
                name={isBackendConnected ? "server" : "server-outline"} 
                size={16} 
                color={isBackendConnected ? "#34C759" : "#FF9500"} 
              />
              <Text style={[
                styles.connectionText,
                { color: isBackendConnected ? "#34C759" : "#FF9500" }
              ]}>
                {isBackendConnected ? 'Backend Connected' : 'Backend Status Unknown'}
              </Text>
            </View>
            
            <View style={styles.connectionRow}>
              <Ionicons name="location" size={16} color="#007AFF" />
              <Text style={styles.connectionText}>
                Auto-sending location every 30s via HTTP
              </Text>
            </View>
            
            {lastUpdateTime && (
              <View style={styles.connectionRow}>
                <Ionicons name="time" size={16} color="#007AFF" />
                <Text style={styles.connectionText}>
                  Last update: {lastUpdateTime.toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
          
          {queueLength > 0 && (
            <View style={styles.queueInfo}>
              <Ionicons name="cloud-offline" size={16} color="#FF9500" />
              <Text style={styles.queueText}>
                {queueLength} update{queueLength > 1 ? 's' : ''} pending sync
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={testBackendConnection}
            disabled={!busId}
          >
            <Text style={styles.manualUpdateText}>Test Backend Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!isJourneyActive ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartJourney}
              disabled={!bus || !busId}
            >
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Journey</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.stopButton, isStoppingJourney && styles.buttonDisabled]}
              onPress={handleStopJourney}
              disabled={isStoppingJourney}
            >
              {isStoppingJourney ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="stop" size={24} color="#FFFFFF" />
                  <Text style={styles.stopButtonText}>Stop Journey</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.flushButton}
            onPress={flushPendingUpdates}
          >
            <Ionicons name="cloud-upload" size={20} color="#007AFF" />
            <Text style={styles.flushButtonText}>Sync Pending</Text>
          </TouchableOpacity>
        </View>

        {/* Backend Info */}
        <View style={styles.backendInfo}>
          <Ionicons name="server" size={16} color="#888888" />
          <Text style={styles.backendInfoText}>
            Real-time location tracking via HTTP API every 30 seconds
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  statusHeader: {
    marginBottom: 24,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  busInfoCard: {
    backgroundColor: '#1A1A1B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  busNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  busDetails: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#1A1A1B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  locationData: {
    
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  locationValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noLocationText: {
    color: '#888888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  updateCard: {
    backgroundColor: '#1A1A1B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  updateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  lastUpdateText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 8,
  },
  queueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueText: {
    color: '#FF9500',
    fontSize: 14,
    marginLeft: 6,
  },
  manualUpdateButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualUpdateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#FF9500',
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectionStatus: {
    marginBottom: 12,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  connectionText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 6,
  },
  actionButtons: {
    
  },
  startButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  flushButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  flushButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  busIdText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  backendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  backendInfoText: {
    color: '#888888',
    fontSize: 12,
    marginLeft: 6,
  },
});
