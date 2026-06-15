import type { Route } from "./+types/index";
import { useEffect } from 'react';
import { useLoaderData } from 'react-router';
import { ServerToolAuth } from 'server/tool/auth.tool';
import { ServerApiFindUser } from 'server/users/find.api';

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  const isVerify = await ServerToolAuth(`${token}`);

  let userId: string | null = null;
  if (isVerify && typeof isVerify !== 'string') {
    userId = isVerify.userId ?? null;
    
    if(userId) {
      const userInfo = await ServerApiFindUser({ userId });

      if(userInfo.success) {
        return userInfo.data;
      }
    }
  } else {
    console.error("Token verification failed or returned invalid format");
  }
}

export default function Home() {
  const loaderData = useLoaderData();
  
  useEffect(() => {
    if (loaderData) {
      localStorage.setItem("userInfo", JSON.stringify(loaderData));
    }
  }, [loaderData]);

  return (
    <div>
      <h1>HOME</h1>
    </div>
  )
}