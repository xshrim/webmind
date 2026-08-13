import { describe, expect, it } from "vitest";
import {
  createTodo,
  filterTodos,
  normalizeTodos,
  todoTitleFromText,
  updateTodo
} from "./todos";

describe("todos", () => {
  it("cleans the body and derives the title from its first line", () => {
    expect(todoTitleFromText("  First line\nsecond line  ")).toBe("First line");
    const todo = createTodo({
      content: "\n\n  First line  \nSecond line\n\n  "
    });
    expect(todo.content).toBe("First line  \nSecond line");
    expect(todo.title).toBe("First line");
  });

  it("normalizes duplicate records and keeps the newest record", () => {
    const todos = normalizeTodos([
      { id: "same", content: "old", updatedAt: 1 },
      { id: "same", content: "new", updatedAt: 2 },
      { id: "other", content: "other", status: "completed", updatedAt: 3 }
    ]);
    expect(todos).toHaveLength(2);
    expect(todos[0].title).toBe("new");
    expect(todos[1].status).toBe("completed");
  });

  it("always derives the title from content", () => {
    const [todo] = normalizeTodos([
      { id: "normalized", content: "Normalized body" }
    ]);

    expect(todo.content).toBe("Normalized body");
    expect(todo.title).toBe("Normalized body");
  });

  it("keeps derived titles compact for the todo row", () => {
    const title = "A".repeat(100);
    expect(createTodo({ content: title }).title).toHaveLength(80);
  });

  it("does not retain records without content", () => {
    expect(normalizeTodos([{ id: "legacy", title: "Old format" }])).toEqual([]);
    expect(() => createTodo({ content: "  \n  " })).toThrow("Todo content is required");
  });

  it("updates the derived title when the body changes", () => {
    const todo = createTodo({ content: "Old title\nBody" });
    const updated = updateTodo(todo, { content: "\n\nNew title\nUpdated body\n" });

    expect(updated.content).toBe("New title\nUpdated body");
    expect(updated.title).toBe("New title");
  });

  it("updates completion state and supports filtering and searching", () => {
    const open = createTodo({ content: "Read article\nResearch" });
    const completed = updateTodo(open, { status: "completed" });
    expect(completed.completedAt).toBeTypeOf("number");
    expect(filterTodos([completed], "open")).toEqual([]);
    expect(filterTodos([completed], "completed", "research")).toHaveLength(1);
    expect(updateTodo(completed, { status: "open" }).completedAt).toBeUndefined();
  });

  it("keeps the in-progress flag independent from completion", () => {
    const open = createTodo({ content: "Read article\nResearch" });
    expect(open.inProgress).toBe(false);

    const active = updateTodo(open, { inProgress: true });
    expect(active.inProgress).toBe(true);

    const completed = updateTodo(active, { status: "completed" });
    expect(completed.inProgress).toBe(true);
    expect(updateTodo(completed, { status: "open" }).inProgress).toBe(true);
  });

  it("sorts in-progress, open, and completed todos by priority then update time", () => {
    const todos = normalizeTodos([
      { id: "open-old", content: "Open old", updatedAt: 10 },
      { id: "completed-new", content: "Completed new", status: "completed", updatedAt: 99 },
      { id: "active-old", content: "Active old", inProgress: true, updatedAt: 20 },
      { id: "open-new", content: "Open new", updatedAt: 30 },
      { id: "active-new", content: "Active new", inProgress: true, updatedAt: 40 },
      { id: "completed-old", content: "Completed old", status: "completed", updatedAt: 5 }
    ]);

    expect(todos.map((todo) => todo.id)).toEqual([
      "active-new",
      "active-old",
      "open-new",
      "open-old",
      "completed-new",
      "completed-old"
    ]);
  });
});
