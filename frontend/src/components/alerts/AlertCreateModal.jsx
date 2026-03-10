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
        <Modal isOpen={isOpen} onClose={onClose} title="Issue Crisis Alert" className="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* County Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Target County</label>
                        <select
                            name="county"
                            value={formData.county}
                            onChange={handleChange}
                            disabled={user?.role === 'county_officer' || isSubmitting}
                            className={`w-full p-2.5 bg-slate-50 dark:bg-surface-border/10 border ${errors.county ? 'border-danger-500' : 'border-slate-200 dark:border-surface-border'} rounded-sm text-xs focus:border-flood-500 outline-none disabled:opacity-60 transition-all uppercase font-bold`}
                        >
                            <option value="">Select County</option>
                            {counties?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.county && <p className="text-[10px] font-bold text-danger-500 mt-1 uppercase tracking-tight">{errors.county}</p>}
                    </div>

                    {/* Sub-County Selection (Optional) */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Sub-County (Optional)</label>
                        <select
                            name="sub_county"
                            value={formData.sub_county}
                            onChange={handleChange}
                            disabled={!formData.county || loadingSubs || isSubmitting}
                            className="w-full p-2.5 bg-slate-50 dark:bg-surface-border/10 border border-slate-200 dark:border-surface-border rounded-sm text-xs focus:border-flood-500 outline-none disabled:opacity-60 transition-all uppercase font-bold"
                        >
                            <option value="">All Regions</option>
                            {subCounties?.map(sc => (
                                <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Severity Level Identification</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['low', 'medium', 'high', 'critical'].map((sev) => (
                            <button
                                key={sev}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, severity: sev }))}
                                className={`py-2 px-1 rounded-sm text-[9px] font-black uppercase tracking-[0.15em] transition-all border ${formData.severity === sev
                                    ? (sev === 'critical' ? 'bg-danger-600 border-danger-600 text-white' :
                                        sev === 'high' ? 'bg-warning-500 border-warning-500 text-white' :
                                            sev === 'medium' ? 'bg-flood-600 border-flood-600 text-white' :
                                                'bg-success-600 border-success-600 text-white')
                                    : 'bg-white dark:bg-surface-raised border-slate-200 dark:border-surface-border text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                {sev}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Tactical Alert Headline</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="ENTER ALERT TITLE..."
                        className={`w-full p-2.5 bg-slate-50 dark:bg-surface-border/10 border ${errors.title ? 'border-danger-500' : 'border-slate-200 dark:border-surface-border'} rounded-sm text-xs focus:border-flood-500 outline-none transition-all uppercase font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600`}
                    />
                    {errors.title && <p className="text-[10px] font-bold text-danger-500 mt-1 uppercase tracking-tight">{errors.title}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Description & Operational Instructions</label>
                    <textarea
                        name="description"
                        rows="4"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="PROVIDE DETAILED SITUATIONAL AWARENESS..."
                        className={`w-full p-2.5 bg-slate-50 dark:bg-surface-border/10 border ${errors.description ? 'border-danger-500' : 'border-slate-200 dark:border-surface-border'} rounded-sm text-xs focus:border-flood-500 outline-none transition-all resize-none uppercase font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 leading-relaxed`}
                    ></textarea>
                    {errors.description && <p className="text-[10px] font-bold text-danger-500 mt-1 uppercase tracking-tight">{errors.description}</p>}
                </div>

                <div className="flex gap-3 pt-5 border-t border-slate-100 dark:border-surface-border">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 text-[10px] font-black uppercase tracking-widest py-3 border border-slate-200 dark:border-surface-border"
                    >
                        Abort
                    </Button>
                    <Button
                        type="submit"
                        loading={isSubmitting}
                        className="flex-1 bg-danger-600 hover:bg-danger-700 text-white text-[10px] font-black uppercase tracking-widest py-3"
                    >
                        Execute Broadcast
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
