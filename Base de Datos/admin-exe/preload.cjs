const { contextBridge } = require('electron');
const { API_URL } = require('./main.cjs');

contextBridge.exposeInMainWorld('KALORY_API', API_URL);
contextBridge.exposeInMainWorld('KALORY_EXE', true);
