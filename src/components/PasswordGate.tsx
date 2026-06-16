import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { getMDXComponent } from 'mdx-bundler/client'
import type { EncryptedData } from 'types/EncryptedData'
import { MDXComponents } from './MDXComponents'
import { sha256, decryptMDXSource } from '@/lib/encryption.client'

type GateState = 'locked' | 'verifying' | 'error' | 'decrypting' | 'unlocked'

interface PasswordGateProps {
  encryptedData: EncryptedData
  slug: string
}

const STORAGE_PREFIX = 'pwd:'

const LockIcon = () => (
  <svg
    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
)

const Spinner = () => (
  <svg
    className="h-5 w-5 animate-spin text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

export default function PasswordGate({ encryptedData, slug }: PasswordGateProps) {
  const [state, setState] = useState<GateState>('locked')
  const [decryptedSource, setDecryptedSource] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [cryptoSupported, setCryptoSupported] = useState(true)

  useEffect(() => {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      setCryptoSupported(false)
      return
    }

    const cached = sessionStorage.getItem(STORAGE_PREFIX + slug)
    if (cached) {
      setDecryptedSource(cached)
      setState('unlocked')
    }
  }, [slug])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!password.trim()) return

      setState('verifying')

      try {
        const computedHash = await sha256(password)
        if (computedHash !== encryptedData.hash) {
          setState('error')
          return
        }
      } catch {
        setState('error')
        return
      }

      setState('decrypting')

      try {
        const decrypted = await decryptMDXSource(encryptedData, password)
        sessionStorage.setItem(STORAGE_PREFIX + slug, decrypted)
        setDecryptedSource(decrypted)
        setState('unlocked')
      } catch {
        setState('error')
      }
    },
    [password, encryptedData, slug]
  )

  const bodyComponents = useMemo(() => {
    const { wrapper, ...rest } = MDXComponents
    return rest
  }, [])

  const MDXContent = useMemo(() => {
    if (!decryptedSource) return null
    return getMDXComponent(decryptedSource)
  }, [decryptedSource])

  if (!cryptoSupported) {
    return (
      <div className="my-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">请使用现代浏览器访问此页面。</p>
      </div>
    )
  }

  if (state === 'unlocked' && MDXContent) {
    return <MDXContent components={bodyComponents} />
  }

  if (state === 'verifying' || state === 'decrypting') {
    return (
      <div className="my-16 flex flex-col items-center space-y-4">
        <Spinner />
        <p className="text-gray-500 dark:text-gray-400">
          {state === 'verifying' ? '验证中...' : '解密中...'}
        </p>
      </div>
    )
  }

  return (
    <div className="my-16 mx-auto max-w-md">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800/50">
        <LockIcon />
        <h3 className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-gray-100">
          此文章已加密
        </h3>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          请输入密码以查看内容
        </p>
        <form className="mt-6" onSubmit={handleSubmit}>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (state === 'error') setState('locked')
              }}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:text-gray-100 ${
                state === 'error'
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="输入密码"
              autoFocus
            />
          </div>
          {state === 'error' && <p className="mt-2 text-sm text-red-500">密码错误，请重试</p>}
          <button
            type="submit"
            disabled={!password.trim()}
            className="mt-4 w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            验证
          </button>
        </form>
      </div>
    </div>
  )
}
