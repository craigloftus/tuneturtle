import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { S3Credentials } from "@/types/aws";

const formSchema = z.object({
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  region: z.string().min(1, "Region is required"),
  bucket: z.string().min(1, "Bucket name is required"),
});

interface S3SetupProps {
  onSubmit: (data: S3Credentials) => Promise<void>;
  isLoading: boolean;
}

export function S3Setup({ onSubmit, isLoading }: S3SetupProps) {
  const form = useForm<S3Credentials>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessKeyId: "",
      secretAccessKey: "",
      region: "",
      bucket: "",
    },
  });

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">AWS S3 Configuration</h2>
      
      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Your audio files must be stored in an S3 bucket. Follow these steps to set up secure access.
        </AlertDescription>
      </Alert>

      <div className="prose dark:prose-invert mb-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">IAM Setup Instructions</h3>
          <ol className="list-decimal pl-4 space-y-2">
            <li>Go to the AWS IAM Console and create a new IAM user</li>
            <li>Choose "Programmatic access" to generate access keys</li>
            <li>Create a new policy with the following permissions:
              <pre className="mt-2 p-2 bg-muted rounded-md text-xs">
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
              <pre className="mt-2 p-2 bg-muted rounded-md text-xs">
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
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="accessKeyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Key ID</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  The access key ID from your IAM user credentials
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="secretAccessKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret Access Key</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormDescription>
                  The secret access key from your IAM user credentials
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., us-east-1" />
                </FormControl>
                <FormDescription>
                  The AWS region where your S3 bucket is located
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="bucket"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bucket Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  The name of your S3 bucket containing the audio files
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Validating..." : "Connect to S3"}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
