import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
      
      <div className="prose dark:prose-invert mb-6">
        <h3>IAM Setup Instructions</h3>
        <ol>
          <li>Create a new IAM user in your AWS console</li>
          <li>Attach the AmazonS3ReadOnlyAccess policy</li>
          <li>Generate access keys for the user</li>
          <li>Enter the credentials below</li>
        </ol>
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
                  <Input {...field} />
                </FormControl>
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
