import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { Mail, Briefcase, MapPin, ShieldCheck, User } from 'lucide-react';

export function ProfilePage() {
    usePageTitle('My Profile');
    const { user } = useAuthStore();

    if (!user) {
        return <div className="p-6">Loading profile...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">User Profile</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Card: Basic Info & Avatar */}
                <Card className="border-slate-200 shadow-sm md:col-span-1">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 text-3xl font-bold">
                            {user.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{user.first_name} {user.last_name}</h3>
                        <p className="text-slate-500 mb-4">{user.role}</p>

                        <div className="w-full space-y-3 mt-4 text-left">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Briefcase className="w-4 h-4 text-slate-400" />
                                <span>{user.organization || "No Organization Set"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span>{user.county ? user.county + " County" : "National HQ"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <ShieldCheck className="w-4 h-4 text-slate-400" />
                                <span className="capitalize">{user.role.replace('_', ' ')} Permissions</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Card: Account Settings */}
                <Card className="border-slate-200 shadow-sm md:col-span-2">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                <input type="text" disabled defaultValue={user.first_name} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <input type="text" disabled defaultValue={user.last_name} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input type="email" disabled defaultValue={user.email} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned County</label>
                            <input type="text" disabled defaultValue={user.county || "Not Applicable"} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600" />
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm">Request Detail Update</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
