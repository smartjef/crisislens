import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "./Button";

export default function ErrorCard({ message = "Failed to load data.", onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100 text-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div className="text-red-800 font-medium">
                <p>{message}</p>
            </div>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 bg-white text-red-700 border-red-200 hover:bg-red-100">
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
            )}
        </div>
    );
}
