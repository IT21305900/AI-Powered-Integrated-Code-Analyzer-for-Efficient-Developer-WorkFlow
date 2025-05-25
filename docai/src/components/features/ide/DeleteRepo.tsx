'use client'

import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DeleteRepository } from '@/lib/actions/repo.action'

export const DeleteRepo = ({ repository }: { repository: string }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleDelete = () => {
        startTransition(async () => {
            try {
                const result = await DeleteRepository(repository)

                if (result.success) {
                    toast.success(result.message)
                    setIsOpen(false)

                    // Redirect to home page after successful deletion
                    router.push('/')
                } else {
                    toast.error(result.message)
                }
            } catch (error) {
                toast.error('An unexpected error occurred')
                console.error('Delete error:', error)
            }
        })
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    size="sm"
                    className="ml-3 border border-red-600"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Repo
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Repository</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete the repository "{repository}"?
                        This action cannot be undone and will permanently remove all files and folders
                        associated with this repository.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                        Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700 border border-red-700"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Repository'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}