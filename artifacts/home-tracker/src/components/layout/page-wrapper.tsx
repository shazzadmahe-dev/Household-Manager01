import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { motion } from "framer-motion";
import { useGetMe } from "@workspace/api-client-react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export function PageWrapper({ children, title, description }: { children: ReactNode, title: string, description?: string }) {
  const { data: user, isLoading, error } = useGetMe({ query: { retry: false } });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background md:pl-72 flex flex-col pt-14 md:pt-0">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full pb-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-muted-foreground text-sm sm:text-base">{description}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
