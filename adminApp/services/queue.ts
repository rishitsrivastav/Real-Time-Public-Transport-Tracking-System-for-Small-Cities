import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationUpdate, updateBusLocation } from './api';

const QUEUE_KEY = 'pendingLocationUpdates';

export interface QueuedLocationUpdate extends LocationUpdate {
  timestamp: number;
  retryCount: number;
}

export const addToQueue = async (locationUpdate: LocationUpdate): Promise<void> => {
  try {
    const existingQueue = await getQueue();
    const queuedUpdate: QueuedLocationUpdate = {
      ...locationUpdate,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    const updatedQueue = [...existingQueue, queuedUpdate];
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
    console.log('Added location update to queue:', queuedUpdate);
  } catch (error) {
    console.error('Error adding to queue:', error);
  }
};

export const getQueue = async (): Promise<QueuedLocationUpdate[]> => {
  try {
    const queueData = await AsyncStorage.getItem(QUEUE_KEY);
    return queueData ? JSON.parse(queueData) : [];
  } catch (error) {
    console.error('Error getting queue:', error);
    return [];
  }
};

export const removeFromQueue = async (timestamp: number): Promise<void> => {
  try {
    const queue = await getQueue();
    const updatedQueue = queue.filter(item => item.timestamp !== timestamp);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
    console.log('Removed item from queue with timestamp:', timestamp);
  } catch (error) {
    console.error('Error removing from queue:', error);
  }
};

export const flushQueue = async (): Promise<void> => {
  try {
    const queue = await getQueue();
    console.log(`Flushing queue with ${queue.length} items`);
    
    if (queue.length === 0) {
      return;
    }

    const successfulUpdates: number[] = [];
    const failedUpdates: QueuedLocationUpdate[] = [];

    // Process each queued update
    for (const queuedUpdate of queue) {
      try {
        // Try to send the location update
        await updateBusLocation({
          busId: queuedUpdate.busId,
          lat: queuedUpdate.lat,
          lng: queuedUpdate.lng,
          speed: queuedUpdate.speed
        });
        
        // If successful, mark for removal
        successfulUpdates.push(queuedUpdate.timestamp);
        console.log('Successfully sent queued location update:', queuedUpdate.timestamp);
      } catch (error) {
        console.error('Failed to send queued update:', error);
        
        // Increment retry count
        const updatedItem = {
          ...queuedUpdate,
          retryCount: queuedUpdate.retryCount + 1
        };
        
        // Only keep items that haven't exceeded max retries (5 attempts)
        if (updatedItem.retryCount < 5) {
          failedUpdates.push(updatedItem);
        } else {
          console.log('Max retries exceeded for item:', queuedUpdate.timestamp);
        }
      }
    }

    // Update the queue with only failed items (that haven't exceeded retries)
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedUpdates));
    
    console.log(`Queue flush complete. Sent: ${successfulUpdates.length}, Failed: ${failedUpdates.length}`);
  } catch (error) {
    console.error('Error flushing queue:', error);
  }
};

export const clearQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.log('Queue cleared');
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
};

export const getQueueLength = async (): Promise<number> => {
  try {
    const queue = await getQueue();
    return queue.length;
  } catch (error) {
    console.error('Error getting queue length:', error);
    return 0;
  }
};