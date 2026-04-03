import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { Colors } from './colors';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.background,
    surface: Colors.surface,
    onSurface: Colors.onSurface,
    outline: Colors.border,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primaryLight,
    secondary: Colors.secondary,
    background: Colors.backgroundDark,
    surface: Colors.surfaceDark,
    onSurface: Colors.onSurfaceDark,
  },
};
