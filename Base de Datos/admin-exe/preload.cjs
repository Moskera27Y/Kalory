const { contextBridge } = require('electron');
const { API_URL } = require('./api-url.cjs');

contextBridge.exposeInMainWorld('KALORY_API', API_URL);
contextBridge.exposeInMainWorld('KALORY_EXE', true);
