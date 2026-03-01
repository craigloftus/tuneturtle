import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { S3Setup } from "@/components/S3Setup";

async function fillForm() {
  const user = userEvent.setup();

  await user.click(screen.getByRole("combobox", { name: /region/i }));
  await user.click(await screen.findByText("Europe (London) (eu-west-2)"));
  await user.type(screen.getByRole("textbox", { name: /bucket name/i }), "music-bucket");
  await user.type(screen.getByRole("textbox", { name: /access key id/i }), "AKIAEXAMPLE");
  await user.type(screen.getByLabelText(/secret access key/i), "secret-example");

  return user;
}

describe("S3Setup", () => {
  it("does not cache credentials when validation fails", async () => {
    const onSubmit = vi.fn(async () => false);
    const user = await fillFormForTest(onSubmit);

    await user.click(screen.getByRole("button", { name: /connect to s3/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("s3Credentials")).toBeNull();
  });

  it("caches credentials after a successful validation", async () => {
    const onSubmit = vi.fn(async () => true);
    const user = await fillFormForTest(onSubmit);

    await user.click(screen.getByRole("button", { name: /connect to s3/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(JSON.parse(localStorage.getItem("s3Credentials") ?? "{}")).toMatchObject({
      region: "eu-west-2",
      bucket: "music-bucket",
      accessKeyId: "AKIAEXAMPLE",
      secretAccessKey: "secret-example",
    });
  });
});

async function fillFormForTest(onSubmit: (data: unknown) => Promise<boolean>) {
  render(<S3Setup onSubmit={onSubmit} isLoading={false} />);
  return fillForm();
}
