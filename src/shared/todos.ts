import type {
  CreateTodoInput,
  TodoItem,
  TodoSource,
  TodoStatus,
  UpdateTodoInput
} from "./types";

type StoredTodoRecord = Partial<TodoItem>;

const MAX_CONTENT_LENGTH = 20_000;
const MAX_TITLE_LENGTH = 80;
const MAX_URL_LENGTH = 4_000;
const MAX_PAGE_TITLE_LENGTH = 500;
const MAX_SELECTED_TEXT_LENGTH = 20_000;

function text(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function validTimestamp(value: unknown, fallback: number): number {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback;
}

function normalizeSource(source: unknown): TodoSource | undefined {
  if (!source || typeof source !== "object") return undefined;
  const value = source as Partial<TodoSource>;
  const kind: TodoSource["kind"] =
    value.kind === "selection" || value.kind === "answer" ? value.kind : "manual";
  const normalized: TodoSource = {
    kind,
    url: text(value.url, MAX_URL_LENGTH),
    pageTitle: text(value.pageTitle, MAX_PAGE_TITLE_LENGTH),
    selectedText: text(value.selectedText, MAX_SELECTED_TEXT_LENGTH)
  };
  if (!normalized.url && !normalized.pageTitle && !normalized.selectedText) {
    return { kind };
  }
  return normalized;
}

export function todoTitleFromText(value: string): string {
  const normalized = value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .find(Boolean) ?? "";
  if (!normalized) return "";
  return normalized.slice(0, MAX_TITLE_LENGTH);
}

export function normalizeTodo(input: StoredTodoRecord): TodoItem {
  const now = Date.now();
  const status: TodoStatus = input.status === "completed" ? "completed" : "open";
  const content = text(input.content, MAX_CONTENT_LENGTH);
  if (!content) throw new Error("Todo content is required");
  const title = todoTitleFromText(content);
  const normalized: TodoItem = {
    id: text(input.id, 120) || crypto.randomUUID(),
    title,
    content,
    status,
    inProgress: input.inProgress === true,
    source: normalizeSource(input.source),
    createdAt: validTimestamp(input.createdAt, now),
    updatedAt: validTimestamp(input.updatedAt, now)
  };
  if (status === "completed") {
    normalized.completedAt = validTimestamp(input.completedAt, normalized.updatedAt);
  }
  return normalized;
}

export function createTodo(input: CreateTodoInput): TodoItem {
  const now = Date.now();
  return normalizeTodo({
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  });
}

export function updateTodo(item: TodoItem, patch: UpdateTodoInput): TodoItem {
  const nextStatus: TodoStatus = patch.status === "completed" ? "completed" :
    patch.status === "open" ? "open" : item.status;
  const updated = normalizeTodo({
    ...item,
    ...patch,
    status: nextStatus,
    updatedAt: Date.now(),
    completedAt:
      nextStatus === "completed"
        ? item.completedAt || Date.now()
        : undefined
  });
  return updated;
}

export function normalizeTodos(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, TodoItem>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as StoredTodoRecord;
    if (typeof record.content !== "string" || !record.content.trim()) continue;
    const normalized = normalizeTodo(record);
    const existing = byId.get(normalized.id);
    if (!existing || normalized.updatedAt >= existing.updatedAt) {
      byId.set(normalized.id, normalized);
    }
  }
  return sortTodos(Array.from(byId.values()));
}

export function sortTodos(items: TodoItem[]): TodoItem[] {
  return [...items].sort((left, right) => {
    const leftRank =
      left.status === "completed" ? 2 : left.inProgress ? 0 : 1;
    const rightRank =
      right.status === "completed" ? 2 : right.inProgress ? 0 : 1;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return right.updatedAt - left.updatedAt;
  });
}

export function filterTodos(
  items: TodoItem[],
  filter: "all" | TodoStatus,
  query = ""
): TodoItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return sortTodos(items).filter((item) => {
    if (filter !== "all" && item.status !== filter) return false;
    if (!normalizedQuery) return true;
    return `${item.title}\n${item.content}\n${item.source?.pageTitle ?? ""}`
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}
