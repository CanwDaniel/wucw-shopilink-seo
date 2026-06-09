import type { Route } from "./+types/register";
import * as React from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useFetcher, useNavigate } from "react-router";
import { useEffect } from "react";
import { Toaster } from "~/components/ui/sonner";
import { Spinner } from "~/components/ui/spinner";
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

// TODO: API
import { ServerApiRegister } from "../server/users/register.api";

// TODO: VALIDATE
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

  email: z.string()
    .min(1, "Email is required.")
    .pipe(
      z.email("Please enter a valid email address.")
    ),
});

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const { username, password, email } = Object.fromEntries(formData);
  
  const userdata = {
    username: String(username),
    password: String(password),
    email: String(email)
  };

  const res = await ServerApiRegister(userdata);

  return res;
}

export default function Register() {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    if(fetcher?.data) {
      if(fetcher.data.success) {
        navigate("/login", { state: { username: fetcher.data.data.username } });
      } else {
        toast.error(fetcher?.data?.message, { position: "top-center", style: { backgroundColor: "var(--destructive)", color: "#fff"} });
      }
    }
  }, [fetcher.data])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    // toast("You submitted the following values:", {
    //   description: (
    //     <pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
    //       <code>{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    //   position: "bottom-right",
    //   classNames: {
    //     content: "flex flex-col gap-2",
    //   },
    //   style: {
    //     "--border-radius": "calc(var(--radius)  + 4px)",
    //   } as React.CSSProperties,
    // });

    fetcher.submit(data, { method: "post" });
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <Card className="size-max min-w-sm">
        <CardHeader>
          <CardTitle>Register</CardTitle>

          <CardDescription>
            Please enter your details to create an account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <fetcher.Form id="form-register" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-username">Username</FieldLabel>
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
                    <FieldLabel htmlFor="form-password">Password</FieldLabel>
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

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="form-email"
                      aria-invalid={fieldState.invalid}
                      placeholder="Enter your email"
                      autoComplete="off"
                      type="email"
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
            <Button type="submit" form="form-register" className="cursor-pointer" disabled={ fetcher.state === 'submitting' }>
              Sign up { fetcher.state === 'submitting' ? <Spinner data-icon="inline-start" /> : '' }
            </Button>
          </Field>
        </CardFooter>
      </Card>

      <Toaster />
    </div>
  );
}
