// =====================================================
// CONVERTO PLATFORM — Core Document Engine
// =====================================================

import { createClient } from '@/lib/supabase/server'
import type { Document, DocumentType } from '@/types/database'

export class DocumentService {
  /**
   * Get required document types for a specific service
   */
  static async getRequiredDocumentTypes(serviceId: string): Promise<DocumentType[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .eq('service_id', serviceId)
      .eq('required', true)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(`Failed to fetch document types: ${error.message}`)
    return data as DocumentType[]
  }

  /**
   * Log a new document upload
   */
  static async registerDocument(data: {
    order_id?: string;
    customer_id: string;
    document_type_id?: string;
    type: string;
    name: string;
    url: string;
    file_size?: number;
    mime_type?: string;
  }): Promise<Document> {
    const supabase = await createClient()

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        ...data,
        verified: false,
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to register document: ${error.message}`)
    return doc as Document
  }
}
