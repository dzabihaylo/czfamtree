'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      appearance={{
        variables: {
          colorPrimary: 'oklch(0.18 0.008 80)',
          colorDanger: 'oklch(0.55 0.17 25)',
          colorSuccess: 'oklch(0.62 0.13 150)',
          colorWarning: 'oklch(0.72 0.14 75)',
          colorNeutral: 'oklch(0.88 0.005 80)',
          colorForeground: 'oklch(0.18 0.008 80)',
          colorPrimaryForeground: 'oklch(1 0 0)',
          colorMutedForeground: 'oklch(0.62 0.006 80)',
          colorMuted: 'oklch(0.965 0.004 80)',
          colorBackground: 'oklch(1 0 0)',
          colorInput: 'oklch(1 0 0)',
          colorInputForeground: 'oklch(0.18 0.008 80)',
          colorBorder: 'oklch(0.88 0.005 80)',
          colorRing: 'oklch(0.52 0.14 250)',
          colorShadow: 'oklch(0.18 0.008 80)',
          colorModalBackdrop: 'rgba(24, 18, 11, 0.4)',

          fontFamily: 'var(--font-inter), sans-serif',
          fontFamilyButtons: 'var(--font-inter), sans-serif',
          fontSize: '0.8125rem', // 13px base — matches UI-SPEC label size
          fontWeight: { normal: 400, medium: 600, semibold: 600, bold: 600 }, // no 500
          borderRadius: '0',
          spacing: '1rem',
        },
        elements: {
          // Card container — Swiss card with 4px hard shadow
          card: 'border border-ink shadow-[4px_4px_0_var(--ink)] rounded-none bg-bg-card',
          rootBox: 'w-full max-w-[320px]',

          // Header — hidden because the auth layout already provides brand + headline
          headerTitle: 'hidden',
          headerSubtitle: 'hidden',
          logoBox: 'hidden',

          // Social buttons ("Continue with Google", "Continue with Apple")
          socialButtonsBlockButton:
            'border border-ink bg-bg-card rounded-none text-ink font-semibold text-[13px] ' +
            'py-sm px-[14px] hover:-translate-x-[2px] hover:-translate-y-[2px] ' +
            'hover:shadow-[4px_4px_0_var(--ink)] transition-all duration-150',
          socialButtonsBlockButtonText: 'font-semibold text-[13px]',
          socialButtonsProviderIcon: 'w-[18px] h-[18px]',

          // Divider between socials and email
          dividerRow: 'my-md',
          dividerLine: 'bg-rule',
          dividerText: 'text-ink-3 font-mono text-[11px] tracking-[0.12em] uppercase',

          // Email input + submit
          formFieldInput:
            'border border-rule bg-bg-card rounded-none text-[14px] py-sm px-md ' +
            'focus:border-accent focus:outline-none',
          formFieldLabel: 'text-ink text-[13px] font-semibold',
          formButtonPrimary:
            'border border-ink bg-ink text-bg-card rounded-none text-[13px] font-semibold ' +
            'py-sm px-[14px] hover:-translate-x-[2px] hover:-translate-y-[2px] ' +
            'hover:shadow-[4px_4px_0_var(--accent)] transition-all duration-150',

          // Footer
          footer: 'bg-bg mt-lg',
          footerActionText: 'text-ink-3 font-mono text-[11px]',
          footerActionLink: 'text-ink font-mono text-[11px] underline',

          // Misc
          formFieldErrorText: 'text-danger text-[11px] font-mono',
          identityPreviewText: 'text-ink text-[13px]',
          identityPreviewEditButton: 'text-accent text-[13px] underline',
        },
        layout: {
          logoImageUrl: '',
          showOptionalFields: false,
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'blockButton',
        },
      }}
    />
  );
}
