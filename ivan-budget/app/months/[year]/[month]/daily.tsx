import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Text, Card, TextInput, Button, Surface } from 'react-native-paper';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../../constants/colors';
import { useSettingsStore } from '../../../../stores/useSettingsStore';
import { useDailyData } from '../../../../hooks/useDailyData';
import { DailyTracking } from '../../../../types';
import { formatAmount } from '../../../../utils/currency';
import { getMonthLabel, getDaysInMonth } from '../../../../utils/dateHelpers';
import { DAYS_HR_SHORT } from '../../../../constants/months';
import { useEffect } from 'react';

export default function DailyScreen() {
  const { year: yearParam, month: monthParam } = useLocalSearchParams<{ year: string; month: string }>();
  const year = parseInt(yearParam);
  const month = parseInt(monthParam);

  const navigation = useNavigation();
  const { settings } = useSettingsStore();
  const { days, summary, loading, updateDay } = useDailyData(year, month);

  const [editDay, setEditDay] = useState<DailyTracking | null>(null);
  const [allowedInput, setAllowedInput] = useState('');
  const [spentInput, setSpentInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: `Život — ${getMonthLabel(year, month)}` });
  }, [year, month]);

  const openEdit = useCallback((day: DailyTracking) => {
    setEditDay(day);
    setAllowedInput(String(day.allowed_amount));
    setSpentInput(String(day.spent_amount));
    setNotesInput(day.notes ?? '');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editDay) return;
    setSaving(true);
    try {
      await updateDay(
        editDay.day,
        parseFloat(allowedInput) || 0,
        parseFloat(spentInput) || 0,
        notesInput || null
      );
      setEditDay(null);
    } finally {
      setSaving(false);
    }
  }, [editDay, allowedInput, spentInput, notesInput, updateDay]);

  // Get day of week for first day of month
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const renderDay = useCallback(({ item }: { item: DailyTracking }) => {
    const diff = item.allowed_amount - item.spent_amount;
    const diffColor = diff >= 0 ? Colors.income : Colors.expense;
    const hasData = item.spent_amount > 0;
    const today = new Date();
    const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === item.day;

    // Day of week
    const dayDate = new Date(year, month - 1, item.day);
    const dayOfWeek = DAYS_HR_SHORT[dayDate.getDay()];

    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          isToday && styles.todayCell,
          hasData && diff < 0 && styles.overdraftCell,
          hasData && diff >= 0 && styles.surplusCell,
        ]}
        onPress={() => openEdit(item)}
      >
        <Text variant="labelSmall" style={styles.dayOfWeek}>{dayOfWeek}</Text>
        <Text variant="bodyMedium" style={[styles.dayNumber, isToday && styles.todayText]}>
          {item.day}
        </Text>
        {hasData && (
          <>
            <Text variant="labelSmall" style={{ color: Colors.expense }}>
              {item.spent_amount.toFixed(0)}
            </Text>
            <Text variant="labelSmall" style={{ color: diffColor, fontWeight: 'bold' }}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(0)}
            </Text>
          </>
        )}
        {!hasData && (
          <Text variant="labelSmall" style={styles.allowedText}>
            {item.allowed_amount.toFixed(0)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [year, month, openEdit]);

  return (
    <View style={styles.container}>
      {/* Summary row */}
      <Card style={styles.summaryCard} elevation={1}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text variant="labelSmall" style={styles.summaryLabel}>Dozvoljeno</Text>
              <Text variant="titleMedium" style={{ color: Colors.income, fontWeight: 'bold' }}>
                {formatAmount(summary.total_allowed, settings.currency)}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text variant="labelSmall" style={styles.summaryLabel}>Potrošeno</Text>
              <Text variant="titleMedium" style={{ color: Colors.expense, fontWeight: 'bold' }}>
                {formatAmount(summary.total_spent, settings.currency)}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text variant="labelSmall" style={styles.summaryLabel}>Saldo</Text>
              <Text
                variant="titleMedium"
                style={{
                  color: summary.surplus >= 0 ? Colors.income : Colors.expense,
                  fontWeight: 'bold',
                }}
              >
                {formatAmount(summary.surplus, settings.currency)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Day grid */}
      <FlatList
        data={days}
        keyExtractor={(item) => String(item.day)}
        renderItem={renderDay}
        numColumns={7}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={
          <View style={styles.weekHeader}>
            {DAYS_HR_SHORT.map((d, i) => (
              <Text key={i} variant="labelSmall" style={styles.weekDay}>{d}</Text>
            ))}
          </View>
        }
      />

      {/* Edit day modal */}
      <Modal visible={!!editDay} transparent animationType="slide" onRequestClose={() => setEditDay(null)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.editSheet} elevation={4}>
            <Text variant="titleMedium" style={styles.editTitle}>
              {editDay?.day}. {month}. {year}
            </Text>

            <TextInput
              label="Dozvoljeno (€)"
              value={allowedInput}
              onChangeText={setAllowedInput}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.editField}
            />
            <TextInput
              label="Potrošeno (€)"
              value={spentInput}
              onChangeText={setSpentInput}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.editField}
            />
            <TextInput
              label="Napomene"
              value={notesInput}
              onChangeText={setNotesInput}
              mode="outlined"
              style={styles.editField}
              multiline
            />

            <View style={styles.editActions}>
              <Button mode="outlined" onPress={() => setEditDay(null)} style={styles.editBtn}>
                Odustani
              </Button>
              <Button mode="contained" onPress={saveEdit} loading={saving} style={styles.editBtn}>
                Spremi
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryCard: {
    margin: 12,
    backgroundColor: Colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: Colors.unpaid,
    marginBottom: 2,
  },
  grid: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: Colors.unpaid,
    fontWeight: '600',
  },
  gridRow: {
    gap: 2,
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    padding: 4,
    alignItems: 'center',
    minHeight: 64,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todayCell: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  overdraftCell: {
    backgroundColor: Colors.expense + '10',
  },
  surplusCell: {
    backgroundColor: Colors.income + '08',
  },
  dayOfWeek: {
    color: Colors.unpaid,
    fontSize: 9,
  },
  dayNumber: {
    fontWeight: '600',
    color: Colors.onSurface,
  },
  todayText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  allowedText: {
    color: Colors.unpaid,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  editTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  editField: {
    backgroundColor: Colors.surface,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingBottom: 16,
  },
  editBtn: {
    flex: 1,
  },
});
