import { SignIn } from "@clerk/react";

export function SignInPage() {
  return (
    <div className="flex min-h-[70vh] iteam-center justify-center">
      <SignIn />
    </div>
  );
}
