import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { checkStoredCredentials } from "@/lib/aws";
import { motion } from "framer-motion";

export function SplashScreen() {
  const [, navigate] = useLocation();
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

  useEffect(() => {
    const credentials = checkStoredCredentials();
    setHasCredentials(!!credentials);

    // If user has credentials, automatically redirect after a short delay
    if (credentials) {
      const timer = setTimeout(() => {
        navigate("/home");
      }, 2000); // 2 second delay
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8"
      >
        <h1 className="text-6xl font-bold text-white tracking-tight">
          Tune
          <span className="text-emerald-300">Turtle</span>
        </h1>
        
        {hasCredentials === false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={() => navigate("/setup")}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-white"
            >
              Setup Your Music Library
            </Button>
          </motion.div>
        )}

        {/* Decorative turtle shell pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
        </div>
      </motion.div>
    </div>
  );
}
