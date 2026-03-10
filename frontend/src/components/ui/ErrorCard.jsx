import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "./Button";

export default function ErrorCard({ message = "Failed to load data.", onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-danger-500/5 rounded-sm border border-red-100 dark:border-danger-500/20 text-center gap-3 transition-colors">
            <AlertCircle className="w-8 h-8 text-danger-500" />
            <div className="text-danger-800 dark:text-danger-400 text-[11px] font-black uppercase tracking-wider">
                <p>{message}</p>
            </div>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 text-[10px] font-black uppercase tracking-widest border-danger-200 dark:border-danger-500/30">
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry Operation
                </Button>
            )}
        </div>
    );
}
