'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';
import ApiKeyModal from './ApiKeyModal';

const TABS = [
  { id: 'image',   label: 'Image Studio' },
  { id: 'video',   label: 'Video Studio' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'cinema',  label: 'Cinema Studio' },
];

const STORAGE_KEY = 'muapi_key';
const FREE_ONLY_KEY = 'skip_muapi_key';
const FREE_SERVER_KEY = 'free_server_url';
const DEFAULT_FREE_SERVER_URL = 'http://localhost:8000';

function ProOnlyNotice({ studioName, onOpenSettings }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-white/60 text-sm max-w-sm">
        {studioName} runs on Muapi&apos;s paid models. Add a Muapi API key in
        Settings to use it — Video Studio&apos;s Free Mode doesn&apos;t require one.
      </p>
      <button
        onClick={onOpenSettings}
        className="px-5 py-2.5 rounded-xl bg-[#d9ff00] text-black text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Open Settings
      </button>
    </div>
  );
}

export default function StandaloneShell() {
  const [apiKey, setApiKey] = useState(null);
  const [skipMuapiKey, setSkipMuapiKey] = useState(false);
  const [freeServerUrl, setFreeServerUrl] = useState(DEFAULT_FREE_SERVER_URL);
  const [activeTab, setActiveTab] = useState('video');
  const [showSettings, setShowSettings] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setApiKey(stored);
    if (localStorage.getItem(FREE_ONLY_KEY) === '1') setSkipMuapiKey(true);
    const storedUrl = localStorage.getItem(FREE_SERVER_KEY);
    if (storedUrl) setFreeServerUrl(storedUrl);
  }, []);

  const handleKeySave = useCallback((key) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  }, []);

  const handleKeyChange = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  }, []);

  const handleFreeModeStart = useCallback(() => {
    localStorage.setItem(FREE_ONLY_KEY, '1');
    setSkipMuapiKey(true);
    setActiveTab('video');
  }, []);

  const handleFreeServerUrlChange = useCallback((url) => {
    const trimmed = url.trim() || DEFAULT_FREE_SERVER_URL;
    localStorage.setItem(FREE_SERVER_KEY, trimmed);
    setFreeServerUrl(trimmed);
  }, []);

  if (!hasMounted) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin text-[#d9ff00] text-3xl">◌</div>
    </div>
  );

  if (!apiKey && !skipMuapiKey) {
    return <ApiKeyModal onSave={handleKeySave} onFreeMode={handleFreeModeStart} />;
  }

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-lg tracking-wider uppercase">
            Open Higgsfield AI
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#d9ff00] text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          ⚙ Settings
        </button>
      </header>

      {/* Studio Content */}
      <div className="flex-1">
        {activeTab === 'image'   && (apiKey ? <ImageStudio   apiKey={apiKey} /> : <ProOnlyNotice studioName="Image Studio"   onOpenSettings={() => setShowSettings(true)} />)}
        {activeTab === 'video'   && <VideoStudio apiKey={apiKey} freeServerUrl={freeServerUrl} />}
        {activeTab === 'lipsync' && (apiKey ? <LipSyncStudio apiKey={apiKey} /> : <ProOnlyNotice studioName="Lip Sync Studio" onOpenSettings={() => setShowSettings(true)} />)}
        {activeTab === 'cinema'  && (apiKey ? <CinemaStudio  apiKey={apiKey} /> : <ProOnlyNotice studioName="Cinema Studio"   onOpenSettings={() => setShowSettings(true)} />)}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-white font-bold text-xl mb-6">Settings</h2>

            <div className="mb-6">
              <p className="text-white/50 text-sm mb-2">
                {apiKey
                  ? <>Muapi API key: <span className="text-white/80 font-mono">{apiKey.slice(0, 8)}••••••••</span></>
                  : 'No Muapi API key set — Image/Lip Sync/Cinema studios are unavailable, Video Studio still works in Free Mode.'}
              </p>
              {apiKey ? (
                <button
                  onClick={handleKeyChange}
                  className="w-full py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
                >
                  Remove API Key
                </button>
              ) : (
                <button
                  onClick={() => { setSkipMuapiKey(false); setShowSettings(false); }}
                  className="w-full py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 text-sm transition-colors"
                >
                  Add a Muapi API Key
                </button>
              )}
            </div>

            <div className="mb-6 pt-6 border-t border-white/10">
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
                Free / Self-Hosted Server URL
              </label>
              <input
                type="text"
                defaultValue={freeServerUrl}
                onBlur={(e) => handleFreeServerUrlChange(e.target.value)}
                placeholder={DEFAULT_FREE_SERVER_URL}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40 transition-colors"
              />
              <p className="mt-2 text-[11px] text-white/30">
                Used by Video Studio&apos;s Free Mode. Run your own server — see{' '}
                <code className="text-white/50">studio/self-hosted-server/README.md</code>.
              </p>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
