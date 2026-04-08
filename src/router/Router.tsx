// Mini-router próprio sem react-router-dom.
// Usa History API + popstate. Atende: useRoute(), navigate(path), <Link>.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type ReactNode } from 'react'

interface RouterContextValue {
  pathname: string
  navigate: (path: string, opts?: { replace?: boolean }) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname || '/')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((path: string, opts?: { replace?: boolean }) => {
    if (path === window.location.pathname) return
    if (opts?.replace) {
      window.history.replaceState({}, '', path)
    } else {
      window.history.pushState({}, '', path)
    }
    setPathname(path)
  }, [])

  const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRoute() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRoute deve ser usado dentro de <RouterProvider>')
  return ctx
}

export function Link({ to, children, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRoute()
  return (
    <a
      {...rest}
      href={to}
      onClick={e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(to)
      }}
    >
      {children}
    </a>
  )
}
