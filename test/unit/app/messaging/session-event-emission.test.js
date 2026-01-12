import { sendSessionEvent } from "../../../../app/messaging/session-event-emission.js";

const mockPublishEvent = jest.fn();

jest.mock("../../../../app/messaging/fcp-messaging-service", () => ({
  getEventPublisher: () => ({
    publishEvent: mockPublishEvent,
  }),
}));

const event = {
  id: "9e016c50-046b-4597-b79a-ebe4f0bf8505",
  sbi: "123456789",
  email: "email@email.com",
  journey: "claim",
  sessionKey: "agreeMultipleSpecies",
  value: "yes",
  claimReference: "FUBC-JTTU-SDQ7",
  applicationReference: "IAHW-G3CL-V59P",
};

const publishedEvent = {
  name: "send-session-event",
  id: "9e016c50-046b-4597-b79a-ebe4f0bf8505",
  sbi: "123456789",
  cph: "n/a",
  checkpoint: "Get funding to improve animal health and welfare",
  status: "success",
  type: "claim-agreeMultipleSpecies",
  message: "Session set for claim and agreeMultipleSpecies.",
  data: {
    claimReference: "FUBC-JTTU-SDQ7",
    applicationReference: "IAHW-G3CL-V59P",
    agreeMultipleSpecies: "yes",
  },
  raisedBy: "email@email.com",
  raisedOn: expect.any(String),
};

describe("Send event on session set", () => {
  describe("sendSessionEvent", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    test("should call publishEvent when a valid event is received", async () => {
      await sendSessionEvent(event);

      expect(mockPublishEvent).toHaveBeenCalledWith(publishedEvent);
    });

    describe("should call publishEvent with renamed keys when identified", () => {
      test("renames laboratoryURN to urnResult", async () => {
        await sendSessionEvent({ ...event, sessionKey: "laboratoryURN", value: "URN34567ddd" });

        expect(mockPublishEvent).toHaveBeenCalledWith({
          ...publishedEvent,
          type: `claim-urnResult`,
          message: `Session set for claim and urnResult.`,
          data: {
            claimReference: publishedEvent.data.claimReference,
            applicationReference: publishedEvent.data.applicationReference,
            urnResult: "URN34567ddd",
          },
        });
      });

      test("renames vetsName to vetName", async () => {
        await sendSessionEvent({ ...event, sessionKey: "vetName", value: "John Doe" });

        expect(mockPublishEvent).toHaveBeenCalledWith({
          ...publishedEvent,
          type: `claim-vetName`,
          message: `Session set for claim and vetName.`,
          data: {
            claimReference: publishedEvent.data.claimReference,
            applicationReference: publishedEvent.data.applicationReference,
            vetName: "John Doe",
          },
        });
      });

      test("renames vetRCVSNumber to vetRcvs", async () => {
        await sendSessionEvent({ ...event, sessionKey: "vetRCVSNumber", value: "1111111" });

        expect(mockPublishEvent).toHaveBeenCalledWith({
          ...publishedEvent,
          type: `claim-vetRcvs`,
          message: `Session set for claim and vetRcvs.`,
          data: {
            claimReference: publishedEvent.data.claimReference,
            applicationReference: publishedEvent.data.applicationReference,
            vetRcvs: "1111111",
          },
        });
      });

      test("renames dateOfVisit to visitDate", async () => {
        await sendSessionEvent({
          ...event,
          sessionKey: "dateOfVisit",
          value: new Date("2025-08-15T00:00:00.000Z").toISOString(),
        });

        expect(mockPublishEvent).toHaveBeenCalledWith({
          ...publishedEvent,
          type: `claim-visitDate`,
          message: `Session set for claim and visitDate.`,
          data: {
            claimReference: publishedEvent.data.claimReference,
            applicationReference: publishedEvent.data.applicationReference,
            visitDate: new Date("2025-08-15T00:00:00.000Z").toISOString(),
          },
        });
      });

      test("renames numberAnimalsTested to animalsTested", async () => {
        await sendSessionEvent({ ...event, sessionKey: "numberAnimalsTested", value: "10" });

        expect(mockPublishEvent).toHaveBeenCalledWith({
          ...publishedEvent,
          type: `claim-animalsTested`,
          message: `Session set for claim and animalsTested.`,
          data: {
            claimReference: publishedEvent.data.claimReference,
            applicationReference: publishedEvent.data.applicationReference,
            animalsTested: "10",
          },
        });
      });
    });
  });
});
