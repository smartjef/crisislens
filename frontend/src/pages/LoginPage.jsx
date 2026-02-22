import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const login = useAuthStore((state) => state.login);

    // Where they tried to go before being redirected to login
    const from = location.state?.from?.pathname || '/dashboard';

    const handleLogin = (role) => {
        login(role);
        navigate(from, { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface p-4">
            <div className="max-w-md w-full bg-white dark:bg-surface-raised p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-surface-border">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">CrisisLens Login</h2>
                <div className="space-y-3">
                    <Button className="w-full justify-center" onClick={() => handleLogin('national_ops')}>Login as National Ops</Button>
                    <Button className="w-full justify-center" variant="outline" onClick={() => handleLogin('county_officer')}>Login as County Officer</Button>
                    <Button className="w-full justify-center" variant="outline" onClick={() => handleLogin('responder')}>Login as Responder</Button>
                    <Button className="w-full justify-center" variant="outline" onClick={() => handleLogin('analyst')}>Login as Analyst</Button>
                    <Button className="w-full justify-center" variant="outline" onClick={() => handleLogin('super_admin')}>Login as Super Admin</Button>
                </div>
            </div>
        </div>
    );
}
