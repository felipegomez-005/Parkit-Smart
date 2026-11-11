import { useState } from 'react';
import { ParkingCircle } from 'lucide-react';
import { api } from '../lib/api.js';

// Pantalla de acceso: pestañas "Iniciar sesión" / "Crear cuenta".
export default function AuthScreen({ onAuth, onDemo, initialError = '' }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      const result = mode === 'login' ? await api.login(email, password) : await api.register(name, email, password);
      onAuth(result);
    } catch (err) {
      setError(err.status ? err.message : 'No se pudo conectar con el servidor.');
    } finally { setLoading(false); }
  };

  const switchMode = (next) => { setMode(next); setError(''); };

  return <main className="auth-shell">
    <form className="auth-card" onSubmit={submit}>
      <div className="brand"><div className="brand-mark"><ParkingCircle size={22}/></div><div><strong>ParkIt<span>Smart</span></strong><small>ESTACIONAMIENTO INTELIGENTE</small></div></div>
      <div className="auth-tabs">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Iniciar sesión</button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Crear cuenta</button>
      </div>
      {mode === 'register' && <label className="auth-field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required/></label>}
      <label className="auth-field"><span>Correo</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required/></label>
      <label className="auth-field"><span>Contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === 'register' ? 6 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required/></label>
      {error && <div className="notice"><span>{error}</span></div>}
      <button type="submit" className="primary-action auth-submit" disabled={loading}>{loading ? 'Un momento...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
      <button type="button" className="auth-demo" onClick={onDemo}>Continuar en modo demostración</button>
    </form>
  </main>;
}
