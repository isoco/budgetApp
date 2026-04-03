import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TextInput as RNTextInput } from 'react-native';
import { Text, FAB, Card, Chip, Divider, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMonthStore } from '../../stores/useMonthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useSummary } from '../../hooks/useSummary';
import { BudgetCard } from '../../components/common/BudgetCard';
import { AddEntrySheet } from '../../components/month/AddEntrySheet';
import { formatAmount } from '../../utils/currency';
import { getCurrentYearMonth, getMonthLabel, getDueStatus, formatDateShortHR } from '../../utils/dateHelpers';
import { getUpcomingBills } from '../../database/queries/entries';
import { getMonthDailySummary, getDayTracking, upsertDayTracking, getMonthProjectedDailySpending } from '../../database/queries/daily';
import { getMonthBalance } from '../../database/queries/summary';
import { getMonthFuelTotal } from '../../database/queries/fuel';
import { BudgetEntry } from '../../types';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';

function getBalanceCardColors(balance: number, isDark: boolean): { backgroundColor: string; borderLeftColor: string } {
  if (balance < 0) return { backgroundColor: isDark ? '#4A0000' : '#FFCDD2', borderLeftColor: '#C62828' };
  if (balance < 100) return { backgroundColor: isDark ? '#3D3000' : '#FFF9C4', borderLeftColor: '#F9A825' };
  if (balance < 300) return { backgroundColor: isDark ? '#1A2E00' : '#DCEDC8', borderLeftColor: '#8BC34A' };
  if (balance < 500) return { backgroundColor: isDark ? '#0D2B10' : '#C8E6C9', borderLeftColor: '#4CAF50' };
  return { backgroundColor: isDark ? '#0A3D0F' : '#A5D6A7', borderLeftColor: '#2E7D32' };
}

function formatCroatianDate(date: Date): string {
  // e.g. "Četvrtak, 3.4.2026"
  return format(date, "EEEE, d.M.yyyy", { locale: hr });
}

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const C = useThemeColors();
  const { year, month, entries, balance, loading, loadMonth, addEntry } = useMonthStore();
  const { settings } = useSettingsStore();
  const summary = useSummary(entries);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [upcomingBills, setUpcomingBills] = useState<BudgetEntry[]>([]);
  const [dailySummary, setDailySummary] = useState({ total_allowed: 0, total_spent: 0, surplus: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [projectedDailySpending, setProjectedDailySpending] = useState(0);
  const [lastMonthBalance, setLastMonthBalance] = useState(0);
  const [fuelTotal, setFuelTotal] = useState(0);

  // Today's day tracker state
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const [todayAllowed, setTodayAllowed] = useState(settings.daily_default_amount);
  const [todaySpentInput, setTodaySpentInput] = useState('0');
  const [todayNotesInput, setTodayNotesInput] = useState('');
  const [todaySaving, setTodaySaving] = useState(false);

  const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

  const loadTodayTracking = useCallback(async () => {
    const rec = await getDayTracking(todayYear, todayMonth, todayDay);
    if (rec) {
      setTodayAllowed(rec.allowed_amount);
      setTodaySpentInput(String(rec.spent_amount));
      setTodayNotesInput(rec.notes ?? '');
    } else {
      setTodayAllowed(settings.daily_default_amount);
      setTodaySpentInput('0');
      setTodayNotesInput('');
    }
  }, [todayYear, todayMonth, todayDay, settings.daily_default_amount]);

  const load = useCallback(async () => {
    await loadMonth(year, month, settings.daily_default_amount);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const [bills, daily, projSpending, prevBalance, fuel] = await Promise.all([
      getUpcomingBills(7),
      getMonthDailySummary(year, month),
      getMonthProjectedDailySpending(year, month, todayDay),
      getMonthBalance(prevYear, prevMonth),
      getMonthFuelTotal(year, month),
    ]);
    setUpcomingBills(bills);
    setDailySummary(daily);
    setProjectedDailySpending(projSpending);
    setLastMonthBalance(prevBalance.balance);
    setFuelTotal(fuel);
    await loadTodayTracking();
  }, [year, month, settings.daily_default_amount, loadTodayTracking]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleAddEntry = async (data: Parameters<typeof addEntry>[0]) => {
    await addEntry(data);
    await load();
  };

  const handleSaveTodaySpending = async () => {
    setTodaySaving(true);
    try {
      const spent = parseFloat(todaySpentInput) || 0;
      await upsertDayTracking(todayYear, todayMonth, todayDay, todayAllowed, spent, todayNotesInput || null);
      const [projSpending] = await Promise.all([
        getMonthProjectedDailySpending(todayYear, todayMonth, todayDay),
        loadTodayTracking(),
      ]);
      setProjectedDailySpending(projSpending);
      // Reload summary via loadMonth to get fresh income/expense totals
      await loadMonth(todayYear, todayMonth, settings.daily_default_amount);
    } finally {
      setTodaySaving(false);
    }
  };

  const balanceValue = balance?.balance ?? 0;
  const totalBalance = balanceValue + lastMonthBalance;
  // Procjena: income - fixed_expenses - fuel - daily_life_projection
  const projectedBalance = summary.totalIncome - summary.effectiveExpenses - fuelTotal - projectedDailySpending;
  const balanceColor = totalBalance >= 0 ? Colors.balance.positive : Colors.balance.negative;
  const balanceCardColors = getBalanceCardColors(totalBalance, theme.dark);

  const todaySpent = parseFloat(todaySpentInput) || 0;
  const todayRemainder = todayAllowed - todaySpent;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Month header */}
        <View style={styles.monthHeader}>
          <Text variant="titleLarge" style={[styles.monthTitle, { color: C.onSurface }]}>
            {getMonthLabel(year, month)}
          </Text>
          <Chip
            icon="calendar"
            onPress={() => router.push(`/months/${year}/${month}`)}
            compact
          >
            Detalji
          </Chip>
        </View>

        {/* Balance highlight */}
        <Card
          style={[styles.balanceCard, { backgroundColor: balanceCardColors.backgroundColor, borderLeftColor: balanceCardColors.borderLeftColor }]}
          elevation={2}
        >
          <Card.Content>
            <Text variant="labelMedium" style={[styles.balanceLabel, { color: C.unpaid }]}>Ukupni saldo</Text>
            <Text variant="displaySmall" style={[styles.balanceAmount, { color: balanceColor }]}>
              {formatAmount(totalBalance, settings.currency)}
            </Text>
            {lastMonthBalance !== 0 && (
              <Text variant="bodySmall" style={[styles.balanceSub, { color: C.unpaid }]}>
                Ovaj mj.: {formatAmount(balanceValue, settings.currency)}  ·  Prošli mj.: {formatAmount(lastMonthBalance, settings.currency)}
              </Text>
            )}
            <Text variant="bodySmall" style={[styles.balanceSub, { color: C.unpaid }]}>
              Procjena do kraja mj.: {formatAmount(projectedBalance, settings.currency)}
            </Text>
            <Text variant="bodySmall" style={[styles.balanceSub, { color: C.unpaid }]}>
              {summary.percentSpent}% prihoda potrošeno
            </Text>
          </Card.Content>
        </Card>

        {/* Summary cards */}
        <View style={styles.cardsRow}>
          <BudgetCard
            title="Prihodi"
            amount={summary.totalIncome}
            type="income"
            onPress={() => router.push(`/months/${year}/${month}?tab=income`)}
          />
          <BudgetCard
            title="Troškovi"
            amount={summary.effectiveExpenses + fuelTotal}
            type="expense"
            onPress={() => router.push(`/months/${year}/${month}?tab=expense`)}
          />
          <BudgetCard
            title="Štednja"
            amount={summary.totalSavings}
            type="savings"
            onPress={() => router.push(`/months/${year}/${month}?tab=savings`)}
          />
        </View>

        {/* Today card */}
        <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
          <Card.Title
            title="Danas"
            subtitle={formatCroatianDate(today)}
            left={() => (
              <MaterialCommunityIcons name="calendar-today" size={24} color={Colors.primary} />
            )}
          />
          <Card.Content>
            <View style={styles.todayStatsRow}>
              <View style={styles.dailyStat}>
                <Text variant="labelSmall" style={[styles.statLabel, { color: C.unpaid }]}>Dozvoljeno</Text>
                <Text variant="titleMedium" style={{ color: Colors.income }}>
                  {formatAmount(todayAllowed, settings.currency)}
                </Text>
              </View>
              <View style={styles.dailyStat}>
                <Text variant="labelSmall" style={[styles.statLabel, { color: C.unpaid }]}>Potrošeno</Text>
                <Text variant="titleMedium" style={{ color: Colors.expense }}>
                  {formatAmount(todaySpent, settings.currency)}
                </Text>
              </View>
              <View style={styles.dailyStat}>
                <Text variant="labelSmall" style={[styles.statLabel, { color: C.unpaid }]}>Ostatak</Text>
                <Text
                  variant="titleMedium"
                  style={{ color: todayRemainder >= 0 ? Colors.income : Colors.expense, fontWeight: 'bold' }}
                >
                  {formatAmount(todayRemainder, settings.currency)}
                </Text>
              </View>
            </View>
            <View style={styles.todayInputRow}>
              <RNTextInput
                value={todaySpentInput}
                onChangeText={setTodaySpentInput}
                keyboardType="decimal-pad"
                placeholder="Koliko potrošeno?"
                placeholderTextColor={C.unpaid}
                style={[styles.todayInput, { color: C.onSurface, borderColor: C.border }]}
              />
              <RNTextInput
                value={todayNotesInput}
                onChangeText={setTodayNotesInput}
                placeholder="Na što?"
                placeholderTextColor={C.unpaid}
                style={[styles.todayInputNotes, { color: C.onSurface, borderColor: C.border }]}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleSaveTodaySpending}
              loading={todaySaving}
              compact
              style={styles.todaySaveBtn}
            >
              Spremi
            </Button>
          </Card.Content>
        </Card>

        {/* Daily status (monthly) */}
        <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
          <Card.Title
            title="Život (mjesečno)"
            left={() => (
              <MaterialCommunityIcons name="calendar-month" size={24} color={Colors.primary} />
            )}
            right={() => (
              <Chip
                compact
                onPress={() => router.push(`/months/${year}/${month}/daily`)}
                style={styles.detailChip}
              >
                Detalji
              </Chip>
            )}
          />
          <Card.Content>
            <View style={styles.dailyRow}>
              <View style={styles.dailyStat}>
                <Text variant="labelSmall" style={[styles.statLabel, { color: C.unpaid }]}>Dozvoljeno</Text>
                <Text variant="titleMedium" style={{ color: Colors.income }}>
                  {formatAmount(dailySummary.total_allowed, settings.currency)}
                </Text>
              </View>
              <View style={styles.dailyStat}>
                <Text variant="labelSmall" style={[styles.statLabel, { color: C.unpaid }]}>Potrošeno</Text>
                <Text variant="titleMedium" style={{ color: Colors.expense }}>
                  {formatAmount(dailySummary.total_spent, settings.currency)}
                </Text>
              </View>
              <View style={styles.dailyStat}>
                <Text variant="labelSmall" style={[styles.statLabel, { color: C.unpaid }]}>Ostatak</Text>
                <Text
                  variant="titleMedium"
                  style={{
                    color: dailySummary.surplus >= 0 ? Colors.income : Colors.expense,
                    fontWeight: 'bold',
                  }}
                >
                  {formatAmount(dailySummary.surplus, settings.currency)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Upcoming bills */}
        {upcomingBills.length > 0 && (
          <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
            <Card.Title
              title="Nadolazeći računi"
              left={() => (
                <MaterialCommunityIcons name="bell-ring" size={24} color={Colors.dueSoon} />
              )}
            />
            <Card.Content style={styles.billsContent}>
              {upcomingBills.map((bill, i) => {
                const status = getDueStatus(bill.due_date, bill.paid_date);
                const statusColor =
                  status === 'overdue'
                    ? Colors.overdue
                    : status === 'due-soon'
                    ? Colors.dueSoon
                    : Colors.unpaid;
                return (
                  <React.Fragment key={bill.id}>
                    {i > 0 && <Divider />}
                    <View style={styles.billRow}>
                      <MaterialCommunityIcons
                        name={(bill.category_icon ?? 'cash') as never}
                        size={20}
                        color={bill.category_color ?? Colors.primary}
                        style={styles.billIcon}
                      />
                      <Text variant="bodyMedium" style={[styles.billName, { color: C.onSurface }]} numberOfLines={1}>
                        {bill.category_name_hr}
                      </Text>
                      <Text variant="labelSmall" style={[styles.billDate, { color: statusColor }]}>
                        {bill.due_date ? formatDateShortHR(bill.due_date) : ''}
                      </Text>
                      <Text variant="bodyMedium" style={{ color: Colors.expense, fontWeight: 'bold' }}>
                        {formatAmount(bill.planned_amount, settings.currency)}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </Card.Content>
          </Card>
        )}

        {/* Quick navigation */}
        <View style={styles.quickNav}>
          <Card
            style={[styles.navCard, { backgroundColor: C.surface }]}
            onPress={() => router.push(`/months/${year}/${month}/fuel`)}
          >
            <Card.Content style={styles.navCardContent}>
              <MaterialCommunityIcons name="gas-station" size={28} color={Colors.primary} />
              <Text variant="labelMedium" style={[styles.navLabel, { color: C.onSurface }]}>Gorivo</Text>
            </Card.Content>
          </Card>
          <Card
            style={[styles.navCard, { backgroundColor: C.surface }]}
            onPress={() => router.push('/statistics')}
          >
            <Card.Content style={styles.navCardContent}>
              <MaterialCommunityIcons name="chart-bar" size={28} color={Colors.primary} />
              <Text variant="labelMedium" style={[styles.navLabel, { color: C.onSurface }]}>Statistika</Text>
            </Card.Content>
          </Card>
          <Card
            style={[styles.navCard, { backgroundColor: C.surface }]}
            onPress={() => router.push('/months')}
          >
            <Card.Content style={styles.navCardContent}>
              <MaterialCommunityIcons name="calendar-month" size={28} color={Colors.primary} />
              <Text variant="labelMedium" style={[styles.navLabel, { color: C.onSurface }]}>Svi mjeseci</Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        color="#ffffff"
        onPress={() => setShowAddSheet(true)}
        label="Dodaj"
      />

      <AddEntrySheet
        visible={showAddSheet}
        onDismiss={() => setShowAddSheet(false)}
        onSave={handleAddEntry}
        year={year}
        month={month}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  monthTitle: {
    fontWeight: 'bold',
  },
  balanceCard: {
    borderLeftWidth: 4,
  },
  balanceLabel: {
    marginBottom: 4,
  },
  balanceAmount: {
    fontWeight: 'bold',
  },
  balanceSub: {
    marginTop: 4,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {},
  todayStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  todayInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  todayInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  todayInputNotes: {
    flex: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  todaySaveBtn: {
    alignSelf: 'flex-end',
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dailyStat: {
    alignItems: 'center',
  },
  statLabel: {
    marginBottom: 2,
  },
  detailChip: {
    marginRight: 8,
  },
  billsContent: {
    gap: 0,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  billIcon: {
    width: 24,
  },
  billName: {
    flex: 1,
  },
  billDate: {
    width: 48,
    textAlign: 'right',
  },
  quickNav: {
    flexDirection: 'row',
    gap: 8,
  },
  navCard: {
    flex: 1,
  },
  navCardContent: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  navLabel: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: Colors.primary,
  },
});
