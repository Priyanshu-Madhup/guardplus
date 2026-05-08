// Use Railway backend in production, localhost in dev
const API_BASE =
  window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://guardplus-production.up.railway.app';

export default API_BASE;
