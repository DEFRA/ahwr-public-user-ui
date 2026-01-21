import {
  sendHerdEvent,
  sendSessionEvent,
} from "../../../../app/messaging/session-event-emission.js";

const mockPublishEvent = jest.fn();

jest.mock("../../../../app/messaging/fcp-messaging-service", () => ({
  getEventPublisher: () => ({
    publishEvent: mockPublishEvent,
  }),
}));

describe("Send event on session set", () => {
  describe("sendSessionEvent", () => {
    const event = {
      id: "9e016c50-046b-4597-b79a-ebe4f0bf8505",
      sbi: "123456789",
      email: "email@email.com",
      journey: "claim",
      sessionKey: "agreeMultipleSpecies",
      value: "yes",
      reference: "FUBC-JTTU-SDQ7",
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
        reference: "FUBC-JTTU-SDQ7",
        applicationReference: "IAHW-G3CL-V59P",
        agreeMultipleSpecies: "yes",
      },
      raisedBy: "email@email.com",
      raisedOn: expect.any(String),
    };

    afterEach(() => {
      jest.resetAllMocks();
    });

    test("should call publishEvent when a valid event", async () => {
      await sendSessionEvent(event);

      expect(mockPublishEvent).toHaveBeenCalledWith(publishedEvent);
    });

    test("should call publishEvent with normalized type of review when REVIEW", async () => {
      await sendSessionEvent({ ...event, sessionKey: "typeOfReview", value: "REVIEW" });

      expect(mockPublishEvent).toHaveBeenCalledWith({
        ...publishedEvent,
        type: "claim-typeOfReview",
        message: "Session set for claim and typeOfReview.",
        data: {
          reference: "FUBC-JTTU-SDQ7",
          applicationReference: "IAHW-G3CL-V59P",
          typeOfReview: "R",
        },
      });
    });

    test("should call publishEvent with normalized type of review when FOLLOW_UP", async () => {
      await sendSessionEvent({ ...event, sessionKey: "typeOfReview", value: "FOLLOW_UP" });

      expect(mockPublishEvent).toHaveBeenCalledWith({
        ...publishedEvent,
        type: "claim-typeOfReview",
        message: "Session set for claim and typeOfReview.",
        data: {
          reference: "FUBC-JTTU-SDQ7",
          applicationReference: "IAHW-G3CL-V59P",
          typeOfReview: "E",
        },
      });
    });

    describe("should call publishEvent with renamed keys when identified", () => {
      test("renames laboratoryURN to urnResult", async () => {
        await sendSessionEvent({ ...event, sessionKey: "laboratoryURN", value: "URN34567ddd" });

        expect(mockPublishEvent).toHaveBeenCalledWith({
          ...publishedEvent,
          type: `claim-urnResult`,
          message: `Session set for claim and urnResult.`,
          data: {
            reference: publishedEvent.data.reference,
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
            reference: publishedEvent.data.reference,
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
            reference: publishedEvent.data.reference,
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
            reference: publishedEvent.data.reference,
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
            reference: publishedEvent.data.reference,
            applicationReference: publishedEvent.data.applicationReference,
            animalsTested: "10",
          },
        });
      });
    });
  });

  describe("sendHerdEvent", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    test("should call publishEvent when a valid event is received", async () => {
      await sendHerdEvent({
        sessionId: "9e016c50-046b-4597-b79a-ebe4f0bf8505",
        sbi: "123456789",
        email: "email@email.com",
        type: "herd-name",
        message: "Herd name collected from user",
        data: {
          herdId: "1",
          herdVersion: 1,
          herdName: "John Doe",
        },
      });

      expect(mockPublishEvent).toHaveBeenCalledWith({
        name: "send-session-event",
        id: "9e016c50-046b-4597-b79a-ebe4f0bf8505",
        sbi: "123456789",
        cph: "n/a",
        checkpoint: "Get funding to improve animal health and welfare",
        status: "success",
        type: "herd-name",
        message: "Herd name collected from user",
        data: {
          herdId: "1",
          herdVersion: 1,
          herdName: "John Doe",
        },
        raisedBy: "email@email.com",
        raisedOn: expect.any(String),
      });
    });
  });
});
