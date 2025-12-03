import { ArrowDown, Phone, FileText, CheckCircle2 } from "lucide-react";

export const HeroPhone = () => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Phone container with float animation */}
      <div className="animate-phone-float relative">
        {/* Phone frame */}
        <div className="relative w-[280px] rounded-[40px] border-[8px] border-foreground/90 bg-background p-4 shadow-2xl">
          {/* Phone notch */}
          <div className="absolute left-1/2 top-2 h-6 w-20 -translate-x-1/2 rounded-full bg-foreground/90" />
          
          {/* Phone content */}
          <div className="mt-8 flex flex-col items-center space-y-6 py-8">
            {/* LinkedIn icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0A66C2] shadow-lg">
              <svg viewBox="0 0 24 24" className="h-9 w-9 text-white" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            
            {/* Arrow 1 */}
            <div className="animate-arrow-down">
              <ArrowDown className="h-6 w-6 text-eficia-violet" strokeWidth={2.5} />
            </div>
            
            {/* File icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-eficia-violet/20 shadow-lg">
              <FileText className="h-9 w-9 text-eficia-violet" />
            </div>
            
            {/* Arrow 2 */}
            <div className="animate-arrow-down" style={{ animationDelay: "0.5s" }}>
              <ArrowDown className="h-6 w-6 text-eficia-violet" strokeWidth={2.5} />
            </div>
            
            {/* Phone found result */}
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-500 shadow-lg">
              <Phone className="h-8 w-8 text-white" />
            </div>
            
            {/* Success label */}
            <div className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Phone Found</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
