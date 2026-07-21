'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

export function RequestTasks({ requestId }: { requestId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const supabase = createClient()

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('request_tasks')
      .select('*')
      .eq('request_id', requestId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (data) setTasks(data)
  }

  useEffect(() => {
    fetchTasks()
  }, [requestId])

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const { error } = await supabase.from('request_tasks').insert({
      request_id: requestId,
      title: newTaskTitle.trim(),
      status: 'Pending'
    })

    if (error) {
      toast.error(error.message)
    } else {
      setNewTaskTitle('')
      setIsAdding(false)
      fetchTasks()
    }
  }

  const removeTask = async (taskId: string) => {
    await supabase.from('request_tasks').delete().eq('id', taskId)
    fetchTasks()
  }

  const toggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed'
    await supabase
      .from('request_tasks')
      .update({ status: newStatus, completed_at: newStatus === 'Completed' ? new Date().toISOString() : null })
      .eq('id', task.id)
    fetchTasks()
  }

  return (
    <div className="brutal-card bg-white p-6">
      <div className="flex items-center justify-between mb-4 border-b-4 border-black pb-2">
        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <CheckSquare className="w-4 h-4" /> Checklist Tasks
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 border-2 border-transparent hover:border-black transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={addTask} className="mb-4 flex gap-2">
          <input 
            type="text" 
            placeholder="New task title..." 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="brutal-input flex-1 py-2 px-3 text-sm font-bold"
            autoFocus
          />
          <button type="submit" className="brutal-button py-2 px-4 bg-black text-white text-xs">Save</button>
        </form>
      )}

      <div className="space-y-2">
        {tasks.length === 0 && !isAdding && (
          <span className="text-xs font-bold text-black/40 uppercase">No tasks available</span>
        )}
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={cn(
              "border-2 border-black p-3 flex items-center justify-between transition-all",
              task.status === 'Completed' ? "bg-slate-100 opacity-60" : "bg-white"
            )}
          >
            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleTaskStatus(task)}>
              <div className="w-5 h-5 flex items-center justify-center border-2 border-black bg-white shrink-0">
                {task.status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-black" />}
              </div>
              <span className={cn(
                "font-bold text-sm",
                task.status === 'Completed' && "line-through"
              )}>
                {task.title}
              </span>
            </div>
            <button 
              onClick={() => removeTask(task.id)} 
              className="p-2 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0 border-2 border-transparent hover:border-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
