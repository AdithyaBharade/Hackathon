import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { FormInput } from "@/components/common/form-input";
import { INPUT_HINTS } from "@/lib/input-hints";
import { onInvalidSubmit } from "@/lib/form";
import { loginSchema, type LoginFormValues, type LoginInput } from "@/schemas/auth.schema";
import { useLogin } from "@/services/auth/auth.queries";
import { DEMO_PASSWORD, DEMO_PEOPLE } from "@/constants";
import { AuthCard } from "./auth-card";

export function LoginForm() {
  const login = useLogin();
  const form = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <AuthCard
      title="CertiFlow"
      description={
        <>
          Pragati Skills Mission certificates. Checking a certificate?{" "}
          <Link className="underline" to="/verify">
            Verify here
          </Link>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">Demo: sign in as</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_PEOPLE.map((p) => (
            <Button
              key={p.email}
              variant="outline"
              className="h-auto flex-col items-start py-2"
              disabled={login.isPending}
              onClick={() => login.mutate({ email: p.email, password: DEMO_PASSWORD })}
            >
              <span>{p.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{p.role}</span>
            </Button>
          ))}
        </div>
      </div>
      <FieldSeparator className="my-4">or</FieldSeparator>
      <form noValidate onSubmit={form.handleSubmit((v) => login.mutate(v), onInvalidSubmit)}>
        <FieldGroup>
          <FormInput control={form.control} name="email" label="Email" {...INPUT_HINTS.email} />
          <FormInput control={form.control} name="password" label="Password" {...INPUT_HINTS.password} />
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? "Logging in..." : "Login"}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
