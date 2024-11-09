import { useState } from "react";
import { useLocation } from "wouter";
import { S3Setup } from "@/components/S3Setup";
import { validateS3Credentials } from "@/lib/aws";
import { useToast } from "@/hooks/use-toast";
import type { S3Credentials } from "@/types/aws";

export function Setup() {
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (data: S3Credentials) => {
    setIsLoading(true);
    try {
      await validateS3Credentials(data);
      toast({
        title: "Success",
        description: "Successfully connected to S3",
      });
      navigate("/");
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
        
        <div className="prose dark:prose-invert">
          <h2>IAM Setup Instructions</h2>
          <ol>
            <li>Create a new IAM user in your AWS console</li>
            <li>Attach the AmazonS3ReadOnlyAccess policy</li>
            <li>Generate access keys for the user</li>
            <li>Enter the credentials above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
