import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/common/form-input";
import { INPUT_HINTS } from "@/lib/input-hints";
import { onInvalidSubmit } from "@/lib/form";
import { registerSchema, type RegisterFormValues, type RegisterInput } from "@/schemas/auth.schema";
import { useRegister } from "@/services/auth/auth.queries";
import { AuthCard } from "./auth-card";

export function RegisterForm() {
  const register = useRegister();
  const form = useForm<RegisterFormValues, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched", // validate a field once the user leaves it
  });

  return (
    <AuthCard
      title="Create account"
      description={<>Have an account? <Link className="underline" to="/login">Login</Link></>}
    >
      <form noValidate onSubmit={form.handleSubmit((v) => register.mutate(v), onInvalidSubmit)}>
        <FieldGroup>
          <FormInput control={form.control} name="name" label="Full name" {...INPUT_HINTS.name} />
          <FormInput control={form.control} name="email" label="Email" {...INPUT_HINTS.email} />
          <FormInput
            control={form.control}
            name="password"
            label="Password"
            description="8+ characters with upper, lower, number and symbol."
            {...INPUT_HINTS.newPassword}
          />
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending ? "Creating account..." : "Register"}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
