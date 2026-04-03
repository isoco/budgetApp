import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Card, Switch, Button, TextInput, Divider, List
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { exportData, importData } from '../../utils/exportImport';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { getDatabase } from '../../database';

export default function SettingsScreen() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const C = useThemeColors();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportData();
    } catch (e) {
      Alert.alert('Greška', 'Izvoz nije uspio: ' + String(e));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setImporting(true);
      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await importData(content);
      Alert.alert('Uspjeh', 'Podaci su uspješno uvezeni!');
    } catch (e) {
      Alert.alert('Greška', 'Uvoz nije uspio: ' + String(e));
    } finally {
      setImporting(false);
    }
  };

  const handleResetAll = async () => {
    try {
      const db = getDatabase();
      await db.runAsync('DELETE FROM budget_entries');
      await db.runAsync('DELETE FROM daily_tracking');
      await db.runAsync('DELETE FROM fuel_entries');
      await db.runAsync('DELETE FROM monthly_summary');
      await resetSettings();
      Alert.alert('Uspjeh', 'Svi podaci su obrisani.');
    } catch (e) {
      Alert.alert('Greška', String(e));
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      {/* Appearance */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title title="Izgled" />
        <Card.Content style={styles.cardContent}>
          <View style={styles.settingRow}>
            <Text variant="bodyMedium">Tamni način</Text>
            <Switch
              value={settings.dark_mode}
              onValueChange={(v) => updateSettings({ dark_mode: v })}
              color={Colors.primary}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Defaults */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title title="Zadane vrijednosti" />
        <Card.Content style={styles.cardContent}>
          <TextInput
            label="Dnevna allowance (€)"
            value={String(settings.daily_default_amount)}
            onChangeText={(v) =>
              updateSettings({ daily_default_amount: parseFloat(v) || 4 })
            }
            keyboardType="decimal-pad"
            mode="outlined"
            style={[styles.field, { backgroundColor: C.surface }]}
          />
          <TextInput
            label="Mjesečna procjena goriva (€)"
            value={String(settings.fuel_monthly_estimate)}
            onChangeText={(v) =>
              updateSettings({ fuel_monthly_estimate: parseFloat(v) || 30 })
            }
            keyboardType="decimal-pad"
            mode="outlined"
            style={[styles.field, { backgroundColor: C.surface }]}
          />
        </Card.Content>
      </Card>

      {/* Data */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title title="Podaci" />
        <Card.Content style={styles.cardContent}>
          <Button
            mode="outlined"
            icon="export"
            onPress={handleExport}
            loading={exporting}
            style={styles.dataBtn}
          >
            Izvezi podatke (JSON)
          </Button>

          <Button
            mode="outlined"
            icon="import"
            onPress={handleImport}
            loading={importing}
            style={styles.dataBtn}
          >
            Uvezi podatke (JSON)
          </Button>

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            icon="delete-forever"
            onPress={() => setShowResetDialog(true)}
            textColor={Colors.expense}
            style={[styles.dataBtn, styles.dangerBtn]}
          >
            Obriši sve podatke
          </Button>
        </Card.Content>
      </Card>

      {/* About */}
      <Card style={[styles.card, { backgroundColor: C.surface }]} elevation={1}>
        <Card.Title title="O aplikaciji" />
        <Card.Content>
          <List.Item
            title="Ivan Budget"
            description="Osobni proračun — v1.0.0"
            left={() => (
              <MaterialCommunityIcons
                name="piggy-bank"
                size={32}
                color={Colors.primary}
                style={{ marginRight: 8 }}
              />
            )}
          />
          <Text variant="bodySmall" style={styles.about}>
            Aplikacija za praćenje osobnih financija. Radi potpuno offline.
            Svi podaci pohranjeni su lokalno na uređaju. Valuta: EUR (€).
          </Text>
        </Card.Content>
      </Card>

      <ConfirmDialog
        visible={showResetDialog}
        title="Obriši sve podatke"
        message="Ovo će trajno obrisati sve prihode, troškove, gorivo i dnevne unose. Kategorije ostaju. Nastavi?"
        confirmLabel="Obriši sve"
        onConfirm={() => {
          setShowResetDialog(false);
          handleResetAll();
        }}
        onDismiss={() => setShowResetDialog(false)}
        destructive
      />
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
  card: {},
  cardContent: {
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  field: {},
  dataBtn: {
    borderColor: Colors.border,
  },
  dangerBtn: {
    borderColor: Colors.expense,
  },
  divider: {
    marginVertical: 4,
  },
  about: {
    color: Colors.unpaid,
    paddingTop: 4,
    lineHeight: 18,
  },
});
