// Auto-detect backend URL:
//  - On localhost (dev desktop): use localhost:8000
//  - On any other host (phone over LAN): use the same hostname at port 8000
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : `http://${window.location.hostname}:8000`);

export default API_BASE;
