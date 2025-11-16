import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getDriverBus, Bus } from '../services/api';
import { requestLocationPermissions } from '../utils/permissions';
import { isLocationTaskRunning } from '../services/locationTask';

const USERNAME_KEY = 'driver_username';
const BUS_ID_KEY = 'current_bus_id';

export default function DashboardScreen() {
  const [username, setUsername] = useState('');
  const [bus, setBus] = useState<Bus | null>(null);
  const [busId, setBusId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingJourney, setIsStartingJourney] = useState(false);
  const [isJourneyActive, setIsJourneyActive] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
      checkJourneyStatus();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      const storedUsername = await SecureStore.getItemAsync(USERNAME_KEY);
      if (!storedUsername) {
        router.replace('/');
        return;
      }

      setUsername(storedUsername);
      await fetchBusData(storedUsername);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchBusData = async (driverUsername: string) => {
    try {
      console.log('Fetching bus data for driver:', driverUsername);
      const response = await getDriverBus(driverUsername);
      
      if (response.success && response.bus) {
        setBus(response.bus);
        
        // Use a consistent bus ID that matches the backend expectations
        // Based on your backend example, we'll use a predefined bus ID
        const consistentBusId = 'bud-aYNRWfwvM'; // This should match your backend's registered bus ID
        setBusId(consistentBusId);
        
        // Store busId for location tracking
        await AsyncStorage.setItem(BUS_ID_KEY, consistentBusId);
        
        console.log('Bus data loaded successfully:', response.bus);
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('Error fetching bus data:', error);
      
      let errorMessage = 'Failed to fetch bus information.\n\n';
      
      if (error.message === 'Network Error') {
        errorMessage += 'Network Error: Cannot connect to backend server.\n\n';
        errorMessage += 'Please check:\n';
        errorMessage += '• Is your Node.js backend running?\n';
        errorMessage += '• Are you connected to the same network?\n';
        errorMessage += '• Try restarting the backend server\n\n';
        errorMessage += 'Backend URL: http://100.64.4.165:4000';
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}`;
      }
      
      Alert.alert('Connection Error', errorMessage);
    }
  };

  const checkJourneyStatus = async () => {
    try {
      const isRunning = await isLocationTaskRunning();
      setIsJourneyActive(isRunning);
    } catch (error) {
      console.error('Error checking journey status:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
  };

  const handleStartJourney = async () => {
    if (!bus || !busId) {
      Alert.alert('Error', 'No bus information available');
      return;
    }

    setIsStartingJourney(true);
    try {
      // Request location permissions
      const hasPermissions = await requestLocationPermissions();
      
      if (!hasPermissions) {
        setIsStartingJourney(false);
        return;
      }

      // Navigate to journey screen
      router.push('/journey');
    } catch (error) {
      console.error('Error starting journey:', error);
      Alert.alert('Error', 'Failed to start journey');
    } finally {
      setIsStartingJourney(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(USERNAME_KEY);
              await AsyncStorage.removeItem(BUS_ID_KEY);
              router.replace('/');
            } catch (error) {
              console.error('Error logging out:', error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.usernameText}>{username}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="radio-button-on" size={16} color={isJourneyActive ? "#34C759" : "#FF9500"} />
            <Text style={styles.statusText}>
              {isJourneyActive ? 'Journey Active' : 'Ready to Start'}
            </Text>
          </View>
          {isJourneyActive && (
            <Text style={styles.statusSubtext}>Location tracking is active</Text>
          )}
          {busId && (
            <Text style={styles.busIdText}>Bus ID: {busId}</Text>
          )}
        </View>

        {/* Bus Information */}
        {bus && (
          <View style={styles.busCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="bus" size={24} color="#007AFF" />
              <Text style={styles.cardTitle}>Assigned Bus</Text>
            </View>
            
            <View style={styles.busInfo}>
              <View style={styles.busInfoRow}>
                <Text style={styles.busInfoLabel}>Bus Number</Text>
                <Text style={styles.busInfoValue}>{bus.busNumber}</Text>
              </View>
              <View style={styles.busInfoRow}>
                <Text style={styles.busInfoLabel}>Capacity</Text>
                <Text style={styles.busInfoValue}>{bus.capacity} passengers</Text>
              </View>
              <View style={styles.busInfoRow}>
                <Text style={styles.busInfoLabel}>Status</Text>
                <Text style={[
                  styles.busInfoValue,
                  { color: bus.status === 'active' ? '#34C759' : '#FF9500' }
                ]}>
                  {bus.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Route Information */}
            <View style={styles.routeSection}>
              <Text style={styles.routeTitle}>Route ({bus.route.length} stops)</Text>
              {bus.route.map((stop, index) => (
                <View key={index} style={styles.routeStop}>
                  <View style={styles.stopNumber}>
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stopName}>{stop.stopName}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            (!bus || bus.status !== 'active' || isStartingJourney) && styles.actionButtonDisabled,
            isJourneyActive && styles.activeJourneyButton
          ]}
          onPress={isJourneyActive ? () => router.push('/journey') : handleStartJourney}
          disabled={!bus || bus.status !== 'active' || isStartingJourney}
        >
          {isStartingJourney ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons 
                name={isJourneyActive ? "navigate" : "play"} 
                size={24} 
                color="#FFFFFF" 
                style={styles.buttonIcon}
              />
              <Text style={styles.actionButtonText}>
                {isJourneyActive ? 'View Active Journey' : 'Start Journey'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {bus && bus.status !== 'active' && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={20} color="#FF9500" />
            <Text style={styles.warningText}>
              Bus is not active. Contact dispatch to activate your bus.
            </Text>
          </View>
        )}

        {/* Backend Connection Info */}
        <View style={styles.infoCard}>
          <Ionicons name="server" size={16} color="#007AFF" />
          <Text style={styles.infoText}>
            Connecting to Node.js backend on 100.64.4.165:4000
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  welcomeText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  usernameText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: '#1A1A1B',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusSubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 4,
  },
  busCard: {
    backgroundColor: '#1A1A1B',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  busInfo: {
    marginBottom: 16,
  },
  busInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  busInfoLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  busInfoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  routeSection: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 16,
  },
  routeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stopName: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.6,
  },
  activeJourneyButton: {
    backgroundColor: '#34C759',
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: '#2D1B00',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  warningText: {
    color: '#FF9500',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  busIdText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoCard: {
    backgroundColor: '#1A1A1B',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoText: {
    color: '#888888',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
});