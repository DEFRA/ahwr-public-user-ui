import jwt from "jsonwebtoken";
import jwktopem from "jwk-to-pem";

export const jwtVerify = async (token, signingKey) => {
  const publicKey = jwktopem(signingKey);
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
    ignoreNotBefore: true,
  });

  if (!decoded) {
    throw new Error("The token has not been verified");
  }

  return decoded;
};
