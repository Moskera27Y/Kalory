const { contextBridge } = require('electron');

// URL del servidor oficial (inline a propósito: el preload no admite require relativos).
// Para cambiarla, edítala aquí y reconstruye el .exe.
const API_URL = 'https://kalory-production.up.railway.app';

contextBridge.exposeInMainWorld('KALORY_API', API_URL);
contextBridge.exposeInMainWorld('KALORY_EXE', true);
