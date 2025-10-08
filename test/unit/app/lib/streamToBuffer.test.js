import { streamToBuffer } from "../../../../app/lib/streamToBuffer.js";
import { Readable } from "stream";

describe("streamToBuffer", () => {
  test("should convert a readable stream to a buffer", async () => {
    const data = "Hello, World!";
    const stream = Readable.from(data);
    const buffer = await streamToBuffer(stream);
    expect(buffer.toString()).toBe(data);
  });

  test("should handle empty stream", async () => {
    const stream = Readable.from("");
    const buffer = await streamToBuffer(stream);
    expect(buffer.length).toBe(0);
  });

  test("should handle binary data", async () => {
    const data = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
    const stream = Readable.from(data);
    const buffer = await streamToBuffer(stream);
    expect(buffer).toEqual(data);
  });
});
