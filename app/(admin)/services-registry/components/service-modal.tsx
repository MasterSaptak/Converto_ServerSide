'use client'

import { useState } from 'react'
import { Plus, Pencil, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createService, updateService, deactivateService, type ServiceFormData } from '../actions'

export function ServiceModal({ service }: { service?: any }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!service

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data: ServiceFormData = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      slug: formData.get('slug') as string,
      description: (formData.get('description') as string) || undefined,
      route: (formData.get('route') as string) || undefined,
      color: (formData.get('color') as string) || undefined,
      sort_order: parseInt((formData.get('sort_order') as string) || '0', 10),
      is_active: formData.get('is_active') === 'on',
      requires_documents: formData.get('requires_documents') === 'on',
      requires_payment: formData.get('requires_payment') === 'on',
    }

    let result;
    if (isEditing) {
      result = await updateService(service.id, data)
    } else {
      result = await createService(data)
    }

    setIsSubmitting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Service ${isEditing ? 'updated' : 'created'} successfully`)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={isEditing ? (
          <button className="p-2 border-2 border-transparent hover:border-foreground hover:bg-accent transition-colors" title="Edit Service">
            <Pencil className="w-4 h-4" />
          </button>
        ) : (
          <button className="brutal-button bg-primary text-primary-foreground flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        )}
      />
      <DialogContent className="sm:max-w-[600px] border-4 border-foreground rounded-none shadow-[8px_8px_0px_var(--color-foreground)] p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 border-b-4 border-foreground bg-accent">
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
            {isEditing ? 'Edit Service' : 'Create New Service'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-card">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Name *</label>
              <input 
                name="name" 
                defaultValue={service?.name} 
                required 
                className="brutal-input w-full"
                placeholder="e.g. Money Exchange"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Code *</label>
              <input 
                name="code" 
                defaultValue={service?.code} 
                required 
                className="brutal-input w-full"
                placeholder="e.g. exchange"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Slug *</label>
              <input 
                name="slug" 
                defaultValue={service?.slug} 
                required 
                className="brutal-input w-full"
                placeholder="e.g. exchange"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Route</label>
              <input 
                name="route" 
                defaultValue={service?.route} 
                className="brutal-input w-full"
                placeholder="e.g. /services/exchange"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Color (Hex)</label>
              <div className="flex gap-2">
                <input 
                  type="color"
                  name="color" 
                  defaultValue={service?.color || '#000000'}
                  className="w-12 h-12 p-1 border-2 border-foreground bg-background cursor-pointer"
                />
                <input 
                  type="text"
                  name="color_text"
                  defaultValue={service?.color}
                  placeholder="#000000"
                  className="brutal-input flex-1"
                  onChange={(e) => {
                    const colorInput = e.target.previousElementSibling as HTMLInputElement;
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      colorInput.value = e.target.value;
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest">Sort Order</label>
              <input 
                name="sort_order" 
                type="number"
                defaultValue={service?.sort_order || 0} 
                className="brutal-input w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest">Description</label>
            <textarea 
              name="description" 
              defaultValue={service?.description} 
              className="brutal-input w-full resize-none h-20"
              placeholder="Brief description of the service"
            />
          </div>

          <div className="space-y-4 pt-4 border-t-2 border-border">
            <h4 className="font-bold uppercase tracking-widest text-sm">Configuration</h4>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="is_active" defaultChecked={service ? service.is_active : true} className="w-5 h-5 border-2 border-foreground accent-primary" />
              <span className="font-bold text-sm">Is Active (Visible to users)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="requires_documents" defaultChecked={service?.requires_documents} className="w-5 h-5 border-2 border-foreground accent-primary" />
              <span className="font-bold text-sm">Requires Documents</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="requires_payment" defaultChecked={service ? service.requires_payment : true} className="w-5 h-5 border-2 border-foreground accent-primary" />
              <span className="font-bold text-sm">Requires Payment</span>
            </label>
          </div>

          <div className="pt-6 border-t-2 border-border flex justify-end gap-4">
            <button 
              type="button" 
              onClick={() => setOpen(false)}
              className="px-6 py-2 border-2 border-foreground font-bold hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="brutal-button bg-primary text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Service')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeactivateButton({ id, isActive }: { id: string, isActive: boolean }) {
  const [isPending, setIsPending] = useState(false)

  if (!isActive) return null

  return (
    <button 
      onClick={async () => {
        if (!confirm("Are you sure you want to deactivate this service? Users won't be able to see it.")) return
        
        setIsPending(true)
        const result = await deactivateService(id)
        setIsPending(false)
        
        if (result.error) toast.error(result.error)
        else toast.success("Service deactivated")
      }}
      disabled={isPending}
      className="p-2 border-2 border-transparent hover:border-foreground hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
      title="Deactivate Service"
    >
      <PowerOff className="w-4 h-4" />
    </button>
  )
}
