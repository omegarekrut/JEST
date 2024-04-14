import { toByteArray } from "base64-js";
import { buildClient, CommitmentPolicy, KmsKeyringNode } from "@aws-crypto/client-node";
import { request } from "http";

const { decrypt } = buildClient(
  CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT
);
const generatorKeyId = process.env.KEY_ALIAS;
const keyIds = [process.env.KEY_ARN];
const secretId = process.env.TWILIO_TOKEN_SECRET_ARN;
const keyring = new KmsKeyringNode({ generatorKeyId, keyIds });

const baseDelay = 1000;
const maxJitter = 100;

export async function handler(event) {
  let plainTextCode;
  let userPhoneNumber = event.request.userAttributes.phone_number;
  if (event.request.code) {
    const { plaintext, messageHeader } = await decrypt(
      keyring,
      toByteArray(event.request.code)
    );
    plainTextCode = plaintext;
  }
  const { apiSid, apiToken, fromNumber } = await getSecrets();
  const client = require("twilio")(apiSid, apiToken);

  if (event.triggerSource == "CustomSMSSender_SignUp") {
  } else if (event.triggerSource == "CustomSMSSender_ResendCode") {
  } else if (event.triggerSource == "CustomSMSSender_ForgotPassword") {
    console.log("Forgot password code " + plainTextCode);
    await smsWithRetries(
      client,
      "Forgot password code " + plainTextCode,
      userPhoneNumber,
      fromNumber
    );
  } else if (event.triggerSource == "CustomSMSSender_UpdateUserAttribute") {
  } else if (event.triggerSource == "CustomSMSSender_VerifyUserAttribute") {
  } else if (event.triggerSource == "CustomSMSSender_AdminCreateUser") {
  } else if (
    event.triggerSource == "CustomSMSSender_AccountTakeOverNotification"
  ) {
  }
  return;
}

async function getSecrets() {
  const secrets_extension_endpoint =
    "http://localhost:2773/secretsmanager/get?secretId=" + secretId;
  const response = await makeGetRequest(secrets_extension_endpoint);
  const secrets = JSON.parse(JSON.parse(response).SecretString);
  // console.log(secrets)
  return {
    apiSid: secrets.TwilioApiSid,
    apiToken: secrets.TwilioApiToken,
    fromNumber: secrets.TwilioFromNumber,
  };
}

function makeGetRequest(url) {
  const options = {
    method: "GET",
    headers: {
      "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN,
    },
  };
  return new Promise((resolve, reject) => {
    const req = request(url, options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        resolve(responseBody);
      });
    });
    req.on("error", (error) => {
      reject(error);
    });
    req.end();
  });
}

class TwilioCallError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.name = "TwilioCallError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TwilioCallError);
    }
  }
}

export async function smsWithRetries(client, text, user_phone, fromNumber) {
  await withRetries(() => smsOnce(client, text, user_phone, fromNumber), {
    condition: shouldRetry,
  });
}

const smsOnce = async (client, text, user_phone, fromNumber) => {
  return client.messages
    .create({
      body: text,
      from: fromNumber,
      to: user_phone,
    })
    .then((message) => console.debug("sent msg " + message))
    .catch((error) => {
      throw new TwilioCallError(
        "Twilio request fail",
        error.code.toString(),
        error.message
      );
    });
};

async function withRetries(call, { condition }) {
  let retryCount = 0;
  do {
    try {
      await call();
    } catch (e) {
      console.debug("withRetries: call failed", e);
      if (!condition(e)) {
        throw e;
      }
      retryCount++;
      const delay =
        baseDelay * Math.pow(2, retryCount - 1) +
        (Math.floor(Math.random() * (2 * maxJitter)) - maxJitter);
      console.log(`Call failed, next retry ${retryCount} in ${delay} ms`, e);
      await new Promise((r) => setTimeout(r, delay));
    }
  } while (retryCount <= maxRetries);

  throw new Error("Failed to execute: attempt limit exceeded");
}

function shouldRetry(e) {
  if (e instanceof TwilioCallError) {
    return e.status.toString().endsWith("429") || isNetworkError(e);
  }
  return false;
}

function isNetworkError(error) {
  return (
    error.code === "ECONNRESET" ||
    error.code === "ECONNREFUSED" ||
    error.code === "ETIMEDOUT"
  );
}
