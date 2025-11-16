import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { updateBusLocation } from './api';
import { addToQueue } from './queue';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    try {
      const { locations } = data as any;
      const location = locations[0];
      
      if (!location) {
        console.log('No location data received');
        return;
      }

      console.log('Background location update:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed: location.coords.speed || 0,
        accuracy: location.coords.accuracy
      });

      // Get the stored bus ID from AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const busId = await AsyncStorage.getItem('current_bus_id');
      
      if (!busId) {
        console.error('No bus ID found for background location update');
        return;
      }

      // Skip location updates with poor accuracy (> 100 meters)
      if (location.coords.accuracy && location.coords.accuracy > 100) {
        console.log('Skipping location update due to poor accuracy:', location.coords.accuracy);
        return;
      }

      const locationUpdate = {
        busId,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed: Math.max(0, location.coords.speed || 0) // Ensure speed is not negative
      };

      try {
        // Send location update to backend via HTTP
        console.log('Background task: Sending location update to backend:', locationUpdate);
        const response = await updateBusLocation(locationUpdate);
        console.log('Background task: Location update sent successfully:', response);
      } catch (error) {
        console.error('Background task: Failed to send location update to backend:', error);
        console.error('Background task: Adding to queue for retry...');
        // If network request fails, add to offline queue
        await addToQueue(locationUpdate);
        console.log('Background task: Location update added to queue');
      }
    } catch (taskError) {
      console.error('Error in background location task:', taskError);
    }
  }
});

export const startBackgroundLocationUpdates = async (busId: string): Promise<boolean> => {
  try {
    // Store the bus ID for background task
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('current_bus_id', busId);

    console.log('Starting background location updates for bus:', busId);

    // Check if task is already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      console.log('Background location updates already running');
      return true;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000, // 30 seconds
      distanceInterval: 10, // 10 meters
      foregroundService: {
        notificationTitle: 'Bus Location Tracking',
        notificationBody: 'Tracking bus location for passengers',
        notificationColor: '#1a1a1b'
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true
    });

    console.log('Background location updates started successfully');
    return true;
  } catch (error) {
    console.error('Failed to start background location updates:', error);
    return false;
  }
};

export const stopBackgroundLocationUpdates = async (): Promise<void> => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location updates stopped');
    }

    // Clear the stored bus ID
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('current_bus_id');
    console.log('Bus ID cleared from storage');
  } catch (error) {
    console.error('Failed to stop background location updates:', error);
  }
};

export const isLocationTaskRunning = async (): Promise<boolean> => {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch (error) {
    console.error('Error checking if location task is running:', error);
    return false;
  }
};