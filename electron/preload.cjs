const { contextBridge, ipcRenderer } = require('electron');

/** Puente seguro renderer → SQLite local. Misma forma que el fallback web. */
contextBridge.exposeInMainWorld('kaloryDb', {
  getState: () => ipcRenderer.invoke('kalory:get-state'),
  register: (u) => ipcRenderer.invoke('auth:register', u),
  login: (u) => ipcRenderer.invoke('auth:login', u),
  googleSignIn: () => ipcRenderer.invoke('auth:google'),
  getGoogleIdToken: () => ipcRenderer.invoke('auth:google-token'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getGoogleClientId: () => ipcRenderer.invoke('auth:get-google-client-id'),
  setGoogleClientId: (clientId) => ipcRenderer.invoke('auth:set-google-client-id', { clientId }),
  saveProfile: (p) => ipcRenderer.invoke('kalory:save-profile', p),
  logFood: (f) => ipcRenderer.invoke('kalory:log-food', f),
  deleteFood: (id) => ipcRenderer.invoke('kalory:delete-food', { id }),
  getDay: (date) => ipcRenderer.invoke('kalory:get-day', { date }),
  logWater: (w) => ipcRenderer.invoke('kalory:log-water', w),
  toggleExercise: (t) => ipcRenderer.invoke('kalory:toggle-exercise', t),
  unlock: (id) => ipcRenderer.invoke('kalory:unlock', { id }),
  stats: () => ipcRenderer.invoke('kalory:stats'),
  resetAll: () => ipcRenderer.invoke('kalory:reset-all'),
});
