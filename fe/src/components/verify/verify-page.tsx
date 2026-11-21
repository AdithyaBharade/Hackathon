import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { format } from "date-fns";
import { ArrowLeftIcon, SearchIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldQuestionIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useVerify } from "@/services/certificates/certificates.queries";

/** Public: for employers and anyone holding a certificate. No login. */
export function VerifyPage() {
  const { number = "" } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(number);
  const { data, isFetching, error } = useVerify(number.toUpperCase());
  const signedIn = useAuthStore((s) => !!s.user);

  return (
    <div className="relative flex min-h-svh flex-col items-center bg-background p-4 pt-16">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" render={<Link to={signedIn ? "/" : "/login"} />}>
          <ArrowLeftIcon className="size-4" /> {signedIn ? "Back to batches" : "Staff login"}
        </Button>
      </div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Verify a certificate</h1>
          <p className="text-sm text-muted-foreground">Pragati Skills Mission · enter the number printed on the certificate or scan its QR code.</p>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) navigate(`/verify/${input.trim().toUpperCase()}`);
          }}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="PSM-2026-000123" aria-label="Certificate number" autoCapitalize="characters" />
          <Button type="submit" className="w-full sm:w-auto">
            <SearchIcon className="size-4" /> Verify
          </Button>
        </form>

        {isFetching && (
          <div className="flex justify-center">
            <Spinner />
          </div>
        )}
        {error && !isFetching && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldQuestionIcon className="size-5" /> Check the number
              </CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
          </Card>
        )}
        {data && !isFetching && !data.found && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldQuestionIcon className="size-5" /> No such certificate
              </CardTitle>
              <CardDescription>{data.number} was not issued by the Pragati Skills Mission. Treat the document as not genuine.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {data && !isFetching && data.found && (
          <Card className={data.valid ? "border-primary" : "border-destructive"}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${data.valid ? "text-primary" : "text-destructive"}`}>
                {data.valid ? <ShieldCheckIcon className="size-5" /> : <ShieldAlertIcon className="size-5" />}
                {data.valid ? "Genuine certificate" : "Revoked: not valid"}
              </CardTitle>
              <CardDescription>
                {data.valid
                  ? "This certificate was issued by the Pragati Skills Mission and is valid."
                  : `This certificate was cancelled by the state office${data.revokedAt ? ` on ${format(new Date(data.revokedAt), "d MMM yyyy")}` : ""}. Do not accept it.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {[
                  ["Number", data.number],
                  ["Holder", data.holderName],
                  ["Course", data.course],
                  ["Grade", data.grade],
                  ["Training centre", data.centre],
                  ["District", data.district],
                  ["Issued", format(new Date(data.issuedAt), "d MMM yyyy")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">The holder's name is partly hidden to protect their privacy. Compare it with the paper.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
