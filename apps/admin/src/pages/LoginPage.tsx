import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { loginSchema } from '@villano/shared-types';
import { useAuth } from '../store/auth';
import { Spinner } from '../components/ui';
import { MSG_DATOS_INVALIDOS } from '../lib/format';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? MSG_DATOS_INVALIDOS);
      return;
    }
    setLoading(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-neon-purple-bright">
            VILLANO<span className="text-neon-green">·</span>ADMIN
          </h1>
          <p className="mt-1 text-sm text-txt-muted">Panel administrativo</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-txt-muted">
              Email
            </label>
            <input
              id="email" type="email" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} className="input" placeholder="admin@villano.bo"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-txt-muted">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-muted hover:text-neon-purple-bright transition-colors p-1"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="rounded bg-status-out/10 px-3 py-2 text-sm text-status-out" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
            {loading ? <><Spinner className="h-4 w-4" /> Ingresando…</> : <><LogIn className="h-4 w-4" /> Ingresar</>}
          </button>
        </form>
      </div>
    </div>
  );
}
