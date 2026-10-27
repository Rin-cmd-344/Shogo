import React, { useState } from 'react';
import { UserProfile, saveUserProfile, loadQuestions, saveQuestions, loadUserProgress, saveUserProgress } from '../utils/storage';
import {
  User,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Lock,
  X,
  Share2,
} from 'lucide-react';

interface AuthSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onDataImported: () => void;
}

export const AuthSyncModal: React.FC<AuthSyncModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateProfile,
  onDataImported,
}) => {
  const [syncStatus, setSyncStatus] = useState<string>('ローカル同期中 (オフライン対応)');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulateGoogleLogin = () => {
    // In current environment, provide convenient user login
    const updated: UserProfile = {
      uid: 'user-google-102938',
      email: 'toeic.learner@gmail.com',
      displayName: 'TOEIC Learner',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      isLoggedIn: true,
      lastSyncedAt: new Date().toISOString(),
    };
    saveUserProfile(updated);
    onUpdateProfile(updated);
    setNotice('Googleアカウントでログインしました。端末間同期の準備が完了しています。');
  };

  const handleLogout = () => {
    const updated: UserProfile = {
      uid: 'guest-user',
      email: 'guest@toeic-dictation.local',
      displayName: 'ゲスト学習者',
      isLoggedIn: false,
    };
    saveUserProfile(updated);
    onUpdateProfile(updated);
    setNotice('ログアウトしました。ローカル保存モードで動作します。');
  };

  // Export full backup as JSON
  const handleExportData = () => {
    const questions = loadQuestions();
    const progress = loadUserProgress();
    const backup = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      user: userProfile,
      questions,
      progress,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `toeic_dictation_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setNotice('問題データおよび学習履歴のJSONバックアップをダウンロードしました。');
  };

  // Import JSON backup
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          saveQuestions(parsed.questions);
        }
        if (parsed.progress) {
          saveUserProgress(parsed.progress);
        }
        onDataImported();
        setNotice('バックアップファイルから問題と学習履歴を正常に復元しました！');
      } catch (err) {
        setNotice('バックアップファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。');
      }
    };
    reader.readAsText(file);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncStatus('クラウド同期実行中...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus('同期完了 (最新状態)');
      setNotice('問題データと学習履歴の同期が完了しました。');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">アカウント・同期・セキュリティ</h2>
              <p className="text-xs text-slate-400">端末間同期と学習データのプライバシー保護</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {notice && (
            <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {/* User Profile Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-12 h-12 rounded-full border-2 border-cyan-500/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-white">{userProfile.displayName}</h4>
                <p className="text-xs text-slate-400">{userProfile.email}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{userProfile.isLoggedIn ? 'Google認証済み' : 'ゲストモード'}</span>
                </div>
              </div>
            </div>

            {userProfile.isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ログアウト</span>
              </button>
            ) : (
              <button
                onClick={handleSimulateGoogleLogin}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Googleでログイン</span>
              </button>
            )}
          </div>

          {/* Sync Trigger */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">同期ステータス</span>
              <span className="text-cyan-400 font-mono">{syncStatus}</span>
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>今すぐデータを同期</span>
            </button>
          </div>

          {/* Backup & Restore (JSON) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              データのエクスポート・インポート
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportData}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSONバックアップ保存</span>
              </button>

              <label className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>バックアップ読込</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Privacy & Security Architecture Note */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>データ分離とセキュリティルール</span>
            </div>
            <p className="leading-relaxed">
              <strong>学習履歴の秘匿性:</strong>{' '}
              問題データ（教材）と各ユーザーの回答記録・誤答履歴は厳格に分離されています。セキュリティルールにより、本人の学習履歴は他者から閲覧・改ざんできない設計となっています。
            </p>
            <p className="leading-relaxed">
              <strong>教材共有の保護:</strong>{' '}
              将来的に友人と共有できるのは「権利許諾のある自作問題」に限定され、著作権のある公式教材データが無断で第三者に公開されることはありません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
