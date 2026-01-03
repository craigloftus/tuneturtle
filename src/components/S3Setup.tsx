import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { S3Credentials } from "@/lib/services/S3Service";

const formSchema = z.object({
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  region: z.string().min(1, "Region is required"),
  bucket: z.string().min(1, "Bucket name is required"),
});

// Hardcoded list of common AWS regions
const awsRegions = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "af-south-1", label: "Africa (Cape Town)" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-south-1", label: "Europe (Milan)" },
  { value: "eu-west-3", label: "Europe (Paris)" },
  { value: "eu-north-1", label: "Europe (Stockholm)" },
  { value: "me-south-1", label: "Middle East (Bahrain)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
];

// Key for local storage
const s3CredentialsCacheKey = "s3Credentials";

interface S3SetupProps {
  onSubmit: (data: S3Credentials) => Promise<void>;
  isLoading: boolean;
}

export function S3Setup({ onSubmit, isLoading }: S3SetupProps) {
  const form = useForm<S3Credentials>({
    resolver: zodResolver(formSchema),
    // Default values will be potentially overridden by local storage
    defaultValues: {
      accessKeyId: "",
      secretAccessKey: "",
      region: "",
      bucket: "",
    },
  });

  // State to control Popover open/close
  const [isRegionPopoverOpen, setIsRegionPopoverOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const selectedRegion = form.watch("region");

  // Load credentials from local storage on mount
  useEffect(() => {
    const cachedData = localStorage.getItem(s3CredentialsCacheKey);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        // Validate if parsed data matches the expected structure (optional but recommended)
        const result = formSchema.safeParse(parsedData);
        if (result.success) {
          form.reset(result.data); // Reset the form with cached values
        } else {
          console.warn("Invalid cached S3 credentials format.", result.error);
          localStorage.removeItem(s3CredentialsCacheKey); // Clear invalid data
        }
      } catch (error) {
        console.error("Failed to parse cached S3 credentials:", error);
        localStorage.removeItem(s3CredentialsCacheKey); // Clear corrupted data
      }
    }
  }, [form]); // Dependency array includes form to access 'reset'

  useEffect(() => {
    if (isRegionPopoverOpen) {
      setRegionSearch(selectedRegion ?? "");
    }
  }, [isRegionPopoverOpen, selectedRegion]);

  // We need a new submit handler to save to local storage on success
  const handleFormSubmit = async (data: S3Credentials) => {
    // Call the original onSubmit passed via props
    await onSubmit(data);

    // Check if form is still valid after submission attempt (e.g., no errors thrown by onSubmit)
    // A simple proxy for success here is checking isLoading is false (might need refinement)
    // A better approach would be for the onSubmit prop to return success status
    if (!isLoading) { // This check assumes onSubmit sets isLoading and resets it
      try {
        localStorage.setItem(s3CredentialsCacheKey, JSON.stringify(data));
      } catch (error) {
        console.error("Failed to save S3 credentials to local storage:", error);
      }
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">S3 Configuration</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                <Popover open={isRegionPopoverOpen} onOpenChange={setIsRegionPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? awsRegions.find(
                                (region) => region.value === field.value
                              )?.label ?? field.value
                            : "Select or type region..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                    <Command
                      shouldFilter={true}
                      filter={(value, search, keywords) => {
                        if (!search) return 1;
                        const haystack = [value, ...(keywords ?? [])]
                          .join(" ")
                          .toLowerCase();
                        return haystack.includes(search.toLowerCase()) ? 1 : 0;
                      }}
                    >
                      <CommandInput 
                        placeholder="Search region or type custom..." 
                        onValueChange={setRegionSearch}
                        value={regionSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No region found.</CommandEmpty>
                        <CommandGroup>
                          {regionSearch.trim().length > 0 &&
                            !awsRegions.some((region) => {
                              const search = regionSearch.trim().toLowerCase();
                              return (
                                region.value.toLowerCase() === search ||
                                region.label.toLowerCase() === search
                              );
                            }) && (
                              <CommandItem
                                value={regionSearch.trim()}
                                onSelect={(currentValue) => {
                                  form.setValue("region", currentValue);
                                  setIsRegionPopoverOpen(false);
                                }}
                              >
                                Use &quot;{regionSearch.trim()}&quot;
                              </CommandItem>
                            )}
                          {awsRegions.map((region) => (
                            <CommandItem
                              value={region.value}
                              key={region.value}
                              keywords={[region.label, region.value]}
                              onSelect={(currentValue) => {
                                form.setValue("region", currentValue === field.value ? "" : currentValue);
                                setIsRegionPopoverOpen(false); // Close popover on select
                              }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === region.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {region.label} ({region.value})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Validating..." : "Connect to S3"}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
