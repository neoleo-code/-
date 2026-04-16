import { DragEvent, useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { ImageEntry, TermEntry } from "./ClipboardPlanner";
import ImageCard from "./ImageCard";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface DayCellProps {
  key?: string;
  date: Date | string | null;
  dayName: string;
  images: ImageEntry[];
  terms: TermEntry[];
  onPaste: (file: File) => void;
  onDeleteTerm: (termId: string) => void;
  onDeleteImage: (imageId: string) => void;
  isLoading: boolean;
}

export default function DayCell({ date, dayName, images, terms, onPaste, onDeleteTerm, onDeleteImage, isLoading }: DayCellProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Helper handling file
  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return;
    }
    onPaste(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Setup generic paste listener
  const handleGlobalPaste = useCallback((e: ClipboardEvent) => {
    // Only capture if hovering or active, but since it's global let's check
    // we want to paste directly to this cell if we're focused? 
    // Actually, handling click-to-upload or dragging is safer for multiple cells.
    // We'll also allow clicking to upload.
  }, []);

  const dateLabel = typeof date === 'string' ? date : (date ? format(date, "d") : "");

  return (
    <div 
      className={`relative flex flex-col w-full h-full rounded-[8px] p-3 transition-colors duration-300 min-h-[180px] overflow-hidden ${
        dayName === "Weekend" ? "bg-[rgba(253,230,138,0.3)] dark:bg-[rgba(253,230,138,0.05)] border border-dashed border-[#92400e] dark:border-amber-500" : "bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(255,255,255,0.05)] border border-[rgba(146,64,14,0.1)] dark:border-[rgba(253,230,138,0.2)]"
      } ${
        isDragging ? 'border-[#92400e]' : 'hover:bg-[rgba(255,255,255,0.6)] dark:hover:bg-[rgba(255,255,255,0.1)]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Date Header */}
      <div className="flex items-baseline justify-between mb-[10px]">
        <h3 className="font-handwriting text-[20px] text-[#92400e] dark:text-amber-400">{dayName}</h3>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative flex flex-col gap-4">
        {images.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none mt-[40px]">
            <span className="font-sans text-[12px] italic text-center">Drag photos here...</span>
          </div>
        ) : (
          images.map(img => (
            <ImageCard 
              key={img.id} 
              image={img} 
              terms={terms.filter(t => t.imageId === img.id)}
              onDeleteTerm={onDeleteTerm}
              onDeleteImage={onDeleteImage}
            />
          ))
        )}
      </div>

      {/* Hidden file input for clicking to upload */}
      <label className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Upload image for ${dayName}`}>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
               handleFile(e.target.files[0]);
            }
            e.target.value = ''; // reset
          }}
          disabled={isLoading}
        />
      </label>
      
      {/* We need to ensure ImageCard interaction sits above the label, so we fix ImageCard z-index */}
    </div>
  );
}
