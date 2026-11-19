import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

type PasswordInputProps = Omit<React.ComponentProps<typeof InputGroupInput>, "type">;

/** Password field with a show/hide (eye) toggle. Use for every password input. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <InputGroup className={className}>
      <InputGroupInput type={visible ? "text" : "password"} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
