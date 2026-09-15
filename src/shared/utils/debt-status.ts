export type DebtStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";

export function computeDebtStatus(total: number, paid: number, dueDate: Date | null): DebtStatus {
  if (paid >= total && total > 0) return "PAID";
  if (paid > 0 && paid < total) {
    if (dueDate && dueDate < new Date()) return "OVERDUE";
    return "PARTIAL";
  }
  if (paid === 0) {
    if (dueDate && dueDate < new Date()) return "OVERDUE";
    return "UNPAID";
  }
  return "UNPAID";
}
