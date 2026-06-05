import type { Route } from "./+types/login";
import * as React from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Toaster } from "~/components/ui/sonner"
import { useSubmit } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";

const formSchema = z.object({
  username: z.string()
    .min(1, "Username is required.")
    .pipe(
      z.string()
        .min(3, "Bug title must be at least 3 characters.")
        .max(16, "Bug title must be at most 16 characters."),
    ),

  password: z.string()
    .min(1, "Username is required.")
    .pipe(
      z.string()
        .min(6, "Password must be at least 6 characters.")
        .max(16, "Password must be at most 16 characters."),
    ),
})

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const { username, password } = Object.fromEntries(formData);
  console.log(username, password)
}

export default function Login() {
  const submit = useSubmit();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      username: "",
      password: "",
    }
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    toast("You submitted the following values:", {
      description: (
        <pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
      position: "bottom-right",
      classNames: {
        content: "flex flex-col gap-2",
      },
      style: {
        "--border-radius": "calc(var(--radius)  + 4px)",
      } as React.CSSProperties,
    });

    submit(data, { method: "post" });
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <Card className="size-max sm:min-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>

          <CardDescription>
            Please enter your credentials to log in.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form id="form-login" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-username">
                      Username
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-username"
                      aria-invalid={fieldState.invalid}
                      placeholder="Enter your username"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-password">
                      Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="Enter your password"
                      autoComplete="off"
                      type="password"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>

        <CardFooter>
          <Field>
            {/* <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button> */}
            <Button type="submit" form="form-login" className="cursor-pointer">
              Sign in
            </Button>
          </Field>
        </CardFooter>
      </Card>

      <Toaster />
    </div>
  )
}
