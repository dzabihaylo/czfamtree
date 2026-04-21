import type { ReactNode } from 'react';
import SignInIllustration from '@/components/auth/SignInIllustration';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left pane: brand + Clerk <SignIn /> */}
      <div className="flex w-1/2 flex-col justify-between border-r border-rule bg-bg p-4xl">
        {/* Brand */}
        <div className="flex items-center gap-md">
          <span className="grid h-[28px] w-[28px] place-items-center bg-ink text-bg-card font-mono text-[11px]">
            CZ
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.005em]">Family Tree</span>
        </div>

        {/* Headline + sub + SignIn slot */}
        <div>
          <h1 className="max-w-[480px] text-[48px] font-semibold leading-[1.05] tracking-[-0.025em]">
            Every name, a branch.
            <br />
            Every branch, a story.
          </h1>
          <p className="mt-md max-w-[420px] text-[14px] leading-[1.5] tracking-[-0.005em] text-ink-2">
            Build your family tree by clicking, dragging, and connecting &mdash; or invite relatives
            to collaborate in real time.
          </p>
          <div className="mt-xl">{children /* Clerk <SignIn /> from sign-in/page.tsx */}</div>
        </div>

        {/* Foot */}
        <div className="flex justify-between font-mono text-[11px] tracking-[0.12em] text-ink-3">
          <span>v0.1 · preview</span>
          <span>Private by default</span>
        </div>
      </div>

      {/* Right pane: decorative illustration */}
      <div className="w-1/2 bg-bg-soft">
        <SignInIllustration />
      </div>
    </div>
  );
}
