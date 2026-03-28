/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const crypto = require("crypto");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.argv.includes("--dev") || process.env.NODE_ENV !== "production";

if (!dev) {
  process.env.NODE_ENV = "production";
}

const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

const onlineCounts = new Map();

function verifyRealtimeToken(token) {
  const secret = process.env.CHAT_REALTIME_SECRET;

  if (!secret || !token || typeof token !== "string") {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

  if (!payload?.userId || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function chatRoomId(relationshipId) {
  return `chat:${relationshipId}`;
}

function userRoomId(userId) {
  return `user:${userId}`;
}

function broadcastPresence(io, relationship, userId, isOnline) {
  io.to(chatRoomId(relationship.id)).emit("chat:presence", {
    relationshipId: relationship.id,
    userId,
    isOnline,
  });
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ["websocket", "polling"],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  io.use((socket, nextSocket) => {
    const token = socket.handshake.auth?.token;
    const payload = verifyRealtimeToken(token);

    if (!payload) {
      nextSocket(new Error("Unauthorized"));
      return;
    }

    const relationshipMap = new Map(
      (payload.relationships || []).map((relationship) => [relationship.id, relationship])
    );

    socket.data.userId = payload.userId;
    socket.data.relationships = relationshipMap;

    nextSocket();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const relationshipMap = socket.data.relationships;
    const relationships = Array.from(relationshipMap.values());

    socket.join(userRoomId(userId));
    relationships.forEach((relationship) => socket.join(chatRoomId(relationship.id)));

    const existingCount = onlineCounts.get(userId) || 0;
    onlineCounts.set(userId, existingCount + 1);

    if (existingCount === 0) {
      relationships.forEach((relationship) => broadcastPresence(io, relationship, userId, true));
    }

    socket.emit("chat:presence:snapshot", {
      relationships: relationships.map((relationship) => ({
        relationshipId: relationship.id,
        onlineUserIds: [relationship.founderId, relationship.investorId].filter(
          (participantId) => participantId !== userId && (onlineCounts.get(participantId) || 0) > 0
        ),
      })),
    });

    socket.on("chat:message:send", async (payload, ack) => {
      const { relationshipId, content, clientMessageId } = payload || {};
      const relationship = relationshipMap.get(relationshipId);

      if (!relationship) {
        ack?.({ ok: false, error: "Unauthorized relationship" });
        return;
      }

      const trimmedContent = typeof content === "string" ? content.trim() : "";
      if (!trimmedContent) {
        ack?.({ ok: false, error: "Message cannot be empty" });
        return;
      }

      try {
        const dbRelationship = await prisma.startupRelationship.findUnique({
          where: { id: relationshipId },
        });

        if (!dbRelationship || !["IN_DISCUSSION", "DEAL_ACCEPTED"].includes(dbRelationship.status)) {
          ack?.({ ok: false, error: "Chat is not available in current state" });
          return;
        }

        const message = await prisma.message.create({
          data: {
            relationshipId,
            senderId: userId,
            content: trimmedContent,
            read: false,
          },
        });

        await prisma.startupRelationship.update({
          where: { id: relationshipId },
          data: { createdAt: new Date() },
        });

        const serializedMessage = {
          id: message.id,
          relationshipId: message.relationshipId,
          senderId: message.senderId,
          content: message.content,
          read: message.read,
          createdAt: message.createdAt,
        };

        io.to(chatRoomId(relationshipId)).emit("chat:message:new", {
          relationshipId,
          message: serializedMessage,
          clientMessageId: clientMessageId || null,
        });

        io.to(userRoomId(relationship.founderId)).emit("chat:list:refresh");
        io.to(userRoomId(relationship.investorId)).emit("chat:list:refresh");

        ack?.({ ok: true, message: serializedMessage });
      } catch (error) {
        console.error("Socket send message error:", error);
        ack?.({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("chat:messages:read", async (payload, ack) => {
      const { relationshipId } = payload || {};
      const relationship = relationshipMap.get(relationshipId);

      if (!relationship) {
        ack?.({ ok: false, error: "Unauthorized relationship" });
        return;
      }

      try {
        await prisma.message.updateMany({
          where: {
            relationshipId,
            senderId: { not: userId },
            read: false,
          },
          data: { read: true },
        });

        io.to(chatRoomId(relationshipId)).emit("chat:message:read", {
          relationshipId,
          userId,
        });

        io.to(userRoomId(relationship.founderId)).emit("chat:list:refresh");
        io.to(userRoomId(relationship.investorId)).emit("chat:list:refresh");

        ack?.({ ok: true });
      } catch (error) {
        console.error("Socket mark read error:", error);
        ack?.({ ok: false, error: "Failed to mark messages as read" });
      }
    });

    socket.on("chat:typing", (payload) => {
      const { relationshipId, isTyping } = payload || {};
      const relationship = relationshipMap.get(relationshipId);

      if (!relationship) {
        return;
      }

      socket.to(chatRoomId(relationshipId)).emit("chat:typing", {
        relationshipId,
        userId,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on("disconnect", () => {
      const currentCount = onlineCounts.get(userId) || 0;

      if (currentCount <= 1) {
        onlineCounts.delete(userId);
        relationships.forEach((relationship) => broadcastPresence(io, relationship, userId, false));
      } else {
        onlineCounts.set(userId, currentCount - 1);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? "dev" : "prod"})`);
    console.log("> Socket.IO chat server enabled");
  });
});
