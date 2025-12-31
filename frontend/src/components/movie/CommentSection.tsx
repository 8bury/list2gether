import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { Comment } from './Comment'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getComments, createComment, updateComment, deleteComment, type CommentDTO } from '@/services/lists'

interface CommentSectionProps {
  listId: number
  movieId: number
  currentUserId: number | null
  currentUserName: string | null
  currentUserAvatarUrl: string | null
  isOpen: boolean
}

export function CommentSection({ listId, movieId, currentUserId, currentUserName, currentUserAvatarUrl, isOpen }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentDTO[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentInput, setCommentInput] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)
  const commentsLoadedRef = useRef(false)

  // Load comments when section opens
  useEffect(() => {
    if (isOpen && !commentsLoadedRef.current) {
      commentsLoadedRef.current = true
      setCommentsLoading(true)
      getComments(listId, movieId, { limit: 50 })
        .then((res) => {
          setComments(res.comments)
          setCommentsTotal(res.pagination.total)
        })
        .catch(() => {})
        .finally(() => setCommentsLoading(false))
    }
  }, [isOpen, listId, movieId])

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || commentSubmitting) return
    setCommentSubmitting(true)
    try {
      const res = await createComment(listId, movieId, commentInput.trim())
      setComments((prev) => [res.comment, ...prev])
      setCommentsTotal((prev) => prev + 1)
      setCommentInput('')
    } catch {}
    setCommentSubmitting(false)
  }

  const handleEditComment = async (commentId: number, content: string) => {
    setEditingCommentId(commentId)
    setCommentSubmitting(true)
    try {
      const res = await updateComment(listId, movieId, commentId, content)
      setComments((prev) => prev.map((c) => (c.id === commentId ? res.comment : c)))
    } catch {}
    setEditingCommentId(null)
    setCommentSubmitting(false)
  }

  const handleDeleteComment = async (commentId: number) => {
    setDeletingCommentId(commentId)
    try {
      await deleteComment(listId, movieId, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setCommentsTotal((prev) => prev - 1)
    } catch {}
    setDeletingCommentId(null)
  }

  return (
    <div className="border-t border-white/10 pt-4 mt-4">
      <h4 className="text-sm font-semibold text-neutral-100 mb-4 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        Comentários
        {commentsTotal > 0 && (
          <span className="text-xs font-normal text-neutral-400">({commentsTotal})</span>
        )}
      </h4>

      {/* New comment input */}
      <div className="flex gap-3 mb-4">
        <UserAvatar
          avatarUrl={currentUserAvatarUrl}
          name={currentUserName || '?'}
          size="sm"
        />
        <div className="flex-1 space-y-2">
          <Textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Compartilhe sua opinião sobre este filme..."
            className="min-h-[70px] resize-none bg-white/5 border-white/10 focus:border-white/20 placeholder:text-neutral-600"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmitComment()
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">Ctrl+Enter para enviar</span>
            <Button
              size="sm"
              onClick={handleSubmitComment}
              disabled={!commentInput.trim() || commentSubmitting}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {commentSubmitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      {commentsLoading ? (
        <div className="text-sm text-neutral-400 text-center py-8">
          Carregando comentários...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-neutral-500 text-center py-8 italic border border-dashed border-white/10 rounded-lg">
          Nenhum comentário ainda. Seja o primeiro!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              isEditing={editingCommentId === comment.id && commentSubmitting}
              isDeleting={deletingCommentId === comment.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
