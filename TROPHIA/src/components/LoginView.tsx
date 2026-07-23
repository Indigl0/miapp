import { useState } from 'react';
import { TrendingUp, Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

export function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (!ok) setError('Usuario o contraseña incorrectos.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f10] px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-500/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30 mb-4">
            <TrendingUp size={32} className="text-white" />
          </div>
          <h1 className="font-condensed text-3xl sm:text-4xl font-bold tracking-tight break-words">TROPHIA</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center break-words">Registro y análisis de entrenamiento</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 shadow-xl p-6 sm:p-8 space-y-5">
          <div>
            <Label htmlFor="username">Usuario</Label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tu usuario" className="pl-10" autoComplete="username" required />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input id="password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10" autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Mostrar contraseña">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-3.5 py-2.5 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</Button>
          <p className="text-center text-xs text-gray-400 break-words">Acceso restringido · No hay registro público</p>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6 break-words">
          Desarrollado y creado por <span className="text-brand-500 font-semibold">Felipe Ibarra</span>
        </p>
      </div>
    </div>
  );
}
