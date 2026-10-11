import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { ApiError, createApiClient, type SessionData, type TokenStore } from '@finvault/api-client'

type MobileUser = SessionData['user'] & {
  firstName?: string
}

type MobileSession = Omit<SessionData, 'user'> & {
  user: MobileUser
}

type NotificationList = {
  unreadCount: number
}

const refreshTokenKey = 'finvault.refreshToken'
const useMock = process.env.EXPO_PUBLIC_USE_MOCK === 'true'
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ||
  `http://10.0.2.2:${useMock ? '4010' : '3000'}/api`

let accessToken: string | null = null
let refreshToken: string | null = null
let userId: string | null = null
let persistRefreshToken: Promise<void> = Promise.resolve()
let storageError: Error | null = null
let sessionExpiredHandler: (() => void) | undefined

const tokenStore: TokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  getUserId: () => userId,
  setSession: (session) => {
    accessToken = session.accessToken
    refreshToken = session.refreshToken ?? null
    userId = session.user.id
    if (refreshToken) {
      storageError = null
      const currentRefreshToken = refreshToken
      persistRefreshToken = SecureStore.setItemAsync(refreshTokenKey, currentRefreshToken)
        .catch((error: unknown) => {
          storageError = error instanceof Error ? error : new Error('Không thể lưu phiên đăng nhập an toàn.')
        })
    }
  },
  clear: () => {
    accessToken = null
    refreshToken = null
    userId = null
    storageError = null
    persistRefreshToken = SecureStore.deleteItemAsync(refreshTokenKey)
      .catch((error: unknown) => {
        storageError = error instanceof Error ? error : new Error('Không thể xóa phiên đăng nhập an toàn.')
      })
  }
}

const api = createApiClient({
  baseURL,
  platform: 'mobile',
  tokenStore,
  onSessionExpired: () => sessionExpiredHandler?.()
})

function toVietnameseError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
}

export default function App() {
  const [session, setSession] = useState<MobileSession | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    sessionExpiredHandler = () => {
      setSession(null)
      setErrorMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }

    const restoreSession = async () => {
      try {
        const storedRefreshToken = await SecureStore.getItemAsync(refreshTokenKey)
        if (!storedRefreshToken) return
        refreshToken = storedRefreshToken
        const restored = await api.auth.refresh<MobileSession>()
        await persistRefreshToken
        if (storageError) throw storageError
        if (active) setSession(restored)
      } catch {
        tokenStore.clear()
        await persistRefreshToken
      } finally {
        if (active) setLoading(false)
      }
    }

    void restoreSession()
    return () => {
      active = false
      sessionExpiredHandler = undefined
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setUnreadCount(null)
      return
    }

    let active = true
    void api.notifications.list<NotificationList>()
      .then((result) => {
        if (active) setUnreadCount(result.unreadCount)
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(toVietnameseError(error))
      })

    return () => {
      active = false
    }
  }, [session])

  const signIn = async () => {
    setSubmitting(true)
    setErrorMessage('')
    try {
      const signedIn = await api.auth.signIn<MobileSession>({ username, password })
      await persistRefreshToken
      if (storageError) throw storageError
      setSession(signedIn)
      setPassword('')
    } catch (error) {
      const message = storageError?.message ?? toVietnameseError(error)
      if (storageError) {
        tokenStore.clear()
        await persistRefreshToken
      }
      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  const signOut = async () => {
    setErrorMessage('')
    try {
      await api.auth.signOut()
      await persistRefreshToken
      if (storageError) throw storageError
      setSession(null)
    } catch (error) {
      await persistRefreshToken
      setErrorMessage(storageError?.message ?? toVietnameseError(error))
      setSession(null)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Đang khôi phục phiên đăng nhập...</Text>
      </SafeAreaView>
    )
  }

  if (session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Xin chào {session.user.firstName || session.user.id}</Text>
          <Text style={styles.body}>
            Thông báo chưa đọc: {unreadCount === null ? 'Đang tải...' : unreadCount}
          </Text>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={() => void signOut()}>
            <Text style={styles.buttonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Đăng nhập FinVault</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setUsername}
          placeholder="Tên đăng nhập"
          style={styles.input}
          value={username}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <TouchableOpacity
          disabled={submitting || !username || !password}
          onPress={() => void signIn()}
          style={[styles.button, (submitting || !username || !password) && styles.disabled]}
        >
          <Text style={styles.buttonText}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
        </TouchableOpacity>
        <Text style={styles.muted}>{useMock ? 'Đang dùng mock API' : 'Kết nối Gateway'}</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    gap: 16,
    maxWidth: 440,
    padding: 24,
    width: '100%'
  },
  title: {
    color: '#14243a',
    fontSize: 24,
    fontWeight: '700'
  },
  body: {
    color: '#334155',
    fontSize: 17
  },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    padding: 12
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1456c0',
    borderRadius: 8,
    padding: 14
  },
  disabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  error: {
    color: '#b42318'
  },
  muted: {
    color: '#64748b',
    textAlign: 'center'
  }
})
