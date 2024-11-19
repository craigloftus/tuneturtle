import { useState } from "react";
import { useLocation } from "wouter";
import { S3Setup } from "@/components/S3Setup";
import { validateS3Credentials } from "@/lib/aws";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
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
    <div className="flex flex-col min-h-screen">
      <Header 
        showViewControls={false} 
        showRefreshButton={false}
      />
      <div className="mt-16 px-4">
        <h2 className="text-2xl font-bold mb-4">Setup AWS S3</h2>
        <div className="container mx-auto p-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-muted-foreground">
              Configure your AWS S3 bucket to start streaming music.
              Make sure you have the necessary IAM permissions set up.
            </p>
            
            <S3Setup onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
