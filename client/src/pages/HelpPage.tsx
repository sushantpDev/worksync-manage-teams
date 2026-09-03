import {
  ChevronDown,
  ExternalLink,
  LifeBuoy,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { MobileNavToggle } from '../components/layout/Sidebar'

const helpImages = {
  hero: '/images/help/worksync-help-hero.png',
  organized: '/images/help/worksync-help-organized.png',
  setup: '/images/help/worksync-help-setup.png',
  tasks: '/images/help/worksync-help-tasks.png',
  chat: '/images/help/worksync-help-chat.png',
  reports: '/images/help/worksync-help-reports.png',
}

const benefitItems = [
  {
    title: 'Find answers faster',
    description: 'Use guided help for projects, tasks, teams, reports, and account settings.',
    icon: Search,
  },
  {
    title: 'Get unstuck with context',
    description: 'Follow workflows built around how your WorkSync workspace is organized.',
    icon: LifeBuoy,
  },
  {
    title: 'Keep everyone aligned',
    description: 'Share repeatable steps so managers and members work from the same playbook.',
    icon: ShieldCheck,
  },
]

const workflowSteps = [
  {
    step: 'Step 1:',
    title: 'Set up your workspace',
    description:
      'Create your organization, add departments, and invite members with the right roles from the start.',
    visual: 'setup',
  },
  {
    step: 'Step 2:',
    title: 'Plan and assign work',
    description:
      'Create projects, break work into tasks, assign owners, and keep due dates visible for the team.',
    visual: 'tasks',
  },
  {
    step: 'Step 3:',
    title: 'Collaborate in one place',
    description:
      'Use team channels and direct messages to discuss blockers without losing project context.',
    visual: 'chat',
  },
  {
    step: 'Step 4:',
    title: 'Review progress',
    description:
      'Use reports and dashboards to understand workload, completion rate, overdue tasks, and project health.',
    visual: 'reports',
  },
]

const faqs = [
  {
    question: 'How do I invite a new teammate?',
    answer:
      'Go to People and select Invite member. Enter their email address and choose the appropriate role. They will receive an invitation to join your WorkSync organization.',
  },
  {
    question: 'How do roles and permissions work?',
    answer:
      'WorkSync uses Admin, Manager, Member, and Viewer roles. Each role controls what a person can view or manage, helping keep projects, tasks, teams, and organization settings secure.',
  },
  {
    question: 'Can I move a task between projects?',
    answer:
      'Tasks are created within a specific project. If moving tasks between projects is not currently supported, create the task in the required project instead.',
  },
  {
    question: 'Where can I see overdue work?',
    answer:
      'Your Dashboard highlights overdue tasks and work that needs attention. You can also use task views and filters to find work based on status, priority, and due date.',
  },
  {
    question: 'How do team channels stay organized?',
    answer:
      'Communication channels are connected to your Teams. Each team has its own channels for focused discussions, while direct messages let teammates communicate privately.',
  },
  {
    question: 'Can I change my organization settings later?',
    answer:
      'Yes. Organization settings can be managed from Settings, subject to your role and permissions. Changes are applied to the current WorkSync organization.',
  },
]

function HelpVisual({ type }: { type: string }) {
  const image = helpImages[type as keyof typeof helpImages] ?? helpImages.setup
  return (
    <div className="overflow-hidden rounded-[28px] bg-[#fff0d2]">
      <img
        src={image}
        alt=""
        className="aspect-[3/2] h-full min-h-[260px] w-full object-cover"
        draggable={false}
      />
    </div>
  )
}

export function HelpPage() {
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  return (
    <div>
      <div className="mb-8 flex items-start gap-3">
        <MobileNavToggle
          open={mobileNavOpen}
          onToggle={() => setMobileNavOpen(!mobileNavOpen)}
        />
        <div>
          <h1 className="text-[2.35rem] font-semibold leading-tight text-[#07111f]">
            Help Center
          </h1>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#ead8b9] bg-[#fff0d2]">
        <div className="flex flex-col gap-8 p-8 lg:min-h-[405px] lg:flex-row lg:items-center lg:justify-between lg:p-9">
          <div className="lg:max-w-[720px] lg:pr-8">
            <h2 className="max-w-2xl text-[2.45rem] font-semibold leading-[1.15] text-[#07111f]">
              Learn WorkSync faster and keep your team moving
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#1f2937]">
              Find practical guidance for setting up projects, organizing teams, managing tasks,
              and reviewing progress from one clear help center.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2f2f2f]">
                Browse guides
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-[#1a1a1a] bg-transparent px-5 py-3 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-white/50">
                Contact support
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#344054]">
              New to WorkSync? Start with workspace setup and project basics.
            </p>
          </div>

          <div className="mx-auto h-[260px] w-full max-w-[560px] shrink-0 overflow-hidden rounded-[28px] lg:mx-0 lg:h-[300px] lg:w-[520px]">
            <img
              src={helpImages.hero}
              alt=""
              className="h-full w-full object-cover object-center"
              draggable={false}
            />
          </div>
        </div>

        <div className="grid border-t border-[#ead8b9] bg-white lg:grid-cols-3">
          {benefitItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="flex min-h-[220px] flex-col border-[#e1e4ea] px-10 py-9 lg:border-r lg:last:border-r-0"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#e1e4ea] bg-white text-[#1f2937]">
                  <Icon className="h-7 w-7" strokeWidth={2.1} />
                </span>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-[#07111f]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#667085]">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-12 rounded-[28px] bg-white px-8 py-12">
        <div className="help-feature-split">
          <div className="max-w-[560px]">
            <h2 className="max-w-lg text-[2.35rem] font-semibold leading-[1.12] text-[#07111f]">
              Organized help for every part of your workspace.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#667085]">
              WorkSync help covers the admin setup, everyday project execution, team collaboration,
              and the reporting habits that keep delivery predictable.
            </p>
          </div>
          <div className="help-feature-visual overflow-hidden rounded-[26px]">
            <img
              src={helpImages.organized}
              alt=""
              className="aspect-[16/9] w-full object-cover"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-[28px] bg-white px-8 py-10">
        <h2 className="text-center text-[2.15rem] font-semibold leading-tight text-[#07111f]">
          How WorkSync support guides your team
        </h2>
        <div className="mt-12 space-y-16">
          {workflowSteps.map((step, index) => {
            const visual = <HelpVisual type={step.visual} />
            const copy = (
              <div>
                <p className="text-xl text-[#667085]">{step.step}</p>
                <h3 className="mt-3 text-[2rem] font-semibold leading-tight text-[#07111f]">
                  {step.title}
                </h3>
                <p className="mt-6 max-w-xl text-sm leading-7 text-[#667085]">
                  {step.description}
                </p>
              </div>
            )

            return (
              <div
                key={step.title}
                className="grid items-center gap-10 lg:grid-cols-2"
              >
                {index % 2 === 0 ? (
                  <>
                    {copy}
                    {visual}
                  </>
                ) : (
                  <>
                    {visual}
                    {copy}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-8 px-8 py-10 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <h2 className="text-[2rem] font-semibold text-[#1a1a1a]">FAQs</h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#667085]">
            Clear answers to common questions about setup, permissions, task workflows, and
            workspace reporting.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl bg-[#f7f7f7] px-5 py-4 transition-colors open:bg-white open:shadow-[0_14px_35px_rgba(15,23,42,0.08)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-[#07111f] [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#667085]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 bg-[#f3f2f0] px-8 py-12 text-center">
        <h2 className="text-[2rem] font-semibold leading-tight text-[#07111f]">
          Ready to make WorkSync easier for your whole team?
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-[#667085]">
          Start with the setup guides, then use task, team, and reporting help as your workspace grows.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2f2f2f]">
            Browse help guides
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#1a1a1a] px-5 py-3 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-white">
            Ask support
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  )
}
