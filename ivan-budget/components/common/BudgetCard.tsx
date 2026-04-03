import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { Colors } from '../../constants/colors';
import { formatAmount } from '../../utils/currency';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface BudgetCardProps {
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'savings' | 'balance';
  subtitle?: string;
  onPress?: () => void;
}

const TYPE_COLOR: Record<string, string> = {
  income: Colors.income,
  expense: Colors.expense,
  savings: Colors.savings,
  balance: Colors.primary,
};

function getCardBackground(type: BudgetCardProps['type'], isDark: boolean): string {
  if (type === 'income') return isDark ? '#1B3A1F' : '#E8F5E9';
  if (type === 'expense') return isDark ? '#3E0A0A' : '#FFEBEE';
  if (type === 'savings') return isDark ? '#0A1F3E' : '#E3F2FD';
  return 'transparent'; // balance — use surface default
}

export function BudgetCard({ title, amount, type, subtitle, onPress }: BudgetCardProps) {
  const { settings } = useSettingsStore();
  const theme = useTheme();
  const color =
    type === 'balance'
      ? amount >= 0
        ? Colors.balance.positive
        : Colors.balance.negative
      : TYPE_COLOR[type];

  const cardBg = type === 'balance'
    ? theme.colors.surface
    : getCardBackground(type, theme.dark);

  return (
    <Card style={[styles.card, { backgroundColor: cardBg }]} elevation={1} onPress={onPress}>
      <Card.Content>
        <Text variant="labelMedium" style={styles.label}>{title}</Text>
        <Text variant="headlineSmall" style={[styles.amount, { color }]}>
          {formatAmount(amount, settings.currency)}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" style={styles.subtitle}>{subtitle}</Text>
        )}
        {onPress && (
          <Text variant="labelSmall" style={styles.tapHint}>Tap za detalje →</Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  label: {
    color: Colors.unpaid,
    marginBottom: 4,
  },
  amount: {
    fontWeight: 'bold',
  },
  subtitle: {
    color: Colors.unpaid,
    marginTop: 2,
  },
  tapHint: {
    color: Colors.primary,
    marginTop: 4,
    fontSize: 10,
  },
});
