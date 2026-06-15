import { useEffect } from 'react';
import { redirect } from "react-router";

export function action() {
  return redirect('/login', {
    headers: {
      "Set-Cookie": "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    },        
  });
}

export default function Logout() {
  return null;
}