/// <reference types="vite/client" />
// @ts-ignore
/// We use relative paths for local dev so Vite's proxy handles it
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';
export const API_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
  : (IS_DEVELOPMENT ? '' : 'https://u5e0gqiwnj.execute-api.us-east-1.amazonaws.com/prod');
