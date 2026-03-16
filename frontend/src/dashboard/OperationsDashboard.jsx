import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  AlertTriangle,
  MapPin,
  FileText,
  Settings,
  BarChart3,
  Menu,
  Bell,
  Search,
  Download,
  Filter,
  RefreshCw,
  Map,
  Droplets,
  Thermometer,
  ChevronRight,
  CheckCircle,
  Clock,
  X,
  Save,
  Printer
} from "lucide-react";

const RISK_COLOR = (s) => (s >= 80 ? "#DC2626" : s >= 60 ? "#F59E0B" : s >= 40 ? "#FBBF24" : "#14B8A6");
const RISK_LABEL = (s) => (s >= 80 ? "Critical" : s >= 60 ? "High" : s >= 40 ? "Moderate" : "Low");
const droughtCounties = [
  { name: "Turkana", risk: 87, affected: 648283, population: 926976 },
  { name: "Marsabit", risk: 72, affected: 331045, population: 459785 },
  { name: "Mandera", risk: 79, affected: 245000, population: 312000 },
  { name: "Wajir", risk: 75, affected: 412000, population: 558000 },
  { name: "Garissa", risk: 71, affected: 389000, population: 543000 }
];
const floodCounties = [
  { name: "Homa Bay", risk: 78, affected: 882000,  population: 1131950 },
  { name: "Siaya",    risk: 74, affected: 735000,  population: 993183  },
  { name: "Kisumu",   risk: 71, affected: 690000,  population: 1155574 }
];
const droughtTrend = [
  { month: "Aug", turkana: 45, national: 35 },
  { month: "Sep", turkana: 52, national: 41 },
  { month: "Oct", turkana: 61, national: 48 },
  { month: "Nov", turkana: 69, national: 54 },
  { month: "Dec", turkana: 78, national: 62 },
  { month: "Jan", turkana: 84, national: 68 },
  { month: "Feb", turkana: 87, national: 71 }
];

const alerts = [
  { id: 1, county: "Kisumu",   severity: "critical", type: "Flood", message: "Nyando River at 91% capacity. Evacuation alert active for Nyando and Nyakach.", time: "45 min ago", ack: false },
  { id: 2, county: "Homa Bay", severity: "critical", type: "Flood", message: "Suba South communities reporting lake level rise of 0.8m. Rusinga Island access road flooded.", time: "2 hrs ago", ack: false },
  { id: 3, county: "Siaya",    severity: "high",     type: "Flood", message: "Rarieda shoreline flooding confirmed. Yala River at 78% capacity — monitor closely.", time: "4 hrs ago", ack: false }
];

const reports = [
  { id: 1, title: "National Drought Status Report", type: "Drought", generated: "2025-02-10", status: "Final", pages: 24, author: "NDMA" },
  { id: 2, title: "Flood Early Warning Bulletin", type: "Flood", generated: "2025-02-11", status: "Draft", pages: 12, author: "KMD" }
];

function NationalOverview({ module, setModule, setView, setSelectedCounty }) {
  const counties = module === "drought" ? droughtCounties : floodCounties;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">National Overview</h2>
          <p className="text-sm text-gray-500">All counties · Updated 11 Feb 2025</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModule("drought")} className="px-4 py-2 border rounded text-sm flex items-center gap-2"><Thermometer className="w-4 h-4" />Drought</button>
          <button onClick={() => setModule("flood")} className="px-4 py-2 border rounded text-sm flex items-center gap-2"><Droplets className="w-4 h-4" />Flood</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border p-4"><p className="text-xs">Counties Monitored</p><p className="text-3xl font-bold">47</p></div>
        <div className="bg-white border p-4"><p className="text-xs">Critical Alerts</p><p className="text-3xl font-bold text-red-600">{counties.filter((c) => c.risk >= 80).length}</p></div>
        <div className="bg-white border p-4"><p className="text-xs">Total at Risk</p><p className="text-3xl font-bold">{(counties.reduce((a, c) => a + c.affected, 0) / 1e6).toFixed(2)}M</p></div>
        <div className="bg-white border p-4"><p className="text-xs">Avg Risk</p><p className="text-3xl font-bold">{Math.round(counties.reduce((a, c) => a + c.risk, 0) / counties.length)}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border p-4">
          <h3 className="text-sm font-semibold mb-3">6-Month Risk Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={droughtTrend}>
              <CartesianGrid />
              <XAxis dataKey="month" tick={{ fontFamily: "'IBM Plex Mono', monospace" }} />
              <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace" }} />
              <Tooltip contentStyle={{ fontFamily: "'IBM Plex Sans', sans-serif" }} />
              <Legend />
              <Line dataKey="turkana" stroke="#DC2626" name="County" />
              <Line dataKey="national" stroke="#14B8A6" name="National Avg" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border p-4">
          <h3 className="text-sm font-semibold mb-3">County Risk Rankings</h3>
          <table className="w-full text-sm">
            <thead><tr><th className="text-left">County</th><th className="text-left">Risk</th><th></th></tr></thead>
            <tbody>
              {counties.map((c) => (
                <tr key={c.name} className="border-t">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2"><span style={{ color: RISK_COLOR(c.risk) }}>{c.risk}</span> ({RISK_LABEL(c.risk)})</td>
                  <td className="py-2 text-right"><button onClick={() => { setSelectedCounty(c.name.toLowerCase().replace(/'/g, "").replace(/\s/g, "")); setView("county"); }} className="text-teal-600 text-xs inline-flex items-center gap-1">View <ChevronRight className="w-3 h-3" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CountyDetail({ module, selectedCounty }) {
  const list = module === "drought" ? droughtCounties : floodCounties;
  const county = list.find((c) => c.name.toLowerCase().replace(/'/g, "").replace(/\s/g, "") === selectedCounty) || list[0];
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 inline-flex items-center gap-2"><MapPin className="w-4 h-4" />{county.name}</h2>
          <p className="text-sm text-gray-500">Lead time: {module === "flood" ? "3–5 days" : "4–6 weeks"}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded text-sm inline-flex items-center gap-1"><Filter className="w-4 h-4" />Filter</button>
          <button className="px-4 py-2 border rounded text-sm inline-flex items-center gap-1"><RefreshCw className="w-4 h-4" />Refresh</button>
          <button className="px-4 py-2 bg-teal-600 text-white rounded text-sm inline-flex items-center gap-1"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border p-4"><p className="text-xs">Risk</p><p className="text-3xl font-bold">{county.risk}%</p></div>
        <div className="bg-white border p-4"><p className="text-xs">Population</p><p className="text-3xl font-bold">{county.population.toLocaleString()}</p></div>
        <div className="bg-white border p-4"><p className="text-xs">Affected</p><p className="text-3xl font-bold">{county.affected.toLocaleString()}</p></div>
        <div className="bg-white border p-4"><p className="text-xs">Confidence</p><p className="text-3xl font-bold">89%</p></div>
      </div>
      <div className="bg-white border p-4">
        <h3 className="text-sm font-semibold mb-2">Forecast</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={droughtTrend}>
            <XAxis dataKey="month" tick={{ fontFamily: "'IBM Plex Mono', monospace" }} />
            <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace" }} />
            <Tooltip contentStyle={{ fontFamily: "'IBM Plex Sans', sans-serif" }} />
            <Area dataKey="turkana" stroke="#0d9488" fill="#ccfbf1" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AlertsView() {
  const [items, setItems] = useState(alerts);
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Active Alerts</h2>
      <div className="bg-white border divide-y">
        {items.map((a) => (
          <div key={a.id} className="p-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">{a.county} · {a.type}</p>
              <p className="text-sm text-gray-600">{a.message}</p>
              <p className="text-xs text-gray-400">{a.time}</p>
            </div>
            <div className="flex gap-2">
              {!a.ack && <button onClick={() => setItems((prev) => prev.map((p) => p.id === a.id ? { ...p, ack: true } : p))} className="px-3 py-1 text-xs border rounded inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" />Ack</button>}
              <button onClick={() => setItems((prev) => prev.filter((p) => p.id !== a.id))} className="p-1 border rounded"><X className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Reports</h2>
      <div className="bg-white border divide-y">
        {reports.map((r) => (
          <div key={r.id} className="p-4 grid grid-cols-12 gap-3 items-center">
            <div className="col-span-6"><p className="font-medium">{r.title}</p><p className="text-xs text-gray-400">{r.author}</p></div>
            <div className="col-span-2 text-sm">{r.type}</div>
            <div className="col-span-2 text-sm">{r.generated}</div>
            <div className="col-span-1 text-sm">{r.pages}pp</div>
            <div className="col-span-1 flex gap-2"><Download className="w-4 h-4" /><Printer className="w-4 h-4" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView() {
  const [profile, setProfile] = useState({ name: "National Command", email: "command@crisislens.go.ke", phone: "+254 700 000 000", org: "Government of Kenya" });
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>
      <div className="bg-white border p-6 grid grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-500">Name</label><input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="w-full border rounded p-2 text-sm" /></div>
        <div><label className="text-xs text-gray-500">Organization</label><input value={profile.org} onChange={(e) => setProfile((p) => ({ ...p, org: e.target.value }))} className="w-full border rounded p-2 text-sm" /></div>
        <div><label className="text-xs text-gray-500">Email</label><input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className="w-full border rounded p-2 text-sm" /></div>
        <div><label className="text-xs text-gray-500">Phone</label><input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className="w-full border rounded p-2 text-sm" /></div>
        <div className="col-span-2"><button className="px-4 py-2 bg-teal-600 text-white rounded inline-flex items-center gap-2"><Save className="w-4 h-4" />Save Changes</button></div>
      </div>
    </div>
  );
}

export default function OperationsDashboard() {
  const [view, setView] = useState("national");
  const [module, setModule] = useState("flood");
  const [selectedCounty, setSelectedCounty] = useState("kisumu");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const unread = alerts.filter((a) => !a.ack).length;

  const navItems = [
    { id: "national", label: "National Overview", icon: <Map className="w-4 h-4" /> },
    { id: "county", label: "County Details", icon: <MapPin className="w-4 h-4" /> },
    { id: "alerts", label: "Alerts", icon: <AlertTriangle className="w-4 h-4" />, badge: unread },
    { id: "reports", label: "Reports", icon: <FileText className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen((p) => !p)} className="p-1.5 hover:bg-gray-100 rounded"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2"><div className="w-7 h-7 bg-teal-600 rounded flex items-center justify-center"><BarChart3 className="w-4 h-4 text-white" /></div><p className="font-semibold">CrisisLens Dashboard</p></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="w-4 h-4 text-gray-400 absolute left-2 top-2" /><input className="pl-8 pr-3 py-1.5 border rounded text-sm" placeholder="Search" /></div>
          <button onClick={() => setShowNotifPanel((p) => !p)} className="relative p-1.5 border rounded"><Bell className="w-5 h-5" />{unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>}</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`bg-white border-r border-gray-200 ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}`}>
          <nav className="p-3">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm mb-1 ${view === item.id ? "bg-teal-50 text-teal-700" : "hover:bg-gray-50"}`}>
                <span className="inline-flex items-center gap-2">{item.icon}{item.label}</span>
                {item.badge > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">{item.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t text-xs text-gray-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" />Updated 11 Feb</div>
        </aside>

        <main className="flex-1 overflow-auto">
          {view === "national" && <NationalOverview module={module} setModule={setModule} setView={setView} setSelectedCounty={setSelectedCounty} />}
          {view === "county" && <CountyDetail module={module} selectedCounty={selectedCounty} />}
          {view === "alerts" && <AlertsView />}
          {view === "reports" && <ReportsView />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
