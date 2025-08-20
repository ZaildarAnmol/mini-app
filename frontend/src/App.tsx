import React, { useEffect, useMemo, useState } from 'react'
import { auth, db } from './firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import {
  doc,
  onSnapshot,
  setDoc,
  increment,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="card">
      <h2>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
      <form onSubmit={onSubmit}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{mode === 'signin' ? 'Sign in' : 'Sign up'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="muted">
        {mode === 'signin' ? (
          <>New here? <a onClick={() => setMode('signup')}>Create an account</a></>
        ) : (
          <>Already have an account? <a onClick={() => setMode('signin')}>Sign in</a></>
        )}
      </p>
    </div>
  )
}

function Counter({ user }: { user: User }) {
  const userDocRef = useMemo(() => doc(db, 'users', user.uid), [user.uid])
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [apiInfo, setApiInfo] = useState<any>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    // Ensure doc exists
    (async () => {
      const snap = await getDoc(userDocRef)
      if (!snap.exists()) {
        await setDoc(userDocRef, { clickCount: 0, createdAt: serverTimestamp() }, { merge: true })
      }
    })()

    const unsub = onSnapshot(userDocRef, (snap) => {
      const data = snap.data() as any
      setCount(data?.clickCount ?? 0)
      setLoading(false)
    })

    return () => unsub()
  }, [userDocRef])

  const incrementClick = async () => {
    await setDoc(
      userDocRef,
      { clickCount: increment(1), updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  const callApi = async () => {
    setApiError(null)
    setApiInfo(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`${API_BASE}/whoami`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const json = await res.json()
      setApiInfo(json)
    } catch (e: any) {
      setApiError(e.message)
    }
  }

  return (
    <div className="card">
      <h2>Welcome, {user.email}</h2>
      <p>Your personal click count:</p>
      {loading ? <p>Loading…</p> : <div className="big-count">{count}</div>}
      <button onClick={incrementClick}>Click me</button>

      <hr />
      <h3>Test protected API</h3>
      <button onClick={callApi}>Call /api/whoami</button>
      {apiInfo && <pre className="code">{JSON.stringify(apiInfo, null, 2)}</pre>}
      {apiError && <p className="error">{apiError}</p>}
      <button className="secondary" onClick={() => signOut(auth)}>Sign out</button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [init, setInit] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setInit(false)
    })
    return () => unsub()
  }, [])

  if (init) return <div className="container"><p>Loading…</p></div>

  return (
    <div className="container">
      <h1>Mini Click Counter</h1>
      {user ? <Counter user={user} /> : <AuthForm />}
      <p className="muted">Built with React + Firebase + Cloud Run</p>
    </div>
  )
}
