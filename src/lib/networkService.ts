import NetInfo from '@react-native-community/netinfo';

export async function isOnline() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected);
}

export function subscribeToNetworkStatus(callback: (online: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    callback(Boolean(state.isConnected));
  });
}
