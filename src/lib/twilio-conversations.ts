import crypto from "node:crypto";

type TwilioConversationMessage = {
  sid: string;
  author: string | null;
  body: string | null;
  date_created: string | null;
};

type TwilioConversationResponse = {
  sid: string;
};

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID ?? "";
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET ?? "";
const TWILIO_CONVERSATIONS_SERVICE_SID =
  process.env.TWILIO_CONVERSATIONS_SERVICE_SID ?? "";

function base64Url(input: Buffer | string) {
  const raw = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input).toString("base64");
  return raw.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function isTwilioConfigured() {
  return Boolean(
    TWILIO_ACCOUNT_SID &&
      TWILIO_AUTH_TOKEN &&
      TWILIO_API_KEY_SID &&
      TWILIO_API_KEY_SECRET &&
      TWILIO_CONVERSATIONS_SERVICE_SID,
  );
}

function twilioBasicAuthHeader() {
  const token = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  return `Basic ${token}`;
}

async function twilioApiFetch(
  path: string,
  init: { method?: "GET" | "POST"; body?: URLSearchParams } = {},
) {
  const method = init.method ?? "GET";
  const response = await fetch(`https://conversations.twilio.com/v1${path}`, {
    method,
    headers: {
      Authorization: twilioBasicAuthHeader(),
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init.body?.toString(),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`twilio_api_${response.status}:${payload}`);
  }

  return response.json();
}

function createTwilioAccessToken(identity: string, ttlSeconds = 3600) {
  if (!isTwilioConfigured()) {
    throw new Error("Twilio Conversations is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "HS256" };
  const payload = {
    jti: `${TWILIO_API_KEY_SID}-${now}`,
    iss: TWILIO_API_KEY_SID,
    sub: TWILIO_ACCOUNT_SID,
    iat: now,
    exp: now + ttlSeconds,
    grants: {
      identity,
      chat: {
        service_sid: TWILIO_CONVERSATIONS_SERVICE_SID,
      },
    },
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", TWILIO_API_KEY_SECRET).update(signingInput).digest();
  const encodedSignature = base64Url(signature);

  return `${signingInput}.${encodedSignature}`;
}

async function createTwilioConversation(args: {
  uniqueName: string;
  friendlyName: string;
  attributes?: Record<string, unknown>;
}) {
  const body = new URLSearchParams({
    UniqueName: args.uniqueName,
    FriendlyName: args.friendlyName,
  });
  if (args.attributes) {
    body.set("Attributes", JSON.stringify(args.attributes));
  }
  const data = (await twilioApiFetch("/Conversations", {
    method: "POST",
    body,
  })) as TwilioConversationResponse;
  return data.sid;
}

async function addTwilioParticipant(conversationSid: string, identity: string) {
  const body = new URLSearchParams({
    Identity: identity,
  });
  try {
    await twilioApiFetch(`/Conversations/${conversationSid}/Participants`, {
      method: "POST",
      body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("50433") || message.includes("Participant already exists")) {
      return;
    }
    throw error;
  }
}

async function sendTwilioMessage(args: {
  conversationSid: string;
  author: string;
  body: string;
  attributes?: Record<string, unknown>;
}) {
  const body = new URLSearchParams({
    Author: args.author,
    Body: args.body,
  });
  if (args.attributes) {
    body.set("Attributes", JSON.stringify(args.attributes));
  }
  await twilioApiFetch(`/Conversations/${args.conversationSid}/Messages`, {
    method: "POST",
    body,
  });
}

async function listTwilioMessages(conversationSid: string, pageSize = 100) {
  const data = (await twilioApiFetch(
    `/Conversations/${conversationSid}/Messages?PageSize=${pageSize}`,
  )) as { messages?: TwilioConversationMessage[] };

  return (data.messages ?? []).map((message) => ({
    id: message.sid,
    sender: message.author?.startsWith("agent:") ? "agent" : "guest",
    content: message.body ?? "",
    created_at: message.date_created ?? new Date().toISOString(),
  }));
}

export {
  addTwilioParticipant,
  createTwilioAccessToken,
  createTwilioConversation,
  isTwilioConfigured,
  listTwilioMessages,
  sendTwilioMessage,
};
