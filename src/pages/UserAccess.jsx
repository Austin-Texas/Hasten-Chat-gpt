import { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  ShieldCheck,
  Mail,
  KeyRound,
  UserX,
  Trash2,
  CheckCircle2,
  Clock,
  Settings2,
  Users,
  SlidersHorizontal,
  History,
} from "lucide-react";

const STORAGE_USERS = "hasten_admin_users";
const STORAGE_FEATURES = "hasten_feature_access";

const defaultUsers = [
  {
    id: "usr-owner",
    name: "Brian M",
    email: "netzeus20@gmail.com",
    phone: "",
    role: "admin",
    account: "Active",
    inviteStatus: "Accepted",
    joined: "Jun 24, 2026",
  },
  {
    id: "usr-dispatcher",
    name: "Demo Dispatcher",
    email: "dispatcher@hasten.com",
    phone: "",
    role: "dispatcher",
    account: "Active",
    inviteStatus: "Accepted",
    joined: "Jun 24, 2026",
  },
  {
    id: "usr-driver",
    name: "Demo Driver",
    email: "driver@hasten.com",
    phone: "",
    role: "driver",
    account: "Pending",
    inviteStatus: "Sent",
    joined: "Pending",
  },
];

const roles = [
  { value: "admin", label: "Admin", description: "Manages app operations, users, settings, finance, reports, and dispatch controls." },
  { value: "dispatcher", label: "Dispatcher", description: "Manages loads, drivers, dispatch board, documents, tracking, and messages." },
  { value: "driver", label: "Driver", description: "Driver app only: assigned loads, map, documents, messages, earnings, and profile." },
  { value: "customer", label: "Customer", description: "Customer portal only: shipments, quotes, tracking, documents, invoices, and support." },
];

const featureSections = [
  "Dashboard",
  "Dispatch",
  "Loads",
  "Drivers",
  "Fleet",
  "Tracking",
  "Documents",
  "Finance",
  "Payroll",
  "Settlements",
  "Reports",
  "Messages",
  "Support",
  "Settings",
];

const defaultFeatureAccess = {
  admin: {
    Dashboard: true, Dispatch: true, Loads: true, Drivers: true, Fleet: true, Tracking: true,
    Documents: true, Finance: true, Payroll: true, Settlements: true, Reports: true,
    Messages: true, Support: true, Settings: true,
  },
  dispatcher: {
    Dashboard: true, Dispatch: true, Loads: true, Drivers: true, Fleet: true, Tracking: true,
    Documents: true, Finance: false, Payroll: false, Settlements: false, Reports: false,
    Messages: true, Support: true, Settings: false,
  },
  driver: {
    Dashboard: false, Dispatch: false, Loads: true, Drivers: false, Fleet: false, Tracking: true,
    Documents: true, Finance: false, Payroll: false, Settlements: true, Reports: false,
    Messages: true, Support: true, Settings: false,
  },
  customer: {
    Dashboard: true, Dispatch: false, Loads: false, Drivers: false, Fleet: false, Tracking: true,
    Documents: true, Finance: false, Payroll: false, Settlements: false, Reports: false,
    Messages: true, Support: true, Settings: false,
  },
};

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "invites", label: "Invites", icon: Mail },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "features", label: "Feature Access", icon: SlidersHorizontal },
  { id: "audit", label: "Audit Log", icon: History },
];

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    green: "bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function UserAccess() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState(() => loadState(STORAGE_USERS, defaultUsers));
  const [featureAccess, setFeatureAccess] = useState(() => loadState(STORAGE_FEATURES, defaultFeatureAccess));
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [audit, setAudit] = useState([
    "Local demo auth enabled for admin dashboard.",
    "Users & Access module opened.",
  ]);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", role: "driver" });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const updateUsers = (nextUsers, log) => {
    setUsers(nextUsers);
    saveState(STORAGE_USERS, nextUsers);
    if (log) setAudit((items) => [log, ...items]);
  };

  const updateFeatures = (nextFeatures, log) => {
    setFeatureAccess(nextFeatures);
    saveState(STORAGE_FEATURES, nextFeatures);
    if (log) setAudit((items) => [log, ...items]);
  };

  const addUser = (event) => {
    event.preventDefault();
    const cleanEmail = newUser.email.trim().toLowerCase();
    if (!newUser.name.trim() || !cleanEmail) return;
    const nextUser = {
      id: `usr-${Date.now()}`,
      name: newUser.name.trim(),
      email: cleanEmail,
      phone: newUser.phone.trim(),
      role: newUser.role,
      account: "Pending",
      inviteStatus: "Sent",
      joined: "Pending",
    };
    updateUsers([nextUser, ...users], `Invite sent to ${nextUser.email} as ${nextUser.role}.`);
    setNewUser({ name: "", email: "", phone: "", role: "driver" });
    setShowAdd(false);
  };

  const updateUserRole = (id, role) => {
    updateUsers(users.map((u) => (u.id === id ? { ...u, role } : u)), `User role changed to ${role}.`);
  };

  const toggleAccount = (id) => {
    updateUsers(
      users.map((u) => (u.id === id ? { ...u, account: u.account === "Active" ? "Disabled" : "Active" } : u)),
      "User account status changed."
    );
  };

  const removeUser = (id) => {
    const user = users.find((u) => u.id === id);
    updateUsers(users.filter((u) => u.id !== id), `User removed: ${user?.email || id}.`);
  };

  const toggleFeature = (role, section) => {
    const next = {
      ...featureAccess,
      [role]: {
        ...featureAccess[role],
        [section]: !featureAccess[role]?.[section],
      },
    };
    updateFeatures(next, `${section} access ${next[role][section] ? "enabled" : "disabled"} for ${role}.`);
  };

  const pendingInvites = users.filter((u) => u.inviteStatus !== "Accepted");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">Administration</p>
          <h1 className="mt-2 text-3xl font-black text-white">Users & Access</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Add admins, dispatchers, drivers, and customers. Control what each role can see without making the system complicated.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-green-500/20 hover:bg-green-400"
        >
          <UserPlus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Total Users", users.length, Users],
          ["Active", users.filter((u) => u.account === "Active").length, CheckCircle2],
          ["Pending Invites", pendingInvites.length, Clock],
          ["Roles", roles.length, ShieldCheck],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{label}</span>
              <Icon className="h-5 w-5 text-green-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-xl">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === id ? "bg-green-500 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "users" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-green-500/50"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-green-500/50"
            >
              <option value="all">All Roles</option>
              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Invite Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-sm text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-semibold capitalize text-white"
                      >
                        {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4"><Pill tone={user.account === "Active" ? "green" : user.account === "Disabled" ? "red" : "orange"}>{user.account}</Pill></td>
                    <td className="px-4 py-4"><Pill tone={user.inviteStatus === "Accepted" ? "green" : "orange"}>{user.inviteStatus}</Pill></td>
                    <td className="px-4 py-4 text-sm text-slate-400">{user.joined}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button title="Reset password" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><KeyRound className="h-4 w-4" /></button>
                        <button title="Send invite" className="rounded-lg p-2 text-orange-400 hover:bg-orange-500/10"><Mail className="h-4 w-4" /></button>
                        <button title="Enable / disable user" onClick={() => toggleAccount(user.id)} className="rounded-lg p-2 text-blue-400 hover:bg-blue-500/10"><UserX className="h-4 w-4" /></button>
                        <button title="Delete user" onClick={() => removeUser(user.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "invites" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
          <h2 className="text-xl font-bold text-white">Pending Invites</h2>
          <div className="mt-4 space-y-3">
            {pendingInvites.length === 0 ? <p className="text-sm text-slate-400">No pending invites.</p> : pendingInvites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="font-semibold text-white">{invite.name}</div><div className="text-sm text-slate-400">{invite.email} • {invite.role}</div></div>
                <button className="rounded-lg bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/20">Resend Invite</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "roles" && (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <div key={role.value} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{role.label}</h2>
                <Pill tone={role.value === "admin" ? "green" : "blue"}>{role.value}</Pill>
              </div>
              <p className="mt-3 text-sm text-slate-400">{role.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "features" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-2 text-white"><Settings2 className="h-5 w-5 text-green-400" /><h2 className="text-xl font-bold">Feature Access Matrix</h2></div>
            <p className="mt-2 text-sm text-slate-400">Enable or disable app sections by role. Later, this can connect to real backend permissions.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Section</th>
                  {roles.map((role) => <th key={role.value} className="px-4 py-3 text-center">{role.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {featureSections.map((section) => (
                  <tr key={section} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-4 font-semibold text-white">{section}</td>
                    {roles.map((role) => (
                      <td key={role.value} className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleFeature(role.value, section)}
                          className={`mx-auto flex h-7 w-12 items-center rounded-full p-1 transition ${featureAccess[role.value]?.[section] ? "bg-green-500" : "bg-slate-700"}`}
                          title={`${featureAccess[role.value]?.[section] ? "Disable" : "Enable"} ${section} for ${role.label}`}
                        >
                          <span className={`h-5 w-5 rounded-full bg-white transition ${featureAccess[role.value]?.[section] ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
          <h2 className="text-xl font-bold text-white">Audit Log</h2>
          <div className="mt-4 space-y-3">
            {audit.map((entry, index) => (
              <div key={`${entry}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <span className="text-slate-500">Now</span> — {entry}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={addUser} className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Add User</h2>
                <p className="mt-1 text-sm text-slate-400">Create a local demo user or prepare an invitation workflow.</p>
              </div>
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white">Close</button>
            </div>
            <div className="mt-6 space-y-4">
              <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Full Name" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-green-500/50" />
              <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" type="email" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-green-500/50" />
              <input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="Phone (optional)" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-green-500/50" />
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500/50">
                {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">Cancel</button>
              <button type="submit" className="rounded-xl bg-green-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-green-400">Create Invite</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
