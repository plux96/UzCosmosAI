import { useEffect, useRef } from 'react'
import useCosmosStore from '../stores/useCosmosStore'

export default function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const handleEvent = useCosmosStore((s) => s.handleEvent)
  const setConnected = useCosmosStore((s) => s.setConnected)

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // Production: same host/port as page. Dev: localhost:8000
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.hostname}:8000`
        : window.location.host
      const wsUrl = `${protocol}//${host}/ws`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected to UzCosmos AI')
        setConnected(true)
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleEvent(data)
        } catch (e) {
          console.error('[WS] Parse error:', e)
        }
      }

      ws.onclose = () => {
        console.log('[WS] Disconnected. Reconnecting in 3s...')
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      ws.onerror = (err) => {
        console.error('[WS] Error:', err)
        ws.close()
      }
    }

    connect()

    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [handleEvent, setConnected])

  return wsRef
}
