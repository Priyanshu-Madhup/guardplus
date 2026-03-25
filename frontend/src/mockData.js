// ==================== MOCK VISITOR DATA ====================

export const mockVisitors = [
  {
    id: 'V-001',
    name: 'Arjun Sharma',
    phone: '9876543210',
    email: 'arjun.sharma@example.com',
    purpose: 'Meeting',
    personToMeet: 'Dr. Priya Mehta',
    department: 'Computer Science',
    entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    exitTime: null,
    status: 'active',
    visitorPhoto: null,
    guardPhoto: null,
    guard: 'Guard Ramesh Kumar',
  },
  {
    id: 'V-002',
    name: 'Sunita Verma',
    phone: '9123456789',
    email: 'sunita.v@example.com',
    purpose: 'Interview',
    personToMeet: 'Prof. Amit Singh',
    department: 'Electronics',
    entryTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    exitTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'exited',
    visitorPhoto: null,
    guardPhoto: null,
    guard: 'Guard Suresh Patil',
  },
  {
    id: 'V-003',
    name: 'Rahul Gupta',
    phone: '9988776655',
    email: 'rahul.g@example.com',
    purpose: 'Delivery',
    personToMeet: 'Dr. Kavita Rao',
    department: 'Administration',
    entryTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    exitTime: null,
    status: 'active',
    visitorPhoto: null,
    guardPhoto: null,
    guard: 'Guard Ramesh Kumar',
  },
  {
    id: 'V-004',
    name: 'Meena Patel',
    phone: '8765432109',
    email: 'meena.p@example.com',
    purpose: 'Official Work',
    personToMeet: 'Prof. Vijay Nair',
    department: 'Mechanical',
    entryTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    exitTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    status: 'exited',
    visitorPhoto: null,
    guardPhoto: null,
    guard: 'Guard Suresh Patil',
  },
  {
    id: 'V-005',
    name: 'Kiran Nair',
    phone: '7654321098',
    email: 'kiran.n@example.com',
    purpose: 'Meeting',
    personToMeet: 'Dr. Rajesh Iyer',
    department: 'Civil',
    entryTime: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    exitTime: null,
    status: 'active',
    visitorPhoto: null,
    guardPhoto: null,
    guard: 'Guard Ramesh Kumar',
  },
];

export const getVisitorById = (id) =>
  mockVisitors.find((v) => v.id === id) || null;

export const formatTime = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDate = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  return `${formatDate(isoString)}, ${formatTime(isoString)}`;
};
