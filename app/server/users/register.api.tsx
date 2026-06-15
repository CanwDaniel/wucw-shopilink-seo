import type { User } from 'types/user.type';
import { prisma } from "prisma/lib/prisma";
import bcrypt from 'bcryptjs';

export async function ServerApiRegister({ username, password, email }: User) {
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);
  
  try {
    const registerData = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        Auth: {
          create: {
            role: "USER",
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        Auth: {
          select: {
            role: true
          }
        }
      }
    });

    return {
      success: true,
      message: "User registered successfully",
      data: registerData
    };
  } catch(error: any) {
    if(error.code === "P2002") {
      if(error.message.includes("username")) {
        return {
          success: false,
          message: "Username already exists"
        };
      }
    }

    return {
      success: false,
      message: "Failed to register user"
    };
  }
}