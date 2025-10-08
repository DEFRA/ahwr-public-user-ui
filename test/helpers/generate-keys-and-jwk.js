import { generateKeyPairSync } from "crypto";
import parseASN1 from "parse-asn1";

export const generateKeys = () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { publicKey, privateKey };
};

export const generateJWK = (pem) => {
  const parsed = parseASN1(pem);
  const n = Buffer.from(parsed.modulus.toArray())
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/(=*)$/, "");

  const jwk = {
    kty: "RSA",
    n,
    e: "AQAB",
    alg: "RS256",
    kid: "test",
    use: "sig",
  };

  return jwk;
};
