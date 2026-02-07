import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card.tsx";
import { Input } from "~/components/ui/input.tsx";
import { authClient } from "~/lib/auth-client.ts";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// Zod schema for login form validation
const loginSchema = z.object({
  username: z.string().min(3, "Korisničko ime mora imati najmanje 3 karaktera"),
  password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  // Redirect if already logged in (after render)
  useEffect(() => {
    if (session) {
      navigate({ to: "/admin" });
    }
  }, [session, navigate]);

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting
  if (session) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form with Zod
    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const firstError = result.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authClient.signIn.username({
        username,
        password,
      });

      // Check if sign in was successful
      if (response.error) {
        toast.error("Neispravno korisničko ime ili lozinka");
        setIsLoading(false);
        return;
      }

      toast.success("Uspešno ste se prijavili!");
      navigate({ to: "/admin" });
    } catch (error) {
      // Catch any network or unexpected errors
      console.error("Login error:", error);
      toast.error("Greška prilikom prijave. Pokušajte ponovo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Prijava</CardTitle>
          <CardDescription>
            Unesite vaše korisničko ime i lozinku
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Korisničko ime
              </label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Lozinka
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Prijava u toku..." : "Prijavi se"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
