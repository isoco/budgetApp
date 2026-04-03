import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Modal, Alert } from 'react-native';
import { Text, Card, FAB, Button, TextInput, Surface, SegmentedButtons, Divider, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../../constants/colors';
import { useSettingsStore } from '../../../../stores/useSettingsStore';
import { FuelEntry } from '../../../../types';
import {
  getMonthFuelEntries,
  createFuelEntry,
  deleteFuelEntry,
  getMonthFuelTotal,
  getMonthlySummary,
  upsertMonthlySummary,
} from '../../../../database/queries/fuel';
import { formatAmount } from '../../../../utils/currency';
import { getMonthLabel, formatDateShortHR, isoNow } from '../../../../utils/dateHelpers';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { EmptyState } from '../../../../components/common/EmptyState';

export default function FuelScreen() {
  const { year: yearParam, month: monthParam } = useLocalSearchParams<{ year: string; month: string }>();
  const year = parseInt(yearParam);
  const month = parseInt(monthParam);

  const navigation = useNavigation();
  const { settings } = useSettingsStore();

  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [estimated, setEstimated] = useState(settings.fuel_monthly_estimate);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [vehicle, setVehicle] = useState('Audi');
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [dateInput, setDateInput] = useState(isoNow());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: `Gorivo — ${getMonthLabel(year, month)}` });
    load();
  }, [year, month]);

  const load = useCallback(async () => {
    const [fuelEntries, fuelTotal, summary] = await Promise.all([
      getMonthFuelEntries(year, month),
      getMonthFuelTotal(year, month),
      getMonthlySummary(year, month),
    ]);
    setEntries(fuelEntries);
    setTotal(fuelTotal);
    if (summary) {
      setEstimated(summary.fuel_estimated);
    }
  }, [year, month]);

  const handleAdd = useCallback(async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Greška', 'Upiši ispravan iznos');
      return;
    }
    setSaving(true);
    try {
      const litersNum = liters ? parseFloat(liters) : null;
      const pricePerLiter =
        litersNum && amountNum ? amountNum / litersNum : null;

      await createFuelEntry({
        year,
        month,
        date: dateInput,
        vehicle,
        amount: amountNum,
        liters: litersNum,
        price_per_liter: pricePerLiter,
        notes: notes || null,
      });

      setShowAddModal(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }, [year, month, vehicle, amount, liters, dateInput, notes, load]);

  const handleDelete = useCallback(async () => {
    if (deleteTarget !== null) {
      await deleteFuelEntry(deleteTarget);
      setDeleteTarget(null);
      await load();
    }
  }, [deleteTarget, load]);

  const resetForm = () => {
    setAmount('');
    setLiters('');
    setVehicle('Audi');
    setDateInput(isoNow());
    setNotes('');
  };

  const balance = estimated - total;
  const balanceColor = balance >= 0 ? Colors.income : Colors.expense;

  const renderEntry = useCallback(({ item }: { item: FuelEntry }) => (
    <View style={styles.entryRow}>
      <View style={[styles.vehicleIcon, { backgroundColor: Colors.primary + '15' }]}>
        <MaterialCommunityIcons name="car" size={20} color={Colors.primary} />
      </View>
      <View style={styles.entryContent}>
        <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{item.vehicle}</Text>
        <View style={styles.entryMeta}>
          <Text variant="labelSmall" style={{ color: Colors.unpaid }}>
            {formatDateShortHR(item.date)}
          </Text>
          {item.liters && (
            <Text variant="labelSmall" style={{ color: Colors.unpaid }}>
              {item.liters.toFixed(2)} L
            </Text>
          )}
          {item.price_per_liter && (
            <Text variant="labelSmall" style={{ color: Colors.unpaid }}>
              {item.price_per_liter.toFixed(2)} €/L
            </Text>
          )}
        </View>
        {item.notes && (
          <Text variant="labelSmall" style={{ color: Colors.unpaid }}>{item.notes}</Text>
        )}
      </View>
      <Text variant="titleSmall" style={{ color: Colors.expense, fontWeight: 'bold' }}>
        {formatAmount(item.amount, settings.currency)}
      </Text>
      <IconButton
        icon="delete-outline"
        size={18}
        iconColor={Colors.expense}
        onPress={() => setDeleteTarget(item.id)}
        style={styles.deleteBtn}
      />
    </View>
  ), [settings.currency]);

  return (
    <View style={styles.container}>
      {/* Summary */}
      <Card style={styles.summaryCard} elevation={1}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text variant="labelSmall" style={styles.summaryLabel}>Procjena</Text>
              <Text variant="titleMedium" style={{ color: Colors.savings, fontWeight: 'bold' }}>
                {formatAmount(estimated, settings.currency)}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text variant="labelSmall" style={styles.summaryLabel}>Potrošeno</Text>
              <Text variant="titleMedium" style={{ color: Colors.expense, fontWeight: 'bold' }}>
                {formatAmount(total, settings.currency)}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text variant="labelSmall" style={styles.summaryLabel}>Ostatak</Text>
              <Text variant="titleMedium" style={{ color: balanceColor, fontWeight: 'bold' }}>
                {formatAmount(balance, settings.currency)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Entry list */}
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEntry}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <EmptyState
            icon="gas-station-outline"
            title="Nema unosa goriva"
            subtitle="Dodaj novi unos tipkanjem +"
          />
        }
        contentContainerStyle={styles.list}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color="#ffffff"
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
      />

      {/* Add modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.addSheet} elevation={4}>
            <Text variant="titleLarge" style={styles.sheetTitle}>Novi unos goriva</Text>

            <SegmentedButtons
              value={vehicle}
              onValueChange={setVehicle}
              buttons={[
                { value: 'Audi', label: 'Audi' },
                { value: 'ML', label: 'ML' },
                { value: 'Ostalo', label: 'Ostalo' },
              ]}
              style={styles.vehicleSelector}
            />

            <TextInput
              label="Datum (YYYY-MM-DD)"
              value={dateInput}
              onChangeText={setDateInput}
              mode="outlined"
              style={styles.field}
            />

            <View style={styles.row}>
              <TextInput
                label="Iznos (€)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                mode="outlined"
                style={[styles.field, styles.halfField]}
              />
              <TextInput
                label="Litara (opcionalno)"
                value={liters}
                onChangeText={setLiters}
                keyboardType="decimal-pad"
                mode="outlined"
                style={[styles.field, styles.halfField]}
              />
            </View>

            <TextInput
              label="Napomene"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.field}
            />

            <View style={styles.actions}>
              <Button mode="outlined" onPress={() => setShowAddModal(false)} style={styles.actionBtn}>
                Odustani
              </Button>
              <Button mode="contained" onPress={handleAdd} loading={saving} style={styles.actionBtn}>
                Spremi
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Obriši unos"
        message="Jesi li siguran da želiš obrisati ovaj unos?"
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
  list: {
    paddingBottom: 100,
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    borderRadius: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vehicleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  entryContent: {
    flex: 1,
    gap: 2,
  },
  entryMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteBtn: {
    margin: 0,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  sheetTitle: {
    fontWeight: 'bold',
  },
  vehicleSelector: {},
  field: {
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    paddingBottom: 16,
  },
  actionBtn: {
    flex: 1,
  },
});
