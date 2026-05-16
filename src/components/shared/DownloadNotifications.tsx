'use client';

import { useEffect, useState } from 'react';
import { useDownloadStore, DownloadTask } from '@/stores/downloadStore';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function DownloadNotifications() {
  const tasksMap = useDownloadStore((s) => s.tasks);
  const tasks = Object.values(tasksMap);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || tasks.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {tasks.map((task) => (
          <DownloadTaskItem key={task.id} task={task} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function DownloadTaskItem({ task }: { task: DownloadTask }) {
  const { removeTask } = useDownloadStore();
  
  const getStatusText = () => {
    switch (task.status) {
      case 'resolving': return 'Resolving stream...';
      case 'fetching': return `Downloading... ${task.progress}%`;
      case 'tagging': return 'Adding metadata...';
      case 'done': return 'Download complete';
      case 'error': return task.error || 'Download failed';
      default: return 'Starting...';
    }
  };

  const isError = task.status === 'error';
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={cn(
        "pointer-events-auto flex items-center gap-3 p-3 rounded-xl border bg-[#111]/90 backdrop-blur-md shadow-2xl",
        isError ? "border-red-500/50" : isDone ? "border-emerald-500/50" : "border-white/10"
      )}
    >
      <div className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden bg-white/5">
        {task.track.albumCover ? (
          <img src={task.track.albumCover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs font-bold text-white/20">
            {task.track.title.charAt(0)}
          </div>
        )}
        {(task.status === 'resolving' || task.status === 'tagging') && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{task.track.title}</p>
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center justify-between gap-2">
             <p className={cn(
               "text-[10px] font-bold uppercase tracking-wider truncate",
               isError ? "text-red-400" : isDone ? "text-emerald-400" : "text-white/40"
             )}>
               {getStatusText()}
             </p>
             {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
             {isError && <AlertCircle className="h-3 w-3 text-red-400" />}
          </div>
          
          {!isDone && !isError && (
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

        </div>
      </div>

      <button 
        onClick={() => removeTask(task.id)}
        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}
