import React, { useState } from 'react';
import { Volume2, VolumeX, BookOpen, PlusCircle, User, Sliders, Headphones } from 'lucide-react';
import { AppSettings } from '../types';
import { UserProfile } from '../utils/storage';

interface NavbarProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  reviewCount: number;
  onOpenReviewModal: () => void;
  onOpenRegisterModal: () => void;
  onOpenAuthModal: () => void;
  onGoHome: () => void;
  userProfile: UserProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onUpdateSettings,
  reviewCount,
  onOpenReviewModal,
  onOpenRegisterModal,
  onOpenAuthModal,
  onGoHome,
  userProfile,
}) => {
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  const toggleSound = () => {
    onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div 
          onClick={onGoHome}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                <span className="sm:hidden">TOEIC Dictation</span>
                <span className="hidden sm:inline">TOEIC Dictation Master</span>
              </span>
              <span className="text-[10px] font-bold bg-indigo-950/80 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full whitespace-nowrap shrink-0">
                Part 1-4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              正解単語ロック＆誤答箇所のみ再入力システム
            </p>
          </div>
        </div>

        {/* Right Action Icons & Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Sound Controls */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              title="効果音・再生設定"
              aria-label="効果音設定"
              className={`h-9 px-2 sm:px-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                settings.soundEnabled
                  ? 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-slate-700/80'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/80'
              }`}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline font-medium">
                {settings.soundEnabled ? '音ON' : '音OFF'}
              </span>
            </button>

            {showSettingsPopover && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-700">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>学習・効果音設定</span>
                  </div>
                  <button
                    onClick={() => setShowSettingsPopover(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span>効果音（ピンポン・ブザー）</span>
                    <button
                      onClick={toggleSound}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        settings.soundEnabled
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.soundEnabled ? '有効' : '無効'}
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5 text-slate-300">
                      <span>効果音音量</span>
                      <span className="font-mono text-cyan-400">{Math.round(settings.soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={settings.soundVolume}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, soundVolume: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <span>文完成時の自動進行</span>
                    <button
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          autoAdvanceSentence: !settings.autoAdvanceSentence,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        settings.autoAdvanceSentence
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.autoAdvanceSentence ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Review List Button */}
          <button
            onClick={onOpenReviewModal}
            aria-label="復習リスト"
            title="間違えた問題の復習リスト"
            className={`relative h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              reviewCount > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
            }`}
          >
            <BookOpen className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">復習</span>
            {reviewCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {reviewCount}
              </span>
            )}
          </button>

          {/* Add / Register Question Button */}
          <button
            onClick={onOpenRegisterModal}
            aria-label="問題登録"
            title="問題・教材の新規登録"
            className="h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">登録</span>
          </button>

          {/* Account / Sync Button */}
          <button
            onClick={onOpenAuthModal}
            aria-label="アカウント設定"
            className="h-9 w-9 sm:w-auto sm:px-2.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors"
            title="アカウント・同期設定"
          >
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-slate-300" />
            )}
            <span className="hidden lg:inline font-medium truncate max-w-[80px]">
              {userProfile.isLoggedIn ? userProfile.displayName : '設定'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
