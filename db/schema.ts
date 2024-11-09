import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const awsCredentials = pgTable("aws_credentials", {
  id: text("id").primaryKey(),
  accessKeyId: text("access_key_id").notNull(),
  secretAccessKey: text("secret_access_key").notNull(),
  region: text("region").notNull(),
  bucket: text("bucket").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAwsCredentialsSchema = createInsertSchema(awsCredentials);
export const selectAwsCredentialsSchema = createSelectSchema(awsCredentials);
export type InsertAwsCredentials = z.infer<typeof insertAwsCredentialsSchema>;
export type AwsCredentials = z.infer<typeof selectAwsCredentialsSchema>;
