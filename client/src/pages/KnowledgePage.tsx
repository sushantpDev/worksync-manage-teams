import { useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  ClipboardCheck,
  FileText,
  LayoutTemplate,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

const libraryCards = [
  {
    title: 'Docs',
    description: 'Organize product notes, operating guides, and team decisions in one place.',
    icon: FileText,
    tone: 'bg-[#bfe1ff]',
  },
  {
    title: 'Templates',
    description: 'Start faster with reusable briefs, launch plans, checklists, and retros.',
    icon: LayoutTemplate,
    tone: 'bg-[#c9b2ff]',
    badge: 'New',
  },
  {
    title: 'Resources',
    description: 'Keep links, files, references, and playbooks easy for everyone to find.',
    icon: Link2,
    tone: 'bg-[#ffe187]',
  },
  {
    title: 'Policies',
    description: 'Centralize standards for security, delivery, reviews, and approvals.',
    icon: ShieldCheck,
    tone: 'bg-[#c8f3d8]',
  },
]

const featureCards = [
  {
    title: 'Centralized knowledge hub',
    description:
      'Create a shared source of truth for processes, decisions, and reference material.',
    icon: BookOpen,
  },
  {
    title: 'Reusable team workflows',
    description:
      'Turn repeated work into templates your teams can reuse without starting from zero.',
    icon: ClipboardCheck,
  },
  {
    title: 'Connected project context',
    description:
      'Keep useful documentation close to the projects, teams, and people who need it.',
    icon: Boxes,
  },
]

const recentDocs = [
  { title: 'Sprint planning checklist', type: 'Template', status: 'Ready' },
  { title: 'Production handoff guide', type: 'Doc', status: 'Updated' },
  { title: 'Release approval policy', type: 'Policy', status: 'Review' },
]

function KnowledgeHeroVisual() {
  return (
    <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden px-6 py-8">
      <div className="absolute right-10 top-6 h-36 w-36 rounded-full bg-[#ffcf2f]" />
      <div className="absolute bottom-4 left-8 h-28 w-28 rotate-12 rounded-[2rem] bg-white/45" />
      <div className="absolute right-5 top-14 h-52 w-52 rotate-12 border border-[#ff6b35]" />

      <div className="relative w-full max-w-[430px] rounded-2xl bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between border-b border-[#eef0f4] pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
              Knowledge search
            </p>
            <p className="mt-1 text-sm font-semibold text-[#111827]">Team operating system</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ede4ff] text-[#4c2f87]">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>

        <div className="mt-4 flex h-11 items-center gap-3 rounded-xl bg-[#f5f7fb] px-3">
          <Search className="h-4 w-4 text-[#667085]" strokeWidth={2} />
          <span className="text-sm text-[#667085]">Search docs, templates, resources...</span>
        </div>

        <div className="mt-4 space-y-2">
          {recentDocs.map((doc) => (
            <div
              key={doc.title}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#eef0f4] bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">{doc.title}</p>
                <p className="mt-0.5 text-xs text-[#667085]">{doc.type}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold',
                  doc.status === 'Ready' && 'bg-[#e9f9ef] text-[#14803c]',
                  doc.status === 'Updated' && 'bg-[#e8f3ff] text-[#1670bd]',
                  doc.status === 'Review' && 'bg-[#fff3d7] text-[#a15c00]'
                )}
              >
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function KnowledgePage() {
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  return (
    <div>
      <PageHeader
        title="Knowledge"
        subtitle="Docs, templates, resources, and policies for your organization."
        mobileNavOpen={mobileNavOpen}
        onMobileNavToggle={() => setMobileNavOpen(!mobileNavOpen)}
        actions={<Button>Create doc</Button>}
      />

      <section className="overflow-hidden rounded-2xl border border-[#e1e4ea] bg-white">
        <div className="grid bg-[#ffefb8] lg:grid-cols-[1fr_0.85fr]">
          <div className="px-8 py-10 sm:px-10 lg:px-12 lg:py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#667085]">
              WorkSync knowledge
            </p>
            <h2 className="mt-5 max-w-[640px] text-[2rem] font-bold leading-[1.12] text-[#07111f] sm:text-[2.55rem]">
              Everything your team needs to work from the same playbook
            </h2>
            <p className="mt-5 max-w-[680px] text-[16px] leading-7 text-[#344054]">
              Bring docs, templates, onboarding material, and critical resources into a
              calm workspace built for fast-moving teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button>Explore library</Button>
              <Button variant="outline">
                View templates
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Button>
            </div>
          </div>

          <KnowledgeHeroVisual />
        </div>

        <div className="grid gap-px bg-[#e6e8ee] sm:grid-cols-2 xl:grid-cols-4">
          {libraryCards.map((card) => {
            const Icon = card.icon
            return (
              <article key={card.title} className="bg-white px-7 py-8">
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-full', card.tone)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171717]">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#111827]">{card.title}</h3>
                  {card.badge && (
                    <span className="rounded-full bg-[#8754d9] px-2 py-0.5 text-xs font-semibold text-white">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#667085]">{card.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-[#e1e4ea] bg-white">
        <div className="grid gap-px bg-[#e6e8ee] lg:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="bg-white px-7 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d7dce4] text-[#667085]">
                  <Icon className="h-6 w-6" strokeWidth={1.9} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#111827]">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#667085]">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-7 grid gap-7 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-2xl border border-[#e1e4ea] bg-white px-8 py-10 sm:px-10">
          <h2 className="max-w-[520px] text-[1.8rem] font-bold leading-tight text-[#07111f]">
            Streamline documentation and approvals
          </h2>
          <p className="mt-4 max-w-[640px] text-[15px] leading-7 text-[#667085]">
            Give teams a structured place to draft, review, and publish information
            without losing context across tools.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {['Drafts routed to owners', 'Resources linked to teams', 'Templates ready for reuse', 'Policies easy to audit'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl bg-[#f8fafc] px-4 py-3">
                <BadgeCheck className="h-5 w-5 text-[#16a34a]" strokeWidth={2.1} />
                <span className="text-sm font-semibold text-[#344054]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-[#fff0a8] p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ffcc2f]" />
          <div className="relative rounded-2xl bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.13)]">
            <div className="flex items-center justify-between border-b border-[#eef0f4] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a94a6]">
                  Library health
                </p>
                <p className="mt-1 text-3xl font-semibold text-[#111827]">92%</p>
              </div>
              <div className="rounded-full bg-[#f0e9ff] px-3 py-1.5 text-xs font-semibold text-[#6d45c2]">
                On track
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ['Docs reviewed', '82%'],
                ['Templates active', '68%'],
                ['Resources verified', '94%'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#344054]">{label}</span>
                    <span className="font-semibold text-[#111827]">{value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#edf0f4]">
                    <div
                      className="h-full rounded-full bg-[#111827]"
                      style={{ width: value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
