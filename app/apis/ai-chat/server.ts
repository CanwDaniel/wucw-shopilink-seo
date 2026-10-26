import { createCookieSessionStorage } from "react-router";

export const sessionStorage =
  createCookieSessionStorage({
    cookie: {
      name: "profile_session",
      secrets: [process.env.SESSION_SECRET!],
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  });

export const {
  getSession,
  commitSession,
  destroySession,
} = sessionStorage;