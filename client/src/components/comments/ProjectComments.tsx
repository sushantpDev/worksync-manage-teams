import { useAuth } from '../../context/AuthContext'
import { CommentsSection } from './CommentsSection'

export function ProjectComments({
  projectId,
  onCommentAdded,
}: {
  projectId: string
  onCommentAdded?: () => void
}) {
  const { user } = useAuth()
  const readOnly = user?.role === 'viewer'

  return (
    <CommentsSection
      projectId={projectId}
      readOnly={readOnly}
      onCommentAdded={onCommentAdded}
    />
  )
}
