import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, FAB, SegmentedButtons, Chip } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../../constants/colors';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { useMonthStore } from '../../../../stores/useMonthStore';
import { useSettingsStore } from '../../../../stores/useSettingsStore';
import { useSummary } from '../../../../hooks/useSummary';
import { EntryListItem } from '../../../../components/common/EntryListItem';
import { AddEntrySheet } from '../../../../components/month/AddEntrySheet';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { EmptyState } from '../../../../components/common/EmptyState';
import { formatAmount } from '../../../../utils/currency';
import { getMonthLabel } from '../../../../utils/dateHelpers';
import { BudgetEntry, CategoryType } from '../../../../types';

type TabType = 'income' | 'expense' | 'savings';

export default function MonthDetailScreen() {
  const { year: yearParam, month: monthParam, tab: tabParam } = useLocalSearchParams<{ year: string; month: string; tab?: string }>();
  const year = parseInt(yearParam);
  const month = parseInt(monthParam);

  const navigation = useNavigation();
  const router = useRouter();
  const C = useThemeColors();
  const { settings } = useSettingsStore();
  const { entries, balance, loading, loadMonth, addEntry, editEntry, removeEntry, payEntry, unpayEntry } =
    useMonthStore();
  const summary = useSummary(entries);

  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam === 'income' || tabParam === 'savings' ? tabParam : 'expense'
  );
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [recurringCollapsed, setRecurringCollapsed] = useState(false);
  const [oneTimeCollapsed, setOneTimeCollapsed] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: getMonthLabel(year, month) });
    loadMonth(year, month, settings.daily_default_amount);
  }, [year, month]);

  const tabEntries =
    activeTab === 'income'
      ? summary.income
      : activeTab === 'expense'
      ? summary.expense
      : summary.savings;

  const tabTotal =
    activeTab === 'income'
      ? summary.totalIncome
      : activeTab === 'expense'
      ? summary.totalExpenses
      : summary.totalSavings;

  const tabColor =
    activeTab === 'income' ? Colors.income : activeTab === 'expense' ? Colors.expense : Colors.savings;

  const recurringEntries = tabEntries.filter((e) => e.category_is_recurring === 1);
  const oneTimeEntries = tabEntries.filter((e) => e.category_is_recurring !== 1);

  const recurringTotal = recurringEntries.reduce(
    (s, e) => s + (e.actual_amount > 0 ? e.actual_amount : e.planned_amount),
    0
  );
  const oneTimeTotal = oneTimeEntries.reduce(
    (s, e) => s + (e.actual_amount > 0 ? e.actual_amount : e.planned_amount),
    0
  );

  const handleDelete = useCallback(async () => {
    if (deleteTarget !== null) {
      await removeEntry(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, removeEntry]);

  const handleTogglePaid = useCallback(
    async (id: number, isPaid: boolean) => {
      if (isPaid) {
        await unpayEntry(id);
      } else {
        await payEntry(id);
      }
    },
    [payEntry, unpayEntry]
  );

  const handleSaveEntry = useCallback(
    async (data: Parameters<typeof addEntry>[0]) => {
      if (editingEntry) {
        await editEntry(editingEntry.id, {
          planned_amount: data.planned_amount,
          actual_amount: data.actual_amount,
          notes: data.notes,
        });
        setEditingEntry(null);
      } else {
        await addEntry(data);
      }
    },
    [editingEntry, addEntry, editEntry]
  );

  const renderEntry = useCallback(
    (item: BudgetEntry) => (
      <EntryListItem
        entry={item}
        onPress={(e) => {
          setEditingEntry(e);
          setShowAddSheet(true);
        }}
        onDelete={(id) => setDeleteTarget(id)}
        onTogglePaid={handleTogglePaid}
      />
    ),
    [handleTogglePaid]
  );

  const renderSectionHeader = (
    label: string,
    count: number,
    total: number,
    collapsed: boolean,
    onToggle: () => void
  ) => (
    <TouchableOpacity style={[styles.groupHeader, { backgroundColor: C.background, borderBottomColor: C.border }]} onPress={onToggle}>
      <MaterialCommunityIcons
        name={collapsed ? 'chevron-right' : 'chevron-down'}
        size={20}
        color={Colors.primary}
      />
      <Text variant="labelLarge" style={[styles.groupTitle, { color: C.onSurface }]}>
        {label} ({count})
      </Text>
      <Text variant="labelMedium" style={{ color: tabColor, fontWeight: 'bold' }}>
        {formatAmount(total, settings.currency)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Month navigation quick links */}
      <View style={[styles.quickLinks, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Chip
          icon="calendar-today"
          onPress={() => router.push(`/months/${year}/${month}/daily`)}
          compact
          style={[styles.quickChip, { backgroundColor: C.background }]}
        >
          Život
        </Chip>
        <Chip
          icon="gas-station"
          onPress={() => router.push(`/months/${year}/${month}/fuel`)}
          compact
          style={[styles.quickChip, { backgroundColor: C.background }]}
        >
          Gorivo
        </Chip>
      </View>

      {/* Balance summary */}
      <View style={[styles.balanceSummary, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.balanceStat}>
          <Text variant="labelSmall" style={[styles.balanceLabel, { color: C.unpaid }]}>Prihodi</Text>
          <Text variant="titleSmall" style={{ color: Colors.income, fontWeight: 'bold' }}>
            {formatAmount(summary.totalIncome, settings.currency)}
          </Text>
        </View>
        <View style={styles.balanceStat}>
          <Text variant="labelSmall" style={[styles.balanceLabel, { color: C.unpaid }]}>Troškovi</Text>
          <Text variant="titleSmall" style={{ color: Colors.expense, fontWeight: 'bold' }}>
            {formatAmount(summary.totalExpenses, settings.currency)}
          </Text>
        </View>
        <View style={styles.balanceStat}>
          <Text variant="labelSmall" style={[styles.balanceLabel, { color: C.unpaid }]}>Štednja</Text>
          <Text variant="titleSmall" style={{ color: Colors.savings, fontWeight: 'bold' }}>
            {formatAmount(summary.totalSavings, settings.currency)}
          </Text>
        </View>
        <View style={styles.balanceStat}>
          <Text variant="labelSmall" style={[styles.balanceLabel, { color: C.unpaid }]}>Saldo</Text>
          <Text
            variant="titleSmall"
            style={{
              color: (balance?.balance ?? 0) >= 0 ? Colors.balance.positive : Colors.balance.negative,
              fontWeight: 'bold',
            }}
          >
            {formatAmount(balance?.balance ?? 0, settings.currency)}
          </Text>
        </View>
      </View>

      {/* Tab selector */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabType)}
        buttons={[
          { value: 'income', label: `Prihodi (${summary.income.length})` },
          { value: 'expense', label: `Troškovi (${summary.expense.length})` },
          { value: 'savings', label: `Štednja (${summary.savings.length})` },
        ]}
        style={styles.tabs}
      />

      {/* Total for current tab */}
      <View style={[styles.tabTotal, { borderLeftColor: tabColor, backgroundColor: C.surface }]}>
        <Text variant="labelMedium" style={{ color: C.unpaid }}>Ukupno</Text>
        <Text variant="titleMedium" style={{ color: tabColor, fontWeight: 'bold' }}>
          {formatAmount(tabTotal, settings.currency)}
        </Text>
      </View>

      {/* Grouped entry list */}
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {recurringEntries.length > 0 && (
              <>
                {renderSectionHeader('Redoviti', recurringEntries.length, recurringTotal, recurringCollapsed, () => setRecurringCollapsed((v) => !v))}
                {!recurringCollapsed && recurringEntries.map((item) => (
                  <View key={item.id}>{renderEntry(item)}</View>
                ))}
              </>
            )}
            {oneTimeEntries.length > 0 && (
              <>
                {renderSectionHeader('Jednokratni', oneTimeEntries.length, oneTimeTotal, oneTimeCollapsed, () => setOneTimeCollapsed((v) => !v))}
                {!oneTimeCollapsed && oneTimeEntries.map((item) => (
                  <View key={item.id}>{renderEntry(item)}</View>
                ))}
              </>
            )}
            {tabEntries.length === 0 && !loading && (
              <EmptyState
                icon="inbox-outline"
                title="Nema stavki"
                subtitle={`Dodaj ${activeTab === 'income' ? 'prihod' : activeTab === 'expense' ? 'trošak' : 'štednju'} tipkanjem +`}
              />
            )}
          </>
        }
        contentContainerStyle={styles.list}
        keyExtractor={() => 'header'}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color="#ffffff"
        onPress={() => {
          setEditingEntry(null);
          setShowAddSheet(true);
        }}
      />

      <AddEntrySheet
        visible={showAddSheet}
        onDismiss={() => {
          setShowAddSheet(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        year={year}
        month={month}
        editEntry={editingEntry}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Obriši stavku"
        message="Jesi li siguran da želiš obrisati ovu stavku?"
        confirmLabel="Obriši"
        onConfirm={handleDelete}
        onDismiss={() => setDeleteTarget(null)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  quickChip: {},
  balanceSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  balanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    marginBottom: 2,
  },
  tabs: {
    margin: 12,
  },
  tabTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 4,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  groupTitle: {
    flex: 1,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: Colors.primary,
  },
});
