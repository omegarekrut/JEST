import { Twilio } from "twilio";
import { smsWithRetries } from "./index.js";

const maxRetries = 5;

jest.mock("twilio", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({ sid: "12345" })),
    },
  })),
}));

const mockMessagesCreate = new Twilio().messages.create as jest.Mock;

describe("smsWithRetries", () => {
  beforeEach(() => {
    mockMessagesCreate.mockClear();
  });

  it("should retry sending SMS until it succeeds", async () => {
    mockMessagesCreate
      .mockRejectedValueOnce(new Error("Fake network error"))
      .mockRejectedValueOnce(new Error("Fake network error"))
      .mockResolvedValue({ sid: "12345" });

    const client = new Twilio();
    const text = "Test message";
    const userPhone = "+1234567890";
    const fromNumber = "TWILIO_NUMBER";

    await expect(
      smsWithRetries(client, text, userPhone, fromNumber)
    ).resolves.not.toThrow();

    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });

  it("should throw an error after maximum retries exceeded", async () => {
    mockMessagesCreate.mockRejectedValue(new Error("Fake network error"));
    mockMessagesCreate.mockRejectedValueOnce(new Error("Fake network error"));

    const client = new Twilio();
    const text = "Test message";
    const userPhone = "+1234567890";
    const fromNumber = "TWILIO_NUMBER";

    await expect(
      smsWithRetries(client, text, userPhone, fromNumber)
    ).rejects.toThrow("Failed to execute: attempt limit exceeded");

    expect(mockMessagesCreate).toHaveBeenCalledTimes(maxRetries + 1);
  });
});
