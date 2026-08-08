import i18n from "@/i18n";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const body = await res.json();

  if (!res.ok) {
    const key = body.error || "errors.unknown";
    const translated = i18n.t(key);
    return { error: translated !== key ? translated : key };
  }

  return { data: body as T };
}

export interface User {
  id: string;
  email: string;
  status?: string;
}

export type TransactionType = "income" | "expense" | "transfer";

export type RecurrenceType = "installment" | "recurring";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  dueDate: string;
  type: TransactionType;
  isPaid: boolean;
  accountId: string;
  categoryId: string;
  recurrenceId: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  notes: string | null;
  reminderDate: string | null;
  accountName?: string;
  categoryName?: string;
  categoryColor?: string;
  attachmentCount?: number;
}

export interface TransactionSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface TransactionListResponse {
  summary: TransactionSummary;
  items: Transaction[];
  pagination: Pagination;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  color: string;
  currency: string;
  initialBalance?: number;
}

export interface AccountBalance {
  id: string;
  name: string;
  color: string;
  type: string;
  currentBalance: number;
}

export interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
}

export interface CreateTransactionData {
  description: string;
  amount: number;
  date: string;
  dueDate: string;
  type: TransactionType;
  accountId: string;
  categoryId: string;
  notes?: string;
  reminderDate?: string;
  isPaid?: boolean;
  recurrence?: {
    type: RecurrenceType;
    totalInstallments: number;
  };
}

export interface UpdateTransactionData {
  description?: string;
  amount?: number;
  date?: string;
  dueDate?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  notes?: string;
  reminderDate?: string | null;
  isPaid?: boolean;
  scope?: "single" | "future";
}

export interface Attachment {
  id: string;
  transactionId: string;
  fileName: string;
  contentType: string;
  size: number;
  status: "pending" | "confirmed";
}

export interface TransactionFilters {
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType | "";
}

export const api = {
  register(email: string, password: string, turnstileToken?: string) {
    return request<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, turnstileToken }),
    });
  },

  login(email: string, password: string, turnstileToken?: string) {
    return request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, turnstileToken }),
    });
  },

  logout() {
    return request<{ message: string }>("/auth/logout", { method: "POST" });
  },

  me() {
    return request<{ user: User }>("/auth/me");
  },

  getTransactions(month: number, year: number, page?: number, limit?: number, filters?: TransactionFilters) {
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
      page: String(page || 1),
      limit: String(limit || 50),
    });
    if (filters?.search) params.set("search", filters.search);
    if (filters?.accountId) params.set("accountId", filters.accountId);
    if (filters?.categoryId) params.set("categoryId", filters.categoryId);
    if (filters?.type) params.set("type", filters.type);
    return request<TransactionListResponse>(`/transactions?${params.toString()}`);
  },

  createTransaction(data: CreateTransactionData) {
    return request<{ transaction: Transaction; createdCount: number }>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateTransaction(id: string, data: UpdateTransactionData) {
    return request<{ updatedCount: number | string; scope: string }>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteTransaction(id: string, scope: "single" | "future" = "single") {
    return request<{ deletedCount: number | string; scope: string }>(
      `/transactions/${id}?scope=${scope}`,
      { method: "DELETE" }
    );
  },

  togglePaid(id: string) {
    return request<{ isPaid: boolean }>(`/transactions/${id}/toggle-paid`, {
      method: "PATCH",
    });
  },

  getAccounts() {
    return request<{ items: Account[] }>("/accounts");
  },

  getAccountBalances() {
    return request<{ items: AccountBalance[] }>("/accounts/balances");
  },

  getCategories() {
    return request<{ items: Category[] }>("/categories");
  },

  createAccount(data: { name: string; type: string; initialBalance?: number; color?: string }) {
    return request<{ account: Account }>("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateAccount(id: string, data: { name?: string; type?: string; initialBalance?: number; color?: string }) {
    return request<{ account: Account }>(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteAccount(id: string) {
    return request<{ success: boolean }>(`/accounts/${id}`, {
      method: "DELETE",
    });
  },

  createCategory(data: { name: string; type: string; color?: string; icon?: string }) {
    return request<{ category: Category }>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCategory(id: string, data: { name?: string; color?: string; icon?: string }) {
    return request<{ category: Category }>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteCategory(id: string) {
    return request<{ success: boolean }>(`/categories/${id}`, {
      method: "DELETE",
    });
  },

  presignAttachment(transactionId: string, fileName: string, contentType: string, size: number) {
    return request<{ attachmentId: string; uploadUrl: string; fileKey: string }>(
      `/attachments/${transactionId}/presign`,
      {
        method: "POST",
        body: JSON.stringify({ fileName, contentType, size }),
      }
    );
  },

  confirmAttachment(attachmentId: string) {
    return request<{ attachment: Attachment }>(`/attachments/${attachmentId}/confirm`, {
      method: "POST",
    });
  },

  listAttachments(transactionId: string) {
    return request<{ items: Attachment[] }>(`/attachments/list/${transactionId}`);
  },

  deleteAttachment(attachmentId: string) {
    return request<{ deleted: boolean }>(`/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  },

  getAttachmentDownloadUrl(attachmentId: string) {
    return request<{ downloadUrl: string; fileName: string; contentType: string }>(
      `/attachments/${attachmentId}/download`
    );
  },

  uploadAttachment(transactionId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ attachment: Attachment }>(`/attachments/${transactionId}/upload`, {
      method: "POST",
      body: formData,
    });
  },

  sendTestEmail() {
    return request<{ success: boolean; message: string; details?: string }>("/email/test", {
      method: "POST",
    });
  },

  forgotPassword(email: string) {
    return request<{ success: boolean; message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, password: string) {
    return request<{ success: boolean; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },
};