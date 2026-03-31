import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Home, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { username, password } }, {
      onSuccess: () => {
        window.location.href = "/";
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-background rounded-2xl border shadow-lg p-8"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-md mb-4">
            <Home className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">82 Walthen Drive</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to manage expenses</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {login.isError && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg font-medium text-center border border-destructive/20">
              Invalid username or password
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              icon={<User className="h-4 w-4" />}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              icon={<Lock className="h-4 w-4" />}
              autoComplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base rounded-xl mt-2"
            isLoading={login.isPending}
          >
            Sign In
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
