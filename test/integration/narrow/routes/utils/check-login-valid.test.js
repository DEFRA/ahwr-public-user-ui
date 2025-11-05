import { checkLoginValid } from "../../../../../app/routes/utils/check-login-valid";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionEntry,
} from "../../../../../app/session";
import { customerHasAtLeastOneValidCph } from "../../../../../app/api-requests/rpa-api/cph-check";
import { requestAuthorizationCodeUrl } from "../../../../../app/auth/auth-code-grant/request-authorization-code-url";
import { when } from "jest-when";
import { refreshApplications } from "../../../../../app/lib/context-helper.js";

when(getSessionData)
  .calledWith(expect.anything(), sessionEntryKeys.customer, sessionKeys.customer.crn)
  .mockReturnValue(124);

jest.mock("../../../../../app/session", () => {
  const actual = jest.requireActual("../../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

jest.mock("../../../../../app/api-requests/rpa-api/cph-check", () => ({
  customerHasAtLeastOneValidCph: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../../../../app/lib/context-helper.js", () => ({
  refreshApplications: jest.fn().mockResolvedValue({
    latestEndemicsApplication: {
      type: "EE",
      status: "READY_TO_PAY",
      createdAt: new Date(),
    },
    latestVetVisitApplication: undefined,
  }),
}));

jest.mock("../../../../../app/auth/auth-code-grant/request-authorization-code-url", () => ({
  requestAuthorizationCodeUrl: jest.fn().mockReturnValue("back link"),
}));

describe("checkLoginValid", () => {
  const cphNumbers = ["33/333/3333"];
  const personSummary = {
    id: 12345,
    name: "Farmer Tom",
    email: "farmertomstestemail@test.com.test",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("it returns a redirect path if the user is eligible to login", async () => {
    const h = {};
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result.redirectPath).toEqual("/check-details");
    expect(result.redirectCallback).toBeNull();
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).toHaveBeenCalledWith(request, sessionEntryKeys.signInRedirect, true);
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers);
    expect(mockSetBindings).not.toHaveBeenCalled();
  });

  test("it returns a redirect callback if the user's organisation is locked", async () => {
    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      locked: true,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result).toEqual({
      redirectPath: null,
      redirectCallback: mockRedirectCallBackAsString,
    });
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).not.toHaveBeenCalledWith(
      request,
      sessionEntryKeys.signInRedirect,
      true,
    );
    expect(customerHasAtLeastOneValidCph).not.toHaveBeenCalled(); // only gets called if an error hasnt been found yet
    expect(mockSetBindings).toHaveBeenCalledWith({
      crn: 124,
      error: "Organisation id 111 is locked by RPA",
    });
    expect(requestAuthorizationCodeUrl).toHaveBeenCalledWith(request);
  });

  test("it returns a redirect callback if there is no organisation permission", async () => {
    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = false;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result).toEqual({
      redirectPath: null,
      redirectCallback: mockRedirectCallBackAsString,
    });
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).not.toHaveBeenCalledWith(
      request,
      sessionEntryKeys.signInRedirect,
      true,
    );
    expect(customerHasAtLeastOneValidCph).not.toHaveBeenCalled(); // only gets called if an error hasnt been found yet
    expect(mockSetBindings).toHaveBeenCalledWith({
      crn: 124,
      error: "Person id 12345 does not have the required permissions for organisation id 111",
    });
    expect(requestAuthorizationCodeUrl).toHaveBeenCalledWith(request);
  });

  test("it returns a redirect callback if there is no valid CPH", async () => {
    customerHasAtLeastOneValidCph.mockReturnValue(false);
    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result).toEqual({
      redirectPath: null,
      redirectCallback: mockRedirectCallBackAsString,
    });
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).not.toHaveBeenCalledWith(
      request,
      sessionEntryKeys.signInRedirect,
      true,
    );
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers); // only gets called if an error hasnt been found yet
    expect(mockSetBindings).toHaveBeenCalledWith({
      crn: 124,
      error: "Organisation id 111 has no valid CPH's associated",
    });
    expect(requestAuthorizationCodeUrl).toHaveBeenCalledWith(request);
  });

  test("it returns a redirect callback if there is no valid CPH", async () => {
    customerHasAtLeastOneValidCph.mockReturnValue(false);
    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result).toEqual({
      redirectPath: null,
      redirectCallback: mockRedirectCallBackAsString,
    });
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).not.toHaveBeenCalledWith(
      request,
      sessionEntryKeys.signInRedirect,
      true,
    );
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers); // only gets called if an error hasnt been found yet
    expect(mockSetBindings).toHaveBeenCalledWith({
      crn: 124,
      error: "Organisation id 111 has no valid CPH's associated",
    });
    expect(requestAuthorizationCodeUrl).toHaveBeenCalledWith(request);
    customerHasAtLeastOneValidCph.mockReturnValue(true);
  });

  test("it returns a redirect path to apply journey if there are no problems and the user has no applications", async () => {
    refreshApplications.mockResolvedValue({ latestEndemicsApplication: undefined, latestVetVisitApplication: undefined });
    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result.redirectPath).toEqual("/check-details");
    expect(result.redirectCallback).toBeNull();
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).toHaveBeenCalledWith(request, sessionEntryKeys.signInRedirect, true);
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers);
    expect(mockSetBindings).not.toHaveBeenCalled();
    expect(requestAuthorizationCodeUrl).not.toHaveBeenCalled();
  });

  test("it returns a redirect path to dashboard entry if there are no problems and the user an agreed new world application", async () => {
    refreshApplications.mockResolvedValue({ latestEndemicsApplication: {
        type: "EE",
        status: "AGREED",
        createdAt: new Date(),
      }, latestVetVisitApplication: undefined });
    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result.redirectPath).toEqual("/check-details");
    expect(result.redirectCallback).toBeNull();
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).not.toHaveBeenCalledWith(
      request,
      sessionEntryKeys.signInRedirect,
      true,
    );
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers);
    expect(mockSetBindings).not.toHaveBeenCalled();
    expect(requestAuthorizationCodeUrl).not.toHaveBeenCalled();
  });

  test("it returns a redirect path to apply journey if there are no problems and the user an non-agreed new world application", async () => {
    refreshApplications.mockResolvedValue({ latestEndemicsApplication: {
        type: "EE",
        status: "IN_CHECK",
        createdAt: new Date(),
      }, latestVetVisitApplication: undefined });

    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result.redirectPath).toEqual("/check-details");
    expect(result.redirectCallback).toBeNull();
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).toHaveBeenCalledWith(request, sessionEntryKeys.signInRedirect, true);
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers);
    expect(mockSetBindings).not.toHaveBeenCalled();
    expect(requestAuthorizationCodeUrl).not.toHaveBeenCalled();
  });

  test("it returns a redirect path to apply journey if there are no problems and the user has a closed status old world application", async () => {
    refreshApplications.mockResolvedValue({ latestEndemicsApplication: undefined, latestVetVisitApplication: {
        type: "VV",
        status: "WITHDRAWN",
        createdAt: new Date(),
      } });

    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result.redirectPath).toEqual("/check-details");
    expect(result.redirectCallback).toBeNull();
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).toHaveBeenCalledWith(request, sessionEntryKeys.signInRedirect, true);
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers);
    expect(mockSetBindings).not.toHaveBeenCalled();
    expect(requestAuthorizationCodeUrl).not.toHaveBeenCalled();
  });

  test("it returns a redirect path to apply journey if there are no problems and the user has a closed status old world application specifically in the PAID state", async () => {
    refreshApplications.mockResolvedValue({ latestEndemicsApplication: undefined, latestVetVisitApplication: {
        type: "VV",
        status: "PAID",
        createdAt: new Date(),
      } });

    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };

    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result.redirectPath).toEqual("/check-details");
    expect(result.redirectCallback).toBeNull();
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionEntry).toHaveBeenCalledWith(request, sessionEntryKeys.signInRedirect, true);
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers);
    expect(mockSetBindings).not.toHaveBeenCalled();
    expect(requestAuthorizationCodeUrl).not.toHaveBeenCalled();
  });

  test("it returns a redirect callback if there are no problems but the user has a non-closed status old world application", async () => {
    refreshApplications.mockResolvedValue({ latestEndemicsApplication: undefined, latestVetVisitApplication: {
        type: "VV",
        status: "AGREED",
        createdAt: new Date(),
      } });

    const mockRedirectCallBackAsString = "im a redirect callback";
    const h = {
      redirect: jest.fn().mockReturnValue({
        takeover: jest.fn().mockReturnValue(mockRedirectCallBackAsString),
      }),
    };
    const organisation = {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
      id: 111,
    };
    const organisationPermission = true;

    const mockSetBindings = jest.fn();

    const request = {
      yar: {
        id: 1,
      },
      logger: {
        setBindings: mockSetBindings,
      },
    };
    const result = await checkLoginValid({
      h,
      organisation,
      organisationPermission,
      request,
      cphNumbers,
      personSummary,
    });

    expect(result.redirectPath).toBeNull();
    expect(result.redirectCallback).toBe(mockRedirectCallBackAsString);
    expect(getSessionData).toHaveBeenCalledWith(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.crn,
    );
    expect(setSessionData).not.toHaveBeenCalledWith(
      request,
      sessionEntryKeys.signInRedirect,
      sessionKeys.signInRedirect,
      true,
    );
    expect(customerHasAtLeastOneValidCph).toHaveBeenCalledWith(cphNumbers);
    expect(mockSetBindings).toHaveBeenCalledWith({
      error: "User has an expired old world application",
      crn: 124,
    });
    expect(requestAuthorizationCodeUrl).toHaveBeenCalled();
  });
});
