import React from 'react';
import { TextInput } from 'react-native-paper';

interface AmountInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  currency?: string;
  error?: boolean;
  helperText?: string;
}

export function AmountInput({
  label,
  value,
  onChangeText,
  currency = '€',
  error,
}: AmountInputProps) {
  const handleChange = (text: string) => {
    // Allow digits and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    onChangeText(cleaned);
  };

  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={handleChange}
      keyboardType="decimal-pad"
      right={<TextInput.Affix text={currency} />}
      error={error}
      mode="outlined"
    />
  );
}
