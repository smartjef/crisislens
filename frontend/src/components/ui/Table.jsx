import React, { useState } from 'react';

export default function Table({ columns, data, emptyState, className = '' }) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleSort = (key, sortable) => {
        if (!sortable) return;
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = React.useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    return (
        <div className={`w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-raised ${className}`}>
            <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300 min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-surface text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-surface-border">
                    <tr>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={`py-3 px-4 font-semibold ${col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-border select-none' : ''}`}
                                onClick={() => handleSort(col.key, col.sortable)}
                            >
                                <div className="flex items-center gap-1">
                                    {col.label}
                                    {col.sortable && sortConfig.key === col.key && (
                                        <span className="text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                    {col.sortable && sortConfig.key !== col.key && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">↕</span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-surface-border">
                    {sortedData.length > 0 ? (
                        sortedData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="even:bg-gray-50 dark:even:bg-surface/50 hover:bg-gray-100 dark:hover:bg-surface-border transition-colors">
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} className="py-3 px-4">
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                {emptyState || 'No data available'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
