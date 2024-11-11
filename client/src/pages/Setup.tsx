import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { S3Setup } from "@/components/S3Setup";
import { validateS3Credentials, checkStoredCredentials } from "@/lib/aws";
import { useToast } from "@/hooks/use-toast";
import type { S3Credentials } from "@/types/aws";

export function Setup() {
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored credentials on component mount
    const storedCredentials = checkStoredCredentials();
    if (storedCredentials) {
      validateS3Credentials(storedCredentials)
        .then(() => {
          toast({
            title: "Success",
            description: "Reconnected to S3 using stored credentials",
          });
          navigate("/indexing");
        })
        .catch(() => {
          // Invalid stored credentials, continue with setup
          console.warn("Stored credentials are invalid");
        });
    }
  }, [navigate, toast]);

  const handleSubmit = async (data: S3Credentials) => {
    setIsLoading(true);
    try {
      await validateS3Credentials(data);
      toast({
        title: "Success",
        description: "Successfully connected to S3",
      });
      navigate("/indexing");
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Setup AWS S3</h1>
        <p className="text-muted-foreground">
          Configure your AWS S3 bucket to start streaming music.
          Make sure you have the necessary IAM permissions set up.
        </p>
        
        <S3Setup onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
