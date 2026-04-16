import { useState, useEffect, useCallback } from "react";
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  addDays 
} from "date-fns";
import { ChevronLeft, ChevronRight, PenLine, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import DayCell from "./DayCell";
import { generateDesignTerms } from "../lib/gemini";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export type ImageEntry = {
  id: string;
  weekStart: string;
  dayOfWeek: string;
  imageUrl: string;
  createdAt: number;
};

export type TermEntry = {
  id: string;
  imageId: string;
  term: string;
};

export default function ClipboardPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekKey = format(weekStart, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/week/${weekKey}`);
      const data = await res.json();
      setImages(data.images || []);
      setTerms(data.terms || []);
      setNotes(data.notes || "");
    } catch (e) {
      console.error("Failed to load data", e);
      toast.error("Failed to load week data");
    }
  }, [weekKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveNotes = async (content: string) => {
    setNotes(content);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: weekKey, content }),
      });
    } catch(e) {
      console.error("Failed to save notes", e);
    }
  };

  const handleImagePaste = async (file: File, dayOfWeek: string) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64DataUrl = e.target?.result as string;
      
      const id = crypto.randomUUID();
      const base64Image = base64DataUrl.split(',')[1];
      const mimeType = file.type;

      // 1. Generate terms from Gemini
      let generatedTerms: string[] = [];
      try {
        generatedTerms = await generateDesignTerms(base64Image, mimeType);
        toast.success(`AI generated ${generatedTerms.length} terms`);
      } catch (err) {
        toast.error("Failed to generate terms");
      }

      // 2. Save to backend
      try {
        const res = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            weekStart: weekKey,
            dayOfWeek,
            imageUrl: base64DataUrl,
            generatedTerms
          }),
        });
        const data = await res.json();
        if (data.success) {
          fetchData(); // Reload to get new image and terms
        }
      } catch (err) {
        toast.error("Failed to save image");
      }
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteTerm = async (termId: string) => {
    try {
      await fetch(`/api/terms/${termId}`, { method: "DELETE" });
      setTerms(prev => prev.filter(t => t.id !== termId));
    } catch(e) {
      toast.error("Failed to delete term");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await fetch(`/api/images/${imageId}`, { method: "DELETE" });
      setImages(prev => prev.filter(i => i.id !== imageId));
      setTerms(prev => prev.filter(t => t.imageId !== imageId));
      toast.success("Image removed");
    } catch(e) {
      toast.error("Failed to delete image");
    }
  };

  // Days layout
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const weekRangeLabel = `${format(weekStart, "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-5 flex-none pb-3 border-b-2 border-dashed border-amber-300">
        <div className="flex items-baseline gap-3">
          <h1 className="font-handwriting text-[32px] font-extrabold text-[#92400e] dark:text-amber-300">
            WEEK {format(weekStart, "w")}
          </h1>
          <span className="text-[14px] uppercase tracking-[1px] opacity-80 text-[#92400e] dark:text-amber-300">
            {weekRangeLabel}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-4 py-1.5 bg-white dark:bg-[#4b2c20] hover:bg-amber-50 dark:hover:bg-amber-900 rounded-[99px] border border-amber-300 shadow-[0_2px_0_theme(colors.amber.200)] transition-colors text-[#92400e] dark:text-amber-300 text-[12px] mr-2"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="px-4 py-1.5 bg-white dark:bg-[#4b2c20] hover:bg-amber-50 dark:hover:bg-[#3a2218] rounded-[99px] border border-amber-300 shadow-[0_2px_0_theme(colors.amber.200)] transition-colors text-[#92400e] dark:text-amber-300 text-[12px]"
            >
              Previous
            </button>
            <button 
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="px-4 py-1.5 bg-white dark:bg-[#4b2c20] hover:bg-amber-50 dark:hover:bg-[#3a2218] rounded-[99px] border border-amber-300 shadow-[0_2px_0_theme(colors.amber.200)] transition-colors text-[#92400e] dark:text-amber-300 text-[12px]"
            >
              Next Week
            </button>
            <button
              onClick={() => {
                const el = document.querySelector('input[type="file"]') as HTMLInputElement;
                if(el) el.click();
              }}
              className="px-4 py-1.5 bg-amber-300 dark:bg-amber-600 hover:bg-amber-400 dark:hover:bg-amber-700 rounded-[99px] border border-[#92400e] shadow-[0_2px_0_theme(colors.amber.200)] transition-colors text-[#92400e] dark:text-white text-[12px] font-medium hidden md:block"
            >
              New Memory +
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid area with Resizable Panels */}
      <div className="flex-1 min-h-0 bg-transparent flex flex-col relative w-full h-full">
        
        <ResizablePanelGroup direction="vertical" className="relative z-10 w-full h-full">
          {/* Top Panel: Calendar Grid */}
          <ResizablePanel defaultSize={75} minSize={30}>
            <div className="h-full flex flex-col p-6 gap-6 overflow-y-auto">
              
              {/* Row 1: Mon, Tue, Wed */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[300px]">
                {weekDays.slice(0, 3).map((date) => {
                  const dayName = format(date, "EEEE");
                  return (
                    <DayCell 
                      key={dayName}
                      date={date}
                      dayName={dayName}
                      images={images.filter(img => img.dayOfWeek === dayName)}
                      terms={terms}
                      onPaste={(file) => handleImagePaste(file, dayName)}
                      onDeleteTerm={handleDeleteTerm}
                      onDeleteImage={handleDeleteImage}
                      isLoading={isLoading}
                    />
                  );
                })}
              </div>

              {/* Row 2: Thu, Fri, Weekend */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[300px]">
                <DayCell 
                  date={weekDays[3]}
                  dayName="Thursday"
                  images={images.filter(img => img.dayOfWeek === "Thursday")}
                  terms={terms}
                  onPaste={(file) => handleImagePaste(file, "Thursday")}
                  onDeleteTerm={handleDeleteTerm}
                  onDeleteImage={handleDeleteImage}
                  isLoading={isLoading}
                />
                <DayCell 
                  date={weekDays[4]}
                  dayName="Friday"
                  images={images.filter(img => img.dayOfWeek === "Friday")}
                  terms={terms}
                  onPaste={(file) => handleImagePaste(file, "Friday")}
                  onDeleteTerm={handleDeleteTerm}
                  onDeleteImage={handleDeleteImage}
                  isLoading={isLoading}
                />
                <DayCell 
                  date={`${format(weekDays[5], "d")} - ${format(weekDays[6], "d")}`}
                  dayName="Weekend"
                  images={images.filter(img => img.dayOfWeek === "Weekend")}
                  terms={terms}
                  onPaste={(file) => handleImagePaste(file, "Weekend")}
                  onDeleteTerm={handleDeleteTerm}
                  onDeleteImage={handleDeleteImage}
                  isLoading={isLoading}
                />
              </div>

            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-amber-300 dark:bg-amber-800 transition-colors h-1.5" withHandle />
          
          {/* Bottom Panel: Notes */}
          <ResizablePanel defaultSize={25} minSize={10} className="mt-4">
            <div 
              className="h-full bg-white dark:bg-[#3a2218] rounded-xl p-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] flex flex-col relative"
              style={{ backgroundImage: "linear-gradient(#fef3c7 1px, transparent 1px)", backgroundSize: "100% 28px" }}
            >
              <div className="absolute -top-[12px] left-6 bg-amber-300 px-3 py-0.5 rounded-[4px] font-handwriting font-bold text-[#92400e] text-[14px]">
                Inspiration Journal
              </div>
              <textarea
                value={notes}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="Write your inspirations here..."
                className="flex-1 w-full bg-transparent resize-none focus:outline-none font-handwriting text-[18px] text-[#333] dark:text-amber-100 mt-2"
                style={{ lineHeight: "28px" }}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-amber-100"
          >
            <div className="w-5 h-5 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin"></div>
            <span className="font-medium text-amber-800">AI is analyzing image...</span>
          </motion.div>
        </div>
      )}
    </div>
  );
}
