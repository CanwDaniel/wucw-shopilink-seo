import type { Route } from "./+types/index";
import { useEffect } from 'react';
import { useLoaderData, useFetcher } from 'react-router';
import { Controller, useForm } from "react-hook-form";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ServerToolAuth } from 'server/tool/auth.tool';
import { ServerApiFindUser } from 'server/users/find.api';

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Spinner } from "~/components/ui/spinner"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"

import { extractProfile } from './extract-profile';

import { recommendChairs } from "./score";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const { chat } = Object.fromEntries(formData);

  try {
    const profile = await extractProfile(`${chat}`);
    
    const recommendation = recommendChairs(profile);
    console.log('recommendation', recommendation);
    return {
      success: true,
      message: JSON.stringify(recommendation),
    };
  } catch (error) {
    console.log('error::', error);
  }
}

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
  const fetcher = useFetcher();
  
  useEffect(() => {
    if (loaderData) {
      localStorage.setItem("userInfo", JSON.stringify(loaderData));
    }
  }, [loaderData]);

  const formSchema = z.object({
    chat: z.string()
      .min(1, "Username is required.")
      .pipe(
        z.string()
          .min(3, "Bug title must be at least 3 characters.")
      ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      chat: "",
    }
  });

  async function formSubmit(data: z.infer<typeof formSchema>) {
    fetcher.submit(data, { method: "post" })
  }

  return (
    <>
      <fetcher.Form onSubmit={form.handleSubmit(formSubmit)}>
        <FieldGroup className="w-xs">
          <Controller
            name="chat"
            control={form.control}
            render={
              ({field, fieldState}) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="fieldgroup-chat">Chat</FieldLabel>
                  <Input {...field} id="fieldgroup-chat" aria-invalid={fieldState.invalid} placeholder=""/>
                </Field>
              )}
          />

          <Field orientation="horizontal">
            <Button type="submit" className="cursor-pointer">Submit</Button>
          </Field>
        </FieldGroup>
      </fetcher.Form>
    
      {
        fetcher.state === 'submitting' ? <Spinner className="size-4" /> : fetcher?.data?.message
      }
    </>
  )
}