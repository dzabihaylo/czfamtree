'use client';

export type AuthErrorProps = {
  variant: 'bootstrap' | 'rls-reject';
  onAction?: () => void;
};

const COPY = {
  bootstrap: {
    heading: "We couldn't set up your tree.",
    body: 'Something went wrong on our side. Try again, and if it keeps happening, ping support.',
    cta: 'Try again',
    action: () => {
      if (typeof window !== 'undefined') window.location.reload();
    },
  },
  'rls-reject': {
    heading: "This tree isn't yours to view.",
    body: 'It may have been unshared, or the link might be wrong.',
    cta: 'Go to your tree',
    action: () => {
      if (typeof window !== 'undefined') window.location.href = '/';
    },
  },
} as const;

/**
 * Full-viewport error fallback card. Two variants cover the only two
 * unrecoverable auth failures Phase 1 can surface:
 *
 *  - `bootstrap`  : `resolveOrBootstrapTree()` threw (DB down, RPC error)
 *  - `rls-reject` : RLS returned 0 rows for a tree the URL pointed at
 *
 * Copy is frozen by UI-SPEC §Error states. Swiss hard-shadow card centered in
 * viewport. Button uses the standard 8×14 padding + hover translate + 4px
 * shadow pattern established in plan 01-03's `app/(auth)/layout.tsx`.
 */
export default function AuthError({ variant, onAction }: AuthErrorProps) {
  const { heading, body, cta, action: defaultAction } = COPY[variant];
  return (
    <div className="absolute inset-0 grid place-items-center bg-bg">
      <div
        className="bg-bg-card border border-ink text-center max-w-[360px]"
        style={{ padding: '24px 32px', boxShadow: '4px 4px 0 var(--ink)' }}
      >
        <div className="mb-md text-[15px] font-semibold">{heading}</div>
        <div className="mb-lg text-[13px] text-ink-2">{body}</div>
        <button
          type="button"
          onClick={onAction ?? defaultAction}
          className="border border-ink bg-bg-card text-[13px] font-semibold text-ink hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_var(--ink)] transition-all duration-150"
          style={{ padding: '8px 14px' }}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
