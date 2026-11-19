import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/common/form-input";
import { loginSchema, registerSchema, type RegisterInput } from "@/schemas/auth.schema";
import { useLogin, useRegister } from "@/services/auth/auth.queries";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const login = useLogin();
  const register = useRegister();
  const mutation = isLogin ? login : register;

  const form = useForm<RegisterInput>({
    resolver: zodResolver(isLogin ? (loginSchema as typeof registerSchema) : registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (values: RegisterInput) =>
    isLogin ? login.mutate({ email: values.email, password: values.password }) : register.mutate(values);

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isLogin ? "Login" : "Create account"}</CardTitle>
          <CardDescription>
            {isLogin ? "No account? " : "Have an account? "}
            <Link className="underline" to={isLogin ? "/register" : "/login"}>
              {isLogin ? "Register" : "Login"}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {!isLogin && <FormInput control={form.control} name="name" label="Name" />}
              <FormInput control={form.control} name="email" label="Email" type="email" />
              <FormInput control={form.control} name="password" label="Password" type="password" />
              {mutation.error && <p className="text-sm text-destructive">{mutation.error.message}</p>}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Please wait..." : isLogin ? "Login" : "Register"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
