import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'inbox-outline', title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as never} size={64} color={Colors.border} />
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {subtitle && <Text variant="bodyMedium" style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  title: {
    color: Colors.unpaid,
    marginTop: 8,
  },
  subtitle: {
    color: Colors.unpaid,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
