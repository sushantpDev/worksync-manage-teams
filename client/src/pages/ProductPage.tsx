import { useEffect, useState } from 'react'
import { ArrowRight, Check, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MarketingShell, marketingContainer } from '../components/marketing/MarketingShell'
import { cn } from '../lib/utils'

const IMAGES = {
  hero: '/images/marketing/hero-dashboard.png',
  heroGlobalTeams: '/images/marketing/hero-global-teams.png',
  projects: '/images/marketing/project-dashboard.png',
  tasksTeams: '/images/marketing/tasks-teams.png',
  alignment: '/images/marketing/team-alignment.png',
  testimonial: '/images/marketing/testimonial-bg.png',
  /** Deel IT-style platform cards — save generated images with these names */
  platformProjects: '/images/marketing/platform-projects.png',
  platformTasks: '/images/marketing/platform-tasks.png',
  platformTeams: '/images/marketing/platform-teams.png',
} as const

const platformCards = [
  {
    title: 'Plan and track projects across every team',
    description:
      'Create projects with status, progress, and due dates so admins and managers always know where work stands.',
    image: IMAGES.platformProjects,
    fallback: IMAGES.projects,
    imageAlt: 'WorkSync global project planning dashboard',
  },
  {
    title: 'Assign tasks with priorities and clear ownership',
    description:
      'Set statuses, assignees, and deadlines in a clean table view members and managers can trust.',
    image: IMAGES.platformTasks,
    fallback: IMAGES.tasksTeams,
    imageAlt: 'WorkSync task assignment and tracking',
  },
  {
    title: 'Onboard teams and start collaborating in one click',
    description:
      'Invite members, organize teams, and control visibility without scattered tools or manual setup.',
    image: IMAGES.platformTeams,
    fallback: IMAGES.alignment,
    imageAlt: 'WorkSync team collaboration and access control',
  },
] as const

const alignPoints = [
  'Deliver structured reviews with clear owners, teams, and deadlines',
  'Create personalized task views linked to projects, goals, and teams',
  'Connect performance and progress to recognition and delivery',
]

function PrimaryButton({
  to,
  children,
  className = '',
}: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg bg-[#111827] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#1f2937]',
        className
      )}
    >
      {children}
    </Link>
  )
}

function OutlineButton({
  href,
  children,
  external = true,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#111827] bg-transparent px-7 py-3.5 text-base font-semibold text-[#111827] transition-colors hover:bg-white/60"
    >
      {children}
      {external ? <ExternalLink className="h-4 w-4" strokeWidth={2} /> : null}
    </a>
  )
}

function PlatformCardIllustration({
  src,
  fallback,
  alt,
}: {
  src: string
  fallback: string
  alt: string
}) {
  const [imgSrc, setImgSrc] = useState(src)

  useEffect(() => {
    setImgSrc(src)
  }, [src])

  return (
    <div className="flex h-[260px] items-center justify-center bg-white px-10 py-8 sm:h-[280px] lg:h-[300px]">
      <img
        src={imgSrc}
        alt={alt}
        onError={() => setImgSrc(fallback)}
        className="max-h-[220px] w-full max-w-[300px] object-contain sm:max-h-[240px] lg:max-h-[260px]"
        loading="lazy"
      />
    </div>
  )
}

function PlatformSection() {
  return (
    <section
      id="features"
      className="bg-gradient-to-b from-[#f3f0fa] to-[#faf9f7] py-20 sm:py-24 lg:py-28"
    >
      <div className={marketingContainer}>
        <div className="mx-auto max-w-[780px] text-center">
          <h2
            id="how-it-works"
            className="text-[2rem] font-bold leading-[1.14] tracking-[-0.02em] text-[#111827] sm:text-[2.35rem] lg:text-[2.65rem] lg:leading-[1.12]"
          >
            One platform to manage all your project operations
          </h2>
          <p className="mx-auto mt-5 max-w-[680px] text-base leading-relaxed text-[#6b7280] sm:text-[17px] sm:leading-7">
            WorkSync removes the hassle of scattered tools, manual updates, and unclear
            ownership so your team can plan, assign, and deliver from a single workspace.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:mt-16 lg:grid-cols-3 lg:gap-6">
          {platformCards.map((card) => (
            <article
              key={card.title}
              className="group flex flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
            >
              <PlatformCardIllustration
                src={card.image}
                fallback={card.fallback}
                alt={card.imageAlt}
              />
              <div className="flex flex-1 flex-col border-t border-[#f3f4f6] px-8 pb-9 pt-8">
                <h3 className="text-[1.2rem] font-semibold leading-snug tracking-tight text-[#111827] sm:text-[1.25rem]">
                  {card.title}
                </h3>
                <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[#6b7280]">
                  {card.description}
                </p>
                <Link
                  to="/register"
                  className="mt-7 inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#111827] underline-offset-4 transition-colors hover:text-[#374151] hover:underline"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ProductPage() {
  return (
    <MarketingShell>
      {/* Hero — Deel IT-style: flat lavender, copy left, team flow illustration right */}
      <section className="bg-[#ebe4ff]">
        <div
          className={cn(
            marketingContainer,
            'grid items-center gap-10 py-10 sm:gap-12 sm:py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:py-14 xl:gap-12'
          )}
        >
          <div className="flex max-w-[580px] flex-col lg:max-w-[640px] xl:max-w-[680px]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7280] sm:text-[15px]">
              WorkSync Platform
            </p>
            <h1 className="mt-4 text-[2.35rem] font-bold leading-[1.1] tracking-[-0.025em] text-[#111827] sm:text-[2.75rem] lg:text-[3.15rem] lg:leading-[1.08] xl:text-[3.5rem]">
              Unleash your team&apos;s full potential with WorkSync
            </h1>
            <p className="mt-6 max-w-[580px] text-lg leading-relaxed text-[#374151] sm:text-xl sm:leading-8 lg:mt-7">
              Plan projects, assign work, and keep distributed teams aligned without
              juggling spreadsheets, chat threads, and disconnected tools.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-9">
              <PrimaryButton to="/register">Get started free</PrimaryButton>
              <OutlineButton href="#features">See how it works</OutlineButton>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <img
              src={IMAGES.heroGlobalTeams}
              alt="WorkSync connects team members across projects with shared workspace access"
              className="w-full max-w-[560px] object-contain lg:max-w-[620px] xl:max-w-[680px]"
            />
          </div>
        </div>
      </section>

      <PlatformSection />

      {/* Two-column value prop */}
      <section className="bg-[#fafafa] py-20 sm:py-28">
        <div className={cn(marketingContainer, 'grid items-center gap-14 lg:grid-cols-2 lg:gap-20 xl:gap-24')}>
          <div className="relative flex justify-center lg:justify-start">
            <div className="relative">
              <div
                className="pointer-events-none absolute -left-6 top-8 h-40 w-40 rounded-full bg-[#ede9fe]/80 blur-3xl"
                aria-hidden
              />
              <img
                src={IMAGES.alignment}
                alt="Remote team using WorkSync"
                className="relative w-full max-w-[600px] object-contain drop-shadow-[0_24px_56px_rgba(15,23,42,0.12)] lg:max-w-none xl:max-w-[680px]"
                loading="lazy"
              />
            </div>
          </div>

          <div className="max-w-lg lg:max-w-none">
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#111827] sm:text-4xl lg:text-[3rem] lg:leading-tight xl:text-[3.25rem]">
              Retain top talent with a great team experience
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#6b7280] sm:text-xl">
              Support employees with fair visibility, transparent growth paths, and
              development that&apos;s connected to real project needs.
            </p>
            <ul className="mt-9 space-y-5">
              {alignPoints.map((point) => (
                <li key={point} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  <span className="text-base leading-relaxed text-[#374151] sm:text-lg">{point}</span>
                </li>
              ))}
            </ul>
            <PrimaryButton to="/register" className="mt-10">
              Start your workspace
            </PrimaryButton>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section id="customers" className="bg-[#fafafa] py-24 sm:py-32">
        <div className={cn(marketingContainer, 'mx-auto max-w-[900px] text-center')}>
          <div className="mx-auto mb-8 h-1 w-12 rounded-full bg-[#ddd6fe]" aria-hidden />

          <blockquote className="mx-auto max-w-[780px] text-[1.35rem] font-semibold leading-[1.45] tracking-[-0.01em] text-[#111827] sm:text-[1.65rem] sm:leading-[1.4] lg:text-[1.85rem] lg:leading-[1.38]">
            <span className="rounded-md bg-[#ede9fe] px-2 py-0.5 box-decoration-clone">
              WorkSync has everything.
            </span>{' '}
            We went from cobbling forms together to running projects, tasks, and teams in
            one click. Having everything in one system makes us look and feel like a
            tech-forward team.
          </blockquote>

          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="flex -space-x-2">
              {[
                { initials: 'AP', bg: 'bg-violet-100', text: 'text-violet-800' },
                { initials: 'CS', bg: 'bg-amber-100', text: 'text-amber-800' },
                { initials: 'SP', bg: 'bg-sky-100', text: 'text-sky-800 ring-2 ring-[#fafafa]' },
              ].map((person) => (
                <div
                  key={person.initials}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-[#fafafa]',
                    person.bg,
                    person.text
                  )}
                  aria-hidden
                >
                  {person.initials}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-800">
                SP
              </div>
              <div className="text-left">
                <p className="text-base font-semibold text-[#111827]">Sushant Praveen</p>
                <p className="text-sm text-[#6b7280]">Founder, WorkSync early adopter</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom showcase */}
      <section className="border-t border-[#ececef] bg-[#fafafa] py-16 sm:py-20">
        <div className={marketingContainer}>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl lg:text-4xl">
                Build high-performing teams and future leaders
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#6b7280]">
                Use real-time insights to see who&apos;s performing, where gaps exist, and
                how to invest in your next generation of leaders.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#ede9fe]/40 to-[#fafafa] p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <img
                src={IMAGES.projects}
                alt="WorkSync project overview dashboard"
                className="w-full rounded-xl object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white pb-20 pt-2 sm:pb-24">
        <div className={marketingContainer}>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[#111827] px-8 py-16 text-center sm:px-14 sm:py-20 lg:px-20 lg:py-24">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/40 via-transparent to-[#312e81]/25"
              aria-hidden
            />
            <div className="relative mx-auto max-w-[640px]">
              <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                Ready to sync your team?
              </h2>
              <p className="mx-auto mt-5 max-w-[480px] text-base leading-relaxed text-white/70 sm:mt-6 sm:text-lg sm:leading-7">
                Create your organization in minutes. Invite teammates, set up projects, and
                start shipping together.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4 sm:mt-10">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-[#111827] transition-colors hover:bg-white/95"
                >
                  Create free account
                  <ArrowRight className="h-5 w-5" strokeWidth={2} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-lg border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
