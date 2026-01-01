import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getRelativeTime } from '@/lib/utils'
import type { CommentDTO } from '@/services/lists'

interface CommentProps {
  comment: CommentDTO
  currentUserId: number | null
  onEdit: (commentId: number, content: string) => Promise<void>
  onDelete: (commentId: number) => Promise<void>
  isEditing: boolean
  isDeleting: boolean
}

function getDisplayName(comment: CommentDTO) {
  return comment.user?.username || comment.user?.email || `Usuário #${comment.user_id}`
}

export function Comment({ comment, currentUserId, onEdit, onDelete, isEditing, isDeleting }: CommentProps) {
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!editContent.trim()) return
    setLocalError(null)
    try {
      await onEdit(comment.id, editContent.trim())
      setEditMode(false)
    } catch (err) {
      console.error('Failed to update comment:', err)
      setLocalError('Falha ao salvar comentário. Tente novamente.')
    }
  }

  const handleCancel = () => {
    setEditContent(comment.content)
    setEditMode(false)
    setLocalError(null)
  }


  const isOwn = currentUserId === comment.user_id

  return (
    <div className="flex gap-3 group">
      <UserAvatar
        avatarUrl={comment.user?.avatar_url}
        name={getDisplayName(comment)}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-neutral-100">{getDisplayName(comment)}</span>
          <span className="text-xs text-neutral-500">{getRelativeTime(comment.created_at)}</span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-xs text-neutral-600 italic">(editado)</span>
          )}
        </div>

        {editMode ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={`min-h-[60px] ${localError ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
              autoFocus
            />
            {localError && (
              <p className="text-xs text-rose-400">{localError}</p>
            )}
            <div className="flex gap-2">

              <Button
                size="sm"
                onClick={handleSave}
                disabled={!editContent.trim() || isEditing}
              >
                {isEditing ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isEditing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-300 mt-1 whitespace-pre-line break-words leading-relaxed">
              {comment.content}
            </p>
            {isOwn && (
              <div className="mt-2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setLocalError(null)
                    setEditMode(true)
                  }}

                  className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
