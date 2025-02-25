import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DatabaseError } from "pg";

// Define constants for test UUIDs
const TEST_USER_ID = "00000000-0000-0000-0000-000000000000";
const TEST_COURSE_ID = "00000000-0000-0000-0000-000000000001";
const TEST_SESSION_ID = "00000000-0000-0000-0000-000000000002";
const TEST_DUPLICATE_SESSION_ID = "00000000-0000-0000-0000-000000000003";
const TEST_NONEXISTENT_ID = "00000000-0000-0000-0000-000000000999";

// Helper function to create a mock database error
const createDatabaseError = (code: string, constraint: string) => {
  const error = new DatabaseError("", 0, "error");
  error.code = code;
  error.constraint = constraint;
  return error;
};

// Import the app and mock the db module
import { app } from "./src";

// Mock the db module
vi.mock("./src/db", () => {
  return {
    db: {
      // Default mock implementations that will be overridden in tests
      select: vi.fn(),
      insert: vi.fn(),
      query: {
        sessions: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

// Import the mocked db
import { db } from "./src/db";

describe("API Tests", () => {
  // Setup and teardown
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Happy path tests
  it("GET /courses/:courseId", async () => {
    // Mock only what's needed for this test
    const whereMock = vi.fn().mockResolvedValue([
      {
        totalModulesStudied: 10,
        averageScore: 85,
        timeStudied: 3600,
      },
    ]);

    const fromMock = vi.fn().mockReturnValue({ where: whereMock });

    vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      headers: {
        userId: TEST_USER_ID,
      },
    });
    const data = await res.json();
    expect(data).toEqual({
      totalModulesStudied: 10,
      averageScore: 85,
      timeStudied: 3600,
    });
    expect(res.status).toBe(200);
  });

  it("GET /courses/:courseId/sessions/:sessionId", async () => {
    // Mock only what's needed for this test
    vi.mocked(db.query.sessions.findFirst).mockResolvedValue({
      sessionId: TEST_SESSION_ID,
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      totalModulesStudied: 5,
      averageScore: 90,
      timeStudied: 1800,
      createdAt: new Date(),
    } as any);

    const res = await app.request(
      `/courses/${TEST_COURSE_ID}/sessions/${TEST_SESSION_ID}`,
      {
        headers: {
          userId: TEST_USER_ID,
        },
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      sessionId: TEST_SESSION_ID,
      totalModulesStudied: 5,
      averageScore: 90,
      timeStudied: 1800,
    });
  });

  it("POST /courses/:courseId", async () => {
    // Mock only what's needed for this test
    const insertValuesMock = vi.fn().mockResolvedValue(undefined);
    const insertMock = vi.fn().mockReturnValue({ values: insertValuesMock });

    const payload = {
      sessionId: TEST_SESSION_ID,
      totalModulesStudied: 3,
      averageScore: 75,
      timeStudied: 1200,
    };

    vi.mocked(db.insert).mockImplementation(insertMock);

    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      method: "POST",
      headers: {
        userId: TEST_USER_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    expect(data).toEqual(payload);
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalled();
  });

  // Invalid input type tests
  it("POST /courses/:courseId - should reject non-numeric totalModulesStudied", async () => {
    const payload = {
      sessionId: TEST_SESSION_ID,
      totalModulesStudied: "not-a-number", // Invalid type
      averageScore: 75,
      timeStudied: 1200,
    };

    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      method: "POST",
      headers: {
        userId: TEST_USER_ID,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(res.status).toBe(400);
  });

  it("POST /courses/:courseId - should reject negative averageScore", async () => {
    const payload = {
      sessionId: TEST_SESSION_ID,
      totalModulesStudied: 3,
      averageScore: -10, // Negative value
      timeStudied: 1200,
    };

    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      method: "POST",
      headers: {
        userId: TEST_USER_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  // Missing required fields
  it("POST /courses/:courseId - should reject missing required fields", async () => {
    const payload = {
      sessionId: TEST_SESSION_ID,
      // Missing totalModulesStudied
      averageScore: 75,
      timeStudied: 1200,
    };

    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      method: "POST",
      headers: {
        userId: TEST_USER_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  // Invalid UUID format
  it("POST /courses/:courseId - should reject invalid UUID format", async () => {
    const payload = {
      sessionId: "invalid-uuid-format",
      totalModulesStudied: 3,
      averageScore: 75,
      timeStudied: 1200,
    };

    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      method: "POST",
      headers: {
        userId: TEST_USER_ID,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  // Missing headers
  it("GET /courses/:courseId - should reject missing userId header", async () => {
    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      headers: {
        // userId header is missing
      },
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  // Unique constraint violation
  it("POST /courses/:courseId - should handle duplicate sessionId", async () => {
    // Mock the database error for duplicate session
    const insertValuesMock = vi
      .fn()
      .mockRejectedValue(createDatabaseError("23505", "sessions_pkey"));

    vi.mocked(db.insert).mockReturnValue({ values: insertValuesMock } as any);

    const res = await app.request(`/courses/${TEST_COURSE_ID}`, {
      method: "POST",
      headers: {
        userId: TEST_USER_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: TEST_DUPLICATE_SESSION_ID,
        totalModulesStudied: 3,
        averageScore: 75,
        timeStudied: 1200,
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Session already exists");
  });

  // Resource not found
  it("GET /courses/:courseId/sessions/:sessionId - should return 404 for non-existent session", async () => {
    // Mock the database to return null for the session
    vi.mocked(db.query.sessions.findFirst).mockResolvedValue(null as any);

    const res = await app.request(
      `/courses/${TEST_COURSE_ID}/sessions/${TEST_NONEXISTENT_ID}`,
      {
        headers: {
          userId: TEST_USER_ID,
        },
      }
    );

    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe("Session not found");
  });

  // Empty result handling
  it("GET /courses/:courseId - should handle no data for course", async () => {
    // Mock the database to return empty array
    const whereMock = vi.fn().mockResolvedValue([]);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });

    vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

    const res = await app.request(`/courses/${TEST_NONEXISTENT_ID}`, {
      headers: {
        userId: TEST_USER_ID,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      totalModulesStudied: 0,
      averageScore: 0,
      timeStudied: 0,
    });
  });
});
