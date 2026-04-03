import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons, Surface, Switch } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BudgetEntry, Category, CategoryType } from '../../types';
import { Colors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getActiveCategories } from '../../database/queries/categories';
import { updateCategory } from '../../database/queries/categories';
import { AmountInput } from '../common/AmountInput';
import { isoNow } from '../../utils/dateHelpers';

const schema = z.object({
  category_id: z.number().min(1, 'Odaberi kategoriju'),
  planned_amount: z.string().min(1),
  actual_amount: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddEntrySheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (
    data: Omit<BudgetEntry, 'id' | 'created_at' | 'category_name' | 'category_name_hr' | 'category_icon' | 'category_color' | 'category_type'>
  ) => Promise<void>;
  year: number;
  month: number;
  editEntry?: BudgetEntry | null;
}

export function AddEntrySheet({
  visible,
  onDismiss,
  onSave,
  year,
  month,
  editEntry,
}: AddEntrySheetProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedType, setSelectedType] = useState<CategoryType>('expense');
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const { settings } = useSettingsStore();
  const C = useThemeColors();

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category_id: 0,
      planned_amount: '0',
      actual_amount: '0',
      notes: '',
    },
  });

  const selectedCatId = watch('category_id');

  useEffect(() => {
    if (visible) {
      getActiveCategories(selectedType).then(setCategories);
    }
  }, [visible, selectedType]);

  useEffect(() => {
    if (editEntry) {
      setValue('category_id', editEntry.category_id);
      setValue('planned_amount', String(editEntry.planned_amount));
      setValue('actual_amount', String(editEntry.actual_amount));
      setValue('notes', editEntry.notes ?? '');
      setSelectedType((editEntry.category_type as CategoryType) ?? 'expense');
      setIsRecurring((editEntry.category_is_recurring ?? 0) === 1);
    } else {
      reset();
      setIsRecurring(false);
    }
  }, [editEntry, visible]);

  // When a category is selected, auto-set isRecurring from that category
  useEffect(() => {
    if (selectedCatId > 0) {
      const cat = categories.find((c) => c.id === selectedCatId);
      if (cat) {
        setIsRecurring(cat.is_recurring === 1);
      }
    }
  }, [selectedCatId, categories]);

  const filteredCats = categories.filter((c) => c.type === selectedType);

  const selectedCat = categories.find((c) => c.id === selectedCatId);
  const isOstalo = selectedCat?.name === 'other_income' || selectedCat?.name === 'other_expense';

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const selectedCat = categories.find((c) => c.id === data.category_id);
      let dueDate: string | null = null;
      if (selectedCat?.due_day) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const day = Math.min(selectedCat.due_day, daysInMonth);
        dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      await onSave({
        category_id: data.category_id,
        year,
        month,
        planned_amount: parseFloat(data.planned_amount) || 0,
        actual_amount: parseFloat(data.actual_amount) || 0,
        due_date: editEntry?.due_date ?? dueDate,
        paid_date: editEntry?.paid_date ?? null,
        notes: data.notes || null,
      });

      // Update category recurring flag if changed
      if (selectedCat && isRecurring !== (selectedCat.is_recurring === 1)) {
        await updateCategory(data.category_id, {
          is_recurring: isRecurring ? 1 : 0,
          default_amount: parseFloat(data.planned_amount) || 0,
        });
      }

      onDismiss();
      reset();
      setIsRecurring(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.sheet, { backgroundColor: C.surface }]} elevation={4}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="titleLarge">
              {editEntry ? 'Uredi stavku' : 'Nova stavka'}
            </Text>
            <TouchableOpacity onPress={onDismiss}>
              <MaterialCommunityIcons name="close" size={24} color={C.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {!editEntry && (
              <SegmentedButtons
                value={selectedType}
                onValueChange={(v) => {
                  setSelectedType(v as CategoryType);
                  setValue('category_id', 0);
                }}
                buttons={[
                  { value: 'income', label: 'Prihod' },
                  { value: 'expense', label: 'Trošak' },
                  { value: 'savings', label: 'Štednja' },
                ]}
                style={styles.segment}
              />
            )}

            <Text variant="labelLarge" style={[styles.sectionLabel, { color: C.onSurface }]}>Kategorija</Text>
            <View style={styles.categoryGrid}>
              {filteredCats.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { borderColor: C.border, backgroundColor: C.background },
                    selectedCatId === cat.id && { backgroundColor: cat.color + '30', borderColor: cat.color },
                  ]}
                  onPress={() => {
                    setValue('category_id', cat.id);
                    if (cat.default_amount > 0) {
                      setValue('planned_amount', String(cat.default_amount));
                      setValue('actual_amount', String(cat.default_amount));
                    }
                  }}
                >
                  <MaterialCommunityIcons
                    name={(cat.icon ?? 'cash') as never}
                    size={18}
                    color={cat.color}
                  />
                  <Text variant="labelSmall" style={{ color: cat.color, marginTop: 2 }} numberOfLines={1}>
                    {cat.name_hr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category_id && (
              <Text style={styles.error}>Odaberi kategoriju</Text>
            )}

            {selectedCatId > 0 && (
              <View style={styles.switchRow}>
                <Text variant="bodyMedium">Ponavljaj svaki mjesec</Text>
                <Switch value={isRecurring} onValueChange={setIsRecurring} color={Colors.primary} />
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Controller
                  control={control}
                  name="planned_amount"
                  render={({ field: { onChange, value } }) => (
                    <AmountInput
                      label="Planirano"
                      value={value}
                      onChangeText={onChange}
                      currency="€"
                    />
                  )}
                />
              </View>
              <View style={styles.halfField}>
                <Controller
                  control={control}
                  name="actual_amount"
                  render={({ field: { onChange, value } }) => (
                    <AmountInput
                      label="Stvarno"
                      value={value}
                      onChangeText={onChange}
                      currency="€"
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label={isOstalo ? 'Naziv (npr. Poklon, Hotel...)' : 'Napomene (opcionalno)'}
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  multiline={!isOstalo}
                  numberOfLines={isOstalo ? 1 : 2}
                  style={[styles.field, { backgroundColor: C.surface }]}
                />
              )}
            />

            <View style={styles.actions}>
              <Button mode="outlined" onPress={onDismiss} style={styles.actionBtn}>
                Odustani
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={saving}
                style={styles.actionBtn}
              >
                Spremi
              </Button>
            </View>
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  segment: {
    marginBottom: 4,
  },
  sectionLabel: {},
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    width: 80,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  field: {},
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingBottom: 16,
  },
  actionBtn: {
    flex: 1,
  },
  error: {
    color: Colors.expense,
    fontSize: 12,
  },
});
