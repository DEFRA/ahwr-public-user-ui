import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config/index.js";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../s3/index.js";

export const downloadApplicationHandlers = {
  method: "GET",
  path: "/download-application/{sbi}/{reference}",
  handler: async (request, h) => {
    const { sbi, reference } = request.params;
    // TODO - find an alternative to setBindings
    request.logger.setBindings({ sbi, reference });

    const organisation = getSessionData(request, sessionEntryKeys.organisation);
    const latestEndemicsApplication = getSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.latestEndemicsApplication,
    );

    if (latestEndemicsApplication.reference === reference && organisation.sbi === sbi) {
      const s3Client = getS3Client();
      const key = `${sbi}/${reference}.pdf`;

      try {
        await s3Client.send(
          new HeadObjectCommand({
            Bucket: config.documentBucketName,
            Key: key,
          }),
        );
      } catch (error) {
        request.logger.error("Application not found, could not be downloaded");
        throw error;
      }

      const command = new GetObjectCommand({
        Bucket: config.documentBucketName,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${latestEndemicsApplication.reference}.pdf"`,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60,
      });

      return h.redirect(signedUrl);
    }

    throw new Error("Application not found, could not be downloaded.");
  },
};
