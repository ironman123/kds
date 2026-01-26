import { useEffect, useState } from 'react';
import
    {
        LayoutGrid, Plus, Trash2, Edit2, CheckCircle, XCircle, Clock
    } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import
    {
        listTables, createTable, updateTableStatus, renameTable, deleteTable
    } from './tableService';
import useUserStore from '../../store/userStore';

const TABLE_STATUS = {
    FREE: 'FREE',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED'
};

export default function TableManagement()
{
    const { user } = useUserStore();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create Mode
    const [isCreating, setIsCreating] = useState(false);
    const [newTableName, setNewTableName] = useState('');

    // Edit Mode
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    useEffect(() =>
    {
        loadTables();
    }, []);

    const loadTables = async () =>
    {
        setLoading(true);
        try
        {
            // If Owner, we might want to let them filter by branch, 
            // but for now let's load the current context or default.
            const data = await listTables();
            setTables(data);
        } catch (err)
        {
            toast.error("Failed to load tables");
            console.error(err);
        } finally
        {
            setLoading(false);
        }
    };

    const handleCreate = async (e) =>
    {
        e.preventDefault();
        if (!newTableName.trim()) return;

        try
        {
            await createTable(newTableName, user.branchId);
            toast.success("Table created");
            setNewTableName('');
            setIsCreating(false);
            loadTables();
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Failed to create table");
        }
    };

    const handleStatusChange = async (table, newStatus) =>
    {
        try
        {
            await updateTableStatus(table.id, newStatus);
            // Optimistic Update
            setTables(prev => prev.map(t =>
                t.id === table.id ? { ...t, status: newStatus } : t
            ));
            toast.success(`Table marked as ${newStatus}`);
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Failed to update status");
        }
    };

    const handleRename = async () =>
    {
        try
        {
            await renameTable(editingId, editName);
            setTables(prev => prev.map(t =>
                t.id === editingId ? { ...t, label: editName } : t
            ));
            setEditingId(null);
            toast.success("Table renamed");
        } catch (err)
        {
            toast.error("Failed to rename");
        }
    };

    const handleDelete = async (table) =>
    {
        if (!confirm(`Delete table "${table.label}"?`)) return;

        try
        {
            await deleteTable(table.id);
            setTables(prev => prev.filter(t => t.id !== table.id));
            toast.success("Table deleted");
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Failed to delete");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <LayoutGrid className="text-orange-600" /> Floor Plan
                    </h2>
                    <p className="text-gray-500 text-sm">Manage tables and their status</p>
                </div>

                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 transition shadow-md"
                >
                    <Plus size={20} /> Add Table
                </button>
            </div>

            {/* Create Modal / Inline Form */}
            {isCreating && (
                <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-orange-100 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreate} className="flex gap-3">
                        <input
                            autoFocus
                            placeholder="Enter table name (e.g. T-12, Patio-1)"
                            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={newTableName}
                            onChange={e => setNewTableName(e.target.value)}
                        />
                        <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold">Save</button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold"
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading floor plan...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {tables.map(table => (
                        <div
                            key={table.id}
                            className={clsx(
                                "relative p-4 rounded-xl border-2 transition-all duration-200 shadow-sm group",
                                table.status === TABLE_STATUS.FREE ? "bg-white border-green-100 hover:border-green-300" :
                                    table.status === TABLE_STATUS.OCCUPIED ? "bg-red-50 border-red-100" :
                                        "bg-yellow-50 border-yellow-100"
                            )}
                        >
                            {/* Status Indicator Bar */}
                            <div className={clsx(
                                "absolute top-0 left-4 right-4 h-1 rounded-b-lg",
                                table.status === TABLE_STATUS.FREE ? "bg-green-400" :
                                    table.status === TABLE_STATUS.OCCUPIED ? "bg-red-400" :
                                        "bg-yellow-400"
                            )} />

                            <div className="flex justify-between items-start mt-2">
                                {/* Table Label (or Edit Input) */}
                                {editingId === table.id ? (
                                    <input
                                        className="w-full p-1 border rounded text-lg font-bold"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onBlur={handleRename}
                                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                                        autoFocus
                                    />
                                ) : (
                                    <h3 className="text-xl font-black text-gray-800">{table.label}</h3>
                                )}

                                {/* Quick Actions (Hover) */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setEditingId(table.id); setEditName(table.label); }}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    {table.status === TABLE_STATUS.FREE && (
                                        <button
                                            onClick={() => handleDelete(table)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mt-4 flex flex-col gap-2">
                                <span className={clsx(
                                    "text-xs font-bold uppercase tracking-wider self-start px-2 py-1 rounded",
                                    table.status === TABLE_STATUS.FREE ? "bg-green-100 text-green-700" :
                                        table.status === TABLE_STATUS.OCCUPIED ? "bg-red-100 text-red-700" :
                                            "bg-yellow-100 text-yellow-700"
                                )}>
                                    {table.status}
                                </span>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-3 gap-1 mt-2">
                                    <button
                                        onClick={() => handleStatusChange(table, TABLE_STATUS.FREE)}
                                        className="p-2 rounded bg-white border border-gray-100 hover:bg-green-50 hover:text-green-600 text-gray-400 flex justify-center"
                                        title="Mark Free"
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(table, TABLE_STATUS.OCCUPIED)}
                                        className="p-2 rounded bg-white border border-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-400 flex justify-center"
                                        title="Mark Occupied"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(table, TABLE_STATUS.RESERVED)}
                                        className="p-2 rounded bg-white border border-gray-100 hover:bg-yellow-50 hover:text-yellow-600 text-gray-400 flex justify-center"
                                        title="Mark Reserved"
                                    >
                                        <Clock size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}