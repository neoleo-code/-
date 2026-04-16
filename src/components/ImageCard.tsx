import { useState, useRef, useEffect, MouseEvent } from "react";
import { ImageEntry, TermEntry } from "./ClipboardPlanner";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ImageCardProps {
  key?: string;
  image: ImageEntry;
  terms: TermEntry[];
  onDeleteTerm: (id: string) => void;
  onDeleteImage: (id: string) => void;
}

const DECORATION_VARIANTS = ["washi-tape-1", "washi-tape-2", "pin", "paperclip"];

export default function ImageCard({ image, terms, onDeleteTerm, onDeleteImage }: ImageCardProps) {
  const [decoration] = useState(() => DECORATION_VARIANTS[Math.floor(Math.random() * DECORATION_VARIANTS.length)]);
  const [rotation] = useState(() => (Math.random() * 4 - 2).toFixed(1)); // -2 to 2 degrees
  const [isHovering, setIsHovering] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemoveImage = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDeleteImage(image.id);
  };

  const displayedTerms = isHovering ? terms : terms.slice(0, 1);
  const hiddenCount = terms.length - 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative z-10 flex gap-3 pointer-events-auto"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Polaroid Container */}
      <div 
        className="relative bg-white p-2 pb-6 shadow-[0_4px_10px_rgba(0,0,0,0.1)] shrink-0 transition-transform hover:z-20 w-[140px] dark:bg-[#fff9f0]"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Delete Image button - shown on hover */}
        <AnimatePresence>
          {isHovering && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 z-30"
              title="Delete image"
            >
              <X className="w-3 h-3" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Random Decoration */}
        {decoration.startsWith('washi-tape') && (
          <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-[60px] h-[18px] bg-[rgba(253,230,138,0.6)] dark:bg-[rgba(253,230,138,0.3)] z-50 border-l-2 border-r-2 border-dotted border-black/10" style={{ transform: 'translateX(-50%) rotate(2deg)' }}></div>
        )}
        {decoration === "pin" && (
          <div className="absolute top-2 right-2 w-[12px] h-[12px] rounded-full bg-[#ef4444] shadow-[2px_2px_4px_rgba(0,0,0,0.2)] z-50">
             <div className="absolute top-[2px] left-[2px] w-[3px] h-[3px] bg-white/50 rounded-full" />
          </div>
        )}
        {decoration === "paperclip" && (
          <div className="absolute -top-3 left-6 z-50 transform rotate-12">
             <div className="w-3 h-10 border-2 border-gray-400 rounded-full" />
             <div className="absolute top-1 left-1 w-2 h-7 border-2 border-gray-500 rounded-full" />
          </div>
        )}
        
        {/* Image */}
        <div className="w-full aspect-square bg-[#eee] overflow-hidden relative">
          <img 
            src={image.imageUrl} 
            alt="Inspiration" 
            className="w-full h-full object-cover block" 
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Terms Tags Area */}
      <div className="absolute left-[160px] top-[45px] flex flex-col gap-1 z-30 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {displayedTerms.map((term) => (
            <motion.div
              layout
              key={term.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="group relative inline-flex items-center bg-[#92400e] text-white text-[10px] px-2 py-[2px] rounded-[4px] font-sans whitespace-nowrap shadow-[2px_2px_0px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-amber-900 transition-colors self-start"
              onClick={(e) => handleCopy(e, term.term, term.id)}
            >
              <span className="mr-1">{term.term}</span>
              
              {copiedId === term.id ? (
                <Check className="w-3 h-3 opacity-70" />
              ) : (
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              )}

              {/* Delete Term */}
              {isHovering && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDeleteTerm(term.id);
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-red-200 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
          
          {!isHovering && hiddenCount > 0 && (
            <motion.div
              layout
              key="more-count"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center bg-white text-[#92400e] border border-[#92400e] text-[10px] px-2 py-[2px] rounded-[4px] font-sans shadow-[2px_2px_0px_rgba(0,0,0,0.1)] self-start"
            >
              +{hiddenCount}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
