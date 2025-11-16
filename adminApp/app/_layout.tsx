import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Driver Login',
            headerStyle: { backgroundColor: '#1a1a1b' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        <Stack.Screen 
          name="dashboard" 
          options={{ 
            title: 'Driver Dashboard',
            headerStyle: { backgroundColor: '#1a1a1b' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerBackVisible: false
          }} 
        />
        <Stack.Screen 
          name="journey" 
          options={{ 
            title: 'Active Journey',
            headerStyle: { backgroundColor: '#1a1a1b' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}