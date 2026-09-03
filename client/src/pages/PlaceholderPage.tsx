import { useOutletContext } from 'react-router-dom'
import { PageHeader } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/State'

export function PlaceholderPage({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  const { mobileNavOpen, setMobileNavOpen } = useOutletContext<{
    mobileNavOpen: boolean
    setMobileNavOpen: (v: boolean) => void
  }>()

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        mobileNavOpen={mobileNavOpen}
        onMobileNavToggle={() => setMobileNavOpen(!mobileNavOpen)}
      />
      <Card padding="default">
        <EmptyState
          title="Coming soon"
          description="This section is under development and will be available in a future release."
        />
      </Card>
    </div>
  )
}
