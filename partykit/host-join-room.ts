import type * as Party from "partykit/server";
import type {
  ClientEnvelope,
  HostBroadcastState,
  RoomPresence,
  ServerEnvelope,
} from "../src/multiplayer/protocol";
import { hasProfanity, sanitizePlayerName } from "../src/lib/name-validation";

type ConnRole = "unknown" | "host" | "joiner";

type ConnInfo = {
  role: ConnRole;
  playerName?: string;
  playerToken?: string;
};

export default class HostJoinRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}

  private hostId: string | null = null;
  private lastState: HostBroadcastState | null = null;
  private connInfo = new Map<string, ConnInfo>();

  onConnect(conn: Party.Connection): void {
    this.connInfo.set(conn.id, { role: "unknown" });
  }

  onMessage(raw: string, conn: Party.Connection): void {
    let payload: ClientEnvelope;
    try {
      payload = JSON.parse(raw) as ClientEnvelope;
    } catch {
      this.send(conn, { type: "error", message: "Invalid message JSON" });
      return;
    }

    if (payload.type === "hello") {
      if (payload.role === "host") {
        this.hostId = conn.id;
        this.connInfo.set(conn.id, { role: "host" });
      } else {
        const sanitizedName = sanitizePlayerName(
          payload.playerName ?? "Player",
        );
        const safeName = hasProfanity(sanitizedName) ? "Player" : sanitizedName;
        this.connInfo.set(conn.id, {
          role: "joiner",
          playerName: safeName.length > 0 ? safeName : "Player",
          playerToken: payload.playerToken,
        });
      }
      this.broadcastRoomState();
      return;
    }

    if (payload.type === "request-state") {
      this.send(conn, {
        type: "room-state",
        room: this.getRoomPresence(),
        state: this.lastState,
      });
      return;
    }

    if (payload.type === "host-state") {
      if (conn.id !== this.hostId) {
        this.send(conn, {
          type: "error",
          message: "Only host can publish state",
        });
        return;
      }
      this.lastState = payload.state;
      this.broadcast({
        type: "room-state",
        room: this.getRoomPresence(),
        state: this.lastState,
      });
      return;
    }

    if (payload.type === "player-action") {
      if (!this.hostId) {
        this.send(conn, { type: "error", message: "No host connected" });
        return;
      }

      const senderInfo = this.connInfo.get(conn.id);
      if (!senderInfo || senderInfo.role !== "joiner") {
        this.send(conn, {
          type: "error",
          message: "Only joiners can send player actions",
        });
        return;
      }

      const host = this.room.getConnection(this.hostId);
      if (!host) {
        this.send(conn, { type: "error", message: "Host socket unavailable" });
        return;
      }

      this.send(host, {
        type: "player-action",
        playerId: conn.id,
        playerName: senderInfo.playerName,
        action: payload.action,
      });
    }
  }

  onClose(conn: Party.Connection): void {
    const info = this.connInfo.get(conn.id);
    this.connInfo.delete(conn.id);

    if (this.hostId === conn.id) {
      this.hostId = null;
      this.lastState = null;
    }

    if (info?.role === "joiner" || info?.role === "host") {
      this.broadcastRoomState();
    }
  }

  private getRoomPresence(): RoomPresence {
    const participants: RoomPresence["participants"] = [];

    for (const [connId, info] of this.connInfo.entries()) {
      if (info.role !== "joiner") {
        continue;
      }

      participants.push({
        id: connId,
        name: info.playerName ?? "Player",
        token: info.playerToken,
        connected: Boolean(this.room.getConnection(connId)),
      });
    }

    return {
      hostConnected:
        this.hostId !== null && Boolean(this.room.getConnection(this.hostId)),
      participants,
    };
  }

  private send(conn: Party.Connection, payload: ServerEnvelope): void {
    conn.send(JSON.stringify(payload));
  }

  private broadcast(payload: ServerEnvelope): void {
    const serialized = JSON.stringify(payload);
    for (const conn of this.room.getConnections()) {
      conn.send(serialized);
    }
  }

  private broadcastRoomState(): void {
    this.broadcast({
      type: "room-state",
      room: this.getRoomPresence(),
      state: this.lastState,
    });
  }
}
