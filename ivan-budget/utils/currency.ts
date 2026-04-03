export function formatAmount(amount: number, _currency?: string): string {
  return `${amount.toFixed(2)} €`;
}

export function formatAmountShort(amount: number, _currency?: string): string {
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}k €`;
  }
  return `${amount.toFixed(0)} €`;
}
