'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, X, FileText } from 'lucide-react'
import { useUploadLibraryDocument } from '@/lib/hooks/use-documents'
import {
  LIBRARY_DOCUMENT_CATEGORY_LABELS,
  MAX_LIBRARY_DOCUMENT_SIZE,
  SUPPORTED_LIBRARY_DOCUMENT_TYPES,
  GlobalCompanyDocumentCategory,
} from '@/lib/types/documents'
import { cn } from '@/lib/utils'

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.string().optional(),
  is_template: z.boolean().default(false),
})

type UploadFormData = z.infer<typeof uploadSchema>

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
}: UploadDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const uploadMutation = useUploadLibraryDocument()

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      tags: '',
      is_template: false,
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // Validate file size
      if (file.size > MAX_LIBRARY_DOCUMENT_SIZE) {
        form.setError('root', {
          message: `File size must be less than ${MAX_LIBRARY_DOCUMENT_SIZE / 1024 / 1024}MB`,
        })
        return
      }

      // Validate file type
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const supportedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif']
      if (!fileExt || !supportedExts.includes(fileExt)) {
        form.setError('root', {
          message: `File type .${fileExt} is not supported`,
        })
        return
      }

      setSelectedFile(file)
      form.clearErrors('root')
      
      // Auto-fill title from filename
      if (!form.getValues('title')) {
        const filename = file.name.replace(/\.[^/.]+$/, '') // Remove extension
        form.setValue('title', filename)
      }
    }
  }, [form])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
    },
    maxFiles: 1,
    multiple: false,
  })

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      form.setError('root', { message: 'Please select a file to upload' })
      return
    }

    const tags = data.tags
      ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : []

    const result = await uploadMutation.mutateAsync({
      file: selectedFile,
      metadata: {
        title: data.title,
        description: data.description || undefined,
        category: data.category as GlobalCompanyDocumentCategory,
        tags,
        is_template: data.is_template,
      },
    })

    // Reset form
    form.reset()
    setSelectedFile(null)
    onOpenChange(false)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    form.clearErrors('root')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to your company library. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, GIF
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* File Upload Area */}
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  {isDragActive ? 'Drop file here' : 'Drag & drop file here'}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse (max 10MB)
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            {/* Form Fields */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Document title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(LIBRARY_DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Brief description of this document"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. insurance, liability, 2024 (comma-separated)"
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated tags for easier searching
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedFile || uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
