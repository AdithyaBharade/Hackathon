import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/common/form-input";
import { INPUT_HINTS } from "@/lib/input-hints";
import { onInvalidSubmit } from "@/lib/form";
import { loginSchema, type LoginFormValues, type LoginInput } from "@/schemas/auth.schema";
import { useLogin } from "@/services/auth/auth.queries";
import { AuthCard } from "./auth-card";

export function LoginForm() {
  const login = useLogin();
  const form = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <AuthCard
      title="Login"
      description={<>No account? <Link className="underline" to="/register">Register</Link></>}
    >
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
