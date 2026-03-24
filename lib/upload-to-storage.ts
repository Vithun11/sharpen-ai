'use client'

import { createClient } from '@/lib/supabase-browser'

/**
 * Upload files directly from the browser to Supabase Storage.
 * This bypasses Vercel's 4.5MB body size limit.
 *
 * @returns Array of storage paths for the uploaded files
 */
export async function uploadFilesToStorage(
  bucket: string,
  prefix: string,
  files: File[]
): Promise<string[]> {
  const supabase = createClient()
  const paths: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const path = `${prefix}/page-${i + 1}-${timestamp}.${ext}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error(`[upload-to-storage] Failed to upload ${file.name}:`, error)
      throw new Error(`Failed to upload file ${i + 1}: ${error.message}`)
    }

    paths.push(data.path)
  }

  return paths
}

/**
 * Upload a single file to Supabase Storage.
 * @returns The storage path
 */
export async function uploadFileToStorage(
  bucket: string,
  prefix: string,
  file: File
): Promise<string> {
  const paths = await uploadFilesToStorage(bucket, prefix, [file])
  return paths[0]
}
