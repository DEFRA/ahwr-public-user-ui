import {
  sendIneligibilityEvent,
  sendInvalidDataEvent,
} from "../../../../app/messaging/ineligibility-event-emission";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../app/session";
import { when } from "jest-when";

const mockPublishEvent = jest.fn();

jest.mock("../../../../app/messaging/fcp-messaging-service", () => ({
  getEventPublisher: jest.fn(() => ({
    publishEvent: mockPublishEvent,
  })),
}));

jest.mock("../../../../app/session", () => {
  const actual = jest.requireActual("../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

describe("ineligibility-event-emission", () => {
  beforeEach(() => {});
  describe("sendIneligibilityEvent", () => {
    it("publishes the built up event from the arguments passed to it", async () => {
      const inputs = {
        sessionId: 123,
        sbi: 456,
        email: "fakemail@unittest.com",
        crn: 789,
        exception: "Test error",
      };
      await sendIneligibilityEvent(inputs);

      expect(mockPublishEvent).toHaveBeenCalledWith({
        checkpoint: "Get funding to improve animal health and welfare",
        cph: "n/a",
        data: {
          crn: inputs.crn,
          exception: "Test error",
          journey: "login",
          raisedAt: expect.any(String),
          sbi: 456,
        },
        id: inputs.sessionId,
        message: "Login failed as user ineligible: Test error",
        name: "send-ineligibility-event",
        raisedBy: inputs.email,
        raisedOn: expect.any(String),
        sbi: inputs.sbi,
        status: "alert",
        type: "ineligibility-event",
      });
    });
  });

  describe("sendInvalidDataEvent", () => {
    it("pulls data from the session and combines it with the arguments to create an event to publish", async () => {
      const mockSession = {
        reference: "ABC123",
        organisation: { sbi: 13131313, email: "fred@email.com" },
        latestEndemicsApplication: { reference: "ZXY987" },
      };
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue(mockSession);

      const mockCrn = 34321442;
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.customer, sessionKeys.customer.crn)
        .mockReturnValue(mockCrn);

      const inputs = {
        request: { yar: { id: 111 } },
        sessionKey: "TestKey",
        exception: "Test error",
      };
      await sendInvalidDataEvent(inputs);

      expect(mockPublishEvent).toHaveBeenCalledWith({
        id: inputs.request.yar.id,
        sbi: mockSession.organisation.sbi,
        cph: "n/a",
        email: mockSession.organisation.email,
        name: "send-invalid-data-event",
        type: `claim-${inputs.sessionKey}-invalid`,
        message: `${inputs.sessionKey}: ${inputs.exception}`,
        data: {
          sbi: mockSession.organisation.sbi,
          crn: mockCrn,
          sessionKey: inputs.sessionKey,
          exception: inputs.exception,
          raisedAt: expect.any(String),
          journey: "claim",
          reference: mockSession.reference,
          applicationReference: mockSession.latestEndemicsApplication.reference,
        },
        status: "alert",
      });
    });
  });
});
