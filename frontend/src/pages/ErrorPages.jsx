import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <h1 className="text-6xl font-bold text-danger mb-4">403</h1>
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">You don't have permission to view this page. If you believe this is an error, contact your administrator.</p>
            <Link to="/dashboard">
                <Button>Return to Dashboard</Button>
            </Link>
        </div>
    );
}

export function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[80vh]">
            <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</h1>
            <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">The page you're looking for doesn't exist or has been moved.</p>
            <Link to="/dashboard">
                <Button>Return to Dashboard</Button>
            </Link>
        </div>
    );
}
