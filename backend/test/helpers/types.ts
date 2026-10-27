import type request from "supertest";

// A supertest agent: keeps cookies between requests, like a browser
export type Agent = ReturnType<typeof request.agent>;

// The user object in API responses (dates arrive as strings)
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// The session cookie the server set on a response, if any
export const getTokenCookie = (res: request.Response): string | undefined =>
  ((res.headers["set-cookie"] as unknown as string[] | undefined) ?? []).find((c) =>
    c.startsWith("token="),
  );
