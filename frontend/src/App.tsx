import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  Layout, LogOut, Plus, Trash2, Edit, X, Users, Mail, Lock, User as UserIcon, Shield, Settings, UserCheck, type LucideIcon 
} from 'lucide-react';

// --- Types ---
interface User {
  id: number;
  name: string;
  email: string;
  role: 'TECHNICIAN' | 'MANAGER';
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  client: string;
  technicianId?: number | null; // Matches Go backend 'technicianId'
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, tokenData: string) => void;
  updateUser: (userData: User) => void;
  logout: () => void;
}

interface AuthPageProps {
  onSwitch: () => void;
}

// Ensure this matches your Go backend IP
const API_URL = import.meta.env.VITE_API_URL;
const AuthContext = createContext<AuthContextType | null>(null);

// --- Reusable Modal Component ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tech_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tech_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState<'login' | 'signup' | 'dashboard'>(token ? 'dashboard' : 'login');

  const login = (userData: User, tokenData: string) => {
    localStorage.setItem('tech_token', tokenData);
    localStorage.setItem('tech_user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
    setView('dashboard');
  };

  const updateUser = (userData: User) => {
    localStorage.setItem('tech_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setView('login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {view === 'login' && <LoginPage onSwitch={() => setView('signup')} />}
        {view === 'signup' && <SignupPage onSwitch={() => setView('login')} />}
        {view === 'dashboard' && <DashboardMain />}
      </div>
    </AuthContext.Provider>
  );
}

// --- Login Page ---
const LoginPage: React.FC<AuthPageProps> = ({ onSwitch }) => {
  const auth = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        auth?.login(data.user, data.token);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-indigo-800">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-100 p-3 rounded-xl mb-4 text-blue-600">
            <Layout className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500">Sign in to manage service tasks</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input 
                type="email" required
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input 
                type="password" required
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account? <button onClick={onSwitch} className="text-blue-600 font-bold hover:underline">Sign up</button>
        </p>
      </div>
    </div>
  );
};

// --- Signup Page ---
const SignupPage: React.FC<AuthPageProps> = ({ onSwitch }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'TECHNICIAN' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onSwitch();
      } else {
        setError('Signup failed. Email might be taken.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-purple-800">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-500">Join the TechFlow team</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input 
                type="text" required
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="John Doe"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input 
                type="email" required
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="you@company.com"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input 
                type="password" required
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <select 
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="TECHNICIAN">Technician</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
          </div>
          <button 
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <button onClick={onSwitch} className="text-indigo-600 font-bold hover:underline">Log in</button>
        </p>
      </div>
    </div>
  );
};


// --- Dashboard Main ---
const DashboardMain: React.FC = () => {
  const auth = useContext(AuthContext);
  const isManager = auth?.user?.role === 'MANAGER'; // Check permission
  
  // Added 'manager' to the state type
  const [activeTab, setActiveTab] = useState<'tasks' | 'techs' | 'settings' | 'manager' | 'managers'>('tasks');

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6 text-xl font-bold flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Layout className="w-5 h-5" /></div>
          TechFlow
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
          {/* MANAGER ONLY TAB */}
          {isManager && (
            <>
              <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</div>
              <SidebarItem 
                Icon={Shield} 
                label="Overview" 
                active={activeTab === 'manager'} 
                onClick={() => setActiveTab('manager')} 
              />
              <SidebarItem 
            Icon={Users} 
            label="Managers" 
            active={activeTab === 'managers'} 
            onClick={() => setActiveTab('managers')} 
          />
              <div className="my-2 border-b border-slate-800" />
            </>
          )}

          <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Menu</div>
          <SidebarItem 
            Icon={Layout} 
            label="Tasks" 
            active={activeTab === 'tasks'} 
            onClick={() => setActiveTab('tasks')} 
          />
          <SidebarItem 
            Icon={Users} 
            label="Technicians" 
            active={activeTab === 'techs'} 
            onClick={() => setActiveTab('techs')} 
          />
          <SidebarItem 
            Icon={Settings} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={auth?.logout} className="flex items-center gap-3 px-4 py-2 w-full hover:bg-red-500/10 hover:text-red-400 rounded-lg text-slate-400 transition-colors">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>
      {/* Manager Management Table */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 capitalize">
            {activeTab === 'manager' ? 'Executive Overview' : `${activeTab} Management`}
          </h2>
          <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('settings')}>
            <div className="text-right">
              <p className="text-sm font-semibold">{auth?.user?.name}</p>
              <p className="text-xs text-slate-500">{auth?.user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {auth?.user?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <section className="p-8">
          {activeTab === 'manager' && isManager && <ManagerOverview />}
          {activeTab === 'tasks' && <TaskManager />}
          {activeTab === 'techs' && <TechnicianManager />}
          {activeTab === 'managers' && isManager && <ManagerView />}
          {activeTab === 'settings' && <UserSettings />}
        </section>
      </main>
    </div>
  );
};

// --- Manager Overview Component ---
const ManagerOverview: React.FC = () => {
  const auth = useContext(AuthContext);
  const [stats, setStats] = useState({ 
    totalTasks: 0, 
    pendingTasks: 0, 
    highPriority: 0, 
    totalTechs: 0 
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!auth?.token) return;
      try {
        const [taskRes, techRes] = await Promise.all([
          fetch(`${API_URL}/tasks`, { headers: { 'Authorization': `Bearer ${auth.token}` } }),
          fetch(`${API_URL}/technicians`, { headers: { 'Authorization': `Bearer ${auth.token}` } })
        ]);
        
        const tasks: Task[] = await taskRes.json();
        const techs: User[] = await techRes.json();
        
        // Calculate stats on the client side based on fetched data
        setStats({
          totalTasks: Array.isArray(tasks) ? tasks.length : 0,
          pendingTasks: Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0,
          highPriority: Array.isArray(tasks) ? tasks.filter(t => t.priority === 'HIGH' && t.status !== 'COMPLETED').length : 0,
          totalTechs: Array.isArray(techs) ? techs.length : 0
        });
      } 
      catch (e) { console.error(e); }
    };
    fetchStats();
  }, [auth?.token]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">System Performance</h2>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Tasks" value={stats.totalTasks} icon={Layout} color="bg-blue-500" />
        <StatCard title="Pending" value={stats.pendingTasks} icon={Lock} color="bg-yellow-500" />
        <StatCard title="Critical (High)" value={stats.highPriority} icon={Shield} color="bg-red-500" />
        <StatCard title="Active Technicians" value={stats.totalTechs} icon={Users} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="font-bold text-slate-700 mb-4">Quick Actions</h3>
          <div className="space-y-3">
             <p className="text-sm text-slate-500">As a manager, you can override task assignments and manage user roles.</p>
             <div className="p-4 bg-slate-50 rounded-lg border border-dashed text-sm text-slate-600">
                Select <strong>Technicians</strong> tab to edit user details or <strong>Tasks</strong> to reassign work.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for Manager Overview
const StatCard: React.FC<{ title: string, value: number, icon: any, color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium uppercase">{title}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
    <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100`}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);

// --- User Settings ---
const UserSettings: React.FC = () => {
  const auth = useContext(AuthContext);
  const [formData, setFormData] = useState({ name: auth?.user?.name || '', email: auth?.user?.email || '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth?.token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        auth?.updateUser(data.user);
        setMessage('Profile updated successfully!');
      } else {
        setMessage(data.message || 'Update failed');
      }
    } catch (err) {
      setMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border">
      <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
      {message && <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}
      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
            <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
            <input className="w-full p-2.5 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" value={formData.email} disabled />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-dashed">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-600">{auth?.user?.role}</span>
          </div>
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
          {loading ? 'Saving Changes...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

// --- Task Manager ---
const TaskManager: React.FC = () => {
  const auth = useContext(AuthContext);
  const isManager = auth?.user?.role === 'MANAGER';
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]); // To populate assignment dropdown
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({ 
    title: '', 
    client: '', 
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH', 
    status: 'PENDING' as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
    technicianId: null as number | null
  });

  const fetchData = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const [taskRes, userRes] = await Promise.all([
        fetch(`${API_URL}/tasks`, { headers: { 'Authorization': `Bearer ${auth.token}` } }),
        fetch(`${API_URL}/technicians`, { headers: { 'Authorization': `Bearer ${auth.token}` } })
      ]);
      const taskData = await taskRes.json();
      const userData = await userRes.json();
      
      setTasks(Array.isArray(taskData) ? taskData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (e) { console.error(e); }
  }, [auth?.token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const method = editingTask ? 'PUT' : 'POST';
    const url = editingTask ? `${API_URL}/tasks/${editingTask.id}` : `${API_URL}/tasks`;
    
     // Explicitly construct payload to ensure ALL fields (especially description) are sent
    const payload = { 
      title: formData.title,
      client: formData.client,
      description: formData.description, // Correctly mapped from state
      priority: formData.priority,
      status: formData.status,
      technicianId: formData.technicianId ? Number(formData.technicianId) : null 
    };

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${auth?.token}` 
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setIsModalOpen(false); 
      fetchData();
      // Clear form after success
      setFormData({ title: '', client: '', description: '', priority: 'MEDIUM', status: 'PENDING', technicianId: null });
    } else {
      console.error("Failed to save task");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete task?")) return;
    await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${auth?.token}` } });
    fetchData();
  };

  // const getPriorityColor = (priority: string) => {
  //   switch (priority) {
  //     case 'HIGH': return 'bg-red-100 text-red-700';
  //     case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
  //     case 'LOW': return 'bg-green-100 text-green-700';
  //     default: return 'bg-slate-100 text-slate-700';
  //   }
  // };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Service Queue</h1>
        <button 
          onClick={() => { 
            setEditingTask(null); 
            setFormData({ title: '', client: '', description: '', priority: 'MEDIUM', status: 'PENDING', technicianId: null }); 
            setIsModalOpen(true); 
          }} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              <th className="px-6 py-4 font-bold">Task Details</th>
              <th className="px-6 py-4 font-bold">Client</th>
              <th className="px-6 py-4 font-bold">Assignee</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tasks.map(task => {
              const assignee = users.find(u => u.id === task.technicianId);
              return (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{task.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{task.description}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{task.client}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 border">
                        {assignee ? assignee.name.charAt(0) : '?'}
                      </div>
                      {assignee ? assignee.name : <span className="text-slate-300 italic">Unassigned</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button 
                      onClick={() => { setEditingTask(task); setFormData(task as any); setIsModalOpen(true); }} 
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(task.id)} 
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No tasks found in queue.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? "Edit Task" : "New Task"}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Task Title</label>
            <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter task name..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Client</label>
            <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Client name..." value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
          </div>
          
          {/* MANAGER ONLY FIELD */}
          {isManager && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-500" /> Assign To
              </label>
              <select 
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30 border-blue-100" 
                value={formData.technicianId || ''} 
                onChange={e => setFormData({...formData, technicianId: e.target.value ? Number(e.target.value) : null})}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Description</label>
            <textarea className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" placeholder="Task details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Priority</label>
              <select className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status</label>
              <select className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors mt-2 shadow-lg shadow-blue-200">
            {editingTask ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </Modal>
    </>
  );
};

// --- Managers Table list ---
const ManagerView: React.FC = () => {
  const auth = useContext(AuthContext);
  const isManager = auth?.user?.role === 'MANAGER';
  const [techs, setTechs] = useState<User[]>([]);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Data States
  const [editingTech, setEditingTech] = useState<User | null>(null);
  
  // Form States
  const [newTech, setNewTech] = useState({ name: '', email: '', password: '', role: 'MANAGER' });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'MANAGER' });

  const fetchTechs = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const res = await fetch(`${API_URL}/users/managers`, { headers: { 'Authorization': `Bearer ${auth.token}` } });
      const data = await res.json();
      setTechs(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, [auth?.token]);

  useEffect(() => { fetchTechs(); }, [fetchTechs]);

  // --- Handlers ---

  const handleAddTech = async () => {
    try {
      await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth?.token}` },
        body: JSON.stringify(newTech)
      });
      setIsAddModalOpen(false);
      setNewTech({ name: '', email: '', password: '', role: 'MANAGER' }); // Reset form
      fetchTechs();
    } catch (e) { console.error(e); }
  };

  const handleEditClick = (tech: User) => {
    setEditingTech(tech);
    setEditForm({ name: tech.name, email: tech.email, role: tech.role });
    setIsEditModalOpen(true);
  };

  const handleUpdateTech = async () => {
    if (!editingTech || !isManager) return;
    
    try {
      // Calls the existing Go handler: userIDHandler (PUT /api/users/:id)
      const res = await fetch(`${API_URL}/users/${editingTech.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth?.token}` },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchTechs();
      } else {
        alert("Failed to update user");
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!isManager || !window.confirm("Delete user? This cannot be undone.")) return;
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${auth?.token}` } });
    fetchTechs();
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Managers Team</h1>
        {isManager && (
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Add Managers
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              <th className="px-6 py-4 font-bold">Managers</th>
              <th className="px-6 py-4 font-bold">Email</th>
              <th className="px-6 py-4 font-bold">Role</th>
              {isManager && <th className="px-6 py-4 text-right font-bold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {techs.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
                <td className="px-6 py-4 text-slate-600">{t.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${t.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.role}
                  </span>
                </td>
                {isManager && (
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button onClick={() => handleEditClick(t)} className="text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD MODAL --- */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Technician">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Name</label>
            <input className="w-full p-2.5 border rounded-lg" placeholder="Full Name" value={newTech.name} onChange={e => setNewTech({...newTech, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email</label>
            <input className="w-full p-2.5 border rounded-lg" placeholder="Email" value={newTech.email} onChange={e => setNewTech({...newTech, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Password</label>
            <input className="w-full p-2.5 border rounded-lg" type="password" placeholder="Password" value={newTech.password} onChange={e => setNewTech({...newTech, password: e.target.value})} />
          </div>
          <button onClick={handleAddTech} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 mt-2">Create User</button>
        </div>
      </Modal>

      {/* --- EDIT MODAL (Updated) --- */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Technician">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Full Name</label>
            <input 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={editForm.name} 
              onChange={e => setEditForm({...editForm, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email Address</label>
            <input 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={editForm.email} 
              onChange={e => setEditForm({...editForm, email: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Role</label>
            <select 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={editForm.role} 
              onChange={e => setEditForm({...editForm, role: e.target.value})}
            >
              <option value="TECHNICIAN">Technician</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-lg font-bold hover:bg-slate-200">Cancel</button>
            <button onClick={handleUpdateTech} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Save Changes</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

// --- Technician Manager ---
const TechnicianManager: React.FC = () => {
  const auth = useContext(AuthContext);
  const isManager = auth?.user?.role === 'MANAGER';
  const [techs, setTechs] = useState<User[]>([]);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Data States
  const [editingTech, setEditingTech] = useState<User | null>(null);
  
  // Form States
  const [newTech, setNewTech] = useState({ name: '', email: '', password: '', role: 'TECHNICIAN' });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'TECHNICIAN' });

  const fetchTechs = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const res = await fetch(`${API_URL}/technicians`, { headers: { 'Authorization': `Bearer ${auth.token}` } });
      const data = await res.json();
      setTechs(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, [auth?.token]);

  useEffect(() => { fetchTechs(); }, [fetchTechs]);

  // --- Handlers ---

  const handleAddTech = async () => {
    try {
      await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth?.token}` },
        body: JSON.stringify(newTech)
      });
      setIsAddModalOpen(false);
      setNewTech({ name: '', email: '', password: '', role: 'TECHNICIAN' }); // Reset form
      fetchTechs();
    } catch (e) { console.error(e); }
  };

  const handleEditClick = (tech: User) => {
    setEditingTech(tech);
    setEditForm({ name: tech.name, email: tech.email, role: tech.role });
    setIsEditModalOpen(true);
  };

  const handleUpdateTech = async () => {
    if (!editingTech || !isManager) return;
    
    try {
      // Calls the existing Go handler: userIDHandler (PUT /api/users/:id)
      const res = await fetch(`${API_URL}/users/${editingTech.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth?.token}` },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchTechs();
      } else {
        alert("Failed to update user");
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!isManager || !window.confirm("Delete user? This cannot be undone.")) return;
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${auth?.token}` } });
    fetchTechs();
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Technician Team</h1>
        {isManager && (
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Add Technician
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              <th className="px-6 py-4 font-bold">Technician</th>
              <th className="px-6 py-4 font-bold">Email</th>
              <th className="px-6 py-4 font-bold">Role</th>
              {isManager && <th className="px-6 py-4 text-right font-bold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {techs.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
                <td className="px-6 py-4 text-slate-600">{t.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${t.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.role}
                  </span>
                </td>
                {isManager && (
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button onClick={() => handleEditClick(t)} className="text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD MODAL --- */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Technician">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Name</label>
            <input className="w-full p-2.5 border rounded-lg" placeholder="Full Name" value={newTech.name} onChange={e => setNewTech({...newTech, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email</label>
            <input className="w-full p-2.5 border rounded-lg" placeholder="Email" value={newTech.email} onChange={e => setNewTech({...newTech, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Password</label>
            <input className="w-full p-2.5 border rounded-lg" type="password" placeholder="Password" value={newTech.password} onChange={e => setNewTech({...newTech, password: e.target.value})} />
          </div>
          <button onClick={handleAddTech} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 mt-2">Create User</button>
        </div>
      </Modal>

      {/* --- EDIT MODAL (Updated) --- */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Technician">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Full Name</label>
            <input 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={editForm.name} 
              onChange={e => setEditForm({...editForm, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email Address</label>
            <input 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={editForm.email} 
              onChange={e => setEditForm({...editForm, email: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Role</label>
            <select 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={editForm.role} 
              onChange={e => setEditForm({...editForm, role: e.target.value})}
            >
              <option value="TECHNICIAN">Technician</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-lg font-bold hover:bg-slate-200">Cancel</button>
            <button onClick={handleUpdateTech} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Save Changes</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

const SidebarItem: React.FC<{ Icon: LucideIcon, label: string, active?: boolean, onClick: () => void }> = ({ Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-xl font-medium transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <Icon className="w-5 h-5" /> {label}
  </button>
);