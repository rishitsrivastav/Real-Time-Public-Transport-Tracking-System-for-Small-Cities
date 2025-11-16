import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    // Request foreground location permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'This app needs location access to track the bus location for passengers. Please enable location permissions in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Request background location permission (required for continuous tracking)
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    if (backgroundStatus !== 'granted') {
      Alert.alert(
        'Background Location Required',
        'For continuous location tracking while the app is in the background, please enable "Allow all the time" location permission in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              if (Platform.OS === 'ios') {
                // On iOS, users need to manually go to settings
                Alert.alert(
                  'Enable Background Location',
                  'Go to Settings > Privacy & Security > Location Services > [This App] > Select "Always"'
                );
              } else {
                // On Android, try to open app settings
                Location.requestBackgroundPermissionsAsync();
              }
            }
          }
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    Alert.alert(
      'Permission Error',
      'Failed to request location permissions. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
};

export const checkLocationPermissions = async (): Promise<{
  foreground: boolean;
  background: boolean;
}> => {
  try {
    const foregroundStatus = await Location.getForegroundPermissionsAsync();
    const backgroundStatus = await Location.getBackgroundPermissionsAsync();
    
    return {
      foreground: foregroundStatus.status === 'granted',
      background: backgroundStatus.status === 'granted'
    };
  } catch (error) {
    console.error('Error checking location permissions:', error);
    return { foreground: false, background: false };
  }
};