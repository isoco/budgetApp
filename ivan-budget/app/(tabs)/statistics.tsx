import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, SegmentedButtons, Card } from 'react-native-paper';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { Colors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getYearlyBalances } from '../../database/queries/summary';
import { getEntriesByType } from '../../database/queries/entries';
import { MonthBalance } from '../../types';
import { MONTHS_HR_SHORT } from '../../constants/months';
import { formatAmountShort } from '../../utils/currency';

const SCREEN_WIDTH = Dimensions.get('window').width - 32;
const CHART_CONFIG = {
  backgroundColor: Colors.surface,
  backgroundGradientFrom: Colors.surface,
  backgroundGradientTo: Colors.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
  labelColor: () => Colors.onSurface,
  propsForLabels: { fontSize: 10 },
};

const CURRENT_YEAR = new Date().getFullYear();

export default function StatisticsScreen() {
  const { settings } = useSettingsStore();
  const C = useThemeColors();
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [balances, setBalances] = useState<MonthBalance[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<{ name: string; amount: number; color: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const load = useCallback(async () => {
    const year = parseInt(selectedYear);
    const yearBalances = await getYearlyBalances(year);
    setBalances(yearBalances);

    // Expense breakdown for selected month
    const expEntries = await getEntriesByType(year, selectedMonth, 'expense');
    const breakdown = expEntries
      .filter((e) => e.actual_amount > 0)
      .map((e) => ({
        name: e.category_name_hr ?? e.category_name ?? '',
        amount: e.actual_amount,
        color: e.category_color ?? Colors.expense,
      }));
    setExpenseBreakdown(breakdown);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    load();
  }, [load]);

  // Build 12-month arrays
  const monthLabels = MONTHS_HR_SHORT;
  const incomeData = monthLabels.map((_, i) => {
    const b = balances.find((b) => b.month === i + 1);
    return b?.total_income ?? 0;
  });
  const expenseData = monthLabels.map((_, i) => {
    const b = balances.find((b) => b.month === i + 1);
    return b?.total_expenses ?? 0;
  });
  const savingsData = monthLabels.map((_, i) => {
    const b = balances.find((b) => b.month === i + 1);
    return b?.total_savings ?? 0;
  });

  const hasBarData = incomeData.some((v) => v > 0) || expenseData.some((v) => v > 0);
  const hasPieData = expenseBreakdown.length > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      <SegmentedButtons
        value={selectedYear}
        onValueChange={setSelectedYear}
        buttons={[
          { value: String(CURRENT_YEAR - 1), label: String(CURRENT_YEAR - 1) },
          { value: String(CURRENT_YEAR), label: String(CURRENT_YEAR) },
          { value: String(CURRENT_YEAR + 1), label: String(CURRENT_YEAR + 1) },
        ]}
        style={styles.yearPicker}
      />

      {/* Bar chart: Income vs Expenses */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title title="Prihodi vs Troškovi" />
        <Card.Content>
          {hasBarData ? (
            <BarChart
              data={{
                labels: MONTHS_HR_SHORT,
                datasets: [
                  { data: incomeData },
                ],
              }}
              width={SCREEN_WIDTH - 32}
              height={200}
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
              }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix=" €"
            />
          ) : (
            <Text variant="bodyMedium" style={styles.noData}>Nema podataka za odabranu godinu</Text>
          )}
        </Card.Content>
      </Card>

      {/* Line chart: Savings */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title title="Štednja po mjesecima" />
        <Card.Content>
          {savingsData.some((v) => v > 0) ? (
            <LineChart
              data={{
                labels: MONTHS_HR_SHORT,
                datasets: [{ data: savingsData }],
              }}
              width={SCREEN_WIDTH - 32}
              height={180}
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
              }}
              style={styles.chart}
              bezier
              fromZero
              yAxisLabel=""
              yAxisSuffix=""
            />
          ) : (
            <Text variant="bodyMedium" style={styles.noData}>Nema podataka o štednji</Text>
          )}
        </Card.Content>
      </Card>

      {/* Pie chart: Expense breakdown */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title
          title="Raspored troškova"
          subtitle={`${MONTHS_HR_SHORT[selectedMonth - 1]} ${selectedYear}`}
        />
        <Card.Content>
          <SegmentedButtons
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
            buttons={MONTHS_HR_SHORT.map((label, i) => ({
              value: String(i + 1),
              label,
            }))}
            style={styles.monthPicker}
          />
          {hasPieData ? (
            <>
              <PieChart
                data={expenseBreakdown.map((e, i) => ({
                  name: e.name.length > 12 ? e.name.substring(0, 12) + '...' : e.name,
                  population: e.amount,
                  color: e.color,
                  legendFontColor: Colors.onSurface,
                  legendFontSize: 11,
                }))}
                width={SCREEN_WIDTH - 32}
                height={180}
                chartConfig={CHART_CONFIG}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
              {/* Legend with amounts */}
              <View style={styles.legend}>
                {expenseBreakdown.map((e, i) => (
                  <View key={i} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: e.color }]} />
                    <Text variant="labelSmall" style={styles.legendName} numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text variant="labelSmall" style={{ color: Colors.expense, fontWeight: 'bold' }}>
                      {formatAmountShort(e.amount, settings.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text variant="bodyMedium" style={styles.noData}>
              Nema troškova za odabrani mjesec
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Year summary table */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title title={`Godišnji sažetak ${selectedYear}`} />
        <Card.Content>
          <View style={styles.tableHeader}>
            <Text variant="labelSmall" style={[styles.tableCell, styles.tableMonth]}>Mj.</Text>
            <Text variant="labelSmall" style={[styles.tableCell, { color: Colors.income }]}>Prihodi</Text>
            <Text variant="labelSmall" style={[styles.tableCell, { color: Colors.expense }]}>Troškovi</Text>
            <Text variant="labelSmall" style={[styles.tableCell, { color: Colors.primary }]}>Saldo</Text>
          </View>
          {balances.map((b) => (
            <View key={b.month} style={styles.tableRow}>
              <Text variant="bodySmall" style={[styles.tableCell, styles.tableMonth]}>
                {MONTHS_HR_SHORT[b.month - 1]}
              </Text>
              <Text variant="bodySmall" style={[styles.tableCell, { color: Colors.income }]}>
                {formatAmountShort(b.total_income, settings.currency)}
              </Text>
              <Text variant="bodySmall" style={[styles.tableCell, { color: Colors.expense }]}>
                {formatAmountShort(b.total_expenses, settings.currency)}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.tableCell,
                  { color: b.balance >= 0 ? Colors.income : Colors.expense, fontWeight: 'bold' },
                ]}
              >
                {formatAmountShort(b.balance, settings.currency)}
              </Text>
            </View>
          ))}
          {balances.length === 0 && (
            <Text variant="bodyMedium" style={styles.noData}>Nema podataka</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  yearPicker: {
    marginBottom: 4,
  },
  card: {},
  chart: {
    marginTop: 8,
    borderRadius: 8,
  },
  noData: {
    color: Colors.unpaid,
    textAlign: 'center',
    paddingVertical: 24,
  },
  monthPicker: {
    marginBottom: 8,
  },
  legend: {
    marginTop: 12,
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    color: Colors.onSurface,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '60',
  },
  tableCell: {
    flex: 1,
    textAlign: 'right',
    color: Colors.onSurface,
  },
  tableMonth: {
    flex: 0.6,
    textAlign: 'left',
    color: Colors.unpaid,
  },
});
