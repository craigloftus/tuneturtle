import { useState } from "react";
import { useLocation } from "wouter";
import { S3Setup } from "@/components/S3Setup";
import { validateS3Credentials } from "@/lib/aws";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import type { S3Credentials } from "@/lib/services/S3Service";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
        showSettingsButton={false}
      />
      <div className="container mx-auto p-6 mt-3">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">Setup AWS S3</h2>
          </div>
          <p className="text-muted-foreground">
            Configure your AWS S3 bucket to start streaming music.
            Make sure you have the necessary IAM permissions set up.
          </p>
          
          <S3Setup onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
