const JSDomEnvironment = require("jest-environment-jsdom").default;
const { ReadableStream, WritableStream, TransformStream } = require("stream/web");
const { MessagePort, MessageChannel } = require("worker_threads");

class JsdomWithNodeGlobalsEnvironment extends JSDomEnvironment {
  async setup() {
    await super.setup();
    if (typeof this.global.TextDecoder === "undefined") {
      this.global.TextDecoder = TextDecoder;
      this.global.TextEncoder = TextEncoder;
    }
    if (typeof this.global.ReadableStream === "undefined") {
      this.global.ReadableStream = ReadableStream;
      this.global.WritableStream = WritableStream;
      this.global.TransformStream = TransformStream;
    }
    if (typeof this.global.MessagePort === "undefined") {
      this.global.MessagePort = MessagePort;
      this.global.MessageChannel = MessageChannel;
    }
    if (typeof this.global.Blob === "undefined") {
      this.global.Blob = Blob;
    }
    if (typeof this.global.File === "undefined") {
      this.global.File = File;
    }
    if (typeof this.global.setImmediate === "undefined") {
      this.global.setImmediate = setImmediate;
      this.global.clearImmediate = clearImmediate;
    }
  }
}

module.exports = JsdomWithNodeGlobalsEnvironment;
