import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const icons = {
        success: <CheckCircle className="text-emerald-500" size={20} />,
        error: <XCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-100',
        error: 'bg-red-50 border-red-100',
        info: 'bg-blue-50 border-blue-100',
    };

    return (
        <div className={cn(
            "flex items-center gap-3 p-4 rounded-2xl border shadow-xl animate-in slide-in-from-right-full duration-300 pointer-events-auto min-w-[300px] max-w-md bg-white/90 backdrop-blur-md",
            bgColors[type]
        )}>
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export const Toaster: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 items-end pointer-events-none">
            {children}
        </div>
    );
};
