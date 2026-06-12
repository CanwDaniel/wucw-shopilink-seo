import type { Route } from "./+types/login";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useFetcher, useLocation, redirect, Link, useActionData } from "react-router";
import { useEffect } from "react";
import { Toaster } from "~/components/ui/sonner"
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";

// TODO: API
import { ServerApiLogin } from "../../server/users/login.api";

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

  const res = await ServerApiLogin({ username: `${username}`, password: `${password}` });

  if (res.success) {
    const url = new URL(request.url);
    const fromPath = url.searchParams.get("from");
    const redirectTo = fromPath ? decodeURIComponent(fromPath) : "/";

    return redirect(redirectTo, {
      headers: {
        "Set-Cookie": `token=${res?.data?.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
      }
    });
  } else {
    return res;
  }
}

export default function Login() {
  const fetcher = useFetcher();
  const location = useLocation();
  const actionData = useActionData();

  useEffect(() => {
    if (location?.state && location?.state?.username) {
      form.setValue('username', location.state.username);
    }
  }, [location.state]);

  useEffect(() => {
    if (fetcher.data && !fetcher.data.success) {
      toast.error(fetcher.data?.message, { position: "top-center", style: { backgroundColor: "var(--destructive)", color: "#fff" } });
    }
  }, [fetcher.data])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      username: "",
      password: "",
    }
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    fetcher.submit(data, { method: "post" });
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <Card className="size-max min-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>

          <CardDescription>
            Please enter your credentials to log in.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <fetcher.Form id="form-login" onSubmit={form.handleSubmit(onSubmit)}>
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
          </fetcher.Form>
        </CardContent>

        <CardFooter>
          <Field>
            {/* <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button> */}
            <Button type="submit" form="form-login" className="cursor-pointer" disabled={fetcher.state === 'submitting'}>
              Log in {fetcher.state === 'submitting' ? <Spinner data-icon="inline-start" /> : ''}
            </Button>

            <Button variant="link" asChild className="h-auto justify-end p-0 leading-none">
              <Link to={{ pathname: "/register" }} className="text-ring">Sign up</Link>
            </Button>
          </Field>
        </CardFooter>
      </Card>

      <Toaster />
    </div>
  )
}
