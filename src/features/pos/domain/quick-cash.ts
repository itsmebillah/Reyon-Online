export function generateQuickCashPresets(payable: number): number[] {
  const exact = Math.max(0, Math.round(payable));
  if (!exact) return [0];
  const candidates =
    exact <= 500
      ? [50, 100, 500, 1000]
      : exact <= 2000
        ? [Math.ceil(exact / 100) * 100, Math.ceil(exact / 500) * 500, 2000]
        : exact <= 10000
          ? [
              Math.ceil(exact / 500) * 500,
              Math.ceil(exact / 1000) * 1000,
              10000,
            ]
          : [
              Math.ceil(exact / 1000) * 1000,
              Math.ceil(exact / 5000) * 5000,
              Math.ceil(exact / 10000) * 10000,
            ];
  return [
    exact,
    ...new Set(candidates.filter((amount) => amount > exact)),
  ].slice(0, 4);
}

export function calculatePaymentSummary(payable: number, paid: number) {
  const cleanPayable = Math.max(0, Number(payable) || 0);
  const cleanPaid = Math.max(0, Number(paid) || 0);
  return {
    payable: cleanPayable,
    paid: cleanPaid,
    change: Math.round(Math.max(0, cleanPaid - cleanPayable) * 100) / 100,
    due: Math.round(Math.max(0, cleanPayable - cleanPaid) * 100) / 100,
  };
}
