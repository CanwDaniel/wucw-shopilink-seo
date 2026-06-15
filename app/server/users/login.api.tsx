import type { User } from 'types/user.type';
import { prisma } from "prisma/lib/prisma";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";

export async function ServerApiLogin({ username, password }: User) {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("ERROR:", "JWT_SECRET is not defined in environment variables.");

      return {
        success: false,
        message: "Environment Error",
      };
    }

    const isuser = await prisma.user.findFirst({
      where: {
        username: username,
      }
    });

    if (isuser && isuser.id) {
      const correct_password = await bcrypt.compareSync(password, isuser.password);

      if (correct_password) {
        const { id, email, username, avatar } = isuser;
        const token = jwt.sign({ userId: id }, jwtSecret, { expiresIn: '1d' });
        return {
          success: true,
          message: "User login successfully",
          data: {
            id,
            email,
            username,
            avatar,
            token
          }
        };
      } else {
        return {
          success: false,
          message: "Invalid password",
        };
      }
    } else {
      return {
        success: false,
        message: "Invalid username",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to login user"
    };
  }
}