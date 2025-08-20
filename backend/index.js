import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'

admin.initializeApp()

const app = express()
const PORT = process.env.PORT || 8080

const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')
app.use(cors({ origin: allowed, credentials: true }))
app.use(express.json())

app.get('/health', (_, res) => res.json({ ok: true }))

async function verifyFirebaseIdToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' })
    }
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    req.user = decoded
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

app.get('/whoami', verifyFirebaseIdToken, (req, res) => {
  const { uid, email } = req.user
  res.json({ uid, email: email || null, message: 'Hello from Cloud Run' })
})

app.listen(PORT, () => console.log(`API listening on :${PORT}`))
