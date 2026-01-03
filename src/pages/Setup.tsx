import { useState } from "react";
import { useLocation } from "wouter";
import { S3Setup } from "@/components/S3Setup";
import { validateS3Credentials } from "@/lib/aws";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import type { S3Credentials } from "@/lib/services/S3Service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

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
              className="shrink-0 hover:bg-muted mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">Connect to S3</h2>
          </div>
          <p className="text-muted-foreground">
            Configure access to your AWS S3 bucket to start streaming music. To do this
            you will need an IAM user with <strong>read-only</strong> permissions.
          </p>

          <p className="text-muted-foreground">
            If you're not sure what this means, you may not want to proceed, but basic instructions
            are provided below.
          </p>
          
          <Card className="p-6">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none text-lg font-semibold">
                Creating an IAM user
                <span className="text-muted-foreground">
                  <ChevronDown className="h-4 w-4 group-open:hidden" />
                  <ChevronUp className="h-4 w-4 hidden group-open:block" />
                </span>
              </summary>
              <div className="prose dark:prose-invert space-y-4 mt-4">
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Go to the AWS IAM Console and create a new IAM user</li>
                  <li>Choose &quot;Programmatic access&quot; to generate access keys</li>
                  <li>Create a new policy with the following read-only permissions:
                    <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}`}
                    </pre>
                  </li>
                  <li>Attach the policy to your IAM user</li>
                  <li>Configure CORS for your S3 bucket:
                    <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto">
{`[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]`}
                    </pre>
                  </li>
                </ol>
              </div>
            </details>
          </Card>

          <S3Setup onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
