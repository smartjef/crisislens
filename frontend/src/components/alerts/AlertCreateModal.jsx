import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/useAlertStore';
import useCounties from '../../hooks/useCounties';
import useSubCountyRisk from '../../hooks/useSubCountyRisk';
import client from '../../api/client';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

export default function AlertCreateModal({ isOpen, onClose, onSuccess }) {
    const user = useAuthStore((state) => state.user);
    const addToast = useAlertStore((state) => state.addToast);

    const { data: counties } = useCounties();

    const [formData, setFormData] = useState({
        county: '',
        sub_county: '',
        severity: 'medium',
        title: '',
        description: ''
    });

    const { data: subCounties, loading: loadingSubs } = useSubCountyRisk(formData.county);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Pre-fill county if officer
    useEffect(() => {
        if (user?.role === 'county_officer' && user?.county_id) {
            setFormData(prev => ({ ...prev, county: user.county_id }));
        }
    }, [user, isOpen]);

    const validate = () => {
        const newErrors = {};
        if (!formData.county) newErrors.county = 'County is required';
        if (!formData.title) newErrors.title = 'Title is required';
        if (!formData.description) newErrors.description = 'Description is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await client.post('/api/alerts/', formData);
            addToast('Alert issued successfully', 'success');
            onSuccess?.();
            onClose();
            // Reset form
            setFormData({
                county: user?.role === 'county_officer' ? user?.county_id : '',
                sub_county: '',
                severity: 'medium',
                title: '',
                description: ''
            });
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.detail || 'Failed to issue alert', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear sub-county if county changes
        if (name === 'county') setFormData(prev => ({ ...prev, sub_county: '' }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Issue Crisis Alert" className="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* County Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target County</label>
                        <select
                            name="county"
                            value={formData.county}
                            onChange={handleChange}
                            disabled={user?.role === 'county_officer' || isSubmitting}
                            className={`w-full p-3 bg-slate-50 dark:bg-slate-900 border ${errors.county ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-sm focus:ring-2 focus:ring-flood-500 outline-none disabled:opacity-60 transition-all`}
                        >
                            <option value="">Select County</option>
                            {counties?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.county && <p className="text-xs text-red-500 mt-1">{errors.county}</p>}
                    </div>

                    {/* Sub-County Selection (Optional) */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sub-County (Optional)</label>
                        <select
                            name="sub_county"
                            value={formData.sub_county}
                            onChange={handleChange}
                            disabled={!formData.county || loadingSubs || isSubmitting}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-flood-500 outline-none disabled:opacity-60 transition-all"
                        >
                            <option value="">Specific Sub-County (All if empty)</option>
                            {subCounties?.map(sc => (
                                <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Severity Level</label>
                    <div className="grid grid-cols-4 gap-3">
                        {['low', 'medium', 'high', 'critical'].map((sev) => (
                            <button
                                key={sev}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, severity: sev }))}
                                className={`py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 ${formData.severity === sev
                                        ? (sev === 'critical' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none' :
                                            sev === 'high' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100 dark:shadow-none' :
                                                sev === 'medium' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' :
                                                    'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100 dark:shadow-none')
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                {sev}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Alert Headline</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Flash Flood Risk in Ahero"
                        className={`w-full p-3 bg-slate-50 dark:bg-slate-900 border ${errors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-sm focus:ring-2 focus:ring-flood-500 outline-none transition-all`}
                    />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description & Instructions</label>
                    <textarea
                        name="description"
                        rows="4"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Provide detailed situational awareness and recommended response steps..."
                        className={`w-full p-3 bg-slate-50 dark:bg-slate-900 border ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-sm focus:ring-2 focus:ring-flood-500 outline-none transition-all resize-none`}
                    ></textarea>
                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={isSubmitting}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100 dark:shadow-none"
                    >
                        Broadcast Alert
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
