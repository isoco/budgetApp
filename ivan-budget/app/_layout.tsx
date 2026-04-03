import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { View, ActivityIndicator, Text } from 'react-native';
import { initDatabase } from '../database';
import { useSettingsStore } from '../stores/useSettingsStore';
import { lightTheme, darkTheme } from '../constants/theme';
import { Colors } from '../constants/colors';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    async function init() {
      try {
        await loadSettings();
        await initDatabase();
        setDbReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        setError(String(e));
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  const theme = settings.dark_mode ? darkTheme : lightTheme;

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>Greška pri pokretanju: {error}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 16, color: Colors.onSurface }}>Inicijalizacija...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="months/[year]/[month]/index"
          options={{ title: 'Detalji mjeseca', headerBackTitle: 'Natrag' }}
        />
        <Stack.Screen
          name="months/[year]/[month]/daily"
          options={{ title: 'Život (dnevno)', headerBackTitle: 'Natrag' }}
        />
        <Stack.Screen
          name="months/[year]/[month]/fuel"
          options={{ title: 'Gorivo', headerBackTitle: 'Natrag' }}
        />
      </Stack>
    </PaperProvider>
  );
}
