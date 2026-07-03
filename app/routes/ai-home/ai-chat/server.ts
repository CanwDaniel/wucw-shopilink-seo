import { createCookieSessionStorage } from "react-router";

export const sessionStorage =
  createCookieSessionStorage({
    cookie: {
      name: "__session",
      secrets: ["123123"],
      sameSite: "lax",
      path: "/",
      httpOnly: true,
    },
  });

export const {
  getSession,
  commitSession,
  destroySession,
} = sessionStorage;