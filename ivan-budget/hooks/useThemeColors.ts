import { useTheme } from 'react-native-paper';
import { Colors } from '../constants/colors';

export function useThemeColors() {
  const theme = useTheme();
  return {
    ...Colors,
    background: theme.colors.background,
    surface: theme.colors.surface,
    onSurface: theme.colors.onSurface,
    border: theme.dark ? '#444444' : Colors.border,
    unpaid: theme.dark ? '#9E9E9E' : Colors.unpaid,
  };
}
