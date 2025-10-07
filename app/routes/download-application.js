export const downloadApplicationHandlers = {
  method: "GET",
  path: "/download-application/{sbi}/{reference}",
  handler: async (request, h) => {
    // const { sbi, reference } = request.params;
    // request.logger.setBindings({ sbi, reference });
    // const { LatestEndemicsApplicationReference, organisation } = getEndemicsClaim(request);
    // const blobName = `${sbi}/${reference}.pdf`;
    // if (LatestEndemicsApplicationReference === reference && organisation.sbi === sbi) {
    //   const blobBuffer = await getBlob(blobName);
    //   return h
    //     .response(blobBuffer)
    //     .type("application/pdf")
    //     .header("Content-type", "application/pdf")
    //     .header("Content-length", blobBuffer.length);
    // }
    // throw new Error("Application not found, could not be downloaded.");

    console.log("Here is the application for the user...");

    return h.response("ok").code(200);
  },
};
