// convert rupees to paise
export function convertToPaise(amount: number): number {
    return Math.round(amount * 100);
}

// convert paise back to rupees when displaying
export function convertToRupees(amount: number): number {
    return amount / 100;
}

export function formatCurrency(
  amount: number,
  locale = "en-IN",
  currency = "INR"
): string {
  // defensively handle undefined/null
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}