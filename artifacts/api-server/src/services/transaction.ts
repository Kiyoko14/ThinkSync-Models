import { randomUUID } from "crypto";

export interface Transaction {
  id: string;
  profile_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  status: string;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

const transactions = new Map<string, Transaction>();

export function createTransaction(t: Omit<Transaction, "id" | "created_at"> & { id?: string }): Transaction {
  const now = new Date().toISOString();
  const tx: Transaction = {
    id: t.id || randomUUID(),
    profile_id: t.profile_id,
    amount: t.amount,
    balance_after: t.balance_after,
    transaction_type: t.transaction_type,
    status: t.status,
    description: t.description,
    reference_type: t.reference_type,
    reference_id: t.reference_id,
    created_at: now,
  };
  transactions.set(tx.id, tx);
  return tx;
}

export function getTransactionById(id: string): Transaction | undefined {
  return transactions.get(id);
}

export function listTransactions(): Transaction[] {
  return [...transactions.values()];
}

export function clearTransactions(): void {
  transactions.clear();
}
