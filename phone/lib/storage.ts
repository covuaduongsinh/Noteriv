import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  VAULTS: 'noteriv:vaults',
  ACTIVE_VAULT: 'noteriv:activeVault',
  SETTINGS: 'noteriv:settings',
  SETUP_COMPLETE: 'noteriv:setupComplete',
  WORKSPACE: (vaultId: string) => `noteriv:workspace:${vaultId}`,
  GITHUB_TOKEN: (vaultId: string) => `noteriv:ghToken:${vaultId}`,
  GIT_TOKEN: (vaultId: string) => `noteriv:gitToken:${vaultId}`,
};

function isSecureKey(key: string): boolean {
  return key.startsWith('noteriv:ghToken:') || key.startsWith('noteriv:gitToken:');
}

function toSecureKey(key: string): string {
  // Expo SecureStore on Android only accepts alphanumeric, '.', '-', and '_'
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function getItem<T>(key: string): Promise<T | null> {
  if (isSecureKey(key)) {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        const secureVal = await SecureStore.getItemAsync(toSecureKey(key));
        if (secureVal !== null) {
          return secureVal as T;
        }
        // Auto-migration: check if token was previously saved in AsyncStorage
        const legacyVal = await AsyncStorage.getItem(key);
        if (legacyVal) {
          let parsed: string = legacyVal;
          try {
            parsed = JSON.parse(legacyVal);
          } catch {
            parsed = legacyVal;
          }
          if (parsed) {
            await SecureStore.setItemAsync(toSecureKey(key), parsed);
            await AsyncStorage.removeItem(key);
            return parsed as T;
          }
        }
        return null;
      }
    } catch {
      // Fallback to AsyncStorage if SecureStore fails
    }
  }

  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  if (isSecureKey(key)) {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        const valStr = typeof value === 'string' ? value : JSON.stringify(value);
        await SecureStore.setItemAsync(toSecureKey(key), valStr);
        // Ensure legacy AsyncStorage does not retain the secret
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback to AsyncStorage if SecureStore fails
    }
  }

  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  if (isSecureKey(key)) {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        await SecureStore.deleteItemAsync(toSecureKey(key));
      }
    } catch {}
  }

  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

export { KEYS };
