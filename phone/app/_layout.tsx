import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { CorePluginsProvider } from '@/context/CorePluginsContext';
import { useT } from '@/lib/i18n';
import { ThemeDefinition } from '@/constants/theme';
import { loadCustomThemes } from '@/lib/community';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

function AppThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings, vault } = useApp();
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>([]);

  useEffect(() => {
    if (vault?.path) {
      loadCustomThemes(vault.path).then(setCustomThemes);
    }
  }, [vault?.path]);

  return (
    <ThemeProvider themeId={settings.theme} customThemes={customThemes}>
      {children}
    </ThemeProvider>
  );
}

function ThemedNavigation() {
  const { colors, isDark } = useTheme();
  const t = useT();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.bgPrimary,
      card: colors.bgSecondary,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.red,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.bgPrimary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="editor" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            title: t('phone.layout.settings'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen
          name="snippets"
          options={{
            presentation: 'modal',
            title: t('phone.layout.snippets'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="core-plugins"
          options={{
            presentation: 'modal',
            title: t('phone.corePlugins.title'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="plugins"
          options={{
            presentation: 'modal',
            title: t('phone.layout.plugins'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="templates"
          options={{
            presentation: 'modal',
            title: t('phone.layout.templates'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="recovery"
          options={{
            presentation: 'modal',
            title: t('phone.layout.recovery'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="composer"
          options={{
            presentation: 'modal',
            title: t('phone.layout.composer'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="attachments"
          options={{
            presentation: 'modal',
            title: t('phone.layout.attachments'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="slides"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="quick"
          options={{
            presentation: 'modal',
            title: t('web.quick.title'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="backlinks"
          options={{
            presentation: 'modal',
            title: t('phone.layout.backlinks'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="frontmatter"
          options={{
            presentation: 'modal',
            title: t('phone.layout.frontmatter'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="calendar"
          options={{
            title: t('phone.layout.calendar'),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="flashcards"
          options={{
            title: t('phone.layout.flashcards'),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="graph"
          options={{
            title: t('phone.layout.graph'),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="publish"
          options={{
            presentation: 'modal',
            title: t('phone.layout.publish'),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="trash"
          options={{
            presentation: 'modal',
            title: t('phone.layout.trash'),
            headerStyle: { backgroundColor: colors.bgSecondary },
            headerTintColor: colors.textPrimary,
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <CorePluginsProvider>
          <AppThemeWrapper>
            <ThemedNavigation />
          </AppThemeWrapper>
        </CorePluginsProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
