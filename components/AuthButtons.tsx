import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function AuthButtons() {
  return (
    <div className="flex gap-4">
      <SignInButton fallbackRedirectUrl="/">
        <button className="btn-primary">Sign In</button>
      </SignInButton>
      <SignUpButton fallbackRedirectUrl="/">
        <button className="btn-secondary">Sign Up</button>
      </SignUpButton>
    </div>
  );
}
