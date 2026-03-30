const WS_URL = 'wss://wintozo-messenger.onrender.com';

type Handler = (data: any) => void;

class WintozоSocket {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private handlers: Handler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private intentionalClose = false;

  connect(token: string) {
    this.token = token;
    this.intentionalClose = false;
    this._connect();
  }

  private _connect() {
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => {
        this.reconnectDelay = 2000;
        if (this.token) this.ws!.send(JSON.stringify({ type: 'auth', token: this.token }));
        this._emit({ type: 'ws_connected' });
      };
      this.ws.onmessage = (e) => {
        try { this._emit(JSON.parse(e.data)); } catch {}
      };
      this.ws.onclose = () => {
        this._emit({ type: 'ws_disconnected' });
        if (!this.intentionalClose) this._scheduleReconnect();
      };
      this.ws.onerror = () => this._emit({ type: 'ws_error' });
    } catch {
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.intentionalClose) this._connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: Handler) {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  private _emit(data: any) {
    this.handlers.forEach(h => h(data));
  }
}

export const socket = new WintozоSocket();
