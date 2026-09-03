import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { cn } from '../../lib/utils'

/** Shared marketing layout width — wider than 1200px so content fills desktop at 100% zoom */
export const marketingContainer =
  'mx-auto w-full max-w-[1440px] px-8 sm:px-12 lg:px-14 xl:px-16'

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Customers', href: '#customers' },
    { label: 'Pricing', href: '/register' },
  ],
  company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Blog', href: '#' },
  ],
  resources: [
    { label: 'Help center', href: '#' },
    { label: 'Documentation', href: '#' },
    { label: 'API', href: '#' },
    { label: 'Status', href: '#' },
  ],
  legal: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Security', href: '#' },
  ],
} as const

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className =
    'text-sm text-[#6b7280] transition-colors hover:text-[#111827]'

  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

function SocialIconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.063 2.063 0 01-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function SocialIconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function MarketingFooter() {
  return (
    <footer className="border-t border-[#ececef] bg-[#fafafa]">
      <div className={cn(marketingContainer, 'py-14 lg:py-16')}>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <Link
              to="/"
              className="text-xl font-bold lowercase tracking-tight text-[#111827]"
            >
              worksync<span>.</span>
            </Link>
            <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-[#6b7280]">
              Project management built for remote teams. Plan projects, assign tasks, and
              keep everyone aligned in one workspace.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#d1d5db] hover:text-[#111827]"
                aria-label="WorkSync on LinkedIn"
              >
                <SocialIconLinkedIn />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#d1d5db] hover:text-[#111827]"
                aria-label="WorkSync on X"
              >
                <SocialIconX />
              </a>
            </div>
          </div>

          {(
            [
              ['Product', footerLinks.product],
              ['Company', footerLinks.company],
              ['Resources', footerLinks.resources],
              ['Legal', footerLinks.legal],
            ] as const
          ).map(([title, links]) => (
            <div key={title}>
              <p className="text-sm font-semibold text-[#111827]">{title}</p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[#ececef] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#9ca3af]">
            © {new Date().getFullYear()} WorkSync. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-[#6b7280] transition-colors hover:text-[#111827]"
              aria-label="Language"
            >
              <Globe className="h-3.5 w-3.5" strokeWidth={1.75} />
              English
            </button>
            <Link
              to="/login"
              className="text-xs text-[#6b7280] transition-colors hover:text-[#111827]"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="text-xs font-medium text-[#111827] transition-colors hover:text-[#374151]"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#ececef] bg-white">
      <div className={cn(marketingContainer, 'flex h-14 items-center justify-between lg:h-[60px]')}>
        <Link
          to="/"
          className="text-[1.25rem] font-bold lowercase tracking-tight text-[#111827] lg:text-[1.35rem]"
        >
          worksync<span>.</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#374151] md:flex">
          <a href="#features" className="transition-colors hover:text-[#111827]">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-[#111827]">
            How it works
          </a>
          <a href="#customers" className="transition-colors hover:text-[#111827]">
            Customers
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-sm font-medium text-[#111827] sm:inline-flex"
            aria-label="Language"
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={1.75} />
            En
          </button>
          <Link
            to="/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-[#111827] transition-colors hover:bg-[#f3f4f6]"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-[#111827] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1f2937]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('public-scroll')
    window.scrollTo(0, 0)
    return () => {
      document.documentElement.classList.remove('public-scroll')
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-[#111827] antialiased">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
