import jwt from "jsonwebtoken";

export async function ServerToolAuth(token: string) {
  const jwtSecret = process.env.JWT_SECRET;

  if(!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  try {
    const isVertify = jwt.verify(token, jwtSecret);
    return isVertify;
  } catch (error) {
    console.error("Token verification failed or returned invalid format");
  }
}