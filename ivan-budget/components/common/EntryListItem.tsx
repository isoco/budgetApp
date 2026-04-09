import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BudgetEntry } from '../../types';
import { Colors } from '../../constants/colors';
import { formatAmount } from '../../utils/currency';
import { formatDateShortHR, getDueStatus } from '../../utils/dateHelpers';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useThemeColors } from '../../hooks/useThemeColors';

interface EntryListItemProps {
  entry: BudgetEntry;
  onPress: (entry: BudgetEntry) => void;
  onDelete: (id: number) => void;
  onTogglePaid: (id: number, isPaid: boolean) => void;
}

const DUE_STATUS_COLORS = {
  paid: Colors.paid,
  overdue: Colors.overdue,
  'due-soon': Colors.dueSoon,
  upcoming: Colors.unpaid,
  none: 'transparent',
};

export const EntryListItem = React.memo(function EntryListItem({
  entry,
  onPress,
  onDelete,
  onTogglePaid,
}: EntryListItemProps) {
  const { settings } = useSettingsStore();
  const C = useThemeColors();
  const dueStatus = getDueStatus(entry.due_date, entry.paid_date);
  const isPaid = !!entry.paid_date;

  const handlePress = useCallback(() => onPress(entry), [entry, onPress]);
  const handleDelete = useCallback(() => onDelete(entry.id), [entry.id, onDelete]);
  const handleTogglePaid = useCallback(
    () => onTogglePaid(entry.id, isPaid),
    [entry.id, isPaid, onTogglePaid]
  );

  const amountColor =
    entry.category_type === 'income'
      ? Colors.income
      : entry.category_type === 'savings'
      ? Colors.savings
      : Colors.expense;

  const isOstalo = entry.category_name === 'other_income' || entry.category_name === 'other_expense';
  const displayName = isOstalo && entry.notes
    ? entry.notes
    : (entry.category_name_hr ?? entry.category_name ?? '');

  const isIncome = entry.category_type === 'income';

  // For income: badge shows "Primljeno" or "Očekivano"; for expense: shows "Plaćeno" or "Dospijeće"
  const badgeLabel = (() => {
    if (!entry.due_date && !entry.paid_date) return null;
    if (isIncome) {
      if (entry.paid_date) return `Primljeno ${formatDateShortHR(entry.paid_date)}`;
      if (entry.due_date) return `Očekivano ${formatDateShortHR(entry.due_date)}`;
    } else {
      if (dueStatus === 'paid') return `Plaćeno ${formatDateShortHR(entry.paid_date!)}`;
      if (entry.due_date) return `Dospijeće ${formatDateShortHR(entry.due_date)}`;
    }
    return null;
  })();

  const badgeColor = isIncome
    ? (entry.paid_date ? Colors.income : Colors.dueSoon)
    : DUE_STATUS_COLORS[dueStatus];

  const displayAmount = entry.planned_amount;

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.container, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: entry.category_color + '20' }]}>
        <MaterialCommunityIcons
          name={(entry.category_icon ?? 'cash') as never}
          size={22}
          color={entry.category_color ?? Colors.primary}
        />
      </View>

      <View style={styles.content}>
        <Text variant="bodyMedium" style={[styles.name, { color: C.onSurface }]} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.meta}>
          {badgeLabel && (
            <View style={[styles.dueBadge, { backgroundColor: badgeColor + '20' }]}>
              <Text variant="labelSmall" style={{ color: badgeColor }}>
                {badgeLabel}
              </Text>
            </View>
          )}
          {!isOstalo && entry.notes && (
            <Text variant="labelSmall" style={[styles.notes, { color: C.unpaid }]} numberOfLines={1}>
              {entry.notes}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text variant="titleSmall" style={[styles.amount, { color: amountColor }]}>
          {formatAmount(displayAmount, settings.currency)}
        </Text>
        <View style={styles.actions}>
          {(entry.due_date || isIncome) && (
            <IconButton
              icon={isPaid ? 'check-circle' : 'circle-outline'}
              size={18}
              iconColor={isPaid ? (isIncome ? Colors.income : Colors.paid) : Colors.unpaid}
              onPress={handleTogglePaid}
              style={styles.actionBtn}
              containerColor="transparent"
            />
          )}
          <IconButton
            icon="delete-outline"
            size={18}
            iconColor={Colors.expense}
            onPress={handleDelete}
            style={styles.actionBtn}
            containerColor="transparent"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  notes: {},
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amount: {
    fontWeight: 'bold',
  },
  plannedAmount: {
    fontSize: 11,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: -4,
  },
  actionBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },
});
