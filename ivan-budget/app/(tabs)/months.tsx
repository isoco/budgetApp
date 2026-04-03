import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getYearlyBalances } from '../../database/queries/summary';
import { MonthBalance } from '../../types';
import { MONTHS_HR } from '../../constants/months';
import { formatAmount } from '../../utils/currency';
import { getCurrentYearMonth } from '../../utils/dateHelpers';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function MonthsScreen() {
  const router = useRouter();
  const C = useThemeColors();
  const { settings } = useSettingsStore();
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [balances, setBalances] = useState<MonthBalance[]>([]);
  const { month: currentMonth, year: currentYear } = getCurrentYearMonth();

  const load = useCallback(async () => {
    const data = await getYearlyBalances(parseInt(selectedYear));
    setBalances(data);
  }, [selectedYear]);

  useEffect(() => {
    load();
  }, [load]);

  const getBalanceForMonth = (month: number): MonthBalance | undefined =>
    balances.find((b) => b.month === month);

  const renderMonth = ({ item: month }: { item: number }) => {
    const balance = getBalanceForMonth(month);
    const isCurrentMonth = month === currentMonth && parseInt(selectedYear) === currentYear;
    const hasData = !!balance && (balance.total_income > 0 || balance.total_expenses > 0);
    const balanceColor =
      !balance || balance.balance >= 0 ? Colors.balance.positive : Colors.balance.negative;

    // Determine card tint — current month takes priority
    let cardStyle: { backgroundColor: string; borderColor: string; borderWidth: number } = {
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1,
    };
    if (isCurrentMonth) {
      cardStyle = {
        backgroundColor: Colors.primary + '08',
        borderColor: Colors.primary,
        borderWidth: 2,
      };
    } else if (hasData && balance && balance.balance > 0) {
      cardStyle = {
        backgroundColor: '#E8F5E9',
        borderColor: '#2E7D32',
        borderWidth: 1,
      };
    } else if (hasData && balance && balance.balance < 0) {
      cardStyle = {
        backgroundColor: '#FFEBEE',
        borderColor: '#C62828',
        borderWidth: 1,
      };
    }

    return (
      <TouchableOpacity
        style={[styles.monthCard, cardStyle]}
        onPress={() => router.push(`/months/${selectedYear}/${month}`)}
        activeOpacity={0.7}
      >
        <View style={styles.monthHeader}>
          <Text
            variant="titleSmall"
            style={[styles.monthName, { color: C.onSurface }, isCurrentMonth && styles.currentMonthText]}
          >
            {MONTHS_HR[month - 1]}
          </Text>
          {isCurrentMonth && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Tekući</Text>
            </View>
          )}
        </View>

        {hasData ? (
          <View style={styles.monthStats}>
            <View style={styles.statRow}>
              <MaterialCommunityIcons name="arrow-up" size={14} color={Colors.income} />
              <Text variant="labelSmall" style={{ color: Colors.income }}>
                {formatAmount(balance!.total_income, settings.currency)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <MaterialCommunityIcons name="arrow-down" size={14} color={Colors.expense} />
              <Text variant="labelSmall" style={{ color: Colors.expense }}>
                {formatAmount(balance!.total_expenses, settings.currency)}
              </Text>
            </View>
            <Text
              variant="labelMedium"
              style={[styles.balanceAmount, { color: balanceColor }]}
            >
              {formatAmount(balance!.balance, settings.currency)}
            </Text>
          </View>
        ) : (
          <Text variant="bodySmall" style={[styles.emptyMonth, { color: C.unpaid }]}>
            Nema podataka
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <SegmentedButtons
        value={selectedYear}
        onValueChange={setSelectedYear}
        buttons={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
        style={styles.yearPicker}
      />

      <FlatList
        data={months}
        renderItem={renderMonth}
        keyExtractor={(item) => String(item)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  yearPicker: {
    margin: 16,
  },
  grid: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    gap: 8,
  },
  row: {
    gap: 8,
  },
  monthCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  currentMonthText: {
    color: Colors.primary,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthName: {
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  monthStats: {
    gap: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  balanceAmount: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyMonth: {
    fontStyle: 'italic',
  },
});
