// web/src/types/database.ts
export type AccountType = 'checking' | 'savings' | 'credit' | 'cash'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly'
export type ImportFormat = 'csv' | 'ofx'
export type ImportStatus = 'pending' | 'done' | 'failed'
export type MessageRole = 'user' | 'assistant'

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: string
  created_at: string
}

export interface AccountBalance extends Account {
  balance: number
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string | null
  icon: string | null
  parent_id: string | null
}

export interface Transaction {
  id: string
  date: string
  amount: number
  description: string
  type: TransactionType
  account_id: string
  to_account_id: string | null
  category_id: string | null
  import_id: string | null
  notes: string | null
  created_at: string
  // joined
  categories?: { name: string } | null
  accounts?: { name: string } | null
}

export interface Budget {
  id: string
  category_id: string
  amount: number
  period: BudgetPeriod
  anchor_date: string
  active: boolean
  categories?: { name: string; color: string | null } | null
}

export interface Import {
  id: string
  filename: string
  format: ImportFormat
  imported_at: string
  row_count: number | null
  status: ImportStatus
  error_message: string | null
}

export interface AIConversation {
  id: string
  title: string | null
  created_at: string
}

export interface AIMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  created_at: string
}

export interface ParsedTransaction {
  row_id: number
  date: string
  amount: number
  description: string
  type: TransactionType
  suggested_category?: string
  category_id?: string
  is_duplicate?: boolean
}
