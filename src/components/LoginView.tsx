import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Activity, BookOpen, ShieldCheck, Mail, ArrowLeft, ClipboardCopy, Check, Eye, EyeOff } from "lucide-react";
import { useI18n } from "../lib/i18n";

interface LoginViewProps {
  onLogin: (user: User) => void;
  onOpenDocs?: () => void;
}

type AuthState = 'LOGIN' | 'FORGOT' | 'RESET';

const LOCAL_T: Record<string, Record<string, string>> = {
  'zh-TW': {
    forgot_link: "忘記密碼？",
    back_to_login: "返回登入頁面",
    forgot_title: "重設臨床指揮密碼",
    forgot_subtitle: "請輸入帳號與綁定的安全 Email 進行身份驗證",
    forgot_email: "帳戶綁定信箱 (Email)",
    forgot_btn: "發送驗證碼",
    reset_title: "完成密碼安全變更",
    reset_subtitle: "請輸入電子信箱中收到的 6 位數安全驗證碼",
    reset_otp: "6 位數安全驗證碼 (OTP)",
    reset_new_pass: "新存取密碼 (New Password)",
    reset_confirm_pass: "確認新存取密碼",
    reset_btn: "安全變更密碼並登入",
    reset_mismatch: "兩次輸入的密碼不一致",
    sim_title: "📡 實時 SMTP 電子郵件發送模擬器",
    sim_desc: "本系統檢測到目前未配置生產級 SMTP 郵件伺服器。現已自動進入「臨床安全沙盒模擬模式」。電子信件已安全攔截如下：",
    sim_click_copy: "點選複製驗證碼",
    sim_copied: "驗證碼已複製！",
    forgot_loading: "驗證信箱並發送中...",
    reset_loading: "驗證中並重設密碼...",
    err_send_reset: "無法發送重設驗證信",
    err_generic: "發生錯誤",
    err_reset_fail: "重設密碼失敗",
    msg_otp_sent: "驗證碼已發送！",
    msg_reset_success: "密碼變更成功，請輸入新密碼登入。"
  },
  en: {
    forgot_link: "Forgot Password?",
    back_to_login: "Back to Login",
    forgot_title: "Reset Command Password",
    forgot_subtitle: "Enter username and registered email to verify identity",
    forgot_email: "Registered Email Address",
    forgot_btn: "Generate OTP Code",
    reset_title: "Complete Secure Reset",
    reset_subtitle: "Enter the 6-digit OTP code received in your email",
    reset_otp: "6-Digit Secure OTP Code",
    reset_new_pass: "New Access Code (Password)",
    reset_confirm_pass: "Confirm New Access Code",
    reset_btn: "Reset Password & Initialize Session",
    reset_mismatch: "Passwords do not match",
    sim_title: "📡 Live SMTP Email Simulator",
    sim_desc: "No production SMTP server detected. Running in secure clinical sandbox simulation mode. Intercepted email payload:",
    sim_click_copy: "Click to Copy OTP Code",
    sim_copied: "OTP Copied to Clipboard!",
    forgot_loading: "Verifying & generating OTP...",
    reset_loading: "Verifying OTP & resetting...",
    err_send_reset: "Failed to send the reset email",
    err_generic: "An error occurred",
    err_reset_fail: "Password reset failed",
    msg_otp_sent: "OTP code sent successfully!",
    msg_reset_success: "Password reset successful. Please log in with your new password."
  },
  vi: {
    forgot_link: "Quên mật khẩu?",
    back_to_login: "Quay lại Đăng nhập",
    forgot_title: "Đặt lại Mật khẩu Chỉ huy",
    forgot_subtitle: "Nhập tên tài khoản và email đã đăng ký để xác minh danh tính",
    forgot_email: "Địa chỉ Email Đăng ký",
    forgot_btn: "Tạo mã OTP",
    reset_title: "Hoàn tất Đặt lại Bảo mật",
    reset_subtitle: "Nhập mã OTP 6 chữ số nhận được trong email của bạn",
    reset_otp: "Mã OTP Bảo mật 6 chữ số",
    reset_new_pass: "Mật khẩu truy cập mới",
    reset_confirm_pass: "Xác nhận mật khẩu mới",
    reset_btn: "Đặt lại mật khẩu & Khởi tạo phiên",
    reset_mismatch: "Mật khẩu không trùng khớp",
    sim_title: "📡 Trình mô phỏng Email SMTP Trực tiếp",
    sim_desc: "Không phát hiện máy chủ SMTP sản xuất. Đang chạy trong chế độ mô phỏng hộp cát lâm sàng an toàn. Nội dung email bị chặn:",
    sim_click_copy: "Nhấp để sao chép mã OTP",
    sim_copied: "Đã sao chép mã OTP!",
    forgot_loading: "Đang xác thực & tạo OTP...",
    reset_loading: "Đang xác thực OTP & đặt lại...",
    err_send_reset: "Không gửi được email đặt lại",
    err_generic: "Đã xảy ra lỗi",
    err_reset_fail: "Đặt lại mật khẩu thất bại",
    msg_otp_sent: "Đã gửi mã OTP!",
    msg_reset_success: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."
  }
};

export function LoginView({ onLogin, onOpenDocs }: LoginViewProps) {
  const { t, lang, setLang } = useI18n();
  const currentLang = (lang === 'zh-TW' || lang === 'en' || lang === 'vi') ? lang : 'zh-TW';
  const lt = LOCAL_T[currentLang];

  // Auth States
  const [authState, setAuthState] = useState<AuthState>('LOGIN');

  // Input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Live SMTP Simulator State
  const [simulatedEmail, setSimulatedEmail] = useState<{
    recipient: string;
    otpCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('login_err'));
      }

      onLogin(data);
    } catch (err: any) {
      setError(err.message || t('login_err'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    setSimulatedEmail(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || lt.err_send_reset);
      }

      if (data.simulation && data.otpCode) {
        // Trigger live beautiful simulation card overlay
        setSimulatedEmail({ recipient: email, otpCode: data.otpCode });
      }

      setAuthState('RESET');
      setSuccessMsg(lt.msg_otp_sent);
    } catch (err: any) {
      setError(err.message || lt.err_generic);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError(lt.reset_mismatch);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, otpCode, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || lt.err_reset_fail);
      }

      // Hide simulator
      setSimulatedEmail(null);

      // Auto login after password reset
      const loginRes = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: newPassword })
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        // Fallback to login screen
        setAuthState('LOGIN');
        setSuccessMsg(lt.msg_reset_success);
      } else {
        onLogin(loginData);
      }
    } catch (err: any) {
      setError(err.message || lt.err_reset_fail);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (simulatedEmail) {
      navigator.clipboard.writeText(simulatedEmail.otpCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-clinical-bg flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/10 blur-[120px] rounded-full animate-pulse"></div>
      </div>

      <div className="clinical-card p-10 max-w-lg w-full backdrop-blur-3xl relative z-10 border-clinical-border bg-clinical-card shadow-2xl animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-rose-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg shadow-rose-900/40 animate-float">
             <Activity size={40} />
          </div>
          
          {authState === 'LOGIN' && (
            <>
              <h2 className="text-3xl font-black text-clinical-text uppercase italic tracking-tighter">{t('login_title')}</h2>
              <p className="text-clinical-muted text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">{t('login_subtitle')}</p>
            </>
          )}

          {authState === 'FORGOT' && (
            <>
              <h2 className="text-2xl font-black text-clinical-text uppercase italic tracking-tighter">{lt.forgot_title}</h2>
              <p className="text-clinical-muted text-[10px] font-black uppercase tracking-wider mt-2">{lt.forgot_subtitle}</p>
            </>
          )}

          {authState === 'RESET' && (
            <>
              <h2 className="text-2xl font-black text-clinical-text uppercase italic tracking-tighter">{lt.reset_title}</h2>
              <p className="text-clinical-muted text-[10px] font-black uppercase tracking-wider mt-2">{lt.reset_subtitle}</p>
            </>
          )}
        </div>

        <div className="flex justify-center mb-8">
           <div className="flex items-center gap-1 bg-clinical-bg p-1 rounded-xl border border-clinical-border">
              <button 
                onClick={() => setLang('en')} 
                className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                  lang === 'en' 
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' 
                    : 'text-clinical-muted hover:text-clinical-text'
                }`}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('zh-TW')} 
                className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                  lang === 'zh-TW' 
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' 
                    : 'text-clinical-muted hover:text-clinical-text'
                }`}
              >
                繁
              </button>
              <button 
                onClick={() => setLang('vi')} 
                className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                  lang === 'vi' 
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' 
                    : 'text-clinical-muted hover:text-clinical-text'
                }`}
              >
                VI
              </button>
           </div>
        </div>
        
        {/* LOGIN FORM */}
        {authState === 'LOGIN' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="clinical-input-group">
              <label className="clinical-label">{t('login_user')}</label>
              <input 
                required
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="clinical-input h-14 text-base font-mono tracking-widest bg-clinical-bg border-clinical-border text-clinical-text placeholder:text-clinical-muted/50"
                placeholder="e.g. admin"
              />
            </div>
            
            <div className="clinical-input-group relative">
              <label className="clinical-label">{t('login_pass')}</label>
              
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="clinical-input h-14 pr-12 text-base font-mono tracking-widest bg-clinical-bg border-clinical-border text-clinical-text placeholder:text-clinical-muted/50 w-full"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-clinical-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div className="flex justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setAuthState('FORGOT')}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-400 hover:underline uppercase tracking-wider cursor-pointer"
                >
                  {lt.forgot_link}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in shake-in duration-300">
                 <ShieldCheck size={18} />
                 {error}
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top duration-300">
                 <Check size={18} />
                 {successMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="clinical-btn-primary h-14 mt-2 bg-clinical-primary hover:bg-rose-600 flex justify-center items-center gap-2"
            >
              <KeyRound size={18} /> {loading ? t('login_loading') : t('login_btn')}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {authState === 'FORGOT' && (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
            <div className="clinical-input-group">
              <label className="clinical-label">{t('login_user')}</label>
              <input 
                required
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="clinical-input h-14 text-base font-mono tracking-widest bg-clinical-bg border-clinical-border text-clinical-text"
                placeholder="e.g. admin"
              />
            </div>

            <div className="clinical-input-group">
              <label className="clinical-label">{lt.forgot_email}</label>
              <input 
                required
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="clinical-input h-14 text-base font-mono tracking-widest bg-clinical-bg border-clinical-border text-clinical-text placeholder:text-clinical-muted/50"
                placeholder="e.g. admin@vn-becs.org"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-3">
                 <ShieldCheck size={18} />
                 {error}
              </div>
            )}

            <div className="flex flex-col gap-4 mt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="clinical-btn-primary h-14 bg-clinical-primary hover:bg-rose-600 flex justify-center items-center gap-2"
              >
                <Mail size={18} /> {loading ? lt.forgot_loading : lt.forgot_btn}
              </button>

              <button 
                type="button" 
                onClick={() => { setAuthState('LOGIN'); setError(''); }}
                className="h-14 rounded-xl border border-clinical-border text-clinical-muted hover:bg-clinical-primary hover:text-white hover:border-clinical-primary text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> {lt.back_to_login}
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {authState === 'RESET' && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
            <div className="clinical-input-group">
              <label className="clinical-label">{lt.reset_otp}</label>
              <input 
                required
                type="text" 
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="clinical-input h-14 text-center text-2xl font-mono tracking-[0.5em] bg-clinical-bg border-clinical-border text-clinical-text placeholder:text-clinical-muted/20"
                placeholder="000000"
              />
            </div>

            <div className="clinical-input-group">
              <label className="clinical-label">{lt.reset_new_pass}</label>
              <input 
                required
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="clinical-input h-14 text-base font-mono tracking-widest bg-clinical-bg border-clinical-border text-clinical-text placeholder:text-clinical-muted/50"
                placeholder="••••••••"
              />
            </div>

            <div className="clinical-input-group">
              <label className="clinical-label">{lt.reset_confirm_pass}</label>
              <input 
                required
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="clinical-input h-14 text-base font-mono tracking-widest bg-clinical-bg border-clinical-border text-clinical-text placeholder:text-clinical-muted/50"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-3">
                 <ShieldCheck size={18} />
                 {error}
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center gap-3">
                 <Check size={18} />
                 {successMsg}
              </div>
            )}

            <div className="flex flex-col gap-4 mt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="clinical-btn-primary h-14 bg-clinical-primary hover:bg-rose-600 flex justify-center items-center gap-2"
              >
                <KeyRound size={18} /> {loading ? lt.reset_loading : lt.reset_btn}
              </button>

              <button 
                type="button" 
                onClick={() => { setAuthState('FORGOT'); setError(''); }}
                className="h-14 rounded-xl border border-clinical-border text-clinical-muted hover:bg-clinical-primary hover:text-white hover:border-clinical-primary text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> {lt.back_to_login}
              </button>
            </div>
          </form>
        )}

        {authState === 'LOGIN' && onOpenDocs && (
          <div className="mt-8">
            <button 
              type="button"
              onClick={onOpenDocs} 
              className="w-full py-4 rounded-xl bg-clinical-bg border border-clinical-border text-clinical-muted text-[10px] font-black uppercase tracking-[0.2em] hover:bg-clinical-primary hover:text-white hover:border-clinical-primary transition-all flex items-center justify-center gap-3 shadow-sm duration-200"
            >
              <BookOpen size={18} />
              {t('login_docs_btn')}
            </button>
          </div>
        )}
      </div>

      {/* SMTP Live Simulation Monitor Overlay */}
      {simulatedEmail && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-2xl shadow-rose-950/20 text-clinical-text font-sans z-50 animate-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></div>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">{lt.sim_title}</span>
            </div>
            <button 
              onClick={() => setSimulatedEmail(null)} 
              className="text-slate-500 hover:text-white text-xs font-black uppercase"
            >
              [X]
            </button>
          </div>

          <p className="text-[9px] text-slate-400 mb-3 leading-relaxed">
            {lt.sim_desc}
          </p>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[10px] text-slate-300 space-y-2 leading-relaxed select-all">
            <div><span className="text-slate-500">From:</span> system@vn-becs.org</div>
            <div><span className="text-slate-500">To:</span> {simulatedEmail.recipient}</div>
            <div><span className="text-slate-500">Subject:</span> [VN-BECS] Secure Password Reset OTP Code</div>
            <div className="w-full h-px bg-slate-800 my-2"></div>
            <div className="flex flex-col items-center justify-center py-4 bg-slate-900/40 rounded-lg border border-slate-800/60 my-2 relative group">
              <span className="text-2xl font-black text-rose-500 tracking-[0.3em] font-mono leading-none pl-3 select-all">
                {simulatedEmail.otpCode}
              </span>
              <button 
                onClick={copyToClipboard}
                className="mt-3 flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-600 hover:text-white rounded border border-slate-700 hover:border-transparent text-[8px] font-black uppercase text-slate-400 transition-all select-none cursor-pointer"
              >
                {copied ? <Check size={10} /> : <ClipboardCopy size={10} />}
                {copied ? lt.sim_copied : lt.sim_click_copy}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Version Tag */}
      <div className="fixed bottom-8 right-8 text-[10px] font-black text-clinical-muted uppercase tracking-[0.5em] italic">
        VN-BECS V1.0 Enterprise
      </div>
    </div>
  );
}
