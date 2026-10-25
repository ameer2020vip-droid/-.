import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CustomLabelsProvider } from './context/CustomLabelsContext';
import { SchoolSettingsProvider } from './context/SchoolSettingsContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SchoolSettingsProvider>
      <CustomLabelsProvider>
        <App />
      </CustomLabelsProvider>
    </SchoolSettingsProvider>
  </StrictMode>,
);
