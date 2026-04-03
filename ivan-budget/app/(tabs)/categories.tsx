import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Modal } from 'react-native';
import {
  Text, FAB, SegmentedButtons, IconButton, Button,
  TextInput, Surface, Switch
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCategoryStore } from '../../stores/useCategoryStore';
import { Category, CategoryType } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';

const TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Prihodi',
  expense: 'Troškovi',
  savings: 'Štednja',
};

const TYPE_COLORS: Record<CategoryType, string> = {
  income: Colors.income,
  expense: Colors.expense,
  savings: Colors.savings,
};

const COMMON_ICONS = [
  'cash', 'home', 'car', 'food', 'medical-bag', 'school', 'shopping',
  'bank', 'credit-card', 'gas-station', 'lightning-bolt', 'phone',
  'web', 'shield', 'piggy-bank', 'beach', 'tennis', 'receipt',
  'tag', 'star', 'heart', 'briefcase', 'tools', 'ticket',
];

export default function CategoriesScreen() {
  const C = useThemeColors();
  const { categories, loading, fetchCategories, addCategory, editCategory, deactivate, remove } =
    useCategoryStore();

  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  // Form state
  const [nameHR, setNameHR] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cash');
  const [selectedColor, setSelectedColor] = useState('#1565C0');
  const [isRecurring, setIsRecurring] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCats = categories.filter((c) => c.type === activeTab);

  const resetForm = () => {
    setNameHR('');
    setSelectedIcon('cash');
    setSelectedColor(TYPE_COLORS[activeTab]);
    setIsRecurring(false);
    setDefaultAmount('');
    setDueDay('');
    setEditCat(null);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setNameHR(cat.name_hr);
    setSelectedIcon(cat.icon);
    setSelectedColor(cat.color);
    setIsRecurring(cat.is_recurring === 1);
    setDefaultAmount(cat.default_amount > 0 ? String(cat.default_amount) : '');
    setDueDay(cat.due_day ? String(cat.due_day) : '');
    setShowAddModal(true);
  };

  const handleSave = useCallback(async () => {
    if (!nameHR.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: nameHR.trim().toLowerCase().replace(/\s+/g, '_'),
        name_hr: nameHR.trim(),
        type: activeTab,
        icon: selectedIcon,
        color: selectedColor,
        is_recurring: isRecurring ? 1 : 0,
        default_amount: parseFloat(defaultAmount) || 0,
        due_day: dueDay ? parseInt(dueDay) : null,
        is_active: 1,
        is_system: 0,
      };

      if (editCat) {
        await editCategory(editCat.id, data);
      } else {
        await addCategory(data);
      }
      setShowAddModal(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }, [nameHR, activeTab, selectedIcon, selectedColor, isRecurring, defaultAmount, dueDay, editCat]);

  const renderCategory = useCallback(({ item }: { item: Category }) => (
    <View style={[styles.catRow, { borderBottomColor: C.border }, item.is_active === 0 && styles.inactiveRow]}>
      <View style={[styles.catIcon, { backgroundColor: item.color + '20' }]}>
        <MaterialCommunityIcons name={(item.icon ?? 'cash') as never} size={22} color={item.color} />
      </View>
      <View style={styles.catContent}>
        <View style={styles.catHeader}>
          <Text variant="bodyMedium" style={[styles.catName, { color: C.onSurface }, item.is_active === 0 && { color: C.unpaid }]}>
            {item.name_hr}
          </Text>
          {item.is_system === 1 && (
            <View style={[styles.badge, { backgroundColor: Colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: Colors.primary }]}>Sustav</Text>
            </View>
          )}
          {item.is_recurring === 1 && (
            <View style={[styles.badge, { backgroundColor: Colors.savings + '20' }]}>
              <Text style={[styles.badgeText, { color: Colors.savings }]}>Ponavljajuće</Text>
            </View>
          )}
          {item.is_active === 0 && (
            <View style={[styles.badge, { backgroundColor: C.unpaid + '30' }]}>
              <Text style={[styles.badgeText, { color: C.unpaid }]}>Neaktivno</Text>
            </View>
          )}
        </View>
        {item.default_amount > 0 && (
          <Text variant="labelSmall" style={[styles.catMeta, { color: C.unpaid }]}>
            Zadano: {item.default_amount.toFixed(2)} €
            {item.due_day ? ` · Dospijeće: ${item.due_day}.` : ''}
          </Text>
        )}
      </View>
      <View style={styles.catActions}>
        <IconButton
          icon="pencil"
          size={18}
          iconColor={Colors.primary}
          onPress={() => openEdit(item)}
          style={styles.actionBtn}
          containerColor="transparent"
        />
        {item.is_system === 1 ? (
          <IconButton
            icon={item.is_active === 1 ? 'eye-off' : 'eye'}
            size={18}
            iconColor={Colors.warning}
            onPress={() => setDeactivateTarget(item)}
            style={styles.actionBtn}
            containerColor="transparent"
          />
        ) : (
          <IconButton
            icon="delete-outline"
            size={18}
            iconColor={Colors.expense}
            onPress={() => setDeleteTarget(item)}
            style={styles.actionBtn}
            containerColor="transparent"
          />
        )}
      </View>
    </View>
  ), [C]);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CategoryType)}
        buttons={[
          { value: 'income', label: 'Prihodi' },
          { value: 'expense', label: 'Troškovi' },
          { value: 'savings', label: 'Štednja' },
        ]}
        style={styles.tabs}
      />

      <FlatList
        data={filteredCats}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCategory}
        ListEmptyComponent={
          <EmptyState
            icon="tag-outline"
            title="Nema kategorija"
            subtitle="Dodaj novu kategoriju tipkanjem +"
          />
        }
        contentContainerStyle={[styles.list, { backgroundColor: C.surface }]}
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

      {/* Add/Edit modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={styles.overlay}>
          <Surface style={[styles.sheet, { backgroundColor: C.surface }]} elevation={4}>
            <Text variant="titleLarge" style={styles.sheetTitle}>
              {editCat ? 'Uredi kategoriju' : 'Nova kategorija'}
            </Text>

            <TextInput
              label="Naziv (HR)"
              value={nameHR}
              onChangeText={setNameHR}
              mode="outlined"
              style={[styles.field, { backgroundColor: C.surface }]}
            />

            <Text variant="labelMedium" style={[styles.label, { color: C.onSurface }]}>Ikona</Text>
            <View style={styles.iconGrid}>
              {COMMON_ICONS.map((icon) => (
                <IconButton
                  key={icon}
                  icon={icon}
                  size={20}
                  iconColor={selectedIcon === icon ? Colors.primary : C.unpaid}
                  style={[
                    styles.iconBtn,
                    { borderColor: C.border },
                    selectedIcon === icon && styles.selectedIconBtn,
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                  containerColor="transparent"
                />
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text variant="bodyMedium">Ponavljajuće</Text>
              <Switch value={isRecurring} onValueChange={setIsRecurring} color={Colors.primary} />
            </View>

            <View style={styles.row}>
              <TextInput
                label="Zadani iznos (€)"
                value={defaultAmount}
                onChangeText={setDefaultAmount}
                keyboardType="decimal-pad"
                mode="outlined"
                style={[styles.field, styles.halfField, { backgroundColor: C.surface }]}
              />
              <TextInput
                label="Dan dospijeća (1-31)"
                value={dueDay}
                onChangeText={setDueDay}
                keyboardType="number-pad"
                mode="outlined"
                style={[styles.field, styles.halfField, { backgroundColor: C.surface }]}
              />
            </View>

            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                style={styles.actionBtnLg}
              >
                Odustani
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                style={styles.actionBtnLg}
                disabled={!nameHR.trim()}
              >
                Spremi
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!deactivateTarget}
        title={deactivateTarget?.is_active === 1 ? 'Deaktiviraj kategoriju' : 'Aktiviraj kategoriju'}
        message={
          deactivateTarget?.is_active === 1
            ? `Ova sistemska kategorija ne može se brisati. Deaktivirati "${deactivateTarget?.name_hr}"?`
            : `Aktivirati "${deactivateTarget?.name_hr}"?`
        }
        confirmLabel={deactivateTarget?.is_active === 1 ? 'Deaktiviraj' : 'Aktiviraj'}
        onConfirm={async () => {
          if (deactivateTarget) {
            if (deactivateTarget.is_active === 1) {
              await deactivate(deactivateTarget.id);
            } else {
              await editCategory(deactivateTarget.id, { is_active: 1 });
            }
            setDeactivateTarget(null);
          }
        }}
        onDismiss={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Obriši kategoriju"
        message={`Jesi li siguran da želiš obrisati "${deleteTarget?.name_hr}"? Sve stavke u ovoj kategoriji bit će obrisane.`}
        confirmLabel="Obriši"
        onConfirm={async () => {
          if (deleteTarget) {
            await remove(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
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
  tabs: {
    margin: 12,
  },
  list: {
    marginHorizontal: 12,
    borderRadius: 8,
    paddingBottom: 100,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  inactiveRow: {
    opacity: 0.5,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catContent: {
    flex: 1,
    gap: 2,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  catName: {
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  catMeta: {},
  catActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    margin: 0,
    width: 32,
    height: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: Colors.primary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    maxHeight: '85%',
  },
  sheetTitle: {
    fontWeight: 'bold',
  },
  field: {},
  label: {},
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  iconBtn: {
    margin: 0,
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedIconBtn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    paddingBottom: 16,
  },
  actionBtnLg: {
    flex: 1,
  },
});
