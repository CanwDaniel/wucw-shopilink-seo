import { prisma } from "../../../prisma/lib/prisma";

export async function ServerApiFindUser({ userId }: { userId: string }) {
  try {
    const isuser = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
      }
    });

    if(isuser && isuser.id) {
      const { id, email, username, avatar } = isuser;
      return {
        success: true,
        message: "User login successfully",
        data: {
          id,
          email,
          username,
          avatar,
        }
      };
    } else {
      return {
        success: false,
        message: "Failed to get user",
      };
    }
  } catch(error: any) {
    return {
      success: false,
      message: "Failed to get user"
    };
  }
}